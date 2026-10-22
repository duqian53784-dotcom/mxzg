/**
 * 真服主线页。展示 s2c 3007 的 now_idx / max_idx。
 * 「挑战」在本页，发空 c2s 3001。已领首通在本页只读展示，打开时拉空 c2s 3010。
 * 快速战斗次数在本页只读展示，3010 之后再拉空 c2s 3012。不发 3013。
 * 「挂机战报」在本页，发 c2s 3006（chapterIdx、firstPos，不是空帧）。不发 3005。
 * 主线入口已在「更多」，不往主屏再放矩形。
 * 收到 report 在本页播 spine 站场和回合动作，3001 和 3006 都走 planWireSpineReplay。
 * 不发 18001，不把 Mock 1201/1202 当战报。
 * 没有 report 或未同步时 Toast「真服未同步」，不回落 Mock。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireBattleMatch,
  formatWireFightLine,
  planWireSpineReplay,
  resolveWireBattleWin,
  WIRE_BATTLE_UNSYNCED_TOAST,
  WIRE_SPINE_LOAD_FAIL,
  wireMainlineFightStage,
  WireBattleMatch,
  WireSpineReplay,
  WireSpineSlot,
} from "../net/protocol/wireBattle";
import {
  formatWireChapterIdx,
  WIRE_MAINLINE_READONLY_NOTE,
  WIRE_MAINLINE_READONLY_TITLE,
} from "../net/protocol/wireChapter";
import {
  formatWireChapterReward,
  WIRE_CHAPTER_REWARD_UNSYNCED_TOAST,
} from "../net/protocol/wireChapterReward";
import {
  formatWireQuickBattle,
  WIRE_QUICK_BATTLE_UNSYNCED_TOAST,
} from "../net/protocol/wireQuickBattle";
import {
  formatWireChapterReport,
  WIRE_CHAPTER_REPORT_UNSYNCED_TOAST,
} from "../net/protocol/wireChapterReport";
import { mountBattleSpine, SpineActor } from "./battleSpine";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const OPEN_FILL = new Color(46, 110, 190, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const WIN = new Color(255, 214, 120, 255);
const LOSE = new Color(230, 120, 110, 255);
const ALLY_BAR = new Color(88, 196, 120, 255);
const LOG_COLOR = new Color(214, 224, 236, 255);
const ENEMY_Y = 300;
const ALLY_Y = 20;
const BEAT_MS = 700;

export interface WireMainlineHost {
  alive(): boolean;
  close(): void;
  showToast(text: string): void;
  roleName(): string;
  roleId(): number | null;
  connected(): boolean;
}

export interface WireMainlinePage {
  node: Node;
  dispose(): void;
}

type Phase = "info" | "battle" | "done";
type WaitKind = "3001" | "3006";

export function buildWireMainlinePage(host: WireMainlineHost): WireMainlinePage {
  return new WireMainlineController(host);
}

class WireMainlineController implements WireMainlinePage {
  readonly node: Node;
  private readonly body: Node;
  private disposed = false;
  private waiting = false;
  private waitKind: WaitKind | null = null;
  private phase: Phase = "info";
  private replayKind: WaitKind = "3001";
  private seenSerial = 0;
  private seenReportSerial = 0;
  private chapterIdx = 1;
  private firstPos = 1;
  private offSync: (() => void) | null = null;
  private nowLabel: Node | null = null;
  private maxLabel: Node | null = null;
  private fightLabel: Node | null = null;
  private rewardLabel: Node | null = null;
  private quickLabel: Node | null = null;
  private hangLabel: Node | null = null;
  private reportLabel: Node | null = null;
  private statusLabel: Node | null = null;
  private resultLabel: Node | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private sleepResolve: ((cont: boolean) => void) | null = null;
  private skipped = false;
  private spineWarned = false;
  private actors: SpineActor[] = [];
  private nameLabels: Node[] = [];
  private hpLabels: Node[] = [];
  private hpNow: (number | null)[] = [];
  private roundLabel: Node | null = null;
  private logLabel: Node | null = null;
  private logLines: string[] = [];
  private lastSnap: WireBattleMatch | null = null;

  constructor(private readonly host: WireMainlineHost) {
    this.node = uiNode("WireMainlinePage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.seenSerial = WireSession.battleSerial;
    this.seenReportSerial = WireSession.chapterReportSerial;
    this.showInfo();
    if (!WireSession.hasChapterReward()) this.host.showToast(WIRE_CHAPTER_REWARD_UNSYNCED_TOAST);
    WireSession.pullChapterRewardList();
    if (!WireSession.hasQuickBattle()) this.host.showToast(WIRE_QUICK_BATTLE_UNSYNCED_TOAST);
    WireSession.pullQuickBattleCount();
    GameLog.shared.info("Mainline", "wire open " + this.nowText() + " / " + this.maxText() + " / " + this.rewardText() + " / " + this.quickText());
    this.offSync = WireSession.onSync(() => this.onSync());
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.waiting = false;
    this.wake(false);
    if (this.offSync) {
      this.offSync();
      this.offSync = null;
    }
  }

  private onSync(): void {
    if (this.disposed || !this.host.alive()) return;
    if (this.phase === "info") this.renderInfo();
    if (this.phase === "done") this.write(this.resultLabel, this.resultText());
    if (!this.waiting || !this.waitKind) return;
    if (this.waitKind === "3001") {
      if (WireSession.battleSerial === this.seenSerial) return;
      this.seenSerial = WireSession.battleSerial;
      this.waiting = false;
      this.waitKind = null;
      const snap = WireSession.battleMatch;
      if (!snap || !snap.report) {
        this.phase = "info";
        this.showInfo();
        return;
      }
      this.replayKind = "3001";
      this.phase = "battle";
      void this.play(snap);
      return;
    }
    if (WireSession.chapterReportSerial === this.seenReportSerial) return;
    this.seenReportSerial = WireSession.chapterReportSerial;
    this.waiting = false;
    this.waitKind = null;
    const report = WireSession.chapterReport;
    if (!report || !report.report) {
      this.host.showToast(WIRE_CHAPTER_REPORT_UNSYNCED_TOAST);
      this.phase = "info";
      this.showInfo();
      return;
    }
    const echoed = report.chapterIdx;
    const stage = echoed !== null && echoed >= 1 ? Math.floor(echoed) : this.chapterIdx;
    this.replayKind = "3006";
    this.phase = "battle";
    void this.play({ empty: false, report: report.report, marks: report.marks }, stage);
  }

  private showInfo(): void {
    this.phase = "info";
    this.clearBody();
    place(createLabel(WIRE_MAINLINE_READONLY_TITLE, 40, { color: TITLE }), this.body, 0, 360);
    this.nowLabel = place(createLabel(this.nowText(), 28, { color: TITLE, width: 640 }), this.body, 0, 270);
    this.maxLabel = place(createLabel(this.maxText(), 28, { color: TITLE, width: 640 }), this.body, 0, 220);
    this.fightLabel = place(createLabel(this.fightText(), 24, { color: TITLE, width: 640 }), this.body, 0, 170);
    this.rewardLabel = place(createLabel(this.rewardText(), 22, { color: TITLE, width: 640, height: 56 }), this.body, 0, 130);
    this.quickLabel = place(createLabel(this.quickText(), 22, { color: TITLE, width: 640, height: 56 }), this.body, 0, 70);
    this.statusLabel = place(createLabel(this.statusText(), 22, { color: MUTED, width: 640 }), this.body, 0, 20);
    place(createLabel(WIRE_MAINLINE_READONLY_NOTE, 16, { color: MUTED, width: 640, height: 96 }), this.body, 0, -40);
    this.hangLabel = place(createLabel(this.hangText(), 20, { color: TITLE, width: 640 }), this.body, 0, -130);
    this.reportLabel = place(createLabel(this.reportText(), 18, { color: MUTED, width: 640, height: 48 }), this.body, 0, -175);
    place(createButton("关-", () => this.bump("idx", -1), 88, 40, BACK_FILL), this.body, -240, -230);
    place(createButton("关+", () => this.bump("idx", 1), 88, 40, BACK_FILL), this.body, -120, -230);
    place(createButton("位-", () => this.bump("pos", -1), 88, 40, BACK_FILL), this.body, 40, -230);
    place(createButton("位+", () => this.bump("pos", 1), 88, 40, BACK_FILL), this.body, 160, -230);
    place(createButton("挂机战报", () => this.hangupReport(), 240, 48, OPEN_FILL), this.body, 0, -290);
    place(createButton("挑战", () => this.challenge(), 240, 48, OPEN_FILL), this.body, 0, -360);
    place(createButton("返回", () => this.host.close(), 240, 44, BACK_FILL), this.body, 0, -430);
  }

  private renderInfo(): void {
    this.write(this.nowLabel, this.nowText());
    this.write(this.maxLabel, this.maxText());
    this.write(this.fightLabel, this.fightText());
    this.write(this.rewardLabel, this.rewardText());
    this.write(this.quickLabel, this.quickText());
    this.write(this.hangLabel, this.hangText());
    this.write(this.reportLabel, this.reportText());
    if (!this.waiting) this.write(this.statusLabel, this.statusText());
  }

  private challenge(): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    if (!this.host.connected()) {
      this.host.showToast(errorText(ErrorCode.NET_NOT_CONNECTED));
      return;
    }
    if (!WireSession.hasChapter()) {
      this.host.showToast(WIRE_BATTLE_UNSYNCED_TOAST);
      return;
    }
    this.seenSerial = WireSession.battleSerial;
    if (!WireSession.challengeMainline()) {
      this.host.showToast(WIRE_BATTLE_UNSYNCED_TOAST);
      return;
    }
    this.waitKind = "3001";
    this.replayKind = "3001";
    this.waiting = true;
    this.write(this.statusLabel, "已发 3001，等待战报");
    GameLog.shared.info("Mainline", "wire challenge 3001");
  }

  private hangupReport(): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    if (!this.host.connected()) {
      this.host.showToast(errorText(ErrorCode.NET_NOT_CONNECTED));
      return;
    }
    if (!WireSession.hasChapter()) {
      this.host.showToast(WIRE_CHAPTER_REPORT_UNSYNCED_TOAST);
      return;
    }
    this.seenReportSerial = WireSession.chapterReportSerial;
    if (!WireSession.pullChapterReport(this.chapterIdx, this.firstPos)) {
      this.host.showToast(WIRE_CHAPTER_REPORT_UNSYNCED_TOAST);
      return;
    }
    this.waitKind = "3006";
    this.replayKind = "3006";
    this.waiting = true;
    this.write(this.statusLabel, "已发 3006，等待战报");
    GameLog.shared.info("Mainline", "wire chapter report 3006 chapterIdx=" + this.chapterIdx + " firstPos=" + this.firstPos);
  }

  private bump(which: "idx" | "pos", delta: number): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    if (which === "idx") this.chapterIdx = clampProbe(this.chapterIdx + delta);
    else this.firstPos = clampProbe(this.firstPos + delta);
    this.write(this.hangLabel, this.hangText());
  }

  private async play(snap: WireBattleMatch, stageOverride?: number): Promise<void> {
    this.lastSnap = snap;
    const stage = typeof stageOverride === "number" ? stageOverride : wireMainlineFightStage(WireSession.nowIdx, WireSession.maxIdx);
    if (stage === null || !snap.report) {
      this.host.showToast(WIRE_BATTLE_UNSYNCED_TOAST);
      this.showInfo();
      return;
    }
    const plan = planWireSpineReplay(snap.report, this.host.roleId(), stage);
    GameLog.shared.info("Mainline", "wire spine idx " + plan.stageId + " " + plan.stems.join(",") + " " + formatWireBattleMatch(snap, this.host.roleId()));
    this.showBattle(plan);
    const played = await this.playback(plan);
    if (!played || this.disposed || !this.host.alive()) return;
    this.showDone(snap);
  }

  private showBattle(plan: WireSpineReplay): void {
    this.phase = "battle";
    this.skipped = false;
    this.spineWarned = false;
    this.logLines = [];
    this.clearBody();
    place(createLabel("进战 idx " + plan.stageId, 40, { color: TITLE }), this.body, 0, 500);
    this.roundLabel = place(createLabel("站场", 22, { color: MUTED, width: 640 }), this.body, 0, 450);
    place(createLabel("敌方", 18, { color: LOSE }), this.body, 0, 400);
    place(createLabel("我方", 18, { color: ALLY_BAR }), this.body, 0, 120);
    this.mountSlots(plan);
    place(createRect("log-bg", 660, 110, new Color(10, 18, 32, 230)), this.body, 0, -150);
    this.logLabel = place(
      createLabel("", 18, { color: LOG_COLOR, width: 620, height: 96, align: "left" }),
      this.body,
      0,
      -150
    );
    place(createButton("跳过", () => this.skip(), 240, 52), this.body, 0, -280);
  }

  private mountSlots(plan: WireSpineReplay): void {
    this.actors = [];
    this.nameLabels = [];
    this.hpLabels = [];
    this.hpNow = [];
    const totals = countSides(plan.slots);
    const seen = { ally: 0, enemy: 0, sword: 0, flag: 0 };
    for (let i = 0; i < plan.slots.length; i++) {
      const slot = plan.slots[i];
      const index = seen[slot.side];
      seen[slot.side] += 1;
      const xy = slotXY(slot.side, index, totals[slot.side]);
      const root = place(uiNode("slot-" + slot.stem), this.body, xy.x, xy.y);
      const name = place(createLabel(slot.label, 14, { color: MUTED, width: 180, height: 36 }), root, 0, -78);
      const hp = place(createLabel(hpText(slot, slot.hp), 14, { color: TITLE, width: 180 }), root, 0, -108);
      this.nameLabels.push(name);
      this.hpLabels.push(hp);
      this.hpNow.push(slot.hp);
      const slotIndex = i;
      this.actors.push(mountBattleSpine(root, slot.stem, () => this.failSlot(slotIndex)));
    }
  }

  private failSlot(index: number): void {
    if (this.disposed) return;
    const slotLabel = this.nameLabels[index];
    if (slotLabel && slotLabel.isValid) setText(slotLabel, WIRE_SPINE_LOAD_FAIL);
    if (this.spineWarned) return;
    this.spineWarned = true;
    GameLog.shared.info("Mainline", WIRE_SPINE_LOAD_FAIL);
    this.host.showToast(WIRE_SPINE_LOAD_FAIL);
  }

  private async playback(plan: WireSpineReplay): Promise<boolean> {
    for (let i = 0; i < plan.beats.length; i++) {
      if (this.disposed) return false;
      if (this.skipped) {
        this.renderBeat(plan, plan.beats[plan.beats.length - 1]);
        return true;
      }
      this.renderBeat(plan, plan.beats[i]);
      const last = i === plan.beats.length - 1;
      const cont = await this.sleep(last ? 260 : BEAT_MS);
      if (!cont || this.disposed) return false;
      if (this.skipped) {
        this.renderBeat(plan, plan.beats[plan.beats.length - 1]);
        return true;
      }
    }
    return true;
  }

  private showDone(snap: WireBattleMatch): void {
    this.phase = "done";
    this.lastSnap = snap;
    this.clearBody();
    const win = snap.report ? resolveWireBattleWin(snap.report, this.host.roleId()) : null;
    const headline = win === true ? "胜利" : win === false ? "失败" : "胜负未带";
    const color = win === true ? WIN : win === false ? LOSE : MUTED;
    place(createLabel(headline, 56, { color }), this.body, 0, 360);
    this.resultLabel = place(createLabel(this.resultText(), 22, { color: MUTED, width: 640, height: 160 }), this.body, 0, 180);
    place(createLabel("spine 站场 / 回合动作，技能受击后续再接", 18, { color: MUTED, width: 640 }), this.body, 0, 40);
    const again = this.replayKind === "3006" ? "再看战报" : "再挑战";
    place(createButton(again, () => (this.replayKind === "3006" ? this.hangupReport() : this.challenge()), 240, 52, OPEN_FILL), this.body, 0, -80);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -170);
  }

  private skip(): void {
    if (this.disposed || this.phase !== "battle") return;
    this.skipped = true;
    this.wake(true);
  }

  private resultText(): string {
    const snap = this.lastSnap;
    const report = snap && snap.report ? formatWireBattleMatch(snap, this.host.roleId()) : "没有 report";
    const hang = this.replayKind === "3006" ? "\n" + this.reportText() : "";
    return report + "\n" + this.nowText() + "\n" + this.maxText() + "\n" + this.quickText() + hang;
  }

  private hangText(): string {
    return "挂机战报 chapterIdx " + this.chapterIdx + " / firstPos " + this.firstPos;
  }

  private reportText(): string {
    return formatWireChapterReport(WireSession.chapterReport);
  }

  private nowText(): string {
    return formatWireChapterIdx("now", WireSession.nowIdx);
  }

  private maxText(): string {
    return formatWireChapterIdx("max", WireSession.maxIdx);
  }

  private fightText(): string {
    return formatWireFightLine(WireSession.nowIdx, WireSession.maxIdx);
  }

  private rewardText(): string {
    return formatWireChapterReward(WireSession.chapterReward);
  }

  private quickText(): string {
    return formatWireQuickBattle(WireSession.quickBattle);
  }

  private statusText(): string {
    const snap = WireSession.battleMatch;
    if (!snap) return "点挑战发 3001";
    return formatWireBattleMatch(snap, this.host.roleId());
  }

  private renderBeat(plan: WireSpineReplay, beat: WireSpineReplay["beats"][number]): void {
    for (let i = 0; i < beat.cues.length; i++) {
      const cue = beat.cues[i];
      const actor = this.actors[cue.slot];
      if (actor) actor.play(cue.clip);
    }
    for (let i = 0; i < beat.hp.length; i++) {
      if (beat.hp[i] !== null) this.hpNow[i] = beat.hp[i];
    }
    for (let i = 0; i < plan.slots.length; i++) {
      const label = this.hpLabels[i];
      if (label && label.isValid) setText(label, hpText(plan.slots[i], this.hpNow[i]));
    }
    if (this.roundLabel && this.roundLabel.isValid) setText(this.roundLabel, beat.line);
    this.logLines.push(beat.line);
    if (this.logLines.length > 4) this.logLines.shift();
    if (this.logLabel && this.logLabel.isValid) setText(this.logLabel, this.logLines.join("\n"));
  }

  private sleep(ms: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.sleepResolve = resolve;
      this.timer = setTimeout(() => {
        this.timer = null;
        this.sleepResolve = null;
        resolve(!this.disposed);
      }, ms);
      const maybe = this.timer as { unref?: () => void };
      if (typeof maybe.unref === "function") maybe.unref();
    });
  }

  private wake(cont: boolean): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const resolve = this.sleepResolve;
    this.sleepResolve = null;
    if (resolve) resolve(cont);
  }

  private clearBody(): void {
    this.actors = [];
    this.nameLabels = [];
    this.hpLabels = [];
    this.hpNow = [];
    this.roundLabel = null;
    this.logLabel = null;
    this.nowLabel = null;
    this.maxLabel = null;
    this.fightLabel = null;
    this.rewardLabel = null;
    this.quickLabel = null;
    this.hangLabel = null;
    this.reportLabel = null;
    this.statusLabel = null;
    this.resultLabel = null;
    const kids = this.body.children.slice();
    for (let i = 0; i < kids.length; i++) {
      kids[i].parent = null;
      kids[i].destroy();
    }
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

function clampProbe(value: number): number {
  if (!isFinite(value) || value < 1) return 1;
  if (value > 9999) return 9999;
  return Math.floor(value);
}

function countSides(slots: WireSpineSlot[]): { ally: number; enemy: number; sword: number; flag: number } {
  const totals = { ally: 0, enemy: 0, sword: 0, flag: 0 };
  for (let i = 0; i < slots.length; i++) totals[slots[i].side] += 1;
  return totals;
}

function slotXY(side: WireSpineSlot["side"], index: number, total: number): { x: number; y: number } {
  if (side === "enemy") return { x: rowX(index, total), y: ENEMY_Y };
  if (side === "ally") return { x: rowX(index, total), y: ALLY_Y };
  if (side === "sword") return { x: 260, y: -30 };
  return { x: 0, y: 180 };
}

function rowX(index: number, total: number): number {
  if (total <= 1) return 0;
  if (total === 2) return index === 0 ? -160 : 160;
  if (index === 0) return -200;
  if (index === 1) return 0;
  return 200;
}

function hpText(slot: WireSpineSlot, hp: number | null): string {
  if (slot.side === "sword" || slot.side === "flag") return slot.stem;
  if (hp === null && slot.maxHp === null) return "hp 未带";
  if (hp === null) return "max " + slot.maxHp;
  if (slot.maxHp === null) return String(hp);
  return hp + "/" + slot.maxHp;
}
