import { GameLog } from "../core/GameLog";
import { Session } from "../core/Session";
import { NetClient } from "./NetClient";
import {
  decodeWireChapter,
  formatWireMainline,
  WIRE_CHAPTER_CMD,
  wireChapterHasIdx,
  wireChapterNote,
  WireChapterProgress,
} from "./protocol/wireChapter";
import {
  decodeWireIdle,
  decodeWireIdleClaim,
  WIRE_IDLE_CLAIM_CMD,
  WIRE_IDLE_CMD,
  wireIdleClaimNote,
  wireIdleHasTime,
  wireIdleNote,
  WireIdleClaim,
  WireIdleSnapshot,
} from "./protocol/wireIdle";
import {
  decodeWireRole,
  WIRE_ROLE_CMD,
  wireProfileHasBar,
  wireProfileNote,
  WireRoleProfile,
} from "./protocol/wireProfile";
import {
  applyWireBagGain,
  decodeWireBagGain,
  decodeWireBagList,
  WIRE_BAG_CMD,
  WIRE_BAG_GAIN_CMD,
  wireBagGainNote,
  wireBagNote,
  WireBagGain,
  WireBagItem,
} from "./protocol/wireBag";
import {
  decodeWireMailList,
  WIRE_MAIL_CMD,
  wireMailNote,
  WireMailEntry,
} from "./protocol/wireMail";
import {
  decodeWireHeroList,
  WIRE_HERO_CMD,
  WIRE_HERO_PAGE_CAP,
  wireHeroNote,
  WireHeroEntry,
  WireHeroList,
} from "./protocol/wireHero";
import {
  decodeWireActivity,
  WIRE_ACTIVITY_CMD,
  wireActivityNote,
  WireActivityRow,
  WireActivitySnapshot,
} from "./protocol/wireActivity";
import {
  decodeWireAchievement,
  WIRE_ACHIEVEMENT_CMD,
  wireAchievementNote,
  WireAchievementSnapshot,
} from "./protocol/wireAchievement";
import {
  decodeWirePvp,
  WIRE_PVP_CMD,
  wirePvpNote,
  WirePvpOpponent,
  WirePvpSnapshot,
} from "./protocol/wirePvp";
import {
  applyWireSevenDayUpdate,
  decodeWireSevenDay,
  decodeWireSevenDayUpdate,
  WIRE_SEVEN_CMD,
  WIRE_SEVEN_PUSH_CMD,
  wireSevenNote,
  WireSevenDayRow,
  WireSevenDaySnapshot,
} from "./protocol/wireSevenDay";
import {
  decodeWireGoal7,
  WIRE_GOAL7_CMD,
  WIRE_GOAL7_PUSH_CMD,
  wireGoalNote,
  WireGoal7Snapshot,
  WireGoal7Task,
} from "./protocol/wireGoal7";
import {
  decodeWireWish,
  WIRE_WISH_CMD,
  wireWishNote,
  WireWishMark,
  WireWishPool,
  WireWishSlot,
  WireWishSnapshot,
} from "./protocol/wireWish";
import {
  decodeWireSummon,
  WIRE_SUMMON_CMD,
  wireSummonNote,
  WireSummonMark,
  WireSummonSnapshot,
} from "./protocol/wireSummon";
import {
  decodeWireProphet,
  WIRE_PROPHET_CMD,
  wireProphetNote,
  WireProphetLucky,
  WireProphetMark,
  WireProphetSnapshot,
} from "./protocol/wireProphet";
import {
  decodeWireJewel,
  WIRE_JEWEL_CMD,
  wireJewelNote,
  WireJewelHero,
  WireJewelMark,
  WireJewelPiece,
  WireJewelSnapshot,
} from "./protocol/wireJewel";
import { wireBody } from "./protocol/wireLogin";

