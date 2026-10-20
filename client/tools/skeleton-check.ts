/**
 * B3–C15 自检（不启动 Creator）。
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
  notEnoughToast,
  notUsableTip,
  STARTER_EXP_POTION,
  STARTER_GOLD_BAG,
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
import { Goal7Task } from "../assets/scripts/net/protocol/types";
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
import { Cmd, P0_CMDS, Proto } from "../assets/scripts/net/protocol";
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
  assert(listed.ok && listed.items.length === 2 && listed.gold === MOCK_STARTER_GOLD, "starter bag");
  assert(listed.items[0].id === ITEM_GOLD_BAG && listed.items[0].count === STARTER_GOLD_BAG && listed.items[0].usable, "gold bags first");
  assert(listed.items[1].id === ITEM_EXP_POTION && listed.items[1].count === STARTER_EXP_POTION && listed.items[1].name === "经验药水", "potions second");
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
  assert(fresh.itemCounts[ITEM_GOLD_BAG] === STARTER_GOLD_BAG && fresh.itemCounts[ITEM_EXP_POTION] === STARTER_EXP_POTION, "create restores consumables");
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
  assert(remote.ok && remote.items.length === 2 && remote.items[0].name === "小金币袋", "proto list");
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

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
