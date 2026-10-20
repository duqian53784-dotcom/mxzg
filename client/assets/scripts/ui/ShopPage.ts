/**
 * 基础商店。几样限购商品，用金币或钻石购买。
 * 不改 .scene。主城「商店」和玩法列表都能进。样例 opencondition 没有商店，新号即可进。
 * 返回走页面栈。买到的道具进背包，顶栏钱包刷新。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applyShopBuy,
  shopBuyButton,
  shopBuyToast,
  shopFailToast,
  shopRefreshLine,
  shopSkuLine,
  shopSoldOut,
  shopWalletLine,
} from "../module/shop/catalog";
import { ShopBuyResp, ShopSku, ShopViewResp } from "../net/protocol/types";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(22, 16, 10, 255);
const TITLE = new Color(255, 214, 140, 255);
const MUTED = new Color(214, 196, 168, 255);
const STAT = new Color(255, 228, 170, 255);
const BUY_FILL = new Color(168, 112, 36, 255);
const SOLD_FILL = new Color(78, 84, 98, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface ShopHost {
  showToast(text: string): void;
  alive(): boolean;
  view(): Promise<ShopViewResp>;
  buy(id: number): Promise<ShopBuyResp>;
  onProgress(): void;
  close(): void;
}

export interface ShopPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildShopPage(host: ShopHost): ShopPage {
  return new ShopController(host);
}

class ShopController implements ShopPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly rowsHost: Node;
  private disposed = false;
  private busy = false;
  private ticket = 0;
  private toldError = false;
  private skus: ShopSku[] = [];
  private refreshLabel: Node | null = null;
  private walletLabel: Node | null = null;
  private resultLabel: Node | null = null;
  private lastReport = "点购买。金币或钻石不够、今日卖完都会提示";

  constructor(private readonly host: ShopHost) {
    this.node = uiNode("ShopPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    place(createLabel("基础商店", 40, { color: TITLE }), this.body, 0, 460);
    place(
      createLabel("新号可买。召唤仍直接花钻石", 18, { color: MUTED, width: 640 }),
      this.body,
      0,
      408
    );
    this.refreshLabel = place(createLabel("读取中…", 22, { color: STAT, width: 640 }), this.body, 0, 352);
    this.walletLabel = place(createLabel("", 22, { color: MUTED, width: 640 }), this.body, 0, 308);
    this.rowsHost = place(uiNode("rows-host"), this.body, 0, 0);
    this.resultLabel = place(
      createLabel(this.lastReport, 18, { color: MUTED, width: 640, height: 56 }),
      this.body,
      0,
      -250
    );
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -330);
    GameLog.shared.info("Shop", "open");
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

  private render(view: ShopViewResp): void {
    const skus = view.skus || [];
    this.skus = skus;
    this.write(this.refreshLabel, shopRefreshLine(view.openDay));
    this.write(this.walletLabel, shopWalletLine(view.gold, view.diamond));
    this.write(this.resultLabel, this.lastReport);
    const old = this.rowsHost.getChildByName("rows");
    if (old) {
      old.parent = null;
      if (old.isValid) old.destroy();
    }
    const rows = uiNode("rows");
    rows.parent = this.rowsHost;
    if (skus.length === 0) {
      place(createLabel("商店暂时没有商品", 22, { color: MUTED, width: 640 }), rows, 0, 180);
      return;
    }
    const top = 210;
    const step = 120;
    for (let i = 0; i < skus.length; i++) {
      const sku = skus[i];
      const y = top - i * step;
      place(createLabel(shopSkuLine(sku), 20, { color: STAT, width: 640 }), rows, 0, y);
      place(
        createButton(shopBuyButton(sku), () => void this.buy(sku.id), 280, 48, shopSoldOut(sku) ? SOLD_FILL : BUY_FILL, 22),
        rows,
        0,
        y - 48
      );
    }
  }

  private async buy(id: number): Promise<void> {
    if (this.busy || this.disposed) return;
    const sku = findSku(this.skus, id);
    if (!sku) {
      this.host.showToast(shopFailToast({ code: ErrorCode.SHOP_NOT_FOUND }));
      return;
    }
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Shop", "buy " + id);
    try {
      const resp = await this.host.buy(id);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = shopFailToast(resp);
        GameLog.shared.warn("Shop", text);
        this.host.showToast(text);
        this.lastReport = text;
        void this.refresh();
        return;
      }
      applyShopBuy(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = shopBuyToast(resp.name, resp.count, resp.currency, resp.price);
      this.lastReport = text;
      GameLog.shared.info("Shop", text + " gold " + resp.gold + " diamond " + resp.diamond);
      this.host.showToast(text);
      void this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Shop", text);
      this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Shop", text);
    this.host.showToast(text);
    this.write(this.refreshLabel, "暂时无法打开商店");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

function findSku(skus: ShopSku[], id: number): ShopSku | null {
  for (let i = 0; i < skus.length; i++) {
    if (skus[i].id === id) return skus[i];
  }
  return null;
}
