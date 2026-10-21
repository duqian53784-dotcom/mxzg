/**
 * 真服英雄宝石只读页。展示 s2c 4101 的 jewel_list：hero_id，以及每颗的 jewel_id、place、jewel_type。
 * 没有替换、卸下、一键穿、一键卸、合成按钮。不发 4102–4107。不写顶栏。
 * 页上写明无写库、无 page、空体安全。英雄列表仍是 4001。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireJewelHead,
  formatWireJewelRows,
  WIRE_JEWEL_FIELD_NOTE,
  WIRE_JEWEL_READONLY_NOTE,
  WIRE_JEWEL_READONLY_TITLE,
  WIRE_JEWEL_SIDE_EFFECT,
  WIRE_JEWEL_UNSYNCED_TOAST,
} from "../net/protocol/wireJewel";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(10, 24, 32, 255);
const TITLE = new Color(186, 236, 214, 255);
const MUTED = new Color(190, 214, 206, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireJewelHost {
  alive(): boolean;
  close(): void;
}

export interface WireJewelPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireJewelPage(host: WireJewelHost): WireJewelPage {
  return new WireJewelController(host);
}

class WireJewelController implements WireJewelPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireJewelHost) {
    this.node = uiNode("WireJewelPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.jewel;
    GameLog.shared.info("Jewel", "wire open " + (snap ? snap.heroes.length : "unsynced"));
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
    place(createLabel(WIRE_JEWEL_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 520);
    place(createLabel(WIRE_JEWEL_SIDE_EFFECT, 22, { color: TITLE, width: 640 }), this.body, 0, 460);
    place(createLabel(WIRE_JEWEL_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 390);
    place(createLabel(WIRE_JEWEL_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 48 }), this.body, 0, 310);
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
    const snap = WireSession.jewel;
    if (!snap) {
      place(createLabel(WIRE_JEWEL_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 220);
      return;
    }
    place(createLabel(formatWireJewelHead(snap), 24, { color: TITLE, width: 640 }), rows, 0, 220);
    const lines = formatWireJewelRows(snap);
    const visible = Math.min(lines.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(createLabel(lines[i], 22, { color: TITLE, width: 640, align: "left" }), rows, 0, 170 - i * 36);
    }
    if (lines.length > visible) {
      place(
        createLabel("还有 " + (lines.length - visible) + " 行", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        170 - visible * 36
      );
    }
  }
}
