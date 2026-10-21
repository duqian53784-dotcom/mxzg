/**
 * 真服浮空岛时间只读页。展示 s2c 73001 的 next_time、stage。
 * 没有挑战、买次数按钮。不发 73002、73003、73004。不做 20011。不写顶栏。
 * 页上写明本号无写库，并且这一帧只在 70001 之后发一次。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireIslandsLine,
  WIRE_ISLANDS_FIELD_NOTE,
  WIRE_ISLANDS_READONLY_NOTE,
  WIRE_ISLANDS_READONLY_TITLE,
  WIRE_ISLANDS_SIDE_EFFECT,
  WIRE_ISLANDS_UNSYNCED_TOAST,
} from "../net/protocol/wireFloatingIslands";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(16, 28, 40, 255);
const TITLE = new Color(168, 214, 236, 255);
const MUTED = new Color(186, 206, 214, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface WireIslandsHost {
  alive(): boolean;
  close(): void;
}

export interface WireIslandsPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireIslandsPage(host: WireIslandsHost): WireIslandsPage {
  return new WireIslandsController(host);
}

class WireIslandsController implements WireIslandsPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireIslandsHost) {
    this.node = uiNode("WireFloatingIslandsPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.islands;
    GameLog.shared.info(
      "Islands",
      "wire open " +
        (snap
          ? "next_time=" + (snap.nextTime === null ? "无" : snap.nextTime) + " stage=" + (snap.stage === null ? "无" : snap.stage)
          : "unsynced")
    );
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
    place(createLabel(WIRE_ISLANDS_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 520);
    place(createLabel(WIRE_ISLANDS_SIDE_EFFECT, 22, { color: TITLE, width: 640, height: 72 }), this.body, 0, 450);
    place(createLabel(WIRE_ISLANDS_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 120 }), this.body, 0, 350);
    place(createLabel(WIRE_ISLANDS_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 48 }), this.body, 0, 250);
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
    const snap = WireSession.islands;
    if (!snap) {
      place(createLabel(WIRE_ISLANDS_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 160);
      return;
    }
    place(createLabel(formatWireIslandsLine(snap), 26, { color: TITLE, width: 640, height: 72 }), rows, 0, 160);
  }
}