/**
 * ?transport=ws 登录进主城后，这条 NetClient 要活过 Boot 切场景。
 * 心跳 1004 继续发。
 * 连上就听 wire.2001、wire.5001、wire.5002、wire.3007、wire.3004、wire.3005、wire.15000、wire.4001、wire.17000、wire.12010、wire.18001、wire.22000、wire.22002、wire.21010、wire.21013、wire.27001、wire.4004、wire.13044 和 wire.4101。
 * 登录成功后先发空的 c2s 2001（日志里的拉角色资料）。pullRoleProfile 紧接着发空的 c2s 5001。
 * Boot 不改，随后仍是空的 c2s 3007，再发空的 c2s 3004。pullIdle 在 3004 之后再发空的 c2s 15000，然后 c2s 4001 page=1，再发空的 c2s 17000，再发空的 c2s 12010，再发空的 c2s 18001，再发空的 c2s 22000，再发空的 c2s 21010，再发空的 c2s 27001，再发空的 c2s 4004，再发空的 c2s 13044，再发空的 c2s 4101。
 * 相对顺序是 2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101。不等 s2c 2001，也不夹那一长串别的号。
 * 不发 5010，也不发 5004–5009、5011–5013。不发邮件领取、已读、删除。不发英雄升级，不发 20001。不点金。不发 12020，不领奖。不发 18002、18003、18005、18007、18008。不发 22001。22002 只收。不发 21011、21012。21013 只收。不发 27002、27003、27004。不发 4201。不发 4002、4005。不做 58001、58007。4004 不是 4001。不发 13041、13042、13043。13044 不是 4004。不发 4102、4103、4104、4105、4106、4107。不做 9001。4101 不是 4001，也不是 13044。
 * s2c 2001 按 Role.proto：字段 9 角色名、字段 6 等级、字段 2 金币、字段 1 宝石（顶栏钻石）。
 * s2c 3007 按 Battle.proto：字段 2 now_idx、字段 3 max_idx。缺的 idx 不写成 0。
 * 不写 Session.stageId，主城按钮用 mainlineLabel()。
 * 至少有一个 idx 时点按钮打开只读代码页；两个都没有仍 Toast。
 * 不打开 Mock 关卡页，不发 3002 / 3010。
 * s2c 3004 按 Battle.proto：字段 1 reward_time、字段 2 max_reward_time。缺的不写成 0。
 * 不写 Session.gold。挂机页用 rewardTime / maxRewardTime。没有这两项时主城挂机只 Toast。
 * s2c 3005 只改 reward_time。没有奖励清单，不改金币和钻石。
 * s2c 5001 按 GResBackPackList 替换本地背包。空包体是已同步的空背包。
 * 从未收到 5001 时主城背包只 Toast，不打开 Mock 背包页。
 * s2c 5002 在已经有列表之后合并：num > 0 加上，num = 0 删掉该格。type 只记日志，不弹窗。
 * 背包、5002、5010、50000 都不写顶栏。钱包只认 s2c 2001 的金币和宝石。
 * s2c 15000 替换本地邮件列表。空包体是已同步的空邮箱。
 * 从未收到 15000 时主城邮件只 Toast，不打开 Mock 邮件页。
 * 字段 3、字段 4 只记日志，不当成已读或未读。不领取，不删除，不写顶栏。
 * s2c 4001 在 send_status=1（或翻页停下）后替换本地英雄名册。字段 3 长度为 0 是已同步的空名册。空体不是。
 * send_status=0 时接着发下一页，未收齐前不替换名册。
 * 从未收到 4001 时主城英雄只 Toast，不打开 Mock 英雄页。
 * 不升级，不写顶栏。类型对不上 CHeroType 就写类型号。
 * s2c 17000 替换本地点金记录。空包体、以及 list 为 0 条，都是已同步的空表。
 * 按 GResBuyGoldLog 写 status、time 和 idx / num。time 不推开服天。
 * 从未收到 17000 时主城「点金」只 Toast。不从七日登录进入，也不打开 Mock 七日登录。
 * 不点金，不写顶栏。占位 login7.* 仍是 2201–2203。
 * s2c 12010 替换本地成就记录。空包体和 task 为 0 条都是空成就表。
 * 按 PSTaskData 写 idx / process / state。同步可能在服上补成就。不领奖，不改 state。
 * 从未收到 12010 时主城「成就记录」只 Toast，不回落 Mock。
 * s2c 18001 替换本地竞技场。空包体、以及 list 为 0 条，都是已同步的空对手表。
 * 按 GResPvpData 写 free_count、score、season_end_time、like_rids、season_count、season_reward。
 * 对手名字用 PSRankPlayerData.name。score 不写金币。对手空时服可能补名单。
 * 从未收到 18001 时玩法「竞技场」只 Toast，不打开 Mock 竞技场。不挑战，不扣次。
 * s2c 22000 替换本地七日登录。空包体、以及 list 为 0 条，都是已同步的空表。
 * 按 GResSevenDayLoginData 写 end_time、cur_day。行上写 PSSevenLoginStatus 的 idx、status。
 * status 0 是未领，1 是已领。空领奖表仍带 cur_day / end_time，逐日 status=0，不是未同步。
 * 22000 无写库，无自动领奖。不发 22001，不写金币。
 * s2c 22002 只在已经有 22000 时改 cur_day。单独先到不算同步。不是 c2s。
 * 从未收到 22000 时「七日登录」只 Toast，不打开 Mock 七日登录。占位 login7.* 仍是 2201–2203。
 * s2c 21010 替换本地七日目标。空包体、以及 task 为 0 条，都是已同步的空表。
 * 按 GResSevenDayTargetList 写 curr_day、seven_day_value、reward_box_idx。行上写 PSTaskData 的 idx、process、state。
 * state 0 是未领，1 是已领。空表外层仍带 seven_day_value / curr_day，不是未同步。
 * 首次拉取可能建档并懒填计数。不发奖。不发 21011、21012，不写金币。
 * s2c 21013 只收，不改这份表，也不算同步。不是 c2s。
 * 从未收到 21010 时「七日目标」只 Toast，不打开 Mock 七日目标。不从七日登录或点金进入。占位 goal7.* 仍是 2301 / 2302。
 * s2c 27001 替换本地许愿池。空包体、以及 blessing_data 为 0 条，都是已同步的空表。
 * 按 GResBlessingPoolList 写 type、refresh_times、lucky_value、lucky_reward_id、refresh_time。格子写 position、times。item 对得上才写名字，对不上写字段号。
 * 可能懒建或跨日写库，无扣费。不刷新，不抽奖，不领幸运奖。不写金币，不写钻石。
 * 从未收到 27001 时玩法「许愿池」只 Toast，不打开 Mock 许愿池。占位 wish.* 仍是 2501 / 2502。备选 4201 不发。
 * s2c 4004 替换本地召唤次数。空包体是已同步。按 GResHeroSummonCount 写 free_time、senior_free_time。没有的数不写成 0。
 * 可能懒建 HeroSummon。无 page。不召唤，不领累积奖。不写金币，不写钻石。英雄列表仍是 4001。
 * 从未收到 4004 时底栏「召唤」和七日目标的前往只 Toast，不打开 Mock 召唤。占位 summon.pull 仍是 1501。不发 4002、4005。不做 58001、58007。
 * s2c 13044 替换本地先知召唤幸运值。空包体、以及 luckys 为 0 条，都是已同步的空表。
 * 按 GResProphetSummonInfo 写 PSProphetLucky 的 type、lucky。没有的数不写成 0。
 * 可能懒建 HeroSummon。跨日可能重置 levelResetTimes。不抽，不置换，不确认置换。不写金币，不写钻石。召唤次数仍是 4004。
 * 从未收到 13044 时主城「先知召唤」只 Toast，不打开 Mock 召唤。不发 13041、13042、13043。不做 58007、4201。
 * s2c 4101 替换本地英雄宝石。空包体、以及 jewel_list 为 0 条，都是已同步的空表。
 * 按 GResHeroJewel 写 PSHeroJewelData 的 hero_id，以及 PSJewelData 的 jewel_id、place、jewel_type。没有的数不写成 0。
 * 无写库。无 page。空体安全。不替换，不卸下，不一键穿，不一键卸，不合成。不写金币，不写钻石。英雄列表仍是 4001。
 * 从未收到 4101 时主城「英雄宝石」只 Toast，不回落 Mock。不发 4102、4103、4104、4105、4106、4107。不做 9001。
 * 缺的顶栏字段不写，那个格子保持未同步。字段 5 是奖杯，不写进金币。开服天不推。
 * 别的 s2c 仍只记 wire.<cmdId>。解不开就忽略，不抛进拆帧循环。
 */
export class WireSession {
  static net: NetClient | null = null;

  /** s2c 3007 字段 2。没出现过是 null。 */
  static nowIdx: number | null = null;
  /** s2c 3007 字段 3。0 是服上的 0。没出现过是 null。 */
  static maxIdx: number | null = null;
  /** s2c 3004 字段 1。0 是服上的 0。没出现过是 null。 */
  static rewardTime: number | null = null;
  /** s2c 3004 字段 2。0 是服上的 0。没出现过是 null。 */
  static maxRewardTime: number | null = null;
  /** 每处理一帧 s2c 3005 加一。挂机页用来认领回包。 */
  static claimSerial = 0;
  /** 最近一帧 s2c 3005 的说明。不写金币。 */
  static claimNote = "";
  /**
   * s2c 5001 的整表。null 表示这次进主城还没收到 5001。
   * 空数组是已同步的空背包，不是未同步。
   */
  static bagItems: WireBagItem[] | null = null;
  /**
   * s2c 15000 的列表。null 表示这次进主城还没收到 15000。
   * 空数组是已同步的空邮箱，不是未同步。
   */
  static mailEntries: WireMailEntry[] | null = null;
  /**
   * 收齐的 s2c 4001 名册。null 表示这次进主城还没收到完整的 4001。
   * 空数组是已同步的空名册，不是未同步。
   */
  static heroes: WireHeroEntry[] | null = null;
  /**
   * 收齐的 s2c 17000。null 表示这次进主城还没收到 17000。
   * 空表是已同步，不是未同步。
   */
  static activity: WireActivitySnapshot | null = null;
  /**
   * 收到的 s2c 12010。null 表示这次进主城还没收到 12010。
   * 空 tasks 是已同步的空成就表，不是未同步。
   */
  static achievements: WireAchievementSnapshot | null = null;
  /**
   * 收到的 s2c 18001。null 表示这次进主城还没收到 18001。
   * 空 opponents 是已同步的空对手表，不是未同步。
   */
  static pvp: WirePvpSnapshot | null = null;
  /**
   * 收到的 s2c 22000。null 表示这次进主城还没收到 22000。
   * 空 rows 是已同步的空表，不是未同步。
   */
  static sevenDay: WireSevenDaySnapshot | null = null;
  /**
   * 收到的 s2c 21010。null 表示这次进主城还没收到 21010。
   * 空 tasks 是已同步的空表，不是未同步。
   */
  static goal7: WireGoal7Snapshot | null = null;
  /**
   * 收到的 s2c 27001。null 表示这次进主城还没收到 27001。
   * 空 pools 是已同步的空表，不是未同步。
   */
  static wish: WireWishSnapshot | null = null;
  /**
   * 收到的 s2c 4004。null 表示这次进主城还没收到 4004。
   * 两个次数都没有也是已同步，不是未同步。
   */
  static summon: WireSummonSnapshot | null = null;
  /**
   * 收到的 s2c 13044。null 表示这次进主城还没收到 13044。
   * 空 luckys 是已同步的空表，不是未同步。
   */
  static prophet: WireProphetSnapshot | null = null;
  /**
   * 收到的 s2c 4101。null 表示这次进主城还没收到 4101。
   * 空 heroes 是已同步的空表，不是未同步。
   */
  static jewel: WireJewelSnapshot | null = null;

