import { ErrorCode, logErrorCode } from "../core/errors";
import { MockGameSession } from "./MockGameSession";
import { encodeRequest } from "./protocol/codec";
import { Cmd } from "./protocol/cmds";
import { HeartbeatResp } from "./protocol/types";
import { ITransport, NetHandler, NetMessage } from "./NetTypes";

export interface MockTransportOptions {
  /** 回包延迟。默认很短，方便编辑器预览。 */
  latencyMs?: number;
  /** 不传则新建一局。断线重连沿用同一个对象，进度还在。 */
  session?: MockGameSession;
}

/**
 * 不连服务器的假传输。默认预览走这条，不用另起进程。
 * 业务状态在 MockGameSession：开服天、角色等级、主线进度，同一局里多次请求都改它。
 * 内置回包：login、heartbeat、role.enter、role.create、stage.enter、stage.result。
 * 其它 cmd 原样 echo。引擎 websocket 模块当前是关的，这里故意不用 WebSocket。
 * 默认已有角色 MockHero，且属于账号 mock。Boot 只调 role.enter 也能进主城。
 * 登录别的账号时 role.enter 的 hasRole 为 false，直到 role.create。
 */
export class MockTransport implements ITransport {
  readonly session: MockGameSession;
  private latencyMs: number;
  private opened = false;
  private messageHandler: NetHandler | null = null;
  private closeHandler: (() => void) | null = null;

  constructor(options?: MockTransportOptions) {
    this.latencyMs = options?.latencyMs ?? 30;
    this.session = options?.session ?? new MockGameSession();
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
      logErrorCode("Mock", ErrorCode.NET_CLOSED, "drop " + msg.cmd);
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
    if (!msg.cmd) {
      logErrorCode("Mock", ErrorCode.UNKNOWN_CMD, "empty");
      this.emit(encodeRequest(msg.cmd, { ok: false, code: ErrorCode.UNKNOWN_CMD }));
      return;
    }
    const session = this.session;
    if (msg.cmd === Cmd.login) {
      this.emit(encodeRequest(Cmd.login, session.login(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.heartbeat) {
      const data: HeartbeatResp = { serverTime: Date.now() };
      this.emit(encodeRequest(Cmd.heartbeat, data));
      return;
    }
    if (msg.cmd === Cmd.roleEnter) {
      this.emit(encodeRequest(Cmd.roleEnter, session.roleEnter()));
      return;
    }
    if (msg.cmd === Cmd.roleCreate) {
      this.emit(encodeRequest(Cmd.roleCreate, session.roleCreate(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.stageEnter) {
      this.emit(encodeRequest(Cmd.stageEnter, session.stageEnter(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.stageResult) {
      this.emit(encodeRequest(Cmd.stageResult, session.stageResult(msg.data)));
      return;
    }
    this.emit(encodeRequest(msg.cmd, { ok: true, echo: msg.data ?? null }));
  }

  private emit(msg: NetMessage): void {
    if (this.messageHandler) this.messageHandler(msg);
  }
}
