import { GameLog } from "../core/GameLog";
import { ErrorCode, logErrorCode } from "../core/errors";
import { ITransport, NetHandler, NetMessage } from "./NetTypes";

/**
 * 浏览器 WebSocket，默认连本机游戏服 ws://127.0.0.1:13101。
 * 只负责连通：open / error / close，以及记下收到的字节数。
 * 不把占位 cmd 写到线上。旧桥日志只说明第 5–8 字节是协议号，帧头和 Protobuf 还没对齐。
 * 见 docs/h5-websocket.md。
 */

export interface WsSocketLike {
  binaryType: string;
  send(data: string | ArrayBuffer): void;
  close(): void;
  addEventListener(type: string, listener: (ev: WsSocketEvent) => void): void;
  removeEventListener(type: string, listener: (ev: WsSocketEvent) => void): void;
}

export interface WsSocketEvent {
  code?: number;
  reason?: string;
  data?: unknown;
}

export type WsSocketFactory = (url: string) => WsSocketLike;

export interface WsTransportOptions {
  connectTimeoutMs?: number;
  /** 单测注入。预览里不传，用浏览器 WebSocket。 */
  factory?: WsSocketFactory;
}

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * 旧 H5 桥日志：一帧原始字节里，从 1 起算的第 5–8 字节小端是协议号。
 * 不够 8 字节返回 null。这不是完整解码，调用方不要据此登录。
 */
export function readObservedCmdId(data: ArrayBuffer): number | null {
  if (!data || data.byteLength < 8) return null;
  const view = new DataView(data);
  return view.getUint32(4, true);
}

export class WsTransport implements ITransport {
  private factory: WsSocketFactory;
  private connectTimeoutMs: number;
  private socket: WsSocketLike | null = null;
  private url = "";
  private opened = false;
  private messageHandler: NetHandler | null = null;
  private closeHandler: (() => void) | null = null;
  private pendingReject: ((err: Error) => void) | null = null;
  private noted = new Set<string>();
  private openListener: ((ev: WsSocketEvent) => void) | null = null;
  private errorListener: ((ev: WsSocketEvent) => void) | null = null;
  private closeListener: ((ev: WsSocketEvent) => void) | null = null;
  private messageListener: ((ev: WsSocketEvent) => void) | null = null;

  constructor(options?: WsTransportOptions) {
    this.factory = options?.factory ?? defaultFactory;
    const timeout = options?.connectTimeoutMs;
    this.connectTimeoutMs = typeof timeout === "number" && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS;
  }

  connect(url: string): Promise<void> {
    if (this.opened && this.socket && this.url === url) return Promise.resolve();
    this.cancelPending();
    this.url = url;
    GameLog.shared.info("Ws", "正在连接 " + url);
    return new Promise((resolve, reject) => {
      let socket: WsSocketLike;
      try {
        socket = this.factory(url);
      } catch (err) {
        const text = errText(err);
        GameLog.shared.error("Ws", "出错 " + text);
        reject(err instanceof Error ? err : new Error(text));
        return;
      }
      this.socket = socket;
      try {
        socket.binaryType = "arraybuffer";
      } catch (_err) {
        // 个别桩没有 binaryType。浏览器实现里有。
      }

      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        GameLog.shared.error("Ws", "出错 连接超时");
        GameLog.shared.warn("Ws", "已关闭");
        fail(new Error("连接超时"));
      }, this.connectTimeoutMs);

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (this.pendingReject === fail) this.pendingReject = null;
        this.opened = false;
        this.noted.clear();
        if (this.socket === socket) this.socket = null;
        this.detach(socket);
        try {
          socket.close();
        } catch (_err) {
          // 还没打开就失败时，关掉半连接。
        }
        reject(err);
      };
      this.pendingReject = fail;

