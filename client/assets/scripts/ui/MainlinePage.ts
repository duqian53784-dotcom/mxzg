/**
 * 主线关卡页（C3）。关卡列表、简化战报、结算都在这一页里换内容。
 * 不加载 Battle.scene，也不改 .scene。主城「主线」通过页面栈打开。
 */
import { Color, Node, UITransform } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { Session } from "../core/Session";
import { StageEnterResp, StagePushResp, StageResultReq, StageResultResp } from "../net/protocol/types";
import {
  applyStageProgress,
  BattlePlan,
  BattleReason,
  BattleRound,
  BattleUnit,
  challengeBlock,
  listStages,
  loseToast,
  MAINLINE_PUSH_STAGE,
  planBattle,
  pushAlreadyToast,
  pushButtonText,
  pushHint,
  pushToast,
  reasonText,
  rewardLines,
  winToast,
} from "../module/mainline/battle";
import { createButton, createLabel, createRect, paintRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const OPEN_FILL = new Color(46, 110, 190, 255);
const LOCKED_FILL = new Color(78, 84, 98, 255);
const RETREAT_FILL = new Color(150, 64, 64, 255);
const LIST_FILL = new Color(36, 72, 120, 255);
const DEBUG_FILL = new Color(72, 64, 112, 255);
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

export interface MainlineHost {
  level(): number;
  roleName(): string;
  stageId(): number;
  showToast(text: string): void;
  alive(): boolean;
  enter(stageId: number): Promise<StageEnterResp>;
  settle(req: StageResultReq): Promise<StageResultResp>;
  push(target: number): Promise<StagePushResp>;
  onProgress(): void;
  close(): void;
}

export interface MainlinePage {
  node: Node;
  dispose(): void;
}

interface UnitCard {
  node: Node;
  setHp(hp: number, maxHp: number): void;
}

type Phase = "list" | "battle" | "resolve" | "settle" | "closed";
type PlayAction = "skip" | "retreat" | null;

export function buildMainlinePage(host: MainlineHost): MainlinePage {
  return new MainlineController(host);
}

class MainlineController implements MainlinePage {
  readonly node: Node;
  private readonly body: Node;
  private disposed = false;
  private busy = false;
  private phase: Phase = "list";
  private action: PlayAction = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private sleepResolve: ((cont: boolean) => void) | null = null;
  private cards: { allies: UnitCard[]; enemies: UnitCard[] } | null = null;
  private roundLabel: Node | null = null;
  private logLabel: Node | null = null;
  private allyRow: Node | null = null;
  private enemyRow: Node | null = null;
  private logLines: string[] = [];

  constructor(private readonly host: MainlineHost) {
    this.node = uiNode("MainlinePage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    GameLog.shared.info("Mainline", "open list stage " + host.stageId());
    this.showList();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.phase = "closed";
    this.wake(false);
  }

  private showList(): void {
    this.phase = "list";
    this.clearBody();
    const current = this.host.stageId() >= 1 ? Math.floor(this.host.stageId()) : 1;
    const level = this.host.level();
    place(createLabel("主线关卡", 40, { color: TITLE }), this.body, 0, 470);
    place(
      createLabel("已通关 " + (current - 1) + " 关 · 当前第 " + current + " 关 · Lv" + level, 20, {
        color: MUTED,
        width: 640,
      }),
      this.body,
      0,
      410
    );
    const rows = listStages(current);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const open = row.state === "current";
      const suffix = open ? "挑战" : row.state === "cleared" ? "已通关" : "未开启";
      const button = createButton(
        "第" + row.stageId + "关    " + suffix,
        () => this.onRow(row.stageId),
        560,
        52,
        open ? OPEN_FILL : LOCKED_FILL,
        22
      );
      place(button, this.body, 0, 320 - i * 68);
    }
    place(createLabel("挑战当前关。战斗中可以跳过，撤退算失败", 18, { color: MUTED, width: 640 }), this.body, 0, -130);
    place(
      createButton(pushButtonText(), () => void this.pushToGoal(), 420, 52, DEBUG_FILL, 22),
      this.body,
      0,
      -200
    );
    place(createLabel(pushHint(), 16, { color: MUTED, width: 640 }), this.body, 0, -258);
    place(createButton("返回主城", () => this.host.close(), 240, 52), this.body, 0, -330);
  }

  /** 连胜推到第 70 关，不播战报。已经到了只提示，不加金币。 */
  private async pushToGoal(): Promise<void> {
    if (this.busy || this.disposed) return;
    if (this.phase === "battle" || this.phase === "resolve") return;
    this.busy = true;
    GameLog.shared.info("Mainline", "push to " + MAINLINE_PUSH_STAGE);
    try {
      const result = await this.host.push(MAINLINE_PUSH_STAGE);
      if (this.disposed || !this.host.alive()) return;
      if (!result.ok) {
        const text = errorText(result.code ?? ErrorCode.STAGE_ID_INVALID);
        GameLog.shared.warn("Mainline", text);
        this.host.showToast(text);
        return;
      }
      applyStageProgress(result);
      if (this.host.alive()) this.host.onProgress();
      const text = result.already
        ? pushAlreadyToast(result.clearedStage)
        : pushToast(result.clearedStage, result.nextStageId, result.goldGain);
      GameLog.shared.info("Mainline", text);
      this.host.showToast(text);
      if (!this.disposed && this.host.alive()) this.showList();
    } catch (err) {
      const text = messageOf(err);
      GameLog.shared.error("Mainline", "push " + text);
      if (!this.disposed && this.host.alive()) this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  private onRow(stageId: number): void {
    const block = challengeBlock(stageId, this.host.stageId());
    if (block) {
      GameLog.shared.info("Mainline", "block stage " + stageId);
      this.host.showToast(block);
      return;
    }
    void this.begin(stageId);
  }

  private async begin(stageId: number): Promise<void> {
    if (this.busy || this.disposed) return;
    if (this.phase === "battle" || this.phase === "resolve") return;
    const block = challengeBlock(stageId, this.host.stageId());
    if (block) {
      this.host.showToast(block);
      return;
    }
    this.busy = true;
    try {
      const entered = await this.host.enter(stageId);
      if (this.disposed || !this.host.alive()) return;
      if (!entered.ok || !entered.battleId) {
        const text = errorText(entered.code ?? ErrorCode.STAGE_ID_INVALID);
        GameLog.shared.warn("Mainline", text);
        this.host.showToast(text);
        return;
      }
      GameLog.shared.info("Mainline", "stage enter " + entered.stageId + " " + entered.battleId);
      // 当前关按可胜来播。等级暂时落后时也不会把进度卡死；撤退仍改判负。
      const level = this.host.level();
      const plan = planBattle({
        stageId: entered.stageId,
        level: level >= entered.stageId ? level : entered.stageId,
        roleName: this.host.roleName(),
      });
      this.showBattle(plan);
      const action = await this.playback(plan);
      if (this.disposed || !this.host.alive() || action === "cancel") return;
      const win = action === "retreat" ? false : plan.win;
      const reason: BattleReason = action === "retreat" ? "retreat" : plan.reason;
      if (action === "retreat") {
        const fled = planBattle({
          stageId: entered.stageId,
          level: this.host.level(),
          roleName: this.host.roleName(),
          retreat: true,
        });
        this.renderRound(fled.rounds[0]);
      }
      this.phase = "resolve";
      const result = await this.host.settle({
        stageId: entered.stageId,
        battleId: entered.battleId,
        win,
      });
      if (!result.ok) {
        const text = errorText(result.code ?? ErrorCode.STAGE_ID_INVALID);
        GameLog.shared.warn("Mainline", text);
        if (!this.disposed && this.host.alive()) {
          this.host.showToast(text);
          this.showList();
        }
        return;
      }
      applyStageProgress(result);
      if (this.host.alive()) this.host.onProgress();
      this.report(result, reason);
      if (this.disposed || !this.host.alive()) return;
      this.showSettlement(result, reason);
    } catch (err) {
      const text = messageOf(err);
      GameLog.shared.error("Mainline", "stage " + text);
      if (!this.disposed && this.host.alive()) {
        this.host.showToast(text);
        if (this.phase !== "list") this.showList();
      }
    } finally {
      this.busy = false;
    }
  }

  private report(result: StageResultResp, reason: BattleReason): void {
    if (result.win) {
      GameLog.shared.info(
        "Mainline",
        "stage result " + result.stageId + " next " + result.nextStageId + " " + rewardLines(result.rewards)[0]
      );
      if (!this.disposed && this.host.alive()) this.host.showToast(winToast(result.stageId, result.rewards));
      return;
    }
    const text = loseToast(result.stageId);
    GameLog.shared.warn("Mainline", text + " (" + reason + ")");
    if (!this.disposed && this.host.alive()) this.host.showToast(text);
  }

  private showBattle(plan: BattlePlan): void {
    this.phase = "battle";
    this.action = null;
    this.logLines = [];
    this.clearBody();
    place(createLabel("第" + plan.stageId + "关", 40, { color: TITLE }), this.body, 0, 470);
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
    place(createButton("跳过", () => this.request("skip"), 200, 52), this.body, -140, -230);
    place(createButton("撤退", () => this.request("retreat"), 200, 52, RETREAT_FILL), this.body, 140, -230);
  }

  private async playback(plan: BattlePlan): Promise<"done" | "retreat" | "cancel"> {
    for (let i = 0; i < plan.rounds.length; i++) {
      if (this.disposed) return "cancel";
      if (this.action === "retreat") return "retreat";
      if (this.action === "skip") {
        this.renderRound(plan.rounds[plan.rounds.length - 1]);
        return "done";
      }
      this.renderRound(plan.rounds[i]);
      const last = i === plan.rounds.length - 1;
      const cont = await this.sleep(last ? 260 : ROUND_MS);
      if (!cont || this.disposed) return "cancel";
      if (this.action === "retreat") return "retreat";
      if (this.action === "skip") {
        this.renderRound(plan.rounds[plan.rounds.length - 1]);
        return "done";
      }
    }
    return "done";
  }

  private showSettlement(result: StageResultResp, reason: BattleReason): void {
    this.phase = "settle";
    this.clearBody();
    const win = result.win === true;
    const shown: BattleReason = win ? "clear" : reason === "clear" ? "retreat" : reason;
    place(createLabel(win ? "胜利" : "失败", 56, { color: win ? WIN : LOSE }), this.body, 0, 430);
    place(
      createLabel("第" + result.stageId + "关 · " + reasonText(shown), 22, { color: MUTED, width: 640 }),
      this.body,
      0,
      350
    );
    const lines = rewardLines(result.rewards);
    place(createLabel(lines.join("  "), 28, { color: TITLE, width: 640 }), this.body, 0, 270);
    const next = result.nextStageId >= 1 ? result.nextStageId : this.host.stageId();
    place(
      createLabel(
        "Lv" + this.host.level() + " · 下一关 " + next + " · 金币 " + Session.gold + " · 钻石 " + Session.diamond,
        20,
        { color: MUTED, width: 640 }
      ),
      this.body,
      0,
      120
    );
    if (win) {
      place(createButton("下一关", () => void this.begin(this.host.stageId()), 420, 64), this.body, 0, 10);
    } else {
      place(createButton("再次挑战", () => void this.begin(this.host.stageId()), 420, 64), this.body, 0, 10);
    }
    place(createButton("关卡列表", () => this.showList(), 240, 48, LIST_FILL), this.body, 0, -90);
    place(createButton("返回主城", () => this.host.close(), 240, 48), this.body, 0, -170);
  }

  private request(action: "skip" | "retreat"): void {
    if (this.disposed || this.phase !== "battle") return;
    this.action = action;
    GameLog.shared.info("Mainline", action === "skip" ? "skip" : "retreat");
    this.wake(true);
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
    const kids = this.body.children.slice();
    for (let i = 0; i < kids.length; i++) {
      kids[i].parent = null;
      kids[i].destroy();
    }
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
