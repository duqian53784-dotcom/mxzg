/**
 * 真服先知召唤幸运值只读页。展示 s2c 13044 的 luckys：type、lucky。
 * 没有抽取、置换、确认置换按钮。不发 13041、13042、13043。不写顶栏。
 * 页上写明可能懒建 HeroSummon，跨日可能重置 levelResetTimes。召唤次数仍是 4004。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireProphetHead,
  formatWireProphetLine,
  WIRE_PROPHET_FIELD_NOTE,
  WIRE_PROPHET_READONLY_NOTE,
  WIRE_PROPHET_READONLY_TITLE,
  WIRE_PROPHET_SIDE_EFFECT,
  WIRE_PROPHET_UNSYNCED_TOAST,
} from "../net/protocol/wireProphet";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(22, 16, 40, 255);
const TITLE = new Color(255, 214, 150, 255);
const MUTED = new Color(214, 196, 170, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireProphetHost {
  alive(): boolean;
  close(): void;
}

export interface WireProphetPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireProphetPage(host: WireProphetHost): WireProphetPage {
  return new WireProphetController(host);
}

class WireProphetController implements WireProphetPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireProphetHost) {
    this.node = uiNode("WireProphetPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.prophet;
    GameLog.shared.info("Prophet", "wire open " + (snap ? snap.luckys.length : "unsynced"));
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
    place(createLabel(WIRE_PROPHET_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 520);
    place(createLabel(WIRE_PROPHET_SIDE_EFFECT, 22, { color: TITLE, width: 640 }), this.body, 0, 460);
    place(createLabel(WIRE_PROPHET_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 390);
    place(createLabel(WIRE_PROPHET_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 48 }), this.body, 0, 310);
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
    const snap = WireSession.prophet;
    if (!snap) {
      place(createLabel(WIRE_PROPHET_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 220);
      return;
    }
    place(createLabel(formatWireProphetHead(snap), 24, { color: TITLE, width: 640 }), rows, 0, 220);
    const visible = Math.min(snap.luckys.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireProphetLine(snap.luckys[i]), 22, { color: TITLE, width: 640, align: "left" }),
        rows,
        0,
        170 - i * 36
      );
    }
    if (snap.luckys.length > visible) {
      place(
        createLabel("还有 " + (snap.luckys.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        170 - visible * 36
      );
    }
  }
}
