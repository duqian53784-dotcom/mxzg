/**
 * 真服激活皮肤列表只读页。展示 s2c 4402 的 repeated PSFashionData list
 * （hero_type、fashion_id、level、status、end_time）。
 * status：0 永久，1 限时。没有的数不写成 0。出现的 0 仍写 0。
 * 无激活、替换、升级入口。不发 4403。不发 4404。不发 4405。4406 无实现，勿发。
 * 不做 4401。不做 20011。29001 有 page，硬禁。不写顶栏。
 * 页上写明轻懒建 HeroFashion 可接受。过期限时皮剔除，并可能把英雄 fashionId 置 0。只读展示。无扣费，无领奖。
 * 这一帧只在 32001 之后发一次。无 page。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireFashionHead,
  formatWireFashionLine,
  WIRE_FASHION_FIELD_NOTE,
  WIRE_FASHION_READONLY_NOTE,
  WIRE_FASHION_READONLY_TITLE,
  WIRE_FASHION_SIDE_EFFECT,
  WIRE_FASHION_UNSYNCED_TOAST,
} from "../net/protocol/wireFashion";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 28, 22, 255);
const TITLE = new Color(232, 210, 176, 255);
const MUTED = new Color(204, 186, 160, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 5;

export interface WireFashionHost {
  alive(): boolean;
  close(): void;
}

export interface WireFashionPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireFashionPage(host: WireFashionHost): WireFashionPage {
  return new WireFashionController(host);
}

class WireFashionController implements WireFashionPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireFashionHost) {
    this.node = uiNode("WireFashionPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.fashion;
    GameLog.shared.info("Fashion", "wire open " + (snap ? "list=" + snap.list.length : "unsynced"));
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
    place(createLabel(WIRE_FASHION_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_FASHION_SIDE_EFFECT, 20, { color: TITLE, width: 640, height: 150 }), this.body, 0, 440);
    place(createLabel(WIRE_FASHION_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 140 }), this.body, 0, 280);
    place(createLabel(WIRE_FASHION_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 160);
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
    const snap = WireSession.fashion;
    if (!snap) {
      place(createLabel(WIRE_FASHION_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 80);
      return;
    }
    place(createLabel(formatWireFashionHead(snap), 20, { color: TITLE, width: 640, height: 96 }), rows, 0, 70);
    const visible = Math.min(snap.list.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireFashionLine(snap.list[i]), 18, { color: TITLE, width: 660, height: 64, align: "left" }),
        rows,
        0,
        -10 - i * 68
      );
    }
    if (snap.list.length > visible) {
      place(
        createLabel("还有 " + (snap.list.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        -10 - visible * 68
      );
    }
  }
}