      const onOpen = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (this.pendingReject === fail) this.pendingReject = null;
        this.opened = true;
        GameLog.shared.info("Ws", "已打开 " + url);
        resolve();
      };
      const onError = () => {
        if (settled) return;
        GameLog.shared.error("Ws", "出错");
        GameLog.shared.warn("Ws", "已关闭");
        fail(new Error("服未启动"));
      };
      const onClose = (ev: WsSocketEvent) => {
        if (settled && !this.opened) return;
        if (!settled) GameLog.shared.error("Ws", "出错");
        GameLog.shared.warn("Ws", "已关闭" + formatClose(ev));
        if (!settled) {
          fail(new Error("服未启动"));
          return;
        }
        this.opened = false;
        this.noted.clear();
        if (this.socket === socket) this.socket = null;
        this.detach(socket);
        const handler = this.closeHandler;
        if (handler) handler();
      };
      const onMessage = (ev: WsSocketEvent) => {
        this.noteIncoming(ev ? ev.data : undefined);
      };
      this.openListener = onOpen;
      this.errorListener = onError;
      this.closeListener = onClose;
      this.messageListener = onMessage;
      socket.addEventListener("open", onOpen);
      socket.addEventListener("error", onError);
      socket.addEventListener("close", onClose);
      socket.addEventListener("message", onMessage);
    });
  }

  /**
   * 不写字节。占位心跳 1002 和旧桥日志里的心跳 1004 都不会组包。
   * 同一 cmd 只记一次，避免心跳刷屏。
   */
  send(msg: NetMessage): void {
    if (!this.opened) {
      logErrorCode("Ws", ErrorCode.NET_CLOSED, "drop " + (msg && msg.cmd ? msg.cmd : ""));
      return;
    }
    const cmd = msg && msg.cmd ? msg.cmd : "(empty)";
    if (this.noted.has(cmd)) return;
    this.noted.add(cmd);
    GameLog.shared.info("Ws", "未发送 " + cmd + "：二进制帧未对齐，线上只保持连通");
  }

  close(): void {
    if (this.pendingReject) {
      const rejectPending = this.pendingReject;
      this.pendingReject = null;
      GameLog.shared.warn("Ws", "已关闭");
      rejectPending(new Error("连接已取消"));
      return;
    }
    if (!this.socket && !this.opened) return;
    const wasOpen = this.opened;
    const socket = this.socket;
    this.opened = false;
    this.noted.clear();
    this.socket = null;
    if (socket) {
      this.detach(socket);
      GameLog.shared.warn("Ws", "已关闭");
      try {
        socket.close();
      } catch (_err) {
        // 重复关闭忽略。
      }
    }
    if (wasOpen) {
      const handler = this.closeHandler;
      if (handler) handler();
    }
  }

  onMessage(handler: NetHandler): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  private cancelPending(): void {
    if (!this.pendingReject) {
      this.dropOpenSocket();
      return;
    }
    const rejectPending = this.pendingReject;
    this.pendingReject = null;
    rejectPending(new Error("连接已取消"));
  }

  private dropOpenSocket(): void {
    const socket = this.socket;
    this.opened = false;
    this.socket = null;
    if (!socket) return;
    this.detach(socket);
    try {
      socket.close();
    } catch (_err) {
      // 换地址重连时关掉旧套接字。
    }
  }

  private detach(socket: WsSocketLike): void {
    if (this.openListener) socket.removeEventListener("open", this.openListener);
    if (this.errorListener) socket.removeEventListener("error", this.errorListener);
    if (this.closeListener) socket.removeEventListener("close", this.closeListener);
    if (this.messageListener) socket.removeEventListener("message", this.messageListener);
    this.openListener = null;
    this.errorListener = null;
    this.closeListener = null;
    this.messageListener = null;
  }

  /**
   * 收到的包只记日志，不调用 messageHandler。
   * 二进制帧还不能派发成占位 cmd，否则会被当成心跳或登录回包。
   */
  private noteIncoming(data: unknown): void {
    if (typeof data === "string") {
      const preview = data.length > 60 ? data.slice(0, 60) : data;
      GameLog.shared.info("Ws", "收到文本 " + data.length + " " + preview);
      return;
    }
    const bytes = toArrayBuffer(data);
    if (!bytes) {
      GameLog.shared.info("Ws", "收到无法读取的帧");
      return;
    }
    const cmdId = readObservedCmdId(bytes);
    const tail = cmdId === null ? "" : "，第5-8字节协议号 " + cmdId;
    GameLog.shared.info("Ws", "收到二进制 " + bytes.byteLength + " 字节" + tail);
  }
}

function defaultFactory(url: string): WsSocketLike {
  const host = globalThis as { WebSocket?: new (target: string) => WsSocketLike };
  const Ctor = host.WebSocket;
  if (typeof Ctor !== "function") throw new Error("当前环境没有 WebSocket");
  return new Ctor(url);
}

function formatClose(ev: WsSocketEvent | undefined): string {
  if (!ev || typeof ev.code !== "number") return "";
  const reason = typeof ev.reason === "string" && ev.reason ? " " + ev.reason : "";
  return " code=" + ev.code + reason;
}

function toArrayBuffer(data: unknown): ArrayBuffer | null {
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    const slice = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    return slice as ArrayBuffer;
  }
  return null;
}

function errText(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "未知错误";
}
