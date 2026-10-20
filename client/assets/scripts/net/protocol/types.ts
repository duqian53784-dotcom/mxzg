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

/** 英雄卡。攻击、生命、防御是占位，由等级、星级和武器强化算出。 */
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
  /** 铁匠铺强化的武器。起步是新手短剑 Lv1，攻击加成为 0。 */
  weaponName: string;
  weaponLevel: number;
  /** 武器额外攻击，已计入 atk。 */
  weaponAtk: number;
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

/** 邮件附件。id 1 金币、id 2 钻石，其它进背包。 */
export interface MailAttachment {
  id: number;
  name: string;
  count: number;
}

/** 一封邮件。列表和详情共用，邮箱很小。 */
export interface MailEntry {
  id: number;
  title: string;
  body: string;
  from: string;
  unread: boolean;
  hasAttachment: boolean;
  claimed: boolean;
  attachments: MailAttachment[];
}

export interface MailListReq {
  /** 占位。Mock 不看请求体，邮件在会话里。 */
  clientTime?: number;
}

export interface MailListResp {
  ok: boolean;
  mails: MailEntry[];
  unread: number;
  claimable: number;
  gold: number;
  diamond: number;
  code?: number;
}

export interface MailReadReq {
  id: number;
}

export interface MailReadResp {
  ok: boolean;
  mail?: MailEntry;
  gold: number;
  diamond: number;
  /** 没有这封邮件 MAIL_NOT_FOUND。成功可以不带。 */
  code?: number;
}

export interface MailClaimReq {
  id: number;
}

export interface MailClaimResp {
  ok: boolean;
  id: number;
  title: string;
  /** 本次领到的封数。失败为 0，成功为 1。 */
  count: number;
  rewards: MailAttachment[];
  gold: number;
  diamond: number;
  goldGain: number;
  diamondGain: number;
  /**
   * 没有这封邮件 MAIL_NOT_FOUND，没有附件 MAIL_NO_ATTACHMENT，
   * 已经领过 MAIL_ALREADY_CLAIMED。成功可以不带。
   */
  code?: number;
}

export interface MailClaimAllReq {
  clientTime?: number;
}

export interface MailClaimAllResp {
  ok: boolean;
  /** 本次领到的封数。没有可领时为 0。 */
  count: number;
  ids: number[];
  /** 多封附件按道具 id 合并。 */
  rewards: MailAttachment[];
  gold: number;
  diamond: number;
  goldGain: number;
  diamondGain: number;
  /** 一封都领不了 MAIL_NOTHING。成功可以不带。 */
  code?: number;
}

export interface MailDeleteReq {
  id: number;
}

export interface MailDeleteResp {
  ok: boolean;
  id: number;
  title: string;
  gold: number;
  diamond: number;
  /**
   * 没有这封邮件 MAIL_NOT_FOUND，还有未领附件 MAIL_DELETE_BLOCKED。
   * 成功可以不带。
   */
  code?: number;
}

/** 一名英雄身上的那一把新手短剑。铁匠铺只强化这一件。 */
export interface SmithGear {
  heroId: number;
  heroName: string;
  weaponName: string;
  weaponLevel: number;
  maxLevel: number;
  /** 含武器加成的攻击。 */
  atk: number;
  /** 当前武器额外攻击。Lv1 为 0。 */
  weaponAtk: number;
  /** 再强化一级后的武器额外攻击。已满级时与 weaponAtk 相同。 */
  nextWeaponAtk: number;
  /** 下一次强化消耗的金币。已满级为 0。 */
  goldCost: number;
  /** 下一次强化消耗的强化石。已满级为 0。 */
  stoneCost: number;
}

export interface SmithViewReq {
  /** 占位。Mock 不看请求体。打开时给还没有武器的英雄补 Lv1。 */
  clientTime?: number;
}

export interface SmithViewResp {
  ok: boolean;
  /** 名册第一名，界面默认选中。 */
  leadId: number;
  gears: SmithGear[];
  /** 背包里的强化石。 */
  stoneOwned: number;
  gold: number;
  diamond: number;
  code?: number;
}

export interface SmithStrengthenReq {
  heroId: number;
}

export interface SmithStrengthenResp {
  ok: boolean;
  heroId: number;
  gear: SmithGear | null;
  /** 本次扣掉的金币。失败为 0。 */
  goldCost: number;
  /** 本次扣掉的强化石。失败为 0。 */
  stoneCost: number;
  stoneOwned: number;
  gold: number;
  diamond: number;
  /** 金币不足时，这次实际需要的金币。 */
  needGold?: number;
  /** 强化石不足时，这次实际需要的个数。 */
  needStone?: number;
  /**
   * 没有这名英雄 HERO_NOT_FOUND，金币不足 SMITH_GOLD_SHORT，
   * 强化石不足 SMITH_STONE_SHORT，武器已满级 SMITH_LEVEL_MAX。
   * 成功可以不带。
   */
  code?: number;
}
