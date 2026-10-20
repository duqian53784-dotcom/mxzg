/**
 * 七日目标（C14）。按天看任务、进度、前往和领取。
 * 不改 .scene。主城按钮和玩法列表都能打开。返回走页面栈。
 * 「前往」再压一层已有界面（主线 / 召唤 / 英雄 / 挂机），返回回到本页。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applyGoal7Claim,
  GOAL7_DAYS,
  goal7ClaimableCount,
  goal7ClaimText,
  goal7ClaimToast,
  goal7DayHint,
  goal7DayLabel,
  goal7DetailLine,
  goal7FailToast,
  goal7GoText,
  goal7HeadLine,
  goal7SubLine,
  goal7TasksOnDay,
  goal7TitleLine,
  goal7WalletLine,
} from "../module/goal7/tasks";
import { Goal7ClaimResp, Goal7State, Goal7Task, Goal7ViewResp } from "../net/protocol/types";
import { createButton, createLabel, createRect, paintRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(22, 18, 12, 255);
const TITLE = new Color(255, 214, 150, 255);
const MUTED = new Color(214, 196, 170, 255);
const STAT = new Color(255, 228, 170, 255);
const DAY_FILL = new Color(72, 64, 48, 255);
const DAY_ON = new Color(168, 112, 42, 255);
const LOCKED_FILL = new Color(72, 76, 88, 255);
const PROGRESS_FILL = new Color(48, 72, 112, 255);
const CLAIMABLE_FILL = new Color(128, 78, 36, 255);
const CLAIMED_FILL = new Color(42, 92, 72, 255);
const GO_FILL = new Color(46, 110, 190, 255);
const CLAIM_FILL = new Color(176, 112, 36, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface Goal7Host {
  showToast(text: string): void;
  alive(): boolean;
  view(): Promise<Goal7ViewResp>;
  claim(id: string): Promise<Goal7ClaimResp>;
  go(jump: string): void;
  onProgress(): void;
  close(): void;
}

export interface Goal7Page {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildGoal7Page(host: Goal7Host): Goal7Page {
  return new Goal7Controller(host);
}

class Goal7Controller implements Goal7Page {
  readonly node: Node;
  private readonly body: Node;
  private readonly rowsHost: Node;
  private readonly dayButtons: Node[] = [];
  private disposed = false;
  private busy = false;
  private ticket = 0;
  private toldError = false;
  private selectedDay = 1;
  private tasks: Goal7Task[] = [];
  private headLabel: Node | null = null;
  private hintLabel: Node | null = null;
  private walletLabel: Node | null = null;

  constructor(private readonly host: Goal7Host) {
    this.node = uiNode("Goal7Page");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    place(createLabel("七日目标", 40, { color: TITLE }), this.body, 0, 480);
    place(createLabel(goal7SubLine(), 18, { color: MUTED, width: 660 }), this.body, 0, 436);
    this.headLabel = place(createLabel("读取中…", 24, { color: STAT, width: 660 }), this.body, 0, 396);
    this.walletLabel = place(createLabel("", 20, { color: STAT, width: 660 }), this.body, 0, 360);
    this.mountDays();
    this.hintLabel = place(createLabel("", 18, { color: MUTED, width: 660 }), this.body, 0, 268);
    this.rowsHost = place(uiNode("rows-host"), this.body, 0, 0);
    place(createButton("返回", () => this.host.close(), 220, 48, BACK_FILL, 22), this.body, 0, -200);
    GameLog.shared.info("Goal7", "open");
    void this.refresh();
  }

  reload(): void {
    if (this.disposed) return;
    void this.refresh();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.ticket += 1;
  }

  private mountDays(): void {
    const width = 92;
    const gap = 4;
    const span = GOAL7_DAYS * width + (GOAL7_DAYS - 1) * gap;
    const origin = -span / 2 + width / 2;
    for (let day = 1; day <= GOAL7_DAYS; day++) {
      const picked = day;
      const button = createButton(goal7DayLabel(day), () => this.selectDay(picked), width, 40, DAY_FILL, 18);
      place(button, this.body, origin + (day - 1) * (width + gap), 318);
      this.dayButtons.push(button);
    }
    this.paintDays();
  }

  private selectDay(day: number): void {
    if (this.disposed || day === this.selectedDay) return;
    this.selectedDay = day;
    GameLog.shared.info("Goal7", "day " + day);
    this.paintDays();
    this.renderTasks();
  }

  private paintDays(): void {
    for (let i = 0; i < this.dayButtons.length; i++) {
      const button = this.dayButtons[i];
      const bg = button.getChildByName("bg");
      if (bg) paintRect(bg, i + 1 === this.selectedDay ? DAY_ON : DAY_FILL);
    }
  }

  private async refresh(): Promise<void> {
    if (this.disposed) return;
    const ticket = ++this.ticket;
    try {
      const view = await this.host.view();
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      if (!view.ok) {
        this.noteError(errorText(view.code ?? ErrorCode.UNKNOWN_CMD));
        return;
      }
      this.toldError = false;
      this.tasks = view.tasks || [];
      this.write(this.headLabel, goal7HeadLine(view.clearedStage, goal7ClaimableCount(this.tasks)));
      this.write(this.walletLabel, goal7WalletLine(view.gold, view.diamond));
      this.paintDays();
      this.renderTasks();
    } catch (err) {
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      this.noteError(messageOf(err));
    }
  }

  private renderTasks(): void {
    const rows = goal7TasksOnDay(this.tasks, this.selectedDay);
    this.write(this.hintLabel, goal7DayHint(this.selectedDay, rows.length));
    const old = this.rowsHost.getChildByName("rows");
    if (old) {
      old.parent = null;
      if (old.isValid) old.destroy();
    }
    const host = uiNode("rows");
    host.parent = this.rowsHost;
    if (rows.length === 0) {
      place(createLabel("这一天还没有目标", 22, { color: MUTED, width: 640 }), host, 0, 140);
      return;
    }
    const top = 180;
    const step = 128;
    for (let i = 0; i < rows.length; i++) {
      place(this.buildCard(rows[i]), host, 0, top - i * step);
    }
  }

  private buildCard(task: Goal7Task): Node {
    const card = uiNode("task-" + task.id);
    place(createRect("bg", 660, 118, fillFor(task.state)), card, 0, 0);
    place(createLabel(goal7TitleLine(task), 22, { color: TITLE, width: 620 }), card, 0, 36);
    place(createLabel(goal7DetailLine(task), 18, { color: MUTED, width: 620 }), card, 0, 6);
    place(
      createButton(goal7GoText(task.jump), () => this.go(task), 220, 40, GO_FILL, 20),
      card,
      -160,
      -34
    );
    place(
      createButton(goal7ClaimText(task.state), () => void this.claim(task.id), 220, 40, claimFill(task.state), 20),
      card,
      160,
      -34
    );
    return card;
  }

  private go(task: Goal7Task): void {
    if (this.disposed) return;
    GameLog.shared.info("Goal7", "go " + task.id + " " + task.jump);
    this.host.go(task.jump);
  }

  private async claim(id: string): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Goal7", "claim " + id);
    try {
      const resp = await this.host.claim(id);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = goal7FailToast(resp);
        GameLog.shared.warn("Goal7", text);
        this.host.showToast(text);
        void this.refresh();
        return;
      }
      applyGoal7Claim(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = goal7ClaimToast(resp.title, resp.rewards || []);
      GameLog.shared.info("Goal7", text + " gold " + resp.gold + " diamond " + resp.diamond);
      this.host.showToast(text);
      void this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Goal7", text);
      this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Goal7", text);
    this.host.showToast(text);
    this.write(this.headLabel, "暂时无法打开七日目标");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

function fillFor(state: Goal7State): Color {
  if (state === "claimed") return CLAIMED_FILL;
  if (state === "locked") return LOCKED_FILL;
  if (state === "claimable") return CLAIMABLE_FILL;
  return PROGRESS_FILL;
}

function claimFill(state: Goal7State): Color {
  if (state === "claimable") return CLAIM_FILL;
  if (state === "claimed") return CLAIMED_FILL;
  return LOCKED_FILL;
}
