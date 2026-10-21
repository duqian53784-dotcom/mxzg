/**
 * B3–C15、基础商店、许愿池、咖啡馆、礼包、限时活动、D2 WebSocket 与 D3 进主城壳自检（不启动 Creator）。
 * 从仓库根目录：
 * npx --yes esbuild client/tools/skeleton-check.ts --bundle --platform=node --format=cjs --tsconfig=client/tools/tsconfig.check.json --outfile=/tmp/mxzg-skeleton-check.js && node /tmp/mxzg-skeleton-check.js
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isEntryOpen, isServerGateOpen, listOpenEntries } from "../assets/scripts/config/gates";
import {
  entryAccess,
  findNavEntry,
  NavHistory,
  rootTabFor,
  tabLabel,
} from "../assets/scripts/config/nav";
import { OpenConditionRow, SystemGateRow } from "../assets/scripts/config/types";
import {
  applyBagUse,
  applyHeroExp,
  bagFailToast,
  bagRowText,
  bagUseToast,
  emptyBagToast,
  EXP_PER_LEVEL,
  EXP_POTION_GAIN,
  GOLD_BAG_GAIN,
  ITEM_EXP_POTION,
  ITEM_GOLD_BAG,
  ITEM_CAFE_BEAN,
  ITEM_WISH_TOKEN,
  CAFE_BEAN_NAME,
  STARTER_WISH_TOKEN,
  notEnoughToast,
  notUsableTip,
  STARTER_EXP_POTION,
  STARTER_GOLD_BAG,
  WISH_TOKEN_NAME,
} from "../assets/scripts/module/bag/items";
import {
  applyMailClaim,
  attachmentText,
  claimAllButtonText,
  claimButtonText,
  deletedToast,
  emptyMailToast,
  MAIL_NOTICE_ID,
  MAIL_REWARD_GOLD,
  MAIL_REWARD_GOLD_BAG,
  MAIL_REWARD_ID,
  MAIL_REWARD_STONE,
  MAIL_WELCOME_ID,
  mailClaimToast,
  mailFailToast,
  mailRowText,
  mailSummaryText,
  pickMailToast,
} from "../assets/scripts/module/mail/inbox";
import {
  applyHeroUpgrade,
  goldShortToast,
  heroRowText,
  heroStats,
  HERO_MAX_LEVEL,
  maxLevelToast,
  starterRoster,
  upgradeButtonText,
  upgradeCost,
  upgradeToast,
  WEAPON_MAX_LEVEL,
  WEAPON_NAME,
  weaponAtkBonus,
} from "../assets/scripts/module/hero/growth";
import {
  applySmithStrengthen,
  smithCostLine,
  smithFailToast,
  smithGoldShortToast,
  smithHeroLine,
  smithMaxToast,
  smithRowText,
  smithStoneShortToast,
  smithWalletLine,
  strengthenButtonText,
  strengthenGoldCost,
  strengthenToast,
  toSmithGear,
} from "../assets/scripts/module/smith/forge";
import {
  applyArenaChallenge,
  ARENA_DAILY_LIMIT,
  ARENA_LOSE_SCORE,
  ARENA_OPPONENTS,
  ARENA_START_SCORE,
  ARENA_WIN_GOLD,
  ARENA_WIN_SCORE,
  arenaDailyLine,
  arenaFailToast,
  arenaLoseToast,
  arenaMissingToast,
  arenaNoChanceToast,
  arenaReportLine,
  arenaRowText,
  arenaScoreLine,
  arenaWinToast,
  challengeButtonText,
  rankFromScore,
  rosterPower,
} from "../assets/scripts/module/arena/match";
import {
  applyTowerChallenge,
  floorGuardianName,
  floorPower,
  goldForFloor,
  TOWER_DAILY_LIMIT,
  TOWER_MAX_FLOOR,
  towerChallengeButton,
  towerClearedToast,
  towerDailyLine,
  towerFailToast,
  towerFloorLine,
  towerLoseToast,
  towerNoChanceToast,
  towerPowerLine,
  towerReportLine,
  towerWinToast,
} from "../assets/scripts/module/tower/climb";
import {
  applyDailyChallenge,
  DAILY_GOLD_LIMIT,
  DAILY_GOLD_TIERS,
  dailyAttemptsLine,
  dailyChallengeButton,
  dailyEmptyToast,
  dailyFailToast,
  dailyLoseToast,
  dailyMissingToast,
  dailyNoChanceToast,
  dailyPowerLine,
  dailyPreviewLine,
  dailyReportLine,
  dailyRowText,
  dailyWinToast,
  findDailyTier,
} from "../assets/scripts/module/daily/gold";
import {
  applyLogin7Claim,
  findLogin7Rewards,
  LOGIN7_DAYS,
  LOGIN7_TABLE,
  login7AdvanceButton,
  login7AdvanceToast,
  login7ClaimButton,
  login7ClaimedToast,
  login7ClaimToast,
  login7FailToast,
  login7HeadLine,
  login7LockedToast,
  login7MaxToast,
  login7MissingToast,
  login7OpenDayLine,
  login7RewardText,
  login7RowText,
  login7TodayClaimed,
  login7WalletLine,
} from "../assets/scripts/module/login7/rewards";
import {
  applyGoal7Claim,
  findGoal7Task,
  GOAL7_DAYS,
  GOAL7_LATE_ID,
  GOAL7_LATE_STAGE,
  GOAL7_TABLE,
  goal7BadJumpToast,
  goal7ClaimableCount,
  goal7ClaimedToast,
  goal7ClaimText,
  goal7ClaimToast,
  goal7DayHint,
  goal7DayLabel,
  goal7DetailLine,
  goal7FailToast,
  goal7GoText,
  goal7HeadLine,
  goal7IncompleteToast,
  goal7LockedToast,
  goal7MissingToast,
  goal7RewardText,
  goal7SubLine,
  goal7TasksOnDay,
  goal7TitleLine,
  goal7WalletLine,
  heroLevelsToUpgrades,
} from "../assets/scripts/module/goal7/tasks";
import {
  applyShopBuy,
  findShopOffer,
  listShopSkus,
  SHOP_BAG_LIMIT,
  SHOP_BAG_PRICE,
  SHOP_GOLD_BAG_ID,
  SHOP_OFFERS,
  SHOP_POTION_ID,
  SHOP_POTION_LIMIT,
  SHOP_POTION_PRICE,
  SHOP_STONE_COUNT,
  SHOP_STONE_ID,
  SHOP_STONE_LIMIT,
  SHOP_STONE_PRICE,
  shopBuyButton,
  shopBuyToast,
  shopDiamondShortToast,
  shopFailToast,
  shopGoldShortToast,
  shopMissingToast,
  shopRefreshLine,
  shopSkuLine,
  shopSoldOutToast,
  shopWalletLine,
} from "../assets/scripts/module/shop/catalog";
import {
  applyWishDraw,
  dropAt,
  parseWishPay,
  WISH_DAILY_LIMIT,
  WISH_DIAMOND_COST,
  WISH_DROPS,
  WISH_GOLD_COST,
  WISH_ITEM_COST,
  wishAttemptsLine,
  wishDiamondShortToast,
  wishFailToast,
  wishGoldShortToast,
  wishItemShortToast,
  wishNextLine,
  wishNoChanceToast,
  wishPayButton,
  wishPayToast,
  wishPoolLine,
  wishSuccessToast,
  wishWalletLine,
} from "../assets/scripts/module/wish/pool";
import {
  applyCafeClaim,
  CAFE_BEAN_ONE,
  CAFE_BEAN_TWO,
  CAFE_DAILY_LIMIT,
  CAFE_GOLD_ONE,
  CAFE_GOLD_TWO,
  CAFE_MAX_HEROES,
  cafeAttemptsLine,
  cafeBusyToast,
  cafeClaimButton,
  cafeClaimToast,
  cafeDuplicateToast,
  cafeEmptyToast,
  cafeFailToast,
  cafeHasDuplicate,
  cafeHeroRow,
  cafeMissingToast,
  cafeNoChanceToast,
  cafeNoHeroToast,
  cafeNothingToast,
  cafePreviewLine,
  cafeReward,
  cafeSendButton,
  cafeSendToast,
  cafeStatusLine,
  cafeTooManyToast,
  cafeWalletLine,
  readCafeHeroIds,
} from "../assets/scripts/module/cafe/serve";
import {
  applyGiftWallet,
  findGiftAcc,
  findGiftLevel,
  GIFT_ACC_TIERS,
  GIFT_DAILY_GOLD,
  GIFT_DAILY_ITEM_COUNT,
  GIFT_DAILY_ITEM_ID,
  GIFT_DAILY_PRICE,
  GIFT_FIRST_AMOUNT,
  GIFT_FIRST_DIAMOND,
  GIFT_FIRST_ITEM_COUNT,
  GIFT_FIRST_ITEM_ID,
  GIFT_LEVELS,
  GIFT_RECHARGE_DIAMOND,
  GIFT_RECHARGE_STEP,
  giftAccButton,
  giftAccCap,
  giftAccClaimToast,
  giftAccFailToast,
  giftAccHint,
  giftAccLine,
  giftAccLockedToast,
  giftAccState,
  giftDailyBoughtToast,
  giftDailyButton,
  giftDailyBuyToast,
  giftDailyFailToast,
  giftDailyLine,
  giftDailyShortToast,
  giftFirstButton,
  giftFirstDoneToast,
  giftFirstLine,
  giftFirstToast,
  giftHeadLine,
  giftLevelButton,
  giftLevelClaimedToast,
  giftLevelClaimToast,
  giftLevelFailToast,
  giftLevelLine,
  giftLevelLockedToast,
  giftLevelState,
  giftMeterLine,
  giftRechargeButton,
  giftRechargeFailToast,
  giftRechargeInvalidToast,
  giftRechargeToast,
  giftRewardText,
  giftWalletLine,
  listGiftAcc,
  listGiftLevels,
  parseGiftRecharge,
} from "../assets/scripts/module/gift/packs";
import {
  applyLimitedWallet,
  findLimitedOffer,
  findLimitedPack,
  LIMITED_BEAN_COST,
  LIMITED_BEAN_ITEM_ID,
  LIMITED_BEAN_LIMIT,
  LIMITED_EX_BEAN_ID,
  LIMITED_EX_GOLD_ID,
  LIMITED_GOLD_COST,
  LIMITED_GOLD_LIMIT,
  LIMITED_GOLD_REWARD,
  LIMITED_OFFERS,
  LIMITED_PACK_DAYS,
  LIMITED_PACK_DIAMOND_ID,
  LIMITED_PACK_GOLD,
  LIMITED_PACK_MOCK_DIAMOND,
  LIMITED_PACK_MOCK_ID,
  LIMITED_PACK_PRICE,
  LIMITED_PACK_STONE,
  LIMITED_PACKS,
  LIMITED_STONE_DIAMOND,
  LIMITED_STONE_GOLD,
  LIMITED_STONE_LIMIT,
  limitedCountdown,
  limitedDaysLeft,
  limitedExchangeFailToast,
  limitedExchangeToast,
  limitedGoldShortToast,
  limitedHeadLine,
  limitedItemShortToast,
  limitedMissingToast,
  limitedOfferButton,
  limitedOfferLine,
  limitedPackBoughtToast,
  limitedPackButton,
  limitedPackEndedToast,
  limitedPackFailToast,
  limitedPackLine,
  limitedPackMissingToast,
  limitedPackShortToast,
  limitedPackToast,
  limitedSoldOutToast,
  limitedStoneButton,
  limitedStoneFailToast,
  limitedStoneFree,
  limitedStoneLine,
  limitedStoneNoChanceToast,
  limitedStoneRateLine,
  limitedStoneShortToast,
  limitedStoneToast,
  limitedWalletLine,
  listLimitedOffers,
  listLimitedPacks,
} from "../assets/scripts/module/limited/event";
import { Goal7Task, ShopSku } from "../assets/scripts/net/protocol/types";
import {
  applySummon,
  diamondShortToast,
  shardItemId,
  SUMMON_SHARD_BASE,
  SUMMON_SHARD_GAIN,
  SUMMON_SINGLE_COST,
  SUMMON_TEN_COST,
  summonCost,
  summonResultText,
  summonToast,
} from "../assets/scripts/module/summon/pull";
import { GameLog } from "../assets/scripts/core/GameLog";
import { loadLoginPrefs, LoginPrefs, PrefStore, resolveAccount, saveLoginPrefs } from "../assets/scripts/core/LoginPrefs";
import {
  formatDiamondLine,
  formatGoldLine,
  formatHubIdentity,
  formatNameLine,
  formatSubLine,
  Session,
} from "../assets/scripts/core/Session";
import { findServer, MOCK_SERVERS } from "../assets/scripts/core/servers";
import { ErrorCode, errorText, failureCode, GameError, messageOf } from "../assets/scripts/core/errors";
import { parseMockFixture } from "../assets/scripts/net/MockFixture";
import { MOCK_STARTER_DIAMOND, MOCK_STARTER_GOLD, MockGameSession } from "../assets/scripts/net/MockGameSession";
import {
  applyIdleClaim,
  buildIdleView,
  capPreviewLine,
  claimToast,
  formatDuration,
  formatItemEvery,
  IDLE_CAP_MS,
  IDLE_ITEM_ID,
  quickBatchToast,
  quickStageIds,
  quickToast,
} from "../assets/scripts/module/idle/rewards";
import {
  applyStageProgress,
  challengeBlock,
  listStages,
  loseToast,
  MAINLINE_PUSH_MAX,
  MAINLINE_PUSH_STAGE,
  planBattle,
  pushAlreadyToast,
  pushButtonText,
  pushToast,
  rewardLines,
  STAGE_WIN_GOLD,
  winToast,
} from "../assets/scripts/module/mainline/battle";
import { MockTransport } from "../assets/scripts/net/MockTransport";
import { NetClient } from "../assets/scripts/net/NetClient";
import { NetState } from "../assets/scripts/net/NetTypes";
import { ReplayTransport } from "../assets/scripts/net/ReplayTransport";
import { readObservedCmdId, WsSocketEvent, WsSocketLike, WsTransport } from "../assets/scripts/net/WsTransport";
import { bytesToHex, concatBytes, decodeFrames, encodeFrame, WIRE_HEARTBEAT_MS, WireCmd } from "../assets/scripts/net/protocol/frame";
import {
  decodeProtoFields,
  encodeObservedCreateBody,
  encodeObservedLoginBody,
  summarizeLoginReply,
  uidFromAccount,
  varintField,
  wireBody,
  wireRoleReady,
} from "../assets/scripts/net/protocol/wireLogin";
import {
  decodeWireChapter,
  formatWireChapterIdx,
  formatWireMainline,
  WIRE_CHAPTER_CMD,
  WIRE_MAINLINE_READONLY_NOTE,
  WIRE_MAINLINE_READONLY_TITLE,
} from "../assets/scripts/net/protocol/wireChapter";
import {
  decodeWireIdle,
  decodeWireIdleClaim,
  formatWireIdle,
  WIRE_IDLE_CLAIM_CMD,
  WIRE_IDLE_CMD,
  wireIdleHasTime,
} from "../assets/scripts/net/protocol/wireIdle";
import { decodeWireRole, WIRE_ROLE_CMD } from "../assets/scripts/net/protocol/wireProfile";
import {
  applyWireBagGain,
  decodeWireBagGain,
  decodeWireBagList,
  formatWireBagLine,
  WIRE_BAG_CMD,
  WIRE_BAG_EMPTY,
  WIRE_BAG_GAIN_CMD,
  WIRE_BAG_READONLY_TITLE,
  WIRE_BAG_UNSYNCED_TOAST,
} from "../assets/scripts/net/protocol/wireBag";
import {
  decodeWireMailList,
  formatWireMailLine,
  WIRE_MAIL_CMD,
  WIRE_MAIL_EMPTY,
  WIRE_MAIL_READONLY_TITLE,
  WIRE_MAIL_UNSYNCED_TOAST,
  wireMailNote,
} from "../assets/scripts/net/protocol/wireMail";
import {
  decodeWireHeroList,
  encodeWireHeroListBody,
  formatWireHeroDetail,
  formatWireHeroLine,
  setWireHeroTypeNote,
  WIRE_HERO_CMD,
  WIRE_HERO_EMPTY,
  WIRE_HERO_READONLY_NOTE,
  WIRE_HERO_READONLY_TITLE,
  WIRE_HERO_UNSYNCED_TOAST,
  wireHeroNote,
} from "../assets/scripts/net/protocol/wireHero";
import {
  decodeWireActivity,
  formatWireActivityLine,
  formatWireActivityStamp,
  WIRE_ACTIVITY_CMD,
  WIRE_ACTIVITY_EMPTY,
  WIRE_ACTIVITY_FIELD_NOTE,
  WIRE_ACTIVITY_READONLY_NOTE,
  WIRE_ACTIVITY_READONLY_TITLE,
  WIRE_ACTIVITY_UNSYNCED_TOAST,
  wireActivityNote,
} from "../assets/scripts/net/protocol/wireActivity";
import {
  decodeWireAchievement,
  formatWireAchievementLine,
  WIRE_ACHIEVEMENT_CMD,
  WIRE_ACHIEVEMENT_EMPTY,
  WIRE_ACHIEVEMENT_FIELD_NOTE,
  WIRE_ACHIEVEMENT_READONLY_NOTE,
  WIRE_ACHIEVEMENT_READONLY_TITLE,
  WIRE_ACHIEVEMENT_SIDE_EFFECT,
  WIRE_ACHIEVEMENT_UNSYNCED_TOAST,
  wireAchievementNote,
} from "../assets/scripts/net/protocol/wireAchievement";
import {
  decodeWirePvp,
  formatWirePvpLine,
  formatWirePvpSelf,
  WIRE_PVP_CMD,
  WIRE_PVP_EMPTY,
  WIRE_PVP_FIELD_NOTE,
  WIRE_PVP_READONLY_NOTE,
  WIRE_PVP_READONLY_TITLE,
  WIRE_PVP_SEASON_NOTE,
  WIRE_PVP_SIDE_EFFECT,
  WIRE_PVP_UNSYNCED_TOAST,
  wirePvpNote,
} from "../assets/scripts/net/protocol/wirePvp";
import {
  decodeWireSevenDay,
  decodeWireSevenDayUpdate,
  formatWireSevenHead,
  formatWireSevenLine,
  WIRE_SEVEN_CMD,
  WIRE_SEVEN_EMPTY,
  WIRE_SEVEN_FIELD_NOTE,
  WIRE_SEVEN_PUSH_CMD,
  WIRE_SEVEN_PUSH_NOTE,
  WIRE_SEVEN_READONLY_NOTE,
  WIRE_SEVEN_READONLY_TITLE,
  WIRE_SEVEN_SIDE_EFFECT,
  WIRE_SEVEN_UNSYNCED_TOAST,
  wireSevenNote,
} from "../assets/scripts/net/protocol/wireSevenDay";
import {
  decodeWireGoal7,
  formatWireGoalHead,
  formatWireGoalLine,
  WIRE_GOAL7_CMD,
  WIRE_GOAL7_EMPTY,
  WIRE_GOAL7_FIELD_NOTE,
  WIRE_GOAL7_PUSH_CMD,
  WIRE_GOAL7_PUSH_NOTE,
  WIRE_GOAL7_READONLY_NOTE,
  WIRE_GOAL7_READONLY_TITLE,
  WIRE_GOAL7_SIDE_EFFECT,
  WIRE_GOAL7_UNSYNCED_TOAST,
  wireGoalNote,
} from "../assets/scripts/net/protocol/wireGoal7";
import {
  decodeWireWish,
  formatWireWishHead,
  formatWireWishSlot,
  WIRE_WISH_CMD,
  WIRE_WISH_EMPTY,
  WIRE_WISH_FIELD_NOTE,
  WIRE_WISH_READONLY_NOTE,
  WIRE_WISH_READONLY_TITLE,
  WIRE_WISH_SIDE_EFFECT,
  WIRE_WISH_UNSYNCED_TOAST,
  wireWishNote,
} from "../assets/scripts/net/protocol/wireWish";
import {
  decodeWireSummon,
  formatWireSummonLine,
  WIRE_SUMMON_CMD,
  WIRE_SUMMON_FIELD_NOTE,
  WIRE_SUMMON_READONLY_NOTE,
  WIRE_SUMMON_READONLY_TITLE,
  WIRE_SUMMON_SIDE_EFFECT,
  WIRE_SUMMON_UNSYNCED_TOAST,
  wireSummonNote,
} from "../assets/scripts/net/protocol/wireSummon";
import {
  decodeWireProphet,
  formatWireProphetHead,
  formatWireProphetLine,
  WIRE_PROPHET_CMD,
  WIRE_PROPHET_EMPTY,
  WIRE_PROPHET_FIELD_NOTE,
  WIRE_PROPHET_READONLY_NOTE,
  WIRE_PROPHET_READONLY_TITLE,
  WIRE_PROPHET_SIDE_EFFECT,
  WIRE_PROPHET_UNSYNCED_TOAST,
  wireProphetNote,
} from "../assets/scripts/net/protocol/wireProphet";
import {
  decodeWireJewel,
  formatWireJewelHead,
  formatWireJewelHero,
  formatWireJewelLine,
  WIRE_JEWEL_CMD,
  WIRE_JEWEL_EMPTY,
  WIRE_JEWEL_FIELD_NOTE,
  WIRE_JEWEL_READONLY_NOTE,
  WIRE_JEWEL_READONLY_TITLE,
  WIRE_JEWEL_SIDE_EFFECT,
  WIRE_JEWEL_UNSYNCED_TOAST,
  wireJewelNote,
} from "../assets/scripts/net/protocol/wireJewel";
import {
  decodeWireIllustrat,
  formatWireIllustratHead,
  formatWireIllustratLine,
  WIRE_ILLUSTRAT_CMD,
  WIRE_ILLUSTRAT_EMPTY,
  WIRE_ILLUSTRAT_FIELD_NOTE,
  WIRE_ILLUSTRAT_READONLY_NOTE,
  WIRE_ILLUSTRAT_READONLY_TITLE,
  WIRE_ILLUSTRAT_SIDE_EFFECT,
  WIRE_ILLUSTRAT_UNSYNCED_TOAST,
  wireIllustratNote,
} from "../assets/scripts/net/protocol/wireIllustrat";
import { WireSession } from "../assets/scripts/net/WireSession";
import {
  DEFAULT_WS_URL,
  explainWireTimeout,
  parseTransportSearch,
  readPreviewTransport,
  TransportConfig,
  WS_DOWN_LOG,
  WS_DOWN_STATUS,
  WS_OPEN_STATUS,
} from "../assets/scripts/net/transportSelect";
import { Cmd, CmdId, P0_CMDS, Proto } from "../assets/scripts/net/protocol";
import { PageStack } from "../assets/scripts/ui/PageStack";
import { PanelNav } from "../assets/scripts/ui/PanelNav";
import { PopupQueue } from "../assets/scripts/ui/PopupQueue";
import {
  applySafeFrame,
  formatAdapt,
  formatAdaptShort,
  layoutSafeFrame,
  metricsFrom,
  parseInsetOverride,
  SafeFrame,
} from "../assets/scripts/ui/safeAreaLayout";
import { StackView } from "../assets/scripts/ui/StackView";

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

function fakeView(): { view: StackView; visible: () => boolean; disposed: () => boolean } {
  let visible = false;
  let disposed = false;
  return {
    view: {
      setVisible(value: boolean) {
        visible = value;
      },
      dispose() {
        disposed = true;
        visible = false;
      },
    },
    visible: () => visible,
    disposed: () => disposed,
  };
}

function waitFor(pred: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (pred()) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error("timeout"));
        return;
      }
      setTimeout(tick, 15);
    };
    tick();
  });
}

function checkPages(): void {
  const stack = new PageStack();
  const hub = fakeView();
  const bag = fakeView();
  stack.open("hub", hub.view);
  stack.open("bag", bag.view);
  assert(stack.current === "bag" && stack.depth === 2, "bag on top");
  assert(hub.visible() === false && bag.visible() === true, "hub hidden");
  assert(stack.close() === "bag", "close bag");
  assert(bag.disposed() && hub.visible() && stack.current === "hub", "hub restored");
}

function checkPopups(): void {
  const queue = new PopupQueue();
  const first = fakeView();
  const second = fakeView();
  queue.enqueue("notice", first.view);
  queue.enqueue("notice-next", second.view);
  assert(queue.currentName === "notice" && first.visible() && !second.visible(), "first showing");
  assert(queue.pending === 1, "one waiting");
  assert(queue.closeCurrent() === "notice", "close first");
  assert(first.disposed() && queue.currentName === "notice-next" && second.visible(), "second showing");
  queue.closeCurrent();
  assert(queue.currentName === null && queue.pending === 0, "queue empty");
}

function fixtureFile(): string {
  const candidates = [
    join(process.cwd(), "client", "assets", "resources", "mock", "session-login-stage.json"),
    join(process.cwd(), "assets", "resources", "mock", "session-login-stage.json"),
  ];
  for (const file of candidates) {
    try {
      readFileSync(file, "utf8");
      return file;
    } catch (_err) {
      // try the next candidate
    }
  }
  throw new Error("mock fixture not found from " + process.cwd());
}

function configDir(): string {
  const candidates = [
    join(process.cwd(), "client", "assets", "resources", "config"),
    join(process.cwd(), "assets", "resources", "config"),
  ];
  for (const dir of candidates) {
    try {
      readFileSync(join(dir, "opencondition.json"), "utf8");
      return dir;
    } catch (_err) {
      // try the next candidate
    }
  }
  throw new Error("config json not found from " + process.cwd());
}

function checkGates(): void {
  const root = configDir();
  const openFile = JSON.parse(readFileSync(join(root, "opencondition.json"), "utf8")) as {
    rows: OpenConditionRow[];
  };
  const gateFile = JSON.parse(readFileSync(join(root, "system_gate.json"), "utf8")) as {
    rows: SystemGateRow[];
  };
  const rows = openFile.rows;
  const summon = rows.find((row) => row.id === "main_summon");
  const smith = rows.find((row) => row.id === "main_smith_shop");
  const tower = rows.find((row) => row.id === "magic_tower");
  assert(summon && smith && tower, "sample rows");
  assert(isEntryOpen(summon, 1, 1), "summon open at lv1");
  assert(!isEntryOpen(smith, 1, 1) && isEntryOpen(smith, 5, 1), "smith at lv5");
  assert(!isEntryOpen(tower, 1, 1) && isEntryOpen(tower, 1, 30), "magic tower on D30");
  const arenaRow = rows.find((row) => row.id === "main_pvp");
  assert(arenaRow && arenaRow.level === 8, "arena row");
  assert(!isEntryOpen(arenaRow, 7, 99) && isEntryOpen(arenaRow, 8, 1), "arena at lv8");
  const fantasy = rows.find((row) => row.id === "main_fantasy_tower");
  assert(fantasy && fantasy.level === 16 && fantasy.open_server_day === 0, "fantasy row");
  assert(!isEntryOpen(fantasy, 15, 30) && isEntryOpen(fantasy, 16, 1), "fantasy at lv16 not day");
  const mission = rows.find((row) => row.id === "main_mission");
  assert(mission && mission.level === 15 && mission.open_server_day === 0, "daily row");
  assert(!isEntryOpen(mission, 14, 99) && isEntryOpen(mission, 15, 1), "daily at lv15 not day");
  const blessing = rows.find((row) => row.id === "main_blessingpool");
  assert(blessing && blessing.level === 10 && blessing.open_server_day === 0, "wish row");
  assert(!isEntryOpen(blessing, 9, 99) && isEntryOpen(blessing, 10, 1), "wish at lv10 not day");
  const cafeRow = rows.find((row) => row.id === "main_cafe");
  assert(cafeRow && cafeRow.level === 12, "cafe still lv12");
  assert(!isEntryOpen(cafeRow, 10, 1) && !isEntryOpen(cafeRow, 11, 30) && isEntryOpen(cafeRow, 12, 1), "cafe stays shut at lv11");
  const lv11 = listOpenEntries(rows, 11, 1).map((row) => row.id);
  const lv12 = listOpenEntries(rows, 12, 1).map((row) => row.id);
  assert(lv11.indexOf("main_cafe") < 0 && lv12.indexOf("main_cafe") >= 0, "lv12 list opens cafe");
  const lv9 = listOpenEntries(rows, 9, 1).map((row) => row.id);
  const lv10 = listOpenEntries(rows, 10, 1).map((row) => row.id);
  assert(lv9.indexOf("main_blessingpool") < 0 && lv10.indexOf("main_blessingpool") >= 0, "lv10 list");
  assert(lv10.indexOf("main_cafe") < 0 && lv10.indexOf("main_pvp") >= 0, "lv10 opens wish not cafe");
  const lv15 = listOpenEntries(rows, 15, 1).map((row) => row.id);
  assert(lv15.indexOf("main_mission") >= 0 && lv15.indexOf("main_fantasy_tower") < 0, "lv15 daily not tower");
  const lv16 = listOpenEntries(rows, 16, 1).map((row) => row.id);
  assert(lv16.indexOf("main_fantasy_tower") >= 0 && lv16.indexOf("magic_tower") < 0, "lv16 tower not magic");
  const names = listOpenEntries(rows, 1, 1).map((row) => row.id);
  assert(names.indexOf("main_summon") >= 0 && names.indexOf("main_smith_shop") < 0 && names.indexOf("main_pvp") < 0, "lv1 list");
  const lv8 = listOpenEntries(rows, 8, 1).map((row) => row.id);
  assert(lv8.indexOf("main_pvp") >= 0 && lv8.indexOf("main_smith_shop") >= 0, "lv8 list");

  const war = gateFile.rows.find((row) => row.key === "clan_war_open_day");
  const magic = gateFile.rows.find((row) => row.key === "magic_tower_open_day");
  assert(war && magic, "gate rows");
  assert(!isServerGateOpen(war, 1) && isServerGateOpen(war, 3), "clan war D3");
  assert(!isServerGateOpen(magic, 29) && isServerGateOpen(magic, 30), "magic gate D30");
  checkNav(rows, gateFile.rows);
}

async function checkNet(): Promise<void> {
  const net = new NetClient(new MockTransport({ latencyMs: 10 }), {
    heartbeatMs: 60000,
    reconnectDelayMs: 20,
    maxReconnect: 3,
    requestTimeoutMs: 1000,
  });
  const states: NetState[] = [];
  net.onState((state) => states.push(state));
  const seen: string[] = [];
  net.subscribe("*", (msg) => seen.push(msg.cmd));

  await net.connect("mock://local");
  assert(net.state === "connected", "connected");
  const login = await net.request("login", { account: "mock" });
  const loginData = login.data as { ok?: boolean; token?: string; account?: string };
  assert(loginData.ok && loginData.token === "mock-token" && loginData.account === "mock", "login payload");
  const role = await net.request("role.enter", {});
  const roleData = role.data as { name?: string; level?: number };
  assert(roleData.name === "MockHero" && roleData.level === 1, "role payload");
  const echo = await net.request("echo.ping", { page: 1 });
  const echoData = echo.data as { ok?: boolean; echo?: { page?: number } };
  assert(echoData.ok === true && echoData.echo && echoData.echo.page === 1, "echo payload");
  assert(seen.indexOf("login") >= 0 && seen.indexOf("role.enter") >= 0 && seen.indexOf("echo.ping") >= 0, "dispatch");

  const typedLogin = await Proto.login({ account: "mock", serverId: 3 }, net);
  assert(typedLogin.ok && typedLogin.token === "mock-token" && typedLogin.serverId === 3, "proto login");
  const typedRole = await Proto.roleEnter({ account: "mock" }, net);
  assert(typedRole.ok && typedRole.hasRole && typedRole.name === "MockHero" && typedRole.level === 1, "proto enter");
  const badCreate = await Proto.roleCreate({ name: "  " }, net);
  assert(badCreate.ok === false && badCreate.code === ErrorCode.ROLE_NAME_EMPTY, "empty create rejected");
  assert(errorText(badCreate.code) === "角色名不能为空", "empty create text");
  const created = await Proto.roleCreate({ account: "mock", name: "新人" }, net);
  assert(created.ok && created.name === "新人" && created.roleId === 1001 && created.level === 1, "proto create");
  const afterCreate = await Proto.roleEnter({}, net);
  assert(afterCreate.name === "新人", "enter sees created role");
  const entered = await Proto.stageEnter({ stageId: 7 }, net);
  assert(entered.ok && entered.stageId === 7 && entered.battleId.indexOf("mock-battle-7-") === 0, "stage enter");
  const won = await Proto.stageResult({ stageId: 7, battleId: entered.battleId, win: true }, net);
  assert(won.ok && won.win && won.nextStageId === 8 && won.rewards.length === 1 && won.rewards[0].count === 10, "stage win");
  const lost = await Proto.stageResult({ stageId: 7, win: false }, net);
  assert(lost.ok && lost.win === false && lost.nextStageId === 7 && lost.rewards.length === 0, "stage lose");
  const badStage = await Proto.stageEnter({ stageId: 0 }, net);
  assert(badStage.ok === false && badStage.battleId === "" && badStage.code === ErrorCode.STAGE_ID_INVALID, "bad stage");
  const blank = await net.request("", {});
  const blankData = blank.data as { ok?: boolean; code?: number };
  assert(blankData.ok === false && blankData.code === ErrorCode.UNKNOWN_CMD, "blank cmd");
  assert(errorText(blankData.code) === "未知指令", "unknown cmd text");
  const beat = await Proto.heartbeat({ clientTime: 1 }, net);
  assert(typeof beat.serverTime === "number" && beat.serverTime > 0, "proto heartbeat");
  const ids = P0_CMDS.map((row) => row.cmd + ":" + row.id);
  assert(ids.indexOf(Cmd.login + ":1001") >= 0 && ids.indexOf(Cmd.stageResult + ":1202") >= 0, "p0 cmd list");
  assert(new Set(ids).size === P0_CMDS.length, "p0 cmds unique");

  net.simulateDrop();
  await waitFor(() => net.state === "connected" && states.indexOf("reconnecting") >= 0, 2000);
  const after = await net.request("login", { account: "mock" });
  assert((after.data as { ok?: boolean }).ok === true, "login after reconnect");
  net.close();
  assert(net.state === "closed", "closed");
  assert(states.indexOf("connecting") >= 0 && states.indexOf("closed") >= 0, "state machine");
  let rejected = false;
  try {
    await net.request("login", { account: "mock" });
  } catch (err) {
    rejected = true;
    assert(err instanceof GameError && err.code === ErrorCode.NET_NOT_CONNECTED, "request when closed");
    assert(messageOf(err) === "网络未连接", "closed request text");
  }
  assert(rejected, "request when closed threw");
}

function quietNet(transport: MockTransport | ReplayTransport): NetClient {
  return new NetClient(transport, {
    heartbeatMs: 60000,
    reconnectDelayMs: 20,
    maxReconnect: 3,
    requestTimeoutMs: 1000,
  });
}

async function checkSession(): Promise<void> {
  const net = quietNet(new MockTransport({ latencyMs: 5 }));
  await net.connect("mock://local");
  const role = await Proto.roleEnter({}, net);
  assert(role.name === "MockHero" && role.level === 1 && role.stageId === 1 && role.openDay === 1, "fresh session");
  assert(role.gold === MOCK_STARTER_GOLD && role.diamond === MOCK_STARTER_DIAMOND, "starter wallet");

  let next = 1;
  for (let i = 0; i < 5; i++) {
    const entered = await Proto.stageEnter({ stageId: next }, net);
    assert(entered.ok && entered.battleId.indexOf("mock-battle-" + next + "-") === 0, "loop enter " + next);
    const won = await Proto.stageResult({ stageId: next, battleId: entered.battleId, win: true }, net);
    assert(won.ok && won.win && won.nextStageId === next + 1 && won.level === next + 1, "loop win " + next);
    next = won.nextStageId;
  }
  const after = await Proto.roleEnter({}, net);
  assert(after.level === 6 && after.stageId === 6 && after.openDay === 2 && after.name === "MockHero", "after 5 clears");
  assert(after.gold === MOCK_STARTER_GOLD + 50 && after.diamond === MOCK_STARTER_DIAMOND, "gold from five clears");
  const lost = await Proto.stageResult({ stageId: 6, win: false }, net);
  assert(lost.ok && lost.nextStageId === 6 && lost.level === 6 && lost.openDay === 2 && lost.rewards.length === 0, "loss keeps progress");
  assert(lost.gold === MOCK_STARTER_GOLD + 50 && lost.diamond === MOCK_STARTER_DIAMOND, "loss keeps wallet");
  const still = await Proto.roleEnter({}, net);
  assert(still.stageId === 6 && still.level === 6 && still.openDay === 2, "enter after loss");

  const created = await Proto.roleCreate({ name: "新人" }, net);
  assert(created.ok && created.name === "新人" && created.level === 1, "create resets level");
  const reset = await Proto.roleEnter({}, net);
  assert(reset.name === "新人" && reset.level === 1 && reset.stageId === 1 && reset.openDay === 1, "create resets progress");
  assert(reset.gold === MOCK_STARTER_GOLD && reset.diamond === MOCK_STARTER_DIAMOND, "create resets wallet");
  net.close();

  const seeded = new MockGameSession({ clearedStage: 3, openDay: 9, role: { name: "老号" } });
  assert(seeded.role.level === 4 && seeded.stageId === 4 && seeded.openDay === 9, "seed derived");
  const kept = quietNet(new MockTransport({ latencyMs: 5, session: seeded }));
  const states: NetState[] = [];
  kept.onState((state) => states.push(state));
  await kept.connect("mock://local");
  const old = await Proto.roleEnter({}, kept);
  assert(old.name === "老号" && old.level === 4 && old.openDay === 9 && old.stageId === 4, "seeded enter");
  assert(old.gold === MOCK_STARTER_GOLD && old.diamond === MOCK_STARTER_DIAMOND, "seed keeps starter wallet");
  const rich = new MockGameSession({ gold: 7, diamond: 3, clearedStage: 1 });
  assert(rich.gold === 7 && rich.diamond === 3 && rich.role.level === 2, "seed wallet");
  kept.simulateDrop();
  await waitFor(() => kept.state === "connected" && states.indexOf("reconnecting") >= 0, 2000);
  const again = await Proto.roleEnter({}, kept);
  assert(again.name === "老号" && again.stageId === 4 && again.openDay === 9, "session survives reconnect");
  kept.close();
}

async function checkReplay(): Promise<void> {
  const fixture = parseMockFixture(JSON.parse(readFileSync(fixtureFile(), "utf8")));
  const cmds = fixture.steps.map((step) => step.cmd);
  assert(cmds.indexOf("login") >= 0 && cmds.indexOf("role.enter") >= 0, "fixture login");
  assert(cmds.indexOf("stage.enter") >= 0 && cmds.indexOf("stage.result") >= 0, "fixture stage");
  let threw = false;
  try {
    parseMockFixture({ name: "empty", steps: [] });
  } catch (_err) {
    threw = true;
  }
  assert(threw, "empty fixture rejected");

  const replay = new ReplayTransport(fixture, { latencyMs: 5 });
  const net = quietNet(replay);
  await net.connect("replay://fixture");
  const beat = await Proto.heartbeat({ clientTime: 1 }, net);
  assert(typeof beat.serverTime === "number" && beat.serverTime > 0 && replay.played() === 0, "heartbeat skips replay");
  const early = await Proto.roleEnter({}, net);
  assert(early.ok === false && early.code === ErrorCode.REPLAY_MISMATCH && replay.played() === 0, "out of order does not advance");
  assert(errorText(early.code) === "回放指令不匹配", "replay mismatch text");

  const login = await Proto.login({ account: "other", serverId: 9 }, net);
  assert(login.ok && login.account === "mock" && login.token === "mock-token" && login.serverId === 1, "replay login");
  const role = await Proto.roleEnter({}, net);
  assert(role.ok && role.hasRole && role.name === "MockHero" && role.level === 1 && role.stageId === 1, "replay enter");
  const created = await Proto.roleCreate({ name: "别人" }, net);
  assert(created.ok && created.name === "新人" && created.level === 1, "replay create ignores request");
  const renamed = await Proto.roleEnter({}, net);
  assert(renamed.name === "新人" && renamed.stageId === 1 && renamed.openDay === 1, "replay enter after create");
  const entered = await Proto.stageEnter({ stageId: 99 }, net);
  assert(entered.ok && entered.stageId === 1 && entered.battleId === "mock-battle-1-1", "replay stage enter");
  const won = await Proto.stageResult({ stageId: 1, battleId: entered.battleId, win: true }, net);
  assert(
    won.ok && won.win && won.nextStageId === 2 && won.level === 2 && won.rewards.length === 1 && won.rewards[0].count === 10,
    "replay stage result"
  );
  assert(replay.played() === fixture.steps.length, "replay consumed");
  const extra = await Proto.stageEnter({ stageId: 2 }, net);
  assert(extra.ok === false && extra.code === ErrorCode.REPLAY_ENDED, "replay ended");
  assert(errorText(ErrorCode.NET_CLOSED) === "网络已断开", "closed text");
  assert(failureCode({ ok: false }) === ErrorCode.UNKNOWN_CMD, "missing code is unknown cmd");
  assert(failureCode({ ok: true }) === null, "ok is not a failure");
  net.close();
}

function near(actual: number, expected: number, message: string): void {
  assert(Math.abs(actual - expected) < 0.001, message + " " + actual + " vs " + expected);
}

function checkSafeArea(): void {
  const full = metricsFrom(720, 1280, 720, 1280, { x: 0, y: 0, width: 720, height: 1280 }, null);
  const identity = layoutSafeFrame(full);
  near(identity.offsetX, 0, "identity x");
  near(identity.offsetY, 0, "identity y");
  near(identity.scale, 1, "identity scale");
  assert(formatAdapt(full, identity).indexOf("scale 1.00") >= 0, "format identity");

  const notched = metricsFrom(720, 1280, 720, 1280, { x: 0, y: 0, width: 720, height: 1200 }, null);
  const notchFrame = layoutSafeFrame(notched);
  near(notchFrame.insets.top, 80, "notch top");
  near(notchFrame.insets.bottom, 0, "notch bottom");
  near(notchFrame.offsetY, -40, "notch shifts down");
  near(notchFrame.scale, 1200 / 1280, "notch scale");

  const short = layoutSafeFrame(metricsFrom(720, 600, 720, 1280, null, null));
  near(short.scale, 600 / 1280, "short window scales down");
  near(short.offsetX, 0, "short window centered");

  const wide = layoutSafeFrame(metricsFrom(1400, 1280, 720, 1280, { x: 0, y: 0, width: 1400, height: 1280 }, null));
  near(wide.scale, 1, "wider than design does not scale up");

  const side = layoutSafeFrame(
    metricsFrom(720, 1280, 720, 1280, { x: 40, y: 0, width: 670, height: 1280 }, null)
  );
  near(side.insets.left, 40, "left inset");
  near(side.insets.right, 10, "right inset");
  near(side.offsetX, 15, "side shift");

  const forced = metricsFrom(720, 1280, 720, 1280, { x: 0, y: 0, width: 720, height: 1280 }, {
    top: 88,
    right: 0,
    bottom: 34,
    left: 0,
  });
  const forcedFrame = layoutSafeFrame(forced);
  near(forcedFrame.insets.top, 88, "preview top");
  near(forcedFrame.insets.bottom, 34, "preview bottom");
  near(forcedFrame.offsetY, (34 - 88) / 2, "preview shift");
  assert(formatAdapt(forced, forcedFrame).indexOf("T88") >= 0, "format notch");
  assert(formatAdapt(forced, forcedFrame).indexOf("B34") >= 0, "format home");
  const corner = formatAdaptShort(forced, forcedFrame);
  assert(corner.indexOf("720x1280") >= 0 && corner.indexOf("T88") >= 0 && corner.indexOf("B34") >= 0, "short label");
  assert(corner.indexOf("design") < 0, "short label skips design");

  const overflow = layoutSafeFrame(
    metricsFrom(720, 1280, 720, 1280, null, { top: 2000, right: 0, bottom: 2000, left: 0 })
  );
  near(overflow.safeHeight, 0, "insets clamp to visible");
  near(overflow.scale, 0, "no safe height");
  near(overflow.offsetY, 0, "equal insets stay centered");

  const fallback = metricsFrom(0, 0, 0, 0, null, null);
  near(fallback.visibleWidth, 720, "fallback width");
  near(fallback.visibleHeight, 1280, "fallback height");
  near(layoutSafeFrame(fallback).scale, 1, "fallback scale");

  assert(parseInsetOverride("88,0,34,0")?.top === 88, "parse override");
  assert(parseInsetOverride(" 10 , 0 , 0 , 4 ")?.left === 4, "parse spaces");
  assert(parseInsetOverride("1,2") === null, "parse short");
  assert(parseInsetOverride("-1,0,0,0") === null, "parse negative");
  assert(parseInsetOverride("") === null, "parse empty");
  assert(parseInsetOverride(null) === null, "parse null");

  const node = fakeTransform();
  applySafeFrame(node, notchFrame, true);
  near(node.pos.y, notchFrame.offsetY, "apply offset");
  near(node.scale.x, notchFrame.scale, "apply scale");
  applySafeFrame(node, notchFrame, false);
  near(node.scale.x, 1, "popup layer stays unscaled");
  near(node.pos.y, notchFrame.offsetY, "popup still shifts");
  assert(frameHasInsets(notchFrame), "frame keeps insets");
}

function frameHasInsets(frame: SafeFrame): boolean {
  return frame.insets.top > 0 || frame.insets.bottom > 0 || frame.insets.left > 0 || frame.insets.right > 0;
}

function fakeTransform(): {
  pos: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  setPosition(x: number, y: number, z?: number): void;
  setScale(x: number, y: number, z?: number): void;
} {
  const pos = { x: 0, y: 0, z: 0 };
  const scale = { x: 1, y: 1, z: 1 };
  return {
    pos,
    scale,
    setPosition(x: number, y: number, z?: number) {
      pos.x = x;
      pos.y = y;
      pos.z = z ?? 0;
    },
    setScale(x: number, y: number, z?: number) {
      scale.x = x;
      scale.y = y;
      scale.z = z ?? 1;
    },
  };
}

function checkLog(): void {
  const log = new GameLog(4);
  log.mirrorConsole = false;
  log.debug("T", "d");
  log.info("T", "i");
  log.warn("T", "w");
  log.error("T", "e");
  log.info("T", "x");
  const lines = log.recent();
  assert(lines.length === 4, "ring cap");
  assert(lines[0].message === "i" && lines[3].message === "x", "ring drops oldest");
  assert(lines[2].level === "error" && lines[2].tag === "T", "level kept");
  const text = log.format(lines[3]);
  assert(text.indexOf("[mxzg]") >= 0 && text.indexOf("[T]") >= 0 && text.indexOf("x") >= 0, "format tag");
  assert(log.recent(2).length === 2 && log.recent(2)[1].message === "x", "recent limit");
  log.minLevel = "warn";
  log.info("T", "hidden");
  assert(log.recent().length === 4 && log.recent()[3].message === "x", "min level filters");
  log.mirrorConsole = true;
  log.warn("T", "mirrored");
  assert(log.recent()[log.recent().length - 1].message === "mirrored", "mirror still buffers");
}

function memoryStore(seed?: Record<string, string>): PrefStore & { data: Record<string, string> } {
  const data: Record<string, string> = seed ? { ...seed } : {};
  return {
    data,
    getItem(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string): void {
      data[key] = value;
    },
  };
}

function checkLoginPrefs(): void {
  assert(MOCK_SERVERS.length === 3, "three servers");
  assert(findServer(1).name === "本地Mock" && findServer(2).name === "提审" && findServer(3).name === "正式占位", "server names");
  assert(findServer(99).id === 1 && findServer(Number.NaN).name === "本地Mock", "unknown server");
  assert(resolveAccount("  ", "mock") === "mock", "blank account falls back");
  assert(resolveAccount(" qian ", "mock") === "qian", "account trimmed");
  assert(resolveAccount("", "") === "mock", "default account");

  const empty = memoryStore();
  assert(loadLoginPrefs(empty) === null, "empty prefs");
  assert(loadLoginPrefs(null) === null, "missing store");
  saveLoginPrefs({ account: " 倩 ", serverId: 2 }, empty);
  const loaded = loadLoginPrefs(empty);
  assert(loaded !== null && loaded.account === "倩" && loaded.serverId === 2, "saved prefs");
  assert(empty.data["mxzg.account"] === "倩" && empty.data["mxzg.serverId"] === "2", "storage keys");
  saveLoginPrefs({ account: "a", serverId: 99 }, empty);
  const fallback = loadLoginPrefs(empty) as LoginPrefs;
  assert(fallback.account === "a" && fallback.serverId === 1 && empty.data["mxzg.serverId"] === "1", "unknown server stored as local");
  const serverOnly = memoryStore({ "mxzg.serverId": "3" });
  const onlyServer = loadLoginPrefs(serverOnly);
  assert(onlyServer !== null && onlyServer.account === "" && onlyServer.serverId === 3, "server without account");
  const junk = memoryStore({ "mxzg.account": "qian", "mxzg.serverId": "nope" });
  const junkLoaded = loadLoginPrefs(junk);
  assert(junkLoaded !== null && junkLoaded.account === "qian" && junkLoaded.serverId === 1, "bad server id");

  const prevAccount = Session.account;
  const prevServer = Session.serverName;
  const prevRole = Session.role;
  Session.account = "";
  Session.role = null;
  assert(formatHubIdentity() === "未登录（请从 Boot 进入）", "hub logged out");
  Session.account = "qian";
  Session.serverName = "提审";
  Session.role = { roleId: 1001, name: "倩", level: 3 };
  assert(formatHubIdentity() === "倩 Lv3 · 提审", "hub shows role and server");
  const prevDay = Session.openDay;
  const prevStage = Session.stageId;
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  Session.openDay = 2;
  Session.gold = 110;
  Session.diamond = 20;
  assert(formatNameLine() === "倩 Lv3", "name line");
  assert(formatSubLine() === "提审 · 开服D2", "sub line");
  assert(formatGoldLine() === "金币 110" && formatDiamondLine() === "钻石 20", "currency lines");
  Session.applyEnter({ roleId: 9, name: "甲", level: 4, openDay: 6, stageId: 5, gold: 8.9, diamond: -3 });
  assert(Session.role?.name === "甲" && Session.role?.level === 4 && Session.openDay === 6 && Session.stageId === 5, "apply enter progress");
  assert(Session.gold === 8 && Session.diamond === 0, "apply enter floors wallet");
  Session.applyEnter({ roleId: 9, name: "甲", level: 1 });
  assert(Session.gold === 0 && Session.diamond === 0 && Session.openDay === 1 && Session.stageId === 1, "missing wallet clears");
  Session.account = prevAccount;
  Session.serverName = prevServer;
  Session.role = prevRole;
  Session.openDay = prevDay;
  Session.stageId = prevStage;
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
}

async function checkNoRole(): Promise<void> {
  const net = quietNet(new MockTransport({ latencyMs: 5 }));
  await net.connect("mock://local");
  const login = await Proto.login({ account: "qian", serverId: 2 }, net);
  assert(login.ok && login.account === "qian" && login.serverId === 2, "login other account");
  const none = await Proto.roleEnter({ account: "qian" }, net);
  assert(none.ok === true && none.hasRole === false && none.name === "" && none.gold === 0 && none.diamond === 0, "other account has no role");
  const bad = await Proto.roleCreate({ account: "qian", name: "  " }, net);
  assert(bad.ok === false && bad.code === ErrorCode.ROLE_NAME_EMPTY, "empty create still rejected");
  const stillGone = await Proto.roleEnter({}, net);
  assert(stillGone.hasRole === false, "empty create does not grant a role");
  const back = await Proto.login({ account: "mock", serverId: 1 }, net);
  assert(back.ok && back.serverId === 1, "login mock again");
  const hero = await Proto.roleEnter({}, net);
  assert(hero.hasRole === true && hero.name === "MockHero" && hero.level === 1, "mock account keeps MockHero");
  const again = await Proto.login({ account: "qian", serverId: 3 }, net);
  assert(again.ok && again.serverId === 3, "login qian on placeholder server");
  const created = await Proto.roleCreate({ account: "qian", name: "倩" }, net);
  assert(created.ok && created.name === "倩" && created.level === 1, "create named role");
  const entered = await Proto.roleEnter({}, net);
  assert(entered.hasRole === true && entered.name === "倩" && entered.level === 1 && entered.stageId === 1, "enter after create");
  const switched = await Proto.login({ account: "mock", serverId: 1 }, net);
  assert(switched.ok, "switch back");
  const hidden = await Proto.roleEnter({}, net);
  assert(hidden.hasRole === false, "created role stays with qian");
  net.close();
}

function checkNav(rows: OpenConditionRow[], gates: SystemGateRow[]): void {
  const db = { opencondition: rows, systemGate: gates };
  const city = findNavEntry("city");
  const summon = findNavEntry("summon");
  const smith = findNavEntry("smith");
  const magic = findNavEntry("magic");
  assert(city && summon && smith && magic, "nav entries");
  assert(entryAccess(city, 1, 1, null).open, "city always open");
  assert(entryAccess(summon, 1, 1, db).open, "summon open at lv1");
  const smithLock = entryAccess(smith, 1, 1, db);
  assert(!smithLock.open && smithLock.hint.indexOf("Lv5") >= 0, "smith hint");
  assert(!entryAccess(smith, 4, 30, db).open && entryAccess(smith, 5, 1, db).open, "smith opens at lv5");
  const magicLock = entryAccess(magic, 99, 1, db);
  assert(!magicLock.open && magicLock.hint.split("开服第30天").length === 2, "magic hint once");
  assert(!entryAccess(magic, 1, 29, db).open && entryAccess(magic, 1, 30, db).open, "magic opens on D30");
  assert(!entryAccess(smith, 9, 30, null).open && entryAccess(smith, 9, 30, null).hint.indexOf("配置未加载") >= 0, "gated without config");
  assert(tabLabel("铁匠铺", false) === "锁·铁匠铺" && tabLabel("铁匠铺", true) === "铁匠铺", "locked label");
  const arenaEntry = findNavEntry("arena");
  assert(arenaEntry !== null && arenaEntry.gateId === "main_pvp", "arena gate");
  const arenaLock = entryAccess(arenaEntry, 1, 1, db);
  assert(!arenaLock.open && arenaLock.hint.indexOf("Lv8") >= 0, "arena hint");
  assert(!entryAccess(arenaEntry, 7, 30, db).open && entryAccess(arenaEntry, 8, 1, db).open, "arena opens at lv8");
  assert(tabLabel("竞技场", false) === "锁·竞技场", "arena locked label");
  assert(arenaEntry.blurb.indexOf("积分") >= 0, "arena blurb");
  const towerEntry = findNavEntry("tower");
  assert(towerEntry !== null && towerEntry.gateId === "main_fantasy_tower", "tower gate");
  const towerLock = entryAccess(towerEntry, 1, 1, db);
  assert(!towerLock.open && towerLock.hint === "幻境之塔未开启，需要主线达到 Lv16", "tower hint");
  assert(towerLock.hint.indexOf("开服") < 0, "tower hint has no open day");
  assert(!entryAccess(towerEntry, 15, 30, db).open && entryAccess(towerEntry, 16, 1, db).open, "tower opens at lv16");
  assert(tabLabel("幻境之塔", false) === "锁·幻境之塔", "tower locked label");
  assert(towerEntry.blurb.indexOf("Lv16") >= 0, "tower blurb");
  assert(rootTabFor("tower") === "plays", "tower stays on plays");
  const dailyEntry = findNavEntry("daily");
  assert(dailyEntry !== null && dailyEntry.gateId === "main_mission", "daily gate");
  const dailyLock = entryAccess(dailyEntry, 1, 1, db);
  assert(!dailyLock.open && dailyLock.hint === "日常副本未开启，需要主线达到 Lv15", "daily hint");
  assert(dailyLock.hint.indexOf("开服") < 0, "daily hint has no open day");
  assert(!entryAccess(dailyEntry, 14, 30, db).open && entryAccess(dailyEntry, 15, 1, db).open, "daily opens at lv15");
  assert(tabLabel("日常副本", false) === "锁·日常副本", "daily locked label");
  assert(dailyEntry.blurb.indexOf("金币") >= 0 && dailyEntry.blurb.indexOf("Lv15") >= 0, "daily blurb");
  assert(rootTabFor("daily") === "plays", "daily stays on plays");
  const login7Entry = findNavEntry("login7");
  assert(login7Entry !== null && !login7Entry.gateId && !login7Entry.serverGateKey, "login7 has no gate");
  assert(entryAccess(login7Entry, 1, 1, null).open && entryAccess(login7Entry, 1, 1, db).open, "login7 open on day 1");
  assert(entryAccess(login7Entry, 1, 30, db).open && login7Entry.blurb.indexOf("登录天") >= 0, "login7 ignores open day");
  assert(rootTabFor("login7") === "plays", "login7 stays on plays");
  const goal7Entry = findNavEntry("goal7");
  assert(goal7Entry !== null && !goal7Entry.gateId && !goal7Entry.serverGateKey, "goal7 has no gate");
  assert(entryAccess(goal7Entry, 1, 1, null).open && entryAccess(goal7Entry, 1, 1, db).open, "goal7 open on day 1");
  assert(entryAccess(goal7Entry, 1, 30, db).open && goal7Entry.blurb.indexOf("70") >= 0, "goal7 ignores open day");
  assert(rootTabFor("goal7") === "plays", "goal7 stays on plays");
  const shopEntry = findNavEntry("shop");
  assert(shopEntry !== null && !shopEntry.gateId && !shopEntry.serverGateKey, "shop has no gate");
  assert(entryAccess(shopEntry, 1, 1, null).open && entryAccess(shopEntry, 1, 1, db).open, "shop open on day 1");
  assert(entryAccess(shopEntry, 1, 30, db).open && shopEntry.blurb.indexOf("金币") >= 0, "shop ignores open day");
  assert(rootTabFor("shop") === "plays", "shop stays on plays");
  const giftEntry = findNavEntry("gift");
  assert(giftEntry !== null && !giftEntry.gateId && !giftEntry.serverGateKey, "gift has no gate");
  assert(entryAccess(giftEntry, 1, 1, null).open && entryAccess(giftEntry, 1, 1, db).open, "gift open on day 1");
  assert(entryAccess(giftEntry, 1, 30, db).open && giftEntry.blurb.indexOf("模拟充值") >= 0, "gift ignores open day");
  assert(rootTabFor("gift") === "plays", "gift stays on plays");
  const giftFromCity = new NavHistory();
  giftFromCity.reset("city");
  giftFromCity.push("gift");
  assert(giftFromCity.current === "gift" && giftFromCity.rootTab() === "city", "gift opened from city");
  giftFromCity.pop();
  giftFromCity.push("plays");
  giftFromCity.push("gift");
  assert(giftFromCity.current === "gift" && giftFromCity.rootTab() === "plays" && giftFromCity.pop() === "gift", "gift opened from plays");
  const limitedEntry = findNavEntry("limited");
  assert(limitedEntry !== null && !limitedEntry.gateId && !limitedEntry.serverGateKey, "limited has no gate");
  assert(entryAccess(limitedEntry, 1, 1, null).open && entryAccess(limitedEntry, 1, 1, db).open, "limited open on day 1");
  assert(entryAccess(limitedEntry, 1, 30, db).open && limitedEntry.blurb.indexOf("点石成金") >= 0, "limited ignores open day");
  assert(rootTabFor("limited") === "plays", "limited stays on plays");
  const limitedFromCity = new NavHistory();
  limitedFromCity.reset("city");
  limitedFromCity.push("limited");
  assert(limitedFromCity.current === "limited" && limitedFromCity.rootTab() === "city", "limited opened from city");
  limitedFromCity.pop();
  limitedFromCity.push("plays");
  limitedFromCity.push("limited");
  assert(limitedFromCity.current === "limited" && limitedFromCity.rootTab() === "plays" && limitedFromCity.pop() === "limited", "limited opened from plays");
  const wishEntry = findNavEntry("wish");
  assert(wishEntry !== null && wishEntry.gateId === "main_blessingpool", "wish gate");
  const wishLock = entryAccess(wishEntry, 1, 1, db);
  assert(!wishLock.open && wishLock.hint === "许愿池未开启，需要主线达到 Lv10", "wish hint");
  assert(wishLock.hint.indexOf("开服") < 0, "wish hint has no open day");
  assert(!entryAccess(wishEntry, 9, 30, db).open && entryAccess(wishEntry, 10, 1, db).open, "wish opens at lv10");
  assert(tabLabel("许愿池", false) === "锁·许愿池", "wish locked label");
  assert(wishEntry.blurb.indexOf("Lv10") >= 0 && wishEntry.blurb.indexOf("许愿符") >= 0, "wish blurb");
  assert(rootTabFor("wish") === "plays", "wish stays on plays");
  const cafeEntry = findNavEntry("cafe");
  assert(cafeEntry !== null && cafeEntry.gateId === "main_cafe", "cafe gate");
  const cafeLock = entryAccess(cafeEntry, 1, 1, db);
  assert(!cafeLock.open && cafeLock.hint === "咖啡馆未开启，需要主线达到 Lv12", "cafe hint");
  assert(cafeLock.hint.indexOf("开服") < 0, "cafe hint has no open day");
  assert(!entryAccess(cafeEntry, 11, 30, db).open && entryAccess(cafeEntry, 12, 1, db).open, "cafe opens at lv12");
  assert(tabLabel("咖啡馆", false) === "锁·咖啡馆", "cafe locked label");
  assert(cafeEntry.blurb.indexOf("Lv12") >= 0 && cafeEntry.blurb.indexOf("招待") >= 0, "cafe blurb");
  assert(rootTabFor("cafe") === "plays", "cafe stays on plays");
  const shopFromCity = new NavHistory();
  shopFromCity.reset("city");
  shopFromCity.push("shop");
  assert(shopFromCity.current === "shop" && shopFromCity.rootTab() === "city", "shop opened from city");
  shopFromCity.pop();
  shopFromCity.push("plays");
  shopFromCity.push("shop");
  assert(shopFromCity.current === "shop" && shopFromCity.rootTab() === "plays" && shopFromCity.pop() === "shop", "shop opened from plays");
  const goalFromCity = new NavHistory();
  goalFromCity.reset("city");
  goalFromCity.push("goal7");
  goalFromCity.push("mainline");
  assert(goalFromCity.current === "mainline" && goalFromCity.pop() === "mainline" && goalFromCity.current === "goal7", "mainline returns to goals");
  goalFromCity.push("hero");
  assert(goalFromCity.rootTab() === "hero" && goalFromCity.pop() === "hero" && goalFromCity.current === "goal7", "hero returns to goals");
  goalFromCity.reset("city");
  goalFromCity.push("plays");
  goalFromCity.push("goal7");
  assert(goalFromCity.rootTab() === "plays", "goals opened from plays");
  const magicEntry = findNavEntry("magic");
  assert(
    magicEntry !== null && magicEntry.gateId === "magic_tower" && magicEntry.serverGateKey === "magic_tower_open_day",
    "magic stays day gate"
  );
  assert(rootTabFor("arena") === "plays" && rootTabFor("log") === "city" && rootTabFor("smith") === "smith", "root tab");
  assert(rootTabFor("mainline") === "city", "mainline stays on city tab");
  assert(rootTabFor("buygold") === "city" && rootTabFor("achieve") === "city", "buy gold and achievement stay on the city tab");
  assert(rootTabFor("prophet") === "city", "prophet stays on the city tab");
  assert(rootTabFor("jewel") === "city", "jewel stays on the city tab");
  assert(rootTabFor("illustrat") === "city", "illustrat stays on the city tab");
  const heroEntry = findNavEntry("hero");
  assert(heroEntry !== null && entryAccess(heroEntry, 1, 1, db).open, "hero open at lv1");
  assert(rootTabFor("hero") === "hero" && rootTabFor("hero-detail") === "hero", "hero detail highlights hero");
  assert(rootTabFor("summon") === "summon", "summon is its own tab");
  const heroNav = new NavHistory();
  heroNav.reset("city");
  heroNav.push("hero");
  heroNav.push("hero-detail");
  assert(heroNav.current === "hero-detail" && heroNav.rootTab() === "hero", "detail stays on hero tab");
  assert(heroNav.pop() === "hero-detail" && heroNav.current === "hero", "back to hero list");
  heroNav.pop();
  assert(heroNav.current === "city" && heroNav.rootTab() === "city", "back to city from hero");
  const idleEntry = findNavEntry("idle");
  assert(idleEntry !== null && entryAccess(idleEntry, 1, 1, null).open, "idle always open");
  assert(rootTabFor("idle") === "city", "idle home is city");
  const idleNav = new NavHistory();
  idleNav.reset("city");
  idleNav.push("idle");
  assert(idleNav.rootTab() === "city", "idle opened from city");
  idleNav.reset("city");
  idleNav.push("plays");
  idleNav.push("idle");
  assert(idleNav.current === "idle" && idleNav.rootTab() === "plays", "idle opened from plays");
  const bagEntry = findNavEntry("bag");
  assert(bagEntry !== null && bagEntry.gateId === "bag", "bag entry");
  assert(entryAccess(bagEntry, 1, 1, db).open, "bag open at lv1");
  const bagLock = entryAccess(bagEntry, 0, 1, db);
  assert(!bagLock.open && bagLock.hint.indexOf("Lv1") >= 0, "bag locked below lv1");
  const bagFromCity = new NavHistory();
  bagFromCity.reset("city");
  bagFromCity.push("bag");
  assert(bagFromCity.current === "bag" && bagFromCity.rootTab() === "city", "bag opened from city");
  bagFromCity.reset("city");
  bagFromCity.push("plays");
  bagFromCity.push("bag");
  assert(bagFromCity.current === "bag" && bagFromCity.rootTab() === "plays", "bag opened from plays");
  const mailEntry = findNavEntry("mail");
  assert(mailEntry !== null && mailEntry.gateId === "mail", "mail entry");
  assert(entryAccess(mailEntry, 1, 1, db).open, "mail open at lv1");
  const mailLock = entryAccess(mailEntry, 0, 1, db);
  assert(!mailLock.open && mailLock.hint.indexOf("Lv1") >= 0, "mail locked below lv1");
  const mailFromCity = new NavHistory();
  mailFromCity.reset("city");
  mailFromCity.push("mail");
  assert(mailFromCity.current === "mail" && mailFromCity.rootTab() === "city", "mail opened from city");
  mailFromCity.reset("city");
  mailFromCity.push("plays");
  mailFromCity.push("mail");
  assert(mailFromCity.current === "mail" && mailFromCity.rootTab() === "plays", "mail opened from plays");

  const history = new NavHistory();
  history.reset("city");
  history.push("plays");
  history.push("arena");
  assert(history.current === "arena" && history.rootTab() === "plays" && history.depth === 3, "history child");
  assert(history.pop() === "arena" && history.current === "plays", "history pop");
  history.push("magic");
  history.popTo("city");
  assert(history.current === "city" && history.depth === 1, "history pop to city");
  assert(history.pop() === null && history.current === "city", "history keeps root");
}

function checkPanelNav(): void {
  const stack = new PageStack();
  const closed: string[] = [];
  const host = {
    pages: stack,
    openPage(name: string, _view: string) {
      stack.open(name, {
        setVisible() {},
        dispose() {},
      });
    },
    closePage() {
      return stack.close();
    },
  };
  const nav = new PanelNav<string>(host, (id) => id, (id) => closed.push(id));
  nav.start("city");
  assert(nav.current === "city" && stack.depth === 1 && stack.current === "city", "panel start");
  nav.openChild("plays");
  nav.openChild("arena");
  assert(nav.current === "arena" && nav.rootTab === "plays" && stack.depth === 3, "panel child");
  assert(nav.back() && nav.current === "plays" && closed[0] === "arena", "panel back");
  nav.openRoot("hero");
  assert(nav.current === "hero" && stack.current === "hero" && stack.depth === 2, "panel root replaces");
  assert(closed.indexOf("plays") >= 0, "plays closed by root switch");
  nav.openRoot("hero");
  assert(stack.depth === 2 && nav.current === "hero", "same root is a no-op");
  nav.openRoot("city");
  assert(nav.current === "city" && stack.depth === 1 && stack.current === "city", "back to city");
  assert(nav.back() === false && nav.current === "city", "city has no back");
  nav.openChild("goal7");
  nav.openChild("mainline");
  assert(nav.current === "mainline" && stack.depth === 3, "goal jump stacks mainline");
  assert(nav.back() && nav.current === "goal7", "back from mainline to goals");
  nav.openChild("idle");
  assert(nav.back() && nav.current === "goal7", "back from idle to goals");
  nav.openChild("summon");
  assert(nav.rootTab === "summon" && nav.back() && nav.current === "goal7", "summon returns to goals");
}

function checkMainline(): void {
  const first = listStages(1);
  assert(first.length === 6 && first[0].stageId === 1 && first[0].state === "current", "stage 1 window");
  assert(first[1].state === "locked" && first[5].stageId === 6, "later stages locked");
  const second = listStages(2);
  assert(second[0].state === "cleared" && second[1].state === "current" && second[2].state === "locked", "stage 2 window");
  const around = listStages(70);
  assert(around[0].stageId === 68 && around[0].state === "cleared", "stage 70 lookback");
  assert(around[2].stageId === 70 && around[2].state === "current" && around[3].state === "locked", "stage 70 current");
  assert(challengeBlock(1, 1) === null && challengeBlock(70, 70) === null, "current stage can enter");
  assert(challengeBlock(2, 1) === "请先通关第1关", "skip blocked");
  assert(challengeBlock(1, 3) === "第1关已通关", "cleared blocked");

  const win = planBattle({ stageId: 1, level: 1, roleName: "MockHero" });
  assert(win.win && win.reason === "clear" && win.rounds.length === 4, "stage 1 script");
  assert(win.rounds[0].allies[0].name === "MockHero" && win.rounds[0].line.indexOf("突进") >= 0, "ally name");
  const last = win.rounds[win.rounds.length - 1];
  let enemiesDead = true;
  let allyAlive = false;
  for (let i = 0; i < last.enemies.length; i++) if (last.enemies[i].hp !== 0) enemiesDead = false;
  for (let i = 0; i < last.allies.length; i++) if (last.allies[i].hp > 0) allyAlive = true;
  assert(enemiesDead && allyAlive && last.actor === "ally", "win wipes enemies");

  for (let stage = 1; stage <= 70; stage++) {
    const plan = planBattle({ stageId: stage, level: stage, roleName: "MockHero" });
    assert(plan.win && plan.reason === "clear", "stage " + stage + " winnable at the same level");
  }
  const ahead = planBattle({ stageId: 80, level: 70, roleName: "MockHero" });
  assert(!ahead.win && ahead.reason === "overreach", "overreach loses");
  const aheadLast = ahead.rounds[ahead.rounds.length - 1];
  let alliesDead = true;
  let enemyAlive = false;
  for (let i = 0; i < aheadLast.allies.length; i++) if (aheadLast.allies[i].hp !== 0) alliesDead = false;
  for (let i = 0; i < aheadLast.enemies.length; i++) if (aheadLast.enemies[i].hp > 0) enemyAlive = true;
  assert(alliesDead && enemyAlive, "overreach wipes allies");
  const fled = planBattle({ stageId: 4, level: 4, roleName: "MockHero", retreat: true });
  assert(!fled.win && fled.reason === "retreat" && fled.rounds[0].line.indexOf("撤退") >= 0, "retreat loses");
  assert(loseToast(4) === "第4关挑战失败，进度不变", "lose toast");
  assert(winToast(1, [{ id: 1, count: 10 }]) === "第1关胜利，金币 +10", "win toast");
  assert(rewardLines([])[0] === "没有奖励" && rewardLines([{ id: 2, count: 3 }])[0] === "钻石 +3", "reward lines");

  const prevAccount = Session.account;
  const prevRole = Session.role;
  const prevDay = Session.openDay;
  const prevStage = Session.stageId;
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  Session.role = { roleId: 1, name: "甲", level: 1 };
  Session.stageId = 1;
  Session.openDay = 1;
  Session.gold = 5;
  Session.diamond = 2;
  applyStageProgress({
    ok: true,
    stageId: 1,
    win: true,
    nextStageId: 2,
    rewards: [
      { id: 1, count: 10 },
      { id: 2, count: 3 },
    ],
    level: 2,
  });
  assert(Session.stageId === 2 && Session.role.level === 2 && Session.gold === 15 && Session.diamond === 5, "fallback wallet");
  applyStageProgress({
    ok: false,
    stageId: 9,
    win: true,
    nextStageId: 9,
    rewards: [{ id: 1, count: 100 }],
    gold: 999,
    level: 9,
    code: ErrorCode.STAGE_ID_INVALID,
  });
  assert(Session.stageId === 2 && Session.gold === 15 && Session.role.level === 2, "failed result ignored");

  const mock = new MockGameSession();
  Session.role = { roleId: mock.role.roleId, name: mock.role.name, level: mock.role.level };
  Session.stageId = mock.stageId;
  Session.openDay = mock.openDay;
  Session.gold = mock.gold;
  Session.diamond = mock.diamond;
  for (let stage = 1; stage <= 70; stage++) {
    const plan = planBattle({ stageId: stage, level: stage, roleName: mock.role.name });
    const entered = mock.stageEnter({ stageId: stage });
    assert(entered.ok && plan.win, "push enter " + stage);
    const result = mock.stageResult({ stageId: stage, battleId: entered.battleId, win: plan.win });
    applyStageProgress(result);
  }
  assert(Session.stageId === 71 && Session.role.level === 71, "cleared through 70");
  assert(Session.gold === MOCK_STARTER_GOLD + 700 && Session.diamond === MOCK_STARTER_DIAMOND, "gold through 70");
  assert(Session.openDay === 15, "open day through 70");
  const lost = mock.stageResult({ stageId: 71, win: false });
  applyStageProgress(lost);
  assert(Session.stageId === 71 && Session.role.level === 71 && Session.gold === MOCK_STARTER_GOLD + 700, "loss after 70 stays");
  assert(mock.stageId === 71 && mock.clearedStage === 70 && mock.gold === MOCK_STARTER_GOLD + 700, "mock stays at 70");

  Session.account = prevAccount;
  Session.role = prevRole;
  Session.openDay = prevDay;
  Session.stageId = prevStage;
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
}

function checkIdleMath(): void {
  const fresh = buildIdleView(0, 0);
  assert(fresh.pendingGold === 0 && fresh.pendingItem === 0 && fresh.capped === false, "zero idle");
  assert(fresh.goldPerMin === 6 && fresh.itemEveryMs === 30000 && fresh.capMs === IDLE_CAP_MS, "base rates");
  const tenSec = buildIdleView(10000, 0);
  assert(tenSec.pendingGold === 1 && tenSec.pendingItem === 0, "10s is 1 gold");
  const halfMin = buildIdleView(30000, 0);
  assert(halfMin.pendingGold === 3 && halfMin.pendingItem === 1, "30s gold and stone");
  const progressed = buildIdleView(60000, 5);
  assert(progressed.goldPerMin === 26 && progressed.pendingGold === 26, "five clears raise gold");
  assert(progressed.itemEveryMs === 25000 && progressed.pendingItem === 2, "five clears raise stones");
  const over = buildIdleView(IDLE_CAP_MS + 60000, 0);
  assert(over.capped && over.elapsedMs === IDLE_CAP_MS, "cap clamps elapsed");
  assert(over.pendingGold === 8 * 60 * 6 && over.pendingItem === Math.floor(IDLE_CAP_MS / 30000), "cap rewards");
  assert(over.pendingGold === over.capGold && over.pendingItem === buildIdleView(IDLE_CAP_MS, 0).pendingItem, "capped matches full window");
  const bad = buildIdleView(Number.NaN, -3);
  assert(bad.pendingGold === 0 && bad.goldPerMin === 6 && bad.capped === false, "bad input");
  assert(formatDuration(0) === "00:00:00" && formatDuration(IDLE_CAP_MS) === "08:00:00", "duration format");
  assert(formatDuration(3661000) === "01:01:01", "duration hms");
  assert(formatItemEvery(30000) === "每 30 秒 1 个", "item every seconds");
  assert(formatItemEvery(120000) === "每 2 分钟 1 个", "item every minutes");
  assert(claimToast(0, 0) === "暂无收益", "empty claim toast");
  assert(claimToast(3, 1) === "领取成功：金币 +3，强化石 +1", "claim toast");
  assert(quickStageIds(4, 1).join(",") === "4", "one quick stage");
  assert(quickStageIds(4, 3).join(",") === "4,5,6", "three quick stages");
  assert(quickToast(1, 2, [{ id: 1, count: 10 }]) === "快速作战：第1关胜利，金币 +10，下一关 2", "quick toast");
  assert(quickBatchToast(1, 3, 4, 30) === "快速作战：第1关至第3关胜利，金币 +30，下一关 4", "batch toast");
  assert(capPreviewLine(2880, 960).indexOf("金币 2880") >= 0 && capPreviewLine(2880, 960).indexOf("强化石 960") >= 0, "cap line");
  assert(errorText(ErrorCode.IDLE_EMPTY) === "挂机时间太短，暂无收益", "empty idle text");
}

async function checkIdleSession(): Promise<void> {
  let now = 1700000000000;
  const session = new MockGameSession(undefined, () => now);
  const anchor = session.idleAnchorMs;
  const empty = session.idleQuery();
  assert(empty.ok && empty.pendingGold === 0 && empty.pendingItem === 0 && empty.ownedItem === 0, "fresh query");
  assert(empty.capGold === 8 * 60 * 6 && empty.gold === MOCK_STARTER_GOLD && empty.diamond === MOCK_STARTER_DIAMOND, "cap preview");
  const rejected = session.idleClaim();
  assert(rejected.ok === false && rejected.code === ErrorCode.IDLE_EMPTY && session.gold === MOCK_STARTER_GOLD, "empty claim");
  assert(session.idleAnchorMs === anchor && session.diamond === MOCK_STARTER_DIAMOND, "empty claim keeps clock and diamond");

  now += 30000;
  const ready = session.idleQuery();
  assert(ready.pendingGold === 3 && ready.pendingItem === 1 && ready.capped === false, "30s preview");
  const claimed = session.idleClaim();
  assert(claimed.ok && claimed.gold === MOCK_STARTER_GOLD + 3 && claimed.diamond === MOCK_STARTER_DIAMOND, "claim gold");
  assert(claimed.ownedItem === 1 && claimed.rewards.length === 2 && session.idleAnchorMs === now, "claim stone and reset");
  assert(claimed.rewards[0].name === "金币" && claimed.rewards[1].id === IDLE_ITEM_ID, "claim reward names");
  const again = session.idleClaim();
  assert(again.ok === false && session.gold === MOCK_STARTER_GOLD + 3 && session.itemCounts[IDLE_ITEM_ID] === 1, "second claim empty");

  now += 30000;
  const beforeQuick = session.idleAnchorMs;
  const entered = session.stageEnter({ stageId: session.stageId });
  const won = session.stageResult({ stageId: entered.stageId, battleId: entered.battleId, win: true });
  assert(won.ok && won.win && won.nextStageId === 2 && session.clearedStage === 1, "quick settle advances");
  assert(session.idleAnchorMs === beforeQuick && session.gold === MOCK_STARTER_GOLD + 13, "stage win keeps idle clock");
  const after = session.idleQuery();
  assert(after.goldPerMin === 10 && after.pendingGold === 5 && after.clearedStage === 1, "progress reprices the same window");
  assert(after.pendingItem === 1 && after.capGold === 8 * 60 * 10 && after.ownedItem === 1, "higher cap after one clear");

  now += IDLE_CAP_MS + 120000;
  const capped = session.idleQuery();
  assert(capped.capped && capped.elapsedMs === IDLE_CAP_MS && capped.pendingGold === capped.capGold, "over cap");
  const walletBeforeCap = session.gold;
  const capClaim = session.idleClaim();
  assert(capClaim.ok && session.idleAnchorMs === now && session.gold === walletBeforeCap + capped.pendingGold, "cap claim");
  assert(session.diamond === MOCK_STARTER_DIAMOND, "idle never adds diamond");

  session.roleCreate({ name: "新人" });
  assert(session.gold === MOCK_STARTER_GOLD && session.clearedStage === 0 && session.itemCounts[IDLE_ITEM_ID] === undefined, "create clears stones");
  assert(session.idleAnchorMs === now && session.idleQuery().pendingGold === 0, "create restarts idle");

  const seeded = new MockGameSession(
    { clearedStage: 2, idleAnchorMs: now - 60000, items: [{ id: IDLE_ITEM_ID, count: 4 }, { id: 9, count: 0 }] },
    () => now
  );
  const seededView = seeded.idleQuery();
  assert(seededView.ownedItem === 4 && seededView.pendingGold === 14 && seededView.pendingItem === 2, "seeded idle");
  assert(seeded.role.level === 3 && seeded.stageId === 3, "seed still derives stage");

  const net = quietNet(new MockTransport({ latencyMs: 5, session: seeded }));
  await net.connect("mock://local");
  const remote = await Proto.idleQuery({}, net);
  assert(remote.ok && remote.pendingGold === 14 && remote.ownedItem === 4 && remote.itemName === "强化石", "proto query");
  const remoteClaim = await Proto.idleClaim({}, net);
  assert(remoteClaim.ok && remoteClaim.gold === MOCK_STARTER_GOLD + 14 && remoteClaim.ownedItem === 6, "proto claim");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applyIdleClaim(remoteClaim);
  assert(Session.gold === remoteClaim.gold && Session.diamond === remoteClaim.diamond, "apply claim");
  applyIdleClaim({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteClaim.gold && Session.diamond === remoteClaim.diamond, "failed claim ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  const afterClaim = await Proto.idleQuery({}, net);
  assert(afterClaim.pendingGold === 0 && afterClaim.ownedItem === 6, "proto query after claim");
  const ids = P0_CMDS.filter((row) => row.cmd === Cmd.idleQuery || row.cmd === Cmd.idleClaim).map((row) => row.id);
  assert(ids.length === 2 && ids[0] === 1301 && ids[1] === 1302, "idle cmd ids");
  net.close();
}

async function checkHero(): Promise<void> {
  const starters = starterRoster();
  assert(starters.length === 3 && starters[0].name === "光耀骑士" && starters[2].star === 1, "starter names");
  assert(upgradeCost(1) === 30 && upgradeCost(2) === 50 && upgradeCost(HERO_MAX_LEVEL) === 0, "upgrade cost");
  const star3 = heroStats(1, 3);
  assert(star3.atk === 70 && star3.hp === 320 && star3.def === 20, "star 3 stats");
  assert(heroStats(2, 3).atk === 82 && heroStats(1, 1).atk === 40, "level raises attack");
  assert(heroRowText("光耀骑士", 1, 3) === "光耀骑士  Lv1 · 3星", "row text");
  assert(upgradeButtonText(1) === "升级（金币 30）" && upgradeButtonText(HERO_MAX_LEVEL) === "已满级", "upgrade button");
  assert(upgradeToast("光耀骑士", 2, 30) === "光耀骑士升至 Lv2，消耗金币 30", "upgrade toast");
  assert(goldShortToast(70) === "金币不足，升级需要 70", "gold short toast");
  assert(maxLevelToast() === "已达最高等级", "max toast");
  assert(errorText(ErrorCode.HERO_NOT_FOUND) === "没有这名英雄", "missing hero text");
  assert(errorText(ErrorCode.HERO_GOLD_SHORT) === "金币不足，无法升级", "gold short text");
  assert(errorText(ErrorCode.HERO_LEVEL_MAX) === "已达最高等级", "max level text");

  const fresh = new MockGameSession();
  const listed = fresh.heroList();
  assert(listed.ok && listed.heroes.length === 3 && listed.gold === MOCK_STARTER_GOLD, "default roster");
  assert(listed.heroes[0].id === 10001 && listed.heroes[0].level === 1 && listed.heroes[0].star === 3, "first starter");
  assert(listed.heroes[0].atk === 70 && listed.heroes[1].name === "林间游侠" && listed.heroes[2].star === 1, "roster order");
  const anchor = fresh.idleAnchorMs;
  const diamond = fresh.diamond;
  const first = fresh.heroUpgrade({ heroId: 10001 });
  assert(first.ok && first.cost === 30 && first.hero && first.hero.level === 2 && first.hero.star === 3, "first upgrade");
  assert(first.hero.atk === 82 && first.gold === MOCK_STARTER_GOLD - 30 && fresh.diamond === diamond, "upgrade spends gold only");
  assert(fresh.idleAnchorMs === anchor && fresh.stageId === 1 && fresh.heroes[1].level === 1, "upgrade leaves idle and other heroes");
  const second = fresh.heroUpgrade({ heroId: 10001 });
  assert(second.ok && second.cost === 50 && second.hero && second.hero.level === 3 && fresh.gold === MOCK_STARTER_GOLD - 80, "second upgrade");
  const broke = fresh.heroUpgrade({ heroId: 10001 });
  assert(broke.ok === false && broke.code === ErrorCode.HERO_GOLD_SHORT && broke.needGold === 70, "third upgrade short");
  assert(fresh.gold === MOCK_STARTER_GOLD - 80 && fresh.heroes[0].level === 3 && broke.hero && broke.hero.level === 3, "short keeps level");
  const missing = fresh.heroUpgrade({ heroId: 999 });
  assert(missing.ok === false && missing.code === ErrorCode.HERO_NOT_FOUND && missing.hero === null && fresh.gold === MOCK_STARTER_GOLD - 80, "unknown hero");
  const beforeStage = fresh.gold;
  const entered = fresh.stageEnter({ stageId: 1 });
  const won = fresh.stageResult({ stageId: 1, battleId: entered.battleId, win: true });
  assert(won.ok && won.gold === beforeStage + 10 && fresh.heroes[0].level === 3, "stage gold stacks on upgrade");
  fresh.roleCreate({ name: "新人" });
  assert(fresh.role.name === "新人" && fresh.gold === MOCK_STARTER_GOLD && fresh.heroes[0].level === 1 && fresh.heroes.length === 3, "create resets roster");

  const other = new MockGameSession();
  assert(other.heroes[0].level === 1 && other.gold === MOCK_STARTER_GOLD, "sessions do not share roster");
  const rich = new MockGameSession({ gold: 1000 });
  assert(rich.heroes.length === 3 && rich.gold === 1000, "wallet seed keeps starters");
  const custom = new MockGameSession({ heroes: [{ id: 8, name: "单人", level: 2, star: 4 }] });
  assert(custom.heroes.length === 1 && custom.heroList().heroes[0].atk === heroStats(2, 4).atk && custom.heroList().heroes[0].star === 4, "custom roster");
  const dup = new MockGameSession({
    heroes: [
      { id: 4, name: "甲", level: 2, star: 2 },
      { id: 4, name: "乙", level: 9, star: 9 },
      { id: 5, name: "丙" },
    ],
  });
  assert(dup.heroes.length === 2 && dup.heroes[0].name === "甲" && dup.heroes[1].name === "丙" && dup.heroes[1].star === 1, "duplicate id skipped");
  const blank = new MockGameSession({ heroes: [{ id: 1, name: " " }, { id: 0, name: "坏" }] });
  assert(blank.heroes.length === 3 && blank.heroes[0].name === "光耀骑士", "bad seed uses starters");
  const empty = new MockGameSession({ heroes: [] });
  assert(empty.heroes.length === 3, "empty seed uses starters");
  const maxed = new MockGameSession({ gold: 500, heroes: [{ id: 7, name: "满级", level: 99, star: 9 }] });
  assert(maxed.heroes[0].level === HERO_MAX_LEVEL && maxed.heroes[0].star === 5, "seed clamps level and star");
  const denied = maxed.heroUpgrade({ heroId: 7 });
  assert(denied.ok === false && denied.code === ErrorCode.HERO_LEVEL_MAX && maxed.gold === 500 && maxed.heroes[0].level === HERO_MAX_LEVEL, "max level");

  const net = quietNet(new MockTransport({ latencyMs: 5 }));
  await net.connect("mock://local");
  const remote = await Proto.heroList({}, net);
  assert(remote.ok && remote.heroes.length === 3 && remote.heroes[0].name === "光耀骑士", "proto list");
  const remoteUp = await Proto.heroUpgrade({ heroId: remote.heroes[0].id }, net);
  assert(remoteUp.ok && remoteUp.hero && remoteUp.hero.level === 2 && remoteUp.cost === 30 && remoteUp.gold === MOCK_STARTER_GOLD - 30, "proto upgrade");
  const again = await Proto.heroList({}, net);
  assert(again.heroes[0].level === 2 && again.heroes[1].level === 1 && again.gold === remoteUp.gold, "proto list after upgrade");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applyHeroUpgrade(remoteUp);
  assert(Session.gold === remoteUp.gold && Session.diamond === remoteUp.diamond, "apply upgrade");
  applyHeroUpgrade({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteUp.gold && Session.diamond === remoteUp.diamond, "failed upgrade ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  const poor = new MockGameSession({ gold: 10 });
  const poorNet = quietNet(new MockTransport({ latencyMs: 5, session: poor }));
  await poorNet.connect("mock://local");
  const poorUp = await Proto.heroUpgrade({ heroId: 10001 }, poorNet);
  assert(poorUp.ok === false && poorUp.code === ErrorCode.HERO_GOLD_SHORT && poorUp.needGold === 30 && poor.gold === 10 && poor.heroes[0].level === 1, "proto short");
  const ids = P0_CMDS.filter((row) => row.cmd === Cmd.heroList || row.cmd === Cmd.heroUpgrade).map((row) => row.id);
  assert(ids.length === 2 && ids[0] === 1401 && ids[1] === 1402, "hero cmd ids");
  net.close();
  poorNet.close();
}

async function checkSummon(): Promise<void> {
  assert(summonCost(1) === SUMMON_SINGLE_COST && summonCost(10) === SUMMON_TEN_COST && summonCost(2) === 0, "summon cost");
  assert(shardItemId(10001) === SUMMON_SHARD_BASE + 10001, "shard item id");
  assert(summonToast({ count: 1, drops: [{ heroId: 10004, name: "霜刃刺客", star: 2, kind: "new", shardId: 50004, shardGain: 0, shardOwned: 0 }], newCount: 1, shardCount: 0 }) === "召唤成功，获得霜刃刺客", "new toast");
  assert(
    summonToast({
      count: 1,
      drops: [{ heroId: 10001, name: "光耀骑士", star: 3, kind: "shard", shardId: 50001, shardGain: 10, shardOwned: 10 }],
      newCount: 0,
      shardCount: 1,
    }) === "召唤成功，光耀骑士已拥有，转化为碎片 ×10",
    "shard toast"
  );
  assert(summonToast({ count: 10, drops: [], newCount: 5, shardCount: 5 }) === "十连完成，新英雄 5，碎片 5", "ten toast");
  assert(diamondShortToast(1, 10) === "钻石不足，召唤需要 10" && diamondShortToast(10, 90) === "钻石不足，十连需要 90", "diamond short toast");
  assert(errorText(ErrorCode.SUMMON_DIAMOND_SHORT) === "钻石不足，无法召唤", "diamond short text");
  assert(errorText(ErrorCode.SUMMON_COUNT_INVALID) === "召唤次数无效", "bad count text");
  assert(summonResultText([]) === "还没有召唤。新英雄会进入英雄列表", "empty result");

  const fresh = new MockGameSession();
  const anchor = fresh.idleAnchorMs;
  const gold = fresh.gold;
  const first = fresh.summon({ count: 1 });
  assert(first.ok && first.cost === SUMMON_SINGLE_COST && first.diamond === MOCK_STARTER_DIAMOND - SUMMON_SINGLE_COST, "single spends diamond");
  assert(first.newCount === 1 && first.shardCount === 0 && first.drops.length === 1 && first.drops[0].kind === "new", "first drop is new");
  assert(first.drops[0].heroId === 10004 && first.drops[0].name === "霜刃刺客" && first.drops[0].star === 2, "first hero frost");
  assert(fresh.heroes.length === 4 && fresh.heroes[3].id === 10004 && fresh.heroes[3].level === 1 && fresh.heroes[0].level === 1, "roster appends new hero");
  assert(fresh.gold === gold && fresh.idleAnchorMs === anchor && fresh.stageId === 1 && fresh.summonCursor === 1, "summon leaves gold idle and stage");
  const second = fresh.summon({ count: 1 });
  assert(second.ok && second.drops[0].kind === "shard" && second.drops[0].heroId === 10001 && second.drops[0].shardGain === SUMMON_SHARD_GAIN, "second is dupe shard");
  assert(second.drops[0].shardOwned === SUMMON_SHARD_GAIN && fresh.itemCounts[shardItemId(10001)] === SUMMON_SHARD_GAIN, "shard stored");
  assert(fresh.heroes.length === 4 && fresh.heroes[0].star === 3 && fresh.heroes[0].level === 1 && fresh.diamond === 0 && fresh.summonCursor === 2, "dupe does not change roster");
  const broke = fresh.summon({ count: 1 });
  assert(broke.ok === false && broke.code === ErrorCode.SUMMON_DIAMOND_SHORT && broke.needDiamond === SUMMON_SINGLE_COST && broke.drops.length === 0, "third single short");
  assert(fresh.diamond === 0 && fresh.summonCursor === 2 && fresh.heroes.length === 4 && fresh.gold === gold, "short keeps cursor and wallet");
  const tenShort = fresh.summon({ count: 10 });
  assert(tenShort.ok === false && tenShort.code === ErrorCode.SUMMON_DIAMOND_SHORT && tenShort.needDiamond === SUMMON_TEN_COST && fresh.summonCursor === 2, "ten short on empty wallet");
  const bad = new MockGameSession();
  const invalid = bad.summon({ count: 2 });
  assert(invalid.ok === false && invalid.code === ErrorCode.SUMMON_COUNT_INVALID && bad.diamond === MOCK_STARTER_DIAMOND && bad.summonCursor === 0 && bad.heroes.length === 3, "bad count");

  const rich = new MockGameSession({ diamond: SUMMON_TEN_COST });
  const ten = rich.summon({ count: 10 });
  assert(ten.ok && ten.cost === SUMMON_TEN_COST && ten.newCount === 5 && ten.shardCount === 5 && ten.drops.length === 10, "ten pull mix");
  assert(rich.diamond === 0 && rich.gold === MOCK_STARTER_GOLD && rich.heroes.length === 8 && rich.summonCursor === 10, "ten spends only diamond");
  assert(ten.drops[0].kind === "new" && ten.drops[1].kind === "shard" && ten.drops[8].kind === "shard" && ten.drops[8].heroId === 10004, "pool wraps onto the new hero");
  assert(rich.itemCounts[shardItemId(10001)] === SUMMON_SHARD_GAIN * 2 && ten.drops[9].shardOwned === SUMMON_SHARD_GAIN * 2, "same dupe stacks shards");
  const upgraded = rich.heroUpgrade({ heroId: 10004 });
  assert(upgraded.ok && upgraded.hero && upgraded.hero.level === 2 && rich.heroes[0].level === 1 && rich.summonCursor === 10 && rich.diamond === 0, "new hero can upgrade");
  rich.roleCreate({ name: "新人" });
  assert(rich.heroes.length === 3 && rich.heroes[0].name === "光耀骑士" && rich.summonCursor === 0 && rich.diamond === MOCK_STARTER_DIAMOND, "create resets summon");
  assert(rich.itemCounts[shardItemId(10001)] === undefined && rich.gold === MOCK_STARTER_GOLD, "create clears shards");

  const shifted = new MockGameSession({ summonCursor: 1, heroes: [{ id: 10004, name: "霜刃刺客", level: 1, star: 2 }] });
  const shiftedPull = shifted.summon({ count: 1 });
  assert(shiftedPull.ok && shiftedPull.drops[0].kind === "new" && shiftedPull.drops[0].heroId === 10001 && shifted.heroes.length === 2, "cursor seed skips first card");

  const net = quietNet(new MockTransport({ latencyMs: 5 }));
  await net.connect("mock://local");
  const remote = await Proto.summonPull({ count: 1 }, net);
  assert(remote.ok && remote.drops[0].name === "霜刃刺客" && remote.diamond === MOCK_STARTER_DIAMOND - SUMMON_SINGLE_COST, "proto single");
  const listed = await Proto.heroList({}, net);
  assert(listed.heroes.length === 4 && listed.heroes[3].id === 10004 && listed.heroes[3].level === 1 && listed.diamond === remote.diamond, "list includes summoned hero");
  const again = await Proto.summonPull({ count: 1 }, net);
  assert(again.ok && again.drops[0].kind === "shard" && again.diamond === 0, "proto second shard");
  const short = await Proto.summonPull({ count: 10 }, net);
  assert(short.ok === false && short.code === ErrorCode.SUMMON_DIAMOND_SHORT && short.needDiamond === SUMMON_TEN_COST, "proto ten short");
  const still = await Proto.heroList({}, net);
  assert(still.heroes.length === 4 && still.heroes[0].level === 1 && still.diamond === 0, "failed ten leaves roster");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applySummon(remote);
  assert(Session.gold === remote.gold && Session.diamond === remote.diamond, "apply summon");
  applySummon({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remote.gold && Session.diamond === remote.diamond, "failed summon ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  const ids = P0_CMDS.filter((row) => row.cmd === Cmd.summonPull).map((row) => row.id);
  assert(ids.length === 1 && ids[0] === 1501, "summon cmd id");
  net.close();
}

async function checkBag(): Promise<void> {
  assert(GOLD_BAG_GAIN === 50 && EXP_POTION_GAIN === 100 && EXP_PER_LEVEL === 100, "bag amounts");
  assert(bagRowText({ id: ITEM_GOLD_BAG, name: "小金币袋", count: 2, kind: "consumable", usable: true, desc: "" }) === "小金币袋 ×2 · 可使用", "bag row");
  assert(bagUseToast({ ok: true, id: ITEM_GOLD_BAG, name: "小金币袋", spent: 1, owned: 1, gold: 150, diamond: 20, goldGain: 50 }) === "使用成功：金币 +50", "gold toast");
  assert(
    bagUseToast({
      ok: true,
      id: ITEM_EXP_POTION,
      name: "经验药水",
      spent: 1,
      owned: 1,
      gold: 100,
      diamond: 20,
      heroName: "光耀骑士",
      heroLevel: 2,
      expGain: 100,
      leveled: true,
    }) === "使用成功：光耀骑士升至 Lv2",
    "exp toast"
  );
  assert(emptyBagToast() === "背包是空的" && notEnoughToast() === "数量不足", "empty and short text");
  assert(notUsableTip("material", "强化石") === "强化石不能直接使用", "stone tip");
  assert(notUsableTip("fragment", "光耀骑士碎片") === "英雄碎片不能直接使用", "shard tip");
  assert(errorText(ErrorCode.BAG_EMPTY) === "背包是空的", "empty code text");
  assert(errorText(ErrorCode.BAG_NOT_FOUND) === "没有这个道具", "missing item text");
  assert(errorText(ErrorCode.BAG_NOT_ENOUGH) === "数量不足", "not enough text");
  assert(errorText(ErrorCode.BAG_NOT_USABLE) === "该道具不能直接使用", "not usable text");
  assert(errorText(ErrorCode.BAG_COUNT_INVALID) === "使用数量无效", "bad count text");
  assert(errorText(ErrorCode.BAG_HERO_MAX) === "英雄已满级，无法使用", "hero max text");
  const stepped = applyHeroExp(1, 0, 100, HERO_MAX_LEVEL);
  assert(stepped.level === 2 && stepped.exp === 0 && stepped.leveled, "exp levels once");
  const capped = applyHeroExp(HERO_MAX_LEVEL, 0, 100, HERO_MAX_LEVEL);
  assert(capped.level === HERO_MAX_LEVEL && capped.leveled === false, "exp at max stays");

  const fresh = new MockGameSession();
  const anchor = fresh.idleAnchorMs;
  const listed = fresh.bagList();
  assert(listed.ok && listed.items.length === 3 && listed.gold === MOCK_STARTER_GOLD, "starter bag");
  assert(listed.items[0].id === ITEM_GOLD_BAG && listed.items[0].count === STARTER_GOLD_BAG && listed.items[0].usable, "gold bags first");
  assert(listed.items[1].id === ITEM_EXP_POTION && listed.items[1].count === STARTER_EXP_POTION && listed.items[1].name === "经验药水", "potions second");
  assert(listed.items[2].id === ITEM_WISH_TOKEN && listed.items[2].count === STARTER_WISH_TOKEN && listed.items[2].usable === false, "wish tokens third");
  const goldUse = fresh.bagUse({ id: ITEM_GOLD_BAG, count: 1 });
  assert(goldUse.ok && goldUse.goldGain === GOLD_BAG_GAIN && goldUse.spent === 1 && goldUse.owned === 1, "use one gold bag");
  assert(fresh.gold === MOCK_STARTER_GOLD + GOLD_BAG_GAIN && fresh.diamond === MOCK_STARTER_DIAMOND, "gold bag adds gold only");
  assert(fresh.heroes[0].level === 1 && fresh.idleAnchorMs === anchor && fresh.stageId === 1 && fresh.summonCursor === 0, "gold bag leaves hero idle and summon");
  const expUse = fresh.bagUse({ id: ITEM_EXP_POTION });
  assert(expUse.ok && expUse.leveled && expUse.heroName === "光耀骑士" && expUse.heroLevel === 2 && expUse.expGain === EXP_POTION_GAIN, "potion levels lead");
  assert(fresh.heroes[0].level === 2 && fresh.heroes[1].level === 1 && fresh.heroes[0].star === 3, "only lead hero levels");
  assert(fresh.gold === MOCK_STARTER_GOLD + GOLD_BAG_GAIN && fresh.itemCounts[ITEM_EXP_POTION] === 1, "potion does not spend gold");
  const upgraded = fresh.heroUpgrade({ heroId: 10001 });
  assert(upgraded.ok && upgraded.cost === 50 && upgraded.hero && upgraded.hero.level === 3 && fresh.gold === MOCK_STARTER_GOLD + GOLD_BAG_GAIN - 50, "gold upgrade follows potion level");
  const missing = fresh.bagUse({ id: 999 });
  assert(missing.ok === false && missing.code === ErrorCode.BAG_NOT_FOUND && fresh.gold === MOCK_STARTER_GOLD + GOLD_BAG_GAIN - 50, "unknown item");
  const badCount = fresh.bagUse({ id: ITEM_GOLD_BAG, count: 0 });
  assert(badCount.ok === false && badCount.code === ErrorCode.BAG_COUNT_INVALID && fresh.itemCounts[ITEM_GOLD_BAG] === 1, "zero count");
  const tooMany = fresh.bagUse({ id: ITEM_GOLD_BAG, count: 5 });
  assert(tooMany.ok === false && tooMany.code === ErrorCode.BAG_NOT_ENOUGH && tooMany.need === 5 && fresh.itemCounts[ITEM_GOLD_BAG] === 1, "not enough bags");
  fresh.bagUse({ id: ITEM_GOLD_BAG, count: 1 });
  fresh.bagUse({ id: ITEM_EXP_POTION, count: 1 });
  assert(fresh.itemCounts[ITEM_GOLD_BAG] === undefined && fresh.itemCounts[ITEM_EXP_POTION] === undefined, "consumables removed at zero");
  assert(fresh.heroes[0].level === 4, "second potion levels again");
  fresh.roleCreate({ name: "新人" });
  assert(fresh.role.name === "新人" && fresh.gold === MOCK_STARTER_GOLD && fresh.heroes[0].level === 1, "create resets wallet and hero");
  assert(
    fresh.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG &&
      fresh.itemCounts[ITEM_EXP_POTION] === STARTER_EXP_POTION &&
      fresh.itemCounts[ITEM_WISH_TOKEN] === STARTER_WISH_TOKEN,
    "create restores consumables"
  );
  assert(fresh.itemCounts[IDLE_ITEM_ID] === undefined, "create still clears stones");

  const seeded = new MockGameSession({
    items: [
      { id: IDLE_ITEM_ID, count: 3 },
      { id: shardItemId(10001), count: SUMMON_SHARD_GAIN },
      { id: 9, count: 0 },
    ],
  });
  assert(seeded.itemCounts[ITEM_GOLD_BAG] === undefined && seeded.bagList().items.length === 2, "seed skips starters");
  const stone = seeded.bagList().items[0];
  const frag = seeded.bagList().items[1];
  assert(stone.id === IDLE_ITEM_ID && stone.name === "强化石" && stone.kind === "material" && stone.usable === false && stone.count === 3, "stone listed");
  assert(frag.kind === "fragment" && frag.name === "光耀骑士碎片" && frag.usable === false && frag.count === SUMMON_SHARD_GAIN, "shard listed");
  const stoneUse = seeded.bagUse({ id: IDLE_ITEM_ID });
  assert(stoneUse.ok === false && stoneUse.code === ErrorCode.BAG_NOT_USABLE && bagFailToast(stoneUse) === "强化石不能直接使用", "stone tip from use");
  assert(seeded.itemCounts[IDLE_ITEM_ID] === 3 && seeded.gold === MOCK_STARTER_GOLD, "stone use changes nothing");
  const fragUse = seeded.bagUse({ id: shardItemId(10001), count: 1 });
  assert(fragUse.ok === false && fragUse.code === ErrorCode.BAG_NOT_USABLE && bagFailToast(fragUse) === "英雄碎片不能直接使用", "shard tip from use");
  assert(seeded.itemCounts[shardItemId(10001)] === SUMMON_SHARD_GAIN, "shard use changes nothing");
  const shortStone = seeded.bagUse({ id: IDLE_ITEM_ID, count: 9 });
  assert(shortStone.ok === false && shortStone.code === ErrorCode.BAG_NOT_ENOUGH && seeded.itemCounts[IDLE_ITEM_ID] === 3, "short stone");

  const empty = new MockGameSession({ items: [] });
  assert(empty.bagList().items.length === 0, "empty list");
  const emptyUse = empty.bagUse({ id: ITEM_GOLD_BAG });
  assert(emptyUse.ok === false && emptyUse.code === ErrorCode.BAG_EMPTY && bagFailToast(emptyUse) === "背包是空的", "empty use");
  assert(empty.gold === MOCK_STARTER_GOLD && empty.heroes[0].level === 1, "empty use changes nothing");

  const maxed = new MockGameSession({
    heroes: [{ id: 10001, name: "光耀骑士", level: HERO_MAX_LEVEL, star: 3 }],
    items: [{ id: ITEM_EXP_POTION, count: 1 }],
  });
  const denied = maxed.bagUse({ id: ITEM_EXP_POTION });
  assert(denied.ok === false && denied.code === ErrorCode.BAG_HERO_MAX && bagFailToast(denied) === "光耀骑士已达最高等级，无法使用", "potion at max");
  assert(maxed.itemCounts[ITEM_EXP_POTION] === 1 && maxed.heroes[0].level === HERO_MAX_LEVEL && maxed.gold === MOCK_STARTER_GOLD, "max potion not consumed");

  const now = Date.now();
  const idle = new MockGameSession({ idleAnchorMs: now - 60000 });
  const claimed = idle.idleClaim();
  assert(claimed.ok && claimed.ownedItem === 2, "idle still grants stones");
  const afterIdle = idle.bagList().items;
  const ownedStone = afterIdle.filter((item) => item.id === IDLE_ITEM_ID);
  const ownedBag = afterIdle.filter((item) => item.id === ITEM_GOLD_BAG);
  assert(ownedStone.length === 1 && ownedStone[0].count === 2 && ownedBag.length === 1 && ownedBag[0].count === STARTER_GOLD_BAG, "bag shows stones and starters");

  const summoner = new MockGameSession({ diamond: SUMMON_SINGLE_COST * 2 });
  const first = summoner.summon({ count: 1 });
  const second = summoner.summon({ count: 1 });
  assert(first.ok && first.drops[0].kind === "new" && second.ok && second.drops[0].kind === "shard", "summon still new then shard");
  const shardRow = summoner.bagList().items.filter((item) => item.id === shardItemId(10001));
  assert(shardRow.length === 1 && shardRow[0].count === SUMMON_SHARD_GAIN && shardRow[0].name === "光耀骑士碎片", "dupe shard is in the bag");
  assert(summoner.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG && summoner.heroes.length === 4, "summon keeps starter bags and roster");

  const net = quietNet(new MockTransport({ latencyMs: 5 }));
  await net.connect("mock://local");
  const remote = await Proto.bagList({}, net);
  assert(remote.ok && remote.items.length === 3 && remote.items[0].name === "小金币袋" && remote.items[2].name === WISH_TOKEN_NAME, "proto list");
  const remoteUse = await Proto.bagUse({ id: ITEM_GOLD_BAG, count: 1 }, net);
  assert(remoteUse.ok && remoteUse.gold === MOCK_STARTER_GOLD + GOLD_BAG_GAIN && remoteUse.owned === 1, "proto use");
  const again = await Proto.bagList({}, net);
  assert(again.items[0].count === 1 && again.gold === remoteUse.gold, "proto list after use");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applyBagUse(remoteUse);
  assert(Session.gold === remoteUse.gold && Session.diamond === remoteUse.diamond, "apply bag");
  applyBagUse({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteUse.gold && Session.diamond === remoteUse.diamond, "failed bag ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  const blocked = await Proto.bagUse({ id: IDLE_ITEM_ID, count: 1 }, net);
  assert(blocked.ok === false && blocked.code === ErrorCode.BAG_NOT_FOUND, "proto missing stone");
  const ids = P0_CMDS.filter((row) => row.cmd === Cmd.bagList || row.cmd === Cmd.bagUse).map((row) => row.id);
  assert(ids.length === 2 && ids[0] === 1601 && ids[1] === 1602, "bag cmd ids");
  net.close();
}

async function checkMail(): Promise<void> {
  assert(MAIL_REWARD_GOLD === 80 && MAIL_REWARD_STONE === 3 && MAIL_REWARD_GOLD_BAG === 1, "mail amounts");
  assert(
    mailRowText({ unread: true, title: "开服补给", hasAttachment: true, claimed: false }) === "未读 · 开服补给 · 有附件",
    "unread reward row"
  );
  assert(
    mailRowText({ unread: false, title: "开服补给", hasAttachment: true, claimed: true }) === "已读 · 开服补给 · 已领取",
    "claimed row"
  );
  assert(
    mailRowText({ unread: false, title: "维护公告", hasAttachment: false, claimed: false }) === "已读 · 维护公告",
    "notice row"
  );
  assert(mailSummaryText(3, 2, 1) === "3 封 · 未读 2 · 可领 1", "summary");
  assert(mailSummaryText(0, 0, 0) === "邮箱是空的" && emptyMailToast() === "邮箱是空的", "empty mail text");
  assert(pickMailToast() === "请先选择一封邮件", "pick mail");
  assert(claimButtonText(null) === "领取" && claimButtonText({ hasAttachment: false, claimed: false }) === "无附件", "claim labels");
  assert(claimButtonText({ hasAttachment: true, claimed: true }) === "已领取", "claimed label");
  assert(claimAllButtonText(1) === "全部领取（1）" && claimAllButtonText(0) === "全部领取", "claim all label");
  assert(deletedToast("维护公告") === "已删除：维护公告", "deleted text");
  assert(
    attachmentText({
      hasAttachment: true,
      claimed: false,
      attachments: [
        { id: 1, name: "金币", count: 80 },
        { id: 101, name: "强化石", count: 3 },
      ],
    }) === "附件：金币 ×80、强化石 ×3",
    "attachment line"
  );
  assert(attachmentText({ hasAttachment: false, claimed: false, attachments: [] }) === "这封邮件没有附件", "no attachment line");
  assert(
    mailClaimToast({
      count: 1,
      rewards: [
        { id: 1, name: "金币", count: 80 },
        { id: 101, name: "强化石", count: 3 },
        { id: 201, name: "小金币袋", count: 1 },
      ],
    }) === "领取成功：金币 +80、强化石 ×3、小金币袋 ×1",
    "claim toast"
  );
  assert(
    mailClaimToast({ count: 2, rewards: [{ id: 1, name: "金币", count: 15 }] }) === "领取成功：2 封，金币 +15",
    "claim all toast"
  );
  assert(mailFailToast({ code: ErrorCode.MAIL_NOT_FOUND }) === "没有这封邮件", "missing mail text");
  assert(mailFailToast({ code: ErrorCode.MAIL_NO_ATTACHMENT }) === "这封邮件没有附件", "no attachment text");
  assert(mailFailToast({ code: ErrorCode.MAIL_ALREADY_CLAIMED }) === "附件已经领取过了", "already claimed text");
  assert(mailFailToast({ code: ErrorCode.MAIL_NOTHING }) === "没有可领取的附件", "nothing text");
  assert(mailFailToast({ code: ErrorCode.MAIL_DELETE_BLOCKED }) === "请先领取附件再删除", "delete blocked text");
  assert(errorText(ErrorCode.MAIL_ALREADY_CLAIMED) === "附件已经领取过了", "already claimed code");

  const fresh = new MockGameSession();
  const anchor = fresh.idleAnchorMs;
  const listed = fresh.mailList();
  assert(listed.ok && listed.mails.length === 3 && listed.unread === 2 && listed.claimable === 1, "starter inbox");
  assert(listed.gold === MOCK_STARTER_GOLD && listed.diamond === MOCK_STARTER_DIAMOND, "list leaves wallet");
  const welcome = listed.mails[0];
  const reward = listed.mails[1];
  const notice = listed.mails[2];
  assert(welcome.id === MAIL_WELCOME_ID && welcome.unread && welcome.hasAttachment === false && welcome.title === "欢迎来到梦想之光", "welcome mail");
  assert(reward.id === MAIL_REWARD_ID && reward.unread && reward.hasAttachment && reward.claimed === false, "reward mail");
  assert(reward.attachments.length === 3 && reward.attachments[0].name === "金币" && reward.attachments[0].count === MAIL_REWARD_GOLD, "reward gold");
  assert(reward.attachments[1].name === "强化石" && reward.attachments[1].count === MAIL_REWARD_STONE, "reward stones");
  assert(reward.attachments[2].name === "小金币袋" && reward.attachments[2].count === MAIL_REWARD_GOLD_BAG, "reward bag");
  assert(notice.id === MAIL_NOTICE_ID && notice.unread === false && notice.hasAttachment === false && notice.title === "维护公告", "notice already read");

  const read = fresh.mailRead({ id: MAIL_WELCOME_ID });
  assert(read.ok && read.mail && read.mail.unread === false && fresh.gold === MOCK_STARTER_GOLD, "read welcome");
  const readAgain = fresh.mailRead({ id: MAIL_WELCOME_ID });
  assert(readAgain.ok && readAgain.mail && readAgain.mail.unread === false, "read twice");
  assert(fresh.mailList().unread === 1 && fresh.mailList().claimable === 1, "welcome no longer unread");
  const noAtt = fresh.mailClaim({ id: MAIL_WELCOME_ID });
  assert(noAtt.ok === false && noAtt.code === ErrorCode.MAIL_NO_ATTACHMENT && mailFailToast(noAtt) === "这封邮件没有附件", "welcome has no attachment");
  assert(fresh.gold === MOCK_STARTER_GOLD && fresh.itemCounts[IDLE_ITEM_ID] === undefined, "no attachment changes nothing");
  const noticeClaim = fresh.mailClaim({ id: MAIL_NOTICE_ID });
  assert(noticeClaim.ok === false && noticeClaim.code === ErrorCode.MAIL_NO_ATTACHMENT && fresh.mails[2].read === true, "notice cannot be claimed");
  const missing = fresh.mailClaim({ id: 0 });
  assert(missing.ok === false && missing.code === ErrorCode.MAIL_NOT_FOUND, "missing mail");
  const blocked = fresh.mailDelete({ id: MAIL_REWARD_ID });
  assert(blocked.ok === false && blocked.code === ErrorCode.MAIL_DELETE_BLOCKED && fresh.mails.length === 3, "cannot delete unclaimed");
  assert(fresh.gold === MOCK_STARTER_GOLD && fresh.idleAnchorMs === anchor && fresh.heroes[0].level === 1 && fresh.stageId === 1 && fresh.summonCursor === 0, "blocked delete leaves progress");

  const claimed = fresh.mailClaim({ id: MAIL_REWARD_ID });
  assert(claimed.ok && claimed.count === 1 && claimed.goldGain === MAIL_REWARD_GOLD && claimed.diamondGain === 0, "claim reward");
  assert(mailClaimToast(claimed) === "领取成功：金币 +80、强化石 ×3、小金币袋 ×1", "claim toast from session");
  assert(fresh.gold === MOCK_STARTER_GOLD + MAIL_REWARD_GOLD && fresh.diamond === MOCK_STARTER_DIAMOND, "gold only");
  assert(fresh.itemCounts[IDLE_ITEM_ID] === MAIL_REWARD_STONE, "stones enter bag");
  assert(fresh.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG + MAIL_REWARD_GOLD_BAG, "gold bag stacks");
  assert(fresh.mails[1].claimed === true && fresh.mails[1].read === true, "reward marked claimed");
  assert(fresh.idleAnchorMs === anchor && fresh.heroes[0].level === 1 && fresh.heroes[0].star === 3 && fresh.stageId === 1 && fresh.summonCursor === 0, "claim leaves hero idle and stage");
  const twice = fresh.mailClaim({ id: MAIL_REWARD_ID });
  assert(twice.ok === false && twice.code === ErrorCode.MAIL_ALREADY_CLAIMED && fresh.gold === MOCK_STARTER_GOLD + MAIL_REWARD_GOLD, "already claimed");
  assert(fresh.itemCounts[IDLE_ITEM_ID] === MAIL_REWARD_STONE, "second claim does not stack");
  const none = fresh.mailClaimAll();
  assert(none.ok === false && none.code === ErrorCode.MAIL_NOTHING && fresh.gold === MOCK_STARTER_GOLD + MAIL_REWARD_GOLD, "nothing left");
  const bag = fresh.bagList();
  const bags = bag.items.filter((item) => item.id === ITEM_GOLD_BAG);
  const stones = bag.items.filter((item) => item.id === IDLE_ITEM_ID);
  assert(bags.length === 1 && bags[0].count === STARTER_GOLD_BAG + MAIL_REWARD_GOLD_BAG, "bag shows mailed bags");
  assert(stones.length === 1 && stones[0].count === MAIL_REWARD_STONE && stones[0].usable === false, "bag shows mailed stones");
  const used = fresh.bagUse({ id: ITEM_GOLD_BAG, count: 1 });
  assert(used.ok && used.goldGain === GOLD_BAG_GAIN && fresh.gold === MOCK_STARTER_GOLD + MAIL_REWARD_GOLD + GOLD_BAG_GAIN, "mailed bag still usable");
  const upgraded = fresh.heroUpgrade({ heroId: 10001 });
  assert(upgraded.ok && upgraded.cost === 30 && fresh.heroes[0].level === 2 && fresh.mails.length === 3, "upgrade still spends mailed gold");
  const pull = fresh.summon({ count: 1 });
  assert(pull.ok && pull.drops[0].name === "霜刃刺客" && pull.diamond === MOCK_STARTER_DIAMOND - SUMMON_SINGLE_COST, "summon still works after mail");
  const removed = fresh.mailDelete({ id: MAIL_REWARD_ID });
  assert(removed.ok && removed.title === "开服补给" && fresh.mails.length === 2, "delete claimed");
  const removedWelcome = fresh.mailDelete({ id: MAIL_WELCOME_ID });
  assert(removedWelcome.ok && fresh.mails.length === 1 && fresh.mails[0].id === MAIL_NOTICE_ID, "delete read mail");
  const gone = fresh.mailDelete({ id: MAIL_WELCOME_ID });
  assert(gone.ok === false && gone.code === ErrorCode.MAIL_NOT_FOUND, "delete missing");
  fresh.roleCreate({ name: "新人" });
  assert(fresh.role.name === "新人" && fresh.gold === MOCK_STARTER_GOLD && fresh.heroes[0].level === 1, "create resets wallet and hero");
  assert(fresh.mails.length === 3 && fresh.mails[0].read === false && fresh.mails[1].claimed === false && fresh.mails[2].read === true, "create restores inbox");
  assert(fresh.itemCounts[IDLE_ITEM_ID] === undefined && fresh.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG, "create clears mailed items");

  const batch = new MockGameSession();
  const all = batch.mailClaimAll();
  assert(all.ok && all.count === 1 && all.ids.length === 1 && all.ids[0] === MAIL_REWARD_ID, "claim all one reward");
  assert(all.goldGain === MAIL_REWARD_GOLD && all.rewards.length === 3 && batch.gold === MOCK_STARTER_GOLD + MAIL_REWARD_GOLD, "claim all gold");
  assert(batch.mailList().unread === 1 && batch.mails[0].read === false && batch.mails[1].claimed === true, "claim all leaves welcome unread");
  const againAll = batch.mailClaimAll();
  assert(againAll.ok === false && againAll.code === ErrorCode.MAIL_NOTHING, "claim all twice");

  const twin = new MockGameSession({
    mails: [
      { id: 1, title: "甲", attachments: [{ id: 1, count: 10 }, { id: IDLE_ITEM_ID, count: 1 }] },
      { id: 2, title: "乙", attachments: [{ id: 1, count: 5 }, { id: IDLE_ITEM_ID, count: 2 }] },
      { id: 3, title: "公告", body: "只是看看" },
    ],
  });
  assert(twin.mails.length === 3 && twin.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG, "custom mail keeps starter items");
  const merged = twin.mailClaimAll();
  assert(merged.ok && merged.count === 2 && merged.goldGain === 15 && twin.gold === MOCK_STARTER_GOLD + 15, "claim all merges gold");
  const mergedStone = merged.rewards.filter((row) => row.id === IDLE_ITEM_ID);
  assert(mergedStone.length === 1 && mergedStone[0].count === 3 && twin.itemCounts[IDLE_ITEM_ID] === 3, "claim all merges stones");
  assert(twin.mailList().mails[2].unread === true && twin.mailList().claimable === 0, "plain mail stays unread");

  const gems = new MockGameSession({
    mails: [{ id: 9, title: "钻石信", body: "给钻石", attachments: [{ id: 2, count: 15 }] }],
  });
  const gem = gems.mailClaim({ id: 9 });
  assert(gem.ok && gem.diamondGain === 15 && gems.diamond === MOCK_STARTER_DIAMOND + 15 && gems.gold === MOCK_STARTER_GOLD, "diamond attachment");
  const shardId = shardItemId(10001);
  const shards = new MockGameSession({
    mails: [{ id: 4, title: "碎片信", attachments: [{ id: shardId, count: SUMMON_SHARD_GAIN }] }],
  });
  assert(shards.mailList().mails[0].attachments[0].name === "光耀骑士碎片", "shard attachment name");
  const shardClaim = shards.mailClaim({ id: 4 });
  assert(shardClaim.ok && shards.itemCounts[shardId] === SUMMON_SHARD_GAIN && shards.gold === MOCK_STARTER_GOLD, "shard enters bag");

  const empty = new MockGameSession({ mails: [] });
  assert(empty.mailList().mails.length === 0 && empty.mailList().unread === 0, "empty inbox");
  assert(empty.mailClaimAll().code === ErrorCode.MAIL_NOTHING && empty.gold === MOCK_STARTER_GOLD, "empty claim all");
  assert(empty.mailClaim({ id: MAIL_REWARD_ID }).code === ErrorCode.MAIL_NOT_FOUND, "empty claim one");
  const dup = new MockGameSession({
    mails: [
      { id: 1, title: "先", body: "a" },
      { id: 1, title: "后", body: "b" },
    ],
  });
  assert(dup.mails.length === 1 && dup.mails[0].title === "先", "duplicate mail id dropped");

  let now = 5000000;
  const timed = new MockGameSession(undefined, () => now);
  const timedAnchor = timed.idleAnchorMs;
  assert(timed.mailClaim({ id: MAIL_REWARD_ID }).ok && timed.idleAnchorMs === timedAnchor, "claim keeps idle anchor");
  now = timedAnchor + 60000;
  const idle = timed.idleClaim();
  assert(idle.ok && timed.itemCounts[IDLE_ITEM_ID] === MAIL_REWARD_STONE + 2, "idle stacks on mailed stones");
  assert(timed.gold === MOCK_STARTER_GOLD + MAIL_REWARD_GOLD + 6, "idle gold stacks on mail gold");

  const net = quietNet(new MockTransport({ latencyMs: 5 }));
  await net.connect("mock://local");
  const remote = await Proto.mailList({}, net);
  assert(remote.ok && remote.mails.length === 3 && remote.unread === 2 && remote.claimable === 1, "proto list");
  const remoteRead = await Proto.mailRead({ id: MAIL_WELCOME_ID }, net);
  assert(remoteRead.ok && remoteRead.mail && remoteRead.mail.unread === false, "proto read");
  const remoteNo = await Proto.mailClaim({ id: MAIL_NOTICE_ID }, net);
  assert(remoteNo.ok === false && remoteNo.code === ErrorCode.MAIL_NO_ATTACHMENT && remoteNo.gold === MOCK_STARTER_GOLD, "proto no attachment");
  const remoteClaim = await Proto.mailClaim({ id: MAIL_REWARD_ID }, net);
  assert(remoteClaim.ok && remoteClaim.gold === MOCK_STARTER_GOLD + MAIL_REWARD_GOLD && remoteClaim.rewards.length === 3, "proto claim");
  const remoteAgain = await Proto.mailClaim({ id: MAIL_REWARD_ID }, net);
  assert(remoteAgain.ok === false && remoteAgain.code === ErrorCode.MAIL_ALREADY_CLAIMED, "proto already claimed");
  const remoteNone = await Proto.mailClaimAll({}, net);
  assert(remoteNone.ok === false && remoteNone.code === ErrorCode.MAIL_NOTHING, "proto nothing");
  const remoteBag = await Proto.bagList({}, net);
  const remoteStones = remoteBag.items.filter((item) => item.id === IDLE_ITEM_ID);
  assert(remoteStones.length === 1 && remoteStones[0].count === MAIL_REWARD_STONE, "proto bag sees mail items");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applyMailClaim(remoteClaim);
  assert(Session.gold === remoteClaim.gold && Session.diamond === remoteClaim.diamond, "apply mail");
  applyMailClaim({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteClaim.gold && Session.diamond === remoteClaim.diamond, "failed mail ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  const remoteDelete = await Proto.mailDelete({ id: MAIL_REWARD_ID }, net);
  assert(remoteDelete.ok && remoteDelete.title === "开服补给", "proto delete");
  const afterDelete = await Proto.mailList({}, net);
  assert(afterDelete.mails.length === 2 && afterDelete.claimable === 0, "proto list after delete");
  const ids = P0_CMDS.filter(
    (row) =>
      row.cmd === Cmd.mailList ||
      row.cmd === Cmd.mailRead ||
      row.cmd === Cmd.mailClaim ||
      row.cmd === Cmd.mailClaimAll ||
      row.cmd === Cmd.mailDelete
  ).map((row) => row.id);
  assert(ids.length === 5 && ids[0] === 1701 && ids[4] === 1705, "mail cmd ids");
  net.close();
}

async function checkSmith(): Promise<void> {
  const lead = toSmithGear(starterRoster()[0]);
  assert(lead.weaponName === WEAPON_NAME && lead.weaponLevel === 1 && lead.weaponAtk === 0 && lead.atk === 70, "starter sword adds no attack");
  assert(strengthenGoldCost(1) === 20 && strengthenGoldCost(2) === 30 && strengthenGoldCost(WEAPON_MAX_LEVEL) === 0, "strengthen gold");
  assert(weaponAtkBonus(1) === 0 && weaponAtkBonus(2) === 8 && weaponAtkBonus(3) === 16, "weapon attack step");
  assert(smithRowText("光耀骑士", 1) === "光耀骑士 · 新手短剑 Lv1", "smith row");
  assert(smithHeroLine(lead) === "光耀骑士 · 新手短剑 Lv1 · 攻击 70", "smith hero line");
  assert(smithCostLine(lead).indexOf("Lv2") >= 0 && smithCostLine(lead).indexOf("攻击 78") >= 0, "next attack line");
  assert(strengthenButtonText(lead) === "强化（金币 20 · 强化石 ×1）", "strengthen button");
  assert(smithWalletLine(100, 3) === "持有金币 100 · 强化石 ×3", "wallet line");
  assert(
    strengthenToast("光耀骑士", WEAPON_NAME, 2, 20, 1) === "强化成功：光耀骑士的新手短剑升至 Lv2，消耗金币 20、强化石 ×1",
    "strengthen toast"
  );
  assert(smithGoldShortToast(20) === "金币不足，强化需要 20", "gold short toast");
  assert(smithStoneShortToast(1) === "强化石不足，强化需要 1", "stone short toast");
  assert(smithMaxToast() === "武器已达最高强化", "smith max toast");
  assert(errorText(ErrorCode.SMITH_GOLD_SHORT) === "金币不足，无法强化", "smith gold text");
  assert(errorText(ErrorCode.SMITH_STONE_SHORT) === "强化石不足", "smith stone text");
  assert(errorText(ErrorCode.SMITH_LEVEL_MAX) === "武器已达最高强化", "smith max text");
  const smithEntry = findNavEntry("smith");
  assert(smithEntry !== null && smithEntry.gateId === "main_smith_shop", "smith gate unchanged");
  assert(smithEntry.blurb.indexOf("强化石") >= 0, "smith blurb");

  const bare = new MockGameSession();
  bare.heroes[0].weaponLevel = 0;
  bare.heroes[2].weaponLevel = undefined;
  const opened = bare.smithView();
  assert(opened.ok && opened.leadId === 10001 && opened.gears.length === 3 && opened.stoneOwned === 0, "smith view seeds");
  assert(opened.gears[0].weaponLevel === 1 && opened.gears[2].weaponLevel === 1 && bare.gold === MOCK_STARTER_GOLD, "seed is free");
  assert(bare.itemCounts[IDLE_ITEM_ID] === undefined && bare.heroes[0].level === 1, "seed skips stones and level");
  const noStone = bare.smithStrengthen({ heroId: 10001 });
  assert(noStone.ok === false && noStone.code === ErrorCode.SMITH_STONE_SHORT && noStone.needStone === 1, "no stone");
  assert(smithFailToast(noStone) === "强化石不足，强化需要 1", "no stone toast");
  assert(bare.gold === MOCK_STARTER_GOLD && bare.heroes[0].weaponLevel === 1 && bare.diamond === MOCK_STARTER_DIAMOND, "no stone keeps wallet");

  const poor = new MockGameSession({ gold: 19, items: [{ id: IDLE_ITEM_ID, count: 2 }] });
  const shortGold = poor.smithStrengthen({ heroId: 10001 });
  assert(shortGold.ok === false && shortGold.code === ErrorCode.SMITH_GOLD_SHORT && shortGold.needGold === 20, "gold short");
  assert(smithFailToast(shortGold) === "金币不足，强化需要 20", "gold short from session");
  assert(poor.gold === 19 && poor.itemCounts[IDLE_ITEM_ID] === 2 && poor.heroes[0].weaponLevel === 1, "gold short spends nothing");

  const fresh = new MockGameSession();
  for (let stage = 1; stage <= 4; stage++) {
    const entered = fresh.stageEnter({ stageId: stage });
    const won = fresh.stageResult({ stageId: stage, battleId: entered.battleId, win: true });
    assert(won.ok && won.level === stage + 1, "win toward lv5 " + stage);
  }
  assert(fresh.role.level === 5 && fresh.clearedStage === 4 && fresh.gold === MOCK_STARTER_GOLD + 40, "four wins unlock level");
  assert(fresh.heroes[0].weaponLevel === 1, "wins do not strengthen");
  fresh.roleCreate({ name: "新人" });
  const anchor = fresh.idleAnchorMs;
  const claimed = fresh.mailClaim({ id: MAIL_REWARD_ID });
  assert(claimed.ok && fresh.itemCounts[IDLE_ITEM_ID] === MAIL_REWARD_STONE, "mail stones for smith");
  const first = fresh.smithStrengthen({ heroId: 10001 });
  assert(first.ok && first.goldCost === 20 && first.stoneCost === 1 && first.gear && first.gear.weaponLevel === 2, "first strengthen");
  assert(first.gear.atk === 70 + 8 && first.stoneOwned === MAIL_REWARD_STONE - 1, "attack and stones");
  assert(
    first.gold === MOCK_STARTER_GOLD + MAIL_REWARD_GOLD - 20 && fresh.heroes[1].weaponLevel === 1 && fresh.heroes[0].level === 1,
    "spend gold only on that hero"
  );
  assert(fresh.idleAnchorMs === anchor && fresh.stageId === 1 && fresh.diamond === MOCK_STARTER_DIAMOND, "smith leaves idle stage diamond");
  assert(strengthenToast(first.gear.heroName, first.gear.weaponName, first.gear.weaponLevel, first.goldCost, first.stoneCost).indexOf("Lv2") >= 0, "toast from gear");
  const listed = fresh.heroList();
  assert(listed.heroes[0].weaponLevel === 2 && listed.heroes[0].atk === heroStats(1, 3).atk + 8 && listed.heroes[0].weaponName === WEAPON_NAME, "hero list sees sword");
  const grown = fresh.heroUpgrade({ heroId: 10001 });
  assert(grown.ok && grown.hero && grown.hero.level === 2 && grown.hero.weaponLevel === 2 && grown.hero.atk === heroStats(2, 3).atk + 8, "upgrade keeps sword");
  const second = fresh.smithStrengthen({ heroId: 10002 });
  assert(second.ok && second.gear && second.gear.weaponLevel === 2 && fresh.heroes[0].weaponLevel === 2, "other hero sword");
  const third = fresh.smithStrengthen({ heroId: 10001 });
  assert(third.ok && third.goldCost === 30 && third.gear && third.gear.weaponLevel === 3 && third.stoneOwned === 0, "second sword spends last stone");
  assert(third.gold === MOCK_STARTER_GOLD + MAIL_REWARD_GOLD - 20 - 30 - 20 - 30, "gold after sword and upgrade");
  const bag = fresh.bagList();
  assert(bag.items.filter((item) => item.id === IDLE_ITEM_ID).length === 0, "bag hides empty stones");
  const blocked = fresh.smithStrengthen({ heroId: 10001 });
  assert(blocked.ok === false && blocked.code === ErrorCode.SMITH_STONE_SHORT && fresh.heroes[0].weaponLevel === 3, "next strengthen blocked");
  assert(fresh.gold === third.gold, "blocked strengthen keeps gold");
  const missing = fresh.smithStrengthen({ heroId: 999 });
  assert(missing.ok === false && missing.code === ErrorCode.HERO_NOT_FOUND && missing.gear === null, "missing hero");
  fresh.roleCreate({ name: "再来" });
  const reset = fresh.smithView();
  assert(reset.gears[0].weaponLevel === 1 && fresh.gold === MOCK_STARTER_GOLD && fresh.itemCounts[IDLE_ITEM_ID] === undefined, "create resets sword");
  assert(fresh.heroes[0].level === 1 && fresh.role.level === 1, "create resets hero and role");

  const capped = new MockGameSession({ gold: 500, items: [{ id: IDLE_ITEM_ID, count: 3 }] });
  capped.heroes[0].weaponLevel = WEAPON_MAX_LEVEL;
  const maxed = capped.smithStrengthen({ heroId: 10001 });
  assert(maxed.ok === false && maxed.code === ErrorCode.SMITH_LEVEL_MAX && smithFailToast(maxed) === "武器已达最高强化", "max sword");
  assert(capped.gold === 500 && capped.itemCounts[IDLE_ITEM_ID] === 3 && capped.heroes[0].weaponLevel === WEAPON_MAX_LEVEL, "max spends nothing");
  const geared = new MockGameSession({ heroes: [{ id: 8, name: "单人", level: 1, star: 1, weaponLevel: 3 }] });
  assert(geared.heroList().heroes[0].atk === heroStats(1, 1).atk + 16 && geared.heroList().heroes[0].weaponLevel === 3, "seeded sword");
  const summoned = new MockGameSession({ diamond: 20 });
  const pull = summoned.summon({ count: 1 });
  assert(pull.ok && pull.newCount === 1, "summon still adds hero");
  const assassin = summoned.heroList().heroes.filter((hero) => hero.id === 10004);
  assert(assassin.length === 1 && assassin[0].weaponLevel === 1 && assassin[0].weaponAtk === 0, "new hero gets starter sword");

  const net = quietNet(new MockTransport({ latencyMs: 5 }));
  await net.connect("mock://local");
  const remoteView = await Proto.smithView({}, net);
  assert(remoteView.ok && remoteView.gears.length === 3 && remoteView.gears[0].weaponLevel === 1, "proto view");
  const remoteShort = await Proto.smithStrengthen({ heroId: 10001 }, net);
  assert(remoteShort.ok === false && remoteShort.code === ErrorCode.SMITH_STONE_SHORT && remoteShort.gold === MOCK_STARTER_GOLD, "proto stone short");
  await Proto.mailClaim({ id: MAIL_REWARD_ID }, net);
  const remoteOk = await Proto.smithStrengthen({ heroId: 10001 }, net);
  assert(
    remoteOk.ok && remoteOk.gear && remoteOk.gear.weaponLevel === 2 && remoteOk.gold === MOCK_STARTER_GOLD + MAIL_REWARD_GOLD - 20,
    "proto strengthen"
  );
  const remoteHero = await Proto.heroList({}, net);
  assert(remoteHero.heroes[0].atk === 78 && remoteHero.heroes[0].weaponLevel === 2, "proto hero attack");
  const remoteBag = await Proto.bagList({}, net);
  const remoteStones = remoteBag.items.filter((item) => item.id === IDLE_ITEM_ID);
  assert(remoteStones.length === 1 && remoteStones[0].count === MAIL_REWARD_STONE - 1, "proto bag stone left");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applySmithStrengthen(remoteOk);
  assert(Session.gold === remoteOk.gold && Session.diamond === remoteOk.diamond, "apply smith");
  applySmithStrengthen({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteOk.gold && Session.diamond === remoteOk.diamond, "failed smith ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  const ids = P0_CMDS.filter((row) => row.cmd === Cmd.smithView || row.cmd === Cmd.smithStrengthen).map((row) => row.id);
  assert(ids.length === 2 && ids[0] === 1801 && ids[1] === 1802, "smith cmd ids");
  net.close();
}

async function checkArena(): Promise<void> {
  const starters = starterRoster();
  const power = rosterPower(starters);
  assert(power === 70 + 55 + 40, "starter arena power");
  assert(ARENA_OPPONENTS.length === 5 && ARENA_OPPONENTS[0].name === "见习剑士" && ARENA_OPPONENTS[0].power < power, "easy opponent");
  assert(ARENA_OPPONENTS[1].power === power && ARENA_OPPONENTS[2].power > power, "tie then harder");
  assert(rankFromScore(ARENA_START_SCORE) === 41, "start rank");
  assert(arenaScoreLine(1000, 41, power) === "积分 1000 · 约第 41 名 · 战力 " + power, "score line");
  assert(arenaDailyLine(0, ARENA_DAILY_LIMIT, 100) === "今日剩余 5/5 · 持有金币 100", "daily line");
  assert(arenaRowText("见习剑士", 960, 140, power).indexOf("可胜") >= 0, "easy row");
  assert(arenaRowText("铁壁守卫", 1060, 220, power).indexOf("较难") >= 0, "hard row");
  assert(challengeButtonText("见习剑士", 0, 5) === "挑战见习剑士（剩余 5）", "challenge button");
  assert(challengeButtonText("见习剑士", 5, 5) === "今日已用完", "spent button");
  assert(arenaWinToast("见习剑士", ARENA_WIN_SCORE, ARENA_WIN_GOLD) === "挑战胜利：击败见习剑士，积分 +24，金币 +20", "win toast");
  assert(arenaLoseToast("铁壁守卫", -ARENA_LOSE_SCORE) === "挑战失败：不敌铁壁守卫，积分 -12", "lose toast");
  assert(arenaLoseToast("铁壁守卫", 0) === "挑战失败：不敌铁壁守卫，积分没有再降", "floor toast");
  assert(arenaNoChanceToast() === "今日挑战次数已用完" && arenaMissingToast() === "没有这位对手", "arena fail copy");
  assert(errorText(ErrorCode.ARENA_NO_CHANCE) === "今日挑战次数已用完", "no chance text");
  assert(errorText(ErrorCode.ARENA_NOT_FOUND) === "没有这位对手", "missing opponent text");
  assert(arenaReportLine(power, 140, true) === "战力 " + power + " 对 140，胜利", "report line");

  const fresh = new MockGameSession();
  const anchor = fresh.idleAnchorMs;
  const view = fresh.arenaView();
  assert(view.ok && view.score === ARENA_START_SCORE && view.rank === 41 && view.power === power, "arena view");
  assert(view.used === 0 && view.limit === ARENA_DAILY_LIMIT && view.opponents.length === 5, "arena roster");
  assert(view.gold === MOCK_STARTER_GOLD && view.diamond === MOCK_STARTER_DIAMOND, "view leaves wallet");
  const missing = fresh.arenaChallenge({ opponentId: 0 });
  assert(missing.ok === false && missing.code === ErrorCode.ARENA_NOT_FOUND && arenaFailToast(missing) === "没有这位对手", "missing opponent");
  assert(fresh.arenaScore === ARENA_START_SCORE && fresh.arenaUsed === 0 && fresh.gold === MOCK_STARTER_GOLD, "missing spends nothing");
  const win = fresh.arenaChallenge({ opponentId: 1 });
  assert(win.ok && win.win && win.scoreDelta === ARENA_WIN_SCORE && win.goldGain === ARENA_WIN_GOLD, "easy win");
  assert(win.score === ARENA_START_SCORE + ARENA_WIN_SCORE && win.rank === 36 && win.used === 1, "score after win");
  assert(win.gold === MOCK_STARTER_GOLD + ARENA_WIN_GOLD && fresh.diamond === MOCK_STARTER_DIAMOND, "gold only");
  assert(fresh.stageId === 1 && fresh.heroes[0].level === 1 && fresh.heroes[0].weaponLevel === 1, "arena leaves growth");
  assert(fresh.idleAnchorMs === anchor && fresh.role.level === 1, "arena leaves idle and level");
  const tie = fresh.arenaChallenge({ opponentId: 2 });
  assert(tie.ok && tie.win && tie.opponentName === "流浪佣兵" && tie.score === ARENA_START_SCORE + ARENA_WIN_SCORE * 2, "tie counts as win");
  const lose = fresh.arenaChallenge({ opponentId: 3 });
  assert(lose.ok && lose.win === false && lose.goldGain === 0 && lose.scoreDelta === -ARENA_LOSE_SCORE, "hard lose");
  assert(lose.score === ARENA_START_SCORE + ARENA_WIN_SCORE * 2 - ARENA_LOSE_SCORE && fresh.gold === tie.gold, "lose keeps gold");
  assert(arenaLoseToast(lose.opponentName, lose.scoreDelta).indexOf("积分 -12") >= 0, "lose toast from resp");
  fresh.roleCreate({ name: "新人" });
  assert(fresh.arenaScore === ARENA_START_SCORE && fresh.arenaUsed === 0 && fresh.gold === MOCK_STARTER_GOLD, "create resets arena");
  assert(fresh.role.level === 1 && fresh.arenaDay === fresh.openDay, "create arena day");

  const limited = new MockGameSession();
  for (let i = 0; i < ARENA_DAILY_LIMIT; i++) {
    const once = limited.arenaChallenge({ opponentId: 1 });
    assert(once.ok && once.win && once.used === i + 1, "daily fight " + (i + 1));
  }
  assert(limited.arenaScore === ARENA_START_SCORE + ARENA_WIN_SCORE * ARENA_DAILY_LIMIT, "five wins");
  assert(limited.gold === MOCK_STARTER_GOLD + ARENA_WIN_GOLD * ARENA_DAILY_LIMIT, "five gold");
  const blocked = limited.arenaChallenge({ opponentId: 1 });
  assert(blocked.ok === false && blocked.code === ErrorCode.ARENA_NO_CHANCE && arenaFailToast(blocked) === "今日挑战次数已用完", "daily cap");
  assert(limited.arenaScore === ARENA_START_SCORE + ARENA_WIN_SCORE * 5 && limited.gold === MOCK_STARTER_GOLD + ARENA_WIN_GOLD * 5, "cap spends nothing");
  for (let stage = 1; stage <= 5; stage++) {
    const entered = limited.stageEnter({ stageId: stage });
    const won = limited.stageResult({ stageId: stage, battleId: entered.battleId, win: true });
    assert(won.ok && won.level === stage + 1, "win toward new day " + stage);
  }
  assert(limited.role.level === 6 && limited.openDay === 2, "five wins reach day 2");
  const refreshed = limited.arenaView();
  assert(refreshed.used === 0 && refreshed.score === ARENA_START_SCORE + ARENA_WIN_SCORE * 5, "new day clears chances");
  const again = limited.arenaChallenge({ opponentId: 1 });
  assert(again.ok && again.used === 1 && again.score === refreshed.score + ARENA_WIN_SCORE, "fight after new day");

  const climb = new MockGameSession();
  for (let stage = 1; stage <= 7; stage++) {
    const entered = climb.stageEnter({ stageId: stage });
    const won = climb.stageResult({ stageId: stage, battleId: entered.battleId, win: true });
    assert(won.ok && won.level === stage + 1, "win toward lv8 " + stage);
  }
  assert(climb.role.level === 8 && climb.openDay === 2 && climb.gold === MOCK_STARTER_GOLD + 70, "seven wins unlock level");
  const opened = climb.arenaView();
  assert(opened.score === ARENA_START_SCORE && opened.used === 0 && opened.power === power, "stages do not change arena");
  assert(climb.heroes[0].weaponLevel === 1, "stages do not strengthen");

  const armed = new MockGameSession();
  armed.heroes[0].weaponLevel = 2;
  assert(armed.arenaView().power === power + 8, "sword adds arena power");
  const stillHard = armed.arenaChallenge({ opponentId: 3 });
  assert(stillHard.ok && stillHard.win === false && armed.heroes[0].weaponLevel === 2, "one sword still loses to guard");

  const floored = new MockGameSession({ arenaScore: 800, arenaUsed: 0 });
  const stuck = floored.arenaChallenge({ opponentId: 3 });
  assert(stuck.ok && stuck.win === false && stuck.scoreDelta === 0 && stuck.score === 800, "score floor");
  assert(floored.gold === MOCK_STARTER_GOLD && arenaLoseToast(stuck.opponentName, stuck.scoreDelta).indexOf("没有再降") >= 0, "floor keeps gold");
  const partial = new MockGameSession({ arenaScore: 805 });
  const clipped = partial.arenaChallenge({ opponentId: 3 });
  assert(clipped.score === 800 && clipped.scoreDelta === -5, "partial drop");
  const capped = new MockGameSession({ arenaScore: 1990 });
  const topped = capped.arenaChallenge({ opponentId: 1 });
  assert(topped.win && topped.score === 2000 && topped.scoreDelta === 10 && topped.goldGain === ARENA_WIN_GOLD, "score cap");
  assert(arenaWinToast(topped.opponentName, topped.scoreDelta, topped.goldGain).indexOf("积分 +10") >= 0, "capped toast");

  const seeded = new MockGameSession({ arenaScore: 1100, arenaUsed: 4, arenaDay: 1, openDay: 1 });
  assert(seeded.arenaView().used === 4 && seeded.arenaView().rank === rankFromScore(1100), "seeded chances");
  const last = seeded.arenaChallenge({ opponentId: 1 });
  assert(last.ok && last.used === 5, "last seeded chance");
  const noMore = seeded.arenaChallenge({ opponentId: 1 });
  assert(noMore.ok === false && noMore.code === ErrorCode.ARENA_NO_CHANCE, "seeded cap");
  const shifted = new MockGameSession({ openDay: 4, arenaDay: 1, arenaUsed: 5, arenaScore: 900 });
  assert(shifted.arenaView().used === 0 && shifted.arenaScore === 900, "stale day clears used");

  const net = quietNet(new MockTransport({ latencyMs: 5 }));
  await net.connect("mock://local");
  const remoteView = await Proto.arenaView({}, net);
  assert(remoteView.ok && remoteView.opponents.length === 5 && remoteView.score === ARENA_START_SCORE, "proto view");
  const remoteWin = await Proto.arenaChallenge({ opponentId: 1 }, net);
  assert(
    remoteWin.ok && remoteWin.win && remoteWin.gold === MOCK_STARTER_GOLD + ARENA_WIN_GOLD && remoteWin.score === ARENA_START_SCORE + ARENA_WIN_SCORE,
    "proto challenge"
  );
  const remoteMiss = await Proto.arenaChallenge({ opponentId: 99 }, net);
  assert(remoteMiss.ok === false && remoteMiss.code === ErrorCode.ARENA_NOT_FOUND && remoteMiss.used === 1, "proto missing");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applyArenaChallenge(remoteWin);
  assert(Session.gold === remoteWin.gold && Session.diamond === remoteWin.diamond, "apply arena");
  applyArenaChallenge({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteWin.gold && Session.diamond === remoteWin.diamond, "failed arena ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  const ids = P0_CMDS.filter((row) => row.cmd === Cmd.arenaView || row.cmd === Cmd.arenaChallenge).map((row) => row.id);
  assert(ids.length === 2 && ids[0] === 1901 && ids[1] === 1902, "arena cmd ids");
  net.close();
}

async function checkTower(): Promise<void> {
  const fresh = new MockGameSession();
  const anchor = fresh.idleAnchorMs;
  const power = rosterPower(fresh.heroes);
  assert(power === 70 + 55 + 40, "starter tower power");
  assert(floorPower(1) === 100 && floorPower(4) === 160 && floorPower(5) === 180, "floor power curve");
  assert(goldForFloor(1) === 30 && goldForFloor(2) === 40 && goldForFloor(4) === 60, "floor gold");
  assert(floorGuardianName(1) === "迷雾守卫" && floorGuardianName(5) === "塔心守关", "guardian names");
  assert(towerFloorLine(1, TOWER_MAX_FLOOR, "迷雾守卫", 100, false) === "当前第 1 层 / 20 · 守关 迷雾守卫 · 战力 100", "floor line");
  assert(towerFloorLine(21, TOWER_MAX_FLOOR, "", 0, true) === "已到达塔顶 · 共 20 层", "cleared line");
  assert(towerPowerLine(power, 100, false) === "我方战力 165 · 可胜", "easy power line");
  assert(towerPowerLine(power, 180, false) === "我方战力 165 · 较难", "hard power line");
  assert(towerDailyLine(0, TOWER_DAILY_LIMIT, 100, 0) === "今日剩余 10/10 · 持有金币 100 · 强化石 ×0", "tower daily line");
  assert(towerChallengeButton(1, 0, TOWER_DAILY_LIMIT, false) === "挑战第1层（剩余 10）", "fight label");
  assert(towerChallengeButton(5, TOWER_DAILY_LIMIT, TOWER_DAILY_LIMIT, false) === "今日已用完", "spent label");
  assert(towerChallengeButton(21, 0, TOWER_DAILY_LIMIT, true) === "已到塔顶", "top label");
  assert(towerWinToast(1, 2, 30, "强化石", 1) === "通关第1层，进入第2层，金币 +30，强化石 ×1", "tower win toast");
  assert(towerLoseToast(5) === "第5层挑战失败，层数不变", "tower lose toast");
  assert(towerNoChanceToast() === "今日挑战次数已用完" && towerClearedToast() === "已到达塔顶", "tower fail copy");
  assert(towerReportLine(power, 100, 1, true) === "战力 165 对 100，第1层胜利", "tower report");

  const view = fresh.towerView();
  assert(view.ok && view.floor === 1 && view.maxFloor === TOWER_MAX_FLOOR && view.cleared === false, "tower view");
  assert(view.name === "迷雾守卫" && view.floorPower === 100 && view.playerPower === power, "floor 1 guardian");
  assert(view.used === 0 && view.limit === TOWER_DAILY_LIMIT && view.stoneOwned === 0 && view.gold === MOCK_STARTER_GOLD, "tower wallet");

  const win = fresh.towerChallenge();
  assert(win.ok && win.win && win.floor === 1 && win.nextFloor === 2 && win.goldGain === 30 && win.itemGain === 1, "floor 1 win");
  assert(win.itemName === "强化石" && win.stoneOwned === 1 && win.gold === MOCK_STARTER_GOLD + 30 && win.used === 1, "floor 1 reward");
  assert(fresh.towerFloor === 2 && fresh.stageId === 1 && fresh.role.level === 1, "tower leaves stage");
  assert(fresh.arenaScore === 1000 && fresh.arenaUsed === 0 && fresh.diamond === MOCK_STARTER_DIAMOND, "tower leaves arena and diamond");
  assert(fresh.idleAnchorMs === anchor && fresh.heroes[0].level === 1 && fresh.heroes[0].weaponLevel === 1, "tower leaves growth");
  const second = fresh.towerChallenge();
  assert(second.ok && second.win && second.goldGain === 40 && second.nextFloor === 3, "floor 2 win");
  const third = fresh.towerChallenge();
  assert(third.ok && third.win && third.name === "梦境法师" && third.goldGain === 50 && third.nextFloor === 4, "floor 3 win");
  const fourth = fresh.towerChallenge();
  assert(fourth.ok && fourth.win && fourth.name === "星河幻影" && fourth.goldGain === 60 && fourth.nextFloor === 5, "floor 4 win");
  assert(fresh.gold === MOCK_STARTER_GOLD + 180 && fresh.towerView().stoneOwned === 4, "four floors paid");
  assert(fresh.towerView().name === "塔心守关" && fresh.towerView().floorPower === 180, "floor 5 waiting");
  const lose = fresh.towerChallenge();
  assert(lose.ok && lose.win === false && lose.floor === 5 && lose.nextFloor === 5 && lose.goldGain === 0 && lose.itemGain === 0, "floor 5 lose");
  assert(fresh.towerFloor === 5 && fresh.gold === MOCK_STARTER_GOLD + 180 && fresh.towerView().stoneOwned === 4 && fresh.towerUsed === 5, "loss keeps floor");
  assert(towerLoseToast(lose.floor) === "第5层挑战失败，层数不变", "lose toast from resp");
  const bag = fresh.bagList().items;
  let stoneCount = 0;
  let stoneName = "";
  for (let i = 0; i < bag.length; i++) {
    if (bag[i].id !== 101) continue;
    stoneCount = bag[i].count;
    stoneName = bag[i].name;
  }
  assert(stoneCount === 4 && stoneName === "强化石", "stones land in bag");

  fresh.roleCreate({ name: "新人" });
  assert(fresh.towerFloor === 1 && fresh.towerUsed === 0 && fresh.gold === MOCK_STARTER_GOLD, "create resets tower");
  assert(fresh.towerView().floor === 1 && fresh.towerView().stoneOwned === 0 && fresh.towerView().used === 0, "create clears stones and chances");

  const limited = new MockGameSession();
  for (let i = 0; i < TOWER_DAILY_LIMIT; i++) {
    const once = limited.towerChallenge();
    assert(once.ok, "tower chance " + i);
  }
  assert(limited.towerUsed === TOWER_DAILY_LIMIT && limited.towerFloor === 5, "ten tries stop at floor 5");
  const blocked = limited.towerChallenge();
  assert(
    blocked.ok === false && blocked.code === ErrorCode.TOWER_NO_CHANCE && towerFailToast(blocked) === "今日挑战次数已用完",
    "tower daily cap"
  );
  assert(limited.towerFloor === 5 && limited.gold === MOCK_STARTER_GOLD + 180 && limited.towerView().stoneOwned === 4, "cap spends nothing");

  const shifted = new MockGameSession({ openDay: 4, towerDay: 1, towerUsed: 10, towerFloor: 5 });
  assert(shifted.towerView().used === 0 && shifted.towerFloor === 5 && shifted.gold === MOCK_STARTER_GOLD, "stale day clears tower chances");

  const topped = new MockGameSession({ towerFloor: 21, towerUsed: 3 });
  assert(topped.towerView().cleared && topped.towerView().floor === 21 && topped.towerView().name === "", "seeded top");
  const stuckTop = topped.towerChallenge();
  assert(stuckTop.ok === false && stuckTop.code === ErrorCode.TOWER_CLEARED && towerFailToast(stuckTop) === "已到达塔顶", "already cleared");
  assert(topped.towerFloor === 21 && topped.towerUsed === 3 && topped.gold === MOCK_STARTER_GOLD, "cleared spends nothing");

  const climber = new MockGameSession({
    towerFloor: 20,
    heroes: [
      { id: 10001, name: "光耀骑士", level: 10, star: 5, weaponLevel: 10 },
      { id: 10002, name: "林间游侠", level: 10, star: 5, weaponLevel: 10 },
      { id: 10003, name: "星辉法师", level: 10, star: 5, weaponLevel: 10 },
    ],
  });
  const capWin = climber.towerChallenge();
  assert(capWin.ok && capWin.win && capWin.floor === 20 && capWin.nextFloor === 21 && capWin.goldGain === goldForFloor(20), "clear floor 20");
  assert(climber.towerView().cleared, "view after cap");
  const noMoreTop = climber.towerChallenge();
  assert(noMoreTop.ok === false && noMoreTop.code === ErrorCode.TOWER_CLEARED && climber.towerUsed === 1, "second tap at top");

  const zero = new MockGameSession({ towerFloor: 0, towerUsed: -3 });
  assert(zero.towerFloor === 1 && zero.towerUsed === 0, "clamp empty floor");
  const huge = new MockGameSession({ towerFloor: 99, towerUsed: 40 });
  assert(huge.towerFloor === TOWER_MAX_FLOOR + 1 && huge.towerUsed === TOWER_DAILY_LIMIT, "clamp high floor");

  const mid = new MockGameSession({ towerFloor: 3, towerUsed: 2, towerDay: 1 });
  for (let stage = 1; stage <= 5; stage++) {
    const entered = mid.stageEnter({ stageId: stage });
    const wonStage = mid.stageResult({ stageId: stage, battleId: entered.battleId, win: true });
    assert(wonStage.ok && wonStage.level === stage + 1, "win toward tower day " + stage);
  }
  assert(mid.role.level === 6 && mid.openDay === 2 && mid.towerFloor === 3, "stages keep tower floor");
  assert(mid.towerView().used === 0 && mid.towerView().floor === 3, "new day clears tower used only");

  const unlock = new MockGameSession();
  for (let stage = 1; stage <= 15; stage++) {
    const entered = unlock.stageEnter({ stageId: stage });
    const wonStage = unlock.stageResult({ stageId: stage, battleId: entered.battleId, win: true });
    assert(wonStage.ok && wonStage.level === stage + 1, "win toward lv16 " + stage);
  }
  assert(unlock.role.level === 16 && unlock.openDay === 4 && unlock.gold === MOCK_STARTER_GOLD + 150, "fifteen wins unlock level");
  assert(unlock.towerView().floor === 1 && unlock.towerView().used === 0 && unlock.towerView().playerPower === power, "stages do not climb tower");
  const early = new MockGameSession({ clearedStage: 14 });
  assert(early.role.level === 15 && early.towerFloor === 1, "lv15 still floor 1");

  const armed = new MockGameSession();
  armed.heroes[0].weaponLevel = 2;
  assert(armed.towerView().playerPower === power + 8, "sword adds tower power");
  const arenaOnly = new MockGameSession();
  const arenaWin = arenaOnly.arenaChallenge({ opponentId: 1 });
  assert(arenaWin.ok && arenaOnly.towerFloor === 1 && arenaOnly.towerUsed === 0, "arena leaves tower");

  const net = quietNet(new MockTransport({ latencyMs: 5 }));
  await net.connect("mock://local");
  const remoteView = await Proto.towerView({}, net);
  assert(remoteView.ok && remoteView.floor === 1 && remoteView.playerPower === power && remoteView.cleared === false, "proto tower view");
  const remoteWin = await Proto.towerChallenge({}, net);
  assert(remoteWin.ok && remoteWin.win && remoteWin.nextFloor === 2 && remoteWin.gold === MOCK_STARTER_GOLD + 30, "proto tower win");
  let last = remoteWin;
  for (let i = 0; i < 3; i++) last = await Proto.towerChallenge({}, net);
  assert(last.ok && last.win && last.nextFloor === 5 && last.gold === MOCK_STARTER_GOLD + 180, "proto through floor 4");
  const remoteLose = await Proto.towerChallenge({}, net);
  assert(remoteLose.ok && remoteLose.win === false && remoteLose.nextFloor === 5 && remoteLose.gold === last.gold, "proto floor 5 lose");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applyTowerChallenge(remoteWin);
  assert(Session.gold === remoteWin.gold && Session.diamond === remoteWin.diamond, "apply tower");
  applyTowerChallenge({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteWin.gold && Session.diamond === remoteWin.diamond, "failed tower ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  const ids = P0_CMDS.filter((row) => row.cmd === Cmd.towerView || row.cmd === Cmd.towerChallenge).map((row) => row.id);
  assert(ids.length === 2 && ids[0] === 2001 && ids[1] === 2002, "tower cmd ids");
  net.close();
}

async function checkDaily(): Promise<void> {
  const easy = findDailyTier(1);
  const normal = findDailyTier(2);
  const hard = findDailyTier(3);
  assert(easy && normal && hard && DAILY_GOLD_TIERS.length === 3, "three gold tiers");
  assert(easy.power === 120 && easy.gold === 120 && easy.itemCount === 0, "easy reward");
  assert(normal.power === 160 && normal.gold === 200 && normal.itemCount === 1, "normal reward");
  assert(hard.power === 240 && hard.gold === 320 && hard.itemCount === 2, "hard reward");
  const fresh = new MockGameSession();
  const anchor = fresh.idleAnchorMs;
  const power = rosterPower(fresh.heroes);
  assert(power === 165, "starter daily power");
  assert(dailyAttemptsLine(0, DAILY_GOLD_LIMIT) === "今日剩余 2/2", "attempts line");
  assert(dailyAttemptsLine(2, DAILY_GOLD_LIMIT) === "今日剩余 0/2", "spent attempts line");
  assert(dailyPowerLine(power, 100) === "我方战力 165 · 持有金币 100", "daily power line");
  assert(dailyPreviewLine(easy) === "奖励预览：简单 · 金币 +120", "easy preview");
  assert(dailyPreviewLine(normal) === "奖励预览：普通 · 金币 +200 · 强化石 ×1", "normal preview");
  assert(dailyPreviewLine(null) === "先选择难度，再看金币奖励", "empty preview");
  assert(dailyRowText(easy, power) === "简单 · 建议战力 120 · 金币 +120 · 可胜", "easy row");
  assert(dailyRowText(hard, power) === "困难 · 建议战力 240 · 金币 +320 · 强化石 ×2 · 较难", "hard row");
  assert(dailyChallengeButton("简单", 0, DAILY_GOLD_LIMIT) === "挑战简单（剩余 2）", "fight label");
  assert(dailyChallengeButton("简单", DAILY_GOLD_LIMIT, DAILY_GOLD_LIMIT) === "今日已用完", "spent label");
  assert(dailyChallengeButton(null, 0, DAILY_GOLD_LIMIT) === "先选择难度", "empty label");
  assert(dailyWinToast("简单", 120, "强化石", 0) === "金币副本结算：简单，金币 +120", "easy win toast");
  assert(dailyWinToast("普通", 200, "强化石", 1) === "金币副本结算：普通，金币 +200，强化石 ×1", "normal win toast");
  assert(dailyLoseToast("困难") === "金币副本挑战失败：困难，奖励未发放", "daily lose toast");
  assert(dailyNoChanceToast() === "今日金币副本次数已用完" && dailyMissingToast() === "没有这个难度", "daily fail copy");
  assert(dailyEmptyToast() === "请先选择难度", "daily empty toast");
  assert(dailyReportLine(power, 120, "简单", true) === "战力 165 对 120，简单胜利", "daily report");
  assert(errorText(ErrorCode.DAILY_NO_CHANCE) === "今日金币副本次数已用完", "daily no chance text");
  assert(errorText(ErrorCode.DAILY_NOT_FOUND) === "没有这个难度", "daily missing text");

  const view = fresh.dailyView();
  assert(view.ok && view.kind === "gold" && view.tiers.length === 3 && view.playerPower === power, "daily view");
  assert(view.used === 0 && view.limit === DAILY_GOLD_LIMIT && view.gold === MOCK_STARTER_GOLD && view.stoneOwned === 0, "daily wallet");
  assert(view.tiers[0].name === "简单" && view.tiers[2].name === "困难", "tier order");

  const winEasy = fresh.dailyChallenge({ tierId: 1 });
  assert(winEasy.ok && winEasy.win && winEasy.name === "简单" && winEasy.goldGain === 120 && winEasy.itemGain === 0, "easy win");
  assert(winEasy.gold === MOCK_STARTER_GOLD + 120 && winEasy.used === 1 && winEasy.stoneOwned === 0, "easy gold");
  assert(fresh.stageId === 1 && fresh.role.level === 1 && fresh.towerFloor === 1 && fresh.towerUsed === 0, "daily leaves stage and tower");
  assert(fresh.arenaScore === 1000 && fresh.arenaUsed === 0 && fresh.diamond === MOCK_STARTER_DIAMOND, "daily leaves arena and diamond");
  assert(fresh.idleAnchorMs === anchor && fresh.heroes[0].level === 1 && fresh.heroes[0].weaponLevel === 1, "daily leaves growth");
  const winNormal = fresh.dailyChallenge({ tierId: 2 });
  assert(winNormal.ok && winNormal.win && winNormal.goldGain === 200 && winNormal.itemGain === 1 && winNormal.itemName === "强化石", "normal win");
  assert(fresh.gold === MOCK_STARTER_GOLD + 320 && fresh.dailyUsed === 2 && fresh.dailyView().stoneOwned === 1, "two tries paid");
  const blocked = fresh.dailyChallenge({ tierId: 1 });
  assert(
    blocked.ok === false && blocked.code === ErrorCode.DAILY_NO_CHANCE && dailyFailToast(blocked) === "今日金币副本次数已用完",
    "daily cap"
  );
  assert(fresh.gold === MOCK_STARTER_GOLD + 320 && fresh.dailyUsed === 2 && fresh.dailyView().stoneOwned === 1, "cap spends nothing");

  const hardOnly = new MockGameSession();
  const lose = hardOnly.dailyChallenge({ tierId: 3 });
  assert(lose.ok && lose.win === false && lose.goldGain === 0 && lose.itemGain === 0 && lose.used === 1, "hard lose");
  assert(hardOnly.gold === MOCK_STARTER_GOLD && hardOnly.dailyView().stoneOwned === 0, "loss keeps wallet");
  assert(dailyLoseToast(lose.name) === "金币副本挑战失败：困难，奖励未发放", "lose toast from resp");
  const missing = hardOnly.dailyChallenge({ tierId: 9 });
  assert(missing.ok === false && missing.code === ErrorCode.DAILY_NOT_FOUND && dailyFailToast(missing) === "没有这个难度", "missing tier");
  assert(hardOnly.dailyUsed === 1 && hardOnly.gold === MOCK_STARTER_GOLD, "missing spends nothing");

  const bag = fresh.bagList().items;
  let stoneCount = 0;
  for (let i = 0; i < bag.length; i++) {
    if (bag[i].id === 101) stoneCount = bag[i].count;
  }
  assert(stoneCount === 1, "stone lands in bag");

  fresh.roleCreate({ name: "新人" });
  assert(fresh.dailyUsed === 0 && fresh.gold === MOCK_STARTER_GOLD, "create resets daily");
  assert(fresh.dailyView().used === 0 && fresh.dailyView().stoneOwned === 0 && fresh.dailyView().gold === MOCK_STARTER_GOLD, "create clears stones and chances");

  const shifted = new MockGameSession({ openDay: 4, dailyDay: 1, dailyUsed: 2 });
  assert(shifted.dailyView().used === 0 && shifted.gold === MOCK_STARTER_GOLD, "stale day clears daily chances");

  const zero = new MockGameSession({ dailyUsed: -3 });
  assert(zero.dailyUsed === 0, "clamp empty daily used");
  const huge = new MockGameSession({ dailyUsed: 40 });
  assert(huge.dailyUsed === DAILY_GOLD_LIMIT, "clamp high daily used");

  const mid = new MockGameSession({ dailyUsed: 1, dailyDay: 1 });
  for (let stage = 1; stage <= 5; stage++) {
    const entered = mid.stageEnter({ stageId: stage });
    const wonStage = mid.stageResult({ stageId: stage, battleId: entered.battleId, win: true });
    assert(wonStage.ok && wonStage.level === stage + 1, "win toward daily day " + stage);
  }
  assert(mid.role.level === 6 && mid.openDay === 2 && mid.dailyView().used === 0, "new day clears daily used only");

  const unlock = new MockGameSession();
  for (let stage = 1; stage <= 14; stage++) {
    const entered = unlock.stageEnter({ stageId: stage });
    const wonStage = unlock.stageResult({ stageId: stage, battleId: entered.battleId, win: true });
    assert(wonStage.ok && wonStage.level === stage + 1, "win toward lv15 " + stage);
  }
  assert(unlock.role.level === 15 && unlock.openDay === 3 && unlock.gold === MOCK_STARTER_GOLD + 140, "fourteen wins unlock level");
  assert(unlock.dailyView().used === 0 && unlock.dailyView().playerPower === power, "stages do not spend daily");
  const early = new MockGameSession({ clearedStage: 13 });
  assert(early.role.level === 14, "lv14 still locked by level");
  const armed = new MockGameSession();
  armed.heroes[0].weaponLevel = 2;
  assert(armed.dailyView().playerPower === power + 8, "sword adds daily power");
  const strong = new MockGameSession({
    heroes: [
      { id: 10001, name: "光耀骑士", level: 10, star: 5, weaponLevel: 10 },
      { id: 10002, name: "林间游侠", level: 10, star: 5, weaponLevel: 10 },
      { id: 10003, name: "星辉法师", level: 10, star: 5, weaponLevel: 10 },
    ],
  });
  const hardWin = strong.dailyChallenge({ tierId: 3 });
  assert(hardWin.ok && hardWin.win && hardWin.goldGain === 320 && hardWin.itemGain === 2, "hard win when strong");
  assert(strong.towerFloor === 1 && strong.arenaUsed === 0 && strong.stageId === 1, "hard win leaves other modes");

  const towerOnly = new MockGameSession();
  const towerWin = towerOnly.towerChallenge();
  assert(towerWin.ok && towerOnly.dailyUsed === 0, "tower leaves daily");

  const net = quietNet(new MockTransport({ latencyMs: 5 }));
  await net.connect("mock://local");
  const remoteView = await Proto.dailyView({}, net);
  assert(remoteView.ok && remoteView.kind === "gold" && remoteView.playerPower === power && remoteView.used === 0, "proto daily view");
  const remoteWin = await Proto.dailyChallenge({ tierId: 1 }, net);
  assert(remoteWin.ok && remoteWin.win && remoteWin.gold === MOCK_STARTER_GOLD + 120 && remoteWin.used === 1, "proto easy");
  const remoteNormal = await Proto.dailyChallenge({ tierId: 2 }, net);
  assert(remoteNormal.ok && remoteNormal.win && remoteNormal.goldGain === 200 && remoteNormal.used === 2, "proto normal");
  const remoteCap = await Proto.dailyChallenge({ tierId: 1 }, net);
  assert(remoteCap.ok === false && remoteCap.code === ErrorCode.DAILY_NO_CHANCE && remoteCap.gold === remoteNormal.gold, "proto cap");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applyDailyChallenge(remoteWin);
  assert(Session.gold === remoteWin.gold && Session.diamond === remoteWin.diamond, "apply daily");
  applyDailyChallenge({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteWin.gold && Session.diamond === remoteWin.diamond, "failed daily ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  const ids = P0_CMDS.filter((row) => row.cmd === Cmd.dailyView || row.cmd === Cmd.dailyChallenge).map((row) => row.id);
  assert(ids.length === 2 && ids[0] === 2101 && ids[1] === 2102, "daily cmd ids");
  net.close();
}

async function checkLogin7(): Promise<void> {
  assert(LOGIN7_DAYS === 7 && LOGIN7_TABLE.length === 7, "seven login days");
  const day1 = findLogin7Rewards(1);
  const day4 = findLogin7Rewards(4);
  const day7 = findLogin7Rewards(7);
  assert(day1 && day1.length === 1 && day1[0].id === 1 && day1[0].count === 80, "day1 gold");
  assert(findLogin7Rewards(2) && findLogin7Rewards(2)![0].id === 2 && findLogin7Rewards(2)![0].count === 15, "day2 diamond");
  assert(findLogin7Rewards(3) && findLogin7Rewards(3)![0].id === IDLE_ITEM_ID && findLogin7Rewards(3)![0].count === 3, "day3 stones");
  assert(day4 && login7RewardText(day4) === "金币 +120、小金币袋 ×1", "day4 mix");
  assert(day7 && login7RewardText(day7) === "金币 +300、钻石 +50、小金币袋 ×2", "day7 mix");
  assert(findLogin7Rewards(0) === null && findLogin7Rewards(8) === null, "missing days");
  assert(login7HeadLine(1) === "角色登录第 1 天", "head line");
  assert(login7OpenDayLine(1) === "开服第 1 天显示在这里，只供对照", "open day line");
  assert(login7OpenDayLine(30) === "开服第 30 天显示在这里，只供对照", "open day 30 line");
  assert(login7WalletLine(180, 35) === "持有金币 180 · 钻石 35", "wallet line");
  assert(login7ClaimButton(1, false) === "领取第1天" && login7ClaimButton(1, true) === "今日已领取", "claim button");
  assert(login7ClaimButton(0, false) === "读取中" && login7AdvanceButton() === "下一天（调试）", "wait and debug labels");
  assert(login7ClaimToast(1, day1) === "领取成功：第1天，金币 +80", "day1 toast");
  assert(login7ClaimToast(4, day4) === "领取成功：第4天，金币 +120、小金币袋 ×1", "day4 toast");
  assert(login7LockedToast(2) === "第2天尚未到达" && login7ClaimedToast(1) === "第1天奖励已经领取", "lock and claimed copy");
  assert(login7MissingToast() === "没有这一天" && login7MaxToast() === "已经是第7天", "missing and max copy");
  assert(login7AdvanceToast(2) === "角色登录天来到第2天，奖励尚未自动领取", "advance toast");
  assert(errorText(ErrorCode.LOGIN7_LOCKED) === "这一天尚未到达", "locked text");
  assert(errorText(ErrorCode.LOGIN7_CLAIMED) === "这一天的奖励已经领取", "claimed text");
  assert(errorText(ErrorCode.LOGIN7_NOT_FOUND) === "没有这一天", "missing text");
  assert(errorText(ErrorCode.LOGIN7_MAX) === "已经是第7天", "max text");

  const fresh = new MockGameSession();
  const anchor = fresh.idleAnchorMs;
  const view = fresh.login7View();
  assert(view.ok && view.loginDay === 1 && view.openDay === 1 && view.days.length === 7, "fresh view");
  assert(view.gold === MOCK_STARTER_GOLD && view.diamond === MOCK_STARTER_DIAMOND, "view wallet");
  assert(view.days[0].state === "ready" && view.days[1].state === "locked" && view.days[6].state === "locked", "day1 ready");
  assert(login7RowText(view.days[0], view.loginDay) === "第1天 · 金币 +80 · 今日可领", "today row");
  assert(login7RowText(view.days[1], view.loginDay) === "第2天 · 钻石 +15 · 未到达", "future row");
  assert(login7RowText(view.days[3], view.loginDay) === "第4天 · 金币 +120、小金币袋 ×1 · 未到达", "day4 row");
  assert(login7TodayClaimed(view.days, 1) === false, "today open");

  const early = fresh.login7Claim({ day: 2 });
  assert(early.ok === false && early.code === ErrorCode.LOGIN7_LOCKED && login7FailToast(early) === "第2天尚未到达", "future locked");
  assert(fresh.gold === MOCK_STARTER_GOLD && fresh.diamond === MOCK_STARTER_DIAMOND && fresh.loginDay === 1, "locked spends nothing");
  const missing = fresh.login7Claim({ day: 8 });
  assert(missing.ok === false && missing.code === ErrorCode.LOGIN7_NOT_FOUND && login7FailToast(missing) === "没有这一天", "missing day");
  const blank = fresh.login7Claim({});
  assert(blank.ok === false && blank.code === ErrorCode.LOGIN7_NOT_FOUND && fresh.gold === MOCK_STARTER_GOLD, "blank day");

  const claimed = fresh.login7Claim({ day: 1 });
  assert(claimed.ok && claimed.goldGain === 80 && claimed.diamondGain === 0 && claimed.gold === MOCK_STARTER_GOLD + 80, "claim day1");
  assert(claimed.loginDay === 1 && fresh.openDay === 1 && fresh.stageId === 1, "claim leaves progress");
  assert(fresh.heroes[0].level === 1 && fresh.heroes[0].weaponLevel === 1 && fresh.arenaUsed === 0, "claim leaves growth");
  assert(fresh.towerFloor === 1 && fresh.dailyUsed === 0 && fresh.idleAnchorMs === anchor, "claim leaves modes");
  assert(fresh.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG && fresh.itemCounts[IDLE_ITEM_ID] === undefined, "day1 adds no item");
  const again = fresh.login7Claim({ day: 1 });
  assert(again.ok === false && again.code === ErrorCode.LOGIN7_CLAIMED && login7FailToast(again) === "第1天奖励已经领取", "already claimed");
  assert(fresh.gold === MOCK_STARTER_GOLD + 80 && fresh.login7View().days[0].state === "claimed", "second claim keeps wallet");
  assert(login7RowText(fresh.login7View().days[0], 1) === "第1天 · 金币 +80 · 已领取", "claimed row");
  assert(login7TodayClaimed(fresh.login7View().days, 1), "today claimed flag");

  const stepped = fresh.login7Advance();
  assert(stepped.ok && stepped.advanced && stepped.loginDay === 2 && stepped.openDay === 1, "advance to day 2");
  assert(fresh.gold === MOCK_STARTER_GOLD + 80 && fresh.login7View().days[0].state === "claimed", "advance does not claim");
  assert(fresh.login7View().days[1].state === "ready" && login7RowText(fresh.login7View().days[1], 2) === "第2天 · 钻石 +15 · 今日可领", "day2 today");
  const diamonds = fresh.login7Claim({ day: 2 });
  assert(diamonds.ok && diamonds.diamondGain === 15 && fresh.diamond === MOCK_STARTER_DIAMOND + 15, "day2 diamonds");
  assert(fresh.gold === MOCK_STARTER_GOLD + 80 && fresh.openDay === 1, "diamonds leave gold and open day");

  const far = new MockGameSession({ openDay: 30, arenaUsed: 2, dailyUsed: 1, towerFloor: 4, towerUsed: 3, clearedStage: 3 });
  assert(far.loginDay === 1 && far.login7View().openDay === far.openDay, "open day does not set login day");
  const farLock = far.login7Claim({ day: 2 });
  assert(farLock.ok === false && farLock.code === ErrorCode.LOGIN7_LOCKED && far.gold === MOCK_STARTER_GOLD, "d30 still locks day 2");
  const farAdv = far.login7Advance();
  assert(farAdv.loginDay === 2 && farAdv.openDay === far.openDay && far.arenaUsed === 2 && far.dailyUsed === 1, "advance leaves modes");
  assert(far.towerFloor === 4 && far.towerUsed === 3 && far.clearedStage === 3, "advance leaves tower and stage");

  const runner = new MockGameSession();
  let next = 1;
  for (let i = 0; i < 5; i++) {
    const entered = runner.stageEnter({ stageId: next });
    const won = runner.stageResult({ stageId: next, battleId: entered.battleId, win: true });
    assert(won.ok && won.level === next + 1, "win toward login " + next);
    next = won.nextStageId;
  }
  assert(runner.openDay === 2 && runner.loginDay === 1 && runner.gold === MOCK_STARTER_GOLD + 50, "stages move open day only");
  const stillLocked = runner.login7Claim({ day: 2 });
  assert(stillLocked.ok === false && stillLocked.code === ErrorCode.LOGIN7_LOCKED && runner.gold === MOCK_STARTER_GOLD + 50, "stage does not unlock day 2");

  const pack = new MockGameSession({ loginDay: 7, openDay: 4 });
  assert(pack.login7Claim({ day: 3 }).ok && pack.itemCounts[IDLE_ITEM_ID] === 3, "day3 stones");
  assert(pack.login7Claim({ day: 4 }).ok && pack.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG + 1 && pack.gold === MOCK_STARTER_GOLD + 120, "day4 bag");
  assert(pack.login7Claim({ day: 5 }).ok && pack.diamond === MOCK_STARTER_DIAMOND + 30 && pack.itemCounts[ITEM_EXP_POTION] === STARTER_EXP_POTION + 1, "day5 potion");
  assert(pack.login7Claim({ day: 6 }).ok && pack.itemCounts[IDLE_ITEM_ID] === 8 && pack.gold === MOCK_STARTER_GOLD + 320, "day6 stones stack");
  const last = pack.login7Claim({ day: 7 });
  assert(last.ok && last.goldGain === 300 && last.diamondGain === 50, "day7 payout");
  assert(pack.gold === MOCK_STARTER_GOLD + 620 && pack.diamond === MOCK_STARTER_DIAMOND + 80, "day7 wallet");
  assert(pack.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG + 3 && pack.openDay === 4 && pack.loginDay === 7, "day7 bag and days");
  assert(pack.heroes[0].level === 1 && pack.stageId === 1, "rewards leave hero and stage");
  const capped = pack.login7Advance();
  assert(capped.ok === false && capped.code === ErrorCode.LOGIN7_MAX && login7FailToast(capped) === "已经是第7天", "cannot pass day 7");
  assert(pack.loginDay === 7 && pack.openDay === 4 && pack.gold === MOCK_STARTER_GOLD + 620, "max keeps state");
  const repeat = pack.login7Claim({ day: 7 });
  assert(repeat.ok === false && repeat.code === ErrorCode.LOGIN7_CLAIMED && pack.gold === MOCK_STARTER_GOLD + 620, "day7 once");

  const seeded = new MockGameSession({ loginDay: 4, loginClaimed: [1, 2, 9], openDay: 9 });
  assert(seeded.loginDay === 4 && seeded.login7View().openDay === 9, "seed login day");
  assert(seeded.login7View().days[0].state === "claimed" && seeded.login7View().days[1].state === "claimed", "seed claimed");
  assert(seeded.login7View().days[2].state === "ready" && login7RowText(seeded.login7View().days[2], 4) === "第3天 · 强化石 ×3 · 可补领", "makeup row");
  assert(seeded.login7View().days[3].state === "ready" && seeded.login7View().days[4].state === "locked", "today and future");
  assert(seeded.login7Claim({ day: 5 }).code === ErrorCode.LOGIN7_LOCKED, "seeded future");
  assert(seeded.login7Claim({ day: 1 }).code === ErrorCode.LOGIN7_CLAIMED && seeded.gold === MOCK_STARTER_GOLD, "seeded claimed wins");
  const makeup = seeded.login7Claim({ day: 3 });
  assert(makeup.ok && seeded.itemCounts[IDLE_ITEM_ID] === 3 && seeded.loginDay === 4, "makeup claim");
  assert(new MockGameSession({ loginDay: 0 }).loginDay === 1, "clamp low login day");
  assert(new MockGameSession({ loginDay: 99 }).loginDay === 7, "clamp high login day");
  const junk = new MockGameSession({ loginDay: 2, loginClaimed: [0, 2] });
  assert(junk.login7View().days[0].state === "ready" && junk.login7View().days[1].state === "claimed", "ignore day 0 claim");

  const reset = new MockGameSession({ loginDay: 5, loginClaimed: [1, 5], gold: 400, items: [{ id: IDLE_ITEM_ID, count: 9 }] });
  assert(reset.login7View().days[0].state === "claimed", "preset claimed");
  const created = reset.roleCreate({ name: "新人" });
  assert(created.ok && reset.loginDay === 1 && reset.gold === MOCK_STARTER_GOLD, "create resets login day");
  assert(reset.login7View().days[0].state === "ready" && reset.login7View().openDay === 1, "create clears claims");
  assert(reset.itemCounts[IDLE_ITEM_ID] === undefined && reset.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG, "create restores bag");

  const net = quietNet(new MockTransport({ latencyMs: 5 }));
  await net.connect("mock://local");
  const remoteView = await Proto.login7View({}, net);
  assert(remoteView.ok && remoteView.loginDay === 1 && remoteView.days.length === 7 && remoteView.days[1].state === "locked", "proto view");
  const remoteClaim = await Proto.login7Claim({ day: 1 }, net);
  assert(remoteClaim.ok && remoteClaim.gold === MOCK_STARTER_GOLD + 80 && remoteClaim.rewards.length === 1, "proto claim");
  const remoteAgain = await Proto.login7Claim({ day: 1 }, net);
  assert(remoteAgain.ok === false && remoteAgain.code === ErrorCode.LOGIN7_CLAIMED && remoteAgain.gold === remoteClaim.gold, "proto claimed");
  const remoteLocked = await Proto.login7Claim({ day: 3 }, net);
  assert(remoteLocked.ok === false && remoteLocked.code === ErrorCode.LOGIN7_LOCKED, "proto locked");
  const remoteAdv = await Proto.login7Advance({}, net);
  assert(remoteAdv.ok && remoteAdv.loginDay === 2 && remoteAdv.openDay === 1 && remoteAdv.advanced, "proto advance");
  const remoteDay2 = await Proto.login7Claim({ day: 2 }, net);
  assert(remoteDay2.ok && remoteDay2.diamond === MOCK_STARTER_DIAMOND + 15 && remoteDay2.gold === remoteClaim.gold, "proto day2");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applyLogin7Claim(remoteDay2);
  assert(Session.gold === remoteDay2.gold && Session.diamond === remoteDay2.diamond, "apply login7");
  applyLogin7Claim({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteDay2.gold && Session.diamond === remoteDay2.diamond, "failed login7 ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  const ids = P0_CMDS.filter(
    (row) => row.cmd === Cmd.login7View || row.cmd === Cmd.login7Claim || row.cmd === Cmd.login7Advance
  ).map((row) => row.id);
  assert(ids.length === 3 && ids[0] === 2201 && ids[1] === 2202 && ids[2] === 2203, "login7 cmd ids");
  net.close();
}

class FakeSocket implements WsSocketLike {
  binaryType = "";
  sent: Array<string | ArrayBuffer> = [];
  closed = false;
  private listeners: { [type: string]: Array<(ev: WsSocketEvent) => void> } = {};

  addEventListener(type: string, listener: (ev: WsSocketEvent) => void): void {
    const list = this.listeners[type] || [];
    list.push(listener);
    this.listeners[type] = list;
  }

  removeEventListener(type: string, listener: (ev: WsSocketEvent) => void): void {
    const list = this.listeners[type];
    if (!list) return;
    const next: Array<(ev: WsSocketEvent) => void> = [];
    for (let i = 0; i < list.length; i++) {
      if (list[i] !== listener) next.push(list[i]);
    }
    this.listeners[type] = next;
  }

  send(data: string | ArrayBuffer): void {
    this.sent.push(data);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.emit("close", { code: 1000, reason: "" });
  }

  open(): void {
    this.emit("open", {});
  }

  fail(): void {
    this.emit("error", {});
  }

  serverClose(code: number): void {
    this.closed = true;
    this.emit("close", { code, reason: "bye" });
  }

  push(data: unknown): void {
    this.emit("message", { data });
  }

  private emit(type: string, ev: WsSocketEvent): void {
    const list = (this.listeners[type] || []).slice();
    for (let i = 0; i < list.length; i++) list[i](ev);
  }
}

function leFrame(cmd: number, size = 8): ArrayBuffer {
  const buf = new ArrayBuffer(size);
  if (size >= 8) new DataView(buf).setUint32(4, cmd, true);
  return buf;
}

function joinFrames(frames: Uint8Array[]): Uint8Array {
  let out = new Uint8Array(0);
  for (let i = 0; i < frames.length; i++) out = concatBytes(out, frames[i]);
  return out;
}

function resHeroData(spec: {
  id?: number;
  type?: number;
  level?: number;
  stage?: number;
  star?: number;
  elem?: number;
  occ?: number;
  lock?: number;
  fighting?: number;
}): Uint8Array {
  let out = new Uint8Array(0);
  if (spec.id !== undefined) out = concatBytes(out, fieldVarint(1, spec.id));
  if (spec.type !== undefined) out = concatBytes(out, fieldVarint(2, spec.type));
  if (spec.level !== undefined) out = concatBytes(out, fieldVarint(3, spec.level));
  if (spec.stage !== undefined) out = concatBytes(out, fieldVarint(4, spec.stage));
  if (spec.star !== undefined) out = concatBytes(out, fieldVarint(5, spec.star));
  if (spec.elem !== undefined) out = concatBytes(out, fieldVarint(6, spec.elem));
  if (spec.occ !== undefined) out = concatBytes(out, fieldVarint(7, spec.occ));
  if (spec.lock !== undefined) out = concatBytes(out, fieldVarint(8, spec.lock));
  if (spec.fighting !== undefined) out = concatBytes(out, fieldVarint(9, spec.fighting));
  return out;
}

function gresHeroList(spec: {
  capacity?: number;
  buy?: number;
  heroes?: Uint8Array[];
  status?: number;
  page?: number;
}): Uint8Array {
  let out = new Uint8Array(0);
  if (spec.capacity !== undefined) out = concatBytes(out, fieldVarint(1, spec.capacity));
  if (spec.buy !== undefined) out = concatBytes(out, fieldVarint(2, spec.buy));
  const heroes = spec.heroes || [];
  for (let i = 0; i < heroes.length; i++) out = concatBytes(out, fieldBytes(3, heroes[i]));
  if (spec.status !== undefined) out = concatBytes(out, fieldVarint(4, spec.status));
  if (spec.page !== undefined) out = concatBytes(out, fieldVarint(5, spec.page));
  return out;
}

function fieldVarint(field: number, value: number): Uint8Array {
  const parts: number[] = [];
  appendVarint(parts, field << 3);
  appendVarint(parts, value);
  return Uint8Array.from(parts);
}

function fieldBytes(field: number, payload: Uint8Array): Uint8Array {
  const parts: number[] = [];
  appendVarint(parts, (field << 3) | 2);
  appendVarint(parts, payload.length);
  const head = Uint8Array.from(parts);
  const out = new Uint8Array(head.length + payload.length);
  out.set(head, 0);
  if (payload.length > 0) out.set(payload, head.length);
  return out;
}

function appendVarint(parts: number[], value: number): void {
  let n = Math.floor(value);
  if (n < 0) n = 0;
  while (n > 127) {
    parts.push((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  parts.push(n);
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function textField(fields: { field: number; kind: string; text?: string }[] | null, field: number): string | null {
  if (!fields) return null;
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].field === field && fields[i].kind === "string") return fields[i].text || "";
  }
  return null;
}

function exactCopy(bytes: Uint8Array): ArrayBuffer {
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return copy as ArrayBuffer;
}

function sawLog(lines: string[], part: string): boolean {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf(part) >= 0) return true;
  }
  return false;
}

function sawWire(part: string): boolean {
  const recent = GameLog.shared.recent();
  for (let i = 0; i < recent.length; i++) {
    if (recent[i].tag === "Wire" && recent[i].message.indexOf(part) >= 0) return true;
  }
  return false;
}

async function checkWs(): Promise<void> {
  assert(CmdId.login === 1001 && CmdId.heartbeat === 1002, "placeholder ids stay put");
  assert(DEFAULT_WS_URL === "ws://127.0.0.1:13111/game", "default ws url is the local bridge");
  assert(TransportConfig.defaultKind === "mock", "config default is mock");
  const plain = parseTransportSearch("");
  assert(plain.kind === "mock" && plain.wsUrl === DEFAULT_WS_URL, "empty search is mock");
  const ws = parseTransportSearch("?transport=ws");
  assert(ws.kind === "ws" && ws.wsUrl === DEFAULT_WS_URL, "query ws");
  const mixed = parseTransportSearch("?safe=88,0,34,0&transport=WS&ws=wss://127.0.0.1:13101/game");
  assert(mixed.kind === "ws" && mixed.wsUrl === "wss://127.0.0.1:13101/game", "wss override beside safe");
  const forcedMock = parseTransportSearch("?transport=mock", { defaultKind: "ws", wsUrl: DEFAULT_WS_URL });
  assert(forcedMock.kind === "mock" && forcedMock.wsUrl === DEFAULT_WS_URL, "query mock wins");
  const flagged = parseTransportSearch("", { defaultKind: "ws", wsUrl: "ws://127.0.0.1:9" });
  assert(flagged.kind === "ws" && flagged.wsUrl === "ws://127.0.0.1:9", "config flag without query");
  const junk = parseTransportSearch("?transport=tcp&ws=http://127.0.0.1:13101");
  assert(junk.kind === "mock" && junk.wsUrl === DEFAULT_WS_URL, "bad scheme ignored");
  assert(WS_DOWN_STATUS.indexOf("服未启动") >= 0 && WS_DOWN_LOG.indexOf("start-local-server.bat") >= 0, "down copy");
  assert(WS_DOWN_LOG.indexOf("start-ws-bridge.bat") >= 0 && WS_DOWN_LOG.indexOf("13111") >= 0 && WS_DOWN_LOG.indexOf("不要直连 13101") >= 0, "down copy names the bridge");
  assert(WS_OPEN_STATUS.indexOf("1004") >= 0, "open copy");
  assert(WIRE_HEARTBEAT_MS === 25000, "heartbeat interval from the net log");
  assert(WireCmd.login === 1001 && WireCmd.heartbeat === 1004 && WireCmd.roleCreate === 1002, "wire ids");
  assert(WireCmd.roleProfile === 2001 && CmdId.towerView === 2001, "online 2001 stays off the placeholder table");
  assert(WireCmd.chapterData === 3007 && CmdId.stageEnter === 1201, "online 3007 stays off the placeholder stage ids");
  assert(
    WireCmd.chapterItemList === 3004 &&
      WireCmd.chapterItemReward === 3005 &&
      CmdId.idleQuery === 1301 &&
      CmdId.idleClaim === 1302,
    "online 3004 stays off the placeholder idle ids"
  );
  assert(bytesToHex(encodeFrame(WireCmd.heartbeat)) === "04000000ec030000", "heartbeat frame");
  assert(bytesToHex(encodeFrame(WireCmd.roleProfile)) === "04000000d1070000", "empty c2s 2001 from the log");
  assert(bytesToHex(encodeFrame(WireCmd.chapterData)) === "04000000bf0b0000", "empty c2s 3007 from the log");
  assert(bytesToHex(encodeFrame(WireCmd.chapterItemList)) === "04000000bc0b0000", "empty c2s 3004");
  assert(bytesToHex(encodeFrame(WireCmd.chapterItemReward)) === "04000000bd0b0000", "empty c2s 3005");
  assert(WireCmd.backpackList === 5001 && CmdId.bagList === 1601 && CmdId.bagUse === 1602, "online 5001 stays off the placeholder bag ids");
  assert(WireCmd.backpackGain === 5002, "online 5002 is gain, not bag.use");
  assert(bytesToHex(encodeFrame(WireCmd.backpackList)) === "0400000089130000", "empty c2s 5001");
  assert(WIRE_BAG_READONLY_TITLE === "背包（真服只读）", "readonly bag title");
  assert(WIRE_BAG_EMPTY === "空背包" && WIRE_BAG_UNSYNCED_TOAST === "真服背包未同步", "bag empty is not the unsynced toast");
  assert(formatWireBagLine({ itemId: 101, itemType: 3, num: 5 }, null) === "类型 3 · id 101 ×5", "bag line without a config name");
  assert(formatWireBagLine({ itemId: 101, itemType: 3, num: 5 }, "强化石") === "强化石 ×5", "bag line uses a config name");
  assert(decodeWireBagList(new Uint8Array(0)) !== null && decodeWireBagList(new Uint8Array(0))?.items.length === 0, "empty 5001 is a synced empty bag");
  const bagItem = fieldBytes(1, concatBytes(concatBytes(fieldVarint(1, 101), fieldVarint(2, 3)), fieldVarint(3, 5)));
  const bagListed = decodeWireBagList(bagItem);
  assert(
    bagListed !== null && bagListed.items.length === 1 && bagListed.items[0].itemId === 101 && bagListed.items[0].itemType === 3 && bagListed.items[0].num === 5,
    "5001 field 1 is one ResBackPackItem"
  );
  const bagTwo = decodeWireBagList(
    concatBytes(bagItem, fieldBytes(1, concatBytes(concatBytes(fieldVarint(1, 7), fieldVarint(2, 1)), fieldVarint(3, 0))))
  );
  assert(bagTwo !== null && bagTwo.items.length === 1 && bagTwo.items[0].itemId === 101, "5001 num 0 drops that row");
  assert(decodeWireBagList(new Uint8Array([0x80])) === null, "bad 5001 ignored");
  assert(decodeWireBagList(fieldBytes(1, new Uint8Array([0x80]))) === null, "bad nested item does not become an empty bag");
  const bagGain = decodeWireBagGain(
    concatBytes(fieldVarint(1, 4), fieldBytes(2, concatBytes(concatBytes(fieldVarint(1, 101), fieldVarint(2, 3)), fieldVarint(3, 2))))
  );
  assert(bagGain !== null && bagGain.type === 4 && bagGain.items.length === 1 && bagGain.items[0].num === 2, "5002 type and delta");
  const bagAdded = bagGain ? applyWireBagGain(bagListed ? bagListed.items : [], bagGain) : [];
  assert(bagAdded.length === 1 && bagAdded[0].num === 7, "5002 adds num");
  const bagRemoved = applyWireBagGain(bagAdded, {
    type: 9,
    items: [{ itemId: 101, itemType: 3, num: 0 }],
  });
  assert(bagRemoved.length === 0, "5002 num 0 deletes the row");
  const bagOtherType = applyWireBagGain(bagAdded, {
    type: null,
    items: [{ itemId: 101, itemType: 8, num: 1 }],
  });
  assert(bagOtherType.length === 2 && bagOtherType[0].num === 7 && bagOtherType[1].itemType === 8, "same id with another type stays");
  assert(decodeWireBagGain(new Uint8Array(0)) !== null && decodeWireBagGain(new Uint8Array(0))?.items.length === 0, "empty 5002 changes nothing");
  assert(decodeWireBagGain(new Uint8Array([0x80])) === null, "bad 5002 ignored");
  assert(
    WireCmd.mailList === 15000 && CmdId.mailList === 1701 && CmdId.mailRead === 1702 && CmdId.mailClaim === 1703 && CmdId.mailDelete === 1705,
    "online 15000 stays off the placeholder mail ids"
  );
  assert(bytesToHex(encodeFrame(WireCmd.mailList)) === "04000000983a0000", "empty c2s 15000");
  assert(WIRE_MAIL_READONLY_TITLE === "邮件（真服只读）", "readonly mail title");
  assert(WIRE_MAIL_EMPTY === "空邮箱" && WIRE_MAIL_UNSYNCED_TOAST === "真服邮件未同步", "mail empty is not the unsynced toast");
  assert(decodeWireMailList(new Uint8Array(0)) !== null && decodeWireMailList(new Uint8Array(0))?.entries.length === 0, "empty 15000 is a synced empty mailbox");
  assert(decodeWireMailList(new Uint8Array([0x80])) === null, "bad 15000 ignored");
  assert(decodeWireMailList(fieldVarint(2, 1)) === null, "non-empty 15000 without a mail stays unsynced");
  assert(decodeWireMailList(fieldBytes(1, new Uint8Array([0x80]))) === null, "bad nested mail does not become an empty mailbox");
  const mailSample = hexToBytes(
    "0aa1020881c8afa02510b297d8d606180020002a1a486164696168205265736572766173692050657269737469776132bd014265726b61742064756b756e67616e20706172612070657475616c616e672c206576656e74207265736572766173692049646c6520476f64646573732074656c6168206d656e63617061692070656e6361706169616e20726573657276617369203230302e303030206f72616e67212053696c616b616e20706572696b73612068616469616820646920626177616820696e692064616e2073656d6f67612070657475616c616e67616e20416e6461206d656e79656e616e676b616e213a0710a2f73618f4033a0810a1f7361880b5183a0610e9f836180a3a0610ddfc3618033a071086f83618ac023a0710b18ecb091832"
  );
  const loggedMail = decodeWireMailList(mailSample);
  assert(
    loggedMail !== null &&
      loggedMail.entries.length === 1 &&
      loggedMail.entries[0].id === 10000000001 &&
      loggedMail.entries[0].mark3 === 0 &&
      loggedMail.entries[0].mark4 === 0 &&
      loggedMail.entries[0].title === "Hadiah Reservasi Peristiwa" &&
      loggedMail.entries[0].attachment === "yes" &&
      loggedMail.entries[0].attachments.length === 6 &&
      loggedMail.entries[0].attachments[0].itemId === 900002 &&
      loggedMail.entries[0].attachments[0].count === 500,
    "15000 sample has a title and attachments"
  );
  assert(
    loggedMail !== null && formatWireMailLine(loggedMail.entries[0]) === "Hadiah Reservasi Peristiwa · 有附件",
    "mail line shows title and attachment, not read state"
  );
  assert(
    loggedMail !== null && wireMailNote(loggedMail.entries).indexOf("字段3=0") >= 0 && wireMailNote(loggedMail.entries).indexOf("不写金币") >= 0,
    "mail marks stay in the log note"
  );
  const titleOnly = decodeWireMailList(fieldBytes(1, fieldBytes(5, new TextEncoder().encode("欢迎"))));
  assert(
    titleOnly !== null && titleOnly.entries.length === 1 && titleOnly.entries[0].attachment === "no" && formatWireMailLine(titleOnly.entries[0]) === "欢迎 · 无附件",
    "title without field 7 is no attachment"
  );
  const idOnly = decodeWireMailList(fieldBytes(1, fieldVarint(1, 9)));
  assert(idOnly !== null && formatWireMailLine(idOnly.entries[0]) === "无标题 · id 9 · 无附件", "mail without a title keeps the id");
  const unknownAtt = decodeWireMailList(
    fieldBytes(1, concatBytes(fieldBytes(5, new TextEncoder().encode("欢迎")), fieldBytes(7, new Uint8Array([0x80]))))
  );
  assert(
    unknownAtt !== null && unknownAtt.entries[0].attachment === "unknown" && formatWireMailLine(unknownAtt.entries[0]) === "欢迎 · 附件未解",
    "unparsed attachment is not called empty"
  );
  const heroA = resHeroData({ id: 16, type: 102, level: 3, stage: 2, star: 5, elem: 1, occ: 2, lock: 0, fighting: 2844 });
  const heroB = resHeroData({ id: 4, type: 104, level: 1, stage: 1, star: 2, elem: 3, occ: 1, lock: 1, fighting: 900 });
  const heroRoster = gresHeroList({ capacity: 20, buy: 0, heroes: [heroA, heroB], status: 1, page: 1 });
  const heroEmpty = gresHeroList({ capacity: 10, buy: 0, status: 1, page: 1 });
  const heroPage1 = gresHeroList({
    capacity: 20,
    buy: 0,
    heroes: [resHeroData({ id: 7, type: 201, level: 4, stage: 1, star: 1, elem: 2, occ: 1, lock: 0, fighting: 100 })],
    status: 0,
    page: 1,
  });
  const heroPage2 = gresHeroList({
    capacity: 20,
    buy: 1,
    heroes: [resHeroData({ id: 8, type: 202, level: 6, stage: 3, star: 4, elem: 4, occ: 3, lock: 0, fighting: 500 })],
    status: 1,
    page: 2,
  });
  assert(
    WireCmd.heroList === 4001 && CmdId.heroList === 1401 && CmdId.heroUpgrade === 1402,
    "online 4001 stays off the placeholder hero ids"
  );
  assert(bytesToHex(encodeFrame(WireCmd.heroList, encodeWireHeroListBody(1))) === "06000000a10f00000801", "c2s 4001 page 1");
  assert(bytesToHex(encodeFrame(WireCmd.heroList, encodeWireHeroListBody(0))) === "06000000a10f00000801", "page 0 is sent as page 1");
  assert(bytesToHex(encodeFrame(WireCmd.heroList, encodeWireHeroListBody(2))) === "06000000a10f00000802", "c2s 4001 page 2");
  assert(bytesToHex(encodeFrame(WireCmd.heroList)) === "04000000a10f0000", "bare 4001 frame is the forbidden empty body");
  assert(WIRE_HERO_READONLY_TITLE === "英雄（真服只读）", "readonly hero title");
  assert(WIRE_HERO_EMPTY === "空名册" && WIRE_HERO_UNSYNCED_TOAST === "真服英雄未同步", "hero empty is not the unsynced toast");
  assert(WIRE_HERO_READONLY_NOTE.indexOf("不升级") >= 0 && WIRE_HERO_READONLY_NOTE.indexOf("不写金币") >= 0, "hero page refuses upgrade and wallet");
  assert(decodeWireHeroList(new Uint8Array(0)) === null, "empty 4001 body is not an empty roster");
  assert(decodeWireHeroList(new Uint8Array([0x80])) === null, "bad 4001 ignored");
  assert(decodeWireHeroList(fieldVarint(1, 3)) === null, "capacity alone stays unsynced");
  assert(decodeWireHeroList(fieldBytes(3, new Uint8Array([0x80]))) === null, "bad nested hero does not become an empty roster");
  const loggedHero = decodeWireHeroList(heroRoster);
  assert(
    loggedHero !== null &&
      loggedHero.entries.length === 2 &&
      loggedHero.heroCapacity === 20 &&
      loggedHero.buySpaceTimes === 0 &&
      loggedHero.sendStatus === 1 &&
      loggedHero.page === 1 &&
      loggedHero.entries[0].heroId === 16 &&
      loggedHero.entries[0].heroType === 102 &&
      loggedHero.entries[0].level === 3 &&
      loggedHero.entries[0].stage === 2 &&
      loggedHero.entries[0].star === 5 &&
      loggedHero.entries[0].elem === 1 &&
      loggedHero.entries[0].occupation === 2 &&
      loggedHero.entries[0].isLock === 0 &&
      loggedHero.entries[0].fighting === 2844 &&
      loggedHero.entries[1].heroId === 4 &&
      loggedHero.entries[1].isLock === 1,
    "4001 roster uses GResHeroList fields"
  );
  assert(
    loggedHero !== null && formatWireHeroLine(loggedHero.entries[0]) === "类型 102 · id 16 · Lv3 · 5星 · 战力 2844",
    "hero line uses the type number"
  );
  const detail = loggedHero ? formatWireHeroDetail(loggedHero.entries[0]) : [];
  assert(
    detail.indexOf("等级 3") >= 0 &&
      detail.indexOf("阶段 2") >= 0 &&
      detail.indexOf("星级 5") >= 0 &&
      detail.indexOf("元素 1") >= 0 &&
      detail.indexOf("职业 2") >= 0 &&
      detail.indexOf("锁定 0") >= 0 &&
      detail.indexOf("战力 2844") >= 0 &&
      detail.join(" ").indexOf("金币") < 0,
    "hero detail names the matched fields"
  );
  assert(
    loggedHero !== null &&
      wireHeroNote(loggedHero).indexOf("容量=20") >= 0 &&
      wireHeroNote(loggedHero).indexOf("send_status=1") >= 0 &&
      wireHeroNote(loggedHero).indexOf("不写金币") >= 0,
    "hero capacity stays in the log note"
  );
  setWireHeroTypeNote(102, "配置备注");
  assert(
    loggedHero !== null && formatWireHeroLine(loggedHero.entries[0]).indexOf("配置备注") === 0,
    "CHeroType note replaces the type number"
  );
  assert(
    loggedHero !== null && formatWireHeroDetail(loggedHero.entries[0]).join(" ").indexOf("类型 102") >= 0,
    "detail keeps the type number beside the note"
  );
  setWireHeroTypeNote(102, " ");
  assert(
    loggedHero !== null && formatWireHeroLine(loggedHero.entries[0]).indexOf("类型 102") === 0,
    "blank note falls back to the type number"
  );
  const emptyHeroes = decodeWireHeroList(heroEmpty);
  assert(
    emptyHeroes !== null && emptyHeroes.entries.length === 0 && emptyHeroes.sendStatus === 1 && emptyHeroes.page === 1 && emptyHeroes.heroCapacity === 10,
    "empty roster is a GResHeroList"
  );
  const moreHeroes = decodeWireHeroList(heroPage1);
  assert(moreHeroes !== null && moreHeroes.sendStatus === 0 && moreHeroes.page === 1 && moreHeroes.entries.length === 1, "send_status 0 keeps the page");
  const heroIdOnly = decodeWireHeroList(gresHeroList({ heroes: [resHeroData({ id: 9 })], status: 1, page: 1 }));
  assert(heroIdOnly !== null && formatWireHeroLine(heroIdOnly.entries[0]) === "类型未解 · id 9", "hero without a type keeps the id");
  const activityBody = hexToBytes("08011090fadad6061a04080110001a04080210001a0408031000");
  assert(
    WireCmd.buyGoldList === 17000 && CmdId.login7View === 2201 && CmdId.login7Claim === 2202 && CmdId.login7Advance === 2203,
    "online 17000 stays off the placeholder login7 ids"
  );
  assert(bytesToHex(encodeFrame(WireCmd.buyGoldList)) === "0400000068420000", "empty c2s 17000");
  assert(WIRE_ACTIVITY_READONLY_TITLE === "点金（真服只读）", "readonly buy gold title");
  assert(WIRE_ACTIVITY_EMPTY === "已同步空表" && WIRE_ACTIVITY_UNSYNCED_TOAST === "真服未同步", "buy gold empty is not the unsynced toast");
  assert(
    WIRE_ACTIVITY_READONLY_NOTE.indexOf("不点金") >= 0 &&
      WIRE_ACTIVITY_READONLY_NOTE.indexOf("不写金币") >= 0 &&
      WIRE_ACTIVITY_FIELD_NOTE.indexOf("status") >= 0 &&
      WIRE_ACTIVITY_FIELD_NOTE.indexOf("idx") >= 0 &&
      WIRE_ACTIVITY_READONLY_TITLE.indexOf("活动进度") < 0,
    "buy gold page names GResBuyGoldLog and does not say activity progress"
  );
  assert(decodeWireActivity(new Uint8Array(0)) !== null && decodeWireActivity(new Uint8Array(0))?.rows.length === 0, "empty 17000 is a synced empty table");
  assert(decodeWireActivity(new Uint8Array([0x80])) === null, "bad 17000 ignored");
  const statusOnly = decodeWireActivity(fieldVarint(1, 1));
  assert(statusOnly !== null && statusOnly.status === 1 && statusOnly.rows.length === 0, "status without list is a synced empty buy gold log");
  assert(decodeWireActivity(fieldBytes(3, new Uint8Array([0x80]))) === null, "bad nested row does not become an empty table");
  const loggedActivity = decodeWireActivity(activityBody);
  assert(
    loggedActivity !== null &&
      loggedActivity.status === 1 &&
      loggedActivity.time === 1792458000 &&
      loggedActivity.rows.length === 3 &&
      loggedActivity.rows[0].idx === 1 &&
      loggedActivity.rows[0].num === 0 &&
      loggedActivity.rows[1].idx === 2 &&
      loggedActivity.rows[2].idx === 3 &&
      loggedActivity.rows[2].num === 0,
    "17000 sample uses GResBuyGoldLog names"
  );
  assert(
    loggedActivity !== null &&
      formatWireActivityLine(loggedActivity.rows[0]) === "idx=1 / num=0" &&
      formatWireActivityLine(loggedActivity.rows[1]) === "idx=2 / num=0" &&
      formatWireActivityLine(loggedActivity.rows[2]) === "idx=3 / num=0" &&
      formatWireActivityStamp(loggedActivity) === "status=1 / time=1792458000",
    "buy gold lines show idx num and the raw time"
  );
  assert(
    loggedActivity !== null &&
      wireActivityNote(loggedActivity).indexOf("status=1") >= 0 &&
      wireActivityNote(loggedActivity).indexOf("不写金币") >= 0 &&
      wireActivityNote(loggedActivity).indexOf("活动进度") < 0 &&
      formatWireActivityLine(loggedActivity.rows[0]).indexOf("七日") < 0 &&
      (formatWireActivityStamp(loggedActivity) || "").indexOf("开服") < 0,
    "buy gold copy stays on proto names"
  );
  const activityFieldOnly = decodeWireActivity(fieldBytes(3, fieldVarint(1, 2)));
  assert(
    activityFieldOnly !== null && formatWireActivityLine(activityFieldOnly.rows[0]) === "idx=2 / num=无",
    "missing num stays blank instead of zero"
  );
  const achieveOne = decodeWireAchievement(
    fieldBytes(1, concatBytes(concatBytes(fieldVarint(1, 100100), fieldVarint(2, 1)), fieldVarint(3, 0)))
  );
  const achieveEmptyOuter = decodeWireAchievement(fieldVarint(3, 0));
  assert(
    WireCmd.achievementList === 12010 && CmdId.login7View === 2201 && CmdId.goal7View === 2301,
    "online 12010 stays off the placeholder login7 and goal7 ids"
  );
  assert(bytesToHex(encodeFrame(WireCmd.achievementList)) === "04000000ea2e0000", "empty c2s 12010");
  assert(bytesToHex(encodeFrame(12020)) !== "04000000ea2e0000", "12020 is not the 12010 frame");
  assert(WIRE_ACHIEVEMENT_READONLY_TITLE === "成就记录（真服只读）", "readonly achievement title");
  assert(
    WIRE_ACHIEVEMENT_EMPTY === "空成就表" && WIRE_ACHIEVEMENT_UNSYNCED_TOAST === "真服未同步",
    "empty achievement table is not the unsynced toast"
  );
  assert(
    WIRE_ACHIEVEMENT_SIDE_EFFECT === "打开/同步可能在服上补成就" &&
      WIRE_ACHIEVEMENT_READONLY_NOTE.indexOf("不领奖") >= 0 &&
      WIRE_ACHIEVEMENT_READONLY_NOTE.indexOf("不改 state") >= 0 &&
      WIRE_ACHIEVEMENT_FIELD_NOTE.indexOf("idx") >= 0 &&
      WIRE_ACHIEVEMENT_FIELD_NOTE.indexOf("process") >= 0 &&
      WIRE_ACHIEVEMENT_FIELD_NOTE.indexOf("state") >= 0 &&
      WIRE_ACHIEVEMENT_FIELD_NOTE.indexOf("字段1") < 0,
    "achievement page names PSTaskData and warns about the server side effect"
  );
  assert(
    decodeWireAchievement(new Uint8Array(0)) !== null && decodeWireAchievement(new Uint8Array(0))?.tasks.length === 0,
    "empty 12010 body is a synced empty achievement table"
  );
  assert(
    achieveEmptyOuter !== null && achieveEmptyOuter.tasks.length === 0,
    "non-empty outer with no task is still an empty achievement table"
  );
  assert(decodeWireAchievement(new Uint8Array([0x80])) === null, "bad 12010 ignored");
  assert(decodeWireAchievement(fieldBytes(1, new Uint8Array([0x80]))) === null, "bad nested task does not become an empty table");
  assert(
    achieveOne !== null &&
      achieveOne.tasks.length === 1 &&
      achieveOne.tasks[0].idx === 100100 &&
      achieveOne.tasks[0].process === 1 &&
      achieveOne.tasks[0].state === 0 &&
      formatWireAchievementLine(achieveOne.tasks[0]) === "idx=100100 / process=1 / state=0",
    "12010 task uses idx process state"
  );
  const achieveSticky = decodeFrames(concatBytes(encodeFrame(WireCmd.achievementList, fieldBytes(1, fieldVarint(1, 110400))), encodeFrame(WireCmd.heartbeat)));
  assert(
    achieveSticky.frames.length === 2 &&
      achieveSticky.frames[0].cmdId === 12010 &&
      achieveSticky.frames[1].cmdId === WireCmd.heartbeat &&
      decodeWireAchievement(achieveSticky.frames[0].body)?.tasks.length === 1 &&
      decodeWireAchievement(achieveSticky.frames[0].body)?.tasks[0].idx === 110400 &&
      formatWireAchievementLine(decodeWireAchievement(achieveSticky.frames[0].body)!.tasks[0]).indexOf("每日") < 0,
    "sticky 12010 frame stops at its length prefix"
  );
  const idxOnly = decodeWireAchievement(fieldBytes(1, fieldVarint(1, 115200)));
  assert(
    idxOnly !== null && formatWireAchievementLine(idxOnly.tasks[0]) === "idx=115200 / process=无 / state=无",
    "missing process and state stay blank"
  );
  assert(
    achieveOne !== null && wireAchievementNote(achieveOne).indexOf("打开/同步可能在服上补成就") >= 0 && wireAchievementNote(achieveOne).indexOf("不写金币") >= 0,
    "achievement note keeps the side effect"
  );
  const pvpSampleA = hexToBytes(
    "080310e8071a1f081012084f696d79616b6f6e18002200300838fbdeee0448e807509c1658001a230804120c48617469206b65206861746918002200300838b9f9fa0448e80750e01258001a2c08181215486174692079616e672074616b20646973756b61691800220030083885f4f40448e80750d61158002080cff8d6063000"
  );
  const pvpOuterOnly = concatBytes(
    concatBytes(concatBytes(fieldVarint(1, 3), fieldVarint(2, 1000)), fieldVarint(4, 1792944000)),
    fieldVarint(6, 0)
  );
  const loggedPvp = decodeWirePvp(pvpSampleA);
  const pvpEmptyOuter = decodeWirePvp(pvpOuterOnly);
  assert(
    WireCmd.pvpData === 18001 && CmdId.arenaView === 1901 && CmdId.arenaChallenge === 1902 && CmdId.heroList === 1401,
    "online 18001 stays off the placeholder arena and hero ids"
  );
  assert(bytesToHex(encodeFrame(WireCmd.pvpData)) === "0400000051460000", "empty c2s 18001");
  assert(bytesToHex(encodeFrame(18002)) !== "0400000051460000", "18002 is not the 18001 frame");
  assert(WIRE_PVP_READONLY_TITLE === "竞技场（真服只读）", "readonly arena title");
  assert(WIRE_PVP_EMPTY === "空对手表" && WIRE_PVP_UNSYNCED_TOAST === "真服未同步", "empty opponent table is not the unsynced toast");
  assert(
    WIRE_PVP_SIDE_EFFECT === "同步时若对手为空服可能补名单" &&
      WIRE_PVP_SEASON_NOTE.indexOf("日切") >= 0 &&
      WIRE_PVP_READONLY_NOTE.indexOf("不挑战") >= 0 &&
      WIRE_PVP_READONLY_NOTE.indexOf("不写金币") >= 0 &&
      WIRE_PVP_FIELD_NOTE.indexOf("free_count") >= 0 &&
      WIRE_PVP_FIELD_NOTE.indexOf("player_id") >= 0 &&
      WIRE_PVP_FIELD_NOTE.indexOf("name") >= 0,
    "arena page names GResPvpData and warns about the server side effect"
  );
  assert(decodeWirePvp(new Uint8Array(0)) !== null && decodeWirePvp(new Uint8Array(0))?.opponents.length === 0, "empty 18001 body is a synced empty opponent table");
  assert(
    pvpEmptyOuter !== null &&
      pvpEmptyOuter.opponents.length === 0 &&
      pvpEmptyOuter.freeCount === 3 &&
      pvpEmptyOuter.score === 1000 &&
      pvpEmptyOuter.seasonEndTime === 1792944000 &&
      pvpEmptyOuter.seasonCount === 0 &&
      formatWirePvpSelf(pvpEmptyOuter).indexOf("free_count=3") >= 0 &&
      formatWirePvpSelf(pvpEmptyOuter).indexOf("score=1000") >= 0,
    "non-empty outer with no list is still an empty opponent table"
  );
  assert(decodeWirePvp(new Uint8Array([0x80])) === null, "bad 18001 ignored");
  assert(decodeWirePvp(fieldBytes(3, new Uint8Array([0x80]))) === null, "bad nested opponent does not become an empty table");
  assert(
    loggedPvp !== null &&
      loggedPvp.freeCount === 3 &&
      loggedPvp.score === 1000 &&
      loggedPvp.seasonEndTime === 1792944000 &&
      loggedPvp.seasonCount === 0 &&
      loggedPvp.likeRids === null &&
      loggedPvp.seasonReward === null &&
      loggedPvp.opponents.length === 3 &&
      loggedPvp.opponents[0].playerId === 16 &&
      loggedPvp.opponents[0].name === "Oimyakon" &&
      loggedPvp.opponents[1].name === "Hati ke hati" &&
      loggedPvp.opponents[1].playerId === 4 &&
      formatWirePvpLine(loggedPvp.opponents[0]) ===
        "Oimyakon · player_id=16 · 字段3=0 · 字段4=空 · 字段6=8 · 字段7=10203003 · 字段9=1000 · 字段10=2844 · 字段11=0" &&
      formatWirePvpLine(loggedPvp.opponents[0]).indexOf("挑战") < 0 &&
      wirePvpNote(loggedPvp).indexOf("不写金币") >= 0 &&
      wirePvpNote(loggedPvp).indexOf(WIRE_PVP_SIDE_EFFECT) >= 0,
    "18001 sample uses GResPvpData names and keeps unmatched opponent fields numbered"
  );
  const pvpSticky = decodeFrames(concatBytes(encodeFrame(WireCmd.pvpData, pvpOuterOnly), encodeFrame(WireCmd.heartbeat)));
  assert(
    pvpSticky.frames.length === 2 &&
      pvpSticky.frames[0].cmdId === 18001 &&
      pvpSticky.frames[1].cmdId === WireCmd.heartbeat &&
      decodeWirePvp(pvpSticky.frames[0].body)?.opponents.length === 0 &&
      decodeWirePvp(pvpSticky.frames[0].body)?.score === 1000,
    "sticky 18001 frame stops at its length prefix"
  );
  let sevenBody = concatBytes(fieldVarint(1, 1792944000), fieldVarint(2, 1));
  for (let day = 1; day <= 7; day++) {
    sevenBody = concatBytes(sevenBody, fieldBytes(3, concatBytes(fieldVarint(1, day), fieldVarint(2, 0))));
  }
  const sevenOuterOnly = concatBytes(fieldVarint(1, 1792944000), fieldVarint(2, 1));
  const loggedSeven = decodeWireSevenDay(sevenBody);
  const sevenEmptyOuter = decodeWireSevenDay(sevenOuterOnly);
  const claimedRow = decodeWireSevenDay(fieldBytes(3, concatBytes(fieldVarint(1, 2), fieldVarint(2, 1))));
  assert(
    WireCmd.sevenDayLogin === 22000 && CmdId.login7View === 2201 && CmdId.login7Claim === 2202 && CmdId.login7Advance === 2203 && CmdId.goal7View === 2301,
    "online 22000 stays off the placeholder login7 ids and goal7"
  );
  assert(bytesToHex(encodeFrame(WireCmd.sevenDayLogin)) === "04000000f0550000", "empty c2s 22000");
  assert(bytesToHex(encodeFrame(22001)) !== "04000000f0550000", "22001 is not the 22000 frame");
  assert(bytesToHex(encodeFrame(22002)) !== "04000000f0550000", "22002 is not a c2s 22000 frame");
  assert(WIRE_SEVEN_READONLY_TITLE === "七日登录（真服只读）", "readonly seven day title");
  assert(WIRE_SEVEN_EMPTY === "空表" && WIRE_SEVEN_UNSYNCED_TOAST === "真服未同步", "empty seven day table is not the unsynced toast");
  assert(
    WIRE_SEVEN_SIDE_EFFECT === "22000 只读，无写库，无自动领奖" &&
      WIRE_SEVEN_PUSH_NOTE.indexOf("22002") >= 0 &&
      WIRE_SEVEN_PUSH_NOTE.indexOf("cur_day") >= 0 &&
      WIRE_SEVEN_READONLY_NOTE.indexOf("不领奖") >= 0 &&
      WIRE_SEVEN_READONLY_NOTE.indexOf("22001") >= 0 &&
      WIRE_SEVEN_READONLY_NOTE.indexOf("不写金币") >= 0 &&
      WIRE_SEVEN_FIELD_NOTE.indexOf("end_time") >= 0 &&
      WIRE_SEVEN_FIELD_NOTE.indexOf("cur_day") >= 0 &&
      WIRE_SEVEN_FIELD_NOTE.indexOf("未领") >= 0 &&
      WIRE_SEVEN_FIELD_NOTE.indexOf("已领") >= 0 &&
      WIRE_SEVEN_READONLY_TITLE.indexOf("点金") < 0 &&
      WIRE_SEVEN_READONLY_TITLE.indexOf("活动进度") < 0,
    "seven day page names GResSevenDayLoginData and states there is no write"
  );
  assert(decodeWireSevenDay(new Uint8Array(0)) !== null && decodeWireSevenDay(new Uint8Array(0))?.rows.length === 0, "empty 22000 body is a synced empty table");
  assert(
    sevenEmptyOuter !== null &&
      sevenEmptyOuter.rows.length === 0 &&
      sevenEmptyOuter.endTime === 1792944000 &&
      sevenEmptyOuter.curDay === 1 &&
      formatWireSevenHead(sevenEmptyOuter) === "end_time=1792944000 / cur_day=1",
    "non-empty outer with no list is still a synced seven day table"
  );
  assert(decodeWireSevenDay(new Uint8Array([0x80])) === null, "bad 22000 ignored");
  assert(decodeWireSevenDay(fieldBytes(3, new Uint8Array([0x80]))) === null, "bad nested day does not become an empty table");
  assert(
    loggedSeven !== null &&
      loggedSeven.endTime === 1792944000 &&
      loggedSeven.curDay === 1 &&
      loggedSeven.rows.length === 7 &&
      loggedSeven.rows[0].idx === 1 &&
      loggedSeven.rows[0].status === 0 &&
      loggedSeven.rows[6].idx === 7 &&
      loggedSeven.rows[6].status === 0 &&
      formatWireSevenLine(loggedSeven.rows[0]) === "idx=1 / status=0 · 未领" &&
      formatWireSevenLine(loggedSeven.rows[6]) === "idx=7 / status=0 · 未领" &&
      wireSevenNote(loggedSeven).indexOf("空表") < 0 &&
      wireSevenNote(loggedSeven).indexOf(WIRE_SEVEN_SIDE_EFFECT) >= 0 &&
      wireSevenNote(loggedSeven).indexOf("不写金币") >= 0 &&
      wireSevenNote(loggedSeven).indexOf("点金") < 0 &&
      wireSevenNote(loggedSeven).indexOf("活动进度") < 0,
    "22000 sample keeps unclaimed days synced"
  );
  assert(
    claimedRow !== null && formatWireSevenLine(claimedRow.rows[0]) === "idx=2 / status=1 · 已领",
    "status 1 is claimed and still not a button"
  );
  const idxOnlyDay = decodeWireSevenDay(fieldBytes(3, fieldVarint(1, 3)));
  assert(idxOnlyDay !== null && formatWireSevenLine(idxOnlyDay.rows[0]) === "idx=3 / status=无", "missing status stays blank");
  assert(decodeWireSevenDayUpdate(fieldVarint(1, 2)) === 2, "22002 field 1 is cur_day");
  assert(decodeWireSevenDayUpdate(new Uint8Array(0)) === null, "empty 22002 is not a day");
  const updateMisread = decodeWireSevenDay(fieldVarint(1, 2));
  assert(
    updateMisread !== null && updateMisread.endTime === 2 && updateMisread.curDay === null,
    "22000 decoder does not read the push field as cur_day"
  );
  const sevenSticky = decodeFrames(concatBytes(encodeFrame(WireCmd.sevenDayLogin, sevenOuterOnly), encodeFrame(WireCmd.heartbeat)));
  assert(
    sevenSticky.frames.length === 2 &&
      sevenSticky.frames[0].cmdId === 22000 &&
      sevenSticky.frames[1].cmdId === WireCmd.heartbeat &&
      decodeWireSevenDay(sevenSticky.frames[0].body)?.rows.length === 0 &&
      decodeWireSevenDay(sevenSticky.frames[0].body)?.curDay === 1,
    "sticky 22000 frame stops at its length prefix"
  );
  const goalTaskOpen = concatBytes(concatBytes(fieldVarint(1, 101), fieldVarint(2, 3)), fieldVarint(3, 0));
  const goalTaskClaimed = concatBytes(concatBytes(fieldVarint(1, 102), fieldVarint(2, 1)), fieldVarint(3, 1));
  const goalBody = concatBytes(
    concatBytes(concatBytes(fieldBytes(1, goalTaskOpen), fieldBytes(1, goalTaskClaimed)), fieldVarint(2, 2)),
    concatBytes(fieldVarint(3, 1), fieldVarint(4, 3))
  );
  const goalOuterOnly = concatBytes(fieldVarint(3, 0), fieldVarint(4, 1));
  const goalPacked = concatBytes(fieldBytes(2, new Uint8Array([1, 3])), concatBytes(fieldVarint(3, 4), fieldVarint(4, 2)));
  const loggedGoal = decodeWireGoal7(goalBody);
  const goalEmptyOuter = decodeWireGoal7(goalOuterOnly);
  const goalPackedSnap = decodeWireGoal7(goalPacked);
  assert(
    WireCmd.sevenDayTarget === 21010 &&
      CmdId.goal7View === 2301 &&
      CmdId.goal7Claim === 2302 &&
      CmdId.dailyView === 2101 &&
      CmdId.dailyChallenge === 2102 &&
      CmdId.login7View === 2201,
    "online 21010 stays off the placeholder goal7 ids and off 22000"
  );
  assert(bytesToHex(encodeFrame(WireCmd.sevenDayTarget)) === "0400000012520000", "empty c2s 21010");
  assert(bytesToHex(encodeFrame(WireCmd.sevenDayTarget)) !== "0400000002520000", "21010 is not the 02 52 typo");
  assert(bytesToHex(encodeFrame(21000)) !== "0400000012520000", "old 21000 is not the 21010 frame");
  assert(bytesToHex(encodeFrame(21001)) !== "0400000012520000", "old 21001 is not the 21010 frame");
  assert(bytesToHex(encodeFrame(21011)) !== "0400000012520000", "21011 is not the 21010 frame");
  assert(bytesToHex(encodeFrame(21012)) !== "0400000012520000", "21012 is not the 21010 frame");
  assert(bytesToHex(encodeFrame(21013)) !== "0400000012520000", "21013 is not a c2s 21010 frame");
  assert(bytesToHex(encodeFrame(WireCmd.sevenDayLogin)) !== "0400000012520000", "22000 is not the 21010 frame");
  assert(bytesToHex(encodeFrame(WireCmd.buyGoldList)) !== "0400000012520000", "17000 is not the 21010 frame");
  assert(WIRE_GOAL7_READONLY_TITLE === "七日目标（真服只读）", "readonly goal7 title");
  assert(WIRE_GOAL7_EMPTY === "空表" && WIRE_GOAL7_UNSYNCED_TOAST === "真服未同步", "empty goal table is not the unsynced toast");
  assert(
    WIRE_GOAL7_SIDE_EFFECT.indexOf("建档") >= 0 &&
      WIRE_GOAL7_SIDE_EFFECT.indexOf("懒填") >= 0 &&
      WIRE_GOAL7_SIDE_EFFECT.indexOf("不发奖") >= 0 &&
      WIRE_GOAL7_PUSH_NOTE.indexOf("21013") >= 0 &&
      WIRE_GOAL7_PUSH_NOTE.indexOf("只收") >= 0 &&
      WIRE_GOAL7_READONLY_NOTE.indexOf("不领奖") >= 0 &&
      WIRE_GOAL7_READONLY_NOTE.indexOf("21011") >= 0 &&
      WIRE_GOAL7_READONLY_NOTE.indexOf("21012") >= 0 &&
      WIRE_GOAL7_READONLY_NOTE.indexOf("不写金币") >= 0 &&
      WIRE_GOAL7_FIELD_NOTE.indexOf("curr_day") >= 0 &&
      WIRE_GOAL7_FIELD_NOTE.indexOf("seven_day_value") >= 0 &&
      WIRE_GOAL7_FIELD_NOTE.indexOf("reward_box_idx") >= 0 &&
      WIRE_GOAL7_FIELD_NOTE.indexOf("未领") >= 0 &&
      WIRE_GOAL7_FIELD_NOTE.indexOf("已领") >= 0 &&
      WIRE_GOAL7_READONLY_TITLE.indexOf("登录") < 0 &&
      WIRE_GOAL7_READONLY_TITLE.indexOf("点金") < 0 &&
      WIRE_GOAL7_READONLY_TITLE.indexOf("22000") < 0 &&
      WIRE_GOAL7_READONLY_TITLE.indexOf("17000") < 0,
    "goal page names GResSevenDayTargetList and stays off login and buy gold"
  );
  assert(decodeWireGoal7(new Uint8Array(0)) !== null && decodeWireGoal7(new Uint8Array(0))?.tasks.length === 0, "empty 21010 body is a synced empty table");
  assert(
    goalEmptyOuter !== null &&
      goalEmptyOuter.tasks.length === 0 &&
      goalEmptyOuter.sevenDayValue === 0 &&
      goalEmptyOuter.currDay === 1 &&
      goalEmptyOuter.rewardBoxIdx.length === 0 &&
      formatWireGoalHead(goalEmptyOuter) === "curr_day=1 / seven_day_value=0 / reward_box_idx=无",
    "non-empty outer with no task still carries fields 3 and 4"
  );
  assert(decodeWireGoal7(new Uint8Array([0x80])) === null, "bad 21010 ignored");
  assert(decodeWireGoal7(fieldBytes(1, new Uint8Array([0x80]))) === null, "bad nested task does not become an empty table");
  assert(
    loggedGoal !== null &&
      loggedGoal.currDay === 3 &&
      loggedGoal.sevenDayValue === 1 &&
      loggedGoal.rewardBoxIdx.length === 1 &&
      loggedGoal.rewardBoxIdx[0] === 2 &&
      loggedGoal.tasks.length === 2 &&
      loggedGoal.tasks[0].idx === 101 &&
      loggedGoal.tasks[0].process === 3 &&
      loggedGoal.tasks[0].state === 0 &&
      loggedGoal.tasks[1].state === 1 &&
      formatWireGoalLine(loggedGoal.tasks[0]) === "idx=101 / process=3 / state=0 · 未领" &&
      formatWireGoalLine(loggedGoal.tasks[1]) === "idx=102 / process=1 / state=1 · 已领" &&
      formatWireGoalHead(loggedGoal) === "curr_day=3 / seven_day_value=1 / reward_box_idx=2" &&
      wireGoalNote(loggedGoal).indexOf("空表") < 0 &&
      wireGoalNote(loggedGoal).indexOf(WIRE_GOAL7_SIDE_EFFECT) >= 0 &&
      wireGoalNote(loggedGoal).indexOf("不写金币") >= 0 &&
      wireGoalNote(loggedGoal).indexOf("登录") < 0 &&
      wireGoalNote(loggedGoal).indexOf("点金") < 0,
    "21010 sample keeps unclaimed and claimed tasks"
  );
  assert(
    goalPackedSnap !== null &&
      goalPackedSnap.rewardBoxIdx.length === 2 &&
      goalPackedSnap.rewardBoxIdx[0] === 1 &&
      goalPackedSnap.rewardBoxIdx[1] === 3 &&
      formatWireGoalHead(goalPackedSnap) === "curr_day=2 / seven_day_value=4 / reward_box_idx=1,3",
    "packed reward_box_idx stays a list"
  );
  const idxOnlyTask = decodeWireGoal7(fieldBytes(1, fieldVarint(1, 7)));
  assert(idxOnlyTask !== null && formatWireGoalLine(idxOnlyTask.tasks[0]) === "idx=7 / process=无 / state=无", "missing process and state stay blank");
  const goalSticky = decodeFrames(concatBytes(encodeFrame(WireCmd.sevenDayTarget, goalOuterOnly), encodeFrame(WireCmd.heartbeat)));
  assert(
    goalSticky.frames.length === 2 &&
      goalSticky.frames[0].cmdId === 21010 &&
      goalSticky.frames[1].cmdId === WireCmd.heartbeat &&
      decodeWireGoal7(goalSticky.frames[0].body)?.tasks.length === 0 &&
      decodeWireGoal7(goalSticky.frames[0].body)?.currDay === 1 &&
      decodeWireGoal7(goalSticky.frames[0].body)?.sevenDayValue === 0,
    "sticky 21010 frame stops at its length prefix"
  );
  const wishItem = concatBytes(fieldVarint(1, 101), fieldVarint(2, 3));
  const wishSlot = concatBytes(concatBytes(fieldVarint(1, 1), fieldVarint(2, 2)), fieldBytes(3, wishItem));
  const wishSlotBadItem = concatBytes(concatBytes(fieldVarint(1, 2), fieldVarint(2, 0)), fieldBytes(3, new Uint8Array([0x80])));
  const wishPool = concatBytes(
    concatBytes(concatBytes(fieldVarint(1, 1), fieldVarint(2, 4)), fieldBytes(3, wishSlot)),
    concatBytes(
      concatBytes(fieldBytes(3, wishSlotBadItem), fieldVarint(4, 7)),
      concatBytes(concatBytes(fieldVarint(5, 9), fieldVarint(6, 1792400000)), fieldVarint(7, 5))
    )
  );
  const wishBody = fieldBytes(1, wishPool);
  const wishOuterOnly = fieldVarint(8, 1);
  const summonBody = concatBytes(concatBytes(fieldVarint(1, 2), fieldVarint(2, 5)), fieldVarint(6, 8));
  const summonZero = fieldVarint(1, 0);
  const summonOuterOnly = fieldVarint(4, 1);
  const prophetLuckyA = concatBytes(fieldVarint(1, 1), fieldVarint(2, 3));
  const prophetLuckyB = concatBytes(fieldVarint(2, 0), fieldVarint(6, 4));
  const prophetBody = concatBytes(concatBytes(fieldBytes(1, prophetLuckyA), fieldBytes(1, prophetLuckyB)), fieldVarint(4, 9));
  const prophetMissing = fieldBytes(1, fieldVarint(1, 2));
  const prophetOuterOnly = fieldVarint(4, 1);
  const jewelPieceA = concatBytes(concatBytes(fieldVarint(1, 7), fieldVarint(2, 1)), fieldVarint(3, 2));
  const jewelPieceB = concatBytes(fieldVarint(2, 0), fieldVarint(6, 4));
  const jewelHeroA = concatBytes(fieldVarint(1, 16), fieldBytes(2, jewelPieceA));
  const jewelHeroB = concatBytes(fieldBytes(2, jewelPieceB), fieldVarint(5, 9));
  const jewelBody = concatBytes(concatBytes(fieldBytes(1, jewelHeroA), fieldBytes(1, jewelHeroB)), fieldVarint(4, 3));
  const jewelMissing = fieldBytes(1, fieldBytes(2, fieldVarint(1, 8)));
  const jewelOuterOnly = fieldVarint(4, 1);
  const illustratRowA = concatBytes(fieldVarint(1, 102), fieldVarint(2, 5));
  const illustratRowB = concatBytes(fieldVarint(2, 0), fieldVarint(6, 4));
  const illustratBody = concatBytes(concatBytes(fieldBytes(1, illustratRowA), fieldBytes(1, illustratRowB)), fieldVarint(4, 3));
  const illustratMissing = fieldBytes(1, fieldVarint(1, 8));
  const illustratOuterOnly = fieldVarint(4, 1);
  const loggedWish = decodeWireWish(wishBody);
  const wishEmptyOuter = decodeWireWish(wishOuterOnly);
  assert(
    WireCmd.blessingPool === 27001 &&
      CmdId.wishView === 2501 &&
      CmdId.wishDraw === 2502 &&
      CmdId.goal7View === 2301,
    "online 27001 stays off the placeholder wish ids and off goal7"
  );
  assert(bytesToHex(encodeFrame(WireCmd.blessingPool)) === "0400000079690000", "empty c2s 27001");
  assert(bytesToHex(encodeFrame(27002)) !== "0400000079690000", "27002 is not the 27001 frame");
  assert(bytesToHex(encodeFrame(27003)) !== "0400000079690000", "27003 is not the 27001 frame");
  assert(bytesToHex(encodeFrame(27004)) !== "0400000079690000", "27004 is not the 27001 frame");
  assert(bytesToHex(encodeFrame(4201)) !== "0400000079690000", "4201 is not the 27001 frame");
  assert(bytesToHex(encodeFrame(WireCmd.sevenDayTarget)) !== "0400000079690000", "21010 is not the 27001 frame");
  assert(WIRE_WISH_READONLY_TITLE === "许愿池（真服只读）", "readonly wish title");
  assert(WIRE_WISH_EMPTY === "空表" && WIRE_WISH_UNSYNCED_TOAST === "真服未同步", "empty wish table is not the unsynced toast");
  assert(
    WIRE_WISH_SIDE_EFFECT.indexOf("懒建") >= 0 &&
      WIRE_WISH_SIDE_EFFECT.indexOf("跨日") >= 0 &&
      WIRE_WISH_SIDE_EFFECT.indexOf("无扣费") >= 0 &&
      WIRE_WISH_READONLY_NOTE.indexOf("不刷新") >= 0 &&
      WIRE_WISH_READONLY_NOTE.indexOf("不抽奖") >= 0 &&
      WIRE_WISH_READONLY_NOTE.indexOf("27002") >= 0 &&
      WIRE_WISH_READONLY_NOTE.indexOf("27003") >= 0 &&
      WIRE_WISH_READONLY_NOTE.indexOf("27004") >= 0 &&
      WIRE_WISH_READONLY_NOTE.indexOf("不写金币") >= 0 &&
      WIRE_WISH_READONLY_NOTE.indexOf("不写钻石") >= 0 &&
      WIRE_WISH_FIELD_NOTE.indexOf("type") >= 0 &&
      WIRE_WISH_FIELD_NOTE.indexOf("refresh_times") >= 0 &&
      WIRE_WISH_FIELD_NOTE.indexOf("position") >= 0 &&
      WIRE_WISH_FIELD_NOTE.indexOf("lucky_value") >= 0 &&
      WIRE_WISH_FIELD_NOTE.indexOf("lucky_reward_id") >= 0 &&
      WIRE_WISH_FIELD_NOTE.indexOf("refresh_time") >= 0 &&
      WIRE_WISH_FIELD_NOTE.indexOf("字段号") >= 0 &&
      WIRE_WISH_READONLY_TITLE.indexOf("七日") < 0,
    "wish page names the pool fields and refuses the paid cmds"
  );
  assert(decodeWireWish(new Uint8Array(0)) !== null && decodeWireWish(new Uint8Array(0))?.pools.length === 0, "empty 27001 body is a synced empty table");
  assert(
    wishEmptyOuter !== null && wishEmptyOuter.pools.length === 0 && wishEmptyOuter.marks.length === 1 && wishEmptyOuter.marks[0].field === 8,
    "non-empty outer with no blessing_data stays synced and keeps the unnamed field"
  );
  assert(decodeWireWish(new Uint8Array([0x80])) === null, "bad 27001 ignored");
  assert(decodeWireWish(fieldBytes(1, new Uint8Array([0x80]))) === null, "bad nested blessing_data does not become an empty table");
  assert(
    loggedWish !== null &&
      loggedWish.pools.length === 1 &&
      loggedWish.pools[0].type === 1 &&
      loggedWish.pools[0].refreshTimes === 4 &&
      loggedWish.pools[0].luckyValue === 7 &&
      loggedWish.pools[0].luckyRewardId === 9 &&
      loggedWish.pools[0].refreshTime === 1792400000 &&
      loggedWish.pools[0].marks.length === 1 &&
      loggedWish.pools[0].marks[0].field === 7 &&
      loggedWish.pools[0].marks[0].text === "5" &&
      loggedWish.pools[0].slots.length === 2 &&
      formatWireWishHead(loggedWish.pools[0]) ===
        "type=1 / refresh_times=4 / lucky_value=7 / lucky_reward_id=9 / refresh_time=1792400000 / 字段7=5" &&
      formatWireWishSlot(loggedWish.pools[0].slots[0]) === "position=1 / times=2 / item=字段1=101,字段2=3" &&
      formatWireWishSlot(loggedWish.pools[0].slots[1]) === "position=2 / times=0 / item=未解" &&
      wireWishNote(loggedWish).indexOf(WIRE_WISH_SIDE_EFFECT) >= 0 &&
      wireWishNote(loggedWish).indexOf("不写金币") >= 0 &&
      wireWishNote(loggedWish).indexOf("不写钻石") >= 0 &&
      wireWishNote(loggedWish).indexOf("item_id") < 0,
    "27001 sample keeps named pool fields and writes unknown item numbers"
  );
  const wishMissing = decodeWireWish(fieldBytes(1, fieldVarint(1, 2)));
  assert(
    wishMissing !== null &&
      formatWireWishHead(wishMissing.pools[0]) === "type=2 / refresh_times=无 / lucky_value=无 / lucky_reward_id=无 / refresh_time=无",
    "missing wish numbers stay blank"
  );
  const wishSticky = decodeFrames(concatBytes(encodeFrame(WireCmd.blessingPool, wishOuterOnly), encodeFrame(WireCmd.heartbeat)));
  assert(
    wishSticky.frames.length === 2 &&
      wishSticky.frames[0].cmdId === 27001 &&
      wishSticky.frames[1].cmdId === WireCmd.heartbeat &&
      decodeWireWish(wishSticky.frames[0].body)?.pools.length === 0 &&
      decodeWireWish(wishSticky.frames[0].body)?.marks.length === 1,
    "sticky 27001 frame stops at its length prefix"
  );
  const loggedSummon = decodeWireSummon(summonBody);
  assert(
    WireCmd.heroSummonCount === 4004 &&
      WireCmd.heroList === 4001 &&
      CmdId.summonPull === 1501 &&
      CmdId.heroList === 1401,
    "online 4004 stays off the placeholder summon id and off hero list 4001"
  );
  assert(bytesToHex(encodeFrame(WireCmd.heroSummonCount)) === "04000000a40f0000", "empty c2s 4004");
  assert(bytesToHex(encodeFrame(WireCmd.heroList)) === "04000000a10f0000", "bare 4001 is not the 4004 frame");
  assert(bytesToHex(encodeFrame(4002)) !== "04000000a40f0000", "4002 is not the 4004 frame");
  assert(bytesToHex(encodeFrame(4005)) !== "04000000a40f0000", "4005 is not the 4004 frame");
  assert(bytesToHex(encodeFrame(58001)) !== "04000000a40f0000", "58001 is not the 4004 frame");
  assert(bytesToHex(encodeFrame(58007)) !== "04000000a40f0000", "58007 is not the 4004 frame");
  assert(bytesToHex(encodeFrame(4201)) !== "04000000a40f0000", "4201 is not the 4004 frame");
  assert(bytesToHex(encodeFrame(WireCmd.blessingPool)) !== "04000000a40f0000", "27001 is not the 4004 frame");
  assert(WIRE_SUMMON_READONLY_TITLE === "召唤（真服只读）", "readonly summon title");
  assert(WIRE_SUMMON_UNSYNCED_TOAST === "真服未同步", "unsynced summon toast");
  assert(
    WIRE_SUMMON_SIDE_EFFECT.indexOf("懒建") >= 0 &&
      WIRE_SUMMON_SIDE_EFFECT.indexOf("HeroSummon") >= 0 &&
      WIRE_SUMMON_SIDE_EFFECT.indexOf("page") >= 0 &&
      WIRE_SUMMON_READONLY_NOTE.indexOf("不召唤") >= 0 &&
      WIRE_SUMMON_READONLY_NOTE.indexOf("不领累积奖") >= 0 &&
      WIRE_SUMMON_READONLY_NOTE.indexOf("4002") >= 0 &&
      WIRE_SUMMON_READONLY_NOTE.indexOf("4005") >= 0 &&
      WIRE_SUMMON_READONLY_NOTE.indexOf("58001") >= 0 &&
      WIRE_SUMMON_READONLY_NOTE.indexOf("58007") >= 0 &&
      WIRE_SUMMON_READONLY_NOTE.indexOf("4201") >= 0 &&
      WIRE_SUMMON_READONLY_NOTE.indexOf("不写金币") >= 0 &&
      WIRE_SUMMON_READONLY_NOTE.indexOf("不写钻石") >= 0 &&
      WIRE_SUMMON_READONLY_NOTE.indexOf("4001") >= 0 &&
      WIRE_SUMMON_FIELD_NOTE.indexOf("free_time") >= 0 &&
      WIRE_SUMMON_FIELD_NOTE.indexOf("senior_free_time") >= 0 &&
      WIRE_SUMMON_FIELD_NOTE.indexOf("不写成 0") >= 0,
    "summon page names the count fields and refuses the paid cmds"
  );
  assert(
    decodeWireSummon(new Uint8Array(0)) !== null &&
      decodeWireSummon(new Uint8Array(0))?.freeTime === null &&
      decodeWireSummon(new Uint8Array(0))?.seniorFreeTime === null,
    "empty 4004 body is synced and does not invent zeros"
  );
  assert(decodeWireSummon(new Uint8Array([0x80])) === null, "bad 4004 ignored");
  const summonZeroSnap = decodeWireSummon(summonZero);
  assert(
    summonZeroSnap !== null && formatWireSummonLine(summonZeroSnap) === "free_time=0 / senior_free_time=无",
    "present zero stays zero and a missing count stays blank"
  );
  assert(
    loggedSummon !== null &&
      loggedSummon.freeTime === 2 &&
      loggedSummon.seniorFreeTime === 5 &&
      loggedSummon.marks.length === 1 &&
      loggedSummon.marks[0].field === 6 &&
      formatWireSummonLine(loggedSummon) === "free_time=2 / senior_free_time=5 / 字段6=8" &&
      wireSummonNote(loggedSummon).indexOf(WIRE_SUMMON_SIDE_EFFECT) >= 0 &&
      wireSummonNote(loggedSummon).indexOf("不写金币") >= 0 &&
      wireSummonNote(loggedSummon).indexOf("不写钻石") >= 0,
    "4004 sample keeps free_time and senior_free_time"
  );
  const summonSticky = decodeFrames(concatBytes(encodeFrame(WireCmd.heroSummonCount, summonOuterOnly), encodeFrame(WireCmd.heartbeat)));
  assert(
    summonSticky.frames.length === 2 &&
      summonSticky.frames[0].cmdId === 4004 &&
      summonSticky.frames[1].cmdId === WireCmd.heartbeat &&
      decodeWireSummon(summonSticky.frames[0].body)?.freeTime === null &&
      decodeWireSummon(summonSticky.frames[0].body)?.marks.length === 1,
    "sticky 4004 frame stops at its length prefix"
  );
  const loggedProphet = decodeWireProphet(prophetBody);
  assert(
    WireCmd.prophetSummon === 13044 && CmdId.summonPull === 1501 && WireCmd.heroSummonCount === 4004,
    "online 13044 stays off the placeholder summon id and off summon count 4004"
  );
  assert(bytesToHex(encodeFrame(WireCmd.prophetSummon)) === "04000000f4320000", "empty c2s 13044");
  assert(bytesToHex(encodeFrame(13041)) !== "04000000f4320000", "13041 is not the 13044 frame");
  assert(bytesToHex(encodeFrame(13042)) !== "04000000f4320000", "13042 is not the 13044 frame");
  assert(bytesToHex(encodeFrame(13043)) !== "04000000f4320000", "13043 is not the 13044 frame");
  assert(bytesToHex(encodeFrame(58007)) !== "04000000f4320000", "58007 is not the 13044 frame");
  assert(bytesToHex(encodeFrame(4201)) !== "04000000f4320000", "4201 is not the 13044 frame");
  assert(bytesToHex(encodeFrame(WireCmd.heroSummonCount)) !== "04000000f4320000", "4004 is not the 13044 frame");
  assert(WIRE_PROPHET_READONLY_TITLE === "先知召唤（真服只读）", "readonly prophet title");
  assert(WIRE_PROPHET_UNSYNCED_TOAST === "真服未同步", "unsynced prophet toast");
  assert(WIRE_PROPHET_EMPTY === "空表", "empty prophet table label");
  assert(
    WIRE_PROPHET_SIDE_EFFECT.indexOf("懒建") >= 0 &&
      WIRE_PROPHET_SIDE_EFFECT.indexOf("HeroSummon") >= 0 &&
      WIRE_PROPHET_SIDE_EFFECT.indexOf("levelResetTimes") >= 0 &&
      WIRE_PROPHET_READONLY_NOTE.indexOf("不抽") >= 0 &&
      WIRE_PROPHET_READONLY_NOTE.indexOf("不置换") >= 0 &&
      WIRE_PROPHET_READONLY_NOTE.indexOf("不确认置换") >= 0 &&
      WIRE_PROPHET_READONLY_NOTE.indexOf("13041") >= 0 &&
      WIRE_PROPHET_READONLY_NOTE.indexOf("13042") >= 0 &&
      WIRE_PROPHET_READONLY_NOTE.indexOf("13043") >= 0 &&
      WIRE_PROPHET_READONLY_NOTE.indexOf("58007") >= 0 &&
      WIRE_PROPHET_READONLY_NOTE.indexOf("4201") >= 0 &&
      WIRE_PROPHET_READONLY_NOTE.indexOf("不写金币") >= 0 &&
      WIRE_PROPHET_READONLY_NOTE.indexOf("不写钻石") >= 0 &&
      WIRE_PROPHET_READONLY_NOTE.indexOf("4004") >= 0 &&
      WIRE_PROPHET_FIELD_NOTE.indexOf("type") >= 0 &&
      WIRE_PROPHET_FIELD_NOTE.indexOf("lucky") >= 0 &&
      WIRE_PROPHET_FIELD_NOTE.indexOf("不写成 0") >= 0,
    "prophet page names type and lucky and refuses the write cmds"
  );
  assert(
    decodeWireProphet(new Uint8Array(0)) !== null &&
      decodeWireProphet(new Uint8Array(0))?.luckys.length === 0 &&
      formatWireProphetHead(decodeWireProphet(new Uint8Array(0)) || { luckys: [], marks: [] }) === "空表",
    "empty 13044 body is synced and does not invent zeros"
  );
  assert(decodeWireProphet(new Uint8Array([0x80])) === null, "bad 13044 ignored");
  assert(decodeWireProphet(fieldBytes(1, new Uint8Array([0x80]))) === null, "bad nested lucky does not become an empty table");
  const prophetMissingSnap = decodeWireProphet(prophetMissing);
  assert(
    prophetMissingSnap !== null &&
      prophetMissingSnap.luckys.length === 1 &&
      formatWireProphetLine(prophetMissingSnap.luckys[0]) === "type=2 / lucky=无",
    "missing lucky stays blank and is not written as 0"
  );
  assert(
    loggedProphet !== null &&
      loggedProphet.luckys.length === 2 &&
      loggedProphet.luckys[0].type === 1 &&
      loggedProphet.luckys[0].lucky === 3 &&
      loggedProphet.luckys[1].type === null &&
      loggedProphet.luckys[1].lucky === 0 &&
      loggedProphet.luckys[1].marks.length === 1 &&
      loggedProphet.luckys[1].marks[0].field === 6 &&
      loggedProphet.marks.length === 1 &&
      loggedProphet.marks[0].field === 4 &&
      formatWireProphetLine(loggedProphet.luckys[0]) === "type=1 / lucky=3" &&
      formatWireProphetLine(loggedProphet.luckys[1]) === "type=无 / lucky=0 / 字段6=4" &&
      formatWireProphetHead(loggedProphet) === "2 条 / 字段4=9" &&
      wireProphetNote(loggedProphet).indexOf(WIRE_PROPHET_SIDE_EFFECT) >= 0 &&
      wireProphetNote(loggedProphet).indexOf("不写金币") >= 0 &&
      wireProphetNote(loggedProphet).indexOf("不写钻石") >= 0,
    "13044 sample keeps type and lucky and does not fill missing type with 0"
  );
  const prophetSticky = decodeFrames(concatBytes(encodeFrame(WireCmd.prophetSummon, prophetOuterOnly), encodeFrame(WireCmd.heartbeat)));
  assert(
    prophetSticky.frames.length === 2 &&
      prophetSticky.frames[0].cmdId === 13044 &&
      prophetSticky.frames[1].cmdId === WireCmd.heartbeat &&
      decodeWireProphet(prophetSticky.frames[0].body)?.luckys.length === 0 &&
      decodeWireProphet(prophetSticky.frames[0].body)?.marks.length === 1,
    "sticky 13044 frame stops at its length prefix"
  );
  const loggedJewel = decodeWireJewel(jewelBody);
  assert(
    WireCmd.heroJewel === 4101 && WireCmd.heroList === 4001 && WireCmd.prophetSummon === 13044,
    "online 4101 stays off the hero list 4001 and prophet 13044"
  );
  assert(bytesToHex(encodeFrame(WireCmd.heroJewel)) === "0400000005100000", "empty c2s 4101");
  assert(bytesToHex(encodeFrame(4102)) !== "0400000005100000", "4102 is not the 4101 frame");
  assert(bytesToHex(encodeFrame(4103)) !== "0400000005100000", "4103 is not the 4101 frame");
  assert(bytesToHex(encodeFrame(4104)) !== "0400000005100000", "4104 is not the 4101 frame");
  assert(bytesToHex(encodeFrame(4105)) !== "0400000005100000", "4105 is not the 4101 frame");
  assert(bytesToHex(encodeFrame(4106)) !== "0400000005100000", "4106 is not the 4101 frame");
  assert(bytesToHex(encodeFrame(4107)) !== "0400000005100000", "4107 is not the 4101 frame");
  assert(bytesToHex(encodeFrame(9001)) !== "0400000005100000", "9001 is not the 4101 frame");
  assert(bytesToHex(encodeFrame(WireCmd.heroList)) !== "0400000005100000", "4001 is not the 4101 frame");
  assert(bytesToHex(encodeFrame(WireCmd.prophetSummon)) !== "0400000005100000", "13044 is not the 4101 frame");
  assert(WIRE_JEWEL_READONLY_TITLE === "英雄宝石（真服只读）", "readonly jewel title");
  assert(WIRE_JEWEL_UNSYNCED_TOAST === "真服未同步", "unsynced jewel toast");
  assert(WIRE_JEWEL_EMPTY === "空表", "empty jewel table label");
  assert(
    WIRE_JEWEL_SIDE_EFFECT.indexOf("无写库") >= 0 &&
      WIRE_JEWEL_SIDE_EFFECT.indexOf("无 page") >= 0 &&
      WIRE_JEWEL_SIDE_EFFECT.indexOf("空体安全") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("不替换") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("不卸下") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("不一键穿") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("不一键卸") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("不合成") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("不一键合成") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("4102") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("4103") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("4104") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("4105") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("4106") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("4107") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("9001") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("不写金币") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("不写钻石") >= 0 &&
      WIRE_JEWEL_READONLY_NOTE.indexOf("4001") >= 0 &&
      WIRE_JEWEL_FIELD_NOTE.indexOf("hero_id") >= 0 &&
      WIRE_JEWEL_FIELD_NOTE.indexOf("jewel_id") >= 0 &&
      WIRE_JEWEL_FIELD_NOTE.indexOf("place") >= 0 &&
      WIRE_JEWEL_FIELD_NOTE.indexOf("jewel_type") >= 0 &&
      WIRE_JEWEL_FIELD_NOTE.indexOf("不写成 0") >= 0,
    "jewel page names hero and jewel fields and refuses the write cmds"
  );
  assert(
    decodeWireJewel(new Uint8Array(0)) !== null &&
      decodeWireJewel(new Uint8Array(0))?.heroes.length === 0 &&
      formatWireJewelHead(decodeWireJewel(new Uint8Array(0)) || { heroes: [], marks: [] }) === "空表",
    "empty 4101 body is synced and does not invent zeros"
  );
  assert(decodeWireJewel(new Uint8Array([0x80])) === null, "bad 4101 ignored");
  assert(decodeWireJewel(fieldBytes(1, new Uint8Array([0x80]))) === null, "4101 hero blob that fails is not an empty table");
  const jewelMissingSnap = decodeWireJewel(jewelMissing);
  assert(
    jewelMissingSnap !== null &&
      jewelMissingSnap.heroes.length === 1 &&
      jewelMissingSnap.heroes[0].heroId === null &&
      jewelMissingSnap.heroes[0].jewels.length === 1 &&
      formatWireJewelHero(jewelMissingSnap.heroes[0]) === "hero_id=无 / 1 颗" &&
      formatWireJewelLine(jewelMissingSnap.heroes[0].jewels[0]) === "jewel_id=8 / place=无 / jewel_type=无",
    "missing 4101 numbers stay blank"
  );
  assert(
    loggedJewel !== null &&
      loggedJewel.heroes.length === 2 &&
      loggedJewel.heroes[0].heroId === 16 &&
      loggedJewel.heroes[0].jewels.length === 1 &&
      loggedJewel.heroes[0].jewels[0].jewelId === 7 &&
      loggedJewel.heroes[0].jewels[0].place === 1 &&
      loggedJewel.heroes[0].jewels[0].jewelType === 2 &&
      loggedJewel.heroes[1].heroId === null &&
      loggedJewel.heroes[1].jewels[0].jewelId === null &&
      loggedJewel.heroes[1].jewels[0].place === 0 &&
      loggedJewel.heroes[1].jewels[0].jewelType === null &&
      loggedJewel.marks.length === 1 &&
      loggedJewel.marks[0].field === 4 &&
      formatWireJewelHero(loggedJewel.heroes[1]) === "hero_id=无 / 1 颗 / 字段5=9" &&
      formatWireJewelLine(loggedJewel.heroes[1].jewels[0]) === "jewel_id=无 / place=0 / jewel_type=无 / 字段6=4" &&
      wireJewelNote(loggedJewel).indexOf(WIRE_JEWEL_SIDE_EFFECT) >= 0 &&
      wireJewelNote(loggedJewel).indexOf("不写金币") >= 0 &&
      wireJewelNote(loggedJewel).indexOf("不写钻石") >= 0,
    "4101 sample keeps hero_id jewel_id place and jewel_type and does not fill missing numbers with 0"
  );
  const jewelSticky = decodeFrames(concatBytes(encodeFrame(WireCmd.heroJewel, jewelOuterOnly), encodeFrame(WireCmd.heartbeat)));
  assert(
    jewelSticky.frames.length === 2 &&
      jewelSticky.frames[0].cmdId === 4101 &&
      jewelSticky.frames[1].cmdId === WireCmd.heartbeat &&
      decodeWireJewel(jewelSticky.frames[0].body)?.heroes.length === 0 &&
      decodeWireJewel(jewelSticky.frames[0].body)?.marks.length === 1,
    "sticky 4101 frame stops at its length prefix"
  );
  const loggedIllustrat = decodeWireIllustrat(illustratBody);
  assert(
    WireCmd.illustratReward === 4013 && WireCmd.heroList === 4001 && WireCmd.heroJewel === 4101,
    "online 4013 stays off the hero list 4001 and jewel 4101"
  );
  assert(bytesToHex(encodeFrame(WireCmd.illustratReward)) === "04000000ad0f0000", "empty c2s 4013");
  assert(bytesToHex(encodeFrame(4014)) !== "04000000ad0f0000", "4014 is not the 4013 frame");
  assert(bytesToHex(encodeFrame(WireCmd.heroList)) !== "04000000ad0f0000", "4001 is not the 4013 frame");
  assert(bytesToHex(encodeFrame(WireCmd.heroJewel)) !== "04000000ad0f0000", "4101 is not the 4013 frame");
  assert(WIRE_ILLUSTRAT_READONLY_TITLE === "英雄图鉴（真服只读）", "readonly illustrat title");
  assert(WIRE_ILLUSTRAT_UNSYNCED_TOAST === "真服未同步", "unsynced illustrat toast");
  assert(WIRE_ILLUSTRAT_EMPTY === "空表", "empty illustrat table label");
  assert(
    WIRE_ILLUSTRAT_SIDE_EFFECT.indexOf("懒建") >= 0 &&
      WIRE_ILLUSTRAT_SIDE_EFFECT.indexOf("可接受") >= 0 &&
      WIRE_ILLUSTRAT_SIDE_EFFECT.indexOf("空体安全") >= 0 &&
      WIRE_ILLUSTRAT_READONLY_NOTE.indexOf("不把 4013 当领奖") >= 0 &&
      WIRE_ILLUSTRAT_READONLY_NOTE.indexOf("不发 4014") >= 0 &&
      WIRE_ILLUSTRAT_READONLY_NOTE.indexOf("不写金币") >= 0 &&
      WIRE_ILLUSTRAT_READONLY_NOTE.indexOf("不写钻石") >= 0 &&
      WIRE_ILLUSTRAT_READONLY_NOTE.indexOf("4001") >= 0 &&
      WIRE_ILLUSTRAT_READONLY_NOTE.indexOf("4101") >= 0 &&
      WIRE_ILLUSTRAT_FIELD_NOTE.indexOf("hero_type") >= 0 &&
      WIRE_ILLUSTRAT_FIELD_NOTE.indexOf("star") >= 0 &&
      WIRE_ILLUSTRAT_FIELD_NOTE.indexOf("不写成 0") >= 0,
    "illustrat page names hero_type and star and refuses 4014"
  );
  assert(
    decodeWireIllustrat(new Uint8Array(0)) !== null &&
      decodeWireIllustrat(new Uint8Array(0))?.rows.length === 0 &&
      formatWireIllustratHead(decodeWireIllustrat(new Uint8Array(0)) || { rows: [], marks: [] }) === "空表",
    "empty 4013 body is synced and does not invent zeros"
  );
  assert(decodeWireIllustrat(new Uint8Array([0x80])) === null, "bad 4013 ignored");
  assert(decodeWireIllustrat(fieldBytes(1, new Uint8Array([0x80]))) === null, "4013 row blob that fails is not an empty table");
  const illustratMissingSnap = decodeWireIllustrat(illustratMissing);
  assert(
    illustratMissingSnap !== null &&
      illustratMissingSnap.rows.length === 1 &&
      illustratMissingSnap.rows[0].heroType === 8 &&
      illustratMissingSnap.rows[0].star === null &&
      formatWireIllustratLine(illustratMissingSnap.rows[0]) === "hero_type=8 / star=无",
    "missing 4013 star stays blank"
  );
  assert(
    loggedIllustrat !== null &&
      loggedIllustrat.rows.length === 2 &&
      loggedIllustrat.rows[0].heroType === 102 &&
      loggedIllustrat.rows[0].star === 5 &&
      loggedIllustrat.rows[1].heroType === null &&
      loggedIllustrat.rows[1].star === 0 &&
      loggedIllustrat.marks.length === 1 &&
      loggedIllustrat.marks[0].field === 4 &&
      formatWireIllustratLine(loggedIllustrat.rows[1]) === "hero_type=无 / star=0 / 字段6=4" &&
      formatWireIllustratHead(loggedIllustrat) === "2 条 / 字段4=3" &&
      wireIllustratNote(loggedIllustrat).indexOf(WIRE_ILLUSTRAT_SIDE_EFFECT) >= 0 &&
      wireIllustratNote(loggedIllustrat).indexOf("不写金币") >= 0 &&
      wireIllustratNote(loggedIllustrat).indexOf("不写钻石") >= 0,
    "4013 sample keeps hero_type and star and does not fill missing hero_type with 0"
  );
  const illustratSticky = decodeFrames(concatBytes(encodeFrame(WireCmd.illustratReward, illustratOuterOnly), encodeFrame(WireCmd.heartbeat)));
  assert(
    illustratSticky.frames.length === 2 &&
      illustratSticky.frames[0].cmdId === 4013 &&
      illustratSticky.frames[1].cmdId === WireCmd.heartbeat &&
      decodeWireIllustrat(illustratSticky.frames[0].body)?.rows.length === 0 &&
      decodeWireIllustrat(illustratSticky.frames[0].body)?.marks.length === 1,
    "sticky 4013 frame stops at its length prefix"
  );
  assert(formatWireMainline(null, null) === "主线 · 未同步", "chapter label before 3007");
  assert(formatWireMainline(null, 0) === "主线 · 最高 0", "max_idx 0 is a real zero");
  assert(formatWireMainline(0, null) === "主线 · 当前 0", "now_idx 0 is a real zero");
  assert(formatWireMainline(4, 9) === "主线 · 当前 4 / 最高 9", "both idx on the label");
  assert(WIRE_MAINLINE_READONLY_TITLE === "主线（真服只读）", "readonly chapter title");
  assert(WIRE_MAINLINE_READONLY_NOTE === "本轮不发进关协议，不挑战", "readonly chapter note");
  assert(formatWireChapterIdx("now", null) === "当前 idx 未同步", "missing now_idx on the page");
  assert(formatWireChapterIdx("max", null) === "最高 idx 未同步", "missing max_idx on the page");
  assert(formatWireChapterIdx("max", 0) === "最高 idx 0", "max_idx 0 stays on the page");
  assert(formatWireChapterIdx("now", 4) === "当前 idx 4", "now_idx on the page");
  const loginBody = encodeObservedLoginBody(960011, 1792466798);
  assert(
    bytesToHex(loginBody) === "2a0a31373932343636373938108bcc3a080718023a0d6d787a672d7765622d3130303132086c6f63616c646576",
    "login body matches log"
  );
  const capturedA = hexToBytes("080718023a0d6d787a672d7765622d313030312a0a31373932343634393031106f32086c6f63616c646576");
  const fieldsA = decodeProtoFields(capturedA);
  assert(varintField(fieldsA, 1) === 7 && varintField(fieldsA, 2) === 111 && varintField(fieldsA, 3) === 2, "login sample A ints");
  assert(textField(fieldsA, 5) === "1792464901" && textField(fieldsA, 6) === "localdev" && textField(fieldsA, 7) === "mxzg-web-1001", "login sample A strings");
  const encoded111 = encodeObservedLoginBody(111, 1792464901);
  const fields111 = decodeProtoFields(encoded111);
  assert(
    varintField(fields111, 1) === 7 &&
      varintField(fields111, 2) === 111 &&
      varintField(fields111, 3) === 2 &&
      textField(fields111, 5) === "1792464901" &&
      textField(fields111, 6) === "localdev" &&
      textField(fields111, 7) === "mxzg-web-1001",
    "uid 111 fields match the log"
  );
  assert(uidFromAccount("960011") === 960011 && uidFromAccount("mock") === null && uidFromAccount("0") === null, "uid parse");
  const created = encodeObservedCreateBody("见习冒险家");
  const createdFields = decodeProtoFields(created || new Uint8Array(0));
  assert(created !== null && textField(createdFields, 1) === "见习冒险家" && varintField(createdFields, 2) === 0, "create body");
  assert(encodeObservedCreateBody("  ") === null, "blank create");
  const beat = encodeFrame(WireCmd.heartbeat);
  const loginFrame = encodeFrame(WireCmd.login, loginBody);
  const sticky = concatBytes(beat, loginFrame);
  const head = decodeFrames(sticky.subarray(0, 5));
  assert(head.frames.length === 0 && head.rest.length === 5 && head.fatal === false, "partial frame waits");
  const done = decodeFrames(concatBytes(head.rest, sticky.subarray(5)));
  assert(done.frames.length === 2 && done.frames[0].cmdId === 1004 && done.frames[1].cmdId === 1001 && done.rest.length === 0, "sticky frames");
  const bad = decodeFrames(new Uint8Array(8));
  assert(bad.fatal && bad.frames.length === 0, "zero length is fatal");
  assert(readObservedCmdId(exactCopy(encodeFrame(1004))) === 1004, "legacy heartbeat bytes");
  assert(readObservedCmdId(exactCopy(encodeFrame(1001, loginBody))) === 1001, "legacy login bytes");
  assert(readObservedCmdId(leFrame(1002, 7)) === null, "short frame");
  const silentWait = explainWireTimeout(["发送 c2s 1004 帧长 8", "发送 c2s 1001 帧长 53"]);
  assert(silentWait.detail.indexOf("s2c=无") >= 0 && silentWait.detail.indexOf("心跳1004回包=无") >= 0 && silentWait.detail.indexOf("登录1001回包=无") >= 0, "silent flags");
  assert(silentWait.summary.indexOf("start-ws-bridge.bat") >= 0 && silentWait.summary.indexOf("13101") >= 0, "silent hint");
  assert(silentWait.tail.length === 2, "short tail kept");
  const beatOnly = explainWireTimeout(["发送 c2s 1004 帧长 8", "收到 s2c 1004 帧长 15", "发送 c2s 1001 帧长 53"]);
  assert(beatOnly.detail.indexOf("心跳1004回包=有") >= 0 && beatOnly.detail.indexOf("登录1001回包=无") >= 0, "beat without login");
  const other = explainWireTimeout(["发送 c2s 1001 帧长 53", "收到 s2c 1005 帧长 8"]);
  assert(other.detail.indexOf("s2c=有") >= 0 && other.detail.indexOf("心跳1004回包=无") >= 0, "1005 is not heartbeat");
  const manyWs: string[] = [];
  for (let i = 0; i < 8; i++) manyWs.push("收到 s2c 1005 帧长 1 " + i);
  const trimmedWait = explainWireTimeout(manyWs);
  assert(trimmedWait.tail.length === 6 && trimmedWait.tail[5].indexOf("7") >= 0, "tail is last 6");
  const noSend = explainWireTimeout([]);
  assert(noSend.summary.indexOf("没有发出登录 1001") >= 0 && noSend.tail.length === 0, "empty log");

  const host = globalThis as { location?: { search?: string }; parent?: { location?: { search?: string } } };
  const prevLocation = host.location;
  const prevParent = host.parent;
  try {
    host.location = { search: "" };
    host.parent = { location: { search: "?transport=ws" } };
    assert(readPreviewTransport().kind === "ws", "parent query");
    host.location = { search: "?transport=mock" };
    assert(readPreviewTransport().kind === "mock", "own query wins");
  } finally {
    host.location = prevLocation;
    host.parent = prevParent;
  }

  const lines: string[] = [];
  const off = GameLog.shared.subscribe((line) => {
    if (line.tag === "Ws") lines.push(line.message);
  });
  try {
    const refused = new FakeSocket();
    const refusedTransport = new WsTransport({
      connectTimeoutMs: 200,
      factory: () => refused,
    });
    let refusedText = "";
    const refusedPromise = refusedTransport.connect(DEFAULT_WS_URL);
    setTimeout(() => refused.fail(), 0);
    try {
      await refusedPromise;
    } catch (err) {
      refusedText = messageOf(err);
    }
    assert(refusedText === "服未启动", "refuse text " + refusedText);
    assert(sawLog(lines, "正在连接") && sawLog(lines, "出错") && sawLog(lines, "已关闭"), "refuse logs");
    assert(refused.sent.length === 0, "refuse sends nothing");

    lines.length = 0;
    const hung = new FakeSocket();
    const hungTransport = new WsTransport({
      connectTimeoutMs: 40,
      factory: () => hung,
    });
    let timeoutText = "";
    try {
      await hungTransport.connect(DEFAULT_WS_URL);
    } catch (err) {
      timeoutText = messageOf(err);
    }
    assert(timeoutText === "连接超时", "timeout text");
    assert(sawLog(lines, "出错 连接超时") && sawLog(lines, "已关闭"), "timeout logs");

    lines.length = 0;
    const sockets: FakeSocket[] = [];
    const transport = new WsTransport({
      connectTimeoutMs: 200,
      factory: () => {
        const socket = new FakeSocket();
        sockets.push(socket);
        setTimeout(() => socket.open(), 0);
        return socket;
      },
    });
    let dispatched = 0;
    transport.onMessage(() => {
      dispatched += 1;
    });
    const net = new NetClient(transport, {
      heartbeatMs: 60000,
      reconnectDelayMs: 20,
      maxReconnect: 0,
      requestTimeoutMs: 200,
    });
    await net.connect(DEFAULT_WS_URL);
    assert(net.state === "connected" && sockets.length === 1, "ws connected");
    assert(sawLog(lines, "已打开 " + DEFAULT_WS_URL), "open log");
    assert(sockets[0].sent.length === 1, "heartbeat goes out on open");
    assert(bytesToHex(new Uint8Array(sockets[0].sent[0] as ArrayBuffer)) === "04000000ec030000", "open heartbeat bytes");
    net.send("login", { account: "960011", nowSec: 1792466798 });
    net.send("heartbeat", { clientTime: 1 });
    net.send("stage.enter", { stageId: 1 });
    assert(sockets[0].sent.length === 3, "login and heartbeat are on the wire");
    assert(bytesToHex(new Uint8Array(sockets[0].sent[1] as ArrayBuffer)) === bytesToHex(encodeFrame(1001, loginBody)), "login frame");
    assert(bytesToHex(new Uint8Array(sockets[0].sent[2] as ArrayBuffer)) === "04000000ec030000", "later heartbeat");
    assert(sawLog(lines, "发送 c2s 1004") && sawLog(lines, "发送 c2s 1001") && sawLog(lines, "未发送 stage.enter"), "wire log");
    const seen: string[] = [];
    net.subscribe("*", (msg) => seen.push(msg.cmd));
    const replyBeat = encodeFrame(1004, hexToBytes("08ae8f91a79534"));
    const replyNotice = encodeFrame(1005, hexToBytes("08c58d02"));
    const packed = concatBytes(replyBeat, replyNotice);
    sockets[0].push(packed.subarray(0, 4));
    assert(seen.length === 0, "half frame is not a message yet");
    sockets[0].push(packed.subarray(4));
    sockets[0].push("hello");
    assert(dispatched === 0, "NetClient owns the message handler");
    assert(seen.length === 2 && seen[0] === "heartbeat" && seen[1] === "wire.1005", "sticky replies " + seen.join(","));
    assert(sawLog(lines, "收到 s2c 1004") && sawLog(lines, "收到 s2c 1005") && sawLog(lines, "字段1=34501") && sawLog(lines, "收到文本"), "inbound log");
    sockets[0].push(new Uint8Array(8));
    assert(sawLog(lines, "帧长度异常"), "bad length");
    sockets[0].serverClose(1006);
    assert(net.state === "closed", "peer close stops reconnect");
    assert(sawLog(lines, "已关闭 code=1006"), "close code");

    const roleBody = concatBytes(fieldVarint(1, 1000002), fieldVarint(4, 28800));
    const summary = summarizeLoginReply(roleBody);
    assert(wireRoleReady(summary) && summary.roleId === 1000002, "role 1000002 is ready");
    assert(summary.detail.indexOf("进入主城") >= 0 && summary.detail.indexOf("不进主城") < 0, "role copy enters city");
    const emptyLogin = summarizeLoginReply(new Uint8Array(0));
    assert(emptyLogin.empty && !wireRoleReady(emptyLogin) && emptyLogin.detail.indexOf("创角") >= 0, "empty 1001 stays on create");
    const nameless = summarizeLoginReply(fieldVarint(4, 28800));
    assert(!wireRoleReady(nameless) && nameless.detail.indexOf("不进主城") >= 0, "no role id stays out");

    const snapAccount = Session.account;
    const snapToken = Session.token;
    const snapServerId = Session.serverId;
    const snapServerName = Session.serverName;
    const snapRole = Session.role;
    const snapDay = Session.openDay;
    const snapStage = Session.stageId;
    const snapGold = Session.gold;
    const snapDiamond = Session.diamond;
    const snapSource = Session.source;
    try {
      Session.gold = 100;
      Session.diamond = 20;
      Session.applyWireRole({ account: "111", serverId: 1, roleId: 1000002, name: "  " });
      assert(Session.source === "wire" && Session.gold === 0 && Session.diamond === 0, "wire drops mock wallet");
      assert(Session.role?.name === "角色 1000002" && Session.role.level === 1, "wire name is the role id");
      assert(formatNameLine() === "角色 1000002", "wire name line hides placeholder level");
      assert(formatSubLine() === "真服 · 角色 1000002", "wire sub line");
      assert(formatGoldLine() === "金币 未同步" && formatDiamondLine() === "钻石 未同步", "wire currency lines");
      assert(formatHubIdentity() === "角色 1000002 · 真服", "wire hub");
      Session.applyWireRole({ account: "111", serverId: 2, roleId: 1000002, name: "见习冒险家" });
      assert(formatNameLine() === "见习冒险家" && Session.serverName === "提审", "create name is shown");
      assert(formatGoldLine() === "金币 未同步", "typed name still unsynced");
      Session.applyEnter({ roleId: 9, name: "甲", level: 2, gold: 3, diamond: 4 });
      assert(Session.source === "mock" && formatGoldLine() === "金币 3" && formatNameLine() === "甲 Lv2", "mock enter restores numbers");
    } finally {
      Session.account = snapAccount;
      Session.token = snapToken;
      Session.serverId = snapServerId;
      Session.serverName = snapServerName;
      Session.role = snapRole;
      Session.openDay = snapDay;
      Session.stageId = snapStage;
      Session.gold = snapGold;
      Session.diamond = snapDiamond;
      Session.source = snapSource;
      Session.wireSync.name = false;
      Session.wireSync.level = false;
      Session.wireSync.gold = false;
      Session.wireSync.diamond = false;
    }

    lines.length = 0;
    const floodSockets: FakeSocket[] = [];
    const floodTransport = new WsTransport({
      connectTimeoutMs: 200,
      factory: () => {
        const socket = new FakeSocket();
        floodSockets.push(socket);
        setTimeout(() => socket.open(), 0);
        return socket;
      },
    });
    const floodNet = new NetClient(floodTransport, {
      heartbeatMs: 60000,
      reconnectDelayMs: 20,
      maxReconnect: 0,
      requestTimeoutMs: 400,
    });
    await floodNet.connect(DEFAULT_WS_URL);
    const seenFlood: string[] = [];
    floodNet.subscribe("*", (msg) => seenFlood.push(msg.cmd));
    const pendingLogin = floodNet.request("login", { account: "111", nowSec: 1 }, 400);
    const big = new Uint8Array(200);
    const flood = joinFrames([
      encodeFrame(1001, roleBody),
      encodeFrame(28000, new Uint8Array(8)),
      encodeFrame(28103),
      encodeFrame(20005),
      encodeFrame(25001),
      encodeFrame(23000),
      encodeFrame(21013),
      encodeFrame(50000, big),
    ]);
    floodSockets[0].push(flood);
    const loginMsg = await pendingLogin;
    const loginSummary = summarizeLoginReply(wireBody(loginMsg.data));
    assert(loginSummary.roleId === 1000002, "login resolves to the role frame");
    assert(seenFlood.indexOf("wire.28000") >= 0 && seenFlood.indexOf("wire.50000") >= 0, "pushes stay wire.* " + seenFlood.join(","));
    assert(seenFlood.indexOf("login") >= 0, "1001 is still login");
    assert(sawLog(lines, "收到 s2c 28000") && sawLog(lines, "收到 s2c 50000") && sawLog(lines, "收到 s2c 21013"), "flood logged");
    let follow = 0;
    const offBoom = floodNet.subscribe("*", (msg) => {
      if (msg.cmd === "wire.50000") throw new Error("boom");
      if (msg.cmd === "wire.21013") follow += 1;
    });
    floodSockets[0].push(joinFrames([encodeFrame(50000, new Uint8Array(180)), encodeFrame(21013)]));
    offBoom();
    assert(follow === 1, "frame after a bad handler still arrives");
    assert(sawLog(lines, "分发 s2c 50000 失败"), "bad handler logged");
    floodNet.close();

    // net-20261020 conn d6108a92（新号）和 c3bfce22（先登录，字段 15=100）。
    // Role.proto：字段 1 宝石、字段 2 金币、字段 5 奖杯 1000、字段 6 等级、字段 9 昵称。
    const roleNew = hexToBytes(
      "08001000200028e80730013800408cfcd2c3014a0fe8a781e4b9a0e58692e999a9e5aeb6508bb0dbd6065800608bb0dbd606680070008001afe4d7d606980100a00100a80100b00100b80100c80101d00100d80100e00100e80101f00100f80100800203"
    );
    const roleOld = hexToBytes(
      "08001000200028e80730013800408cfcd2c3014a0fe8a781e4b9a0e58692e999a9e5aeb650b297d8d606580060b297d8d606680078648001afe4d7d606980100a00100a80100b00100b80100c80101d00100d80100e00100e80101f00100f80100800203"
    );
    const parsedNew = decodeWireRole(roleNew);
    const parsedOld = decodeWireRole(roleOld);
    assert(parsedNew !== null && parsedNew.name === "见习冒险家", "s2c 2001 field 9 is the created name");
    assert(
      parsedNew !== null && parsedNew.level === 1 && parsedNew.gold === 0 && parsedNew.diamond === 0,
      "s2c 2001 fields 6, 2, 1 are level gold gem"
    );
    assert(
      parsedOld !== null &&
        parsedOld.name === "见习冒险家" &&
        parsedOld.level === 1 &&
        parsedOld.gold === 0 &&
        parsedOld.diamond === 0,
      "older 2001 uses the same wallet fields"
    );
    const cupOnly = decodeWireRole(concatBytes(fieldVarint(5, 1000), fieldVarint(15, 100)));
    assert(
      cupOnly !== null && cupOnly.gold === null && cupOnly.diamond === null && cupOnly.level === null && cupOnly.name === null,
      "field 5 cup and field 15 are not the wallet"
    );
    const partial = decodeWireRole(concatBytes(fieldVarint(6, 4), fieldVarint(1, 9)));
    assert(
      partial !== null && partial.level === 4 && partial.diamond === 9 && partial.gold === null && partial.name === null,
      "missing field 2 stays off gold"
    );
    assert(decodeWireRole(new Uint8Array(0)) === null, "empty 2001 ignored");
    assert(decodeWireRole(roleNew.subarray(0, 8)) === null, "truncated 2001 ignored");
    assert(decodeWireRole(new Uint8Array([0xff, 0xff, 0xff])) === null, "bad 2001 ignored");

    // net-20261020 三例 s2c 3007。字段 1 是领资源时间，字段 2 now_idx 都没有，字段 3 max_idx = 0。
    const chapterSamples = [
      hexToBytes("08f796d8d6061800"),
      hexToBytes("08d0afdbd6061800"),
      hexToBytes("08b6bedbd6061800"),
    ];
    for (let i = 0; i < chapterSamples.length; i++) {
      const chapter = decodeWireChapter(chapterSamples[i]);
      assert(
        chapter !== null && chapter.nowIdx === null && chapter.maxIdx === 0,
        "s2c 3007 sample " + i + " is max_idx 0 without now_idx"
      );
    }
    const chapterBoth = decodeWireChapter(concatBytes(fieldVarint(2, 4), fieldVarint(3, 9)));
    assert(chapterBoth !== null && chapterBoth.nowIdx === 4 && chapterBoth.maxIdx === 9, "3007 fields 2 and 3");
    const chapterNow = decodeWireChapter(fieldVarint(2, 0));
    assert(chapterNow !== null && chapterNow.nowIdx === 0 && chapterNow.maxIdx === null, "now_idx 0 is present");
    const chapterTimeOnly = decodeWireChapter(fieldVarint(1, 1792464848));
    assert(
      chapterTimeOnly !== null && chapterTimeOnly.nowIdx === null && chapterTimeOnly.maxIdx === null,
      "res_reward_time alone is not an idx"
    );
    const chapterExtra = decodeWireChapter(concatBytes(fieldVarint(3, 2), fieldVarint(4, 11)));
    assert(chapterExtra !== null && chapterExtra.nowIdx === null && chapterExtra.maxIdx === 2, "extra_reward_id is not an idx");
    assert(decodeWireChapter(new Uint8Array(0)) === null, "empty 3007 ignored");
    assert(decodeWireChapter(chapterSamples[1].subarray(0, 3)) === null, "truncated 3007 ignored");
    assert(decodeWireChapter(new Uint8Array([0xff, 0xff, 0xff])) === null, "bad 3007 ignored");

    const idleBoth = decodeWireIdle(concatBytes(fieldVarint(1, 1792464848), fieldVarint(2, 28800)));
    assert(
      idleBoth !== null && idleBoth.rewardTime === 1792464848 && idleBoth.maxRewardTime === 28800,
      "3004 fields 1 and 2"
    );
    const idleView = idleBoth ? formatWireIdle(idleBoth, 1792464848 + 3661) : null;
    assert(idleView !== null && idleView.duration === "已挂机 01:01:01 / 08:00:00", "idle duration from unix reward_time");
    assert(idleView !== null && idleView.preview.indexOf("不写金币") >= 0, "3004 has no item preview");
    const idleOver = idleBoth ? formatWireIdle(idleBoth, 1792464848 + 28800 + 50) : null;
    assert(
      idleOver !== null && idleOver.capped && idleOver.duration === "已挂机 08:00:00 / 08:00:00",
      "idle caps at max_reward_time seconds"
    );
    const idleZero = decodeWireIdle(fieldVarint(1, 0));
    assert(idleZero !== null && idleZero.rewardTime === 0 && idleZero.maxRewardTime === null, "reward_time 0 is present");
    const idleZeroView = idleZero ? formatWireIdle(idleZero, 1792464848) : null;
    assert(idleZeroView !== null && idleZeroView.duration === "已挂机 未同步", "small reward_time is not a clock");
    const idleMaxOnly = decodeWireIdle(fieldVarint(2, 0));
    assert(
      idleMaxOnly !== null && idleMaxOnly.maxRewardTime === 0 && wireIdleHasTime(idleMaxOnly),
      "max_reward_time 0 is data"
    );
    const idleMaxUnix = formatWireIdle({ rewardTime: 1792464848, maxRewardTime: 1792469999 }, 1792464848 + 10);
    assert(idleMaxUnix.duration.indexOf("上限未同步") >= 0, "unix max is not a duration cap");
    assert(decodeWireIdle(new Uint8Array(0)) === null, "empty 3004 ignored");
    assert(decodeWireIdle(new Uint8Array([0x80])) === null, "bad 3004 ignored");
    const idleClaim = decodeWireIdleClaim(fieldVarint(1, 1792468000));
    assert(idleClaim !== null && idleClaim.rewardTime === 1792468000, "3005 field 1");
    const idleClaimOther = decodeWireIdleClaim(fieldVarint(2, 3));
    assert(idleClaimOther !== null && idleClaimOther.rewardTime === null, "3005 ignores other fields");
    assert(decodeWireIdleClaim(new Uint8Array(0)) === null, "empty 3005 ignored");

    const snapAccount2 = Session.account;
    const snapToken2 = Session.token;
    const snapServerId2 = Session.serverId;
    const snapServerName2 = Session.serverName;
    const snapRole2 = Session.role;
    const snapDay2 = Session.openDay;
    const snapStage2 = Session.stageId;
    const snapGold2 = Session.gold;
    const snapDiamond2 = Session.diamond;
    const snapSource2 = Session.source;
    let roleNet: NetClient | null = null;
    try {
      Session.applyWireRole({ account: "111", serverId: 1, roleId: 1000002 });
      Session.applyWireSync({ name: "见习冒险家", level: 4, gold: 8, diamond: 3 });
      assert(formatNameLine() === "见习冒险家 Lv4", "known wire level is shown");
      assert(formatGoldLine() === "金币 8" && formatDiamondLine() === "钻石 3", "known wire wallet is shown");
      assert(formatHubIdentity() === "见习冒险家 Lv4 · 真服", "known wire hub");
      Session.applyWireRole({ account: "111", serverId: 1, roleId: 1000002 });
      assert(formatNameLine() === "角色 1000002" && formatGoldLine() === "金币 未同步", "new wire login clears the wallet");
      Session.applyWireSync({
        name: parsedOld ? parsedOld.name : null,
        level: parsedOld ? parsedOld.level : null,
        gold: parsedOld ? parsedOld.gold : null,
        diamond: parsedOld ? parsedOld.diamond : null,
      });
      assert(
        Session.wireSync.name && Session.wireSync.level && Session.wireSync.gold && Session.wireSync.diamond,
        "packet marks name level gold and diamonds"
      );
      assert(Session.role?.level === 1 && Session.gold === 0 && Session.diamond === 0, "zeros come from fields 6, 2, 1");
      assert(formatNameLine() === "见习冒险家 Lv1", "synced level 1 is shown");
      assert(formatGoldLine() === "金币 0" && formatDiamondLine() === "钻石 0", "field 5 cup 1000 stays off gold");
      assert(formatSubLine() === "真服 · 角色 1000002", "open day stays off the sub line");
      Session.applyWireRole({ account: "111", serverId: 1, roleId: 1000002 });
      Session.applyWireSync({
        name: cupOnly ? cupOnly.name : null,
        level: cupOnly ? cupOnly.level : null,
        gold: cupOnly ? cupOnly.gold : null,
        diamond: cupOnly ? cupOnly.diamond : null,
      });
      assert(!Session.wireSync.gold && !Session.wireSync.diamond && formatGoldLine() === "金币 未同步", "cup packet leaves the wallet");
      Session.applyEnter({ roleId: 9, name: "甲", level: 2, gold: 3, diamond: 4 });
      assert(Session.applyWireSync({ name: "见习冒险家", gold: 1 }) === false, "mock ignores wire sync");
      assert(formatNameLine() === "甲 Lv2" && formatGoldLine() === "金币 3", "mock wallet unchanged");

      Session.applyWireRole({ account: "111", serverId: 1, roleId: 1000002 });
      const kept = Session.role ? Session.role.name : "";
      const roleSockets: FakeSocket[] = [];
      const roleTransport = new WsTransport({
        connectTimeoutMs: 200,
        factory: () => {
          const socket = new FakeSocket();
          roleSockets.push(socket);
          setTimeout(() => socket.open(), 0);
          return socket;
        },
      });
      roleNet = new NetClient(roleTransport, {
        heartbeatMs: 60000,
        reconnectDelayMs: 20,
        maxReconnect: 0,
        requestTimeoutMs: 400,
      });
      await roleNet.connect(DEFAULT_WS_URL);
      Session.applyEnter({ roleId: 9, name: kept || "甲", level: 2, gold: 3, diamond: 4 });
      WireSession.watch(roleNet);
      const idleBody = concatBytes(fieldVarint(1, 1792464848), fieldVarint(2, 28800));
      roleSockets[0].push(encodeFrame(WireCmd.roleProfile, roleNew));
      roleSockets[0].push(encodeFrame(WireCmd.chapterData, chapterSamples[1]));
      roleSockets[0].push(encodeFrame(WireCmd.chapterItemList, idleBody));
      const earlyGain = concatBytes(
        fieldVarint(1, 2),
        fieldBytes(2, concatBytes(concatBytes(fieldVarint(1, 101), fieldVarint(2, 3)), fieldVarint(3, 4)))
      );
      roleSockets[0].push(encodeFrame(WireCmd.backpackGain, earlyGain));
      roleSockets[0].push(encodeFrame(WireCmd.backpackList));
      roleSockets[0].push(encodeFrame(WireCmd.mailList, mailSample));
      roleSockets[0].push(encodeFrame(WireCmd.heroList, heroRoster));
      roleSockets[0].push(encodeFrame(WireCmd.buyGoldList, activityBody));
      roleSockets[0].push(
        encodeFrame(
          WireCmd.achievementList,
          fieldBytes(1, concatBytes(concatBytes(fieldVarint(1, 100100), fieldVarint(2, 1)), fieldVarint(3, 0)))
        )
      );
      roleSockets[0].push(encodeFrame(WireCmd.pvpData, pvpSampleA));
      roleSockets[0].push(encodeFrame(WireCmd.sevenDayLogin, sevenBody));
      roleSockets[0].push(encodeFrame(22002, fieldVarint(1, 2)));
      roleSockets[0].push(encodeFrame(21013, fieldVarint(1, 9)));
      roleSockets[0].push(encodeFrame(WireCmd.sevenDayTarget, goalBody));
      roleSockets[0].push(encodeFrame(WireCmd.blessingPool, wishBody));
      roleSockets[0].push(encodeFrame(WireCmd.heroSummonCount, summonBody));
      roleSockets[0].push(encodeFrame(WireCmd.prophetSummon, prophetBody));
      roleSockets[0].push(encodeFrame(WireCmd.heroJewel, jewelBody));
      roleSockets[0].push(encodeFrame(WireCmd.illustratReward, illustratBody));
      assert(Session.source === "mock" && Session.role?.name === (kept || "甲"), "name waits until the city role exists");
      assert(WireSession.nowIdx === null && WireSession.maxIdx === null, "3007 waits until the city role exists");
      assert(!WireSession.hasChapter(), "chapter page stays closed before either idx");
      assert(WireSession.rewardTime === null && WireSession.maxRewardTime === null, "3004 waits until the city role exists");
      assert(!WireSession.hasIdle(), "idle entry stays unsynced before the city role");
      assert(!WireSession.hasBag() && WireSession.bagItems === null, "bag stays unsynced before the city role");
      assert(!WireSession.hasMail() && WireSession.mailEntries === null, "mail stays unsynced before the city role");
      assert(!WireSession.hasHero() && WireSession.heroes === null, "hero stays unsynced before the city role");
      assert(!WireSession.hasActivity() && WireSession.activity === null, "buy gold stays unsynced before the city role");
      assert(!WireSession.hasAchievement() && WireSession.achievements === null, "achievement stays unsynced before the city role");
      assert(!WireSession.hasPvp() && WireSession.pvp === null, "arena stays unsynced before the city role");
      assert(!WireSession.hasSevenDay() && WireSession.sevenDay === null, "seven day stays unsynced before the city role");
      assert(!WireSession.hasGoal7() && WireSession.goal7 === null, "goal7 stays unsynced before the city role");
      assert(!WireSession.hasWish() && WireSession.wish === null, "wish stays unsynced before the city role");
      assert(!WireSession.hasSummon() && WireSession.summon === null, "summon stays unsynced before the city role");
      assert(!WireSession.hasProphet() && WireSession.prophet === null, "prophet stays unsynced before the city role");
      assert(!WireSession.hasJewel() && WireSession.jewel === null, "jewel stays unsynced before the city role");
      assert(!WireSession.hasIllustrat() && WireSession.illustrat === null, "illustrat stays unsynced before the city role");
      assert(sawWire("21013 只收"), "21013 before 21010 does not open the goal page");
      assert(WireSession.mainlineLabel() === "主线 · 未同步", "label stays unsynced before the city role");
      assert(Session.stageId === 1, "3007 does not rewrite the mock stage id");
      Session.applyWireRole({ account: "111", serverId: 1, roleId: 1000002 });
      WireSession.prepareCity();
      WireSession.flush();
      assert(WireSession.nowIdx === null && WireSession.maxIdx === 0, "flush writes max_idx 0 from the log");
      assert(WireSession.mainlineLabel() === "主线 · 最高 0", "city label leaves 未同步");
      assert(WireSession.hasChapter(), "max_idx 0 opens the readonly page");
      assert(
        WireSession.rewardTime === 1792464848 && WireSession.maxRewardTime === 28800 && WireSession.hasIdle(),
        "flush writes 3004 times"
      );
      assert(Session.gold === 0 && Session.stageId === 1, "3004 does not write gold or stage");
      assert(
        WireSession.hasBag() && WireSession.bagItems !== null && WireSession.bagItems.length === 0,
        "empty 5001 flushes as a synced empty bag"
      );
      assert(
        WireSession.hasMail() &&
          WireSession.mailEntries !== null &&
          WireSession.mailEntries.length === 1 &&
          WireSession.mailEntries[0].title === "Hadiah Reservasi Peristiwa" &&
          WireSession.mailEntries[0].attachment === "yes",
        "flush writes the logged mail"
      );
      assert(Session.gold === 0 && Session.diamond === 0, "15000 stays off the wallet");
      assert(
        WireSession.hasHero() &&
          WireSession.heroes !== null &&
          WireSession.heroes.length === 2 &&
          WireSession.heroes[0].heroType === 102 &&
          WireSession.heroes[0].heroId === 16 &&
          WireSession.heroes[0].level === 3 &&
          WireSession.heroes[1].heroId === 4,
        "flush writes the 4001 heroes"
      );
      assert(Session.gold === 0 && Session.diamond === 0, "4001 stays off the wallet");
      assert(
        WireSession.hasActivity() &&
          WireSession.activity !== null &&
          WireSession.activity.status === 1 &&
          WireSession.activity.time === 1792458000 &&
          WireSession.activity.rows.length === 3 &&
          formatWireActivityLine(WireSession.activity.rows[0]) === "idx=1 / num=0",
        "flush writes the 17000 buy gold rows"
      );
      assert(Session.gold === 0 && Session.diamond === 0, "17000 stays off the wallet");
      assert(
        WireSession.hasAchievement() &&
          WireSession.achievements !== null &&
          WireSession.achievements.tasks.length === 1 &&
          WireSession.achievements.tasks[0].idx === 100100 &&
          WireSession.achievements.tasks[0].process === 1 &&
          WireSession.achievements.tasks[0].state === 0 &&
          formatWireAchievementLine(WireSession.achievements.tasks[0]) === "idx=100100 / process=1 / state=0",
        "flush writes the 12010 achievement"
      );
      assert(Session.gold === 0 && Session.diamond === 0, "12010 stays off the wallet");
      assert(
        WireSession.hasPvp() &&
          WireSession.pvp !== null &&
          WireSession.pvp.freeCount === 3 &&
          WireSession.pvp.score === 1000 &&
          WireSession.pvp.opponents.length === 3 &&
          WireSession.pvp.opponents[0].name === "Oimyakon" &&
          formatWirePvpLine(WireSession.pvp.opponents[0]).indexOf("player_id=16") >= 0,
        "flush writes the 18001 arena"
      );
      assert(Session.gold === 0 && Session.diamond === 0, "18001 stays off the wallet");
      assert(
        WireSession.hasSevenDay() &&
          WireSession.sevenDay !== null &&
          WireSession.sevenDay.endTime === 1792944000 &&
          WireSession.sevenDay.curDay === 2 &&
          WireSession.sevenDay.rows.length === 7 &&
          WireSession.sevenDay.rows[0].status === 0 &&
          formatWireSevenLine(WireSession.sevenDay.rows[0]) === "idx=1 / status=0 · 未领" &&
          formatWireSevenLine(WireSession.sevenDay.rows[6]) === "idx=7 / status=0 · 未领",
        "flush writes the 22000 list and keeps the 22002 cur_day"
      );
      assert(Session.gold === 0 && Session.diamond === 0, "22000 stays off the wallet");
      assert(
        WireSession.hasGoal7() &&
          WireSession.goal7 !== null &&
          WireSession.goal7.currDay === 3 &&
          WireSession.goal7.sevenDayValue === 1 &&
          WireSession.goal7.rewardBoxIdx.length === 1 &&
          WireSession.goal7.rewardBoxIdx[0] === 2 &&
          WireSession.goal7.tasks.length === 2 &&
          WireSession.goal7.tasks[0].state === 0 &&
          WireSession.goal7.tasks[1].state === 1 &&
          formatWireGoalLine(WireSession.goal7.tasks[0]) === "idx=101 / process=3 / state=0 · 未领" &&
          formatWireGoalLine(WireSession.goal7.tasks[1]) === "idx=102 / process=1 / state=1 · 已领" &&
          WireSession.sevenDay !== null &&
          WireSession.sevenDay.curDay === 2,
        "flush writes the 21010 list and leaves the 22000 login table"
      );
      assert(Session.gold === 0 && Session.diamond === 0, "21010 stays off the wallet");
      assert(
        WireSession.hasWish() &&
          WireSession.wish !== null &&
          WireSession.wish.pools.length === 1 &&
          WireSession.wish.pools[0].type === 1 &&
          WireSession.wish.pools[0].refreshTimes === 4 &&
          WireSession.wish.pools[0].luckyValue === 7 &&
          WireSession.wish.pools[0].luckyRewardId === 9 &&
          WireSession.wish.pools[0].refreshTime === 1792400000 &&
          WireSession.wish.pools[0].slots.length === 2 &&
          formatWireWishSlot(WireSession.wish.pools[0].slots[0]) === "position=1 / times=2 / item=字段1=101,字段2=3" &&
          formatWireWishSlot(WireSession.wish.pools[0].slots[1]).indexOf("未解") >= 0 &&
          WireSession.goal7 !== null &&
          WireSession.goal7.tasks.length === 2,
        "flush writes the 27001 list and leaves the 21010 table"
      );
      assert(Session.gold === 0 && Session.diamond === 0, "27001 stays off the wallet");
      assert(
        WireSession.hasSummon() &&
          WireSession.summon !== null &&
          WireSession.summon.freeTime === 2 &&
          WireSession.summon.seniorFreeTime === 5 &&
          formatWireSummonLine(WireSession.summon) === "free_time=2 / senior_free_time=5 / 字段6=8" &&
          WireSession.wish !== null &&
          WireSession.wish.pools.length === 1 &&
          WireSession.heroes !== null &&
          WireSession.heroes.length === 2,
        "flush writes the 4004 counts and leaves the 27001 pool and the 4001 roster"
      );
      assert(Session.gold === 0 && Session.diamond === 0, "4004 stays off the wallet");
      assert(
        WireSession.hasProphet() &&
          WireSession.prophet !== null &&
          WireSession.prophet.luckys.length === 2 &&
          WireSession.prophet.luckys[0].type === 1 &&
          WireSession.prophet.luckys[0].lucky === 3 &&
          WireSession.prophet.luckys[1].type === null &&
          WireSession.prophet.luckys[1].lucky === 0 &&
          formatWireProphetLine(WireSession.prophet.luckys[1]) === "type=无 / lucky=0 / 字段6=4" &&
          WireSession.summon !== null &&
          WireSession.summon.freeTime === 2,
        "flush writes the 13044 luckys and leaves the 4004 counts"
      );
      assert(Session.gold === 0 && Session.diamond === 0, "13044 stays off the wallet");
      assert(
        WireSession.hasJewel() &&
          WireSession.jewel !== null &&
          WireSession.jewel.heroes.length === 2 &&
          WireSession.jewel.heroes[0].heroId === 16 &&
          WireSession.jewel.heroes[0].jewels[0].jewelId === 7 &&
          WireSession.jewel.heroes[0].jewels[0].place === 1 &&
          WireSession.jewel.heroes[0].jewels[0].jewelType === 2 &&
          WireSession.jewel.heroes[1].heroId === null &&
          WireSession.jewel.heroes[1].jewels[0].place === 0 &&
          formatWireJewelLine(WireSession.jewel.heroes[1].jewels[0]) === "jewel_id=无 / place=0 / jewel_type=无 / 字段6=4" &&
          WireSession.prophet !== null &&
          WireSession.prophet.luckys.length === 2,
        "flush writes the 4101 jewels and leaves the 13044 luckys"
      );
      assert(Session.gold === 0 && Session.diamond === 0, "4101 stays off the wallet");
      assert(
        WireSession.hasIllustrat() &&
          WireSession.illustrat !== null &&
          WireSession.illustrat.rows.length === 2 &&
          WireSession.illustrat.rows[0].heroType === 102 &&
          WireSession.illustrat.rows[0].star === 5 &&
          WireSession.illustrat.rows[1].heroType === null &&
          WireSession.illustrat.rows[1].star === 0 &&
          formatWireIllustratLine(WireSession.illustrat.rows[1]) === "hero_type=无 / star=0 / 字段6=4" &&
          WireSession.jewel !== null &&
          WireSession.jewel.heroes.length === 2,
        "flush writes the 4013 rows and leaves the 4101 jewels"
      );
      assert(Session.gold === 0 && Session.diamond === 0, "4013 stays off the wallet");
      assert(sawWire("在背包列表之前"), "5002 before the list is not merged");
      assert(Session.stageId === 1, "3007 does not write Session.stageId");
      assert(Session.role?.name === "见习冒险家" && Session.wireSync.name, "flush writes field 9");
      assert(Session.wireSync.level && Session.role?.level === 1 && formatNameLine() === "见习冒险家 Lv1", "flush writes field 6");
      assert(Session.wireSync.gold && Session.gold === 0 && formatGoldLine() === "金币 0", "flush writes field 2 zero");
      assert(Session.wireSync.diamond && Session.diamond === 0 && formatDiamondLine() === "钻石 0", "flush writes field 1 zero");
      let paints = 0;
      const offPaint = WireSession.onSync(() => {
        paints += 1;
      });
      const offBoom = WireSession.onSync(() => {
        throw new Error("boom");
      });
      roleSockets[0].push(encodeFrame(WireCmd.roleProfile, roleOld));
      offPaint();
      offBoom();
      assert(paints === 1 && Session.role?.name === "见习冒险家", "later 2001 refreshes once");
      assert(sawWire("刷新顶栏失败"), "listener error stays inside the session");
      lines.length = 0;
      roleNet.send(WIRE_ROLE_CMD);
      const sent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(sent as ArrayBuffer)) === "04000000d1070000", "pull sends empty c2s 2001");
      assert(sawLog(lines, "发送 c2s 2001"), "pull is logged");
      roleSockets[0].push(encodeFrame(WireCmd.roleProfile, new Uint8Array([0x80])));
      assert(Session.role?.name === "见习冒险家" && Session.gold === 0 && sawWire("解不开"), "bad 2001 keeps the bar");
      roleSockets[0].push(encodeFrame(WireCmd.roleProfile, concatBytes(fieldVarint(5, 1000), fieldVarint(15, 100))));
      assert(Session.gold === 0 && Session.diamond === 0 && sawWire("没有可写入"), "cup frame does not replace gold");
      roleSockets[0].push(encodeFrame(WireCmd.roleProfile, fieldVarint(2, 40)));
      assert(Session.gold === 40 && Session.diamond === 0 && Session.role?.level === 1, "later field 2 updates gold only");
      assert(WireSession.mainlineLabel() === "主线 · 最高 0", "gold packet does not clear the chapter label");
      roleSockets[0].push(encodeFrame(WireCmd.chapterData, new Uint8Array([0x80])));
      assert(WireSession.maxIdx === 0 && WireSession.nowIdx === null && sawWire("3007 解不开"), "bad 3007 keeps the label");
      roleSockets[0].push(encodeFrame(WireCmd.chapterData, fieldVarint(1, 1792464848)));
      assert(WireSession.maxIdx === 0 && WireSession.nowIdx === null && sawWire("没有 now_idx"), "reward time does not clear idx");
      roleSockets[0].push(encodeFrame(WireCmd.chapterData, fieldVarint(2, 7)));
      assert(WireSession.nowIdx === 7 && WireSession.maxIdx === 0, "later now_idx keeps max_idx");
      assert(WireSession.mainlineLabel() === "主线 · 当前 7 / 最高 0", "label shows both idx");
      assert(Session.stageId === 1 && Session.gold === 40, "idx stays off the mock stage and wallet");
      lines.length = 0;
      roleNet.send(WIRE_CHAPTER_CMD);
      const chapterSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(chapterSent as ArrayBuffer)) === "04000000bf0b0000", "pull sends empty c2s 3007");
      assert(sawLog(lines, "发送 c2s 3007"), "chapter pull is logged");
      lines.length = 0;
      roleNet.send(WIRE_IDLE_CMD);
      const idleSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(idleSent as ArrayBuffer)) === "04000000bc0b0000", "pull sends empty c2s 3004");
      assert(sawLog(lines, "发送 c2s 3004"), "idle pull is logged");
      roleSockets[0].push(encodeFrame(WireCmd.chapterItemList, new Uint8Array([0x80])));
      assert(
        WireSession.rewardTime === 1792464848 && WireSession.maxRewardTime === 28800 && sawWire("3004 解不开"),
        "bad 3004 keeps the idle times"
      );
      roleSockets[0].push(encodeFrame(WireCmd.chapterItemList, fieldVarint(2, 7200)));
      assert(WireSession.rewardTime === 1792464848 && WireSession.maxRewardTime === 7200, "later max keeps reward_time");
      assert(Session.gold === 40, "3004 stays off the wallet");
      lines.length = 0;
      assert(WireSession.claimIdle(), "claim uses the open socket");
      const claimSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(claimSent as ArrayBuffer)) === "04000000bd0b0000", "claim sends empty c2s 3005");
      assert(sawLog(lines, "发送 c2s 3005"), "idle claim is logged");
      roleSockets[0].push(encodeFrame(WireCmd.chapterItemReward, fieldVarint(1, 1792468000)));
      assert(WireSession.rewardTime === 1792468000 && WireSession.maxRewardTime === 7200, "3005 updates reward_time only");
      assert(Session.gold === 40 && Session.diamond === 0, "3005 does not pay the wallet");
      assert(WireSession.claimNote.indexOf("金币不改") >= 0 && WireSession.claimSerial === 1, "3005 note skips rewards");
      roleSockets[0].push(encodeFrame(WireCmd.chapterItemReward, fieldVarint(2, 9)));
      assert(
        WireSession.rewardTime === 1792468000 && WireSession.claimSerial === 2 && sawWire("没有 reward_time"),
        "3005 without field 1 keeps the clock"
      );
      roleNet.send(WIRE_IDLE_CLAIM_CMD);
      const bagBody = fieldBytes(1, concatBytes(concatBytes(fieldVarint(1, 101), fieldVarint(2, 3)), fieldVarint(3, 5)));
      roleSockets[0].push(encodeFrame(WireCmd.backpackList, bagBody));
      assert(
        WireSession.hasBag() &&
          WireSession.bagItems !== null &&
          WireSession.bagItems.length === 1 &&
          WireSession.bagItems[0].itemId === 101 &&
          WireSession.bagItems[0].num === 5,
        "s2c 5001 replaces the empty bag"
      );
      assert(Session.gold === 40 && Session.diamond === 0 && formatGoldLine() === "金币 40", "5001 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.backpackList, new Uint8Array([0x80])));
      assert(WireSession.bagItems !== null && WireSession.bagItems.length === 1 && sawWire("5001 解不开"), "bad 5001 keeps the list");
      const gainBody = concatBytes(
        fieldVarint(1, 7),
        fieldBytes(2, concatBytes(concatBytes(fieldVarint(1, 101), fieldVarint(2, 3)), fieldVarint(3, 2)))
      );
      roleSockets[0].push(encodeFrame(WireCmd.backpackGain, gainBody));
      assert(
        WireSession.bagItems !== null && WireSession.bagItems.length === 1 && WireSession.bagItems[0].num === 7,
        "5002 adds num onto the same item"
      );
      assert(Session.gold === 40 && Session.diamond === 0 && sawWire("type 7") && sawWire("顶栏不改"), "5002 logs type and skips the bar");
      roleSockets[0].push(
        encodeFrame(
          WireCmd.backpackGain,
          concatBytes(fieldVarint(1, 1), fieldBytes(2, concatBytes(concatBytes(fieldVarint(1, 101), fieldVarint(2, 3)), fieldVarint(3, 0))))
        )
      );
      assert(WireSession.hasBag() && WireSession.bagItems !== null && WireSession.bagItems.length === 0, "5002 num 0 deletes and stays synced");
      assert(Session.gold === 40, "5002 does not write gold");
      roleSockets[0].push(encodeFrame(WireCmd.mailList, new Uint8Array([0x80])));
      assert(
        WireSession.hasMail() && WireSession.mailEntries !== null && WireSession.mailEntries.length === 1 && sawWire("15000 解不开"),
        "bad 15000 keeps the list"
      );
      assert(Session.gold === 40 && Session.diamond === 0, "bad 15000 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.mailList));
      assert(
        WireSession.hasMail() && WireSession.mailEntries !== null && WireSession.mailEntries.length === 0,
        "empty 15000 replaces the list and stays synced"
      );
      assert(Session.gold === 40, "empty 15000 does not write gold");
      roleSockets[0].push(encodeFrame(WireCmd.heroList, new Uint8Array([0x80])));
      assert(
        WireSession.hasHero() && WireSession.heroes !== null && WireSession.heroes.length === 2 && sawWire("4001 解不开"),
        "bad 4001 keeps the roster"
      );
      assert(Session.gold === 40 && Session.diamond === 0, "bad 4001 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.heroList));
      assert(
        WireSession.hasHero() && WireSession.heroes !== null && WireSession.heroes.length === 2 && sawWire("4001 解不开"),
        "empty 4001 body does not clear the roster"
      );
      const sentBeforeHeroPage = roleSockets[0].sent.length;
      roleSockets[0].push(encodeFrame(WireCmd.heroList, heroPage1));
      assert(
        WireSession.heroes !== null &&
          WireSession.heroes.length === 2 &&
          WireSession.heroes[0].heroId === 16 &&
          sawWire("send_status=0"),
        "unfinished page does not replace the roster"
      );
      assert(roleSockets[0].sent.length === sentBeforeHeroPage + 1, "send_status 0 requests the next page");
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[roleSockets[0].sent.length - 1] as ArrayBuffer)) === "06000000a10f00000802",
        "next page is c2s 4001 page 2"
      );
      roleSockets[0].push(encodeFrame(WireCmd.heroList, heroPage2));
      assert(
        WireSession.hasHero() &&
          WireSession.heroes !== null &&
          WireSession.heroes.length === 2 &&
          WireSession.heroes[0].heroId === 7 &&
          WireSession.heroes[1].heroId === 8 &&
          WireSession.heroes[1].level === 6,
        "finished page replaces the roster"
      );
      assert(Session.gold === 40, "4001 pages do not write gold");
      roleSockets[0].push(encodeFrame(WireCmd.heroList, heroEmpty));
      assert(
        WireSession.hasHero() && WireSession.heroes !== null && WireSession.heroes.length === 0,
        "empty GResHeroList replaces the roster and stays synced"
      );
      assert(Session.gold === 40, "empty roster does not write gold");
      roleSockets[0].push(encodeFrame(WireCmd.buyGoldList, new Uint8Array([0x80])));
      assert(
        WireSession.hasActivity() &&
          WireSession.activity !== null &&
          WireSession.activity.rows.length === 3 &&
          sawWire("17000 解不开"),
        "bad 17000 keeps the table"
      );
      assert(Session.gold === 40 && Session.diamond === 0, "bad 17000 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.buyGoldList));
      assert(
        WireSession.hasActivity() && WireSession.activity !== null && WireSession.activity.rows.length === 0,
        "empty 17000 replaces the table and stays synced"
      );
      assert(Session.gold === 40, "empty 17000 does not write gold");
      roleSockets[0].push(encodeFrame(WireCmd.achievementList, new Uint8Array([0x80])));
      assert(
        WireSession.hasAchievement() &&
          WireSession.achievements !== null &&
          WireSession.achievements.tasks.length === 1 &&
          sawWire("12010 解不开"),
        "bad 12010 keeps the table"
      );
      assert(Session.gold === 40 && Session.diamond === 0, "bad 12010 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.achievementList));
      assert(
        WireSession.hasAchievement() &&
          WireSession.achievements !== null &&
          WireSession.achievements.tasks.length === 0,
        "empty 12010 body is a synced empty achievement table"
      );
      assert(Session.gold === 40, "empty 12010 does not write gold");
      roleSockets[0].push(encodeFrame(WireCmd.achievementList, fieldVarint(3, 0)));
      assert(
        WireSession.hasAchievement() && WireSession.achievements !== null && WireSession.achievements.tasks.length === 0,
        "non-empty 12010 without tasks stays the empty achievement table"
      );
      lines.length = 0;
      const sentBeforePull = roleSockets[0].sent.length;
      WireSession.pullRoleProfile();
      assert(roleSockets[0].sent.length === sentBeforePull + 2, "city pull sends 2001 then 5001");
      assert(bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforePull] as ArrayBuffer)) === "04000000d1070000", "pull still sends empty c2s 2001 first");
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforePull + 1] as ArrayBuffer)) === "0400000089130000",
        "pull sends empty c2s 5001 before 3007"
      );
      assert(sawLog(lines, "发送 c2s 2001") && sawLog(lines, "发送 c2s 5001"), "bag pull is logged");
      roleNet.send(WIRE_BAG_CMD);
      const bagSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(bagSent as ArrayBuffer)) === "0400000089130000", "wire.5001 frame");
      const sentBeforeBagOther = roleSockets[0].sent.length;
      roleNet.send(WIRE_BAG_GAIN_CMD);
      roleNet.send("wire.5004");
      roleNet.send("wire.5009");
      roleNet.send("wire.5010");
      roleNet.send("wire.5011");
      roleNet.send("wire.5013");
      assert(roleSockets[0].sent.length === sentBeforeBagOther, "5002 and 5004-5013 stay off the wire");
      assert(sawLog(lines, "未发送 wire.5004") && sawLog(lines, "未发送 wire.5010") && sawLog(lines, "未发送 wire.5002"), "bag mutations are not encoded");
      const sentBeforeOther = roleSockets[0].sent.length;
      roleNet.send("wire.3002");
      roleNet.send("wire.3010");
      assert(roleSockets[0].sent.length === sentBeforeOther, "3002 and 3010 stay off the wire");
      assert(sawLog(lines, "未发送 wire.3002") && sawLog(lines, "未发送 wire.3010"), "other battle cmds are not encoded");
      const sentBeforeMailPull = roleSockets[0].sent.length;
      WireSession.pullIdle();
      assert(roleSockets[0].sent.length === sentBeforeMailPull + 13, "idle pull sends 3004 then 15000 then 4001 then 17000 then 12010 then 18001 then 22000 then 21010 then 27001 then 4004 then 13044 then 4101 then 4013");
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforeMailPull] as ArrayBuffer)) === "04000000bc0b0000",
        "pullIdle still sends empty c2s 3004 first"
      );
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforeMailPull + 1] as ArrayBuffer)) === "04000000983a0000",
        "pullIdle sends empty c2s 15000 after 3004"
      );
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforeMailPull + 2] as ArrayBuffer)) === "06000000a10f00000801",
        "pullIdle sends c2s 4001 page 1 after 15000"
      );
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforeMailPull + 3] as ArrayBuffer)) === "0400000068420000",
        "pullIdle sends empty c2s 17000 after 4001"
      );
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforeMailPull + 4] as ArrayBuffer)) === "04000000ea2e0000",
        "pullIdle sends empty c2s 12010 after 17000"
      );
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforeMailPull + 5] as ArrayBuffer)) === "0400000051460000",
        "pullIdle sends empty c2s 18001 after 12010"
      );
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforeMailPull + 6] as ArrayBuffer)) === "04000000f0550000",
        "pullIdle sends empty c2s 22000 after 18001"
      );
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforeMailPull + 7] as ArrayBuffer)) === "0400000012520000",
        "pullIdle sends empty c2s 21010 after 22000"
      );
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforeMailPull + 8] as ArrayBuffer)) === "0400000079690000",
        "pullIdle sends empty c2s 27001 after 21010"
      );
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforeMailPull + 9] as ArrayBuffer)) === "04000000a40f0000",
        "pullIdle sends empty c2s 4004 after 27001"
      );
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforeMailPull + 10] as ArrayBuffer)) === "04000000f4320000",
        "pullIdle sends empty c2s 13044 after 4004"
      );
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforeMailPull + 11] as ArrayBuffer)) === "0400000005100000",
        "pullIdle sends empty c2s 4101 after 13044"
      );
      assert(
        bytesToHex(new Uint8Array(roleSockets[0].sent[sentBeforeMailPull + 12] as ArrayBuffer)) === "04000000ad0f0000",
        "pullIdle sends empty c2s 4013 after 4101"
      );
      assert(
        sawLog(lines, "发送 c2s 15000") &&
          sawLog(lines, "发送 c2s 4001") &&
          sawLog(lines, "发送 c2s 17000") &&
          sawLog(lines, "发送 c2s 12010") &&
          sawLog(lines, "发送 c2s 18001") &&
          sawLog(lines, "发送 c2s 22000") &&
          sawLog(lines, "发送 c2s 21010") &&
          sawLog(lines, "发送 c2s 27001") &&
          sawLog(lines, "发送 c2s 4004") &&
          sawLog(lines, "发送 c2s 13044") &&
          sawLog(lines, "发送 c2s 4101") &&
          sawLog(lines, "发送 c2s 4013") &&
          sawLog(lines, "0400000012520000") &&
          sawLog(lines, "0400000079690000") &&
          sawLog(lines, "04000000a40f0000") &&
          sawLog(lines, "04000000f4320000") &&
          sawLog(lines, "0400000005100000") &&
          sawLog(lines, "04000000ad0f0000") &&
          sawLog(lines, "0400000002520000") === false &&
          sawLog(lines, "发送 c2s 12020") === false &&
          sawLog(lines, "发送 c2s 18002") === false &&
          sawLog(lines, "发送 c2s 22001") === false &&
          sawLog(lines, "发送 c2s 21011") === false &&
          sawLog(lines, "发送 c2s 21012") === false &&
          sawLog(lines, "发送 c2s 21013") === false &&
          sawLog(lines, "发送 c2s 27002") === false &&
          sawLog(lines, "发送 c2s 27003") === false &&
          sawLog(lines, "发送 c2s 27004") === false &&
          sawLog(lines, "发送 c2s 4201") === false &&
          sawLog(lines, "发送 c2s 4002") === false &&
          sawLog(lines, "发送 c2s 4005") === false &&
          sawLog(lines, "发送 c2s 58001") === false &&
          sawLog(lines, "发送 c2s 58007") === false &&
          sawLog(lines, "发送 c2s 13041") === false &&
          sawLog(lines, "发送 c2s 13042") === false &&
          sawLog(lines, "发送 c2s 13043") === false &&
          sawLog(lines, "发送 c2s 4102") === false &&
          sawLog(lines, "发送 c2s 4103") === false &&
          sawLog(lines, "发送 c2s 4104") === false &&
          sawLog(lines, "发送 c2s 4105") === false &&
          sawLog(lines, "发送 c2s 4106") === false &&
          sawLog(lines, "发送 c2s 4107") === false &&
          sawLog(lines, "发送 c2s 9001") === false &&
          sawLog(lines, "发送 c2s 4014") === false,
        "mail hero buy gold achievement arena seven day goal wish summon prophet jewel and illustrat pulls are logged"
      );
      roleNet.send(WIRE_MAIL_CMD);
      const mailSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(mailSent as ArrayBuffer)) === "04000000983a0000", "wire.15000 frame");
      const sentBeforeMailOther = roleSockets[0].sent.length;
      roleNet.send("wire.15001");
      roleNet.send(Cmd.mailRead);
      roleNet.send(Cmd.mailClaim);
      roleNet.send(Cmd.mailClaimAll);
      roleNet.send(Cmd.mailDelete);
      assert(roleSockets[0].sent.length === sentBeforeMailOther, "mail read claim and delete stay off the wire");
      assert(sawLog(lines, "未发送 wire.15001") && sawLog(lines, "未发送 mail.claim") && sawLog(lines, "未发送 mail.delete"), "mail mutations are not encoded");
      roleNet.send(WIRE_HERO_CMD);
      const heroSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(heroSent as ArrayBuffer)) === "06000000a10f00000801", "wire.4001 page 1 frame");
      roleNet.send(WIRE_HERO_CMD, { page: 0 });
      const heroZero = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(heroZero as ArrayBuffer)) === "06000000a10f00000801", "wire.4001 page 0 is forced to page 1");
      const sentBeforeHeroOther = roleSockets[0].sent.length;
      roleNet.send(Cmd.heroList);
      roleNet.send(Cmd.heroUpgrade);
      roleNet.send("wire.18002");
      assert(roleSockets[0].sent.length === sentBeforeHeroOther, "hero list and upgrade placeholders stay off the wire");
      assert(
        sawLog(lines, "未发送 hero.list") &&
          sawLog(lines, "未发送 hero.upgrade") &&
          sawLog(lines, "未发送 wire.18002"),
        "hero upgrade is not encoded"
      );
      roleNet.send(WIRE_ACTIVITY_CMD);
      const activitySent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(activitySent as ArrayBuffer)) === "0400000068420000", "wire.17000 frame");
      const sentBeforeActivityOther = roleSockets[0].sent.length;
      roleNet.send(Cmd.login7View);
      roleNet.send(Cmd.login7Claim);
      roleNet.send(Cmd.login7Advance);
      assert(roleSockets[0].sent.length === sentBeforeActivityOther, "login7 placeholders stay off the wire");
      assert(
        sawLog(lines, "未发送 login7.view") &&
          sawLog(lines, "未发送 login7.claim") &&
          sawLog(lines, "未发送 login7.advance"),
        "buy gold is not a login7 claim"
      );
      roleNet.send(WIRE_ACHIEVEMENT_CMD);
      const achievementSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(achievementSent as ArrayBuffer)) === "04000000ea2e0000", "wire.12010 frame");
      const sentBeforeAchievementOther = roleSockets[0].sent.length;
      roleNet.send("wire.12020");
      roleNet.send(Cmd.goal7Claim);
      assert(roleSockets[0].sent.length === sentBeforeAchievementOther, "12020 and goal claim stay off the wire");
      assert(sawLog(lines, "未发送 wire.12020") && sawLog(lines, "未发送 goal7.claim"), "daily task and goal claim are not encoded");
      roleNet.send(WIRE_PVP_CMD);
      const pvpSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(pvpSent as ArrayBuffer)) === "0400000051460000", "wire.18001 frame");
      const sentBeforePvpOther = roleSockets[0].sent.length;
      roleNet.send("wire.18002");
      roleNet.send("wire.18003");
      roleNet.send("wire.18004");
      roleNet.send("wire.18005");
      roleNet.send("wire.18007");
      roleNet.send("wire.18008");
      roleNet.send(Cmd.arenaView);
      roleNet.send(Cmd.arenaChallenge);
      assert(roleSockets[0].sent.length === sentBeforePvpOther, "arena fight refresh ticket like and reward stay off the wire");
      assert(
        sawLog(lines, "未发送 wire.18002") &&
          sawLog(lines, "未发送 wire.18003") &&
          sawLog(lines, "未发送 wire.18005") &&
          sawLog(lines, "未发送 wire.18007") &&
          sawLog(lines, "未发送 wire.18008") &&
          sawLog(lines, "未发送 arena.view") &&
          sawLog(lines, "未发送 arena.challenge"),
        "arena mutations are not encoded"
      );
      roleNet.send(WIRE_SEVEN_CMD);
      const sevenSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(sevenSent as ArrayBuffer)) === "04000000f0550000", "wire.22000 frame");
      const sentBeforeSevenOther = roleSockets[0].sent.length;
      roleNet.send("wire.22001");
      roleNet.send(WIRE_SEVEN_PUSH_CMD);
      roleNet.send(Cmd.login7View);
      roleNet.send(Cmd.login7Claim);
      roleNet.send(Cmd.login7Advance);
      roleNet.send(Cmd.goal7Claim);
      assert(roleSockets[0].sent.length === sentBeforeSevenOther, "22001 22002 and login7 placeholders stay off the wire");
      assert(
        sawLog(lines, "未发送 wire.22001") &&
          sawLog(lines, "未发送 wire.22002") &&
          sawLog(lines, "未发送 login7.claim") &&
          sawLog(lines, "未发送 goal7.claim"),
        "seven day claim and the day push are not encoded"
      );
      roleNet.send(WIRE_GOAL7_CMD);
      const goalSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(goalSent as ArrayBuffer)) === "0400000012520000", "wire.21010 frame");
      const sentBeforeGoalOther = roleSockets[0].sent.length;
      roleNet.send("wire.21000");
      roleNet.send("wire.21001");
      roleNet.send("wire.21011");
      roleNet.send("wire.21012");
      roleNet.send(WIRE_GOAL7_PUSH_CMD);
      roleNet.send(Cmd.goal7View);
      roleNet.send(Cmd.goal7Claim);
      assert(roleSockets[0].sent.length === sentBeforeGoalOther, "21011 21012 21013 and goal7 placeholders stay off the wire");
      assert(
        sawLog(lines, "未发送 wire.21000") &&
          sawLog(lines, "未发送 wire.21001") &&
          sawLog(lines, "未发送 wire.21011") &&
          sawLog(lines, "未发送 wire.21012") &&
          sawLog(lines, "未发送 wire.21013") &&
          sawLog(lines, "未发送 goal7.view") &&
          sawLog(lines, "未发送 goal7.claim"),
        "goal claim and the target push are not encoded"
      );
      roleNet.send(WIRE_WISH_CMD);
      const wishSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(wishSent as ArrayBuffer)) === "0400000079690000", "wire.27001 frame");
      const sentBeforeWishOther = roleSockets[0].sent.length;
      roleNet.send("wire.27002");
      roleNet.send("wire.27003");
      roleNet.send("wire.27004");
      roleNet.send("wire.4201");
      roleNet.send(Cmd.wishView);
      roleNet.send(Cmd.wishDraw);
      assert(roleSockets[0].sent.length === sentBeforeWishOther, "27002 27003 27004 4201 and wish placeholders stay off the wire");
      assert(
        sawLog(lines, "未发送 wire.27002") &&
          sawLog(lines, "未发送 wire.27003") &&
          sawLog(lines, "未发送 wire.27004") &&
          sawLog(lines, "未发送 wire.4201") &&
          sawLog(lines, "未发送 wish.view") &&
          sawLog(lines, "未发送 wish.draw"),
        "wish refresh draw and lucky claim are not encoded"
      );
      roleNet.send(WIRE_SUMMON_CMD);
      const summonSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(summonSent as ArrayBuffer)) === "04000000a40f0000", "wire.4004 frame");
      const sentBeforeSummonOther = roleSockets[0].sent.length;
      roleNet.send("wire.4002");
      roleNet.send("wire.4005");
      roleNet.send("wire.58001");
      roleNet.send("wire.58007");
      roleNet.send("wire.4201");
      roleNet.send(Cmd.summonPull);
      assert(roleSockets[0].sent.length === sentBeforeSummonOther, "4002 4005 58001 58007 4201 and summon.pull stay off the wire");
      assert(
        sawLog(lines, "未发送 wire.4002") &&
          sawLog(lines, "未发送 wire.4005") &&
          sawLog(lines, "未发送 wire.58001") &&
          sawLog(lines, "未发送 wire.58007") &&
          sawLog(lines, "未发送 summon.pull"),
        "summon pull and cumulative reward are not encoded"
      );
      roleNet.send(WIRE_PROPHET_CMD);
      const prophetSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(prophetSent as ArrayBuffer)) === "04000000f4320000", "wire.13044 frame");
      const sentBeforeProphetOther = roleSockets[0].sent.length;
      roleNet.send("wire.13041");
      roleNet.send("wire.13042");
      roleNet.send("wire.13043");
      roleNet.send("wire.58007");
      roleNet.send("wire.4201");
      roleNet.send(Cmd.summonPull);
      assert(roleSockets[0].sent.length === sentBeforeProphetOther, "13041 13042 13043 58007 4201 and summon.pull stay off the prophet wire");
      assert(
        sawLog(lines, "未发送 wire.13041") &&
          sawLog(lines, "未发送 wire.13042") &&
          sawLog(lines, "未发送 wire.13043") &&
          sawLog(lines, "未发送 wire.58007") &&
          sawLog(lines, "未发送 wire.4201") &&
          sawLog(lines, "未发送 summon.pull"),
        "prophet draw replace and confirm are not encoded"
      );
      roleNet.send(WIRE_JEWEL_CMD);
      const jewelSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(jewelSent as ArrayBuffer)) === "0400000005100000", "wire.4101 frame");
      const sentBeforeJewelOther = roleSockets[0].sent.length;
      roleNet.send("wire.4102");
      roleNet.send("wire.4103");
      roleNet.send("wire.4104");
      roleNet.send("wire.4105");
      roleNet.send("wire.4106");
      roleNet.send("wire.4107");
      roleNet.send("wire.9001");
      assert(roleSockets[0].sent.length === sentBeforeJewelOther, "4102-4107 and 9001 stay off the jewel wire");
      assert(
        sawLog(lines, "未发送 wire.4102") &&
          sawLog(lines, "未发送 wire.4103") &&
          sawLog(lines, "未发送 wire.4104") &&
          sawLog(lines, "未发送 wire.4105") &&
          sawLog(lines, "未发送 wire.4106") &&
          sawLog(lines, "未发送 wire.4107") &&
          sawLog(lines, "未发送 wire.9001"),
        "jewel replace unequip and compose are not encoded"
      );
      roleNet.send(WIRE_ILLUSTRAT_CMD);
      const illustratSent = roleSockets[0].sent[roleSockets[0].sent.length - 1];
      assert(bytesToHex(new Uint8Array(illustratSent as ArrayBuffer)) === "04000000ad0f0000", "wire.4013 frame");
      const sentBeforeIllustratOther = roleSockets[0].sent.length;
      roleNet.send("wire.4014");
      assert(roleSockets[0].sent.length === sentBeforeIllustratOther, "4014 stays off the illustrat wire");
      assert(sawLog(lines, "未发送 wire.4014"), "illustrat push is not encoded as a claim");
      const goldBeforeBadPvp = Session.gold;
      roleSockets[0].push(encodeFrame(WireCmd.pvpData, new Uint8Array([0x80])));
      assert(
        WireSession.hasPvp() && WireSession.pvp !== null && WireSession.pvp.opponents.length === 3 && sawWire("18001 解不开"),
        "bad 18001 keeps the arena"
      );
      assert(Session.gold === goldBeforeBadPvp, "bad 18001 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.pvpData));
      assert(
        WireSession.hasPvp() && WireSession.pvp !== null && WireSession.pvp.opponents.length === 0,
        "empty 18001 body replaces the arena and stays synced"
      );
      assert(Session.gold === goldBeforeBadPvp, "empty 18001 does not write gold");
      const goldBeforeBadSeven = Session.gold;
      roleSockets[0].push(encodeFrame(22002, fieldVarint(1, 4)));
      assert(
        WireSession.hasSevenDay() && WireSession.sevenDay !== null && WireSession.sevenDay.curDay === 4 && WireSession.sevenDay.rows.length === 7,
        "22002 updates cur_day and leaves the list"
      );
      assert(Session.gold === goldBeforeBadSeven, "22002 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.sevenDayLogin, new Uint8Array([0x80])));
      assert(
        WireSession.hasSevenDay() &&
          WireSession.sevenDay !== null &&
          WireSession.sevenDay.rows.length === 7 &&
          WireSession.sevenDay.curDay === 4 &&
          sawWire("22000 解不开"),
        "bad 22000 keeps the list"
      );
      assert(Session.gold === goldBeforeBadSeven, "bad 22000 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.sevenDayLogin));
      assert(
        WireSession.hasSevenDay() && WireSession.sevenDay !== null && WireSession.sevenDay.rows.length === 0,
        "empty 22000 body replaces the list and stays synced"
      );
      assert(Session.gold === goldBeforeBadSeven, "empty 22000 does not write gold");
      roleSockets[0].push(encodeFrame(WireCmd.sevenDayLogin, sevenOuterOnly));
      assert(
        WireSession.hasSevenDay() &&
          WireSession.sevenDay !== null &&
          WireSession.sevenDay.rows.length === 0 &&
          WireSession.sevenDay.endTime === 1792944000 &&
          WireSession.sevenDay.curDay === 1,
        "non-empty 22000 without list stays synced"
      );
      roleSockets[0].push(encodeFrame(22002, fieldVarint(1, 3)));
      assert(
        WireSession.sevenDay !== null && WireSession.sevenDay.curDay === 3 && WireSession.sevenDay.rows.length === 0,
        "22002 after an empty list only changes cur_day"
      );
      assert(Session.gold === goldBeforeBadSeven, "later 22002 does not write gold");
      const goldBeforeBadGoal = Session.gold;
      const goalBeforePush = WireSession.goal7;
      roleSockets[0].push(encodeFrame(21013, fieldVarint(1, 8)));
      assert(
        WireSession.hasGoal7() &&
          WireSession.goal7 === goalBeforePush &&
          WireSession.goal7 !== null &&
          WireSession.goal7.tasks.length === 2 &&
          WireSession.goal7.currDay === 3 &&
          sawWire("21013 只收"),
        "21013 does not replace the goal table"
      );
      assert(Session.gold === goldBeforeBadGoal, "21013 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.sevenDayTarget, new Uint8Array([0x80])));
      assert(
        WireSession.hasGoal7() &&
          WireSession.goal7 !== null &&
          WireSession.goal7.tasks.length === 2 &&
          WireSession.goal7.currDay === 3 &&
          sawWire("21010 解不开"),
        "bad 21010 keeps the list"
      );
      assert(Session.gold === goldBeforeBadGoal, "bad 21010 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.sevenDayTarget));
      assert(
        WireSession.hasGoal7() && WireSession.goal7 !== null && WireSession.goal7.tasks.length === 0,
        "empty 21010 body replaces the list and stays synced"
      );
      assert(Session.gold === goldBeforeBadGoal, "empty 21010 does not write gold");
      roleSockets[0].push(encodeFrame(WireCmd.sevenDayTarget, goalOuterOnly));
      assert(
        WireSession.hasGoal7() &&
          WireSession.goal7 !== null &&
          WireSession.goal7.tasks.length === 0 &&
          WireSession.goal7.sevenDayValue === 0 &&
          WireSession.goal7.currDay === 1 &&
          WireSession.goal7.rewardBoxIdx.length === 0 &&
          WireSession.sevenDay !== null &&
          WireSession.sevenDay.rows.length === 0,
        "non-empty 21010 without tasks stays synced and leaves 22000"
      );
      assert(Session.gold === goldBeforeBadGoal, "outer-only 21010 does not write gold");
      const goldBeforeBadWish = Session.gold;
      const diamondBeforeBadWish = Session.diamond;
      roleSockets[0].push(encodeFrame(WireCmd.blessingPool, new Uint8Array([0x80])));
      assert(
        WireSession.hasWish() &&
          WireSession.wish !== null &&
          WireSession.wish.pools.length === 1 &&
          WireSession.wish.pools[0].type === 1 &&
          sawWire("27001 解不开"),
        "bad 27001 keeps the pool"
      );
      assert(Session.gold === goldBeforeBadWish && Session.diamond === diamondBeforeBadWish, "bad 27001 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.blessingPool));
      assert(
        WireSession.hasWish() && WireSession.wish !== null && WireSession.wish.pools.length === 0,
        "empty 27001 body replaces the pool and stays synced"
      );
      assert(Session.gold === goldBeforeBadWish && Session.diamond === diamondBeforeBadWish, "empty 27001 does not write gold or diamonds");
      roleSockets[0].push(encodeFrame(WireCmd.blessingPool, wishOuterOnly));
      assert(
        WireSession.hasWish() &&
          WireSession.wish !== null &&
          WireSession.wish.pools.length === 0 &&
          WireSession.wish.marks.length === 1 &&
          WireSession.wish.marks[0].field === 8 &&
          WireSession.goal7 !== null &&
          WireSession.goal7.currDay === 1,
        "non-empty 27001 without pools stays synced and leaves 21010"
      );
      assert(Session.gold === goldBeforeBadWish && Session.diamond === diamondBeforeBadWish, "outer-only 27001 does not write gold or diamonds");
      const goldBeforeBadSummon = Session.gold;
      const diamondBeforeBadSummon = Session.diamond;
      roleSockets[0].push(encodeFrame(WireCmd.heroSummonCount, new Uint8Array([0x80])));
      assert(
        WireSession.hasSummon() &&
          WireSession.summon !== null &&
          WireSession.summon.freeTime === 2 &&
          WireSession.summon.seniorFreeTime === 5 &&
          WireSession.heroes !== null &&
          WireSession.heroes.length === 0 &&
          sawWire("4004 解不开"),
        "bad 4004 keeps the counts and the 4001 roster"
      );
      assert(Session.gold === goldBeforeBadSummon && Session.diamond === diamondBeforeBadSummon, "bad 4004 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.heroSummonCount));
      assert(
        WireSession.hasSummon() &&
          WireSession.summon !== null &&
          WireSession.summon.freeTime === null &&
          WireSession.summon.seniorFreeTime === null &&
          WireSession.heroes !== null &&
          WireSession.heroes.length === 0,
        "empty 4004 body replaces the counts and stays synced"
      );
      assert(Session.gold === goldBeforeBadSummon && Session.diamond === diamondBeforeBadSummon, "empty 4004 does not write gold or diamonds");
      roleSockets[0].push(encodeFrame(WireCmd.heroSummonCount, summonOuterOnly));
      assert(
        WireSession.hasSummon() &&
          WireSession.summon !== null &&
          WireSession.summon.freeTime === null &&
          WireSession.summon.seniorFreeTime === null &&
          WireSession.summon.marks.length === 1 &&
          WireSession.summon.marks[0].field === 4 &&
          WireSession.wish !== null &&
          WireSession.wish.pools.length === 0,
        "non-empty 4004 without counts stays synced and leaves 27001"
      );
      assert(Session.gold === goldBeforeBadSummon && Session.diamond === diamondBeforeBadSummon, "outer-only 4004 does not write gold or diamonds");
      assert(
        WireSession.hasProphet() &&
          WireSession.prophet !== null &&
          WireSession.prophet.luckys.length === 2 &&
          WireSession.prophet.luckys[0].lucky === 3,
        "4004 replacements leave the 13044 luckys"
      );
      assert(
        WireSession.hasJewel() &&
          WireSession.jewel !== null &&
          WireSession.jewel.heroes.length === 2 &&
          WireSession.jewel.heroes[0].jewels[0].jewelId === 7,
        "4004 replacements leave the 4101 jewels"
      );
      const goldBeforeBadProphet = Session.gold;
      const diamondBeforeBadProphet = Session.diamond;
      roleSockets[0].push(encodeFrame(WireCmd.prophetSummon, new Uint8Array([0x80])));
      assert(
        WireSession.hasProphet() &&
          WireSession.prophet !== null &&
          WireSession.prophet.luckys.length === 2 &&
          WireSession.prophet.luckys[1].lucky === 0 &&
          WireSession.summon !== null &&
          WireSession.summon.marks.length === 1 &&
          sawWire("13044 解不开"),
        "bad 13044 keeps the luckys and the 4004 counts"
      );
      assert(Session.gold === goldBeforeBadProphet && Session.diamond === diamondBeforeBadProphet, "bad 13044 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.prophetSummon));
      assert(
        WireSession.hasProphet() &&
          WireSession.prophet !== null &&
          WireSession.prophet.luckys.length === 0 &&
          formatWireProphetHead(WireSession.prophet) === "空表" &&
          WireSession.summon !== null &&
          WireSession.summon.marks.length === 1,
        "empty 13044 body replaces the luckys and stays synced"
      );
      assert(Session.gold === goldBeforeBadProphet && Session.diamond === diamondBeforeBadProphet, "empty 13044 does not write gold or diamonds");
      roleSockets[0].push(encodeFrame(WireCmd.prophetSummon, prophetOuterOnly));
      assert(
        WireSession.hasProphet() &&
          WireSession.prophet !== null &&
          WireSession.prophet.luckys.length === 0 &&
          WireSession.prophet.marks.length === 1 &&
          WireSession.prophet.marks[0].field === 4 &&
          WireSession.summon !== null &&
          WireSession.summon.marks[0].field === 4,
        "non-empty 13044 without luckys stays synced and leaves 4004"
      );
      assert(Session.gold === goldBeforeBadProphet && Session.diamond === diamondBeforeBadProphet, "outer-only 13044 does not write gold or diamonds");
      assert(
        WireSession.hasJewel() &&
          WireSession.jewel !== null &&
          WireSession.jewel.heroes.length === 2 &&
          WireSession.jewel.heroes[0].heroId === 16,
        "13044 replacements leave the 4101 jewels"
      );
      const goldBeforeBadJewel = Session.gold;
      const diamondBeforeBadJewel = Session.diamond;
      roleSockets[0].push(encodeFrame(WireCmd.heroJewel, new Uint8Array([0x80])));
      assert(
        WireSession.hasJewel() &&
          WireSession.jewel !== null &&
          WireSession.jewel.heroes.length === 2 &&
          WireSession.jewel.heroes[0].jewels[0].place === 1 &&
          WireSession.prophet !== null &&
          WireSession.prophet.marks.length === 1 &&
          sawWire("4101 解不开"),
        "bad 4101 keeps the jewels and the 13044 luckys"
      );
      assert(Session.gold === goldBeforeBadJewel && Session.diamond === diamondBeforeBadJewel, "bad 4101 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.heroJewel));
      assert(
        WireSession.hasJewel() &&
          WireSession.jewel !== null &&
          WireSession.jewel.heroes.length === 0 &&
          formatWireJewelHead(WireSession.jewel) === "空表" &&
          WireSession.prophet !== null &&
          WireSession.prophet.marks.length === 1,
        "empty 4101 body replaces the jewels and stays synced"
      );
      assert(Session.gold === goldBeforeBadJewel && Session.diamond === diamondBeforeBadJewel, "empty 4101 does not write gold or diamonds");
      roleSockets[0].push(encodeFrame(WireCmd.heroJewel, jewelOuterOnly));
      assert(
        WireSession.hasJewel() &&
          WireSession.jewel !== null &&
          WireSession.jewel.heroes.length === 0 &&
          WireSession.jewel.marks.length === 1 &&
          WireSession.jewel.marks[0].field === 4 &&
          WireSession.prophet !== null &&
          WireSession.prophet.marks[0].field === 4 &&
          WireSession.heroes !== null &&
          WireSession.heroes.length === 0 &&
          WireSession.illustrat !== null &&
          WireSession.illustrat.rows.length === 2 &&
          WireSession.illustrat.rows[0].heroType === 102,
        "non-empty 4101 without heroes stays synced and leaves 13044, 4001 and 4013"
      );
      assert(Session.gold === goldBeforeBadJewel && Session.diamond === diamondBeforeBadJewel, "outer-only 4101 does not write gold or diamonds");
      const goldBeforeBadIllustrat = Session.gold;
      const diamondBeforeBadIllustrat = Session.diamond;
      roleSockets[0].push(encodeFrame(WireCmd.illustratReward, new Uint8Array([0x80])));
      assert(
        WireSession.hasIllustrat() &&
          WireSession.illustrat !== null &&
          WireSession.illustrat.rows.length === 2 &&
          WireSession.illustrat.rows[0].star === 5 &&
          WireSession.jewel !== null &&
          WireSession.jewel.marks.length === 1 &&
          sawWire("4013 解不开"),
        "bad 4013 keeps the rows and the 4101 jewels"
      );
      assert(Session.gold === goldBeforeBadIllustrat && Session.diamond === diamondBeforeBadIllustrat, "bad 4013 stays off the wallet");
      roleSockets[0].push(encodeFrame(WireCmd.illustratReward));
      assert(
        WireSession.hasIllustrat() &&
          WireSession.illustrat !== null &&
          WireSession.illustrat.rows.length === 0 &&
          formatWireIllustratHead(WireSession.illustrat) === "空表" &&
          WireSession.jewel !== null &&
          WireSession.jewel.marks.length === 1,
        "empty 4013 body replaces the rows and stays synced"
      );
      assert(Session.gold === goldBeforeBadIllustrat && Session.diamond === diamondBeforeBadIllustrat, "empty 4013 does not write gold or diamonds");
      roleSockets[0].push(encodeFrame(WireCmd.illustratReward, illustratOuterOnly));
      assert(
        WireSession.hasIllustrat() &&
          WireSession.illustrat !== null &&
          WireSession.illustrat.rows.length === 0 &&
          WireSession.illustrat.marks.length === 1 &&
          WireSession.illustrat.marks[0].field === 4 &&
          WireSession.jewel !== null &&
          WireSession.jewel.marks[0].field === 4 &&
          WireSession.heroes !== null &&
          WireSession.heroes.length === 0,
        "non-empty 4013 without rows stays synced and leaves 4101 and 4001"
      );
      assert(Session.gold === goldBeforeBadIllustrat && Session.diamond === diamondBeforeBadIllustrat, "outer-only 4013 does not write gold or diamonds");
      if (roleNet) roleNet.close();
      WireSession.close();
    } finally {
      if (roleNet) roleNet.close();
      WireSession.close();
      Session.account = snapAccount2;
      Session.token = snapToken2;
      Session.serverId = snapServerId2;
      Session.serverName = snapServerName2;
      Session.role = snapRole2;
      Session.openDay = snapDay2;
      Session.stageId = snapStage2;
      Session.gold = snapGold2;
      Session.diamond = snapDiamond2;
      Session.source = snapSource2;
      Session.wireSync.name = false;
      Session.wireSync.level = false;
      Session.wireSync.gold = false;
      Session.wireSync.diamond = false;
    }

    if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === "function") {
      const live = new WsTransport({ connectTimeoutMs: 400 });
      let liveText = "";
      try {
        await live.connect("ws://127.0.0.1:1");
      } catch (err) {
        liveText = messageOf(err);
      }
      assert(liveText === "服未启动" || liveText === "连接超时", "closed port " + liveText);
      live.close();
    }
  } finally {
    off();
  }
}

async function main(): Promise<void> {
  checkPages();
  checkPopups();
  checkGates();
  checkPanelNav();
  checkSafeArea();
  checkLog();
  checkLoginPrefs();
  checkMainline();
  checkIdleMath();
  await checkNet();
  await checkWs();
  await checkSession();
  await checkNoRole();
  await checkReplay();
  await checkIdleSession();
  await checkHero();
  await checkSummon();
  await checkBag();
  await checkMail();
  await checkSmith();
  await checkArena();
  await checkTower();
  await checkDaily();
  await checkLogin7();
  await checkGoal7();
  await checkStagePush();
  await checkShop();
  await checkWish();
  await checkCafe();
  await checkGift();
  await checkLimited();
  console.log("skeleton-check ok");
}

function goalTask(tasks: readonly Goal7Task[], id: string): Goal7Task | null {
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].id === id) return tasks[i];
  }
  return null;
}

async function checkGoal7(): Promise<void> {
  assert(GOAL7_DAYS === 7 && GOAL7_LATE_STAGE === 70 && GOAL7_LATE_ID === "stage-70", "goal constants");
  assert(GOAL7_TABLE.length === 7, "seven seeded tasks");
  const stage1 = findGoal7Task("stage-1");
  const late = findGoal7Task(GOAL7_LATE_ID);
  assert(stage1 !== null && stage1.day === 1 && stage1.target === 1 && stage1.unlockStage === 0 && stage1.jump === "mainline", "stage 1 def");
  assert(findGoal7Task("summon-1")!.jump === "summon" && findGoal7Task("hero-1")!.jump === "hero", "summon and hero jumps");
  assert(findGoal7Task("idle-1")!.jump === "idle" && findGoal7Task("stage-5")!.day === 4, "idle and stage 5");
  assert(late !== null && late.day === 7 && late.target === 70 && late.unlockStage === 70 && late.jump === "mainline", "stage 70 hook");
  assert(findGoal7Task("") === null && findGoal7Task("nope") === null, "missing task");
  assert(goal7RewardText(stage1!.rewards) === "金币 +40", "stage 1 reward");
  assert(goal7RewardText(findGoal7Task("stage-5")!.rewards) === "金币 +80、小金币袋 ×1", "stage 5 reward");
  assert(goal7RewardText(late!.rewards) === "金币 +500、钻石 +80、经验药水 ×1", "stage 70 reward");
  assert(heroLevelsToUpgrades([1, 1, 1]) === 0 && heroLevelsToUpgrades([2, 4]) === 4, "upgrade sum");
  assert(goal7SubLine().indexOf("70") >= 0 && goal7DayLabel(7) === "第7天", "sub and day label");
  assert(goal7WalletLine(140, 30) === "持有金币 140 · 钻石 30", "wallet line");
  assert(goal7GoText("mainline") === "前往主线" && goal7GoText("summon") === "前往召唤", "go labels");
  assert(goal7GoText("hero") === "前往英雄" && goal7GoText("idle") === "前往挂机" && goal7GoText("shop") === "前往", "go labels rest");
  assert(goal7ClaimText("in-progress") === "领取" && goal7ClaimText("claimable") === "领取", "claim label");
  assert(goal7ClaimText("locked") === "未开启" && goal7ClaimText("claimed") === "已领取", "locked and claimed labels");
  assert(goal7BadJumpToast() === "这里还去不了" && goal7MissingToast() === "没有这个目标", "bad jump and missing");
  assert(goal7LockedToast(70) === "通关第70关后才能领取" && goal7LockedToast(1) === "目标尚未开启", "lock copy");
  assert(goal7IncompleteToast("通关主线第1关", 0, 1) === "通关主线第1关尚未完成（0/1）", "incomplete copy");
  assert(goal7ClaimedToast("召唤1次") === "召唤1次已经领取" && goal7ClaimedToast("") === "这个目标已经领取", "claimed copy");
  assert(goal7DayHint(5, 0) === "这一天还没有目标" && goal7DayHint(7, 1).indexOf("70") >= 0, "day hints");
  assert(errorText(ErrorCode.GOAL7_NOT_FOUND) === "没有这个目标", "missing text");
  assert(errorText(ErrorCode.GOAL7_LOCKED) === "目标尚未开启", "locked text");
  assert(errorText(ErrorCode.GOAL7_INCOMPLETE) === "目标尚未完成", "incomplete text");
  assert(errorText(ErrorCode.GOAL7_CLAIMED) === "这个目标已经领取", "claimed text");

  const fresh = new MockGameSession();
  const view = fresh.goal7View();
  assert(view.ok && view.clearedStage === 0 && view.tasks.length === 7, "fresh view");
  assert(view.gold === MOCK_STARTER_GOLD && view.diamond === MOCK_STARTER_DIAMOND, "view wallet");
  assert(goal7ClaimableCount(view.tasks) === 0 && goal7HeadLine(view.clearedStage, 0) === "已通关第 0 关 · 可领 0 项", "nothing ready");
  assert(goal7TasksOnDay(view.tasks, 1).length === 2 && goal7TasksOnDay(view.tasks, 5).length === 0, "day groups");
  assert(goal7TasksOnDay(view.tasks, 6).length === 0 && goal7TasksOnDay(view.tasks, 7).length === 1, "empty and late days");
  const row1 = goalTask(view.tasks, "stage-1");
  const row70 = goalTask(view.tasks, GOAL7_LATE_ID);
  assert(row1 !== null && row1.state === "in-progress" && row1.current === 0 && row1.target === 1, "stage 1 progress");
  assert(goal7TitleLine(row1!) === "通关主线第1关 · 进行中" && goal7DetailLine(row1!) === "0/1 · 金币 +40", "stage 1 lines");
  assert(goalTask(view.tasks, "summon-1")!.state === "in-progress" && goalTask(view.tasks, "hero-1")!.state === "in-progress", "summon and hero open");
  assert(goalTask(view.tasks, "idle-1")!.state === "in-progress" && goalTask(view.tasks, "stage-5")!.current === 0, "idle and stage 5 open");
  assert(row70 !== null && row70.state === "locked" && row70.current === 0 && row70.target === 70, "stage 70 locked");
  assert(goal7TitleLine(row70!) === "通关主线第70关 · 未开启" && goal7DetailLine(row70!) === "0/70 · 金币 +500、钻石 +80、经验药水 ×1", "stage 70 lines");

  const early = fresh.goal7Claim({ id: "stage-1" });
  assert(early.ok === false && early.code === ErrorCode.GOAL7_INCOMPLETE && goal7FailToast(early) === "通关主线第1关尚未完成（0/1）", "incomplete claim");
  assert(fresh.gold === MOCK_STARTER_GOLD && fresh.diamond === MOCK_STARTER_DIAMOND && fresh.clearedStage === 0, "incomplete spends nothing");
  const missing = fresh.goal7Claim({ id: "nope" });
  assert(missing.ok === false && missing.code === ErrorCode.GOAL7_NOT_FOUND && goal7FailToast(missing) === "没有这个目标", "missing id");
  const blank = fresh.goal7Claim({});
  assert(blank.ok === false && blank.code === ErrorCode.GOAL7_NOT_FOUND && fresh.gold === MOCK_STARTER_GOLD, "blank id");
  const lockedNow = fresh.goal7Claim({ id: GOAL7_LATE_ID });
  assert(lockedNow.ok === false && lockedNow.code === ErrorCode.GOAL7_LOCKED && goal7FailToast(lockedNow) === "通关第70关后才能领取", "fresh late lock");
  assert(fresh.loginDay === 1 && fresh.idleClaimCount === 0 && fresh.stageId === 1, "reject leaves login and idle");

  const entered = fresh.stageEnter({ stageId: 1 });
  const won = fresh.stageResult({ stageId: 1, battleId: entered.battleId, win: true });
  assert(won.ok && fresh.clearedStage === 1 && fresh.gold === MOCK_STARTER_GOLD + 10, "clear stage 1");
  const ready = goalTask(fresh.goal7View().tasks, "stage-1");
  assert(ready !== null && ready.state === "claimable" && goal7DetailLine(ready) === "1/1 · 金币 +40", "stage 1 claimable");
  assert(goalTask(fresh.goal7View().tasks, "stage-3")!.state === "in-progress" && goalTask(fresh.goal7View().tasks, "stage-3")!.current === 1, "stage 3 still short");
  assert(goalTask(fresh.goal7View().tasks, GOAL7_LATE_ID)!.state === "locked", "one clear does not open 70");
  const claimed = fresh.goal7Claim({ id: "stage-1" });
  assert(claimed.ok && claimed.goldGain === 40 && claimed.diamondGain === 0 && claimed.state === "claimed", "claim stage 1");
  assert(claimed.gold === MOCK_STARTER_GOLD + 50 && fresh.loginDay === 1 && fresh.openDay === 1, "claim gold only");
  assert(goal7ClaimToast(claimed.title, claimed.rewards) === "领取成功：通关主线第1关，金币 +40", "claim toast");
  const again = fresh.goal7Claim({ id: "stage-1" });
  assert(again.ok === false && again.code === ErrorCode.GOAL7_CLAIMED && goal7FailToast(again) === "通关主线第1关已经领取", "already claimed");
  assert(fresh.gold === MOCK_STARTER_GOLD + 50 && goalTask(fresh.goal7View().tasks, "stage-1")!.state === "claimed", "second claim keeps wallet");

  const broke = new MockGameSession({ diamond: 0 });
  assert(broke.summon({ count: 1 }).ok === false && goalTask(broke.goal7View().tasks, "summon-1")!.state === "in-progress", "failed summon ignored");
  const pull = new MockGameSession();
  assert(pull.summon({ count: 1 }).ok && pull.goal7View().tasks.length === 7, "one summon");
  const summonTask = goalTask(pull.goal7View().tasks, "summon-1");
  assert(summonTask !== null && summonTask.state === "claimable" && summonTask.current === 1, "summon claimable");
  const gems = pull.goal7Claim({ id: "summon-1" });
  assert(gems.ok && gems.diamondGain === 10 && pull.diamond === MOCK_STARTER_DIAMOND - SUMMON_SINGLE_COST + 10, "summon diamonds");
  assert(pull.gold === MOCK_STARTER_GOLD && pull.clearedStage === 0 && goal7FailToast(pull.goal7Claim({ id: "summon-1" })) === "召唤1次已经领取", "summon once");

  const poor = new MockGameSession({ gold: 10 });
  assert(poor.heroUpgrade({ heroId: poor.heroes[0].id }).ok === false && poor.gold === 10, "upgrade refused");
  assert(goalTask(poor.goal7View().tasks, "hero-1")!.state === "in-progress", "failed upgrade ignored");
  const grow = new MockGameSession();
  const upgraded = grow.heroUpgrade({ heroId: grow.heroes[0].id });
  assert(upgraded.ok && grow.gold === MOCK_STARTER_GOLD - 30, "upgrade spends gold");
  assert(goalTask(grow.goal7View().tasks, "hero-1")!.state === "claimable", "upgrade claimable");
  const heroPay = grow.goal7Claim({ id: "hero-1" });
  assert(heroPay.ok && heroPay.goldGain === 50 && grow.gold === MOCK_STARTER_GOLD - 30 + 50, "hero payout");
  const potion = new MockGameSession();
  assert(potion.bagUse({ id: ITEM_EXP_POTION, count: 1 }).ok, "potion levels leader");
  assert(goalTask(potion.goal7View().tasks, "hero-1")!.state === "claimable" && goalTask(potion.goal7View().tasks, "hero-1")!.current >= 1, "potion counts");

  let now = 1700000000000;
  const idle = new MockGameSession(undefined, () => now);
  assert(idle.idleClaim().ok === false && idle.idleClaimCount === 0, "short idle ignored");
  assert(goalTask(idle.goal7View().tasks, "idle-1")!.state === "in-progress", "idle still open");
  now += 30000;
  const idlePay = idle.idleClaim();
  assert(idlePay.ok && idle.idleClaimCount === 1 && idlePay.ownedItem === 1, "idle counted");
  assert(goalTask(idle.goal7View().tasks, "idle-1")!.state === "claimable", "idle claimable");
  const stones = idle.goal7Claim({ id: "idle-1" });
  assert(stones.ok && stones.goldGain === 0 && idle.itemCounts[IDLE_ITEM_ID] === 3, "idle stones");
  assert(idle.gold === MOCK_STARTER_GOLD + 3 && idle.clearedStage === 0, "idle goal leaves stage");

  const near = new MockGameSession({ clearedStage: 69, openDay: 14 });
  const nearTask = goalTask(near.goal7View().tasks, GOAL7_LATE_ID);
  assert(nearTask !== null && nearTask.state === "locked" && nearTask.current === 69 && goal7DetailLine(nearTask) === "69/70 · 金币 +500、钻石 +80、经验药水 ×1", "69 still locked");
  assert(goalTask(near.goal7View().tasks, "stage-1")!.state === "claimable" && goalTask(near.goal7View().tasks, "stage-5")!.state === "claimable", "early tasks follow clears");
  const nearLock = near.goal7Claim({ id: GOAL7_LATE_ID });
  assert(nearLock.ok === false && nearLock.code === ErrorCode.GOAL7_LOCKED && near.gold === MOCK_STARTER_GOLD, "69 cannot claim");
  const loseEnter = near.stageEnter({ stageId: 70 });
  const lost = near.stageResult({ stageId: 70, battleId: loseEnter.battleId, win: false });
  assert(lost.ok && lost.win === false && near.clearedStage === 69 && goalTask(near.goal7View().tasks, GOAL7_LATE_ID)!.state === "locked", "loss stays locked");
  const winEnter = near.stageEnter({ stageId: 70 });
  const cleared = near.stageResult({ stageId: 70, battleId: winEnter.battleId, win: true });
  assert(cleared.ok && near.clearedStage === 70 && near.role.level === 71, "clear 70");
  const opened = goalTask(near.goal7View().tasks, GOAL7_LATE_ID);
  assert(opened !== null && opened.state === "claimable" && goal7TitleLine(opened) === "通关主线第70关 · 可领取", "70 claimable");
  assert(goal7HeadLine(70, goal7ClaimableCount(near.goal7View().tasks)).indexOf("已通关第 70 关") === 0, "head shows 70");
  const latePay = near.goal7Claim({ id: GOAL7_LATE_ID });
  assert(latePay.ok && latePay.goldGain === 500 && latePay.diamondGain === 80, "late payout");
  assert(near.gold === MOCK_STARTER_GOLD + 10 + 500 && near.diamond === MOCK_STARTER_DIAMOND + 80, "late wallet");
  assert(near.itemCounts[ITEM_EXP_POTION] === STARTER_EXP_POTION + 1 && near.loginDay === 1, "late potion leaves login");
  assert(goalTask(near.goal7View().tasks, GOAL7_LATE_ID)!.state === "claimed" && near.arenaUsed === 0 && near.towerFloor === 1 && near.dailyUsed === 0, "late leaves modes");

  const seeded = new MockGameSession({
    clearedStage: 5,
    idleClaimCount: 1,
    summonCursor: 2,
    goalClaimed: ["stage-1", "nope"],
    heroes: [{ id: 10001, name: "光耀骑士", level: 2, star: 3 }],
  });
  assert(goalTask(seeded.goal7View().tasks, "stage-1")!.state === "claimed", "seed claimed wins");
  assert(goalTask(seeded.goal7View().tasks, "stage-5")!.state === "claimable" && goalTask(seeded.goal7View().tasks, "summon-1")!.state === "claimable", "seed progress");
  assert(goalTask(seeded.goal7View().tasks, "hero-1")!.state === "claimable" && goalTask(seeded.goal7View().tasks, "idle-1")!.state === "claimable", "seed hero and idle");
  assert(goalTask(seeded.goal7View().tasks, GOAL7_LATE_ID)!.state === "locked" && seeded.goal7Claim({ id: "stage-1" }).code === ErrorCode.GOAL7_CLAIMED, "seeded claimed");
  const preset = new MockGameSession({ goalClaimed: [GOAL7_LATE_ID] });
  assert(goalTask(preset.goal7View().tasks, GOAL7_LATE_ID)!.state === "claimed" && preset.gold === MOCK_STARTER_GOLD, "claimed beats locked");

  const reset = new MockGameSession({ clearedStage: 70, idleClaimCount: 4, summonCursor: 3, goalClaimed: ["stage-70", "stage-1"], gold: 900 });
  assert(reset.roleCreate({ name: "新人" }).ok, "create");
  assert(reset.clearedStage === 0 && reset.idleClaimCount === 0 && reset.gold === MOCK_STARTER_GOLD, "create resets counters");
  assert(goalTask(reset.goal7View().tasks, "stage-1")!.state === "in-progress" && goalTask(reset.goal7View().tasks, GOAL7_LATE_ID)!.state === "locked", "create clears claims");
  assert(reset.login7View().days[0].state === "ready" && reset.loginDay === 1, "create still resets login7");

  const both = new MockGameSession();
  assert(both.login7Claim({ day: 1 }).ok && goalTask(both.goal7View().tasks, "stage-1")!.state === "in-progress", "login7 leaves goals");
  const transport = new MockTransport({ latencyMs: 5 });
  const net = quietNet(transport);
  await net.connect("mock://local");
  const remoteView = await Proto.goal7View({}, net);
  assert(remoteView.ok && remoteView.tasks.length === 7 && goalTask(remoteView.tasks, GOAL7_LATE_ID)!.state === "locked", "proto view");
  const remoteEarly = await Proto.goal7Claim({ id: "stage-1" }, net);
  assert(remoteEarly.ok === false && remoteEarly.code === ErrorCode.GOAL7_INCOMPLETE && remoteEarly.gold === MOCK_STARTER_GOLD, "proto incomplete");
  const remoteEnter = await Proto.stageEnter({ stageId: 1 }, net);
  const remoteWin = await Proto.stageResult({ stageId: 1, battleId: remoteEnter.battleId, win: true }, net);
  assert(remoteWin.ok && remoteWin.win, "proto clear");
  const remoteClaim = await Proto.goal7Claim({ id: "stage-1" }, net);
  assert(remoteClaim.ok && remoteClaim.gold === MOCK_STARTER_GOLD + 10 + 40 && remoteClaim.rewards.length === 1, "proto claim");
  const remoteAgain = await Proto.goal7Claim({ id: "stage-1" }, net);
  assert(remoteAgain.ok === false && remoteAgain.code === ErrorCode.GOAL7_CLAIMED && remoteAgain.gold === remoteClaim.gold, "proto claimed");
  const remoteLocked = await Proto.goal7Claim({ id: GOAL7_LATE_ID }, net);
  assert(remoteLocked.ok === false && remoteLocked.code === ErrorCode.GOAL7_LOCKED && transport.session.clearedStage === 1, "proto late stays locked");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applyGoal7Claim(remoteClaim);
  assert(Session.gold === remoteClaim.gold && Session.diamond === remoteClaim.diamond, "apply goal7");
  applyGoal7Claim({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteClaim.gold && Session.diamond === remoteClaim.diamond, "failed goal7 ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  const ids = P0_CMDS.filter((row) => row.cmd === Cmd.goal7View || row.cmd === Cmd.goal7Claim).map((row) => row.id);
  assert(ids.length === 2 && ids[0] === 2301 && ids[1] === 2302, "goal7 cmd ids");
  net.close();
}

async function checkStagePush(): Promise<void> {
  assert(MAINLINE_PUSH_STAGE === 70 && MAINLINE_PUSH_STAGE === GOAL7_LATE_STAGE, "push target is day-7 stage");
  assert(STAGE_WIN_GOLD === 10 && MAINLINE_PUSH_MAX === 200, "win gold and push cap");
  assert(pushButtonText() === "推关到70（调试）", "push button");
  assert(pushToast(70, 71, 700) === "已推到第70关，金币 +700，下一关 71", "push toast");
  assert(pushAlreadyToast(70) === "已经通关第70关", "already toast");

  const fresh = new MockGameSession();
  const anchor = fresh.idleAnchorMs;
  const heroLevel = fresh.heroes[0].level;
  fresh.arenaUsed = 2;
  const pushed = fresh.stagePush({});
  assert(pushed.ok && pushed.already === false && pushed.fromStage === 0 && pushed.clearedStage === 70, "push clears 70");
  assert(pushed.goldGain === 70 * STAGE_WIN_GOLD && pushed.rewards.length === 1 && pushed.rewards[0].count === 700, "push gold reward");
  assert(fresh.clearedStage === 70 && fresh.stageId === 71 && fresh.role.level === 71, "push progress");
  assert(fresh.gold === MOCK_STARTER_GOLD + 700 && fresh.diamond === MOCK_STARTER_DIAMOND, "push wallet");
  assert(fresh.openDay === 15 && fresh.loginDay === 1 && fresh.idleAnchorMs === anchor, "push day and idle clock");
  assert(fresh.heroes[0].level === heroLevel && fresh.summonCursor === 0 && fresh.idleClaimCount === 0, "push leaves growth");
  assert(fresh.arenaUsed === 2 && fresh.towerFloor === 1 && fresh.dailyUsed === 0, "push leaves daily counts");
  assert(goalTask(fresh.goal7View().tasks, GOAL7_LATE_ID)!.state === "claimable", "day 7 claimable after push");
  const late = fresh.goal7Claim({ id: GOAL7_LATE_ID });
  assert(late.ok && late.goldGain === 500 && late.diamondGain === 80, "day 7 claim after push");
  assert(fresh.itemCounts[ITEM_EXP_POTION] === STARTER_EXP_POTION + 1 && fresh.clearedStage === 70, "potion and stage stay");
  const again = fresh.stagePush({ target: 70 });
  assert(again.ok && again.already === true && again.goldGain === 0 && fresh.gold === late.gold, "second push is free");
  assert(pushAlreadyToast(again.clearedStage) === "已经通关第70关", "second toast");

  const viewed = fresh.arenaView();
  assert(viewed.ok && fresh.arenaUsed === 0 && fresh.arenaDay === 15, "arena resets on the new open day");
  assert(isServerGateOpen({ key: "magic_tower_open_day", open_server_day: 30, note: "幻魔塔" }, fresh.openDay) === false, "day 15 keeps magic tower shut");

  for (let stage = 71; stage <= 75; stage++) {
    const entered = fresh.stageEnter({ stageId: stage });
    const won = fresh.stageResult({ stageId: stage, battleId: entered.battleId, win: true });
    assert(won.ok && won.win && won.rewards[0].count === STAGE_WIN_GOLD, "past 70 still wins " + stage);
  }
  assert(fresh.clearedStage === 75 && fresh.stageId === 76 && fresh.role.level === 76 && fresh.openDay === 16, "stage 75 day");
  const lost = fresh.stageResult({ stageId: 76, win: false });
  assert(lost.ok && lost.win === false && fresh.clearedStage === 75 && fresh.gold === late.gold + 50, "loss after 75 stays");
  const past = fresh.stagePush({ target: 70 });
  assert(past.ok && past.already === true && fresh.clearedStage === 75 && fresh.stageId === 76, "push does not rewind");

  const manual = new MockGameSession();
  for (let stage = 1; stage <= 70; stage++) {
    const entered = manual.stageEnter({ stageId: stage });
    const won = manual.stageResult({ stageId: stage, battleId: entered.battleId, win: true });
    assert(won.ok && won.win, "manual " + stage);
  }
  assert(manual.gold === MOCK_STARTER_GOLD + 700 && manual.role.level === 71 && manual.openDay === 15, "manual matches push");
  assert(goalTask(manual.goal7View().tasks, GOAL7_LATE_ID)!.state === "claimable", "manual also opens day 7");

  const partial = new MockGameSession({ clearedStage: 65, openDay: 20, arenaUsed: 1, arenaDay: 20 });
  const step = partial.stagePush({ target: MAINLINE_PUSH_STAGE });
  assert(step.ok && step.fromStage === 65 && step.goldGain === 50 && step.clearedStage === 70, "partial push");
  assert(partial.role.level === 71 && partial.openDay === 20 && partial.stageId === 71, "higher open day stays");
  assert(partial.arenaUsed === 1 && partial.arenaView().used === 1, "same day keeps arena chances");
  assert(goalTask(partial.goal7View().tasks, GOAL7_LATE_ID)!.state === "claimable", "partial opens day 7");

  const blocked = new MockGameSession({ clearedStage: 3, gold: 40 });
  const bad = blocked.stagePush({ target: 0 });
  const high = blocked.stagePush({ target: MAINLINE_PUSH_MAX + 1 });
  const nan = blocked.stagePush({ target: Number.NaN });
  assert(bad.ok === false && high.ok === false && nan.ok === false, "bad targets");
  assert(bad.code === ErrorCode.STAGE_ID_INVALID && blocked.clearedStage === 3 && blocked.gold === 40 && blocked.role.level === 4, "bad target leaves progress");

  const quick = new MockGameSession({ clearedStage: 69 });
  const entered = quick.stageEnter({ stageId: quick.stageId });
  const won = quick.stageResult({ stageId: entered.stageId, battleId: entered.battleId, win: true });
  assert(won.ok && quick.clearedStage === 70 && quick.gold === MOCK_STARTER_GOLD + STAGE_WIN_GOLD, "quick battle still one stage");

  const transport = new MockTransport({ latencyMs: 5 });
  const net = quietNet(transport);
  await net.connect("mock://local");
  const remote = await Proto.stagePush({ target: 70 }, net);
  assert(remote.ok && remote.clearedStage === 70 && remote.goldGain === 700 && remote.level === 71 && remote.openDay === 15, "proto push");
  const lockedBefore = await Proto.goal7View({}, net);
  assert(goalTask(lockedBefore.tasks, GOAL7_LATE_ID)!.state === "claimable", "proto day 7 open");
  const claimed = await Proto.goal7Claim({ id: GOAL7_LATE_ID }, net);
  assert(claimed.ok && claimed.gold === MOCK_STARTER_GOLD + 700 + 500 && claimed.diamond === MOCK_STARTER_DIAMOND + 80, "proto claim day 7");
  const repeat = await Proto.stagePush({}, net);
  assert(repeat.ok && repeat.already === true && repeat.gold === claimed.gold, "proto second push");
  const ids = P0_CMDS.filter((row) => row.cmd === Cmd.stagePush).map((row) => row.id);
  assert(ids.length === 1 && ids[0] === 1203, "stage push cmd id");
  net.close();
}

async function checkShop(): Promise<void> {
  assert(SHOP_OFFERS.length === 3, "three skus");
  const stone = findShopOffer(SHOP_STONE_ID);
  const bag = findShopOffer(SHOP_GOLD_BAG_ID);
  const potion = findShopOffer(SHOP_POTION_ID);
  assert(stone !== null && stone.itemId === IDLE_ITEM_ID && stone.price === SHOP_STONE_PRICE && stone.limit === SHOP_STONE_LIMIT, "stone offer");
  assert(bag !== null && bag.currency === "diamond" && bag.price === SHOP_BAG_PRICE && bag.limit === SHOP_BAG_LIMIT, "bag offer");
  assert(potion !== null && potion.currency === "gold" && potion.price === SHOP_POTION_PRICE && potion.limit === SHOP_POTION_LIMIT, "potion offer");
  assert(findShopOffer(99) === null, "unknown offer");
  const listed = listShopSkus(
    () => 0,
    (itemId) => (itemId === ITEM_GOLD_BAG ? STARTER_GOLD_BAG : 0)
  );
  assert(listed.length === 3 && listed[0].name === "强化石" && listed[1].owned === STARTER_GOLD_BAG, "list order");
  assert(shopRefreshLine(1) === "限购随开服天刷新 · 当前开服第 1 天", "refresh line");
  assert(shopWalletLine(100, 20) === "持有金币 100 · 钻石 20", "wallet line");
  assert(shopSkuLine(listed[0]) === "强化石 ×5 · 金币 40 · 今日 0/3 · 背包 ×0", "stone line");
  assert(shopBuyButton(listed[0]) === "购买", "buy label");
  const sold: ShopSku = {
    id: SHOP_STONE_ID,
    itemId: IDLE_ITEM_ID,
    name: "强化石",
    count: 5,
    currency: "gold",
    price: 40,
    bought: 3,
    limit: 3,
    owned: 15,
  };
  assert(shopBuyButton(sold) === "已售罄" && shopSkuLine(sold).indexOf("今日 3/3") >= 0, "sold line");
  assert(shopBuyToast("强化石", 5, "gold", 40) === "购买成功：强化石 ×5，消耗金币 40", "gold toast");
  assert(shopBuyToast("小金币袋", 1, "diamond", 8) === "购买成功：小金币袋 ×1，消耗钻石 8", "diamond toast");
  assert(shopGoldShortToast(40) === "金币不足，购买需要 40", "gold short copy");
  assert(shopDiamondShortToast(8) === "钻石不足，购买需要 8", "diamond short copy");
  assert(shopSoldOutToast("小金币袋") === "小金币袋今日已售罄" && shopMissingToast() === "没有这个商品", "sold and missing copy");
  assert(errorText(ErrorCode.SHOP_GOLD_SHORT) === "金币不足" && errorText(ErrorCode.SHOP_SOLD_OUT) === "今日已售罄", "shop error text");

  const fresh = new MockGameSession();
  const view = fresh.shopView();
  assert(view.ok && view.openDay === 1 && view.gold === MOCK_STARTER_GOLD && view.diamond === MOCK_STARTER_DIAMOND, "fresh view");
  assert(view.skus.length === 3 && view.skus[0].bought === 0 && view.skus[1].owned === STARTER_GOLD_BAG, "fresh shelf");
  assert(fresh.clearedStage === 0 && fresh.arenaUsed === 0 && fresh.dailyUsed === 0 && fresh.loginDay === 1, "view leaves modes");

  const stones = fresh.shopBuy({ id: SHOP_STONE_ID });
  assert(stones.ok && stones.count === SHOP_STONE_COUNT && stones.price === SHOP_STONE_PRICE, "buy stones");
  assert(stones.gold === MOCK_STARTER_GOLD - SHOP_STONE_PRICE && stones.diamond === MOCK_STARTER_DIAMOND, "stone spend");
  assert(stones.owned === SHOP_STONE_COUNT && stones.bought === 1 && fresh.itemCounts[IDLE_ITEM_ID] === SHOP_STONE_COUNT, "stones land in bag");
  assert(shopBuyToast(stones.name, stones.count, stones.currency, stones.price) === "购买成功：强化石 ×5，消耗金币 40", "stone toast from session");
  const listedBag = fresh.bagList();
  const stoneRow = bagItem(listedBag.items, IDLE_ITEM_ID);
  assert(stoneRow !== null && stoneRow.name === "强化石" && stoneRow.count === SHOP_STONE_COUNT, "bag lists stones");
  assert(fresh.shopView().skus[0].bought === 1 && fresh.shopView().gold === stones.gold, "same day keeps stock");

  const broke = new MockGameSession({ gold: SHOP_POTION_PRICE - 1, diamond: SHOP_BAG_PRICE - 1 });
  const noGold = broke.shopBuy({ id: SHOP_POTION_ID });
  assert(noGold.ok === false && noGold.code === ErrorCode.SHOP_GOLD_SHORT && shopFailToast(noGold) === "金币不足，购买需要 50", "gold short");
  assert(broke.gold === SHOP_POTION_PRICE - 1 && broke.itemCounts[ITEM_EXP_POTION] === STARTER_EXP_POTION && broke.shopView().skus[2].bought === 0, "gold short changes nothing");
  const noDiamond = broke.shopBuy({ id: SHOP_GOLD_BAG_ID });
  assert(noDiamond.ok === false && noDiamond.code === ErrorCode.SHOP_DIAMOND_SHORT && shopFailToast(noDiamond) === "钻石不足，购买需要 8", "diamond short");
  assert(broke.diamond === SHOP_BAG_PRICE - 1 && broke.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG, "diamond short changes nothing");
  const missing = broke.shopBuy({ id: 99 });
  assert(missing.ok === false && missing.code === ErrorCode.SHOP_NOT_FOUND && shopFailToast(missing) === "没有这个商品", "missing sku");
  const blank = broke.shopBuy({});
  assert(blank.ok === false && blank.code === ErrorCode.SHOP_NOT_FOUND && broke.gold === SHOP_POTION_PRICE - 1, "blank id");

  const bags = new MockGameSession();
  for (let i = 0; i < SHOP_BAG_LIMIT; i++) {
    const once = bags.shopBuy({ id: SHOP_GOLD_BAG_ID });
    assert(once.ok && once.bought === i + 1, "bag buy " + (i + 1));
  }
  assert(bags.diamond === MOCK_STARTER_DIAMOND - SHOP_BAG_PRICE * SHOP_BAG_LIMIT, "two bags spend diamonds");
  assert(bags.gold === MOCK_STARTER_GOLD && bags.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG + SHOP_BAG_LIMIT, "bags stack");
  const soldOut = bags.shopBuy({ id: SHOP_GOLD_BAG_ID });
  assert(soldOut.ok === false && soldOut.code === ErrorCode.SHOP_SOLD_OUT && shopFailToast(soldOut) === "小金币袋今日已售罄", "sold out");
  assert(bags.diamond === MOCK_STARTER_DIAMOND - SHOP_BAG_PRICE * SHOP_BAG_LIMIT && bags.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG + SHOP_BAG_LIMIT, "sold out keeps wallet");
  const summoner = new MockGameSession();
  assert(summoner.shopBuy({ id: SHOP_GOLD_BAG_ID }).ok, "one bag before summon");
  const summoned = summoner.summon({ count: 1 });
  assert(summoned.ok && summoner.diamond === MOCK_STARTER_DIAMOND - SHOP_BAG_PRICE - SUMMON_SINGLE_COST, "summon still spends diamonds");
  const afterSummon = summoner.shopBuy({ id: SHOP_GOLD_BAG_ID });
  assert(afterSummon.ok === false && afterSummon.code === ErrorCode.SHOP_DIAMOND_SHORT && summoner.summonCursor === 1, "second bag waits for diamonds");

  const seeded = new MockGameSession({
    openDay: 4,
    shopDay: 4,
    shopBought: [
      { id: SHOP_STONE_ID, count: 9 },
      { id: 99, count: 2 },
    ],
    gold: 80,
  });
  const seededView = seeded.shopView();
  assert(seededView.skus[0].bought === SHOP_STONE_LIMIT && seededView.openDay === 4, "seed clamps to limit");
  const seededSold = seeded.shopBuy({ id: SHOP_STONE_ID });
  assert(seededSold.ok === false && seededSold.code === ErrorCode.SHOP_SOLD_OUT && seeded.gold === 80, "seeded sold out");
  const nextDay = new MockGameSession({
    openDay: 2,
    shopDay: 1,
    shopBought: [{ id: SHOP_POTION_ID, count: SHOP_POTION_LIMIT }],
    items: [{ id: ITEM_EXP_POTION, count: 4 }],
  });
  const restocked = nextDay.shopView();
  assert(restocked.skus[2].bought === 0 && restocked.skus[2].owned === 4, "open day restocks");
  const again = nextDay.shopBuy({ id: SHOP_POTION_ID });
  assert(again.ok && again.owned === 5 && nextDay.gold === MOCK_STARTER_GOLD - SHOP_POTION_PRICE, "buy after restock");

  const pushed = new MockGameSession();
  assert(pushed.shopBuy({ id: SHOP_STONE_ID }).ok, "buy before push");
  const rush = pushed.stagePush({});
  assert(rush.ok && pushed.openDay === 15 && pushed.itemCounts[IDLE_ITEM_ID] === SHOP_STONE_COUNT, "push keeps stones");
  assert(pushed.shopView().skus[0].bought === 0 && pushed.shopView().skus[0].owned === SHOP_STONE_COUNT, "push restocks on next view");
  assert(pushed.gold === MOCK_STARTER_GOLD - SHOP_STONE_PRICE + 700, "push gold stacks on the purchase");

  const reset = new MockGameSession({ gold: 10, shopBought: [{ id: SHOP_STONE_ID, count: 2 }], shopDay: 3, openDay: 3 });
  assert(reset.shopView().skus[0].bought === 2, "preset bought");
  assert(reset.roleCreate({ name: "新人" }).ok, "create");
  assert(reset.gold === MOCK_STARTER_GOLD && reset.shopView().skus[0].bought === 0, "create clears purchases");
  assert(reset.itemCounts[IDLE_ITEM_ID] === undefined && reset.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG, "create restores starter bag");
  assert(reset.shopView().openDay === 1 && reset.arenaUsed === 0 && reset.dailyUsed === 0, "create leaves other modes reset");

  const transport = new MockTransport({ latencyMs: 5 });
  const net = quietNet(transport);
  await net.connect("mock://local");
  const remoteView = await Proto.shopView({}, net);
  assert(remoteView.ok && remoteView.skus.length === 3 && remoteView.skus[0].bought === 0, "proto view");
  const remoteBuy = await Proto.shopBuy({ id: SHOP_STONE_ID }, net);
  const remoteBuyAgain = await Proto.shopBuy({ id: SHOP_STONE_ID }, net);
  assert(remoteBuy.ok && remoteBuyAgain.ok && remoteBuyAgain.owned === SHOP_STONE_COUNT * 2, "proto buy twice");
  assert(remoteBuyAgain.gold === MOCK_STARTER_GOLD - SHOP_STONE_PRICE * 2, "proto stone spend");
  const remoteShort = await Proto.shopBuy({ id: SHOP_POTION_ID }, net);
  assert(remoteShort.ok === false && remoteShort.code === ErrorCode.SHOP_GOLD_SHORT && remoteShort.gold === remoteBuyAgain.gold, "proto gold short");
  const remoteBag = await Proto.bagList({}, net);
  const remoteStones = bagItem(remoteBag.items, IDLE_ITEM_ID);
  const remotePotion = bagItem(remoteBag.items, ITEM_EXP_POTION);
  assert(remoteStones !== null && remoteStones.count === SHOP_STONE_COUNT * 2, "proto bag sees stones");
  assert(remotePotion !== null && remotePotion.count === STARTER_EXP_POTION, "proto potion untouched");
  const ids = P0_CMDS.filter((row) => row.cmd === Cmd.shopView || row.cmd === Cmd.shopBuy).map((row) => row.id);
  assert(ids.length === 2 && ids[0] === 2401 && ids[1] === 2402, "shop cmd ids");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applyShopBuy(remoteBuy);
  assert(Session.gold === remoteBuy.gold && Session.diamond === remoteBuy.diamond, "apply shop");
  applyShopBuy({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteBuy.gold && Session.diamond === remoteBuy.diamond, "failed shop ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  net.close();
}

async function checkWish(): Promise<void> {
  assert(WISH_DROPS.length === 10 && WISH_DROPS[9].kind === "diamond" && WISH_DROPS[9].count === 8, "tenth drop is diamond");
  assert(dropAt(0).kind === "gold" && dropAt(0).count === 40 && dropAt(10).kind === "gold", "cursor wraps");
  assert(parseWishPay("gold") === "gold" && parseWishPay("item") === "item" && parseWishPay("diamond") === "diamond", "pay words");
  assert(parseWishPay("Gold") === null && parseWishPay("") === null && parseWishPay(1) === null, "bad pay");
  assert(wishAttemptsLine(0, WISH_DAILY_LIMIT) === "今日剩余 5/5" && wishAttemptsLine(5, 5) === "今日剩余 0/5", "attempts line");
  assert(wishWalletLine(100, 20, 2) === "持有金币 100 · 钻石 20 · 许愿符 ×2", "wallet line");
  assert(wishNextLine(0) === "下一次：金币 40" && wishNextLine(1) === "下一次：强化石 ×2", "next line");
  assert(wishPoolLine().indexOf("第 10 次是钻石") >= 0, "pool line");
  assert(wishPayButton("gold", 0, 5) === "金币许愿（30）" && wishPayButton("item", 0, 5) === "许愿符许愿（×1）", "pay buttons");
  assert(wishPayButton("diamond", 5, 5) === "今日已用完", "spent button");
  assert(wishSuccessToast("gold", "金币", 40, "gold", 30) === "许愿成功：获得金币 40，消耗金币 30", "gold toast");
  assert(wishSuccessToast("stone", "强化石", 2, "item", 1) === "许愿成功：获得强化石 ×2，消耗许愿符 ×1", "item toast");
  assert(wishSuccessToast("diamond", "钻石", 8, "diamond", 5) === "许愿成功：获得钻石 8，消耗钻石 5", "diamond toast");
  assert(wishGoldShortToast(30) === "金币不足，许愿需要 30", "gold short copy");
  assert(wishItemShortToast(1) === "许愿符不足，许愿需要 1", "item short copy");
  assert(wishDiamondShortToast(5) === "钻石不足，许愿需要 5" && wishNoChanceToast() === "今日许愿次数已用完", "other short copy");
  assert(wishPayToast() === "请选择许愿方式", "pay copy");
  assert(errorText(ErrorCode.WISH_NO_CHANCE) === "今日许愿次数已用完" && errorText(ErrorCode.WISH_ITEM_SHORT) === "许愿符不足", "wish error text");

  const fresh = new MockGameSession();
  const view = fresh.wishView();
  assert(view.ok && view.used === 0 && view.limit === WISH_DAILY_LIMIT && view.cursor === 0, "fresh view");
  assert(view.gold === MOCK_STARTER_GOLD && view.diamond === MOCK_STARTER_DIAMOND && view.tokenOwned === STARTER_WISH_TOKEN, "fresh wallet");
  assert(view.goldCost === WISH_GOLD_COST && view.itemCost === WISH_ITEM_COST && view.diamondCost === WISH_DIAMOND_COST, "costs on view");
  assert(fresh.clearedStage === 0 && fresh.arenaUsed === 0 && fresh.dailyUsed === 0 && fresh.shopView().skus[0].bought === 0, "view leaves modes");

  const first = fresh.wishDraw({ pay: "gold" });
  assert(first.ok && first.kind === "gold" && first.count === 40 && first.cost === WISH_GOLD_COST && first.goldGain === 40, "first gold wish");
  assert(first.gold === MOCK_STARTER_GOLD - WISH_GOLD_COST + 40 && first.diamond === MOCK_STARTER_DIAMOND, "gold nets the reward");
  assert(first.tokenOwned === STARTER_WISH_TOKEN && first.used === 1 && first.cursor === 1, "gold wish keeps tokens");
  assert(wishSuccessToast(first.kind, first.name, first.count, first.pay, first.cost) === "许愿成功：获得金币 40，消耗金币 30", "toast from session");
  assert(fresh.heroes[0].level === 1 && fresh.arenaUsed === 0 && fresh.wishView().cursor === 1, "wish leaves hero and arena");

  const byItem = fresh.wishDraw({ pay: "item" });
  assert(byItem.ok && byItem.kind === "stone" && byItem.itemGain === 2 && byItem.itemId === IDLE_ITEM_ID, "item wish grants stones");
  assert(byItem.tokenOwned === STARTER_WISH_TOKEN - 1 && byItem.gold === first.gold && byItem.cost === WISH_ITEM_COST, "token spent, gold stays");
  assert(fresh.itemCounts[IDLE_ITEM_ID] === 2 && fresh.itemCounts[ITEM_WISH_TOKEN] === 1, "stones land, one token left");
  const bag = fresh.bagList();
  const stoneRow = bagItem(bag.items, IDLE_ITEM_ID);
  const tokenRow = bagItem(bag.items, ITEM_WISH_TOKEN);
  assert(stoneRow !== null && stoneRow.count === 2 && tokenRow !== null && tokenRow.count === 1, "bag lists stones and token");
  const tokenUse = fresh.bagUse({ id: ITEM_WISH_TOKEN });
  assert(tokenUse.ok === false && tokenUse.code === ErrorCode.BAG_NOT_USABLE && bagFailToast(tokenUse) === "许愿符不能直接使用", "token not usable");
  assert(fresh.itemCounts[ITEM_WISH_TOKEN] === 1, "failed use keeps token");

  const byDiamond = new MockGameSession({ wishCursor: 9 });
  const gems = byDiamond.wishDraw({ pay: "diamond" });
  assert(gems.ok && gems.kind === "diamond" && gems.diamondGain === 8 && gems.cursor === 10, "tenth slot is diamond");
  assert(gems.diamond === MOCK_STARTER_DIAMOND - WISH_DIAMOND_COST + 8 && gems.gold === MOCK_STARTER_GOLD, "diamond nets the reward");
  assert(byDiamond.wishView().cursor === 10 && dropAt(byDiamond.wishCursor).kind === "gold", "next lap starts at gold");

  const broke = new MockGameSession({ gold: WISH_GOLD_COST - 1, diamond: WISH_DIAMOND_COST - 1, items: [{ id: ITEM_GOLD_BAG, count: 1 }] });
  const noGold = broke.wishDraw({ pay: "gold" });
  assert(noGold.ok === false && noGold.code === ErrorCode.WISH_GOLD_SHORT && wishFailToast(noGold) === "金币不足，许愿需要 30", "gold short");
  assert(broke.gold === WISH_GOLD_COST - 1 && broke.wishView().used === 0 && broke.wishView().cursor === 0, "gold short changes nothing");
  const noItem = broke.wishDraw({ pay: "item" });
  assert(noItem.ok === false && noItem.code === ErrorCode.WISH_ITEM_SHORT && wishFailToast(noItem) === "许愿符不足，许愿需要 1", "item short");
  assert(broke.itemCounts[ITEM_WISH_TOKEN] === undefined && broke.itemCounts[ITEM_GOLD_BAG] === 1, "item short keeps bag");
  const noDiamond = broke.wishDraw({ pay: "diamond" });
  assert(noDiamond.ok === false && noDiamond.code === ErrorCode.WISH_DIAMOND_SHORT && wishFailToast(noDiamond) === "钻石不足，许愿需要 5", "diamond short");
  assert(broke.diamond === WISH_DIAMOND_COST - 1 && broke.wishUsed === 0, "diamond short changes nothing");
  const badPay = broke.wishDraw({ pay: "coupon" });
  const blank = broke.wishDraw({});
  assert(badPay.ok === false && badPay.code === ErrorCode.WISH_PAY_INVALID && wishFailToast(blank) === "请选择许愿方式", "bad pay");
  assert(broke.gold === WISH_GOLD_COST - 1 && broke.wishCursor === 0, "bad pay changes nothing");

  const limited = new MockGameSession();
  for (let i = 0; i < WISH_DAILY_LIMIT; i++) {
    const once = limited.wishDraw({ pay: "gold" });
    assert(once.ok && once.used === i + 1 && once.kind === WISH_DROPS[i].kind, "wish " + (i + 1));
  }
  assert(limited.wishCursor === WISH_DAILY_LIMIT && limited.itemCounts[IDLE_ITEM_ID] === 3 && limited.itemCounts[ITEM_EXP_POTION] === STARTER_EXP_POTION + 1, "five wishes pay the table");
  const stopped = limited.wishDraw({ pay: "gold" });
  assert(stopped.ok === false && stopped.code === ErrorCode.WISH_NO_CHANCE && wishFailToast(stopped) === "今日许愿次数已用完", "no chance");
  assert(limited.wishUsed === WISH_DAILY_LIMIT && limited.wishCursor === WISH_DAILY_LIMIT && limited.gold === stopped.gold, "cap spends nothing");
  const stillItem = limited.wishDraw({ pay: "item" });
  assert(stillItem.ok === false && stillItem.code === ErrorCode.WISH_NO_CHANCE && limited.itemCounts[ITEM_WISH_TOKEN] === STARTER_WISH_TOKEN, "item shares the cap");

  const nextDay = new MockGameSession({ openDay: 2, wishDay: 1, wishUsed: WISH_DAILY_LIMIT, wishCursor: 3 });
  const restocked = nextDay.wishView();
  assert(restocked.used === 0 && restocked.cursor === 3 && restocked.openDay === 2, "open day clears chances");
  const again = nextDay.wishDraw({ pay: "diamond" });
  assert(again.ok && again.kind === "gold" && again.count === 60 && again.cursor === 4, "cursor continues after reset");
  assert(again.diamond === MOCK_STARTER_DIAMOND - WISH_DIAMOND_COST && again.gold === MOCK_STARTER_GOLD + 60, "diamond pay still grants gold");

  const pushed = new MockGameSession();
  assert(pushed.wishDraw({ pay: "gold" }).ok, "wish before push");
  const rush = pushed.stagePush({});
  assert(rush.ok && pushed.openDay === 15 && pushed.wishCursor === 1, "push keeps cursor");
  assert(pushed.wishView().used === 0 && pushed.gold === MOCK_STARTER_GOLD - WISH_GOLD_COST + 40 + 700, "push restocks chances and stacks gold");

  const early = new MockGameSession();
  for (let stage = 1; stage <= 8; stage++) {
    const entered = early.stageEnter({ stageId: stage });
    const won = early.stageResult({ stageId: stage, battleId: entered.battleId, win: true });
    assert(won.ok && won.win, "win " + stage);
  }
  assert(early.role.level === 9 && early.clearedStage === 8, "eight wins stay at lv9");
  const ninth = early.stageResult({ stageId: 9, battleId: early.stageEnter({ stageId: 9 }).battleId, win: true });
  assert(ninth.ok && early.role.level === 10 && early.clearedStage === 9 && early.openDay === 2, "nine wins reach lv10");
  assert(early.wishView().used === 0 && early.wishDraw({ pay: "gold" }).ok, "lv10 can wish");

  const reset = new MockGameSession({ wishUsed: 2, wishCursor: 4, wishDay: 3, openDay: 3, gold: 10 });
  assert(reset.wishView().used === 2 && reset.wishView().cursor === 4, "preset cursor");
  assert(reset.roleCreate({ name: "新人" }).ok, "create");
  assert(reset.gold === MOCK_STARTER_GOLD && reset.wishView().used === 0 && reset.wishView().cursor === 0, "create clears wishes");
  assert(reset.itemCounts[ITEM_WISH_TOKEN] === STARTER_WISH_TOKEN && reset.itemCounts[IDLE_ITEM_ID] === undefined, "create restores tokens");
  assert(reset.arenaUsed === 0 && reset.shopView().skus[0].bought === 0, "create leaves other modes reset");

  const transport = new MockTransport({ latencyMs: 5 });
  const net = quietNet(transport);
  await net.connect("mock://local");
  const remoteView = await Proto.wishView({}, net);
  assert(remoteView.ok && remoteView.used === 0 && remoteView.tokenOwned === STARTER_WISH_TOKEN, "proto view");
  const remoteGold = await Proto.wishDraw({ pay: "gold" }, net);
  const remoteItem = await Proto.wishDraw({ pay: "item" }, net);
  assert(remoteGold.ok && remoteGold.gold === MOCK_STARTER_GOLD - WISH_GOLD_COST + 40, "proto gold wish");
  assert(remoteItem.ok && remoteItem.kind === "stone" && remoteItem.tokenOwned === 1, "proto item wish");
  const remoteShort = await Proto.wishDraw({ pay: "diamond" }, net);
  assert(remoteShort.ok && remoteShort.kind === "potion" && remoteShort.diamond === MOCK_STARTER_DIAMOND - WISH_DIAMOND_COST, "proto diamond wish");
  const remoteBag = await Proto.bagList({}, net);
  assert(bagItem(remoteBag.items, IDLE_ITEM_ID) !== null && bagItem(remoteBag.items, ITEM_EXP_POTION)!.count === STARTER_EXP_POTION + 1, "proto bag sees rewards");
  const ids = P0_CMDS.filter((row) => row.cmd === Cmd.wishView || row.cmd === Cmd.wishDraw).map((row) => row.id);
  assert(ids.length === 2 && ids[0] === 2501 && ids[1] === 2502, "wish cmd ids");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applyWishDraw(remoteGold);
  assert(Session.gold === remoteGold.gold && Session.diamond === remoteGold.diamond, "apply wish");
  applyWishDraw({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteGold.gold && Session.diamond === remoteGold.diamond, "failed wish ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  net.close();
}

async function checkCafe(): Promise<void> {
  assert(CAFE_DAILY_LIMIT === 3 && CAFE_MAX_HEROES === 2, "cafe limits");
  assert(cafeReward(0).gold === 0 && cafeReward(1).gold === CAFE_GOLD_ONE && cafeReward(1).beans === CAFE_BEAN_ONE, "one hero reward");
  assert(cafeReward(2).gold === CAFE_GOLD_TWO && cafeReward(2).beans === CAFE_BEAN_TWO && cafeReward(9).beans === CAFE_BEAN_TWO, "two hero reward");
  assert(readCafeHeroIds(undefined).problem === "empty" && readCafeHeroIds([]).problem === "empty", "empty ids");
  assert(readCafeHeroIds([10001]).ids[0] === 10001 && readCafeHeroIds([10001, 0]).problem === "bad", "id read");
  assert(readCafeHeroIds(["10001"]).problem === "bad" && cafeHasDuplicate([10001, 10001]) && !cafeHasDuplicate([10001, 10002]), "bad and duplicate");
  assert(cafeAttemptsLine(0, 3) === "今日剩余 3/3" && cafeAttemptsLine(3, 3) === "今日剩余 0/3", "cafe attempts");
  assert(cafeWalletLine(100, 0) === "持有金币 100 · 咖啡豆 ×0", "cafe wallet");
  assert(cafePreviewLine().indexOf("立刻可领") >= 0 && cafePreviewLine().indexOf("100") >= 0, "cafe preview");
  assert(cafeStatusLine([], false) === "还没有派出英雄", "idle status");
  assert(cafeStatusLine(["光耀骑士"], true) === "招待中：光耀骑士，可以领取", "ready status");
  assert(cafeHeroRow("光耀骑士", 1, true, false) === "光耀骑士 Lv1 · 已选", "picked row");
  assert(cafeHeroRow("林间游侠", 1, false, true) === "林间游侠 Lv1 · 招待中", "serving row");
  assert(cafeSendButton(0, 0, 3, false) === "请选择英雄" && cafeSendButton(2, 0, 3, false) === "派出招待（2人）", "send button");
  assert(cafeSendButton(1, 0, 3, true) === "招待中，请先领取" && cafeSendButton(1, 3, 3, false) === "今日已用完", "blocked send button");
  assert(cafeClaimButton(false) === "还没有招待" && cafeClaimButton(true) === "领取招待", "claim button");
  assert(cafeSendToast(["光耀骑士", "林间游侠"]) === "已派出招待：光耀骑士、林间游侠", "send toast");
  assert(cafeClaimToast(100, "咖啡豆", 2) === "招待完成：金币 +100，咖啡豆 ×2", "claim toast");
  assert(cafeEmptyToast() === "没有可招待的英雄" && cafeNoHeroToast() === "请先选择招待的英雄", "empty copy");
  assert(cafeTooManyToast() === "一次最多派出 2 名英雄" && cafeDuplicateToast() === "请选择不同的英雄", "pick copy");
  assert(cafeMissingToast() === "没有这名英雄" && cafeBusyToast() === "英雄正在招待，请先领取", "missing and busy copy");
  assert(cafeNoChanceToast() === "今日招待次数已用完" && cafeNothingToast() === "还没有可领取的招待", "chance copy");
  assert(errorText(ErrorCode.CAFE_NO_CHANCE) === "今日招待次数已用完" && errorText(ErrorCode.CAFE_BUSY) === "英雄正在招待，请先领取", "cafe error text");
  assert(cafeFailToast({ code: ErrorCode.CAFE_NO_HERO }) === cafeNoHeroToast(), "fail toast");

  const fresh = new MockGameSession();
  const view = fresh.cafeView();
  assert(view.ok && view.used === 0 && view.limit === 3 && view.servingCount === 0 && view.ready === false, "fresh view");
  assert(view.heroes.length === 3 && view.beanOwned === 0 && view.gold === MOCK_STARTER_GOLD, "fresh roster");
  assert(view.goldOne === CAFE_GOLD_ONE && view.goldTwo === CAFE_GOLD_TWO, "preview on view");
  const none = fresh.cafeSend({});
  assert(none.ok === false && none.code === ErrorCode.CAFE_NO_HERO && none.gold === MOCK_STARTER_GOLD && fresh.cafeUsed === 0, "no hero");
  const missing = fresh.cafeSend({ heroIds: [999] });
  assert(missing.ok === false && missing.code === ErrorCode.CAFE_HERO_MISSING && fresh.cafeView().servingCount === 0, "missing hero");
  const dup = fresh.cafeSend({ heroIds: [10001, 10001] });
  assert(dup.ok === false && dup.code === ErrorCode.CAFE_DUPLICATE, "duplicate hero");
  const many = fresh.cafeSend({ heroIds: [10001, 10002, 10003] });
  assert(many.ok === false && many.code === ErrorCode.CAFE_TOO_MANY && fresh.cafeUsed === 0, "too many");
  const earlyClaim = fresh.cafeClaim();
  assert(earlyClaim.ok === false && earlyClaim.code === ErrorCode.CAFE_NOTHING && earlyClaim.gold === MOCK_STARTER_GOLD, "nothing to claim");

  const one = fresh.cafeSend({ heroIds: [10001] });
  assert(one.ok && one.names[0] === "光耀骑士" && one.goldPreview === CAFE_GOLD_ONE && one.beanPreview === CAFE_BEAN_ONE, "send one");
  assert(one.gold === MOCK_STARTER_GOLD && one.ready && one.used === 1 && fresh.heroes[0].level === 1, "send does not pay or level");
  assert(fresh.cafeView().servingCount === 1 && fresh.cafeView().heroes[0].serving === true, "knight is serving");
  const busy = fresh.cafeSend({ heroIds: [10002] });
  assert(busy.ok === false && busy.code === ErrorCode.CAFE_BUSY && cafeFailToast(busy) === cafeBusyToast(), "busy");
  assert(fresh.cafeUsed === 1 && fresh.gold === MOCK_STARTER_GOLD, "busy keeps the seat");
  const claimed = fresh.cafeClaim();
  assert(claimed.ok && claimed.goldGain === CAFE_GOLD_ONE && claimed.itemGain === CAFE_BEAN_ONE && claimed.itemId === ITEM_CAFE_BEAN, "claim one");
  assert(claimed.gold === MOCK_STARTER_GOLD + CAFE_GOLD_ONE && claimed.beanOwned === 1 && claimed.diamond === MOCK_STARTER_DIAMOND, "gold and bean land");
  assert(fresh.cafeView().servingCount === 0 && fresh.cafeView().ready === false && fresh.cafeUsed === 1, "seat cleared, chance spent");
  assert(cafeClaimToast(claimed.goldGain, claimed.itemName, claimed.itemGain) === "招待完成：金币 +60，咖啡豆 ×1", "toast from session");
  const again = fresh.cafeClaim();
  assert(again.ok === false && again.gold === claimed.gold && fresh.itemCounts[ITEM_CAFE_BEAN] === 1, "second claim refused");
  const beanUse = fresh.bagUse({ id: ITEM_CAFE_BEAN });
  assert(beanUse.ok === false && beanUse.code === ErrorCode.BAG_NOT_USABLE && beanUse.name === CAFE_BEAN_NAME, "bean not usable");
  assert(notUsableTip(beanUse.kind, beanUse.name) === "咖啡豆不能直接使用" && fresh.itemCounts[ITEM_CAFE_BEAN] === 1, "bean toast and count");
  assert(fresh.wishView().used === 0 && fresh.arenaUsed === 0 && fresh.heroes[0].level === 1, "cafe leaves wish arena hero");

  const pair = fresh.cafeSend({ heroIds: [10002, 10003] });
  assert(pair.ok && pair.goldPreview === CAFE_GOLD_TWO && pair.used === 2, "send two");
  const pairClaim = fresh.cafeClaim();
  assert(pairClaim.ok && pairClaim.goldGain === CAFE_GOLD_TWO && pairClaim.itemGain === CAFE_BEAN_TWO, "claim two");
  assert(pairClaim.beanOwned === 3 && pairClaim.gold === claimed.gold + CAFE_GOLD_TWO, "beans stack");
  const third = fresh.cafeSend({ heroIds: [10001] });
  assert(third.ok && third.used === 3, "third serve");
  const spent = fresh.cafeSend({ heroIds: [10002] });
  assert(spent.ok === false && spent.code === ErrorCode.CAFE_BUSY, "still busy at the limit");
  const thirdClaim = fresh.cafeClaim();
  assert(thirdClaim.ok && thirdClaim.goldGain === CAFE_GOLD_ONE, "claim the last seat");
  const noChance = fresh.cafeSend({ heroIds: [10001] });
  assert(noChance.ok === false && noChance.code === ErrorCode.CAFE_NO_CHANCE && noChance.gold === thirdClaim.gold, "daily limit");

  const rolled = new MockGameSession({ openDay: 2, cafeDay: 1, cafeUsed: 3, cafeHeroIds: [10001, 999, 10001] });
  const rolledView = rolled.cafeView();
  assert(rolledView.used === 0 && rolledView.servingCount === 1 && rolledView.ready, "new day clears count and keeps a real hero");
  assert(rolled.cafeClaim().ok && rolled.cafeClaim().code === ErrorCode.CAFE_NOTHING, "pending serve still pays once");
  assert(rolled.cafeSend({ heroIds: [10002] }).ok && rolled.cafeUsed === 1, "fresh chances after the day change");

  const early = new MockGameSession();
  for (let stage = 1; stage <= 10; stage++) {
    const entered = early.stageEnter({ stageId: stage });
    const won = early.stageResult({ stageId: stage, battleId: entered.battleId, win: true });
    assert(won.ok && won.win, "cafe win " + stage);
  }
  assert(early.role.level === 11 && early.clearedStage === 10, "ten wins stay at lv11");
  const eleventh = early.stageResult({ stageId: 11, battleId: early.stageEnter({ stageId: 11 }).battleId, win: true });
  assert(eleventh.ok && early.role.level === 12 && early.clearedStage === 11, "eleven wins reach lv12");
  assert(early.cafeView().used === 0 && early.cafeSend({ heroIds: [10001] }).ok, "lv12 can serve");

  const reset = new MockGameSession({ cafeUsed: 2, cafeHeroIds: [10001], cafeDay: 4, openDay: 4, gold: 10 });
  assert(reset.cafeView().used === 2 && reset.cafeView().servingCount === 1, "preset serve");
  assert(reset.roleCreate({ name: "新人" }).ok, "create");
  assert(reset.gold === MOCK_STARTER_GOLD && reset.cafeView().used === 0 && reset.cafeView().servingCount === 0, "create clears cafe");
  assert(reset.itemCounts[ITEM_CAFE_BEAN] === undefined && reset.wishView().cursor === 0, "create drops beans and wishes");

  const transport = new MockTransport({ latencyMs: 5 });
  const net = quietNet(transport);
  await net.connect("mock://local");
  const remoteView = await Proto.cafeView({}, net);
  assert(remoteView.ok && remoteView.used === 0 && remoteView.heroes.length === 3, "proto view");
  const remoteNone = await Proto.cafeSend({ heroIds: [] }, net);
  assert(remoteNone.ok === false && remoteNone.code === ErrorCode.CAFE_NO_HERO, "proto no hero");
  const remoteSend = await Proto.cafeSend({ heroIds: [10001, 10002] }, net);
  assert(remoteSend.ok && remoteSend.goldPreview === CAFE_GOLD_TWO && remoteSend.gold === MOCK_STARTER_GOLD, "proto send");
  const remoteBusy = await Proto.cafeSend({ heroIds: [10003] }, net);
  assert(remoteBusy.ok === false && remoteBusy.code === ErrorCode.CAFE_BUSY, "proto busy");
  const remoteClaim = await Proto.cafeClaim({}, net);
  assert(remoteClaim.ok && remoteClaim.gold === MOCK_STARTER_GOLD + CAFE_GOLD_TWO && remoteClaim.itemGain === 2, "proto claim");
  const remoteBag = await Proto.bagList({}, net);
  assert(bagItem(remoteBag.items, ITEM_CAFE_BEAN) !== null && bagItem(remoteBag.items, ITEM_CAFE_BEAN)!.count === 2, "proto bag sees beans");
  const ids = P0_CMDS.filter((row) => row.cmd === Cmd.cafeView || row.cmd === Cmd.cafeSend || row.cmd === Cmd.cafeClaim).map((row) => row.id);
  assert(ids.length === 3 && ids[0] === 2601 && ids[1] === 2602 && ids[2] === 2603, "cafe cmd ids");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applyCafeClaim(remoteClaim);
  assert(Session.gold === remoteClaim.gold && Session.diamond === remoteClaim.diamond, "apply cafe");
  applyCafeClaim({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteClaim.gold && Session.diamond === remoteClaim.diamond, "failed cafe ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  net.close();
}

async function checkGift(): Promise<void> {
  assert(GIFT_LEVELS.length === 3 && GIFT_LEVELS[0].level === 5 && GIFT_LEVELS[2].level === 15, "three level gifts");
  assert(findGiftLevel(5) !== null && findGiftLevel(7) === null && findGiftAcc(68) !== null && findGiftAcc(1) === null, "known tiers");
  assert(giftAccCap() === 68 && GIFT_ACC_TIERS.length === 3, "acc cap");
  assert(parseGiftRecharge("first") === "first" && parseGiftRecharge("acc") === "acc", "recharge words");
  assert(parseGiftRecharge("First") === null && parseGiftRecharge("") === null && parseGiftRecharge(1) === null, "bad recharge");
  assert(giftLevelState(4, 5, false) === "locked" && giftLevelState(5, 5, false) === "claimable" && giftLevelState(9, 5, true) === "claimed", "level states");
  assert(giftAccState(5, 6, false) === "locked" && giftAccState(6, 6, false) === "claimable" && giftAccState(80, 68, true) === "claimed", "acc states");
  const listed = listGiftLevels(5, (level) => level === 5);
  assert(listed.length === 3 && listed[0].state === "claimed" && listed[1].state === "locked" && listed[2].state === "locked", "level list");
  const accListed = listGiftAcc(30, (amount) => amount === 6);
  assert(accListed[0].state === "claimed" && accListed[1].state === "claimable" && accListed[2].state === "locked", "acc list");
  assert(giftHeadLine(1, 1) === "主线 Lv1 · 开服第 1 天", "head line");
  assert(giftWalletLine(100, 20) === "持有金币 100 · 钻石 20", "wallet line");
  assert(giftLevelLine(listed[1]).indexOf("Lv10") >= 0 && giftLevelLine(listed[1]).indexOf("未达到") >= 0, "level line");
  assert(giftDailyLine(GIFT_DAILY_PRICE, false).indexOf("今日可购买") >= 0 && giftDailyLine(10, true).indexOf("今日已购买") >= 0, "daily line");
  assert(giftFirstLine(false, 6) === "尚未首充 · 模拟充值计入累充 6" && giftFirstLine(true, 6).indexOf("首充已完成") >= 0, "first line");
  assert(giftMeterLine(0, 68).indexOf("累充 0/68") >= 0 && giftMeterLine(68, 68).indexOf("■■■■■■■■■■") >= 0, "meter");
  assert(giftMeterLine(6, 68).indexOf("■") >= 0 && giftAccLine(accListed[1]).indexOf("累充 30") >= 0 && giftAccLine(accListed[1]).indexOf("可领取") >= 0, "meter and acc line");
  assert(giftAccHint(30, 30).indexOf("累充 +30") >= 0, "acc hint");
  assert(giftLevelButton("locked") === "未达到" && giftLevelButton("claimable") === "领取" && giftLevelButton("claimed") === "已领取", "level buttons");
  assert(giftDailyButton(false) === "购买" && giftDailyButton(true) === "今日已购买", "daily button");
  assert(giftFirstButton(false) === "模拟充值" && giftFirstButton(true) === "已完成" && giftRechargeButton() === "模拟充值", "recharge buttons");
  assert(giftAccButton("locked") === "未达到" && giftAccButton("claimable") === "领取" && giftAccButton("claimed") === "已领取", "acc buttons");
  assert(giftRewardText(100, 0, "强化石", 3) === "金币 +100、强化石 ×3", "reward text");
  assert(giftLevelClaimToast(5, 100, 0, "强化石", 3) === "领取成功：升级有礼 Lv5，金币 +100、强化石 ×3", "level toast");
  assert(giftDailyBuyToast(10, 80, "强化石", 2) === "购买成功：每日礼包，消耗钻石 10，金币 +80、强化石 ×2", "daily toast");
  assert(giftFirstToast(6, 60, "经验药水", 1) === "模拟充值成功：首充完成，累充 +6，钻石 +60、经验药水 ×1", "first toast");
  assert(giftRechargeToast(30, 30) === "模拟充值成功：累充 +30，钻石 +30", "recharge toast");
  assert(giftAccClaimToast(30, 0, 30, "强化石", 5) === "领取成功：累充 30，钻石 +30、强化石 ×5", "acc toast");
  assert(giftLevelLockedToast(5) === "主线达到 Lv5 后才能领取" && giftLevelClaimedToast(5) === "Lv5 奖励已经领取", "level fail copy");
  assert(giftDailyBoughtToast() === "今日礼包已购买" && giftDailyShortToast(10) === "钻石不足，每日礼包需要 10", "daily fail copy");
  assert(giftFirstDoneToast() === "首充已完成" && giftRechargeInvalidToast() === "请选择充值方式", "recharge fail copy");
  assert(giftAccLockedToast(30) === "累充未达到 30", "acc locked copy");
  assert(errorText(ErrorCode.GIFT_LEVEL_CLAIMED) === "已经领取" && errorText(ErrorCode.GIFT_FIRST_DONE) === "首充已完成", "gift error text");
  assert(errorText(ErrorCode.GIFT_DAILY_SHORT) === "钻石不足" && errorText(ErrorCode.GIFT_ACC_LOCKED) === "累充未达到", "gift short text");

  const fresh = new MockGameSession();
  const view = fresh.giftView();
  assert(view.ok && view.level === 1 && view.openDay === 1 && view.dailyBought === false && view.firstChargeDone === false, "fresh view");
  assert(view.totalRecharge === 0 && view.levels[0].state === "locked" && view.tiers[0].state === "locked", "fresh locked");
  assert(view.gold === MOCK_STARTER_GOLD && view.diamond === MOCK_STARTER_DIAMOND, "view leaves wallet");
  assert(fresh.clearedStage === 0 && fresh.cafeUsed === 0 && fresh.shopView().skus[0].bought === 0, "view leaves modes");

  const early = fresh.giftClaimLevel({ level: 5 });
  assert(early.ok === false && early.code === ErrorCode.GIFT_LEVEL_LOCKED && giftLevelFailToast(early) === "主线达到 Lv5 后才能领取", "lv5 locked");
  assert(fresh.gold === MOCK_STARTER_GOLD && fresh.giftView().levels[0].state === "locked", "locked changes nothing");
  const missingLevel = fresh.giftClaimLevel({ level: 7 });
  assert(missingLevel.ok === false && missingLevel.code === ErrorCode.GIFT_LEVEL_NOT_FOUND && giftLevelFailToast(missingLevel) === "没有这一档升级奖励", "unknown level");
  const blankLevel = fresh.giftClaimLevel({});
  assert(blankLevel.ok === false && blankLevel.code === ErrorCode.GIFT_LEVEL_NOT_FOUND && fresh.gold === MOCK_STARTER_GOLD, "blank level");

  const lv5 = new MockGameSession({ clearedStage: 4 });
  assert(lv5.role.level === 5 && lv5.giftView().levels[0].state === "claimable" && lv5.giftView().levels[1].state === "locked", "lv5 opens first only");
  const claimed5 = lv5.giftClaimLevel({ level: 5 });
  assert(claimed5.ok && claimed5.goldGain === 100 && claimed5.itemGain === 3 && claimed5.gold === MOCK_STARTER_GOLD + 100, "claim lv5");
  assert(lv5.itemCounts[GIFT_DAILY_ITEM_ID] === 3 && lv5.diamond === MOCK_STARTER_DIAMOND && lv5.totalRecharge === 0, "lv5 stones not recharge");
  assert(giftLevelClaimToast(claimed5.level, claimed5.goldGain, claimed5.diamondGain, claimed5.itemName, claimed5.itemGain).indexOf("升级有礼 Lv5") >= 0, "lv5 toast from session");
  const again5 = lv5.giftClaimLevel({ level: 5 });
  assert(again5.ok === false && again5.code === ErrorCode.GIFT_LEVEL_CLAIMED && giftLevelFailToast(again5) === "Lv5 奖励已经领取", "lv5 claimed");
  assert(lv5.gold === MOCK_STARTER_GOLD + 100 && lv5.itemCounts[IDLE_ITEM_ID] === 3, "claimed keeps reward");
  const still10 = lv5.giftClaimLevel({ level: 10 });
  assert(still10.ok === false && still10.code === ErrorCode.GIFT_LEVEL_LOCKED && lv5.diamond === MOCK_STARTER_DIAMOND, "lv10 still locked");

  const lv15 = new MockGameSession({ clearedStage: 14 });
  assert(lv15.role.level === 15 && lv15.giftView().levels[2].state === "claimable", "lv15 opens all");
  assert(lv15.giftClaimLevel({ level: 10 }).ok && lv15.diamond === MOCK_STARTER_DIAMOND + 20, "claim lv10 diamonds");
  assert(lv15.itemCounts[ITEM_EXP_POTION] === STARTER_EXP_POTION + 1, "lv10 potion");
  const bag15 = lv15.giftClaimLevel({ level: 15 });
  assert(bag15.ok && bag15.gold === MOCK_STARTER_GOLD + 200 && lv15.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG + 1, "claim lv15 bag");
  assert(lv15.giftClaimLevel({ level: 15 }).code === ErrorCode.GIFT_LEVEL_CLAIMED && lv15.firstChargeDone === false, "lv15 once");

  const daily = new MockGameSession();
  const bought = daily.giftBuyDaily();
  assert(bought.ok && bought.price === GIFT_DAILY_PRICE && bought.goldGain === GIFT_DAILY_GOLD && bought.itemGain === GIFT_DAILY_ITEM_COUNT, "buy daily");
  assert(bought.diamond === MOCK_STARTER_DIAMOND - GIFT_DAILY_PRICE && bought.gold === MOCK_STARTER_GOLD + GIFT_DAILY_GOLD, "daily spend");
  assert(daily.itemCounts[GIFT_DAILY_ITEM_ID] === GIFT_DAILY_ITEM_COUNT && daily.totalRecharge === 0 && daily.giftView().dailyBought === true, "daily not recharge");
  const soldDaily = daily.giftBuyDaily();
  assert(soldDaily.ok === false && soldDaily.code === ErrorCode.GIFT_DAILY_BOUGHT && giftDailyFailToast(soldDaily) === "今日礼包已购买", "daily bought");
  assert(daily.diamond === MOCK_STARTER_DIAMOND - GIFT_DAILY_PRICE && daily.gold === MOCK_STARTER_GOLD + GIFT_DAILY_GOLD, "bought keeps wallet");
  const broke = new MockGameSession({ diamond: GIFT_DAILY_PRICE - 1 });
  const short = broke.giftBuyDaily();
  assert(short.ok === false && short.code === ErrorCode.GIFT_DAILY_SHORT && giftDailyFailToast(short) === "钻石不足，每日礼包需要 10", "daily short");
  assert(broke.diamond === GIFT_DAILY_PRICE - 1 && broke.gold === MOCK_STARTER_GOLD && broke.giftView().dailyBought === false, "short changes nothing");

  const nextDay = new MockGameSession({ openDay: 2, giftDailyDay: 1, giftDailyBought: true, items: [{ id: IDLE_ITEM_ID, count: 4 }] });
  assert(nextDay.giftView().dailyBought === false && nextDay.giftView().openDay === 2, "open day restocks daily");
  const restocked = nextDay.giftBuyDaily();
  assert(restocked.ok && nextDay.itemCounts[IDLE_ITEM_ID] === 4 + GIFT_DAILY_ITEM_COUNT, "buy after restock keeps old stones");
  const pushed = new MockGameSession();
  assert(pushed.giftBuyDaily().ok, "buy before push");
  const rush = pushed.stagePush({});
  assert(rush.ok && pushed.openDay === 15 && pushed.itemCounts[IDLE_ITEM_ID] === GIFT_DAILY_ITEM_COUNT, "push keeps daily stones");
  assert(pushed.giftView().dailyBought === false && pushed.giftClaimLevel({ level: 5 }).ok, "push restocks daily and opens lv5");

  const first = new MockGameSession();
  const badKind = first.giftRecharge({});
  assert(badKind.ok === false && badKind.code === ErrorCode.GIFT_RECHARGE_INVALID && giftRechargeFailToast(badKind) === "请选择充值方式", "bad kind");
  assert(first.totalRecharge === 0 && first.diamond === MOCK_STARTER_DIAMOND && first.firstChargeDone === false, "bad kind changes nothing");
  const charged = first.giftRecharge({ kind: "first" });
  assert(charged.ok && charged.firstGranted === true && charged.added === GIFT_FIRST_AMOUNT && charged.diamondGain === GIFT_FIRST_DIAMOND, "first charge");
  assert(charged.totalRecharge === GIFT_FIRST_AMOUNT && charged.diamond === MOCK_STARTER_DIAMOND + GIFT_FIRST_DIAMOND, "first wallet");
  assert(first.itemCounts[GIFT_FIRST_ITEM_ID] === STARTER_EXP_POTION + GIFT_FIRST_ITEM_COUNT && first.firstChargeDone === true, "first potion");
  assert(giftFirstToast(charged.added, charged.diamondGain, charged.itemName, charged.itemGain).indexOf("首充完成") >= 0, "first toast from session");
  const done = first.giftRecharge({ kind: "first" });
  assert(done.ok === false && done.code === ErrorCode.GIFT_FIRST_DONE && giftRechargeFailToast(done) === "首充已完成", "first once");
  assert(first.totalRecharge === GIFT_FIRST_AMOUNT && first.diamond === MOCK_STARTER_DIAMOND + GIFT_FIRST_DIAMOND, "second first changes nothing");
  const earlyAcc = first.giftClaimAcc({ amount: 30 });
  assert(earlyAcc.ok === false && earlyAcc.code === ErrorCode.GIFT_ACC_LOCKED && giftAccFailToast(earlyAcc) === "累充未达到 30", "acc 30 locked at 6");
  const tier6 = first.giftClaimAcc({ amount: 6 });
  assert(tier6.ok && tier6.goldGain === 150 && first.gold === MOCK_STARTER_GOLD + 150 && first.totalRecharge === GIFT_FIRST_AMOUNT, "claim acc 6");
  const tier6Again = first.giftClaimAcc({ amount: 6 });
  assert(tier6Again.ok === false && tier6Again.code === ErrorCode.GIFT_ACC_CLAIMED && giftAccFailToast(tier6Again).indexOf("已经领取") >= 0, "acc 6 claimed");
  assert(first.gold === MOCK_STARTER_GOLD + 150, "claimed acc keeps gold");

  const meter = new MockGameSession();
  const step = meter.giftRecharge({ kind: "acc" });
  assert(step.ok && step.firstGranted === false && step.added === GIFT_RECHARGE_STEP && meter.firstChargeDone === false, "acc recharge skips first pack");
  assert(step.totalRecharge === GIFT_RECHARGE_STEP && step.diamond === MOCK_STARTER_DIAMOND + GIFT_RECHARGE_DIAMOND, "acc step wallet");
  assert(meter.itemCounts[ITEM_EXP_POTION] === STARTER_EXP_POTION, "acc step adds no potion");
  assert(meter.giftClaimAcc({ amount: 6 }).ok && meter.giftClaimAcc({ amount: 30 }).ok, "30 unlocks two tiers");
  assert(meter.giftClaimAcc({ amount: 68 }).code === ErrorCode.GIFT_ACC_LOCKED, "68 still locked at 30");
  assert(meter.giftRecharge({ kind: "acc" }).ok && meter.totalRecharge === GIFT_RECHARGE_STEP * 2, "second step");
  assert(meter.giftClaimAcc({ amount: 68 }).code === ErrorCode.GIFT_ACC_LOCKED && meter.totalRecharge === 60, "60 still short of 68");
  assert(meter.giftRecharge({ kind: "first" }).ok && meter.totalRecharge === 66 && meter.firstChargeDone === true, "first still counts after steps");
  assert(meter.giftClaimAcc({ amount: 68 }).code === ErrorCode.GIFT_ACC_LOCKED, "66 still short");
  assert(meter.giftRecharge({ kind: "acc" }).ok && meter.totalRecharge === 96, "third step clears 68");
  const top = meter.giftClaimAcc({ amount: 68 });
  assert(top.ok && top.itemGain === 2 && meter.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG + 2, "claim 68 bags");
  assert(giftAccClaimToast(top.amount, top.goldGain, top.diamondGain, top.itemName, top.itemGain).indexOf("累充 68") >= 0, "68 toast");
  const unknownAcc = meter.giftClaimAcc({ amount: 99 });
  assert(unknownAcc.ok === false && unknownAcc.code === ErrorCode.GIFT_ACC_NOT_FOUND && giftAccFailToast(unknownAcc) === "没有这一档累充", "unknown acc");
  assert(meter.giftClaimAcc({}).code === ErrorCode.GIFT_ACC_NOT_FOUND && meter.cafeUsed === 0 && meter.wishUsed === 0, "blank acc leaves modes");

  const seeded = new MockGameSession({
    clearedStage: 9,
    giftLevelClaimed: [5, 4],
    firstChargeDone: true,
    totalRecharge: 68,
    giftAccClaimed: [6, 99],
    giftDailyBought: true,
    giftDailyDay: 3,
    openDay: 3,
  });
  assert(seeded.role.level === 10 && seeded.giftView().levels[0].state === "claimed" && seeded.giftView().levels[1].state === "claimable", "seed ignores unknown level");
  assert(seeded.giftClaimLevel({ level: 5 }).code === ErrorCode.GIFT_LEVEL_CLAIMED, "seeded level claimed");
  assert(seeded.giftRecharge({ kind: "first" }).code === ErrorCode.GIFT_FIRST_DONE && seeded.totalRecharge === 68, "seeded first done");
  assert(seeded.giftView().tiers[0].state === "claimed" && seeded.giftView().tiers[2].state === "claimable" && seeded.giftView().dailyBought === true, "seeded acc and daily");
  const negative = new MockGameSession({ totalRecharge: -8, giftDailyBought: true });
  assert(negative.totalRecharge === 0 && negative.giftView().dailyBought === true, "negative recharge clamps and same day keeps daily");

  const reset = new MockGameSession({
    clearedStage: 14,
    giftLevelClaimed: [15],
    giftDailyBought: true,
    firstChargeDone: true,
    totalRecharge: 96,
    giftAccClaimed: [68],
    diamond: 1,
  });
  assert(reset.roleCreate({ name: "新人" }).ok, "create");
  assert(reset.role.level === 1 && reset.gold === MOCK_STARTER_GOLD && reset.diamond === MOCK_STARTER_DIAMOND, "create wallet");
  assert(reset.firstChargeDone === false && reset.totalRecharge === 0 && reset.giftView().dailyBought === false, "create clears gift");
  assert(reset.giftView().levels[0].state === "locked" && reset.giftView().tiers[0].state === "locked", "create locks tiers");
  assert(reset.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG && reset.itemCounts[ITEM_EXP_POTION] === STARTER_EXP_POTION, "create restores starter items");

  const transport = new MockTransport({ latencyMs: 5 });
  const net = quietNet(transport);
  await net.connect("mock://local");
  const remoteView = await Proto.giftView({}, net);
  assert(remoteView.ok && remoteView.level === 1 && remoteView.levels.length === 3 && remoteView.dailyBought === false, "proto view");
  const remoteLocked = await Proto.giftClaimLevel({ level: 5 }, net);
  assert(remoteLocked.ok === false && remoteLocked.code === ErrorCode.GIFT_LEVEL_LOCKED, "proto level locked");
  await Proto.stagePush({ target: 15 }, net);
  const remoteLevel = await Proto.giftClaimLevel({ level: 15 }, net);
  assert(remoteLevel.ok && remoteLevel.goldGain === 200, "proto claim lv15");
  const remoteDaily = await Proto.giftBuyDaily({}, net);
  assert(remoteDaily.ok && remoteDaily.diamond === remoteView.diamond - GIFT_DAILY_PRICE, "proto daily uses starter diamond");
  const remoteDailyAgain = await Proto.giftBuyDaily({}, net);
  assert(remoteDailyAgain.ok === false && remoteDailyAgain.code === ErrorCode.GIFT_DAILY_BOUGHT, "proto daily once");
  const remoteFirst = await Proto.giftRecharge({ kind: "first" }, net);
  assert(remoteFirst.ok && remoteFirst.firstChargeDone === true && remoteFirst.totalRecharge === GIFT_FIRST_AMOUNT, "proto first");
  const remoteFirstAgain = await Proto.giftRecharge({ kind: "first" }, net);
  assert(remoteFirstAgain.ok === false && remoteFirstAgain.code === ErrorCode.GIFT_FIRST_DONE && remoteFirstAgain.totalRecharge === GIFT_FIRST_AMOUNT, "proto first once");
  const remoteStep = await Proto.giftRecharge({ kind: "acc" }, net);
  assert(remoteStep.ok && remoteStep.totalRecharge === GIFT_FIRST_AMOUNT + GIFT_RECHARGE_STEP, "proto acc step");
  const remoteAcc = await Proto.giftClaimAcc({ amount: 6 }, net);
  assert(remoteAcc.ok && remoteAcc.goldGain === 150, "proto claim acc");
  const remoteAccAgain = await Proto.giftClaimAcc({ amount: 6 }, net);
  assert(remoteAccAgain.ok === false && remoteAccAgain.code === ErrorCode.GIFT_ACC_CLAIMED, "proto acc once");
  const remoteBag = await Proto.bagList({}, net);
  assert(bagItem(remoteBag.items, ITEM_GOLD_BAG) !== null && bagItem(remoteBag.items, ITEM_EXP_POTION) !== null, "proto bag sees gift items");
  const ids = P0_CMDS.filter(
    (row) =>
      row.cmd === Cmd.giftView ||
      row.cmd === Cmd.giftClaimLevel ||
      row.cmd === Cmd.giftBuyDaily ||
      row.cmd === Cmd.giftRecharge ||
      row.cmd === Cmd.giftClaimAcc
  ).map((row) => row.id);
  assert(ids.length === 5 && ids[0] === 2701 && ids[1] === 2702 && ids[2] === 2703 && ids[3] === 2704 && ids[4] === 2705, "gift cmd ids");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applyGiftWallet(remoteFirst);
  assert(Session.gold === remoteFirst.gold && Session.diamond === remoteFirst.diamond, "apply gift");
  applyGiftWallet({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteFirst.gold && Session.diamond === remoteFirst.diamond, "failed gift ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  net.close();
}

async function checkLimited(): Promise<void> {
  assert(LIMITED_OFFERS.length === 2 && LIMITED_PACKS.length === 2 && LIMITED_PACK_DAYS === 7, "two offers and two packs");
  assert(findLimitedOffer(LIMITED_EX_BEAN_ID) !== null && findLimitedOffer(9) === null, "known offer");
  assert(findLimitedPack(LIMITED_PACK_MOCK_ID) !== null && findLimitedPack(9) === null, "known pack");
  assert(limitedDaysLeft(1, 7) === 7 && limitedDaysLeft(7, 7) === 1 && limitedDaysLeft(8, 7) === 0, "days left");
  assert(limitedCountdown(1) === "开服第 1 天 · 剩余 7 天" && limitedCountdown(7) === "开服第 7 天 · 剩余 1 天", "countdown open");
  assert(limitedCountdown(8) === "开服第 8 天 · 本轮已结束", "countdown ended");
  assert(limitedStoneFree(0) && !limitedStoneFree(1), "first stone is free");
  const listed = listLimitedOffers((id) => (id === LIMITED_EX_BEAN_ID ? 1 : 0), () => 2);
  assert(listed[0].bought === 1 && listed[0].owned === 2 && listed[1].pay === "gold", "offer list");
  assert(limitedOfferLine(listed[0]).indexOf("咖啡豆 ×2") >= 0 && limitedOfferLine(listed[0]).indexOf("今日 1/2") >= 0, "bean line");
  assert(limitedOfferLine(listed[1]).indexOf("金币 50") >= 0 && limitedOfferButton(listed[1]) === "兑换", "gold line");
  const sold = listLimitedOffers(() => LIMITED_BEAN_LIMIT, () => 0)[0];
  assert(limitedOfferButton(sold) === "已兑完", "sold button");
  const packs = listLimitedPacks(1, (id) => id === LIMITED_PACK_DIAMOND_ID);
  assert(packs[0].bought && !packs[0].ended && packs[1].pay === "mock" && !packs[1].bought, "pack list");
  assert(limitedPackLine(packs[1]).indexOf("模拟购买") >= 0 && limitedPackLine(packs[1]).indexOf("可购买") >= 0, "mock pack line");
  assert(limitedPackButton(packs[0]) === "已经购买" && limitedPackButton(packs[1]) === "模拟购买", "pack buttons");
  const endedPacks = listLimitedPacks(8, () => false);
  assert(endedPacks[0].ended && limitedPackButton(endedPacks[0]) === "已结束", "ended pack");
  assert(limitedHeadLine(1).indexOf("开服第 1 天") >= 0 && limitedWalletLine(100, 20, 2) === "持有金币 100 · 钻石 20 · 咖啡豆 ×2", "head and wallet");
  assert(limitedStoneLine(0, 3, 100, 0).indexOf("今日剩余 3/3") >= 0 && limitedStoneLine(0, 3, 100, 0).indexOf("免费") >= 0, "free stone line");
  assert(limitedStoneLine(1, 3, 100, 5).indexOf("今日剩余 2/3") >= 0 && limitedStoneLine(3, 3, 100, 5).indexOf("已用完") >= 0, "paid stone line");
  assert(limitedStoneRateLine().indexOf("钻石 5 换金币 100") >= 0, "rate line");
  assert(limitedStoneButton(0, 3) === "免费点石" && limitedStoneButton(1, 3) === "钻石点石（5）" && limitedStoneButton(3, 3) === "今日已用完", "stone buttons");
  assert(limitedExchangeToast("咖啡豆", 2, "item", "经验药水", 1) === "兑换成功：消耗咖啡豆 ×2，获得经验药水 ×1", "bean toast");
  assert(limitedExchangeToast("金币", 50, "gold", "强化石", 4) === "兑换成功：消耗金币 50，获得强化石 ×4", "gold toast");
  assert(limitedSoldOutToast("经验药水") === "经验药水今日已兑完" && limitedMissingToast() === "没有这个兑换", "sold copy");
  assert(limitedGoldShortToast(50) === "金币不足，兑换需要 50" && limitedItemShortToast("咖啡豆", 2) === "咖啡豆不足，兑换需要 2", "short copy");
  assert(limitedStoneToast(true, 0, 100, 1, 3) === "点石成功：免费获得金币 100，今日剩余 2/3", "free stone toast");
  assert(limitedStoneToast(false, 5, 100, 2, 3) === "点石成功：消耗钻石 5，获得金币 100，今日剩余 1/3", "paid stone toast");
  assert(limitedStoneNoChanceToast() === "今日点石次数已用完" && limitedStoneShortToast(5) === "钻石不足，点石需要 5", "stone fail copy");
  assert(limitedPackToast("开服礼包", "diamond", 15, 180, 0, "强化石", 3) === "购买成功：开服礼包，消耗钻石 15，金币 +180、强化石 ×3", "diamond pack toast");
  assert(limitedPackToast("限时补给", "mock", 0, 0, 30, "经验药水", 1) === "模拟购买成功：限时补给，钻石 +30、经验药水 ×1", "mock pack toast");
  assert(limitedPackBoughtToast("开服礼包") === "开服礼包已经购买" && limitedPackEndedToast() === "限时礼包已结束", "pack fail copy");
  assert(limitedPackShortToast("开服礼包", 15) === "钻石不足，开服礼包需要 15" && limitedPackMissingToast() === "没有这个礼包", "pack short copy");
  assert(errorText(ErrorCode.LIMITED_EX_SOLD_OUT) === "今日已兑完" && errorText(ErrorCode.LIMITED_PACK_ENDED) === "限时礼包已结束", "limited error text");

  const fresh = new MockGameSession();
  const view = fresh.limitedView();
  assert(view.ok && view.openDay === 1 && view.offers.length === 2 && view.offers[0].bought === 0 && view.beanOwned === 0, "fresh view");
  assert(view.stoneUsed === 0 && view.stoneFree === true && view.stoneCost === 0 && view.packs.length === 2 && view.packs[0].bought === false, "fresh stone and packs");
  assert(view.countdown === "开服第 1 天 · 剩余 7 天" && view.gold === MOCK_STARTER_GOLD && view.diamond === MOCK_STARTER_DIAMOND, "view leaves wallet");
  assert(fresh.giftView().dailyBought === false && fresh.shopView().skus[0].bought === 0 && fresh.cafeUsed === 0, "view leaves other modes");

  const noBean = fresh.limitedExchange({ id: LIMITED_EX_BEAN_ID });
  assert(noBean.ok === false && noBean.code === ErrorCode.LIMITED_EX_ITEM_SHORT && limitedExchangeFailToast(noBean) === "咖啡豆不足，兑换需要 2", "bean short");
  assert(fresh.gold === MOCK_STARTER_GOLD && fresh.itemCounts[ITEM_EXP_POTION] === STARTER_EXP_POTION && fresh.limitedView().offers[0].bought === 0, "bean short changes nothing");
  const missing = fresh.limitedExchange({ id: 99 });
  assert(missing.ok === false && missing.code === ErrorCode.LIMITED_EX_NOT_FOUND && limitedExchangeFailToast(missing) === "没有这个兑换", "missing offer");
  const blank = fresh.limitedExchange({});
  assert(blank.ok === false && blank.code === ErrorCode.LIMITED_EX_NOT_FOUND && fresh.gold === MOCK_STARTER_GOLD, "blank offer");

  const beans = new MockGameSession({ items: [{ id: ITEM_CAFE_BEAN, count: LIMITED_BEAN_COST * LIMITED_BEAN_LIMIT }] });
  const beanOnce = beans.limitedExchange({ id: LIMITED_EX_BEAN_ID });
  assert(beanOnce.ok && beanOnce.rewardCount === 1 && beanOnce.owned === LIMITED_BEAN_COST && beanOnce.bought === 1, "bean exchange");
  assert(beans.itemCounts[ITEM_EXP_POTION] === 1 && beans.gold === MOCK_STARTER_GOLD && beans.diamond === MOCK_STARTER_DIAMOND, "bean grants potion");
  assert(limitedExchangeToast(beanOnce.costName, beanOnce.costCount, beanOnce.pay, beanOnce.rewardName, beanOnce.rewardCount).indexOf("咖啡豆") >= 0, "bean toast from session");
  const beanTwice = beans.limitedExchange({ id: LIMITED_EX_BEAN_ID });
  assert(beanTwice.ok && beans.itemCounts[LIMITED_BEAN_ITEM_ID] === undefined && beans.itemCounts[ITEM_EXP_POTION] === 2, "second bean exchange");
  const beanSold = beans.limitedExchange({ id: LIMITED_EX_BEAN_ID });
  assert(beanSold.ok === false && beanSold.code === ErrorCode.LIMITED_EX_SOLD_OUT && limitedExchangeFailToast(beanSold) === "经验药水今日已兑完", "bean sold out");
  assert(beans.itemCounts[ITEM_EXP_POTION] === 2 && beans.limitedStoneUsed === 0, "sold out keeps potion and stone");

  const gold = new MockGameSession();
  const goldOnce = gold.limitedExchange({ id: LIMITED_EX_GOLD_ID });
  assert(goldOnce.ok && goldOnce.pay === "gold" && goldOnce.rewardCount === LIMITED_GOLD_REWARD && gold.gold === MOCK_STARTER_GOLD - LIMITED_GOLD_COST, "gold exchange");
  assert(gold.itemCounts[IDLE_ITEM_ID] === LIMITED_GOLD_REWARD && gold.diamond === MOCK_STARTER_DIAMOND && gold.limitedView().offers[1].bought === 1, "gold grants stones");
  gold.limitedExchange({ id: LIMITED_EX_GOLD_ID });
  const goldShort = gold.limitedExchange({ id: LIMITED_EX_GOLD_ID });
  assert(gold.gold === MOCK_STARTER_GOLD - LIMITED_GOLD_COST * 2 && goldShort.ok === false && goldShort.code === ErrorCode.LIMITED_EX_GOLD_SHORT, "third gold short");
  assert(limitedExchangeFailToast(goldShort) === "金币不足，兑换需要 50" && gold.itemCounts[IDLE_ITEM_ID] === LIMITED_GOLD_REWARD * 2, "gold short keeps stones");

  const broke = new MockGameSession({ gold: LIMITED_GOLD_COST - 1 });
  const brokeBuy = broke.limitedExchange({ id: LIMITED_EX_GOLD_ID });
  assert(brokeBuy.ok === false && brokeBuy.code === ErrorCode.LIMITED_EX_GOLD_SHORT && broke.gold === LIMITED_GOLD_COST - 1 && broke.limitedView().offers[1].bought === 0, "broke changes nothing");

  const seeded = new MockGameSession({
    openDay: 2,
    limitedExDay: 1,
    limitedExBought: [{ id: LIMITED_EX_GOLD_ID, count: LIMITED_GOLD_LIMIT }],
    items: [{ id: IDLE_ITEM_ID, count: 4 }],
  });
  const restocked = seeded.limitedView();
  assert(restocked.offers[1].bought === 0 && restocked.offers[1].owned === 0 && seeded.itemCounts[IDLE_ITEM_ID] === 4, "next day restocks exchange");
  assert(seeded.limitedExchange({ id: LIMITED_EX_GOLD_ID }).ok && seeded.itemCounts[IDLE_ITEM_ID] === 4 + LIMITED_GOLD_REWARD, "buy after restock");

  const stone = new MockGameSession();
  const free = stone.limitedAlchemy();
  assert(free.ok && free.free === true && free.cost === 0 && free.goldGain === LIMITED_STONE_GOLD && free.used === 1, "free stone");
  assert(stone.gold === MOCK_STARTER_GOLD + LIMITED_STONE_GOLD && stone.diamond === MOCK_STARTER_DIAMOND && stone.limitedView().stoneFree === false, "free keeps diamonds");
  assert(limitedStoneToast(free.free, free.cost, free.goldGain, free.used, free.limit).indexOf("免费获得金币 100") >= 0, "free toast from session");
  const paid = stone.limitedAlchemy();
  assert(paid.ok && paid.free === false && paid.cost === LIMITED_STONE_DIAMOND && stone.diamond === MOCK_STARTER_DIAMOND - LIMITED_STONE_DIAMOND, "paid stone");
  assert(stone.gold === MOCK_STARTER_GOLD + LIMITED_STONE_GOLD * 2 && stone.limitedView().stoneUsed === 2, "paid adds gold");
  stone.limitedAlchemy();
  assert(stone.limitedStoneUsed === 3 && stone.diamond === MOCK_STARTER_DIAMOND - LIMITED_STONE_DIAMOND * 2, "third stone");
  const spent = stone.limitedAlchemy();
  assert(spent.ok === false && spent.code === ErrorCode.LIMITED_STONE_NO_CHANCE && limitedStoneFailToast(spent) === "今日点石次数已用完", "stone spent");
  assert(stone.gold === MOCK_STARTER_GOLD + LIMITED_STONE_GOLD * 3 && stone.diamond === MOCK_STARTER_DIAMOND - LIMITED_STONE_DIAMOND * 2, "spent changes nothing");

  const poor = new MockGameSession({ diamond: LIMITED_STONE_DIAMOND - 1, limitedStoneUsed: 1 });
  const poorStone = poor.limitedAlchemy();
  assert(poorStone.ok === false && poorStone.code === ErrorCode.LIMITED_STONE_SHORT && limitedStoneFailToast(poorStone) === "钻石不足，点石需要 5", "stone diamond short");
  assert(poor.diamond === LIMITED_STONE_DIAMOND - 1 && poor.limitedStoneUsed === 1 && poor.gold === MOCK_STARTER_GOLD, "short stone changes nothing");

  const stoneDay = new MockGameSession({ openDay: 3, limitedStoneDay: 1, limitedStoneUsed: 3 });
  assert(stoneDay.limitedView().stoneUsed === 0 && stoneDay.limitedView().stoneFree === true, "next day resets stone");

  const pack = new MockGameSession();
  const bought = pack.limitedBuy({ id: LIMITED_PACK_DIAMOND_ID });
  assert(bought.ok && bought.price === LIMITED_PACK_PRICE && bought.goldGain === LIMITED_PACK_GOLD && bought.itemGain === LIMITED_PACK_STONE, "buy diamond pack");
  assert(pack.diamond === MOCK_STARTER_DIAMOND - LIMITED_PACK_PRICE && pack.gold === MOCK_STARTER_GOLD + LIMITED_PACK_GOLD, "pack spend");
  assert(pack.itemCounts[IDLE_ITEM_ID] === LIMITED_PACK_STONE && pack.limitedView().packs[0].bought === true && pack.totalRecharge === 0, "pack not recharge");
  const again = pack.limitedBuy({ id: LIMITED_PACK_DIAMOND_ID });
  assert(again.ok === false && again.code === ErrorCode.LIMITED_PACK_BOUGHT && limitedPackFailToast(again) === "开服礼包已经购买", "pack bought");
  assert(pack.diamond === MOCK_STARTER_DIAMOND - LIMITED_PACK_PRICE && pack.gold === MOCK_STARTER_GOLD + LIMITED_PACK_GOLD, "bought keeps wallet");
  const mock = pack.limitedBuy({ id: LIMITED_PACK_MOCK_ID });
  assert(mock.ok && mock.pay === "mock" && mock.diamondGain === LIMITED_PACK_MOCK_DIAMOND && mock.itemGain === 1, "mock pack");
  assert(pack.diamond === MOCK_STARTER_DIAMOND - LIMITED_PACK_PRICE + LIMITED_PACK_MOCK_DIAMOND && pack.itemCounts[ITEM_EXP_POTION] === STARTER_EXP_POTION + 1, "mock grants");
  assert(limitedPackToast(mock.name, mock.pay, mock.price, mock.goldGain, mock.diamondGain, mock.itemName, mock.itemGain).indexOf("模拟购买成功") >= 0, "mock toast from session");
  const mockAgain = pack.limitedBuy({ id: LIMITED_PACK_MOCK_ID });
  assert(mockAgain.ok === false && mockAgain.code === ErrorCode.LIMITED_PACK_BOUGHT && pack.limitedStoneUsed === 0, "mock once leaves stone");

  const late = new MockGameSession({ openDay: 8, diamond: LIMITED_PACK_PRICE });
  const ended = late.limitedBuy({ id: LIMITED_PACK_DIAMOND_ID });
  assert(ended.ok === false && ended.code === ErrorCode.LIMITED_PACK_ENDED && limitedPackFailToast(ended) === "限时礼包已结束", "pack ended");
  assert(late.diamond === LIMITED_PACK_PRICE && late.gold === MOCK_STARTER_GOLD && late.limitedView().packs[0].ended === true, "ended changes nothing");
  const lateBought = new MockGameSession({ openDay: 8, limitedPackBought: [LIMITED_PACK_DIAMOND_ID] });
  const stillBought = lateBought.limitedBuy({ id: LIMITED_PACK_DIAMOND_ID });
  assert(stillBought.ok === false && stillBought.code === ErrorCode.LIMITED_PACK_BOUGHT, "bought wins over ended");
  const shortPack = new MockGameSession({ diamond: LIMITED_PACK_PRICE - 1 });
  const shortBuy = shortPack.limitedBuy({ id: LIMITED_PACK_DIAMOND_ID });
  assert(shortBuy.ok === false && shortBuy.code === ErrorCode.LIMITED_PACK_SHORT && limitedPackFailToast(shortBuy) === "钻石不足，开服礼包需要 15", "pack diamond short");
  assert(shortPack.diamond === LIMITED_PACK_PRICE - 1 && shortPack.limitedView().packs[0].bought === false, "short pack changes nothing");
  const missingPack = shortPack.limitedBuy({ id: 99 });
  assert(missingPack.ok === false && missingPack.code === ErrorCode.LIMITED_PACK_NOT_FOUND && limitedPackFailToast(missingPack) === "没有这个礼包", "missing pack");
  const blankPack = shortPack.limitedBuy({});
  assert(blankPack.ok === false && blankPack.code === ErrorCode.LIMITED_PACK_NOT_FOUND, "blank pack");

  const reset = new MockGameSession({
    limitedExBought: [{ id: LIMITED_EX_GOLD_ID, count: 1 }],
    limitedStoneUsed: 2,
    limitedPackBought: [LIMITED_PACK_MOCK_ID],
    gold: 1,
    diamond: 1,
  });
  assert(reset.roleCreate({ name: "新人" }).ok, "create");
  assert(reset.gold === MOCK_STARTER_GOLD && reset.diamond === MOCK_STARTER_DIAMOND, "create wallet");
  assert(reset.limitedView().offers[1].bought === 0 && reset.limitedView().stoneUsed === 0 && reset.limitedView().packs[1].bought === false, "create clears limited");
  assert(reset.giftView().firstChargeDone === false && reset.shopView().skus[0].bought === 0, "create leaves gift and shop reset");

  const transport = new MockTransport({ latencyMs: 5 });
  const net = quietNet(transport);
  await net.connect("mock://local");
  const remoteView = await Proto.limitedView({}, net);
  assert(remoteView.ok && remoteView.offers.length === 2 && remoteView.stoneFree === true && remoteView.packs[0].bought === false, "proto view");
  const remoteBean = await Proto.limitedExchange({ id: LIMITED_EX_BEAN_ID }, net);
  assert(remoteBean.ok === false && remoteBean.code === ErrorCode.LIMITED_EX_ITEM_SHORT, "proto bean short");
  const remoteGold = await Proto.limitedExchange({ id: LIMITED_EX_GOLD_ID }, net);
  assert(remoteGold.ok && remoteGold.gold === MOCK_STARTER_GOLD - LIMITED_GOLD_COST, "proto gold exchange");
  const remoteFree = await Proto.limitedAlchemy({}, net);
  assert(remoteFree.ok && remoteFree.free === true && remoteFree.gold === remoteGold.gold + LIMITED_STONE_GOLD, "proto free stone");
  const remotePaid = await Proto.limitedAlchemy({}, net);
  assert(remotePaid.ok && remotePaid.free === false && remotePaid.diamond === MOCK_STARTER_DIAMOND - LIMITED_STONE_DIAMOND, "proto paid stone");
  const remotePack = await Proto.limitedBuy({ id: LIMITED_PACK_DIAMOND_ID }, net);
  assert(remotePack.ok && remotePack.goldGain === LIMITED_PACK_GOLD, "proto diamond pack");
  const remotePackAgain = await Proto.limitedBuy({ id: LIMITED_PACK_DIAMOND_ID }, net);
  assert(remotePackAgain.ok === false && remotePackAgain.code === ErrorCode.LIMITED_PACK_BOUGHT, "proto pack once");
  const remoteMock = await Proto.limitedBuy({ id: LIMITED_PACK_MOCK_ID }, net);
  assert(remoteMock.ok && remoteMock.diamondGain === LIMITED_PACK_MOCK_DIAMOND, "proto mock pack");
  const remoteBag = await Proto.bagList({}, net);
  assert(bagItem(remoteBag.items, IDLE_ITEM_ID) !== null && bagItem(remoteBag.items, ITEM_EXP_POTION) !== null, "proto bag sees limited items");
  const ids = P0_CMDS.filter(
    (row) =>
      row.cmd === Cmd.limitedView ||
      row.cmd === Cmd.limitedExchange ||
      row.cmd === Cmd.limitedAlchemy ||
      row.cmd === Cmd.limitedBuy
  ).map((row) => row.id);
  assert(ids.length === 4 && ids[0] === 2801 && ids[1] === 2802 && ids[2] === 2803 && ids[3] === 2804, "limited cmd ids");
  const prevGold = Session.gold;
  const prevDiamond = Session.diamond;
  applyLimitedWallet(remoteMock);
  assert(Session.gold === remoteMock.gold && Session.diamond === remoteMock.diamond, "apply limited");
  applyLimitedWallet({ ok: false, gold: 1, diamond: 1 });
  assert(Session.gold === remoteMock.gold && Session.diamond === remoteMock.diamond, "failed limited ignored");
  Session.gold = prevGold;
  Session.diamond = prevDiamond;
  net.close();
}

function bagItem(items: { id: number; name?: string; count: number }[], id: number): { id: number; name?: string; count: number } | null {
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === id) return items[i];
  }
  return null;
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
