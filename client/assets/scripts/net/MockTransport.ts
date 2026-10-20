import { ITransport, NetHandler, NetMessage } from "./NetTypes";

export interface MockTransportOptions {
  /** 回包延迟。默认很短，方便编辑器预览。 */
  latencyMs?: number;
}

/**
 * 不连服务器的假传输。
 * 内置回包：login、heartbeat、role.enter，其它 cmd 原样 echo。
 * 引擎 websocket 模块当前是关的，这里故意不用 WebSocket。
 */
export class MockTransport implements ITransport {
  private latencyMs: number;
  private opened = false;
  private messageHandler: NetHandler | null = null;
  private closeHandler: (() => void) | null = null;

  constructor(options?: MockTransportOptions) {
    this.latencyMs = options?.latencyMs ?? 30;
  }

  connect(_url: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.opened = true;
        resolve();
      }, this.latencyMs);
    });
  }

  send(msg: NetMessage): void {
    if (!this.opened) {
      console.warn("[MockTransport] drop send " + msg.cmd);
      return;
    }
    setTimeout(() => this.reply(msg), this.latencyMs);
  }

  close(): void {
    if (!this.opened) return;
    this.opened = false;
    const handler = this.closeHandler;
    if (handler) handler();
  }

  onMessage(handler: NetHandler): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  private reply(msg: NetMessage): void {
    if (!this.opened) return;
    const body = (msg.data ?? {}) as { account?: string };
    if (msg.cmd === "login") {
      this.emit({
        cmd: "login",
        data: {
          ok: true,
          account: body.account || "mock",
          token: "mock-token",
        },
      });
      return;
    }
    if (msg.cmd === "heartbeat") {
      this.emit({ cmd: "heartbeat", data: { serverTime: Date.now() } });
      return;
    }
    if (msg.cmd === "role.enter") {
      this.emit({
        cmd: "role.enter",
        data: { roleId: 1001, name: "MockHero", level: 1 },
      });
      return;
    }
    this.emit({ cmd: msg.cmd, data: { ok: true, echo: msg.data ?? null } });
  }

  private emit(msg: NetMessage): void {
    if (this.messageHandler) this.messageHandler(msg);
  }
}
