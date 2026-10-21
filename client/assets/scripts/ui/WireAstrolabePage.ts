/**
 * 真服星盘数据只读页。展示 s2c 68001 的 maxStar、active（PSMapData 的 key、value）、activeElem、activeAstrolabe。
 * 没有激活元素、点亮星盘、重置、激活星盘按钮。不发 68002、68003、68004、68006。
 * 68005 是更新星数常量，勿发、勿当拉包。不做 20011。不写顶栏。
 * 页上写明轻懒建：首次 load 可能 astrolabeDao.add 空行。无扣费，无领奖，无日刷写库。
 * 这一帧只在 74300 之后发一次。无 page。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireAstrolabeHead,
  formatWireAstrolabeLine,
  WIRE_ASTROLABE_FIELD_NOTE,
  WIRE_ASTROLABE_READONLY_NOTE,
  WIRE_ASTROLABE_READONLY_TITLE,
  WIRE_ASTROLABE_SIDE_EFFECT,
  WIRE_ASTROLABE_UNSYNCED_TOAST,
} from "../net/protocol/wireAstrolabe";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(28, 24, 48, 255);
const TITLE = new Color(220, 196, 150, 255);
const MUTED = new Color(196, 186, 214, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireAstrolabeHost {
  alive(): boolean;
  close(): void;
}

export interface WireAstrolabePage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireAstrolabePage(host: WireAstrolabeHost): WireAstrolabePage {
  return new WireAstrolabeController(host);
}

class WireAstrolabeController implements WireAstrolabePage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireAstrolabeHost) {
    this.node = uiNode("WireAstrolabePage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.astrolabe;
    GameLog.shared.info("Astrolabe", "wire open " + (snap ? "active=" + snap.active.length : "unsynced"));
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
    place(createLabel(WIRE_ASTROLABE_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_ASTROLABE_SIDE_EFFECT, 20, { color: TITLE, width: 640, height: 120 }), this.body, 0, 450);
    place(createLabel(WIRE_ASTROLABE_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 110 }), this.body, 0, 330);
    place(createLabel(WIRE_ASTROLABE_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 230);
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
    const snap = WireSession.astrolabe;
    if (!snap) {
      place(createLabel(WIRE_ASTROLABE_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 160);
      return;
    }
    place(createLabel(formatWireAstrolabeHead(snap), 20, { color: TITLE, width: 640, height: 96 }), rows, 0, 150);
    const visible = Math.min(snap.active.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireAstrolabeLine(snap.active[i]), 20, { color: TITLE, width: 640, height: 40, align: "left" }),
        rows,
        0,
        80 - i * 40
      );
    }
    if (snap.active.length > visible) {
      place(
        createLabel("还有 " + (snap.active.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        80 - visible * 40
      );
    }
  }
}
