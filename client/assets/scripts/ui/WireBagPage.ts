/**
 * 真服背包只读页。只展示 s2c 5001 / 5002 合并后的格子。
 * 不使用，不合成，不写顶栏。Mock 背包页仍是 BagPage。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireBagLine,
  WIRE_BAG_EMPTY,
  WIRE_BAG_READONLY_NOTE,
  WIRE_BAG_READONLY_TITLE,
  WIRE_BAG_UNSYNCED_TOAST,
  wireBagItemName,
} from "../net/protocol/wireBag";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 11;

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
    place(createLabel(WIRE_BAG_READONLY_TITLE, 40, { color: TITLE }), this.body, 0, 470);
    place(createLabel(WIRE_BAG_READONLY_NOTE, 22, { color: MUTED, width: 640 }), this.body, 0, 410);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -460);
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
      place(createLabel(WIRE_BAG_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 280);
      return;
    }
    if (items.length === 0) {
      place(createLabel(WIRE_BAG_EMPTY, 28, { color: TITLE, width: 640 }), rows, 0, 280);
      return;
    }
    const visible = Math.min(items.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      const item = items[i];
      place(
        createLabel(formatWireBagLine(item, wireBagItemName(item)), 22, {
          color: TITLE,
          width: 640,
          align: "left",
        }),
        rows,
        0,
        340 - i * 44
      );
    }
    if (items.length > visible) {
      place(
        createLabel("还有 " + (items.length - visible) + " 件", 20, { color: MUTED, width: 640 }),
        rows,
        0,
        340 - visible * 44
      );
    }
  }
}
