/**
 * 真服图腾信息只读页。展示 s2c 74300 的 list：t_id、sys_id、hero_id、level、quality。
 * 没有升级、升阶、装备、卸下、更换、重置按钮。不发 74301、74302、74303。
 * 74304 是推送，勿发、勿当拉包。不做 20011。不写顶栏。
 * 页上写明本号无写库，并且这一帧只在 73001 之后发一次。与宠物信息同城养成段。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireTotemsHead,
  formatWireTotemsLine,
  WIRE_TOTEMS_FIELD_NOTE,
  WIRE_TOTEMS_READONLY_NOTE,
  WIRE_TOTEMS_READONLY_TITLE,
  WIRE_TOTEMS_SIDE_EFFECT,
  WIRE_TOTEMS_UNSYNCED_TOAST,
} from "../net/protocol/wireTotems";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 24, 18, 255);
const TITLE = new Color(232, 196, 150, 255);
const MUTED = new Color(210, 190, 168, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireTotemsHost {
  alive(): boolean;
  close(): void;
}

export interface WireTotemsPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireTotemsPage(host: WireTotemsHost): WireTotemsPage {
  return new WireTotemsController(host);
}

class WireTotemsController implements WireTotemsPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireTotemsHost) {
    this.node = uiNode("WireTotemsPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.totems;
    GameLog.shared.info("Totems", "wire open " + (snap ? "rows=" + snap.rows.length : "unsynced"));
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
    place(createLabel(WIRE_TOTEMS_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 520);
    place(createLabel(WIRE_TOTEMS_SIDE_EFFECT, 22, { color: TITLE, width: 640, height: 72 }), this.body, 0, 450);
    place(createLabel(WIRE_TOTEMS_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 96 }), this.body, 0, 360);
    place(createLabel(WIRE_TOTEMS_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 270);
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
    const snap = WireSession.totems;
    if (!snap) {
      place(createLabel(WIRE_TOTEMS_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 200);
      return;
    }
    place(createLabel(formatWireTotemsHead(snap), 22, { color: TITLE, width: 640, height: 72 }), rows, 0, 180);
    const visible = Math.min(snap.rows.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireTotemsLine(snap.rows[i]), 20, { color: TITLE, width: 640, height: 48, align: "left" }),
        rows,
        0,
        120 - i * 48
      );
    }
    if (snap.rows.length > visible) {
      place(
        createLabel("还有 " + (snap.rows.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        120 - visible * 48
      );
    }
  }
}
