import { encodeRequest } from "./protocol/codec";
import { Cmd } from "./protocol/cmds";
import {
  HeartbeatResp,
  LoginResp,
  RoleCreateResp,
  RoleEnterResp,
  StageEnterResp,
  StageResultResp,
} from "./protocol/types";
import { ITransport, NetHandler, NetMessage } from "./NetTypes";

export interface MockTransportOptions {
  /** 回包延迟。默认很短，方便编辑器预览。 */
  latencyMs?: number;
}

interface MockRole {
  roleId: number;
  name: string;
  level: number;
}

/**
 * 不连服务器的假传输。
 * 内置回包：login、heartbeat、role.enter、role.create、stage.enter、stage.result。
 * 其它 cmd 原样 echo。引擎 websocket 模块当前是关的，这里故意不用 WebSocket。
 * 默认已有角色 MockHero，Boot 只调 role.enter 也能进主城。role.create 会改掉这个角色。
 */
export class MockTransport implements ITransport {
  private latencyMs: number;
  private opened = false;
  private messageHandler: NetHandler | null = null;
  private closeHandler: (() => void) | null = null;
  private role: MockRole = { roleId: 1001, name: "MockHero", level: 1 };
  private battleSeq = 0;

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
    const body = asRecord(msg.data);
    if (msg.cmd === Cmd.login) {
      const account = strField(body, "account") || "mock";
      const serverId = numField(body, "serverId", 1);
      const data: LoginResp = { ok: true, account, token: "mock-token", serverId };
      this.emit(encodeRequest(Cmd.login, data));
      return;
    }
    if (msg.cmd === Cmd.heartbeat) {
      const data: HeartbeatResp = { serverTime: Date.now() };
      this.emit(encodeRequest(Cmd.heartbeat, data));
      return;
    }
    if (msg.cmd === Cmd.roleEnter) {
      const data: RoleEnterResp = { ok: true, hasRole: true, ...this.role };
      this.emit(encodeRequest(Cmd.roleEnter, data));
      return;
    }
    if (msg.cmd === Cmd.roleCreate) {
      const name = strField(body, "name").trim();
      if (!name) {
        const data: RoleCreateResp = { ok: false, roleId: 0, name: "", level: 0 };
        this.emit(encodeRequest(Cmd.roleCreate, data));
        return;
      }
      this.role = { roleId: this.role.roleId || 1001, name, level: 1 };
      const data: RoleCreateResp = { ok: true, ...this.role };
      this.emit(encodeRequest(Cmd.roleCreate, data));
      return;
    }
    if (msg.cmd === Cmd.stageEnter) {
      const stageId = numField(body, "stageId", 0);
      if (stageId < 1) {
        const data: StageEnterResp = { ok: false, stageId: 0, battleId: "" };
        this.emit(encodeRequest(Cmd.stageEnter, data));
        return;
      }
      this.battleSeq += 1;
      const data: StageEnterResp = {
        ok: true,
        stageId,
        battleId: "mock-battle-" + stageId + "-" + this.battleSeq,
      };
      this.emit(encodeRequest(Cmd.stageEnter, data));
      return;
    }
    if (msg.cmd === Cmd.stageResult) {
      const stageId = numField(body, "stageId", 0);
      const win = body.win === true;
      if (stageId < 1) {
        const data: StageResultResp = {
          ok: false,
          stageId: 0,
          win: false,
          nextStageId: 0,
          rewards: [],
        };
        this.emit(encodeRequest(Cmd.stageResult, data));
        return;
      }
      const data: StageResultResp = {
        ok: true,
        stageId,
        win,
        nextStageId: win ? stageId + 1 : stageId,
        rewards: win ? [{ id: 1, count: 10 }] : [],
      };
      this.emit(encodeRequest(Cmd.stageResult, data));
      return;
    }
    this.emit(encodeRequest(msg.cmd, { ok: true, echo: msg.data ?? null }));
  }

  private emit(msg: NetMessage): void {
    if (this.messageHandler) this.messageHandler(msg);
  }
}

function asRecord(data: unknown): Record<string, unknown> {
  if (data && typeof data === "object") return data as Record<string, unknown>;
  return {};
}

function strField(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value : "";
}

function numField(body: Record<string, unknown>, key: string, fallback: number): number {
  const value = body[key];
  return typeof value === "number" && isFinite(value) ? value : fallback;
}
