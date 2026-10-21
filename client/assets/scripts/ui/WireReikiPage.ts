/**
 * 真服灵器数据只读页。展示 s2c 70001 的 list：hero_id、sys_id、reiki_equip_id。
 * 没有激活、穿戴、卸下、转换、合成按钮。不发 70002、70003、70004、70005、70006。
 * 70007、70008 是推送，不当拉包请求。不做 20011。不写顶栏。
 * 页上写明只读，并且这一帧只在 20012 之后发一次。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireReikiHead,
  formatWireReikiLine,
  WIRE_REIKI_FIELD_NOTE,
  WIRE_REIKI_READONLY_NOTE,
  WIRE_REIKI_READONLY_TITLE,
  WIRE_REIKI_SIDE_EFFECT,
  WIRE_REIKI_UNSYNCED_TOAST,
} from "../net/protocol/wireReiki";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(18, 32, 34, 255);
const TITLE = new Color(176, 232, 214, 255);
const MUTED = new Color(196, 214, 206, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireReikiHost {
  alive(): boolean;
  close(): void;
}

export interface WireReikiPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireReikiPage(host: WireReikiHost): WireReikiPage {
  return new WireReikiController(host);
}

class WireReikiController implements WireReikiPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireReikiHost) {
    this.node = uiNode("WireReikiPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.reiki;
    GameLog.shared.info("Reiki", "wire open " + (snap ? "rows=" + snap.rows.length : "unsynced"));
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
    place(createLabel(WIRE_REIKI_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 520);
    place(createLabel(WIRE_REIKI_SIDE_EFFECT, 22, { color: TITLE, width: 640, height: 72 }), this.body, 0, 450);
    place(createLabel(WIRE_REIKI_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 96 }), this.body, 0, 360);
    place(createLabel(WIRE_REIKI_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 270);
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
    const snap = WireSession.reiki;
    if (!snap) {
      place(createLabel(WIRE_REIKI_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 200);
      return;
    }
    place(createLabel(formatWireReikiHead(snap), 22, { color: TITLE, width: 640, height: 72 }), rows, 0, 180);
    const visible = Math.min(snap.rows.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireReikiLine(snap.rows[i]), 22, { color: TITLE, width: 640, align: "left" }),
        rows,
        0,
        120 - i * 36
      );
    }
    if (snap.rows.length > visible) {
      place(
        createLabel("还有 " + (snap.rows.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        120 - visible * 36
      );
    }
  }
}
