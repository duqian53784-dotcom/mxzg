/**
 * 真服世界等级只读页。展示 s2c 51001 的 level。
 * 没有写入按钮。本模块无写操作号。不做 20101。不写顶栏。
 * 页上写明无写库，并且这一帧只在 74100 之后发一次。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireWorldLine,
  WIRE_WORLD_FIELD_NOTE,
  WIRE_WORLD_READONLY_NOTE,
  WIRE_WORLD_READONLY_TITLE,
  WIRE_WORLD_SIDE_EFFECT,
  WIRE_WORLD_UNSYNCED_TOAST,
} from "../net/protocol/wireWorld";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(16, 24, 32, 255);
const TITLE = new Color(255, 214, 160, 255);
const MUTED = new Color(214, 196, 170, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface WireWorldHost {
  alive(): boolean;
  close(): void;
}

export interface WireWorldPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireWorldPage(host: WireWorldHost): WireWorldPage {
  return new WireWorldController(host);
}

class WireWorldController implements WireWorldPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireWorldHost) {
    this.node = uiNode("WireWorldPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.world;
    GameLog.shared.info(
      "World",
      "wire open " + (snap ? "level=" + (snap.level === null ? "无" : snap.level) : "unsynced")
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
    place(createLabel(WIRE_WORLD_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 520);
    place(createLabel(WIRE_WORLD_SIDE_EFFECT, 22, { color: TITLE, width: 640 }), this.body, 0, 460);
    place(createLabel(WIRE_WORLD_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 390);
    place(createLabel(WIRE_WORLD_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 48 }), this.body, 0, 310);
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
    const snap = WireSession.world;
    if (!snap) {
      place(createLabel(WIRE_WORLD_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 200);
      return;
    }
    place(createLabel(formatWireWorldLine(snap), 26, { color: TITLE, width: 640 }), rows, 0, 200);
  }
}