  private static watched: NetClient | null = null;
  private static offProfile: (() => void) | null = null;
  private static offChapter: (() => void) | null = null;
  private static offIdle: (() => void) | null = null;
  private static offIdleClaim: (() => void) | null = null;
  private static offBag: (() => void) | null = null;
  private static offBagGain: (() => void) | null = null;
  private static offMail: (() => void) | null = null;
  private static offHero: (() => void) | null = null;
  private static offActivity: (() => void) | null = null;
  private static offAchievement: (() => void) | null = null;
  private static offPvp: (() => void) | null = null;
  private static offSeven: (() => void) | null = null;
  private static offSevenPush: (() => void) | null = null;
  private static offGoal: (() => void) | null = null;
  private static offGoalPush: (() => void) | null = null;
  private static offWish: (() => void) | null = null;
  private static offSummon: (() => void) | null = null;
  private static offProphet: (() => void) | null = null;
  private static offJewel: (() => void) | null = null;
  private static pending: WireRoleProfile | null = null;
  private static pendingChapter: WireChapterProgress | null = null;
  private static pendingIdle: WireIdleSnapshot | null = null;
  /** null 表示登录过程里还没看到 5001。空数组是空背包。 */
  private static pendingBag: WireBagItem[] | null = null;
  /** 快照之后、进主城之前到达的 5002。新的 5001 会清掉。 */
  private static pendingGains: WireBagGain[] = [];
  /** null 表示登录过程里还没看到 15000。空数组是空邮箱。 */
  private static pendingMail: WireMailEntry[] | null = null;
  /** null 表示还没收齐一版 4001。空名册的 entries 是空数组。 */
  private static pendingHero: WireHeroList | null = null;
  /** send_status=0 时先攒页，收齐再写入 heroes。 */
  private static heroAcc: WireHeroEntry[] = [];
  private static heroGathering = false;
  private static heroExpect = 1;
  /** null 表示登录过程里还没看到 17000。空表的 rows 是空数组。 */
  private static pendingActivity: WireActivitySnapshot | null = null;
  /** null 表示登录过程里还没看到 12010。空表的 tasks 是空数组。 */
  private static pendingAchievement: WireAchievementSnapshot | null = null;
  /** null 表示登录过程里还没看到 18001。空对手表的 opponents 是空数组。 */
  private static pendingPvp: WirePvpSnapshot | null = null;
  /** null 表示登录过程里还没看到 22000。空表的 rows 是空数组。 */
  private static pendingSeven: WireSevenDaySnapshot | null = null;
  /** null 表示登录过程里还没看到 21010。空表的 tasks 是空数组。 */
  private static pendingGoal: WireGoal7Snapshot | null = null;
  /** null 表示登录过程里还没看到 27001。空表的 pools 是空数组。 */
  private static pendingWish: WireWishSnapshot | null = null;
  /** null 表示登录过程里还没看到 4004。空次数的两个字段都是 null。 */
  private static pendingSummon: WireSummonSnapshot | null = null;
  /** null 表示登录过程里还没看到 13044。空表的 luckys 是空数组。 */
  private static pendingProphet: WireProphetSnapshot | null = null;
  /** null 表示登录过程里还没看到 4101。空表的 heroes 是空数组。 */
  private static pendingJewel: WireJewelSnapshot | null = null;
  private static listeners = new Set<() => void>();

  /** 套接字一开就听。登录回包里如果已经夹着 2001、5001、3007 或 3004，先记下，等角色写入后再套上。 */
  static watch(net: NetClient): void {
    if (
      this.watched === net &&
      this.offProfile &&
      this.offChapter &&
      this.offIdle &&
      this.offIdleClaim &&
      this.offBag &&
      this.offBagGain &&
      this.offMail &&
      this.offHero &&
      this.offActivity &&
      this.offAchievement &&
      this.offPvp &&
      this.offSeven &&
      this.offSevenPush &&
      this.offGoal &&
      this.offGoalPush &&
      this.offWish &&
      this.offSummon &&
      this.offProphet &&
      this.offJewel
    ) {
      return;
    }
    this.unhook();
    this.watched = net;
    this.offProfile = net.subscribe(WIRE_ROLE_CMD, (msg) => this.onRole(msg.data));
    this.offChapter = net.subscribe(WIRE_CHAPTER_CMD, (msg) => this.onChapter(msg.data));
    this.offIdle = net.subscribe(WIRE_IDLE_CMD, (msg) => this.onIdle(msg.data));
    this.offIdleClaim = net.subscribe(WIRE_IDLE_CLAIM_CMD, (msg) => this.onIdleClaim(msg.data));
    this.offBag = net.subscribe(WIRE_BAG_CMD, (msg) => this.onBag(msg.data));
    this.offBagGain = net.subscribe(WIRE_BAG_GAIN_CMD, (msg) => this.onBagGain(msg.data));
    this.offMail = net.subscribe(WIRE_MAIL_CMD, (msg) => this.onMail(msg.data));
    this.offHero = net.subscribe(WIRE_HERO_CMD, (msg) => this.onHero(msg.data));
    this.offActivity = net.subscribe(WIRE_ACTIVITY_CMD, (msg) => this.onActivity(msg.data));
    this.offAchievement = net.subscribe(WIRE_ACHIEVEMENT_CMD, (msg) => this.onAchievement(msg.data));
    this.offPvp = net.subscribe(WIRE_PVP_CMD, (msg) => this.onPvp(msg.data));
    this.offSeven = net.subscribe(WIRE_SEVEN_CMD, (msg) => this.onSevenDay(msg.data));
    this.offSevenPush = net.subscribe(WIRE_SEVEN_PUSH_CMD, (msg) => this.onSevenDayPush(msg.data));
    this.offGoal = net.subscribe(WIRE_GOAL7_CMD, (msg) => this.onGoal7(msg.data));
    this.offGoalPush = net.subscribe(WIRE_GOAL7_PUSH_CMD, (msg) => this.onGoal7Push(msg.data));
    this.offWish = net.subscribe(WIRE_WISH_CMD, (msg) => this.onWish(msg.data));
    this.offSummon = net.subscribe(WIRE_SUMMON_CMD, (msg) => this.onSummon(msg.data));
    this.offProphet = net.subscribe(WIRE_PROPHET_CMD, (msg) => this.onProphet(msg.data));
    this.offJewel = net.subscribe(WIRE_JEWEL_CMD, (msg) => this.onJewel(msg.data));
  }

  static hold(net: NetClient): void {
    if (this.net && this.net !== net) this.net.close();
    this.net = net;
    this.watch(net);
  }

