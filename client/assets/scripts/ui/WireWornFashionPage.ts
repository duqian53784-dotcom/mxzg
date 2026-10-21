/**
 * 真服穿戴皮肤英雄列表只读页。展示 s2c 4401 的 repeated PSHeroFashion list
 * （hero_id、fashion_id）。
 * 没有的数不写成 0。出现的 0 仍写 0。
 * 无激活、替换、升级入口。不发 4403。不发 4404。不发 4405。4406 无实现，勿发。
 * 与 4402 分刀，勿合并。本刀不重复拉 4402。4201 另只读接在其后，勿合并。不做 20011。
 * 4601 有 page，硬禁。29001 有 page，硬禁。不写顶栏。
 * 页上写明轻懒建 HeroFashion 可接受。过期限时皮清理，并可能卸英雄 fashionId。只读展示。无扣费，无领奖，无邮件。
 * 这一帧只在 4402 之后发一次。无 page。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireWornFashionHead,
  formatWireWornFashionLine,
  WIRE_WORN_FASHION_FIELD_NOTE,
  WIRE_WORN_FASHION_READONLY_NOTE,
  WIRE_WORN_FASHION_READONLY_TITLE,
  WIRE_WORN_FASHION_SIDE_EFFECT,
  WIRE_WORN_FASHION_UNSYNCED_TOAST,
} from "../net/protocol/wireWornFashion";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(32, 28, 40, 255);
const TITLE = new Color(220, 206, 232, 255);
const MUTED = new Color(186, 176, 204, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 5;

export interface WireWornFashionHost {
  alive(): boolean;
  close(): void;
}

export interface WireWornFashionPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireWornFashionPage(host: WireWornFashionHost): WireWornFashionPage {
  return new WireWornFashionController(host);
}

class WireWornFashionController implements WireWornFashionPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireWornFashionHost) {
    this.node = uiNode("WireWornFashionPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.wornFashion;
    GameLog.shared.info("WornFashion", "wire open " + (snap ? "list=" + snap.list.length : "unsynced"));
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
    place(createLabel(WIRE_WORN_FASHION_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_WORN_FASHION_SIDE_EFFECT, 20, { color: TITLE, width: 640, height: 150 }), this.body, 0, 440);
    place(createLabel(WIRE_WORN_FASHION_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 160 }), this.body, 0, 270);
    place(createLabel(WIRE_WORN_FASHION_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 150);
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
    const snap = WireSession.wornFashion;
    if (!snap) {
      place(createLabel(WIRE_WORN_FASHION_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 80);
      return;
    }
    place(createLabel(formatWireWornFashionHead(snap), 20, { color: TITLE, width: 640, height: 96 }), rows, 0, 70);
    const visible = Math.min(snap.list.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireWornFashionLine(snap.list[i]), 18, { color: TITLE, width: 660, height: 48, align: "left" }),
        rows,
        0,
        -10 - i * 52
      );
    }
    if (snap.list.length > visible) {
      place(
        createLabel("还有 " + (snap.list.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        -10 - visible * 52
      );
    }
  }
}
