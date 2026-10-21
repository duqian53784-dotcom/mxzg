import { GameLog } from "../core/GameLog";
import { ErrorCode, logErrorCode } from "../core/errors";
import { ITransport, NetHandler, NetMessage } from "./NetTypes";
import { Cmd } from "./protocol/cmds";
import { bytesToHex, concatBytes, decodeFrames, exactBuffer } from "./protocol/frame";
import { decodeProtoFields, encodeWireMessage, formatProtoFields, WireInbound } from "./protocol/wireLogin";

/**
 * 浏览器 WebSocket，默认连本机桥 ws://127.0.0.1:13111/game（转到 TCP 9902）。
 * 线上只写 frame.ts 里的长度前缀帧：心跳 1004 空体、登录 1001、创角 1002。
 * 占位 cmd 没有日志里的帧时不发送。粘包按 TCP 帧切开。见 docs/h5-websocket.md。
 * 登录后的推送（倩本机见过 28000、28103、20005、25001、23000、21013、50000）记日志并派发成 wire.<cmdId>。
 * 空的 c2s 2001 是日志里拉角色资料的那一帧。回包由 WireSession 读字段 9、6、2、1。
 * 空的 c2s 5001 拉背包整表。s2c 5001 / 5002 由 WireSession 读，不写顶栏。
 * 空的 c2s 15000 拉邮件列表。s2c 15000 由 WireSession 读，不写顶栏，不领取。
 * 空的 c2s 18001 拉英雄列表。s2c 18001 由 WireSession 读，不写顶栏，不升级。别的号不猜。
 * 单条处理失败也不丢掉后面的帧。
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
 * 第一帧的 cmdId。半帧、坏长度返回 null。
 * 保留这个名字，是为了自检还能点到「第 5–8 字节」。
 */
export function readObservedCmdId(data: ArrayBuffer): number | null {
  if (!data || data.byteLength < 8) return null;
  const decoded = decodeFrames(new Uint8Array(data));
  if (decoded.fatal || decoded.frames.length === 0) return null;
  return decoded.frames[0].cmdId;
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
  private pendingBytes: Uint8Array = new Uint8Array(0);
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
        this.pendingBytes = new Uint8Array(0);
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
        this.pendingBytes = new Uint8Array(0);
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
   * 编成日志里的帧再写。heartbeat 是 1004 空体，不是占位号 1002。
   * 没有证明过的 cmd 只记日志，不写字节。
   */
  send(msg: NetMessage): void {
    const cmd = msg && msg.cmd ? msg.cmd : "(empty)";
    if (!this.opened || !this.socket) {
      logErrorCode("Ws", ErrorCode.NET_CLOSED, "drop " + cmd);
      return;
    }
    const packet = encodeWireMessage(msg);
    if (!packet) {
      const why = cmd === Cmd.roleCreate ? "创角名字是空的或日志里没有这条帧" : "日志里没有这条 c2s 帧";
      GameLog.shared.info("Ws", "未发送 " + cmd + "：" + why);
      return;
    }
    GameLog.shared.info(
      "Ws",
      "发送 c2s " + packet.cmdId + " 帧长 " + packet.bytes.length + " " + bytesToHex(packet.bytes) + " " + packet.note
    );
    try {
      this.socket.send(exactBuffer(packet.bytes));
    } catch (err) {
      GameLog.shared.error("Ws", "发送失败 " + errText(err));
    }
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
    this.pendingBytes = new Uint8Array(0);
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
    this.pendingBytes = new Uint8Array(0);
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

  /** 文本只记日志。二进制按长度前缀拆帧，半帧留在 pendingBytes。 */
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
    this.pendingBytes = concatBytes(this.pendingBytes, new Uint8Array(bytes));
    const decoded = decodeFrames(this.pendingBytes);
    for (let i = 0; i < decoded.frames.length; i++) {
      const frame = decoded.frames[i];
      this.emitFrame(frame.cmdId, frame.body);
    }
    if (decoded.fatal) {
      GameLog.shared.error("Ws", "帧长度异常，丢掉剩余 " + this.pendingBytes.length + " 字节");
      this.pendingBytes = new Uint8Array(0);
      return;
    }
    this.pendingBytes = decoded.rest;
  }

  private emitFrame(cmdId: number, body: Uint8Array): void {
    const frameLength = 4 + 4 + body.length;
    const hex = body.length === 0 ? "" : bytesToHex(body);
    const fields = body.length > 0 && body.length <= 64 ? decodeProtoFields(body) : null;
    const fieldText = fields && fields.length > 0 ? " " + formatProtoFields(fields) : "";
    const empty = body.length === 0 ? " 空体" : "";
    GameLog.shared.info(
      "Ws",
      "收到 s2c " + cmdId + " 帧长 " + frameLength + " 体长 " + body.length + (hex ? " " + hex : "") + empty + fieldText
    );
    const inbound: WireInbound = { cmdId, frameLength, body, hex };
    const handler = this.messageHandler;
    if (!handler) return;
    try {
      handler({ cmd: inboundCmd(cmdId), data: inbound });
    } catch (err) {
      GameLog.shared.error("Ws", "分发 s2c " + cmdId + " 失败 " + errText(err));
    }
  }
}

function inboundCmd(cmdId: number): string {
  if (cmdId === 1001) return Cmd.login;
  if (cmdId === 1002) return Cmd.roleCreate;
  if (cmdId === 1004) return Cmd.heartbeat;
  return "wire." + cmdId;
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
