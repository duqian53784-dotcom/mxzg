/**
 * 真服英雄图鉴只读页。展示 s2c 4013 的 list：hero_type、star。
 * 没有领奖按钮。不把 4013 当领奖再发写号。不发 4014。不写顶栏。
 * 页上写明无档时服端可能懒建空记录。英雄列表仍是 4001。英雄宝石仍是 4101。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireIllustratHead,
  formatWireIllustratLine,
  WIRE_ILLUSTRAT_FIELD_NOTE,
  WIRE_ILLUSTRAT_READONLY_NOTE,
  WIRE_ILLUSTRAT_READONLY_TITLE,
  WIRE_ILLUSTRAT_SIDE_EFFECT,
  WIRE_ILLUSTRAT_UNSYNCED_TOAST,
} from "../net/protocol/wireIllustrat";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(28, 22, 16, 255);
const TITLE = new Color(255, 214, 160, 255);
const MUTED = new Color(214, 196, 170, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireIllustratHost {
  alive(): boolean;
  close(): void;
}

export interface WireIllustratPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireIllustratPage(host: WireIllustratHost): WireIllustratPage {
  return new WireIllustratController(host);
}

class WireIllustratController implements WireIllustratPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireIllustratHost) {
    this.node = uiNode("WireIllustratPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.illustrat;
    GameLog.shared.info("Illustrat", "wire open " + (snap ? snap.rows.length : "unsynced"));
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
    place(createLabel(WIRE_ILLUSTRAT_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 520);
    place(createLabel(WIRE_ILLUSTRAT_SIDE_EFFECT, 22, { color: TITLE, width: 640 }), this.body, 0, 460);
    place(createLabel(WIRE_ILLUSTRAT_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 390);
    place(createLabel(WIRE_ILLUSTRAT_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 48 }), this.body, 0, 310);
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
    const snap = WireSession.illustrat;
    if (!snap) {
      place(createLabel(WIRE_ILLUSTRAT_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 220);
      return;
    }
    place(createLabel(formatWireIllustratHead(snap), 24, { color: TITLE, width: 640 }), rows, 0, 220);
    const visible = Math.min(snap.rows.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireIllustratLine(snap.rows[i]), 22, { color: TITLE, width: 640, align: "left" }),
        rows,
        0,
        170 - i * 36
      );
    }
    if (snap.rows.length > visible) {
      place(
        createLabel("还有 " + (snap.rows.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        170 - visible * 36
      );
    }
  }
}
