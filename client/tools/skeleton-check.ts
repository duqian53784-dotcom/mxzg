/**
 * B3–B7 自检（不启动 Creator）。
 * 从仓库根目录：
 * npx --yes esbuild client/tools/skeleton-check.ts --bundle --platform=node --format=cjs --tsconfig=client/tools/tsconfig.check.json --outfile=/tmp/mxzg-skeleton-check.js && node /tmp/mxzg-skeleton-check.js
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isEntryOpen, isServerGateOpen, listOpenEntries } from "../assets/scripts/config/gates";
import { OpenConditionRow, SystemGateRow } from "../assets/scripts/config/types";
import { GameLog } from "../assets/scripts/core/GameLog";
import { ErrorCode, errorText, failureCode, GameError, messageOf } from "../assets/scripts/core/errors";
import { parseMockFixture } from "../assets/scripts/net/MockFixture";
import { MockGameSession } from "../assets/scripts/net/MockGameSession";
import { MockTransport } from "../assets/scripts/net/MockTransport";
import { NetClient } from "../assets/scripts/net/NetClient";
import { NetState } from "../assets/scripts/net/NetTypes";
import { ReplayTransport } from "../assets/scripts/net/ReplayTransport";
import { Cmd, P0_CMDS, Proto } from "../assets/scripts/net/protocol";
import { PageStack } from "../assets/scripts/ui/PageStack";
import { PopupQueue } from "../assets/scripts/ui/PopupQueue";
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
  const lost = await Proto.stageResult({ stageId: 6, win: false }, net);
  assert(lost.ok && lost.nextStageId === 6 && lost.level === 6 && lost.openDay === 2 && lost.rewards.length === 0, "loss keeps progress");
  const still = await Proto.roleEnter({}, net);
  assert(still.stageId === 6 && still.level === 6 && still.openDay === 2, "enter after loss");

  const created = await Proto.roleCreate({ name: "新人" }, net);
  assert(created.ok && created.name === "新人" && created.level === 1, "create resets level");
  const reset = await Proto.roleEnter({}, net);
  assert(reset.name === "新人" && reset.level === 1 && reset.stageId === 1 && reset.openDay === 1, "create resets progress");
  net.close();

  const seeded = new MockGameSession({ clearedStage: 3, openDay: 9, role: { name: "老号" } });
  assert(seeded.role.level === 4 && seeded.stageId === 4 && seeded.openDay === 9, "seed derived");
  const kept = quietNet(new MockTransport({ latencyMs: 5, session: seeded }));
  const states: NetState[] = [];
  kept.onState((state) => states.push(state));
  await kept.connect("mock://local");
  const old = await Proto.roleEnter({}, kept);
  assert(old.name === "老号" && old.level === 4 && old.openDay === 9 && old.stageId === 4, "seeded enter");
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

async function main(): Promise<void> {
  checkPages();
  checkPopups();
  checkGates();
  checkLog();
  await checkNet();
  await checkSession();
  await checkReplay();
  console.log("skeleton-check ok");
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
