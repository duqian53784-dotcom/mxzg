/**
 * B3–C6 自检（不启动 Creator）。
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
} from "../assets/scripts/module/hero/growth";
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
  planBattle,
  rewardLines,
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
  const names = listOpenEntries(rows, 1, 1).map((row) => row.id);
  assert(names.indexOf("main_summon") >= 0 && names.indexOf("main_smith_shop") < 0, "lv1 list");

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
  const echo = await net.request("bag.list", { page: 1 });
  const echoData = echo.data as { ok?: boolean };
  assert(echoData.ok === true, "echo payload");
  assert(seen.indexOf("login") >= 0 && seen.indexOf("role.enter") >= 0 && seen.indexOf("bag.list") >= 0, "dispatch");

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
  console.log("skeleton-check ok");
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
