/**
 * 挂机页（C4）。时长、收益预览、领取、快速作战都在这一页里。
 * 不改 .scene。主城「挂机」或玩法列表通过页面栈打开。
 */
import { Color, Label, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applyIdleClaim,
  capPreviewLine,
  claimToast,
  formatDuration,
  formatItemEvery,
  IDLE_ITEM_ID,
  IDLE_ITEM_NAME,
  QUICK_BATTLE_COUNT,
  quickBatchToast,
  quickToast,
} from "../module/idle/rewards";
import { applyStageProgress, loseToast } from "../module/mainline/battle";
import { IdleClaimResp, IdleQueryResp, StageEnterResp, StageResultReq, StageResultResp } from "../net/protocol/types";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const GOLD = new Color(255, 214, 120, 255);
const ITEM = new Color(186, 214, 170, 255);
const WARN = new Color(255, 176, 120, 255);
const CLAIM_FILL = new Color(168, 116, 42, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface IdleHost {
  stageId(): number;
  showToast(text: string): void;
  alive(): boolean;
  query(): Promise<IdleQueryResp>;
  claim(): Promise<IdleClaimResp>;
  enter(stageId: number): Promise<StageEnterResp>;
  settle(req: StageResultReq): Promise<StageResultResp>;
  onProgress(): void;
  close(): void;
}

export interface IdlePage {
  node: Node;
  dispose(): void;
}

interface QuickWin {
  stageId: number;
  nextStageId: number;
  gold: number;
}

export function buildIdlePage(host: IdleHost): IdlePage {
  return new IdleController(host);
}

class IdleController implements IdlePage {
  readonly node: Node;
  private readonly body: Node;
  private disposed = false;
  private busy = false;
  private toldError = false;
  private ticket = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private progressLabel: Node | null = null;
  private durationLabel: Node | null = null;
  private statusLabel: Node | null = null;
  private goldLabel: Node | null = null;
  private itemLabel: Node | null = null;
  private capLabel: Node | null = null;
  private ownedLabel: Node | null = null;
  private quickButton: Node | null = null;

  constructor(private readonly host: IdleHost) {
    this.node = uiNode("IdlePage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.build();
    GameLog.shared.info("Idle", "open");
    void this.refresh();
    this.timer = setInterval(() => {
      if (this.busy || this.disposed) return;
      void this.refresh();
    }, 1000);
    const maybe = this.timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.ticket += 1;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private build(): void {
    place(createLabel("挂机", 40, { color: TITLE }), this.body, 0, 470);
    this.progressLabel = place(createLabel("读取进度…", 20, { color: MUTED, width: 640 }), this.body, 0, 415);
    this.durationLabel = place(createLabel("已挂机 --:--:-- / 08:00:00", 28, { color: TITLE, width: 640 }), this.body, 0, 360);
    this.statusLabel = place(createLabel("", 18, { color: MUTED, width: 640 }), this.body, 0, 315);
    place(createRect("card", 640, 250, new Color(16, 28, 48, 255)), this.body, 0, 150);
    place(createLabel("当前可领", 18, { color: MUTED }), this.body, 0, 245);
    this.goldLabel = place(createLabel("金币 +0", 26, { color: GOLD, width: 600 }), this.body, 0, 195);
    this.itemLabel = place(createLabel(IDLE_ITEM_NAME + " +0", 26, { color: ITEM, width: 600 }), this.body, 0, 145);
    this.capLabel = place(createLabel("", 18, { color: MUTED, width: 600 }), this.body, 0, 90);
    this.ownedLabel = place(createLabel("", 18, { color: MUTED, width: 640 }), this.body, 0, -10);
    place(createButton("领取", () => void this.claim(), 420, 64, CLAIM_FILL), this.body, 0, -80);
    this.quickButton = place(
      createButton(this.quickLabel(this.host.stageId()), () => void this.quick(), 420, 64),
      this.body,
      0,
      -165
    );
    place(
      createLabel("快速作战直接结算当前关，不播战报，可连续点", 18, { color: MUTED, width: 640 }),
      this.body,
      0,
      -230
    );
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -300);
  }

  private async refresh(): Promise<void> {
    if (this.disposed) return;
    const ticket = ++this.ticket;
    try {
      const view = await this.host.query();
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      if (!view.ok) {
        this.noteError(errorText(view.code ?? ErrorCode.UNKNOWN_CMD));
        return;
      }
      this.toldError = false;
      this.render(view);
    } catch (err) {
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      this.noteError(messageOf(err));
    }
  }

  private render(view: IdleQueryResp): void {
    const cleared = view.clearedStage >= 0 ? Math.floor(view.clearedStage) : 0;
    const stageId = view.stageId >= 1 ? Math.floor(view.stageId) : 1;
    this.write(this.progressLabel, "已通关 " + cleared + " 关 · 当前第 " + stageId + " 关");
    this.write(
      this.durationLabel,
      "已挂机 " + formatDuration(view.elapsedMs) + " / " + formatDuration(view.capMs)
    );
    this.write(
      this.statusLabel,
      view.capped ? "已达 8 小时上限，请领取" : "未到上限。整段时长按当前已通关关数计算"
    );
    if (this.statusLabel && this.statusLabel.isValid) {
      const label = this.statusLabel.getComponent(Label);
      if (label) {
        const src = view.capped ? WARN : MUTED;
        label.color = new Color(src.r, src.g, src.b, src.a);
      }
    }
    this.write(
      this.goldLabel,
      "金币 +" + view.pendingGold + "（每分钟 " + view.goldPerMin + "）"
    );
    this.write(
      this.itemLabel,
      view.itemName + " +" + view.pendingItem + "（" + formatItemEvery(view.itemEveryMs) + "）"
    );
    this.write(this.capLabel, capPreviewLine(view.capGold, view.capItem));
    this.write(this.ownedLabel, "已有" + view.itemName + " " + view.ownedItem + "（可在背包查看）");
    this.write(this.quickButton?.getChildByName("Label") ?? null, this.quickLabel(stageId));
  }

  private async claim(): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Idle", "claim");
    try {
      const resp = await this.host.claim();
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = errorText(resp.code ?? ErrorCode.IDLE_EMPTY);
        GameLog.shared.warn("Idle", text);
        this.host.showToast(text);
        await this.refresh();
        return;
      }
      applyIdleClaim(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = claimToast(rewardCount(resp, 1), rewardCount(resp, IDLE_ITEM_ID));
      GameLog.shared.info("Idle", text + " gold " + resp.gold);
      this.host.showToast(text);
      await this.refresh();
    } catch (err) {
      const text = messageOf(err);
      GameLog.shared.error("Idle", "claim " + text);
      if (!this.disposed && this.host.alive()) this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  /** 一键结算当前关，不播 C3 战报。QUICK_BATTLE_COUNT 大于 1 时连打。 */
  private async quick(): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.ticket += 1;
    const won: QuickWin[] = [];
    try {
      const count = QUICK_BATTLE_COUNT >= 1 ? QUICK_BATTLE_COUNT : 1;
      for (let i = 0; i < count; i++) {
        if (this.disposed || !this.host.alive()) return;
        const stageId = this.host.stageId() >= 1 ? Math.floor(this.host.stageId()) : 1;
        GameLog.shared.info("Idle", "quick stage " + stageId);
        const entered = await this.host.enter(stageId);
        if (this.disposed || !this.host.alive()) return;
        if (!entered.ok || !entered.battleId) {
          this.failQuick(won, errorText(entered.code ?? ErrorCode.STAGE_ID_INVALID));
          return;
        }
        const result = await this.host.settle({
          stageId: entered.stageId,
          battleId: entered.battleId,
          win: true,
        });
        if (this.disposed || !this.host.alive()) return;
        if (!result.ok || result.win !== true) {
          const text = !result.ok ? errorText(result.code ?? ErrorCode.STAGE_ID_INVALID) : loseToast(result.stageId);
          this.failQuick(won, text);
          return;
        }
        applyStageProgress(result);
        if (this.host.alive()) this.host.onProgress();
        won.push({
          stageId: result.stageId,
          nextStageId: result.nextStageId,
          gold: rewardCount(result, 1),
        });
      }
      if (won.length === 0 || this.disposed || !this.host.alive()) return;
      const text = this.quickText(won);
      GameLog.shared.info("Idle", text);
      this.host.showToast(text);
      await this.refresh();
    } catch (err) {
      const text = messageOf(err);
      GameLog.shared.error("Idle", "quick " + text);
      if (!this.disposed && this.host.alive()) this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  private failQuick(won: QuickWin[], text: string): void {
    GameLog.shared.warn("Idle", text);
    if (!this.host.alive()) return;
    if (won.length > 0) this.host.showToast(this.quickText(won) + "。" + text);
    else this.host.showToast(text);
    void this.refresh();
  }

  private quickText(won: QuickWin[]): string {
    const first = won[0];
    const last = won[won.length - 1];
    let gold = 0;
    for (let i = 0; i < won.length; i++) gold += won[i].gold;
    if (won.length === 1) return quickToast(first.stageId, first.nextStageId, [{ id: 1, count: gold }]);
    return quickBatchToast(first.stageId, last.stageId, last.nextStageId, gold);
  }

  private quickLabel(stageId: number): string {
    const id = stageId >= 1 ? Math.floor(stageId) : 1;
    if (QUICK_BATTLE_COUNT > 1) return "快速作战 · 第" + id + "关起 " + QUICK_BATTLE_COUNT + " 关";
    return "快速作战 · 第" + id + "关";
  }

  private noteError(text: string): void {
    GameLog.shared.warn("Idle", text);
    if (this.toldError) return;
    this.toldError = true;
    this.host.showToast(text);
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

function rewardCount(resp: { rewards?: { id: number; count: number }[] }, id: number): number {
  const rewards = resp.rewards;
  if (!rewards) return 0;
  let total = 0;
  for (let i = 0; i < rewards.length; i++) {
    if (rewards[i].id !== id) continue;
    const count = rewards[i].count;
    if (typeof count === "number" && isFinite(count) && count > 0) total += Math.floor(count);
  }
  return total;
}
