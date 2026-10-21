/**
 * 真服头像框数据只读页。展示 s2c 32001 的 repeated PSBorderUnit units（id、active_state）。
 * 没有的数不写成 0。出现的 0 仍写 0。
 * 无激活、切换入口。不发 32002。不发 32003。32003 是服侧推送，勿当拉包。
 * 不做 4402。不做 20011。29001 有 page，硬禁。不写顶栏。
 * 页上写明轻懒建免费框可接受。当前框过期时服侧可能写 role.borderId 回落并另推 32003。客户端不发。
 * 这一帧只在 34001 之后发一次。无 page。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireBorderHead,
  formatWireBorderLine,
  WIRE_BORDER_FIELD_NOTE,
  WIRE_BORDER_READONLY_NOTE,
  WIRE_BORDER_READONLY_TITLE,
  WIRE_BORDER_SIDE_EFFECT,
  WIRE_BORDER_UNSYNCED_TOAST,
} from "../net/protocol/wireBorder";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 28, 22, 255);
const TITLE = new Color(232, 210, 176, 255);
const MUTED = new Color(204, 186, 160, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireBorderHost {
  alive(): boolean;
  close(): void;
}

export interface WireBorderPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireBorderPage(host: WireBorderHost): WireBorderPage {
  return new WireBorderController(host);
}

class WireBorderController implements WireBorderPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireBorderHost) {
    this.node = uiNode("WireBorderPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.border;
    GameLog.shared.info("Border", "wire open " + (snap ? "units=" + snap.units.length : "unsynced"));
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
    place(createLabel(WIRE_BORDER_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_BORDER_SIDE_EFFECT, 20, { color: TITLE, width: 640, height: 150 }), this.body, 0, 440);
    place(createLabel(WIRE_BORDER_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 120 }), this.body, 0, 300);
    place(createLabel(WIRE_BORDER_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 190);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -540);
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
    const snap = WireSession.border;
    if (!snap) {
      place(createLabel(WIRE_BORDER_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 120);
      return;
    }
    place(createLabel(formatWireBorderHead(snap), 20, { color: TITLE, width: 640, height: 96 }), rows, 0, 110);
    const visible = Math.min(snap.units.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireBorderLine(snap.units[i]), 20, { color: TITLE, width: 640, height: 40, align: "left" }),
        rows,
        0,
        40 - i * 40
      );
    }
    if (snap.units.length > visible) {
      place(
        createLabel("还有 " + (snap.units.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        40 - visible * 40
      );
    }
  }
}
