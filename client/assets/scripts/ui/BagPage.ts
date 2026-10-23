/**
 * 背包（C7）。点一项再使用。消耗品改 Mock 会话，材料和碎片只提示。
 * 不改 .scene。主城「背包」和玩法列表都能打开。返回走页面栈。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { bagIconFor, mockBagItems } from "../module/bag/bagView";
import {
  applyBagUse,
  bagFailToast,
  bagRowText,
  bagUseToast,
  emptyBagToast,
  useButtonText,
} from "../module/bag/items";
import { mountItemIcon } from "./itemIcon";
import { BagItem, BagListResp, BagUseResp } from "../net/protocol/types";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const BODY = new Color(214, 224, 236, 255);
const ROW_FILL = new Color(36, 72, 120, 255);
const SELECT_FILL = new Color(168, 116, 42, 255);
const USE_FILL = new Color(36, 128, 96, 255);
const LOCKED_FILL = new Color(78, 84, 98, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface BagHost {
  showToast(text: string): void;
  alive(): boolean;
  list(): Promise<BagListResp>;
  use(id: number, count: number): Promise<BagUseResp>;
  onProgress(): void;
  close(): void;
}

export interface BagPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildBagPage(host: BagHost): BagPage {
  return new BagController(host);
}

class BagController implements BagPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly rowsHost: Node;
  private readonly detailHost: Node;
  private disposed = false;
  private busy = false;
  private ticket = 0;
  private toldError = false;
  private items: BagItem[] = [];
  private selectedId = 0;
  private countLabel: Node | null = null;

  constructor(private readonly host: BagHost) {
    this.node = uiNode("BagPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    place(createLabel("背包", 40, { color: TITLE }), this.body, 0, 470);
    this.countLabel = place(createLabel("读取背包…", 20, { color: MUTED, width: 640 }), this.body, 0, 418);
    this.rowsHost = place(uiNode("rows-host"), this.body, 0, 0);
    this.detailHost = place(uiNode("detail-host"), this.body, 0, 0);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -430);
    GameLog.shared.info("Bag", "open");
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
      const view = await this.host.list();
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      if (!view.ok) {
        this.noteError(errorText(view.code ?? ErrorCode.UNKNOWN_CMD));
        return;
      }
      this.toldError = false;
      const listed = mockBagItems(view.items || []);
      this.items = listed !== null ? listed : view.items || [];
      this.keepSelection();
      this.render();
    } catch (err) {
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      this.noteError(messageOf(err));
    }
  }

  private render(): void {
    const count = this.items.length;
    this.write(this.countLabel, count === 0 ? emptyBagToast() : count + " 种道具 · 点一项再使用");
    this.renderRows();
    this.renderDetail();
  }

  private renderRows(): void {
    const old = this.rowsHost.getChildByName("rows");
    if (old) {
      old.parent = null;
      if (old.isValid) old.destroy();
    }
    const rows = uiNode("rows");
    rows.parent = this.rowsHost;
    const top = 350;
    const step = 52;
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const selected = item.id === this.selectedId;
      const button = createButton(
        (selected ? "已选 " : "") + bagRowText(item),
        () => this.select(item.id),
        640,
        46,
        selected ? SELECT_FILL : ROW_FILL,
        20
      );
      place(button, rows, 0, top - i * step);
      mountItemIcon(button, bagIconFor(item.id), -290, 0);
    }
  }

  private renderDetail(): void {
    const old = this.detailHost.getChildByName("detail");
    if (old) {
      old.parent = null;
      if (old.isValid) old.destroy();
    }
    const detail = uiNode("detail");
    detail.parent = this.detailHost;
    const item = this.selectedItem();
    const anchor = this.detailAnchor();
    if (!item) {
      place(createLabel(emptyBagToast(), 22, { color: MUTED, width: 640 }), detail, 0, anchor);
      place(
        createButton(useButtonText(false), () => this.toastEmpty(), 420, 56, LOCKED_FILL),
        detail,
        0,
        anchor - 70
      );
      return;
    }
    place(createRect("card", 640, 150, new Color(16, 28, 48, 255)), detail, 0, anchor - 20);
    place(createLabel(item.name + " ×" + item.count, 26, { color: TITLE, width: 600 }), detail, 0, anchor + 16);
    place(createLabel(item.desc, 18, { color: BODY, width: 600, height: 48 }), detail, 0, anchor - 28);
    place(
      createButton(
        useButtonText(item.usable),
        () => void this.useSelected(),
        420,
        56,
        item.usable ? USE_FILL : LOCKED_FILL
      ),
      detail,
      0,
      anchor - 130
    );
  }

  private select(id: number): void {
    if (this.disposed || this.selectedId === id) return;
    GameLog.shared.info("Bag", "select " + id);
    this.selectedId = id;
    this.render();
  }

  private async useSelected(): Promise<void> {
    if (this.busy || this.disposed) return;
    const item = this.selectedItem();
    if (!item) {
      this.toastEmpty();
      return;
    }
    this.busy = true;
    GameLog.shared.info("Bag", "use " + item.id);
    try {
      const resp = await this.host.use(item.id, 1);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = bagFailToast(resp);
        GameLog.shared.warn("Bag", text);
        this.host.showToast(text);
        await this.refresh();
        return;
      }
      applyBagUse(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = bagUseToast(resp);
      GameLog.shared.info("Bag", text + " gold " + resp.gold);
      this.host.showToast(text);
      this.selectedId = item.id;
      await this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Bag", text);
      this.host.showToast(text.length > 0 ? text : errorText(ErrorCode.UNKNOWN_CMD));
    } finally {
      this.busy = false;
    }
  }

  private toastEmpty(): void {
    GameLog.shared.info("Bag", "empty");
    this.host.showToast(emptyBagToast());
  }

  private selectedItem(): BagItem | null {
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].id === this.selectedId) return this.items[i];
    }
    return null;
  }

  private keepSelection(): void {
    if (this.selectedItem()) return;
    this.selectedId = this.items.length > 0 ? this.items[0].id : 0;
  }

  /** 列表短时详情停在下半屏，列表长时紧跟最后一行，避免盖住格子。 */
  private detailAnchor(): number {
    const step = 52;
    const top = 350;
    const last = this.items.length <= 0 ? top : top - (this.items.length - 1) * step;
    const below = last - 90;
    const parked = below < -40 ? below : -40;
    return parked < -210 ? -210 : parked;
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Bag", text);
    this.host.showToast(text);
    this.write(this.countLabel, "暂时无法读取背包");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}
