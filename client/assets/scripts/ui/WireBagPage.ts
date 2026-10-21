/**
 * 真服背包只读页。展示 s2c 5001 的 list：item_id、item_type、num。
 * 5002 只在已经同步之后合并数量，本页不发它。
 * 不合成，不开箱，不自选碎片，不分解，不用充值卡。不写顶栏。
 * 进主城的空 c2s 5001 已在 2001 之后发出，打开本页不再发。
 * Mock 背包页仍是 BagPage。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireBagHead,
  formatWireBagLine,
  WIRE_BAG_FIELD_NOTE,
  WIRE_BAG_READONLY_NOTE,
  WIRE_BAG_READONLY_TITLE,
  WIRE_BAG_SIDE_EFFECT,
  WIRE_BAG_UNSYNCED_TOAST,
} from "../net/protocol/wireBag";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireBagHost {
  alive(): boolean;
  close(): void;
}

export interface WireBagPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireBagPage(host: WireBagHost): WireBagPage {
  return new WireBagController(host);
}

class WireBagController implements WireBagPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireBagHost) {
    this.node = uiNode("WireBagPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const items = WireSession.bagItems;
    GameLog.shared.info("Bag", "wire open " + (items ? items.length : "unsynced"));
    this.offSync = WireSession.onSync(() => this.onSync());
  }

  reload(): void {
    if (this.disposed) return;
    this.render();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.offSync) {
      this.offSync();
      this.offSync = null;
    }
  }

  private build(): void {
    place(createLabel(WIRE_BAG_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 520);
    place(createLabel(WIRE_BAG_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 48 }), this.body, 0, 460);
    place(createLabel(WIRE_BAG_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 390);
    place(createLabel(WIRE_BAG_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 48 }), this.body, 0, 310);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -520);
  }

  private onSync(): void {
    if (this.disposed || !this.host.alive()) return;
    this.render();
  }

  private render(): void {
    if (this.disposed) return;
    const old = this.listHost.getChildByName("rows");
    if (old) {
      old.parent = null;
      if (old.isValid) old.destroy();
    }
    const rows = uiNode("rows");
    rows.parent = this.listHost;
    const items = WireSession.bagItems;
    if (!items) {
      place(createLabel(WIRE_BAG_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 220);
      return;
    }
    place(
      createLabel(formatWireBagHead({ items, marks: WireSession.bagMarks }), 24, { color: TITLE, width: 640 }),
      rows,
      0,
      220
    );
    const visible = Math.min(items.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireBagLine(items[i]), 22, { color: TITLE, width: 640, align: "left" }),
        rows,
        0,
        170 - i * 36
      );
    }
    if (items.length > visible) {
      place(
        createLabel("还有 " + (items.length - visible) + " 件", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        170 - visible * 36
      );
    }
  }
}