  /**
   * 这次进主城还没看到新的 s2c 3007 / 3004 / 5001 / 15000 / 4001 / 17000 / 12010 / 18001 / 22000 / 21010 / 27001 / 4004 / 13044 / 4101。丢掉上一名角色的 idx、挂机时间、背包、邮件、英雄、点金、成就、竞技场、七日登录、七日目标、许愿池、召唤次数、先知召唤幸运值和英雄宝石。
   * 登录过程中先到的包仍留在 pending，接着 flush 再写。
   */
  static prepareCity(): void {
    this.nowIdx = null;
    this.maxIdx = null;
    this.rewardTime = null;
    this.maxRewardTime = null;
    this.claimNote = "";
    this.claimSerial = 0;
    this.bagItems = null;
    this.mailEntries = null;
    this.heroes = null;
    this.activity = null;
    this.achievements = null;
    this.pvp = null;
    this.sevenDay = null;
    this.goal7 = null;
    this.wish = null;
    this.summon = null;
    this.prophet = null;
    this.jewel = null;
  }

  /** 只放下引用。调用方自己 close。 */
  static release(net: NetClient | null): void {
    if (net && this.net === net) this.net = null;
    if (net && this.watched === net) {
      this.unhook();
      this.watched = null;
      this.pending = null;
      this.pendingChapter = null;
      this.pendingIdle = null;
      this.pendingBag = null;
      this.pendingGains = [];
      this.pendingMail = null;
      this.pendingHero = null;
      this.pendingActivity = null;
      this.pendingAchievement = null;
      this.pendingPvp = null;
      this.pendingSeven = null;
      this.pendingGoal = null;
      this.pendingWish = null;
      this.pendingSummon = null;
      this.pendingProphet = null;
      this.pendingJewel = null;
      this.resetHeroGather();
      this.nowIdx = null;
      this.maxIdx = null;
      this.rewardTime = null;
      this.maxRewardTime = null;
      this.claimNote = "";
      this.claimSerial = 0;
      this.bagItems = null;
      this.mailEntries = null;
      this.heroes = null;
      this.activity = null;
      this.achievements = null;
      this.pvp = null;
      this.sevenDay = null;
      this.goal7 = null;
      this.wish = null;
      this.summon = null;
      this.prophet = null;
      this.jewel = null;
    }
  }

  static close(): void {
    const net = this.net;
    this.net = null;
    this.unhook();
    this.watched = null;
    this.pending = null;
    this.pendingChapter = null;
    this.pendingIdle = null;
    this.pendingBag = null;
    this.pendingGains = [];
    this.pendingMail = null;
    this.pendingHero = null;
    this.pendingActivity = null;
    this.pendingAchievement = null;
    this.pendingPvp = null;
    this.pendingSeven = null;
    this.pendingGoal = null;
    this.pendingWish = null;
    this.pendingSummon = null;
    this.pendingProphet = null;
    this.pendingJewel = null;
    this.resetHeroGather();
    this.nowIdx = null;
    this.maxIdx = null;
    this.rewardTime = null;
    this.maxRewardTime = null;
    this.claimNote = "";
    this.claimSerial = 0;
    this.bagItems = null;
    this.mailEntries = null;
    this.heroes = null;
    this.activity = null;
    this.achievements = null;
    this.pvp = null;
    this.sevenDay = null;
    this.goal7 = null;
    this.wish = null;
    this.summon = null;
    this.prophet = null;
    this.jewel = null;
    if (net) net.close();
  }

  /** 顶栏或主线按钮有变化时通知。MainApp 用来重画。 */
  static onSync(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** applyWireRole 之后调用。登录过程中先到的资料在这里写上。 */
  static flush(): void {
    this.commit();
    this.commitChapter();
    this.commitIdle();
    this.commitBag();
    this.commitMail();
    this.commitHero();
    this.commitActivity();
    this.commitAchievement();
    this.commitPvp();
    this.commitSevenDay();
    this.commitGoal7();
    this.commitWish();
    this.commitSummon();
    this.commitProphet();
    this.commitJewel();
  }

  /**
   * 空的 c2s 2001，紧接着空的 c2s 5001。
   * Boot 仍只调用这一处再调用 pullChapter / pullIdle，所以不改 Boot.ts。
   * 相对顺序因此是 2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101。
   * 15000、4001、17000、12010、18001、22000、21010、27001、4004、13044 和 4101 在 pullIdle 里，跟在 3004 后面。4001 带 page=1，不是空体。17000、12010、18001、22000、21010、27001、4004、13044 和 4101 是空体。
   */
  static pullRoleProfile(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ROLE_CMD);
    this.pullBackpack();
  }

