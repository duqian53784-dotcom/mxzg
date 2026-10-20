import { MockTransport } from "./MockTransport";
import { ITransport, NetHandler, NetMessage, NetState } from "./NetTypes";

export type { ITransport, NetHandler, NetMessage, NetState } from "./NetTypes";
export { MockTransport } from "./MockTransport";

export interface NetClientOptions {
  heartbeatMs?: number;
  reconnectDelayMs?: number;
  maxReconnect?: number;
  requestTimeoutMs?: number;
}

/**
 * 连接状态机 + 心跳 + 断线重连占位 + subscribe/emit。
 * 默认走 MockTransport（mock://local），不需要真实服。
 */
export class NetClient {
  static shared = new NetClient();

  state: NetState = "idle";
  url = "";

  private transport: ITransport;
  private heartbeatMs: number;
  private reconnectDelayMs: number;
  private maxReconnect: number;
  private requestTimeoutMs: number;
  private handlers = new Map<string, Set<NetHandler>>();
  private stateHandlers = new Set<(state: NetState) => void>();
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private wantConnected = false;
  private reconnectAttempt = 0;
  private heartbeatAcks = 0;

  constructor(transport?: ITransport, options?: NetClientOptions) {
    this.transport = transport ?? new MockTransport();
    this.heartbeatMs = options?.heartbeatMs ?? 5000;
    this.reconnectDelayMs = options?.reconnectDelayMs ?? 400;
    this.maxReconnect = options?.maxReconnect ?? 3;
    this.requestTimeoutMs = options?.requestTimeoutMs ?? 3000;
    this.transport.onMessage((msg) => this.dispatch(msg));
    this.transport.onClose(() => this.onTransportClosed());
  }

  async connect(url: string): Promise<void> {
    this.url = url;
    this.wantConnected = true;
    this.clearReconnect();
    this.stopHeartbeat();
    this.setState("connecting");
    console.log("[Net] connect " + url);
    try {
      await this.transport.connect(url);
    } catch (err) {
      if (this.reconnectAttempt <= 0) {
        this.wantConnected = false;
        this.setState("closed");
      }
      throw err;
    }
    if (!this.wantConnected) return;
    this.reconnectAttempt = 0;
    this.setState("connected");
    this.startHeartbeat();
  }

  close(): void {
    this.wantConnected = false;
    this.stopHeartbeat();
    this.clearReconnect();
    this.transport.close();
    this.setState("closed");
  }

  send(cmd: string, data?: unknown): void {
    if (this.state !== "connected") {
      console.warn("[Net] drop send " + cmd + " state=" + this.state);
      return;
    }
    this.transport.send({ cmd, data });
  }

  /** 订阅 cmd。传 "*" 接收全部。返回取消函数。同一 cmd 可多个监听。 */
  subscribe(cmd: string, handler: NetHandler): () => void {
    let set = this.handlers.get(cmd);
    if (!set) {
      set = new Set();
      this.handlers.set(cmd, set);
    }
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  onState(handler: (state: NetState) => void): () => void {
    this.stateHandlers.add(handler);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  request(cmd: string, data?: unknown, timeoutMs?: number): Promise<NetMessage> {
    if (this.state !== "connected") {
      return Promise.reject(new Error("[Net] request before connected: " + cmd));
    }
    const wait = timeoutMs ?? this.requestTimeoutMs;
    return new Promise((resolve, reject) => {
      let off = () => {};
      const timer = setTimeout(() => {
        off();
        reject(new Error("[Net] timeout " + cmd));
      }, wait);
      this.dontBlock(timer);
      off = this.subscribe(cmd, (msg) => {
        clearTimeout(timer);
        off();
        resolve(msg);
      });
      this.send(cmd, data);
    });
  }

  /** 已连接时模拟掉线，走重连占位。预览里主城「模拟断线」会调到这里。 */
  simulateDrop(): void {
    if (this.state !== "connected") return;
    console.log("[Net] simulate drop");
    this.transport.close();
  }

  private dispatch(msg: NetMessage): void {
    if (msg.cmd === "heartbeat") {
      this.heartbeatAcks += 1;
      if (this.heartbeatAcks === 1) console.log("[Net] heartbeat ack");
    } else {
      console.log("[Net] recv " + msg.cmd);
    }
    this.emitLocal(msg.cmd, msg);
    if (msg.cmd !== "*") this.emitLocal("*", msg);
  }

  private emitLocal(cmd: string, msg: NetMessage): void {
    const set = this.handlers.get(cmd);
    if (!set) return;
    for (const handler of [...set]) handler(msg);
  }

  private onTransportClosed(): void {
    this.stopHeartbeat();
    if (!this.wantConnected) {
      this.setState("closed");
      return;
    }
    if (this.reconnectAttempt >= this.maxReconnect) {
      console.log("[Net] reconnect gave up");
      this.wantConnected = false;
      this.setState("closed");
      return;
    }
    this.reconnectAttempt += 1;
    this.setState("reconnecting");
    const delay = this.reconnectDelayMs * this.reconnectAttempt;
    console.log("[Net] reconnect in " + delay + "ms attempt " + this.reconnectAttempt);
    this.clearReconnect();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect(this.url).catch((err) => {
        console.error("[Net] reconnect failed", err);
        this.onTransportClosed();
      });
    }, delay);
    this.dontBlock(this.reconnectTimer);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => {
      if (this.state !== "connected") return;
      this.transport.send({ cmd: "heartbeat", data: { clientTime: Date.now() } });
    }, this.heartbeatMs);
    this.dontBlock(this.heartbeat);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setState(next: NetState): void {
    if (this.state === next) return;
    const prev = this.state;
    this.state = next;
    console.log("[Net] " + prev + " -> " + next);
    for (const handler of [...this.stateHandlers]) handler(next);
  }

  /** Node 测试里定时器不挡住进程退出；浏览器没有 unref。 */
  private dontBlock(timer: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>): void {
    const maybe = timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
  }
}
