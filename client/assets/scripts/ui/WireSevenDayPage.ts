/**
 * 真服七日登录只读页。展示 s2c 22000 的 end_time、cur_day 和每日 idx / status。
 * status 0 写未领，1 写已领。没有领取按钮。不发 22001，不写顶栏。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireSevenHead,
  formatWireSevenLine,
  WIRE_SEVEN_EMPTY,
  WIRE_SEVEN_FIELD_NOTE,
  WIRE_SEVEN_PUSH_NOTE,
  WIRE_SEVEN_READONLY_NOTE,
  WIRE_SEVEN_READONLY_TITLE,
  WIRE_SEVEN_SIDE_EFFECT,
  WIRE_SEVEN_UNSYNCED_TOAST,
} from "../net/protocol/wireSevenDay";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 14, 24, 255);
const TITLE = new Color(255, 214, 150, 255);
const MUTED = new Color(214, 186, 186, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 7;

export interface WireSevenDayHost {
  alive(): boolean;
  close(): void;
}

export interface WireSevenDayPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireSevenDayPage(host: WireSevenDayHost): WireSevenDayPage {
  return new WireSevenDayController(host);
}

class WireSevenDayController implements WireSevenDayPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireSevenDayHost) {
    this.node = uiNode("WireSevenDayPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.sevenDay;
    GameLog.shared.info("SevenDay", "wire open " + (snap ? snap.rows.length : "unsynced"));
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
    place(createLabel(WIRE_SEVEN_READONLY_TITLE, 36, { color: TITLE }), this.body, 0, 560);
    place(createLabel(WIRE_SEVEN_SIDE_EFFECT, 22, { color: TITLE, width: 640 }), this.body, 0, 510);
    place(createLabel(WIRE_SEVEN_PUSH_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 476);
    place(createLabel(WIRE_SEVEN_READONLY_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 442);
    place(createLabel(WIRE_SEVEN_FIELD_NOTE, 18, { color: MUTED, width: 640 }), this.body, 0, 400);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -560);
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
    const snap = WireSession.sevenDay;
    if (!snap) {
      place(createLabel(WIRE_SEVEN_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 340);
      return;
    }
    place(createLabel(formatWireSevenHead(snap), 22, { color: TITLE, width: 640 }), rows, 0, 340);
    if (snap.rows.length === 0) {
      place(createLabel(WIRE_SEVEN_EMPTY, 28, { color: TITLE, width: 640 }), rows, 0, 290);
      return;
    }
    const visible = Math.min(snap.rows.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireSevenLine(snap.rows[i]), 22, { color: TITLE, width: 640, align: "left" }),
        rows,
        0,
        290 - i * 36
      );
    }
    if (snap.rows.length > visible) {
      place(
        createLabel("还有 " + (snap.rows.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        290 - visible * 36
      );
    }
  }
}
