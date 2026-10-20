import { ErrorCode } from "../core/errors";
import {
  applyHeroExp,
  EXP_POTION_GAIN,
  GOLD_BAG_GAIN,
  ITEM_EXP_POTION,
  ITEM_GOLD_BAG,
  listBagItems,
  STARTER_EXP_POTION,
  STARTER_GOLD_BAG,
} from "../module/bag/items";
import {
  clampWeaponLevel,
  HeroRosterEntry,
  HeroSeed,
  HERO_MAX_LEVEL,
  normalizeRoster,
  starterRoster,
  toHeroCard,
  upgradeCost,
  WEAPON_MAX_LEVEL,
} from "../module/hero/growth";
import { buildIdleView, elapsedSince, IDLE_ITEM_ID, IDLE_ITEM_NAME } from "../module/idle/rewards";
import {
  attachmentName,
  MailSeed,
  mergeAttachments,
  normalizeMailList,
  starterMails,
  StoredMail,
  toMailEntry,
} from "../module/mail/inbox";
import { strengthenGoldCost, STRENGTHEN_STONE_COST, toSmithGear } from "../module/smith/forge";
import {
  ARENA_DAILY_LIMIT,
  ARENA_START_SCORE,
  clampArenaScore,
  findArenaOpponent,
  listArenaOpponents,
  rankFromScore,
  rosterPower,
  settleArena,
} from "../module/arena/match";
import {
  clampTowerFloor,
  floorGuardianName,
  floorPower,
  settleTower,
  TOWER_DAILY_LIMIT,
  TOWER_ITEM_ID,
  TOWER_ITEM_NAME,
  TOWER_MAX_FLOOR,
  towerCleared,
} from "../module/tower/climb";
import {
  isSummonCount,
  poolAt,
  shardItemId,
  SUMMON_SHARD_GAIN,
  summonCost,
} from "../module/summon/pull";
import {
  BagListResp,
  BagUseResp,
  HeroListResp,
  HeroUpgradeResp,
  IdleClaimResp,
  IdleQueryResp,
  LoginResp,
  RoleCreateResp,
  RoleEnterResp,
  StageEnterResp,
  StageResultResp,
  MailAttachment,
  MailClaimAllResp,
  MailClaimResp,
  MailDeleteResp,
  MailListResp,
  MailReadResp,
  SmithStrengthenResp,
  SmithViewResp,
  ArenaChallengeResp,
  ArenaViewResp,
  SummonDrop,
  SummonPullResp,
  TowerChallengeResp,
  TowerViewResp,
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
  /** 不填则用新号起步：金币 100、钻石 20。 */
  gold?: number;
  diamond?: number;
  /** 挂机起算时刻（毫秒）。不填则从构造这一刻起算。 */
  idleAnchorMs?: number;
  /**
   * 已持有的道具。id 101 是强化石，201 小金币袋，202 经验药水。
   * 不填则发起步消耗品。填了（含空数组）就只用这里的数量。
   */
  items?: { id: number; count: number }[];
  /** 英雄名册。不填或空数组则种下三名起步英雄。 */
  heroes?: HeroSeed[];
  /** 召唤顺序下标。不填从 0 开始。创角会回到 0。 */
  summonCursor?: number;
  /**
   * 邮箱。不填则发起步三封：欢迎、开服补给、维护公告。
   * 填了（含空数组）就只用这里的邮件。
   */
  mails?: MailSeed[];
  /** 竞技场积分。不填则 1000。创角回到 1000。 */
  arenaScore?: number;
  /** 今日已挑战次数。不填为 0。超过每日上限时按上限计。 */
  arenaUsed?: number;
  /**
   * 次数所属的开服天。不填则跟当前 openDay 对齐，避免一打开就把次数清掉。
   * 和 openDay 不一致时，下一次查看或挑战会把次数清零。
   */
  arenaDay?: number;
  /** 幻境之塔下一层。不填为 1。通关第 20 层后为 21。创角回到 1。 */
  towerFloor?: number;
  /** 今日已挑战幻境之塔的次数。不填为 0。超过每日上限时按上限计。 */
  towerUsed?: number;
  /**
   * 塔次数所属的开服天。不填则跟当前 openDay 对齐。
   * 和 openDay 不一致时，下一次查看或挑战会把次数清零，层数不动。
   */
  towerDay?: number;
}

/** 新号起步钱包。主线胜利的奖励 id 1 加金币，id 2 加钻石。 */
export const MOCK_STARTER_GOLD = 100;
export const MOCK_STARTER_DIAMOND = 20;

