/**
 * 真服主线页。展示 s2c 3007 的 now_idx / max_idx。
 * 「挑战」在本页，发空 c2s 3001。已领首通在本页只读展示，打开时拉空 c2s 3010。
 * 快速战斗次数在本页只读展示，3010 之后再拉空 c2s 3012。不发 3013。
 * 主线入口已在「更多」，不往主屏再放矩形。
 * 收到 report 用 planBattle 色块回放。不接 spine。不发 18001，不把 Mock 1201/1202 当战报。
 */
import { Color, Node, UITransform } from "cc";
import { ErrorCode, errorText } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import { BattlePlan, BattleRound, BattleUnit } from "../module/mainline/battle";
import {
  formatWireBattleMatch,
  formatWireFightLine,
  planWireReportReplay,
  WIRE_BATTLE_UNSYNCED_TOAST,
  wireMainlineFightStage,
  WireBattleMatch,
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
import { createButton, createLabel, createRect, paintRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const OPEN_FILL = new Color(46, 110, 190, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const WIN = new Color(255, 214, 120, 255);
const LOSE = new Color(230, 120, 110, 255);
const ALLY_BG = new Color(28, 58, 96, 255);
const ENEMY_BG = new Color(96, 40, 44, 255);
const DEAD_BG = new Color(48, 52, 62, 255);
const ALLY_BAR = new Color(88, 196, 120, 255);
const ENEMY_BAR = new Color(220, 96, 96, 255);
const LOG_COLOR = new Color(214, 224, 236, 255);
const CARD_W = 180;
const CARD_H = 108;
const BAR_W = 150;
const ENEMY_Y = 270;
const ALLY_Y = 70;
const ROUND_MS = 480;

export interface WireMainlineHost {
  alive(): boolean;
  close(): void;
  showToast(text: string): void;
  roleName(): string;
  connected(): boolean;
}

export interface WireMainlinePage {
  node: Node;
  dispose(): void;
}

interface UnitCard {
  node: Node;
  setHp(hp: number, maxHp: number): void;
}

type Phase = "info" | "battle" | "done";

export function buildWireMainlinePage(host: WireMainlineHost): WireMainlinePage {
  return new WireMainlineController(host);
}

class WireMainlineController implements WireMainlinePage {
  readonly node: Node;
  private readonly body: Node;
  private disposed = false;
  private waiting = false;
  private phase: Phase = "info";
  private seenSerial = 0;
  private offSync: (() => void) | null = null;
  private nowLabel: Node | null = null;
  private maxLabel: Node | null = null;
  private fightLabel: Node | null = null;
  private rewardLabel: Node | null = null;
  private quickLabel: Node | null = null;
  private statusLabel: Node | null = null;
  private resultLabel: Node | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private sleepResolve: ((cont: boolean) => void) | null = null;
  private skipped = false;
  private cards: { allies: UnitCard[]; enemies: UnitCard[] } | null = null;
  private roundLabel: Node | null = null;
  private logLabel: Node | null = null;
  private allyRow: Node | null = null;
  private enemyRow: Node | null = null;
  private logLines: string[] = [];
  private lastSnap: WireBattleMatch | null = null;

  constructor(private readonly host: WireMainlineHost) {
    this.node = uiNode("WireMainlinePage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.seenSerial = WireSession.battleSerial;
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
    if (!this.waiting) return;
    if (WireSession.battleSerial === this.seenSerial) return;
    this.seenSerial = WireSession.battleSerial;
    this.waiting = false;
    const snap = WireSession.battleMatch;
    if (!snap || !snap.report) {
      this.phase = "info";
      this.showInfo();
      return;
    }
    this.phase = "battle";
    void this.play(snap);
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
    place(createLabel(WIRE_MAINLINE_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 140 }), this.body, 0, -70);
    place(createButton("挑战", () => this.challenge(), 240, 52, OPEN_FILL), this.body, 0, -200);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -280);
  }

  private renderInfo(): void {
    this.write(this.nowLabel, this.nowText());
    this.write(this.maxLabel, this.maxText());
    this.write(this.fightLabel, this.fightText());
    this.write(this.rewardLabel, this.rewardText());
    this.write(this.quickLabel, this.quickText());
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
    this.waiting = true;
    this.write(this.statusLabel, "已发 3001，等待战报");
    GameLog.shared.info("Mainline", "wire challenge 3001");
  }

  private async play(snap: WireBattleMatch): Promise<void> {
    this.lastSnap = snap;
    const stage = wireMainlineFightStage(WireSession.nowIdx, WireSession.maxIdx);
    if (stage === null || !snap.report) {
      this.host.showToast(WIRE_BATTLE_UNSYNCED_TOAST);
      this.showInfo();
      return;
    }
    const plan = planWireReportReplay(stage, snap.report.win, this.host.roleName());
    GameLog.shared.info("Mainline", "wire report replay idx " + plan.stageId + " " + formatWireBattleMatch(snap));
    this.showBattle(plan);
    const played = await this.playback(plan);
    if (!played || this.disposed || !this.host.alive()) return;
    this.showDone(snap);
  }

  private showBattle(plan: BattlePlan): void {
    this.phase = "battle";
    this.skipped = false;
    this.logLines = [];
    this.clearBody();
    place(createLabel("进战 idx " + plan.stageId, 40, { color: TITLE }), this.body, 0, 470);
    this.roundLabel = place(createLabel("准备战斗", 22, { color: MUTED, width: 640 }), this.body, 0, 410);
    place(createLabel("敌方", 18, { color: LOSE }), this.body, 0, 355);
    this.enemyRow = place(uiNode("enemies"), this.body, 0, ENEMY_Y);
    place(createLabel("我方", 18, { color: ALLY_BAR }), this.body, 0, 165);
    this.allyRow = place(uiNode("allies"), this.body, 0, ALLY_Y);
    place(createRect("log-bg", 660, 110, new Color(10, 18, 32, 230)), this.body, 0, -80);
    this.logLabel = place(
      createLabel("", 18, { color: LOG_COLOR, width: 620, height: 96, align: "left" }),
      this.body,
      0,
      -80
    );
    const first = plan.rounds[0];
    this.cards = {
      enemies: this.buildCards(this.enemyRow, first.enemies, ENEMY_BG, ENEMY_BAR),
      allies: this.buildCards(this.allyRow, first.allies, ALLY_BG, ALLY_BAR),
    };
    place(createButton("跳过", () => this.skip(), 240, 52), this.body, 0, -230);
  }

  private async playback(plan: BattlePlan): Promise<boolean> {
    for (let i = 0; i < plan.rounds.length; i++) {
      if (this.disposed) return false;
      if (this.skipped) {
        this.renderRound(plan.rounds[plan.rounds.length - 1]);
        return true;
      }
      this.renderRound(plan.rounds[i]);
      const last = i === plan.rounds.length - 1;
      const cont = await this.sleep(last ? 260 : ROUND_MS);
      if (!cont || this.disposed) return false;
      if (this.skipped) {
        this.renderRound(plan.rounds[plan.rounds.length - 1]);
        return true;
      }
    }
    return true;
  }

  private showDone(snap: WireBattleMatch): void {
    this.phase = "done";
    this.lastSnap = snap;
    this.clearBody();
    const win = snap.report ? snap.report.win : null;
    const headline = win === true ? "胜利" : win === false ? "失败" : "胜负未带";
    const color = win === true ? WIN : win === false ? LOSE : MUTED;
    place(createLabel(headline, 56, { color }), this.body, 0, 360);
    this.resultLabel = place(createLabel(this.resultText(), 22, { color: MUTED, width: 640, height: 160 }), this.body, 0, 180);
    place(createLabel("色块回放，不接 spine", 18, { color: MUTED, width: 640 }), this.body, 0, 40);
    place(createButton("再挑战", () => this.challenge(), 240, 52, OPEN_FILL), this.body, 0, -80);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -170);
  }

  private skip(): void {
    if (this.disposed || this.phase !== "battle") return;
    this.skipped = true;
    this.wake(true);
  }

  private resultText(): string {
    const snap = this.lastSnap;
    const report = snap && snap.report ? formatWireBattleMatch(snap) : "没有 report";
    return report + "\n" + this.nowText() + "\n" + this.maxText() + "\n" + this.quickText();
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
    return formatWireBattleMatch(snap);
  }

  private renderRound(round: BattleRound): void {
    const cards = this.cards;
    if (!cards) return;
    this.applySide(cards.allies, round.allies);
    this.applySide(cards.enemies, round.enemies);
    if (this.roundLabel && this.roundLabel.isValid) setText(this.roundLabel, round.line);
    this.logLines.push(round.line);
    if (this.logLines.length > 4) this.logLines.shift();
    if (this.logLabel && this.logLabel.isValid) setText(this.logLabel, this.logLines.join("\n"));
    if (this.enemyRow && this.enemyRow.isValid) {
      this.enemyRow.setPosition(0, round.actor === "enemy" ? ENEMY_Y - 18 : ENEMY_Y, 0);
    }
    if (this.allyRow && this.allyRow.isValid) {
      this.allyRow.setPosition(0, round.actor === "ally" ? ALLY_Y + 18 : ALLY_Y, 0);
    }
  }

  private applySide(cards: UnitCard[], units: BattleUnit[]): void {
    const n = cards.length < units.length ? cards.length : units.length;
    for (let i = 0; i < n; i++) cards[i].setHp(units[i].hp, units[i].maxHp);
  }

  private buildCards(row: Node, units: BattleUnit[], bg: Color, bar: Color): UnitCard[] {
    const cards: UnitCard[] = [];
    const xs = [-220, 0, 220];
    const n = units.length < xs.length ? units.length : xs.length;
    for (let i = 0; i < n; i++) {
      const card = createUnitCard(units[i], bg, bar);
      place(card.node, row, xs[i], 0);
      cards.push(card);
    }
    return cards;
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
    this.cards = null;
    this.roundLabel = null;
    this.logLabel = null;
    this.allyRow = null;
    this.enemyRow = null;
    this.nowLabel = null;
    this.maxLabel = null;
    this.fightLabel = null;
    this.rewardLabel = null;
    this.quickLabel = null;
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

function createUnitCard(unit: BattleUnit, bgColor: Color, barColor: Color): UnitCard {
  const node = uiNode("Unit");
  const ui = node.addComponent(UITransform);
  ui.setContentSize(CARD_W, CARD_H);
  const bg = createRect("bg", CARD_W, CARD_H, bgColor);
  bg.parent = node;
  const name = createLabel(unit.name, 18, { width: CARD_W - 12 });
  place(name, node, 0, 28);
  const hp = createLabel(unit.hp + "/" + unit.maxHp, 16, { color: MUTED, width: CARD_W - 12 });
  place(hp, node, 0, 2);
  const bar = uiNode("bar");
  bar.addComponent(UITransform).setContentSize(BAR_W, 10);
  place(bar, node, 0, -32);
  const barBg = createRect("bar-bg", BAR_W, 10, new Color(16, 20, 28, 255));
  barBg.parent = bar;
  const fill = createRect("bar-fill", BAR_W, 10, barColor);
  fill.parent = bar;
  const card: UnitCard = {
    node,
    setHp(value: number, maxHp: number): void {
      const safeMax = maxHp > 0 ? maxHp : 1;
      let clamped = value;
      if (clamped < 0) clamped = 0;
      if (clamped > safeMax) clamped = safeMax;
      setText(hp, clamped + "/" + safeMax);
      const w = (clamped / safeMax) * BAR_W;
      fill.active = w > 0.5;
      if (w > 0.5) {
        const fillUi = fill.getComponent(UITransform);
        if (fillUi) fillUi.setContentSize(w, 10);
        fill.setPosition(-BAR_W / 2 + w / 2, 0, 0);
        paintRect(fill, barColor);
      }
      paintRect(bg, clamped <= 0 ? DEAD_BG : bgColor);
    },
  };
  card.setHp(unit.hp, unit.maxHp);
  return card;
}
