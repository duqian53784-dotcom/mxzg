import { ErrorCode } from "../core/errors";
import {
  LoginResp,
  RoleCreateResp,
  RoleEnterResp,
  StageEnterResp,
  StageResultResp,
} from "./protocol/types";

/** 一场预览里的假服状态。同一 MockTransport 上多次请求共用这一份。 */
export interface MockRoleState {
  roleId: number;
  name: string;
  level: number;
}

/**
 * 给 MockGameSession 的初始值。
 * level 不单独存：新通关后按 clearedStage 重算（1 + 已通关数）。
 * openDay 只升不降，除非创角重置；不填则按每 5 关 +1 天。
 */
export interface MockSessionSeed {
  openDay?: number;
  account?: string;
  token?: string;
  serverId?: number;
  role?: { roleId?: number; name?: string };
  /** 下一关。缺省是 clearedStage + 1。 */
  stageId?: number;
  clearedStage?: number;
}

/**
 * 进程内假服。不听端口。
 * C1 登录/创角和主线连打都改这里的状态，编辑器预览不用另起进程。
 */
export class MockGameSession {
  openDay = 1;
  account = "";
  token = "mock-token";
  serverId = 1;
  role: MockRoleState = { roleId: 1001, name: "MockHero", level: 1 };
  /**
   * 默认角色属于账号 mock。
   * 已登录且账号对不上时，role.enter 报没有角色，但不清掉这份数据。
   * 创角成功后改归当前登录账号。
   */
  roleAccount = "mock";
  hasRole = true;
  /** 下一关。 */
  stageId = 1;
  clearedStage = 0;
  battleSeq = 0;
  battleId = "";

  constructor(seed?: MockSessionSeed) {
    this.applySeed(seed);
  }

  login(data: unknown): LoginResp {
    const body = asRecord(data);
    const account = strField(body, "account") || "mock";
    const serverId = numField(body, "serverId", 1);
    this.account = account;
    this.serverId = serverId;
    this.token = "mock-token";
    return { ok: true, account, token: this.token, serverId };
  }

  roleEnter(): RoleEnterResp {
    if (!this.visibleRole()) {
      return {
        ok: true,
        hasRole: false,
        roleId: 0,
        name: "",
        level: 0,
        openDay: this.openDay,
        stageId: 1,
      };
    }
    return {
      ok: true,
      hasRole: true,
      roleId: this.role.roleId,
      name: this.role.name,
      level: this.role.level,
      openDay: this.openDay,
      stageId: this.stageId,
    };
  }

  /** 空名字拒绝。成功则改名，并把主线进度和开服天重置到新号。 */
  roleCreate(data: unknown): RoleCreateResp {
    const name = strField(asRecord(data), "name").trim();
    if (!name) {
      return { ok: false, code: ErrorCode.ROLE_NAME_EMPTY, roleId: 0, name: "", level: 0 };
    }
    this.role = { roleId: this.role.roleId || 1001, name, level: 1 };
    this.hasRole = true;
    if (this.account) this.roleAccount = this.account;
    this.clearedStage = 0;
    this.stageId = 1;
    this.battleId = "";
    this.syncDerived(true);
    return { ok: true, roleId: this.role.roleId, name: this.role.name, level: this.role.level };
  }

  stageEnter(data: unknown): StageEnterResp {
    const stageId = numField(asRecord(data), "stageId", 0);
    if (stageId < 1) {
      return { ok: false, code: ErrorCode.STAGE_ID_INVALID, stageId: 0, battleId: "" };
    }
    this.battleSeq += 1;
    this.battleId = "mock-battle-" + stageId + "-" + this.battleSeq;
    return { ok: true, stageId, battleId: this.battleId };
  }

  /**
   * 胜利且关卡高于已通关：推进进度，等级 = 1 + 已通关，开服天至少每 5 关 +1。
   * 允许跳关（调试）。失败停在本关，不改进度。
   */
  stageResult(data: unknown): StageResultResp {
    const body = asRecord(data);
    const stageId = numField(body, "stageId", 0);
    const win = body.win === true;
    if (stageId < 1) {
      return {
        ok: false,
        code: ErrorCode.STAGE_ID_INVALID,
        stageId: 0,
        win: false,
        nextStageId: 0,
        rewards: [],
        openDay: this.openDay,
        level: this.role.level,
      };
    }
    if (win && stageId > this.clearedStage) {
      this.clearedStage = stageId;
      this.syncDerived(false);
    }
    const nextStageId = win ? this.clearedStage + 1 : stageId;
    if (win) this.stageId = nextStageId;
    this.battleId = "";
    return {
      ok: true,
      stageId,
      win,
      nextStageId,
      rewards: win ? [{ id: 1, count: 10 }] : [],
      openDay: this.openDay,
      level: this.role.level,
    };
  }

  private applySeed(seed?: MockSessionSeed): void {
    if (!seed) return;
    if (typeof seed.account === "string") {
      this.account = seed.account;
      if (seed.account) this.roleAccount = seed.account;
    }
    if (typeof seed.token === "string" && seed.token) this.token = seed.token;
    if (typeof seed.serverId === "number" && isFinite(seed.serverId)) this.serverId = seed.serverId;
    if (typeof seed.clearedStage === "number" && isFinite(seed.clearedStage) && seed.clearedStage >= 0) {
      this.clearedStage = Math.floor(seed.clearedStage);
    }
    if (seed.role) {
      if (typeof seed.role.roleId === "number" && isFinite(seed.role.roleId)) {
        this.role.roleId = seed.role.roleId;
      }
      if (typeof seed.role.name === "string" && seed.role.name) this.role.name = seed.role.name;
    }
    this.syncDerived(false);
    if (typeof seed.stageId === "number" && isFinite(seed.stageId) && seed.stageId >= 1) {
      this.stageId = Math.floor(seed.stageId);
    } else {
      this.stageId = this.clearedStage + 1;
    }
    if (typeof seed.openDay === "number" && isFinite(seed.openDay) && seed.openDay >= 1) {
      this.openDay = Math.floor(seed.openDay);
    }
  }

  /** 还没 login 时沿用默认角色，Boot 的 skipLogin 和旧自检都能进。 */
  private visibleRole(): boolean {
    if (!this.hasRole) return false;
    if (!this.account) return true;
    return this.account === this.roleAccount;
  }

  /** resetOpenDay：创角时开服天回到推导值，而不是保留旧号的天数。 */
  private syncDerived(resetOpenDay: boolean): void {
    this.role.level = 1 + this.clearedStage;
    const derivedDay = 1 + Math.floor(this.clearedStage / 5);
    this.openDay = resetOpenDay ? derivedDay : Math.max(this.openDay, derivedDay);
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
