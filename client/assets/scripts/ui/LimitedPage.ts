/**
 * 限时活动。限时兑换、点石成金、限时礼包在同一页用页签切换。
 * 不改 .scene。主城「限时活动」和玩法列表都能进。不设等级锁。
 * 「模拟购买」不走真实支付。返回走页面栈。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applyLimitedWallet,
  limitedCountdown,
  limitedExchangeFailToast,
  limitedExchangeToast,
  limitedHeadLine,
  limitedOfferButton,
  limitedOfferLine,
  limitedOfferSoldOut,
  limitedPackButton,
  limitedPackFailToast,
  limitedPackLine,
  limitedPackToast,
  limitedStoneButton,
  limitedStoneFailToast,
  limitedStoneLine,
  limitedStoneRateLine,
  limitedStoneToast,
  limitedWalletLine,
  LIMITED_PACK_DAYS,
  LIMITED_STONE_DIAMOND,
  LIMITED_STONE_GOLD,
  LIMITED_STONE_LIMIT,
} from "../module/limited/event";
import {
  LimitedAlchemyResp,
  LimitedBuyResp,
  LimitedExchangeResp,
  LimitedOfferRow,
  LimitedPackRow,
  LimitedViewResp,
} from "../net/protocol/types";
import { createButton, createLabel, createRect, paintRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(28, 18, 16, 255);
const TITLE = new Color(255, 214, 160, 255);
const MUTED = new Color(214, 196, 184, 255);
const STAT = new Color(255, 228, 186, 255);
const TAB_ON = new Color(168, 72, 48, 255);
const TAB_OFF = new Color(52, 72, 108, 255);
const BUY_FILL = new Color(168, 112, 36, 255);
const FREE_FILL = new Color(36, 128, 96, 255);
const LOCK_FILL = new Color(78, 84, 98, 255);
const MOCK_FILL = new Color(140, 52, 108, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

type LimitedTab = "exchange" | "stone" | "pack";

const TABS: { id: LimitedTab; title: string }[] = [
  { id: "exchange", title: "限时兑换" },
  { id: "stone", title: "点石成金" },
  { id: "pack", title: "限时礼包" },
];

export interface LimitedHost {
  showToast(text: string): void;
  alive(): boolean;
  view(): Promise<LimitedViewResp>;
  exchange(id: number): Promise<LimitedExchangeResp>;
  alchemy(): Promise<LimitedAlchemyResp>;
  buy(id: number): Promise<LimitedBuyResp>;
  onProgress(): void;
  close(): void;
}

export interface LimitedPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildLimitedPage(host: LimitedHost): LimitedPage {
  return new LimitedController(host);
}

class LimitedController implements LimitedPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly section: Node;
  private readonly tabs: { id: LimitedTab; button: Node }[] = [];
  private disposed = false;
  private busy = false;
  private ticket = 0;
  private toldError = false;
  private tab: LimitedTab = "exchange";
  private snapshot: LimitedViewResp | null = null;
  private headLabel: Node | null = null;
  private walletLabel: Node | null = null;
  private resultLabel: Node | null = null;
  private lastReport = "选一个页签。材料不够、售罄或已经买过都会提示";

  constructor(private readonly host: LimitedHost) {
    this.node = uiNode("LimitedPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    place(createLabel("限时活动", 40, { color: TITLE }), this.body, 0, 500);
    place(
      createLabel("限时兑换、点石成金、限时礼包。模拟购买不接真实支付", 18, { color: MUTED, width: 660 }),
      this.body,
      0,
      448
    );
    const width = 200;
    const gap = 12;
    const span = TABS.length * width + (TABS.length - 1) * gap;
    const origin = -span / 2 + width / 2;
    for (let i = 0; i < TABS.length; i++) {
      const spec = TABS[i];
      const button = createButton(spec.title, () => this.pick(spec.id), width, 48, TAB_OFF, 20);
      place(button, this.body, origin + i * (width + gap), 384);
      this.tabs.push({ id: spec.id, button });
    }
    this.headLabel = place(createLabel("读取中…", 22, { color: STAT, width: 660 }), this.body, 0, 320);
    this.walletLabel = place(createLabel("", 20, { color: MUTED, width: 660 }), this.body, 0, 278);
    this.section = place(uiNode("section"), this.body, 0, 0);
    this.resultLabel = place(
      createLabel(this.lastReport, 18, { color: MUTED, width: 640, height: 56 }),
      this.body,
      0,
      -360
    );
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -430);
    this.paintTabs();
    GameLog.shared.info("Limited", "open");
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

  private pick(tab: LimitedTab): void {
    if (this.disposed || this.tab === tab) return;
    this.tab = tab;
    this.paintTabs();
    this.renderSection();
  }

  private paintTabs(): void {
    for (let i = 0; i < this.tabs.length; i++) {
      const row = this.tabs[i];
      const bg = row.button.getChildByName("bg");
      if (bg) paintRect(bg, row.id === this.tab ? TAB_ON : TAB_OFF);
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
      this.snapshot = view;
      this.render(view);
    } catch (err) {
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      this.noteError(messageOf(err));
    }
  }

  private render(view: LimitedViewResp): void {
    this.write(this.headLabel, limitedHeadLine(view.openDay));
    this.write(this.walletLabel, limitedWalletLine(view.gold, view.diamond, view.beanOwned));
    this.write(this.resultLabel, this.lastReport);
    this.renderSection();
  }

  private renderSection(): void {
    const old = this.section.children.slice();
    for (let i = 0; i < old.length; i++) {
      old[i].parent = null;
      if (old[i].isValid) old[i].destroy();
    }
    const view = this.snapshot;
    if (!view) return;
    if (this.tab === "exchange") this.renderExchange(view.offers || []);
    else if (this.tab === "stone") this.renderStone(view);
    else this.renderPacks(view);
  }

  private renderExchange(rows: LimitedOfferRow[]): void {
    if (rows.length === 0) {
      place(createLabel("暂时没有兑换", 22, { color: MUTED, width: 640 }), this.section, 0, 160);
      return;
    }
    const top = 180;
    const step = 140;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const y = top - i * step;
      place(createLabel(limitedOfferLine(row), 20, { color: STAT, width: 640, height: 56 }), this.section, 0, y);
      const sold = limitedOfferSoldOut(row);
      place(
        createButton(limitedOfferButton(row), () => void this.exchange(row.id), 280, 48, sold ? LOCK_FILL : BUY_FILL, 22),
        this.section,
        0,
        y - 56
      );
    }
  }

  private renderStone(view: LimitedViewResp): void {
    const used = finiteView(view.stoneUsed);
    const limit = view.stoneLimit > 0 ? view.stoneLimit : LIMITED_STONE_LIMIT;
    const gain = view.stoneGold > 0 ? view.stoneGold : LIMITED_STONE_GOLD;
    const cost = used <= 0 ? 0 : view.stoneCost > 0 ? view.stoneCost : LIMITED_STONE_DIAMOND;
    place(createLabel(limitedStoneRateLine(), 20, { color: MUTED, width: 640, height: 56 }), this.section, 0, 180);
    place(createLabel(limitedStoneLine(used, limit, gain, cost), 22, { color: STAT, width: 640, height: 56 }), this.section, 0, 110);
    const spent = used >= limit;
    const free = used <= 0 && !spent;
    place(
      createButton(limitedStoneButton(used, limit), () => void this.alchemy(), 280, 48, spent ? LOCK_FILL : free ? FREE_FILL : BUY_FILL, 22),
      this.section,
      0,
      30
    );
  }

  private renderPacks(view: LimitedViewResp): void {
    place(
      createLabel(view.countdown || limitedCountdown(view.openDay, LIMITED_PACK_DAYS), 22, { color: STAT, width: 640 }),
      this.section,
      0,
      200
    );
    place(createLabel("每种库存 1。开服第 7 天之后不能再买", 18, { color: MUTED, width: 640 }), this.section, 0, 156);
    const rows = view.packs || [];
    if (rows.length === 0) {
      place(createLabel("暂时没有限时礼包", 22, { color: MUTED, width: 640 }), this.section, 0, 90);
      return;
    }
    const top = 90;
    const step = 140;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const y = top - i * step;
      place(createLabel(limitedPackLine(row), 18, { color: STAT, width: 640, height: 56 }), this.section, 0, y);
      place(
        createButton(limitedPackButton(row), () => void this.buy(row.id), 280, 48, packFill(row), 22),
        this.section,
        0,
        y - 56
      );
    }
  }

  private async exchange(id: number): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Limited", "exchange " + id);
    try {
      const resp = await this.host.exchange(id);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        this.fail(limitedExchangeFailToast(resp));
        return;
      }
      applyLimitedWallet(resp);
      if (this.host.alive()) this.host.onProgress();
      this.succeed(limitedExchangeToast(resp.costName, resp.costCount, resp.pay, resp.rewardName, resp.rewardCount));
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      this.fail(messageOf(err));
    } finally {
      this.busy = false;
    }
  }

  private async alchemy(): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Limited", "alchemy");
    try {
      const resp = await this.host.alchemy();
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        this.fail(limitedStoneFailToast(resp));
        return;
      }
      applyLimitedWallet(resp);
      if (this.host.alive()) this.host.onProgress();
      this.succeed(limitedStoneToast(resp.free, resp.cost, resp.goldGain, resp.used, resp.limit));
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      this.fail(messageOf(err));
    } finally {
      this.busy = false;
    }
  }

  private async buy(id: number): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Limited", "buy " + id);
    try {
      const resp = await this.host.buy(id);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        this.fail(limitedPackFailToast(resp));
        return;
      }
      applyLimitedWallet(resp);
      if (this.host.alive()) this.host.onProgress();
      this.succeed(limitedPackToast(resp.name, resp.pay, resp.price, resp.goldGain, resp.diamondGain, resp.itemName, resp.itemGain));
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      this.fail(messageOf(err));
    } finally {
      this.busy = false;
    }
  }

  private succeed(text: string): void {
    this.lastReport = text;
    GameLog.shared.info("Limited", text);
    this.host.showToast(text);
    void this.refresh();
  }

  private fail(text: string): void {
    this.lastReport = text;
    GameLog.shared.warn("Limited", text);
    this.host.showToast(text);
    void this.refresh();
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Limited", text);
    this.host.showToast(text);
    this.write(this.headLabel, "暂时无法打开限时活动");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

function packFill(row: LimitedPackRow): Color {
  if (row.bought || row.ended) return LOCK_FILL;
  if (row.pay === "mock") return MOCK_FILL;
  return BUY_FILL;
}

function finiteView(value: number | undefined): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.floor(value);
}
