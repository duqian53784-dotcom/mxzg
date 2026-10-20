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

export interface StagePushReq {
  /** 连胜推到这一关（含）。缺省 70。只给 Mock 预览调试。 */
  target?: number;
}

export interface StagePushResp extends StageResultResp {
  /** 这次开始前已经通关的关数。 */
  fromStage: number;
  /** 结算后的已通关关数。 */
  clearedStage: number;
  /** 这次新发的金币。已经到了目标时是 0。 */
  goldGain: number;
  /** 开始前就已经到达目标。进度和钱包不动。 */
  already: boolean;
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

/** 一名固定的 Mock 对手。积分和战力都不随玩家变化。 */
export interface ArenaOpponent {
  id: number;
  name: string;
  score: number;
  power: number;
}

export interface ArenaViewReq {
  /** 占位。Mock 不看请求体。打开时按当前开服天刷新今日次数。 */
  clientTime?: number;
}

export interface ArenaViewResp {
  ok: boolean;
  /** 玩家积分。新号 1000。 */
  score: number;
  /** 由积分换算的约占位名次，不是真实排行榜。 */
  rank: number;
  /** 名册攻击之和，含武器。 */
  power: number;
  /** 今日已挑战次数。 */
  used: number;
  /** 今日上限。Mock 为 5。 */
  limit: number;
  opponents: ArenaOpponent[];
  gold: number;
  diamond: number;
  code?: number;
}

export interface ArenaChallengeReq {
  opponentId: number;
}

export interface ArenaChallengeResp {
  ok: boolean;
  opponentId: number;
  opponentName: string;
  win: boolean;
  /** 挑战时的名册战力。 */
  playerPower: number;
  opponentPower: number;
  scoreBefore: number;
  score: number;
  /** 实际变化。胜利为正，失败为负或 0（已经到积分下限）。 */
  scoreDelta: number;
  rank: number;
  /** 胜利才有金币。失败为 0。 */
  goldGain: number;
  gold: number;
  diamond: number;
  used: number;
  limit: number;
  /**
   * 没有这位对手 ARENA_NOT_FOUND，今日次数用完 ARENA_NO_CHANCE。
   * 成功可以不带。失败不改积分、金币和已用次数。
   */
  code?: number;
}

export interface TowerViewReq {
  /** 占位。Mock 不看请求体。打开时按当前开服天刷新今日次数。 */
  clientTime?: number;
}

export interface TowerViewResp {
  ok: boolean;
  /** 下一层。通关最后一层后为 maxFloor + 1。 */
  floor: number;
  maxFloor: number;
  /** 已经打完最后一层。 */
  cleared: boolean;
  /** 当前层守关。已到塔顶时为空。 */
  name: string;
  /** 当前层守关战力。已到塔顶为 0。 */
  floorPower: number;
  /** 名册攻击之和，含武器。 */
  playerPower: number;
  /** 今日已挑战次数。 */
  used: number;
  /** 今日上限。Mock 为 10。 */
  limit: number;
  /** 背包里的强化石。 */
  stoneOwned: number;
  gold: number;
  diamond: number;
  code?: number;
}

export interface TowerChallengeReq {
  /** 占位。只打当前层，不选层。 */
  clientTime?: number;
}

export interface TowerChallengeResp {
  ok: boolean;
  /** 这次打的层。拒绝时仍是当前层。 */
  floor: number;
  /** 胜利后的下一层。失败、次数用完或已到塔顶时与挑战前相同。 */
  nextFloor: number;
  name: string;
  win: boolean;
  playerPower: number;
  floorPower: number;
  /** 胜利才有金币。失败为 0。 */
  goldGain: number;
  /** 胜利发放的道具。Mock 是强化石 id 101。失败时仍带回 id，数量为 0。 */
  itemId: number;
  itemName: string;
  itemGain: number;
  stoneOwned: number;
  gold: number;
  diamond: number;
  used: number;
  limit: number;
  /**
   * 已到塔顶 TOWER_CLEARED，今日次数用完 TOWER_NO_CHANCE。
   * 成功可以不带。失败不改层数、金币、道具和已用次数。
   * 战力不够也是成功回包，win 为 false，层数不变，仍占 1 次。
   */
  code?: number;
}

/** 金币副本的一档难度。奖励固定，打开就能预览。 */
export interface DailyTier {
  id: number;
  name: string;
  /** 建议战力。我方不低于它则胜。 */
  power: number;
  /** 胜利发放的金币。 */
  gold: number;
  /** 额外道具。简单可以是 0。Mock 用强化石 id 101。 */
  itemId: number;
  itemName: string;
  itemCount: number;
}

export interface DailyViewReq {
  /** 占位。Mock 不看请求体。打开时按当前开服天刷新今日次数。 */
  clientTime?: number;
}

export interface DailyViewResp {
  ok: boolean;
  /** 目前只有 gold。经验副本和英雄副本以后再加。 */
  kind: string;
  /** 今日已挑战次数。 */
  used: number;
  /** 今日上限。Mock 金币副本为 2。 */
  limit: number;
  /** 名册攻击之和，含武器。 */
  playerPower: number;
  tiers: DailyTier[];
  /** 背包里的强化石。 */
  stoneOwned: number;
  gold: number;
  diamond: number;
  code?: number;
}

export interface DailyChallengeReq {
  tierId: number;
}

export interface DailyChallengeResp {
  ok: boolean;
  tierId: number;
  name: string;
  win: boolean;
  playerPower: number;
  /** 这一档的建议战力。 */
  needPower: number;
  /** 胜利才有金币。失败为 0。 */
  goldGain: number;
  itemId: number;
  itemName: string;
  /** 胜利才发。简单为 0。失败为 0。 */
  itemGain: number;
  stoneOwned: number;
  gold: number;
  diamond: number;
  used: number;
  limit: number;
  /**
   * 没有这个难度 DAILY_NOT_FOUND，今日次数用完 DAILY_NO_CHANCE。
   * 成功可以不带。这两种失败不改金币、道具和已用次数。
   * 战力不够也是成功回包，win 为 false，不发奖励，仍占 1 次。
   */
  code?: number;
}

/** 七日登录的一格奖励。id 1 金币、id 2 钻石，其余进背包。 */
export interface Login7Reward {
  id: number;
  name: string;
  count: number;
}

/** 格子状态。ready 含今天和以前没领的天。 */
export type Login7DayState = "locked" | "claimed" | "ready";

export interface Login7Day {
  day: number;
  state: Login7DayState;
  rewards: Login7Reward[];
}

export interface Login7ViewReq {
  /** 占位。Mock 不看请求体。 */
  clientTime?: number;
}

export interface Login7ViewResp {
  ok: boolean;
  /** 角色登录天，1 到 7。跟创角后的登录天数走，不跟开服天。 */
  loginDay: number;
  /** 当前开服天，只供对照。领取和调试加天都不改它。 */
  openDay: number;
  days: Login7Day[];
  gold: number;
  diamond: number;
  code?: number;
}

export interface Login7ClaimReq {
  /** 要领的登录天，1 到 7。 */
  day: number;
}

export interface Login7ClaimResp {
  ok: boolean;
  day: number;
  rewards: Login7Reward[];
  /** 这次加进钱包的金币。道具不在这里。 */
  goldGain: number;
  diamondGain: number;
  gold: number;
  diamond: number;
  loginDay: number;
  /**
   * 没有这一天 LOGIN7_NOT_FOUND，尚未到达 LOGIN7_LOCKED，已经领过 LOGIN7_CLAIMED。
   * 成功可以不带。失败不改钱包、背包和已领记录。
   */
  code?: number;
}

export interface Login7AdvanceReq {
  /** 占位。只给 Mock 预览把角色登录天 +1。 */
  clientTime?: number;
}

export interface Login7AdvanceResp {
  ok: boolean;
  loginDay: number;
  /** 这次有没有真的 +1。已经是第 7 天时为 false。 */
  advanced: boolean;
  openDay: number;
  /** 已经是第 7 天时 LOGIN7_MAX。不改开服天，也不自动领取。 */
  code?: number;
}

/** 七日目标的一格奖励。id 1 金币、id 2 钻石，其余进背包。 */
export interface Goal7Reward {
  id: number;
  name: string;
  count: number;
}

/** 前往哪一页。页面栈再压一层，返回仍回到七日目标。 */
export type Goal7Jump = "mainline" | "summon" | "hero" | "idle";

/** locked 未开启，in-progress 进行中，claimable 可领取，claimed 已领取。 */
export type Goal7State = "locked" | "in-progress" | "claimable" | "claimed";

export interface Goal7Task {
  id: string;
  /** 分组用的天，1 到 7。不按登录天上锁。 */
  day: number;
  title: string;
  state: Goal7State;
  /** 当前进度，可以大于目标。界面上显示时封顶到目标。 */
  current: number;
  target: number;
  jump: Goal7Jump;
  rewards: Goal7Reward[];
}

export interface Goal7ViewReq {
  /** 占位。Mock 不看请求体。 */
  clientTime?: number;
}

export interface Goal7ViewResp {
  ok: boolean;
  /** 已通关关卡数。第 70 关任务用它判断开没开。 */
  clearedStage: number;
  tasks: Goal7Task[];
  gold: number;
  diamond: number;
  code?: number;
}

export interface Goal7ClaimReq {
  /** 任务 id，例如 stage-1、stage-70。 */
  id: string;
}

export interface Goal7ClaimResp {
  ok: boolean;
  id: string;
  title: string;
  /** 失败时的状态，方便 Toast 写出进度。成功为 claimed。 */
  state: Goal7State;
  current: number;
  target: number;
  rewards: Goal7Reward[];
  goldGain: number;
  diamondGain: number;
  gold: number;
  diamond: number;
  /**
   * 没有这个目标 GOAL7_NOT_FOUND，尚未开启 GOAL7_LOCKED，
   * 还没完成 GOAL7_INCOMPLETE，已经领过 GOAL7_CLAIMED。
   * 成功可以不带。失败不改钱包、背包和已领记录。
   */
  code?: number;
}

/** 商店计价。gold 扣顶栏金币，diamond 扣顶栏钻石。 */
export type ShopCurrency = "gold" | "diamond";

/** 货架上的一格。bought 是今日已购次数，owned 是背包里该道具的数量。 */
export interface ShopSku {
  id: number;
  itemId: number;
  name: string;
  /** 一次购买获得的个数。 */
  count: number;
  currency: ShopCurrency;
  price: number;
  bought: number;
  /** 今日限购次数。Mock 都大于 0。 */
  limit: number;
  owned: number;
}

export interface ShopViewReq {
  /** 占位。Mock 不看请求体。打开时按当前开服天刷新今日限购。 */
  clientTime?: number;
}

export interface ShopViewResp {
  ok: boolean;
  skus: ShopSku[];
  /** 当前开服天。限购跟着它走，不是墙钟倒计时。 */
  openDay: number;
  gold: number;
  diamond: number;
  code?: number;
}

export interface ShopBuyReq {
  /** 商品 id，不是道具 id。 */
  id: number;
}

export interface ShopBuyResp {
  ok: boolean;
  id: number;
  name: string;
  itemId: number;
  count: number;
  currency: ShopCurrency;
  price: number;
  bought: number;
  limit: number;
  /** 购买后背包里该道具的数量。失败时是购买前的数量。 */
  owned: number;
  gold: number;
  diamond: number;
  /**
   * 没有这个商品 SHOP_NOT_FOUND，今日售罄 SHOP_SOLD_OUT，
   * 金币不足 SHOP_GOLD_SHORT，钻石不足 SHOP_DIAMOND_SHORT。
   * 成功可以不带。失败不改钱包、背包和已购次数。
   */
  code?: number;
}
