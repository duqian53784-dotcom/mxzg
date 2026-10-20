/** P0 请求/响应。字段是手写 stub，不是生成的 protobuf class。 */

export interface LoginReq {
  account: string;
  /** 选服。Mock 原样回传，缺省为 1。 */
  serverId?: number;
}

export interface LoginResp {
  ok: boolean;
  account: string;
  token: string;
  serverId: number;
  /** 失败时的客户端错误码，见 core/errors.ts。成功可以不带。 */
  code?: number;
}

export interface HeartbeatReq {
  clientTime: number;
}

export interface HeartbeatResp {
  serverTime: number;
}

export interface RoleEnterReq {
  account?: string;
}

export interface RoleEnterResp {
  ok: boolean;
  hasRole: boolean;
  roleId: number;
  name: string;
  level: number;
  /** Mock 会话：开服自然日。真服可以不带。 */
  openDay?: number;
  /** Mock 会话：下一关。真服可以不带。 */
  stageId?: number;
  /** Mock 钱包。id 1 金币、id 2 钻石。没有角色时为 0。真服可以不带。 */
  gold?: number;
  diamond?: number;
  /** 失败时的客户端错误码。成功可以不带。 */
  code?: number;
}

export interface RoleCreateReq {
  account?: string;
  name: string;
}

export interface RoleCreateResp {
  ok: boolean;
  roleId: number;
  name: string;
  level: number;
  /** 失败时的客户端错误码。空名字是 ROLE_NAME_EMPTY。 */
  code?: number;
}

export interface StageEnterReq {
  stageId: number;
}

export interface StageEnterResp {
  ok: boolean;
  stageId: number;
  battleId: string;
  /** 失败时的客户端错误码。关卡 < 1 是 STAGE_ID_INVALID。 */
  code?: number;
}

export interface StageReward {
  id: number;
  count: number;
}

export interface StageResultReq {
  stageId: number;
  battleId?: string;
  win: boolean;
}

export interface StageResultResp {
  ok: boolean;
  stageId: number;
  win: boolean;
  nextStageId: number;
  rewards: StageReward[];
  /** Mock 会话结算后的开服天 / 等级 / 钱包。真服可以不带。 */
  openDay?: number;
  level?: number;
  gold?: number;
  diamond?: number;
  /** 失败时的客户端错误码。成功可以不带。 */
  code?: number;
}

export interface IdleReward {
  id: number;
  count: number;
  name: string;
}

export interface IdleQueryReq {
  /** 占位。Mock 不看请求体，时长在会话里。 */
  clientTime?: number;
}

export interface IdleQueryResp {
  ok: boolean;
  elapsedMs: number;
  capMs: number;
  capped: boolean;
  clearedStage: number;
  stageId: number;
  goldPerMin: number;
  itemEveryMs: number;
  itemId: number;
  itemName: string;
  pendingGold: number;
  pendingItem: number;
  capGold: number;
  capItem: number;
  ownedItem: number;
  gold: number;
  diamond: number;
  code?: number;
}

export interface IdleClaimReq {
  clientTime?: number;
}

export interface IdleClaimResp {
  ok: boolean;
  rewards: IdleReward[];
  elapsedMs: number;
  gold: number;
  diamond: number;
  ownedItem: number;
  /** 不满 1 个单位时为 IDLE_EMPTY，钱包不动。 */
  code?: number;
}