/**
 * 进程内假服。不听端口。
 * C1 登录/创角、主线连打、挂机领取、英雄升级、召唤、背包使用、邮件领取、铁匠铺强化、竞技场挑战和幻境之塔都改这里的状态，编辑器预览不用另起进程。
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
  gold = MOCK_STARTER_GOLD;
  diamond = MOCK_STARTER_DIAMOND;
  battleSeq = 0;
  battleId = "";
  /**
   * 挂机起算。领取、创角会拨到当前时刻。
   * 断线重连不新建会话，所以不会把已累计的时间清掉。
   */
  idleAnchorMs = 0;
  /** 道具 id → 数量。顶栏不显示。挂机页写强化石，背包页列出全部。 */
  itemCounts: { [id: number]: number } = {};
  /** 为 true 时构造函数不再补起步消耗品。创角会重新发一份。 */
  private itemsSeeded = false;
  /** 邮箱。领取改钱包和背包，不改进度。 */
  mails: StoredMail[] = [];
  /** 为 true 时构造函数不再补起步三封。创角会重新发一份。 */
  private mailsSeeded = false;
  /** 已拥有的英雄。空名册会在构造、创角和读列表时种下起步三名。 */
  heroes: HeroRosterEntry[] = [];
  /** 下一抽出 SUMMON_POOL 的下标。单抽走 1 格，十连走 10 格。不足时不动。 */
  summonCursor = 0;
  /** 竞技场积分。不随主线变化。创角回到 1000。 */
  arenaScore = ARENA_START_SCORE;
  /** 当前 arenaDay 上已经用掉的挑战次数。 */
  arenaUsed = 0;
  /** 次数所属开服天。和 openDay 不同时，下一次竞技场操作清零。 */
  arenaDay = 1;
  private arenaDaySeeded = false;
  /** 幻境之塔下一层。不随主线变化。创角回到 1。 */
  towerFloor = 1;
  /** 当前 towerDay 上已经用掉的挑战次数。 */
  towerUsed = 0;
  /** 次数所属开服天。和 openDay 不同时，下一次塔操作清零。 */
  towerDay = 1;
  private towerDaySeeded = false;
  private clock: () => number = () => Date.now();

  constructor(seed?: MockSessionSeed, clock?: () => number) {
    if (typeof clock === "function") this.clock = clock;
    this.idleAnchorMs = this.clock();
    this.applySeed(seed);
    if (!this.arenaDaySeeded) this.arenaDay = this.openDay;
    if (!this.towerDaySeeded) this.towerDay = this.openDay;
    this.ensureHeroes();
    this.ensureStarterGear();
    if (!this.itemsSeeded) this.grantStarterItems();
    if (!this.mailsSeeded) this.grantStarterMails();
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
        gold: 0,
        diamond: 0,
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
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /** 空名字拒绝。成功则改名，并把主线、开服天、钱包、道具、英雄、武器、召唤游标、邮箱、竞技场和幻境之塔重置到新号。 */
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
    this.gold = MOCK_STARTER_GOLD;
    this.diamond = MOCK_STARTER_DIAMOND;
    this.battleId = "";
    this.itemCounts = {};
    this.grantStarterItems();
    this.heroes = starterRoster();
    this.ensureStarterGear();
    this.summonCursor = 0;
    this.grantStarterMails();
    this.idleAnchorMs = this.clock();
    this.syncDerived(true);
    this.arenaScore = ARENA_START_SCORE;
    this.arenaUsed = 0;
    this.arenaDay = this.openDay;
    this.towerFloor = 1;
    this.towerUsed = 0;
    this.towerDay = this.openDay;
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
        gold: this.gold,
        diamond: this.diamond,
      };
    }
    if (win && stageId > this.clearedStage) {
      this.clearedStage = stageId;
      this.syncDerived(false);
    }
    const nextStageId = win ? this.clearedStage + 1 : stageId;
    if (win) this.stageId = nextStageId;
    const rewards = win ? [{ id: 1, count: 10 }] : [];
    this.addRewards(rewards);
    this.battleId = "";
    return {
      ok: true,
      stageId,
      win,
      nextStageId,
      rewards,
      openDay: this.openDay,
      level: this.role.level,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /** 只读预览。不改钱包，也不拨动起算时刻。 */
  idleQuery(): IdleQueryResp {
    const view = buildIdleView(elapsedSince(this.clock(), this.idleAnchorMs), this.clearedStage);
    return {
      ok: true,
      elapsedMs: view.elapsedMs,
      capMs: view.capMs,
      capped: view.capped,
      clearedStage: this.clearedStage,
      stageId: this.stageId,
      goldPerMin: view.goldPerMin,
      itemEveryMs: view.itemEveryMs,
      itemId: IDLE_ITEM_ID,
      itemName: IDLE_ITEM_NAME,
      pendingGold: view.pendingGold,
      pendingItem: view.pendingItem,
      capGold: view.capGold,
      capItem: view.capItem,
      ownedItem: this.itemCount(IDLE_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 把当前可领的金币和强化石计入钱包，然后重新起算。
   * 不满 1 个单位时拒绝，钱包和起算时刻都不动。
   * 主线胜利不调用这里，快速作战也不会把挂机时间清掉。
   */
  idleClaim(): IdleClaimResp {
    const view = buildIdleView(elapsedSince(this.clock(), this.idleAnchorMs), this.clearedStage);
    const owned = this.itemCount(IDLE_ITEM_ID);
    if (view.pendingGold <= 0 && view.pendingItem <= 0) {
      return {
        ok: false,
        code: ErrorCode.IDLE_EMPTY,
        rewards: [],
        elapsedMs: view.elapsedMs,
        gold: this.gold,
        diamond: this.diamond,
        ownedItem: owned,
      };
    }
    const rewards: { id: number; count: number; name: string }[] = [];
    if (view.pendingGold > 0) rewards.push({ id: 1, count: view.pendingGold, name: "金币" });
    if (view.pendingItem > 0) rewards.push({ id: IDLE_ITEM_ID, count: view.pendingItem, name: IDLE_ITEM_NAME });
    this.addRewards(rewards);
    if (view.pendingItem > 0) this.addItem(IDLE_ITEM_ID, view.pendingItem);
    this.idleAnchorMs = this.clock();
    return {
      ok: true,
      rewards,
      elapsedMs: 0,
      gold: this.gold,
      diamond: this.diamond,
      ownedItem: this.itemCount(IDLE_ITEM_ID),
    };
  }

  /** 只读名册。空了会先种下起步英雄。不改钱包。 */
  heroList(): HeroListResp {
    this.ensureHeroes();
    const heroes: HeroListResp["heroes"] = [];
    for (let i = 0; i < this.heroes.length; i++) heroes.push(toHeroCard(this.heroes[i]));
    return { ok: true, heroes, gold: this.gold, diamond: this.diamond };
  }

  /**
   * 升级一名英雄，扣除金币。星级不动。
   * 没有这名英雄、金币不够、或已满级时拒绝，等级和钱包都不变。
   * 不改挂机起算，也不改主线进度。
   */
  heroUpgrade(data: unknown): HeroUpgradeResp {
    this.ensureHeroes();
    const heroId = Math.floor(numField(asRecord(data), "heroId", 0));
    const hero = this.findHero(heroId);
    if (!hero) {
      return {
        ok: false,
        code: ErrorCode.HERO_NOT_FOUND,
        heroId,
        hero: null,
        cost: 0,
        gold: this.gold,
        diamond: this.diamond,
      };
    }
    const current = toHeroCard(hero);
    if (hero.level >= HERO_MAX_LEVEL) {
      return {
        ok: false,
        code: ErrorCode.HERO_LEVEL_MAX,
        heroId,
        hero: current,
        cost: 0,
        gold: this.gold,
        diamond: this.diamond,
      };
    }
    const cost = upgradeCost(hero.level);
    if (this.gold < cost) {
      return {
        ok: false,
        code: ErrorCode.HERO_GOLD_SHORT,
        heroId,
        hero: current,
        cost: 0,
        needGold: cost,
        gold: this.gold,
        diamond: this.diamond,
      };
    }
    this.gold -= cost;
    hero.level += 1;
    return {
      ok: true,
      heroId,
      hero: toHeroCard(hero),
      cost,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 只读铁匠铺。空名册会先种下起步英雄。
   * 还没有武器的英雄补一把 Lv1 新手短剑，不扣金币，也不扣强化石。
   */
  smithView(): SmithViewResp {
    this.ensureHeroes();
    this.ensureStarterGear();
    const gears: SmithViewResp["gears"] = [];
    for (let i = 0; i < this.heroes.length; i++) gears.push(toSmithGear(this.heroes[i]));
    const lead = this.heroes.length > 0 ? this.heroes[0].id : 0;
    return {
      ok: true,
      leadId: lead,
      gears,
      stoneOwned: this.itemCount(IDLE_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 把指定英雄的新手短剑强化 1 级。
   * 消耗金币和 1 个强化石。还没有武器时先免费补成 Lv1，再按这一级的花费往上强化。
   * 没有这名英雄、金币不够、强化石不够、或已满级时拒绝：不扣金币和强化石，也不提升等级。
   * 补武器本身不收费，所以失败时 Lv0 会变成 Lv1，已经有的等级保持原样。
   * 不改英雄等级、星级、钻石、挂机起算和主线进度。
   */
  smithStrengthen(data: unknown): SmithStrengthenResp {
    this.ensureHeroes();
    this.ensureStarterGear();
    const heroId = Math.floor(numField(asRecord(data), "heroId", 0));
    const hero = this.findHero(heroId);
    if (!hero) return this.smithFail(heroId, ErrorCode.HERO_NOT_FOUND);
    const level = clampWeaponLevel(hero.weaponLevel);
    if (level >= WEAPON_MAX_LEVEL) return this.smithFail(heroId, ErrorCode.SMITH_LEVEL_MAX);
    const goldCost = strengthenGoldCost(level);
    const stoneCost = STRENGTHEN_STONE_COST;
    if (this.gold < goldCost) return this.smithFail(heroId, ErrorCode.SMITH_GOLD_SHORT, { needGold: goldCost });
    const ownedStone = this.itemCount(IDLE_ITEM_ID);
    if (ownedStone < stoneCost) return this.smithFail(heroId, ErrorCode.SMITH_STONE_SHORT, { needStone: stoneCost });
    this.gold -= goldCost;
    this.spendItem(IDLE_ITEM_ID, stoneCost);
    hero.weaponLevel = level + 1;
    return {
      ok: true,
      heroId,
      gear: toSmithGear(hero),
      goldCost,
      stoneCost,
      stoneOwned: this.itemCount(IDLE_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 只读竞技场。按当前开服天刷新今日次数，不改积分和钱包。
   * 对手是固定名单。入口等级锁在客户端，这里不重复判断主线等级。
   */
  arenaView(): ArenaViewResp {
    this.ensureHeroes();
    this.refreshArenaDay();
    return {
      ok: true,
      score: this.arenaScore,
      rank: rankFromScore(this.arenaScore),
      power: rosterPower(this.heroes),
      used: this.arenaUsed,
      limit: ARENA_DAILY_LIMIT,
      opponents: listArenaOpponents(),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 挑战一名固定对手，一键结算。战力不低于对手则胜。
   * 胜利加积分和金币，失败只扣积分。胜负都占用 1 次今日次数。
   * 没有这位对手或次数用完时拒绝，积分、金币和次数都不变。
   * 不改英雄、武器、钻石、挂机起算和主线进度。
   */
  arenaChallenge(data: unknown): ArenaChallengeResp {
    this.ensureHeroes();
    this.refreshArenaDay();
    const opponentId = Math.floor(numField(asRecord(data), "opponentId", 0));
    const opponent = findArenaOpponent(opponentId);
    if (!opponent) return this.arenaFail(opponentId, "", ErrorCode.ARENA_NOT_FOUND);
    if (this.arenaUsed >= ARENA_DAILY_LIMIT) {
      return this.arenaFail(opponentId, opponent.name, ErrorCode.ARENA_NO_CHANCE);
    }
    const playerPower = rosterPower(this.heroes);
    const settled = settleArena(playerPower, opponent.power, this.arenaScore);
    this.arenaScore = settled.score;
    if (settled.goldGain > 0) this.gold += settled.goldGain;
    this.arenaUsed += 1;
    return {
      ok: true,
      opponentId,
      opponentName: opponent.name,
      win: settled.win,
      playerPower,
      opponentPower: opponent.power,
      scoreBefore: settled.scoreBefore,
      score: settled.score,
      scoreDelta: settled.scoreDelta,
      rank: settled.rank,
      goldGain: settled.goldGain,
      gold: this.gold,
      diamond: this.diamond,
      used: this.arenaUsed,
      limit: ARENA_DAILY_LIMIT,
    };
  }

  /**
   * 只读幻境之塔。按当前开服天刷新今日次数，不改层数和钱包。
   * 入口等级锁在客户端，这里不重复判断主线等级，也不看开服天。
   */
  towerView(): TowerViewResp {
    this.ensureHeroes();
    this.refreshTowerDay();
    const floor = this.towerFloor;
    const cleared = towerCleared(floor);
    return {
      ok: true,
      floor,
      maxFloor: TOWER_MAX_FLOOR,
      cleared,
      name: floorGuardianName(floor),
      floorPower: floorPower(floor),
      playerPower: rosterPower(this.heroes),
      used: this.towerUsed,
      limit: TOWER_DAILY_LIMIT,
      stoneOwned: this.itemCount(TOWER_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 挑战当前层，一键结算。战力不低于守关则胜。
   * 胜利层数 +1，加金币和 1 个强化石。失败层数不变，不发奖励。胜负都占用 1 次今日次数。
   * 已到塔顶或次数用完时拒绝，层数、金币、道具和次数都不变。
   * 不改英雄、武器、钻石、挂机起算、主线进度和竞技场。
   */
  towerChallenge(): TowerChallengeResp {
    this.ensureHeroes();
    this.refreshTowerDay();
    if (towerCleared(this.towerFloor)) return this.towerFail(ErrorCode.TOWER_CLEARED);
    if (this.towerUsed >= TOWER_DAILY_LIMIT) return this.towerFail(ErrorCode.TOWER_NO_CHANCE);
    const playerPower = rosterPower(this.heroes);
    const settled = settleTower(playerPower, this.towerFloor);
    if (settled.win) {
      this.towerFloor = settled.nextFloor;
      if (settled.goldGain > 0) this.gold += settled.goldGain;
      if (settled.itemGain > 0) this.addItem(TOWER_ITEM_ID, settled.itemGain);
    }
    this.towerUsed += 1;
    return {
      ok: true,
      floor: settled.floor,
      nextFloor: this.towerFloor,
      name: floorGuardianName(settled.floor),
      win: settled.win,
      playerPower,
      floorPower: settled.floorPower,
      goldGain: settled.goldGain,
      itemId: TOWER_ITEM_ID,
      itemName: TOWER_ITEM_NAME,
      itemGain: settled.itemGain,
      stoneOwned: this.itemCount(TOWER_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
      used: this.towerUsed,
      limit: TOWER_DAILY_LIMIT,
    };
  }

  /**
   * 单抽或十连，只扣钻石。
   * 新英雄追加到名册末尾（Lv1，星级按卡池）。已拥有则加碎片，等级和星级不动。
   * 钻石不够或次数不是 1/10 时整次拒绝，游标、名册、钱包都不变。
   * 不改金币、挂机起算和主线进度。
   */
  summon(data: unknown): SummonPullResp {
    this.ensureHeroes();
    const count = Math.floor(numField(asRecord(data), "count", 0));
    if (!isSummonCount(count)) {
      return {
        ok: false,
        code: ErrorCode.SUMMON_COUNT_INVALID,
        count,
        cost: 0,
        drops: [],
        newCount: 0,
        shardCount: 0,
        gold: this.gold,
        diamond: this.diamond,
      };
    }
    const cost = summonCost(count);
    if (this.diamond < cost) {
      return {
        ok: false,
        code: ErrorCode.SUMMON_DIAMOND_SHORT,
        count,
        cost: 0,
        drops: [],
        newCount: 0,
        shardCount: 0,
        gold: this.gold,
        diamond: this.diamond,
        needDiamond: cost,
      };
    }
    this.diamond -= cost;
    const drops: SummonDrop[] = [];
    let newCount = 0;
    let shardCount = 0;
    for (let i = 0; i < count; i++) {
      const candidate = poolAt(this.summonCursor);
      this.summonCursor += 1;
      const shardId = shardItemId(candidate.id);
      if (this.findHero(candidate.id)) {
        this.addItem(shardId, SUMMON_SHARD_GAIN);
        shardCount += 1;
        drops.push({
          heroId: candidate.id,
          name: candidate.name,
          star: candidate.star,
          kind: "shard",
          shardId,
          shardGain: SUMMON_SHARD_GAIN,
          shardOwned: this.itemCount(shardId),
        });
      } else {
        this.heroes.push({ id: candidate.id, name: candidate.name, level: 1, star: candidate.star, weaponLevel: 1 });
        newCount += 1;
        drops.push({
          heroId: candidate.id,
          name: candidate.name,
          star: candidate.star,
          kind: "new",
          shardId,
          shardGain: 0,
          shardOwned: this.itemCount(shardId),
        });
      }
    }
    return {
      ok: true,
      count,
      cost,
      drops,
      newCount,
      shardCount,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /** 只读背包。数量为 0 的不出现。不改钱包，也不改英雄。 */
  bagList(): BagListResp {
    return {
      ok: true,
      items: listBagItems(this.itemCounts, (heroId) => this.heroNameById(heroId)),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 使用道具，默认 1 个。
   * 小金币袋加金币。经验药水给名册第一名加经验，满 100 升 1 级。
   * 强化石和碎片拒绝，数量不动。
   * 背包是空的、没有这个道具、数量不够、数量小于 1、领队已满级时拒绝。
   * 不改钻石、挂机起算、主线和召唤游标。
   */
  bagUse(data: unknown): BagUseResp {
    const body = asRecord(data);
    const id = Math.floor(numField(body, "id", 0));
    const count = readUseCount(body);
    if (count === null) return this.bagFail(id, ErrorCode.BAG_COUNT_INVALID);
    const owned = this.itemCount(id);
    const view = this.findBagView(id);
    if (owned <= 0 || !view) {
      const empty = listBagItems(this.itemCounts, (heroId) => this.heroNameById(heroId)).length === 0;
      return this.bagFail(id, empty ? ErrorCode.BAG_EMPTY : ErrorCode.BAG_NOT_FOUND);
    }
    if (count > owned) return this.bagFail(id, ErrorCode.BAG_NOT_ENOUGH, { need: count });
    if (!view.usable) return this.bagFail(id, ErrorCode.BAG_NOT_USABLE);
    if (id === ITEM_GOLD_BAG) {
      this.spendItem(id, count);
      const goldGain = GOLD_BAG_GAIN * count;
      this.gold += goldGain;
      return {
        ok: true,
        id,
        name: view.name,
        kind: view.kind,
        spent: count,
        owned: this.itemCount(id),
        gold: this.gold,
        diamond: this.diamond,
        goldGain,
      };
    }
    if (id === ITEM_EXP_POTION) {
      this.ensureHeroes();
      const hero = this.heroes[0];
      if (!hero || hero.level >= HERO_MAX_LEVEL) {
        return this.bagFail(id, ErrorCode.BAG_HERO_MAX, {
          heroName: hero ? hero.name : "",
          heroLevel: hero ? hero.level : 0,
        });
      }
      this.spendItem(id, count);
      const next = applyHeroExp(hero.level, hero.exp || 0, EXP_POTION_GAIN * count, HERO_MAX_LEVEL);
      hero.level = next.level;
      hero.exp = next.exp;
      return {
        ok: true,
        id,
        name: view.name,
        kind: view.kind,
        spent: count,
        owned: this.itemCount(id),
        gold: this.gold,
        diamond: this.diamond,
        heroId: hero.id,
        heroName: hero.name,
        heroLevel: hero.level,
        expGain: EXP_POTION_GAIN * count,
        leveled: next.leveled,
      };
    }
    return this.bagFail(id, ErrorCode.BAG_NOT_USABLE);
  }

  /** 只读邮箱。不改已读，也不改钱包。 */
  mailList(): MailListResp {
    const mails = this.viewMails();
    let unread = 0;
    let claimable = 0;
    for (let i = 0; i < mails.length; i++) {
      if (mails[i].unread) unread += 1;
      if (mails[i].hasAttachment && !mails[i].claimed) claimable += 1;
    }
    return {
      ok: true,
      mails,
      unread,
      claimable,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /** 标成已读。已经读过也成功。不发附件。 */
  mailRead(data: unknown): MailReadResp {
    const id = readMailId(data);
    const mail = this.findMail(id);
    if (!mail) return { ok: false, gold: this.gold, diamond: this.diamond, code: ErrorCode.MAIL_NOT_FOUND };
    mail.read = true;
    return { ok: true, mail: this.viewMail(mail), gold: this.gold, diamond: this.diamond };
  }

  /**
   * 领取一封附件。金币、钻石进钱包，其它进背包，然后标成已领取和已读。
   * 没有这封、没有附件、已经领过都拒绝，钱包和背包不动。
   * 不改英雄、挂机起算、主线和召唤游标。
   */
  mailClaim(data: unknown): MailClaimResp {
    const id = readMailId(data);
    const mail = this.findMail(id);
    if (!mail) return this.mailClaimFail(id, ErrorCode.MAIL_NOT_FOUND);
    const rewards = this.namedAttachments(mail);
    if (rewards.length === 0) return this.mailClaimFail(id, ErrorCode.MAIL_NO_ATTACHMENT);
    if (mail.claimed) return this.mailClaimFail(id, ErrorCode.MAIL_ALREADY_CLAIMED);
    const gain = this.grantAttachments(rewards);
    mail.claimed = true;
    mail.read = true;
    return {
      ok: true,
      id,
      title: mail.title,
      count: 1,
      rewards,
      gold: this.gold,
      diamond: this.diamond,
      goldGain: gain.goldGain,
      diamondGain: gain.diamondGain,
    };
  }

  /** 把每封还没领的附件都领掉。一封都没有时拒绝，状态不动。 */
  mailClaimAll(): MailClaimAllResp {
    const targets: StoredMail[] = [];
    for (let i = 0; i < this.mails.length; i++) {
      const mail = this.mails[i];
      if (mail.claimed) continue;
      if (this.namedAttachments(mail).length === 0) continue;
      targets.push(mail);
    }
    if (targets.length === 0) return this.mailClaimAllFail(ErrorCode.MAIL_NOTHING);
    const ids: number[] = [];
    const pieces: MailAttachment[] = [];
    let goldGain = 0;
    let diamondGain = 0;
    for (let i = 0; i < targets.length; i++) {
      const mail = targets[i];
      const rewards = this.namedAttachments(mail);
      const gain = this.grantAttachments(rewards);
      mail.claimed = true;
      mail.read = true;
      ids.push(mail.id);
      goldGain += gain.goldGain;
      diamondGain += gain.diamondGain;
      for (let j = 0; j < rewards.length; j++) pieces.push(rewards[j]);
    }
    return {
      ok: true,
      count: ids.length,
      ids,
      rewards: mergeAttachments(pieces),
      gold: this.gold,
      diamond: this.diamond,
      goldGain,
      diamondGain,
    };
  }

  /** 删一封。还有未领附件时拒绝。没有附件或已经领过可以删。 */
  mailDelete(data: unknown): MailDeleteResp {
    const id = readMailId(data);
    const mail = this.findMail(id);
    if (!mail) {
      return { ok: false, id, title: "", gold: this.gold, diamond: this.diamond, code: ErrorCode.MAIL_NOT_FOUND };
    }
    if (!mail.claimed && this.namedAttachments(mail).length > 0) {
      return {
        ok: false,
        id,
        title: mail.title,
        gold: this.gold,
        diamond: this.diamond,
        code: ErrorCode.MAIL_DELETE_BLOCKED,
      };
    }
    const title = mail.title;
    const next: StoredMail[] = [];
    for (let i = 0; i < this.mails.length; i++) {
      if (this.mails[i].id !== id) next.push(this.mails[i]);
    }
    this.mails = next;
    return { ok: true, id, title, gold: this.gold, diamond: this.diamond };
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
    if (typeof seed.gold === "number" && isFinite(seed.gold)) this.gold = Math.max(0, Math.floor(seed.gold));
    if (typeof seed.diamond === "number" && isFinite(seed.diamond)) {
      this.diamond = Math.max(0, Math.floor(seed.diamond));
    }
    if (typeof seed.idleAnchorMs === "number" && isFinite(seed.idleAnchorMs)) {
      this.idleAnchorMs = Math.floor(seed.idleAnchorMs);
    }
    if (Array.isArray(seed.items)) {
      this.itemsSeeded = true;
      for (let i = 0; i < seed.items.length; i++) {
        const row = seed.items[i];
        if (!row || typeof row.id !== "number" || !isFinite(row.id)) continue;
        if (typeof row.count !== "number" || !isFinite(row.count) || row.count <= 0) continue;
        this.itemCounts[Math.floor(row.id)] = Math.floor(row.count);
      }
    }
    if (Array.isArray(seed.heroes)) this.heroes = normalizeRoster(seed.heroes);
    if (typeof seed.summonCursor === "number" && isFinite(seed.summonCursor) && seed.summonCursor >= 0) {
      this.summonCursor = Math.floor(seed.summonCursor);
    }
    if (Array.isArray(seed.mails)) {
      this.mailsSeeded = true;
      this.mails = normalizeMailList(seed.mails);
    }
    if (typeof seed.arenaScore === "number" && isFinite(seed.arenaScore)) {
      this.arenaScore = clampArenaScore(seed.arenaScore);
    }
    if (typeof seed.arenaUsed === "number" && isFinite(seed.arenaUsed)) {
      let used = Math.floor(seed.arenaUsed);
      if (used < 0) used = 0;
      if (used > ARENA_DAILY_LIMIT) used = ARENA_DAILY_LIMIT;
      this.arenaUsed = used;
    }
    if (typeof seed.arenaDay === "number" && isFinite(seed.arenaDay) && seed.arenaDay >= 1) {
      this.arenaDay = Math.floor(seed.arenaDay);
      this.arenaDaySeeded = true;
    }
    if (typeof seed.towerFloor === "number" && isFinite(seed.towerFloor)) {
      this.towerFloor = clampTowerFloor(seed.towerFloor);
    }
    if (typeof seed.towerUsed === "number" && isFinite(seed.towerUsed)) {
      let used = Math.floor(seed.towerUsed);
      if (used < 0) used = 0;
      if (used > TOWER_DAILY_LIMIT) used = TOWER_DAILY_LIMIT;
      this.towerUsed = used;
    }
    if (typeof seed.towerDay === "number" && isFinite(seed.towerDay) && seed.towerDay >= 1) {
      this.towerDay = Math.floor(seed.towerDay);
      this.towerDaySeeded = true;
    }
  }

  /** id 1 金币，id 2 钻石。其它 id 先忽略。 */
  private addRewards(rewards: { id: number; count: number }[]): void {
    for (let i = 0; i < rewards.length; i++) {
      const reward = rewards[i];
      const count = typeof reward.count === "number" && isFinite(reward.count) ? Math.floor(reward.count) : 0;
      if (count <= 0) continue;
      if (reward.id === 1) this.gold += count;
      else if (reward.id === 2) this.diamond += count;
    }
  }

  private addItem(id: number, count: number): void {
    if (count <= 0) return;
    this.itemCounts[id] = this.itemCount(id) + count;
  }

  private spendItem(id: number, count: number): void {
    const left = this.itemCount(id) - count;
    if (left <= 0) delete this.itemCounts[id];
    else this.itemCounts[id] = left;
  }

  private grantStarterItems(): void {
    this.addItem(ITEM_GOLD_BAG, STARTER_GOLD_BAG);
    this.addItem(ITEM_EXP_POTION, STARTER_EXP_POTION);
  }

  private grantStarterMails(): void {
    this.mails = normalizeMailList(starterMails());
  }

  private viewMails() {
    const out = [];
    for (let i = 0; i < this.mails.length; i++) out.push(this.viewMail(this.mails[i]));
    return out;
  }

  private viewMail(mail: StoredMail) {
    return toMailEntry(mail, (heroId) => this.heroNameById(heroId));
  }

  private namedAttachments(mail: StoredMail): MailAttachment[] {
    const named: MailAttachment[] = [];
    for (let i = 0; i < mail.attachments.length; i++) {
      const row = mail.attachments[i];
      if (row.count <= 0 || row.id <= 0) continue;
      named.push({
        id: row.id,
        name: attachmentName(row.id, (heroId) => this.heroNameById(heroId)),
        count: row.count,
      });
    }
    return named;
  }

  private grantAttachments(rows: MailAttachment[]): { goldGain: number; diamondGain: number } {
    let goldGain = 0;
    let diamondGain = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.count <= 0) continue;
      if (row.id === 1) {
        this.gold += row.count;
        goldGain += row.count;
      } else if (row.id === 2) {
        this.diamond += row.count;
        diamondGain += row.count;
      } else {
        this.addItem(row.id, row.count);
      }
    }
    return { goldGain, diamondGain };
  }

  private findMail(id: number): StoredMail | null {
    if (id < 1) return null;
    for (let i = 0; i < this.mails.length; i++) {
      if (this.mails[i].id === id) return this.mails[i];
    }
    return null;
  }

  private mailClaimFail(id: number, code: number): MailClaimResp {
    const mail = this.findMail(id);
    return {
      ok: false,
      id,
      title: mail ? mail.title : "",
      count: 0,
      rewards: [],
      gold: this.gold,
      diamond: this.diamond,
      goldGain: 0,
      diamondGain: 0,
      code,
    };
  }

  private mailClaimAllFail(code: number): MailClaimAllResp {
    return {
      ok: false,
      count: 0,
      ids: [],
      rewards: [],
      gold: this.gold,
      diamond: this.diamond,
      goldGain: 0,
      diamondGain: 0,
      code,
    };
  }

  private findBagView(id: number): ReturnType<typeof listBagItems>[number] | null {
    const items = listBagItems(this.itemCounts, (heroId) => this.heroNameById(heroId));
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  private bagFail(
    id: number,
    code: number,
    extra?: { need?: number; heroName?: string; heroLevel?: number }
  ): BagUseResp {
    const view = this.findBagView(id);
    const heroName = extra && extra.heroName ? extra.heroName : undefined;
    const heroLevel = extra && typeof extra.heroLevel === "number" ? extra.heroLevel : undefined;
    return {
      ok: false,
      id,
      name: view ? view.name : "",
      kind: view ? view.kind : undefined,
      spent: 0,
      owned: this.itemCount(id),
      gold: this.gold,
      diamond: this.diamond,
      need: extra && typeof extra.need === "number" ? extra.need : undefined,
      heroName,
      heroLevel,
      code,
    };
  }

  private heroNameById(heroId: number): string {
    const hero = this.findHero(heroId);
    return hero ? hero.name : "";
  }

  private ensureHeroes(): void {
    if (this.heroes.length === 0) this.heroes = starterRoster();
  }

  /** 缺武器的英雄补 Lv1 新手短剑。已有等级只取整，不扣费。 */
  private ensureStarterGear(): void {
    this.ensureHeroes();
    for (let i = 0; i < this.heroes.length; i++) {
      this.heroes[i].weaponLevel = clampWeaponLevel(this.heroes[i].weaponLevel);
    }
  }

  /** 开服天变了就把今日次数清零。积分不动。 */
  private refreshArenaDay(): void {
    if (this.arenaDay === this.openDay) return;
    this.arenaDay = this.openDay;
    this.arenaUsed = 0;
  }

  /** 开服天变了就把塔的今日次数清零。层数不动。 */
  private refreshTowerDay(): void {
    if (this.towerDay === this.openDay) return;
    this.towerDay = this.openDay;
    this.towerUsed = 0;
  }

  private towerFail(code: number): TowerChallengeResp {
    const floor = this.towerFloor;
    const cleared = towerCleared(floor);
    return {
      ok: false,
      floor: cleared ? TOWER_MAX_FLOOR : floor,
      nextFloor: floor,
      name: floorGuardianName(floor),
      win: false,
      playerPower: rosterPower(this.heroes),
      floorPower: floorPower(floor),
      goldGain: 0,
      itemId: TOWER_ITEM_ID,
      itemName: TOWER_ITEM_NAME,
      itemGain: 0,
      stoneOwned: this.itemCount(TOWER_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
      used: this.towerUsed,
      limit: TOWER_DAILY_LIMIT,
      code,
    };
  }

  private arenaFail(opponentId: number, name: string, code: number): ArenaChallengeResp {
    return {
      ok: false,
      opponentId,
      opponentName: name,
      win: false,
      playerPower: rosterPower(this.heroes),
      opponentPower: 0,
      scoreBefore: this.arenaScore,
      score: this.arenaScore,
      scoreDelta: 0,
      rank: rankFromScore(this.arenaScore),
      goldGain: 0,
      gold: this.gold,
      diamond: this.diamond,
      used: this.arenaUsed,
      limit: ARENA_DAILY_LIMIT,
      code,
    };
  }

  private smithFail(
    heroId: number,
    code: number,
    extra?: { needGold?: number; needStone?: number }
  ): SmithStrengthenResp {
    const hero = this.findHero(heroId);
    return {
      ok: false,
      heroId,
      gear: hero ? toSmithGear(hero) : null,
      goldCost: 0,
      stoneCost: 0,
      stoneOwned: this.itemCount(IDLE_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
      needGold: extra && typeof extra.needGold === "number" ? extra.needGold : undefined,
      needStone: extra && typeof extra.needStone === "number" ? extra.needStone : undefined,
      code,
    };
  }

  private findHero(id: number): HeroRosterEntry | null {
    for (let i = 0; i < this.heroes.length; i++) {
      if (this.heroes[i].id === id) return this.heroes[i];
    }
    return null;
  }

  private itemCount(id: number): number {
    const value = this.itemCounts[id];
    return typeof value === "number" && isFinite(value) ? value : 0;
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

function readMailId(data: unknown): number {
  return Math.floor(numField(asRecord(data), "id", 0));
}

/** 缺省 1。写了但小于 1、或不是数字，则整次无效。 */
function readUseCount(body: Record<string, unknown>): number | null {
  if (!Object.prototype.hasOwnProperty.call(body, "count") || body.count === undefined) return 1;
  const value = body.count;
  if (typeof value !== "number" || !isFinite(value) || value < 1) return null;
  return Math.floor(value);
}