  /** 空的 c2s 5001。GReqBackPackList 没有包体。 */
  static pullBackpack(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_BAG_CMD);
  }

  /** 收到过 s2c 5001（含空包体）才算同步。5002 单独到不算。 */
  static hasBag(): boolean {
    return this.bagItems !== null;
  }

  /**
   * 空的 c2s 3007。旧桥日志三例都在 c2s 2001 之后的进游戏同步里发这一帧，包体是空的。
   * 这里跟在 pullRoleProfile 后面发。pullRoleProfile 已经先发了空的 5001。
   * 不等 s2c 2001，也不发夹在中间的其它号。
   */
  static pullChapter(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_CHAPTER_CMD);
  }

  /** 主城「主线」按钮。还没有 now_idx / max_idx 时是「主线 · 未同步」。 */
  static mainlineLabel(): string {
    return formatWireMainline(this.nowIdx, this.maxIdx);
  }

  /** 主城主线入口。两个 idx 都没出现过就不打开只读页。max_idx=0 算有。 */
  static hasChapter(): boolean {
    return wireChapterHasIdx({ nowIdx: this.nowIdx, maxIdx: this.maxIdx });
  }

  /**
   * 空的 c2s 3004，紧接着空的 c2s 15000，再发 c2s 4001 page=1，然后空的 c2s 17000，再发空的 c2s 12010，再发空的 c2s 18001，再发空的 c2s 22000，再发空的 c2s 21010，再发空的 c2s 27001，再发空的 c2s 4004，再发空的 c2s 13044，再发空的 c2s 4101。
   * 跟在 pullChapter 后面发，不等 s2c 2001。
   * 3004 在空 c2s 3007 之后，包体是空的。15000、4001、17000、12010、18001、22000、21010、27001、4004、13044 和 4101 接在 3004 后，不改 Boot.ts。
   * 不发 20001，也不发 12020，也不发 18002，也不发 22001，也不发 21011、21012，也不发 27002、27003、27004，也不发 4201，也不发 4002、4005，也不发 58001、58007，也不发 13041、13042、13043，也不发 4102、4103、4104、4105、4106、4107，也不发 9001。17000 不点金。12010 不领奖。18001 不开战。22000 不领奖。21010 不发奖。27001 不刷新，不抽奖，不领幸运奖。4004 不召唤，不领累积奖。4004 不是 4001。13044 不抽，不置换，不确认置换。13044 不是 4004。4101 不替换，不卸下，不一键穿，不一键卸，不合成。4101 不是 4001，也不是 13044。
   */
  static pullIdle(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_IDLE_CMD);
    this.pullMail();
    this.pullHero();
    this.pullActivity();
    this.pullAchievement();
    this.pullPvp();
    this.pullSevenDay();
    this.pullGoal7();
    this.pullWish();
    this.pullSummon();
    this.pullProphet();
    this.pullJewel();
  }

  /** 空的 c2s 15000。没有包体。不发领取和删除。 */
  static pullMail(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_MAIL_CMD);
  }

  /** 收到过 s2c 15000（含空包体）才算同步。解不开的包不算。 */
  static hasMail(): boolean {
    return this.mailEntries !== null;
  }

  /**
   * c2s 4001，GReqHeroList.page。缺省和小于 1 都按 1 发，不发空体。
   * page=1 会丢掉还没收齐的翻页。不发升级。
   */
  static pullHero(page = 1): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    const safe = page >= 1 && Number.isFinite(page) ? Math.floor(page) : 1;
    if (safe === 1) this.resetHeroGather();
    net.send(WIRE_HERO_CMD, { page: safe });
  }

  /** 收齐过 s2c 4001（含空名册）才算同步。空体和解不开的包不算。 */
  static hasHero(): boolean {
    return this.heroes !== null;
  }

  /** 空的 c2s 17000。没有包体。不点金。 */
  static pullActivity(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ACTIVITY_CMD);
  }

  /** 收到过 s2c 17000（含空包体）才算同步。解不开的包不算。 */
  static hasActivity(): boolean {
    return this.activity !== null;
  }

  /** 空的 c2s 12010。没有包体。不领奖。服端可能因此补成就。 */
  static pullAchievement(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ACHIEVEMENT_CMD);
  }

  /** 收到过 s2c 12010（含空包体、含空 task）才算同步。解不开的包不算。 */
  static hasAchievement(): boolean {
    return this.achievements !== null;
  }

  /** 空的 c2s 18001。GReqPvpData 没有包体。不开战，不刷新，不买票，不点赞。 */
  static pullPvp(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_PVP_CMD);
  }

  /** 收到过 s2c 18001（含空包体、含空对手表）才算同步。解不开的包不算。 */
  static hasPvp(): boolean {
    return this.pvp !== null;
  }

  /** 空的 c2s 22000。GReqSevenDayLoginData 没有包体。不领奖。 */
  static pullSevenDay(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_SEVEN_CMD);
  }

  /** 收到过 s2c 22000（含空包体、含空表）才算同步。解不开的包不算。22002 单独到不算。 */
  static hasSevenDay(): boolean {
    return this.sevenDay !== null;
  }

  /** 空的 c2s 21010。GReqSevenDayTargetList 没有包体。不发奖。可能建档并懒填计数。 */
  static pullGoal7(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_GOAL7_CMD);
  }

  /** 收到过 s2c 21010（含空包体、含空表）才算同步。解不开的包不算。21013 单独到不算。 */
  static hasGoal7(): boolean {
    return this.goal7 !== null;
  }

  /** 空的 c2s 27001。没有包体。不刷新，不抽奖，不领幸运奖。可能懒建或跨日写库，无扣费。 */
  static pullWish(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_WISH_CMD);
  }

  /** 收到过 s2c 27001（含空包体、含空表）才算同步。解不开的包不算。 */
  static hasWish(): boolean {
    return this.wish !== null;
  }

  /** 空的 c2s 4004。没有包体，也没有 page。不召唤，不领累积奖。可能懒建 HeroSummon。 */
  static pullSummon(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_SUMMON_CMD);
  }

  /** 收到过 s2c 4004（含空包体）才算同步。解不开的包不算。 */
  static hasSummon(): boolean {
    return this.summon !== null;
  }

  /** 空的 c2s 13044。GReqProphetSummonInfo 没有包体。不抽，不置换，不确认置换。可能懒建 HeroSummon。跨日可能重置 levelResetTimes。 */
  static pullProphet(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_PROPHET_CMD);
  }

  /** 收到过 s2c 13044（含空包体、含空表）才算同步。解不开的包不算。 */
  static hasProphet(): boolean {
    return this.prophet !== null;
  }

  /** 空的 c2s 4101。GReqHeroJewel 没有包体，也没有 page。不替换，不卸下，不合成。无写库。 */
  static pullJewel(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_JEWEL_CMD);
  }

  /** 收到过 s2c 4101（含空包体、含空表）才算同步。解不开的包不算。 */
  static hasJewel(): boolean {
    return this.jewel !== null;
  }

  /** 空的 c2s 3005。没连上时返回 false，调用方 Toast。 */
  static claimIdle(): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    net.send(WIRE_IDLE_CLAIM_CMD);
    return true;
  }

  /** 主城挂机入口。两个时间都没出现过就是还没同步。 */
  static hasIdle(): boolean {
    return wireIdleHasTime({ rewardTime: this.rewardTime, maxRewardTime: this.maxRewardTime });
  }

  private static onRole(data: unknown): void {
    let profile: WireRoleProfile | null = null;
    try {
      profile = decodeWireRole(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 2001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!profile) {
      GameLog.shared.info("Wire", "s2c 2001 解不开，顶栏不改");
      return;
    }
    if (!wireProfileHasBar(profile)) {
      GameLog.shared.info("Wire", "s2c 2001 没有可写入顶栏的字段，顶栏不改");
      return;
    }
    this.remember(profile);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 2001 先记下：" + wireProfileNote(this.pending || profile));
      return;
    }
    this.commit();
  }

  private static onChapter(data: unknown): void {
    let progress: WireChapterProgress | null = null;
    try {
      progress = decodeWireChapter(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3007 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!progress) {
      GameLog.shared.info("Wire", "s2c 3007 解不开，主线不改");
      return;
    }
    if (!wireChapterHasIdx(progress)) {
      GameLog.shared.info("Wire", "s2c 3007 没有 now_idx/max_idx，主线不改");
      return;
    }
    this.rememberChapter(progress);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 3007 先记下：" + wireChapterNote(this.pendingChapter || progress));
      return;
    }
    this.commitChapter();
  }

  private static onIdle(data: unknown): void {
    let snapshot: WireIdleSnapshot | null = null;
    try {
      snapshot = decodeWireIdle(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3004 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snapshot) {
      GameLog.shared.info("Wire", "s2c 3004 解不开，挂机不改");
      return;
    }
    if (!wireIdleHasTime(snapshot)) {
      GameLog.shared.info("Wire", "s2c 3004 没有 reward_time/max_reward_time，挂机不改");
      return;
    }
    this.rememberIdle(snapshot);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 3004 先记下：" + wireIdleNote(this.pendingIdle || snapshot));
      return;
    }
    this.commitIdle();
  }

  private static onIdleClaim(data: unknown): void {
    let claim: WireIdleClaim | null = null;
    try {
      claim = decodeWireIdleClaim(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3005 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      this.finishClaim("s2c 3005 解不开，金币不改");
      return;
    }
    if (!claim) {
      GameLog.shared.info("Wire", "s2c 3005 解不开，金币不改");
      this.finishClaim("s2c 3005 解不开，金币不改");
      return;
    }
    if (claim.rewardTime === null) {
      GameLog.shared.info("Wire", "s2c 3005 没有 reward_time，金币不改");
      this.finishClaim("s2c 3005 没有 reward_time，金币不改");
      return;
    }
    const inCity = Session.source === "wire" && !!Session.role;
    if (this.pendingIdle) {
      this.pendingIdle = {
        rewardTime: claim.rewardTime,
        maxRewardTime: this.pendingIdle.maxRewardTime,
      };
    } else if (!inCity) {
      this.pendingIdle = { rewardTime: claim.rewardTime, maxRewardTime: null };
    }
    if (inCity) this.rewardTime = claim.rewardTime;
    const note = "s2c 3005 " + wireIdleClaimNote(claim);
    GameLog.shared.info("Wire", note);
    this.finishClaim(note);
  }

  private static onBag(data: unknown): void {
    let list: { items: WireBagItem[] } | null = null;
    try {
      list = decodeWireBagList(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 5001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!list) {
      GameLog.shared.info("Wire", "s2c 5001 解不开，背包不改");
      return;
    }
    this.pendingBag = list.items.map(copyBagItem);
    this.pendingGains = [];
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 5001 先记下：" + wireBagNote(list.items));
      return;
    }
    this.commitBag();
  }

  private static onBagGain(data: unknown): void {
    let gain: WireBagGain | null = null;
    try {
      gain = decodeWireBagGain(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 5002 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!gain) {
      GameLog.shared.info("Wire", "s2c 5002 解不开，背包不改，顶栏不改");
      return;
    }
    GameLog.shared.info("Wire", "s2c 5002 " + wireBagGainNote(gain));
    if (gain.items.length === 0) return;
    const inCity = Session.source === "wire" && !!Session.role;
    if (!inCity) {
      if (this.pendingBag === null) {
        GameLog.shared.info("Wire", "s2c 5002 在背包列表之前，不合并");
        return;
      }
      this.pendingGains.push(gain);
      return;
    }
    if (this.bagItems === null) {
      GameLog.shared.info("Wire", "s2c 5002 在背包列表之前，不合并");
      return;
    }
    this.bagItems = applyWireBagGain(this.bagItems, gain);
    this.emit();
  }

  private static onMail(data: unknown): void {
    let list: { entries: WireMailEntry[] } | null = null;
    try {
      list = decodeWireMailList(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 15000 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!list) {
      GameLog.shared.info("Wire", "s2c 15000 解不开，邮件不改");
      return;
    }
    this.pendingMail = list.entries.map(copyMail);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 15000 先记下：" + wireMailNote(list.entries));
      return;
    }
    this.commitMail();
  }

  private static onHero(data: unknown): void {
    let list: WireHeroList | null = null;
    try {
      list = decodeWireHeroList(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!list) {
      GameLog.shared.info("Wire", "s2c 4001 解不开，英雄不改");
      return;
    }
    const done = this.takeHeroPage(list);
    if (!done) return;
    this.pendingHero = done;
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4001 先记下：" + wireHeroNote(done));
      return;
    }
    this.commitHero();
  }

  private static onActivity(data: unknown): void {
    let snap: WireActivitySnapshot | null = null;
    try {
      snap = decodeWireActivity(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 17000 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 17000 解不开，点金不改");
      return;
    }
    this.pendingActivity = copyActivity(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 17000 先记下：" + wireActivityNote(snap));
      return;
    }
    this.commitActivity();
  }

  private static onAchievement(data: unknown): void {
    let snap: WireAchievementSnapshot | null = null;
    try {
      snap = decodeWireAchievement(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 12010 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 12010 解不开，成就不改");
      return;
    }
    this.pendingAchievement = copyAchievement(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 12010 先记下：" + wireAchievementNote(snap));
      return;
    }
    this.commitAchievement();
  }

  private static onPvp(data: unknown): void {
    let snap: WirePvpSnapshot | null = null;
    try {
      snap = decodeWirePvp(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 18001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 18001 解不开，竞技场不改");
      return;
    }
    this.pendingPvp = copyPvp(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 18001 先记下：" + wirePvpNote(snap));
      return;
    }
    this.commitPvp();
  }

  private static onSevenDay(data: unknown): void {
    let snap: WireSevenDaySnapshot | null = null;
    try {
      snap = decodeWireSevenDay(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 22000 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 22000 解不开，七日登录不改");
      return;
    }
    this.pendingSeven = copySevenDay(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 22000 先记下：" + wireSevenNote(snap));
      return;
    }
    this.commitSevenDay();
  }

  /** 隔天推送。只改已经有的 cur_day。没有 22000 时不建表，也不算同步。 */
  private static onSevenDayPush(data: unknown): void {
    let curDay: number | null = null;
    try {
      curDay = decodeWireSevenDayUpdate(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 22002 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (curDay === null) {
      GameLog.shared.info("Wire", "s2c 22002 解不开，七日登录不改");
      return;
    }
    if (this.pendingSeven) this.pendingSeven = applyWireSevenDayUpdate(this.pendingSeven, curDay);
    if (Session.source === "wire" && Session.role && this.sevenDay) {
      this.sevenDay = applyWireSevenDayUpdate(this.sevenDay, curDay);
      GameLog.shared.info("Wire", "s2c 22002 cur_day=" + curDay + "。不领奖，不写金币");
      this.emit();
      return;
    }
    if (this.pendingSeven) {
      GameLog.shared.info("Wire", "s2c 22002 先记下 cur_day=" + curDay);
      return;
    }
    GameLog.shared.info("Wire", "s2c 22002 还没有 22000，七日登录不改");
  }

  private static onGoal7(data: unknown): void {
    let snap: WireGoal7Snapshot | null = null;
    try {
      snap = decodeWireGoal7(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 21010 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 21010 解不开，七日目标不改");
      return;
    }
    this.pendingGoal = copyGoal7(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 21010 先记下：" + wireGoalNote(snap));
      return;
    }
    this.commitGoal7();
  }

  private static onWish(data: unknown): void {
    let snap: WireWishSnapshot | null = null;
    try {
      snap = decodeWireWish(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 27001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 27001 解不开，许愿池不改");
      return;
    }
    this.pendingWish = copyWish(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 27001 先记下：" + wireWishNote(snap));
      return;
    }
    this.commitWish();
  }

  private static onSummon(data: unknown): void {
    let snap: WireSummonSnapshot | null = null;
    try {
      snap = decodeWireSummon(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4004 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4004 解不开，召唤次数不改");
      return;
    }
    this.pendingSummon = copySummon(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4004 先记下：" + wireSummonNote(snap));
      return;
    }
    this.commitSummon();
  }

  private static onProphet(data: unknown): void {
    let snap: WireProphetSnapshot | null = null;
    try {
      snap = decodeWireProphet(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 13044 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 13044 解不开，先知召唤不改");
      return;
    }
    this.pendingProphet = copyProphet(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 13044 先记下：" + wireProphetNote(snap));
      return;
    }
    this.commitProphet();
  }

  private static onJewel(data: unknown): void {
    let snap: WireJewelSnapshot | null = null;
    try {
      snap = decodeWireJewel(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4101 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4101 解不开，英雄宝石不改");
      return;
    }
    this.pendingJewel = copyJewel(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4101 先记下：" + wireJewelNote(snap));
      return;
    }
    this.commitJewel();
  }

  /** 只收。不建表，不改已经有的七日目标，也不发奖。 */
  private static onGoal7Push(_data: unknown): void {
    GameLog.shared.info("Wire", "s2c 21013 只收，七日目标不改，不发奖");
  }

  /**
   * 按页攒名册。send_status=0 时发出下一页并返回 null，先不替换。
   * 页码对不上也返回 null，保持上一次。
   */
  private static takeHeroPage(list: WireHeroList): WireHeroList | null {
    const page = list.page !== null ? list.page : this.heroGathering ? this.heroExpect : 1;
    if (!this.heroGathering) {
      if (page !== 1) {
        GameLog.shared.info("Wire", "s2c 4001 页 " + page + " 不是 1，名册不改");
        return null;
      }
      this.heroAcc = list.entries.map(copyHero);
      this.heroGathering = true;
      this.heroExpect = 1;
    } else if (page !== this.heroExpect) {
      GameLog.shared.info("Wire", "s2c 4001 页 " + page + " 不是 " + this.heroExpect + "，名册不改");
      return null;
    } else {
      for (let i = 0; i < list.entries.length; i++) this.heroAcc.push(copyHero(list.entries[i]));
    }
    if (list.sendStatus === 0 && page < WIRE_HERO_PAGE_CAP) {
      const next = page + 1;
      this.heroExpect = next;
      GameLog.shared.info("Wire", "s2c 4001 send_status=0，继续 page=" + next);
      this.pullHero(next);
      return null;
    }
    if (list.sendStatus === 0) {
      GameLog.shared.info("Wire", "s2c 4001 翻页停止 page=" + page);
    }
    const done: WireHeroList = {
      entries: this.heroAcc.map(copyHero),
      heroCapacity: list.heroCapacity,
      buySpaceTimes: list.buySpaceTimes,
      sendStatus: list.sendStatus,
      page: list.page,
    };
    this.resetHeroGather();
    return done;
  }

  private static resetHeroGather(): void {
    this.heroAcc = [];
    this.heroGathering = false;
    this.heroExpect = 1;
  }

  /** 后到的包只补上自己有的字段，不把先记下、这一包没有的格子清掉。 */
  private static remember(profile: WireRoleProfile): void {
    const prev = this.pending;
    this.pending = {
      name: profile.name !== null ? profile.name : prev ? prev.name : null,
      level: profile.level !== null ? profile.level : prev ? prev.level : null,
      gold: profile.gold !== null ? profile.gold : prev ? prev.gold : null,
      diamond: profile.diamond !== null ? profile.diamond : prev ? prev.diamond : null,
    };
  }

  private static rememberChapter(progress: WireChapterProgress): void {
    const prev = this.pendingChapter;
    this.pendingChapter = {
      nowIdx: progress.nowIdx !== null ? progress.nowIdx : prev ? prev.nowIdx : null,
      maxIdx: progress.maxIdx !== null ? progress.maxIdx : prev ? prev.maxIdx : null,
    };
  }

  private static rememberIdle(snapshot: WireIdleSnapshot): void {
    const prev = this.pendingIdle;
    this.pendingIdle = {
      rewardTime: snapshot.rewardTime !== null ? snapshot.rewardTime : prev ? prev.rewardTime : null,
      maxRewardTime: snapshot.maxRewardTime !== null ? snapshot.maxRewardTime : prev ? prev.maxRewardTime : null,
    };
  }

  private static commit(): void {
    const profile = this.pending;
    if (!profile || !wireProfileHasBar(profile)) return;
    if (
      !Session.applyWireSync({
        name: profile.name,
        level: profile.level,
        gold: profile.gold,
        diamond: profile.diamond,
      })
    ) {
      return;
    }
    this.pending = null;
    GameLog.shared.info("Wire", wireProfileNote(profile));
    this.emit();
  }

  private static commitChapter(): void {
    const progress = this.pendingChapter;
    if (!progress || !wireChapterHasIdx(progress)) return;
    if (Session.source !== "wire" || !Session.role) return;
    if (progress.nowIdx !== null) this.nowIdx = progress.nowIdx;
    if (progress.maxIdx !== null) this.maxIdx = progress.maxIdx;
    this.pendingChapter = null;
    GameLog.shared.info("Wire", wireChapterNote(progress));
    this.emit();
  }

  private static commitBag(): void {
    if (this.pendingBag === null) return;
    if (Session.source !== "wire" || !Session.role) return;
    let items = this.pendingBag.map(copyBagItem);
    for (let i = 0; i < this.pendingGains.length; i++) {
      items = applyWireBagGain(items, this.pendingGains[i]);
    }
    this.pendingBag = null;
    this.pendingGains = [];
    this.bagItems = items;
    GameLog.shared.info("Wire", "s2c 5001 " + wireBagNote(items));
    this.emit();
  }

  private static commitMail(): void {
    if (this.pendingMail === null) return;
    if (Session.source !== "wire" || !Session.role) return;
    const entries = this.pendingMail.map(copyMail);
    this.pendingMail = null;
    this.mailEntries = entries;
    GameLog.shared.info("Wire", "s2c 15000 " + wireMailNote(entries));
    this.emit();
  }

  private static commitHero(): void {
    const list = this.pendingHero;
    if (!list) return;
    if (Session.source !== "wire" || !Session.role) return;
    const entries = list.entries.map(copyHero);
    this.pendingHero = null;
    this.heroes = entries;
    GameLog.shared.info("Wire", "s2c 4001 " + wireHeroNote({ ...list, entries }));
    this.emit();
  }

  private static commitActivity(): void {
    const snap = this.pendingActivity;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyActivity(snap);
    this.pendingActivity = null;
    this.activity = next;
    GameLog.shared.info("Wire", "s2c 17000 " + wireActivityNote(next));
    this.emit();
  }

  private static commitAchievement(): void {
    const snap = this.pendingAchievement;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyAchievement(snap);
    this.pendingAchievement = null;
    this.achievements = next;
    GameLog.shared.info("Wire", "s2c 12010 " + wireAchievementNote(next));
    this.emit();
  }

  private static commitPvp(): void {
    const snap = this.pendingPvp;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyPvp(snap);
    this.pendingPvp = null;
    this.pvp = next;
    GameLog.shared.info("Wire", "s2c 18001 " + wirePvpNote(next));
    this.emit();
  }

  private static commitSevenDay(): void {
    const snap = this.pendingSeven;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copySevenDay(snap);
    this.pendingSeven = null;
    this.sevenDay = next;
    GameLog.shared.info("Wire", "s2c 22000 " + wireSevenNote(next));
    this.emit();
  }

  private static commitGoal7(): void {
    const snap = this.pendingGoal;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyGoal7(snap);
    this.pendingGoal = null;
    this.goal7 = next;
    GameLog.shared.info("Wire", "s2c 21010 " + wireGoalNote(next));
    this.emit();
  }

  private static commitWish(): void {
    const snap = this.pendingWish;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyWish(snap);
    this.pendingWish = null;
    this.wish = next;
    GameLog.shared.info("Wire", "s2c 27001 " + wireWishNote(next));
    this.emit();
  }

  private static commitSummon(): void {
    const snap = this.pendingSummon;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copySummon(snap);
    this.pendingSummon = null;
    this.summon = next;
    GameLog.shared.info("Wire", "s2c 4004 " + wireSummonNote(next));
    this.emit();
  }

  private static commitProphet(): void {
    const snap = this.pendingProphet;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyProphet(snap);
    this.pendingProphet = null;
    this.prophet = next;
    GameLog.shared.info("Wire", "s2c 13044 " + wireProphetNote(next));
    this.emit();
  }

  private static commitJewel(): void {
    const snap = this.pendingJewel;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyJewel(snap);
    this.pendingJewel = null;
    this.jewel = next;
    GameLog.shared.info("Wire", "s2c 4101 " + wireJewelNote(next));
    this.emit();
  }

  private static commitIdle(): void {
    const snapshot = this.pendingIdle;
    if (!snapshot || !wireIdleHasTime(snapshot)) return;
    if (Session.source !== "wire" || !Session.role) return;
    if (snapshot.rewardTime !== null) this.rewardTime = snapshot.rewardTime;
    if (snapshot.maxRewardTime !== null) this.maxRewardTime = snapshot.maxRewardTime;
    this.pendingIdle = null;
    GameLog.shared.info("Wire", wireIdleNote(snapshot));
    this.emit();
  }

  private static finishClaim(note: string): void {
    this.claimNote = note;
    this.claimSerial += 1;
    this.emit();
  }

  private static emit(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener();
      } catch (err) {
        GameLog.shared.error("Wire", "刷新顶栏失败 " + (err instanceof Error ? err.message : "未知错误"));
      }
    }
  }

  private static unhook(): void {
    if (this.offProfile) {
      this.offProfile();
      this.offProfile = null;
    }
    if (this.offChapter) {
      this.offChapter();
      this.offChapter = null;
    }
    if (this.offIdle) {
      this.offIdle();
      this.offIdle = null;
    }
    if (this.offIdleClaim) {
      this.offIdleClaim();
      this.offIdleClaim = null;
    }
    if (this.offBag) {
      this.offBag();
      this.offBag = null;
    }
    if (this.offBagGain) {
      this.offBagGain();
      this.offBagGain = null;
    }
    if (this.offMail) {
      this.offMail();
      this.offMail = null;
    }
    if (this.offHero) {
      this.offHero();
      this.offHero = null;
    }
    if (this.offActivity) {
      this.offActivity();
      this.offActivity = null;
    }
    if (this.offAchievement) {
      this.offAchievement();
      this.offAchievement = null;
    }
    if (this.offPvp) {
      this.offPvp();
      this.offPvp = null;
    }
    if (this.offSeven) {
      this.offSeven();
      this.offSeven = null;
    }
    if (this.offSevenPush) {
      this.offSevenPush();
      this.offSevenPush = null;
    }
    if (this.offGoal) {
      this.offGoal();
      this.offGoal = null;
    }
    if (this.offGoalPush) {
      this.offGoalPush();
      this.offGoalPush = null;
    }
    if (this.offWish) {
      this.offWish();
      this.offWish = null;
    }
    if (this.offSummon) {
      this.offSummon();
      this.offSummon = null;
    }
    if (this.offProphet) {
      this.offProphet();
      this.offProphet = null;
    }
    if (this.offJewel) {
      this.offJewel();
      this.offJewel = null;
    }
  }
}

function copyBagItem(item: WireBagItem): WireBagItem {
  return { itemId: item.itemId, itemType: item.itemType, num: item.num };
}

function copyMail(entry: WireMailEntry): WireMailEntry {
  return {
    id: entry.id,
    time: entry.time,
    mark3: entry.mark3,
    mark4: entry.mark4,
    title: entry.title,
    body: entry.body,
    attachment: entry.attachment,
    attachments: entry.attachments.map((row) => ({ itemId: row.itemId, count: row.count })),
  };
}

function copyActivity(snap: WireActivitySnapshot): WireActivitySnapshot {
  return {
    status: snap.status,
    time: snap.time,
    rows: snap.rows.map(copyActivityRow),
  };
}

function copyActivityRow(row: WireActivityRow): WireActivityRow {
  return { idx: row.idx, num: row.num };
}

function copyAchievement(snap: WireAchievementSnapshot): WireAchievementSnapshot {
  return {
    tasks: snap.tasks.map((task) => ({ idx: task.idx, process: task.process, state: task.state })),
  };
}

function copyPvp(snap: WirePvpSnapshot): WirePvpSnapshot {
  return {
    freeCount: snap.freeCount,
    score: snap.score,
    opponents: snap.opponents.map(copyPvpOpponent),
    seasonEndTime: snap.seasonEndTime,
    likeRids: snap.likeRids ? snap.likeRids.slice() : null,
    likeRidsUnparsed: snap.likeRidsUnparsed,
    seasonCount: snap.seasonCount,
    seasonReward: snap.seasonReward,
    seasonRewardUnparsed: snap.seasonRewardUnparsed,
  };
}

function copySevenDay(snap: WireSevenDaySnapshot): WireSevenDaySnapshot {
  return {
    endTime: snap.endTime,
    curDay: snap.curDay,
    rows: snap.rows.map(copySevenDayRow),
  };
}

function copySevenDayRow(row: WireSevenDayRow): WireSevenDayRow {
  return { idx: row.idx, status: row.status };
}

function copyGoal7(snap: WireGoal7Snapshot): WireGoal7Snapshot {
  return {
    currDay: snap.currDay,
    sevenDayValue: snap.sevenDayValue,
    rewardBoxIdx: snap.rewardBoxIdx.slice(),
    tasks: snap.tasks.map(copyGoal7Task),
  };
}

function copyGoal7Task(task: WireGoal7Task): WireGoal7Task {
  return { idx: task.idx, process: task.process, state: task.state };
}

function copyWish(snap: WireWishSnapshot): WireWishSnapshot {
  return {
    pools: snap.pools.map(copyWishPool),
    marks: snap.marks.map(copyWishMark),
  };
}

function copyWishPool(pool: WireWishPool): WireWishPool {
  return {
    type: pool.type,
    refreshTimes: pool.refreshTimes,
    luckyValue: pool.luckyValue,
    luckyRewardId: pool.luckyRewardId,
    refreshTime: pool.refreshTime,
    slots: pool.slots.map(copyWishSlot),
    marks: pool.marks.map(copyWishMark),
  };
}

function copyWishSlot(slot: WireWishSlot): WireWishSlot {
  return {
    position: slot.position,
    times: slot.times,
    item: slot.item,
    marks: slot.marks.map(copyWishMark),
  };
}

function copyWishMark(mark: WireWishMark): WireWishMark {
  return { field: mark.field, text: mark.text };
}

function copySummon(snap: WireSummonSnapshot): WireSummonSnapshot {
  return {
    freeTime: snap.freeTime,
    seniorFreeTime: snap.seniorFreeTime,
    marks: snap.marks.map(copySummonMark),
  };
}

function copySummonMark(mark: WireSummonMark): WireSummonMark {
  return { field: mark.field, text: mark.text };
}

function copyProphet(snap: WireProphetSnapshot): WireProphetSnapshot {
  return {
    luckys: snap.luckys.map(copyProphetLucky),
    marks: snap.marks.map(copyProphetMark),
  };
}

function copyProphetLucky(row: WireProphetLucky): WireProphetLucky {
  return {
    type: row.type,
    lucky: row.lucky,
    marks: row.marks.map(copyProphetMark),
  };
}

function copyProphetMark(mark: WireProphetMark): WireProphetMark {
  return { field: mark.field, text: mark.text };
}

function copyJewel(snap: WireJewelSnapshot): WireJewelSnapshot {
  return {
    heroes: snap.heroes.map(copyJewelHero),
    marks: snap.marks.map(copyJewelMark),
  };
}

function copyJewelHero(row: WireJewelHero): WireJewelHero {
  return {
    heroId: row.heroId,
    jewels: row.jewels.map(copyJewelPiece),
    marks: row.marks.map(copyJewelMark),
  };
}

function copyJewelPiece(row: WireJewelPiece): WireJewelPiece {
  return {
    jewelId: row.jewelId,
    place: row.place,
    jewelType: row.jewelType,
    marks: row.marks.map(copyJewelMark),
  };
}

function copyJewelMark(mark: WireJewelMark): WireJewelMark {
  return { field: mark.field, text: mark.text };
}

function copyPvpOpponent(row: WirePvpOpponent): WirePvpOpponent {
  return {
    playerId: row.playerId,
    name: row.name,
    marks: row.marks.map((mark) => ({ field: mark.field, text: mark.text })),
  };
}

function copyHero(entry: WireHeroEntry): WireHeroEntry {
  return {
    heroId: entry.heroId,
    heroType: entry.heroType,
    level: entry.level,
    stage: entry.stage,
    star: entry.star,
    elem: entry.elem,
    occupation: entry.occupation,
    isLock: entry.isLock,
    fighting: entry.fighting,
  };
}
