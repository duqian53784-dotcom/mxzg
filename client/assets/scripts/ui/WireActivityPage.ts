/**
 * 真服点金只读页。按 GResBuyGoldLog 展示 s2c 17000 的 status、time、idx、num。
 * 不点金，不写顶栏。不从七日登录进入。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireActivityLine,
  formatWireActivityStamp,
  WIRE_ACTIVITY_EMPTY,
  WIRE_ACTIVITY_FIELD_NOTE,
  WIRE_ACTIVITY_READONLY_NOTE,
  WIRE_ACTIVITY_READONLY_TITLE,
  WIRE_ACTIVITY_UNSYNCED_TOAST,
} from "../net/protocol/wireActivity";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 10;

export interface WireActivityHost {
  alive(): boolean;
  close(): void;
}

export interface WireActivityPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireActivityPage(host: WireActivityHost): WireActivityPage {
  return new WireActivityController(host);
}

class WireActivityController implements WireActivityPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireActivityHost) {
    this.node = uiNode("WireActivityPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.activity;
    GameLog.shared.info("BuyGold", "wire open " + (snap ? snap.rows.length : "unsynced"));
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
    place(createLabel(WIRE_ACTIVITY_READONLY_TITLE, 40, { color: TITLE }), this.body, 0, 470);
    place(createLabel(WIRE_ACTIVITY_READONLY_NOTE, 22, { color: MUTED, width: 640 }), this.body, 0, 420);
    place(createLabel(WIRE_ACTIVITY_FIELD_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 380);
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
    const snap = WireSession.activity;
    if (!snap) {
      place(createLabel(WIRE_ACTIVITY_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 280);
      return;
    }
    const stamp = formatWireActivityStamp(snap);
    let top = 320;
    if (stamp) {
      place(createLabel(stamp, 22, { color: MUTED, width: 640 }), rows, 0, top);
      top -= 44;
    }
    if (snap.rows.length === 0) {
      place(createLabel(WIRE_ACTIVITY_EMPTY, 28, { color: TITLE, width: 640 }), rows, 0, top);
      return;
    }
    const visible = Math.min(snap.rows.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireActivityLine(snap.rows[i]), 22, {
          color: TITLE,
          width: 640,
          align: "left",
        }),
        rows,
        0,
        top - i * 44
      );
    }
    if (snap.rows.length > visible) {
      place(
        createLabel("还有 " + (snap.rows.length - visible) + " 条", 20, { color: MUTED, width: 640 }),
        rows,
        0,
        top - visible * 44
      );
    }
  }
}
