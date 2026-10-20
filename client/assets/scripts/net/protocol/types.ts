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

export interface HeroListReq {
  /** 占位。Mock 不看请求体，名册在会话里。 */
  clientTime?: number;
}

/** 英雄卡。攻击、生命、防御是占位，由等级和星级算出。 */
export interface HeroCard {
  id: number;
  name: string;
  level: number;
  star: number;
  atk: number;
  hp: number;
  def: number;
  /** 下一级消耗的金币。已满级为 0。 */
  upgradeCost: number;
  maxLevel: number;
}

export interface HeroListResp {
  ok: boolean;
  heroes: HeroCard[];
  gold: number;
  diamond: number;
  code?: number;
}

export interface HeroUpgradeReq {
  heroId: number;
}

export interface HeroUpgradeResp {
  ok: boolean;
  heroId: number;
  hero: HeroCard | null;
  /** 本次扣掉的金币。失败为 0。 */
  cost: number;
  gold: number;
  diamond: number;
  /** 金币不足时，升级实际需要的数量。 */
  needGold?: number;
  /** 没有英雄、金币不足、已满级。成功可以不带。 */
  code?: number;
}

export interface SummonPullReq {
  /** 1 单抽，10 十连。其它次数拒绝。 */
  count: number;
}

export interface SummonDrop {
  heroId: number;
  name: string;
  star: number;
  /** new：新英雄已写入名册。shard：已拥有，转碎片。 */
  kind: "new" | "shard";
  shardId: number;
  shardGain: number;
  shardOwned: number;
}

export interface SummonPullResp {
  ok: boolean;
  count: number;
  /** 本次扣掉的钻石。失败为 0。 */
  cost: number;
  drops: SummonDrop[];
  /** 本次新进名册的人数。 */
  newCount: number;
  /** 本次转成碎片的次数。 */
  shardCount: number;
  gold: number;
  diamond: number;
  /** 钻石不足时，这次召唤实际需要的数量。 */
  needDiamond?: number;
  /** 钻石不足 SUMMON_DIAMOND_SHORT，次数不对 SUMMON_COUNT_INVALID。成功可以不带。 */
  code?: number;
}

export type BagItemKind = "consumable" | "material" | "fragment";

/** 背包一格。金币和钻石不在这里。 */
export interface BagItem {
  id: number;
  name: string;
  count: number;
  kind: BagItemKind;
  usable: boolean;
  desc: string;
}

export interface BagListReq {
  /** 占位。Mock 不看请求体，道具在会话里。 */
  clientTime?: number;
}

export interface BagListResp {
  ok: boolean;
  items: BagItem[];
  gold: number;
  diamond: number;
  code?: number;
}

export interface BagUseReq {
  id: number;
  /** 使用个数。缺省 1。小于 1 拒绝。 */
  count?: number;
}

export interface BagUseResp {
  ok: boolean;
  id: number;
  name: string;
  kind?: BagItemKind;
  /** 本次扣掉的个数。失败为 0。 */
  spent: number;
  /** 剩余个数。 */
  owned: number;
  gold: number;
  diamond: number;
  /** 小金币袋增加的金币。其它道具为 0 或不带。 */
  goldGain?: number;
  /** 经验药水作用的领队。其它道具不带。 */
  heroId?: number;
  heroName?: string;
  heroLevel?: number;
  expGain?: number;
  leveled?: boolean;
  /** 数量不足时，这次请求的个数。 */
  need?: number;
  /**
   * 背包是空的 BAG_EMPTY，没有这个道具 BAG_NOT_FOUND，
   * 数量不足 BAG_NOT_ENOUGH，不能直接使用 BAG_NOT_USABLE，
   * 数量无效 BAG_COUNT_INVALID，领队已满级 BAG_HERO_MAX。
   * 成功可以不带。
   */
  code?: number;
}
