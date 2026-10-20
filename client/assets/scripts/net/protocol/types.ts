/** P0 请求/响应。字段是手写 stub，不是生成的 protobuf class。 */

export interface LoginReq {
  account: string;
  /** 选服占位。C1 再接 UI；Mock 原样回传，缺省为 1。 */
  serverId?: number;
}

export interface LoginResp {
  ok: boolean;
  account: string;
  token: string;
  serverId: number;
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
}

export interface StageEnterReq {
  stageId: number;
}

export interface StageEnterResp {
  ok: boolean;
  stageId: number;
  battleId: string;
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
}
