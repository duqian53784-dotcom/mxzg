/**
 * 日常金币副本（C12）。剩余次数、难度和金币预览，挑战一键结算。
 * 不改 .scene。玩法列表「日常副本」在主线 Lv15 打开本页。返回走页面栈。
 * 只做金币。经验副本和英雄副本不在这一页。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applyDailyChallenge,
  dailyAttemptsLine,
  dailyChallengeButton,
  dailyEmptyToast,
  dailyFailToast,
  dailyPowerLine,
  dailyPreviewLine,
  dailyReportLine,
  dailyResultToast,
  dailyRowText,
} from "../module/daily/gold";
import { DailyChallengeResp, DailyTier, DailyViewResp } from "../net/protocol/types";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(28, 18, 8, 255);
const TITLE = new Color(255, 214, 120, 255);
const MUTED = new Color(210, 196, 170, 255);
const STAT = new Color(255, 228, 160, 255);
const ROW_FILL = new Color(96, 64, 28, 255);
const SELECTED_FILL = new Color(168, 104, 32, 255);
const FIGHT_FILL = new Color(176, 120, 36, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface DailyGoldHost {
  showToast(text: string): void;
  alive(): boolean;
  view(): Promise<DailyViewResp>;
  challenge(tierId: number): Promise<DailyChallengeResp>;
  onProgress(): void;
  close(): void;
}

export interface DailyGoldPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildDailyGoldPage(host: DailyGoldHost): DailyGoldPage {
  return new DailyGoldController(host);
}

class DailyGoldController implements DailyGoldPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly rowsHost: Node;
  private disposed = false;
  private busy = false;
  private ticket = 0;
  private toldError = false;
  private selectedId = 0;
  private tiers: DailyTier[] = [];
  private used = 0;
  private limit = 0;
  private attemptsLabel: Node | null = null;
  private powerLabel: Node | null = null;
  private previewLabel: Node | null = null;
  private resultLabel: Node | null = null;
  private fightButton: Node | null = null;
  private lastReport = "点一个难度，再点挑战。战力够就发放预览里的金币";

  constructor(private readonly host: DailyGoldHost) {
    this.node = uiNode("DailyGoldPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    place(createLabel("日常副本 · 金币", 40, { color: TITLE }), this.body, 0, 460);
    place(
      createLabel("只开放金币副本。一键结算，不播战报", 18, { color: MUTED, width: 640 }),
      this.body,
      0,
      408
    );
    this.attemptsLabel = place(createLabel("读取中…", 26, { color: STAT, width: 640 }), this.body, 0, 352);
    this.powerLabel = place(createLabel("", 22, { color: MUTED, width: 640 }), this.body, 0, 308);
    this.previewLabel = place(createLabel("", 22, { color: STAT, width: 640 }), this.body, 0, 260);
    this.rowsHost = place(uiNode("rows-host"), this.body, 0, 0);
    this.resultLabel = place(
      createLabel(this.lastReport, 18, { color: MUTED, width: 640, height: 72 }),
      this.body,
      0,
      -20
    );
    this.fightButton = place(
      createButton("挑战", () => void this.fight(), 560, 64, FIGHT_FILL, 22),
      this.body,
      0,
      -120
    );
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -210);
    GameLog.shared.info("Daily", "open");
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
      this.render(view);
    } catch (err) {
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      this.noteError(messageOf(err));
    }
  }

  private render(view: DailyViewResp): void {
    const tiers = view.tiers || [];
    this.tiers = tiers;
    this.used = view.used;
    this.limit = view.limit;
    if (this.selectedId === 0 || !findTier(tiers, this.selectedId)) {
      this.selectedId = tiers.length > 0 ? tiers[0].id : 0;
    }
    const selected = findTier(tiers, this.selectedId);
    this.write(this.attemptsLabel, dailyAttemptsLine(view.used, view.limit));
    this.write(this.powerLabel, dailyPowerLine(view.playerPower, view.gold));
    this.write(this.previewLabel, dailyPreviewLine(selected));
    this.write(this.resultLabel, this.lastReport);
    this.write(
      this.fightButton ? this.fightButton.getChildByName("Label") : null,
      dailyChallengeButton(selected ? selected.name : null, view.used, view.limit)
    );
    const old = this.rowsHost.getChildByName("rows");
    if (old) {
      old.parent = null;
      if (old.isValid) old.destroy();
    }
    const rows = uiNode("rows");
    rows.parent = this.rowsHost;
    const top = 180;
    const step = 56;
    for (let i = 0; i < tiers.length; i++) {
      const row = tiers[i];
      const picked = row.id === this.selectedId;
      const button = createButton(
        (picked ? "已选 " : "") + dailyRowText(row, view.playerPower),
        () => this.select(row.id),
        640,
        48,
        picked ? SELECTED_FILL : ROW_FILL,
        18
      );
      place(button, rows, 0, top - i * step);
    }
  }

  private select(tierId: number): void {
    if (this.disposed || this.selectedId === tierId) return;
    this.selectedId = tierId;
    GameLog.shared.info("Daily", "select " + tierId);
    void this.refresh();
  }

  private async fight(): Promise<void> {
    if (this.busy || this.disposed) return;
    const tier = findTier(this.tiers, this.selectedId);
    if (!tier) {
      this.host.showToast(dailyEmptyToast());
      return;
    }
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Daily", "challenge " + tier.id);
    try {
      const resp = await this.host.challenge(tier.id);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = dailyFailToast(resp);
        GameLog.shared.warn("Daily", text);
        this.host.showToast(text);
        this.selectedId = tier.id;
        void this.refresh();
        return;
      }
      applyDailyChallenge(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = dailyResultToast(resp.name, resp.win, resp.goldGain, resp.itemName, resp.itemGain);
      this.lastReport = dailyReportLine(resp.playerPower, resp.needPower, resp.name, resp.win) + " · " + text;
      GameLog.shared.info("Daily", text + " gold " + resp.gold);
      this.host.showToast(text);
      this.selectedId = resp.tierId;
      void this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Daily", text);
      this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Daily", text);
    this.host.showToast(text);
    this.write(this.attemptsLabel, "暂时无法打开金币副本");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

function findTier(tiers: DailyTier[], id: number): DailyTier | null {
  for (let i = 0; i < tiers.length; i++) {
    if (tiers[i].id === id) return tiers[i];
  }
  return null;
}
