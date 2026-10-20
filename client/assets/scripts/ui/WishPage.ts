/**
 * 低级许愿池。花金币、许愿符或钻石许愿一次，展示奖池里的下一格。
 * 不改 .scene。玩法列表「许愿池」在主线 Lv10 打开本页。返回走页面栈。
 * 高级许愿池不在这一页。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applyWishDraw,
  wishAttemptsLine,
  wishFailToast,
  wishNextLine,
  wishPayButton,
  wishPoolLine,
  wishSuccessToast,
  wishWalletLine,
} from "../module/wish/pool";
import { WishDrawResp, WishPay, WishViewResp } from "../net/protocol/types";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(18, 16, 36, 255);
const TITLE = new Color(220, 196, 255, 255);
const MUTED = new Color(196, 186, 220, 255);
const STAT = new Color(255, 228, 170, 255);
const GOLD_FILL = new Color(168, 112, 36, 255);
const ITEM_FILL = new Color(96, 72, 168, 255);
const DIAMOND_FILL = new Color(46, 110, 190, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface WishHost {
  showToast(text: string): void;
  alive(): boolean;
  view(): Promise<WishViewResp>;
  draw(pay: WishPay): Promise<WishDrawResp>;
  onProgress(): void;
  close(): void;
}

export interface WishPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWishPage(host: WishHost): WishPage {
  return new WishController(host);
}

class WishController implements WishPage {
  readonly node: Node;
  private readonly body: Node;
  private disposed = false;
  private busy = false;
  private ticket = 0;
  private toldError = false;
  private used = 0;
  private limit = 0;
  private attemptsLabel: Node | null = null;
  private walletLabel: Node | null = null;
  private nextLabel: Node | null = null;
  private resultLabel: Node | null = null;
  private goldButton: Node | null = null;
  private itemButton: Node | null = null;
  private diamondButton: Node | null = null;
  private lastReport = "选一种方式许愿一次。次数用完、货币或许愿符不够都会提示";

  constructor(private readonly host: WishHost) {
    this.node = uiNode("WishPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    place(createLabel("许愿池 · 低级", 40, { color: TITLE }), this.body, 0, 460);
    place(createLabel("主线 Lv10 开启。每天 5 次，三种方式任选", 18, { color: MUTED, width: 640 }), this.body, 0, 408);
    this.attemptsLabel = place(createLabel("读取中…", 26, { color: STAT, width: 640 }), this.body, 0, 352);
    this.walletLabel = place(createLabel("", 22, { color: MUTED, width: 640 }), this.body, 0, 304);
    this.nextLabel = place(createLabel("", 22, { color: STAT, width: 640 }), this.body, 0, 256);
    place(createLabel(wishPoolLine(), 18, { color: MUTED, width: 640 }), this.body, 0, 208);
    this.goldButton = place(
      createButton("金币许愿", () => void this.draw("gold"), 560, 56, GOLD_FILL, 22),
      this.body,
      0,
      120
    );
    this.itemButton = place(
      createButton("许愿符许愿", () => void this.draw("item"), 560, 56, ITEM_FILL, 22),
      this.body,
      0,
      48
    );
    this.diamondButton = place(
      createButton("钻石许愿", () => void this.draw("diamond"), 560, 56, DIAMOND_FILL, 22),
      this.body,
      0,
      -24
    );
    this.resultLabel = place(
      createLabel(this.lastReport, 18, { color: MUTED, width: 640, height: 72 }),
      this.body,
      0,
      -120
    );
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -210);
    GameLog.shared.info("Wish", "open");
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

  private render(view: WishViewResp): void {
    this.used = view.used;
    this.limit = view.limit;
    this.write(this.attemptsLabel, wishAttemptsLine(view.used, view.limit));
    this.write(this.walletLabel, wishWalletLine(view.gold, view.diamond, view.tokenOwned));
    this.write(this.nextLabel, wishNextLine(view.cursor));
    this.write(this.resultLabel, this.lastReport);
    this.write(labelOf(this.goldButton), wishPayButton("gold", view.used, view.limit));
    this.write(labelOf(this.itemButton), wishPayButton("item", view.used, view.limit));
    this.write(labelOf(this.diamondButton), wishPayButton("diamond", view.used, view.limit));
  }

  private async draw(pay: WishPay): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Wish", "draw " + pay);
    try {
      const resp = await this.host.draw(pay);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = wishFailToast(resp);
        GameLog.shared.warn("Wish", text);
        this.host.showToast(text);
        void this.refresh();
        return;
      }
      applyWishDraw(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = wishSuccessToast(resp.kind, resp.name, resp.count, resp.pay, resp.cost);
      this.lastReport = text;
      GameLog.shared.info("Wish", text + " gold " + resp.gold);
      this.host.showToast(text);
      void this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Wish", text);
      this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Wish", text);
    this.host.showToast(text);
    this.write(this.attemptsLabel, "暂时无法打开许愿池");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

function labelOf(button: Node | null): Node | null {
  if (!button) return null;
  return button.getChildByName("Label");
}
