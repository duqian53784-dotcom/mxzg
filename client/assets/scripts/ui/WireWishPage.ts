/**
 * 真服许愿池只读页。展示 s2c 27001 的 type、refresh_times、格子 position / times / item、
 * lucky_value、lucky_reward_id、refresh_time。
 * item 子字段对不上名字时写字段号。没有刷新、抽奖、领奖按钮。不发 27002、27003、27004。不写顶栏。
 * 页上写明可能懒建或跨日写库，无扣费。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireWishHead,
  formatWireWishSlot,
  WIRE_WISH_EMPTY,
  WIRE_WISH_FIELD_NOTE,
  WIRE_WISH_READONLY_NOTE,
  WIRE_WISH_READONLY_TITLE,
  WIRE_WISH_SIDE_EFFECT,
  WIRE_WISH_UNSYNCED_TOAST,
} from "../net/protocol/wireWish";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 22, 12, 255);
const TITLE = new Color(255, 214, 150, 255);
const MUTED = new Color(214, 196, 170, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_LINES = 8;

export interface WireWishHost {
  alive(): boolean;
  close(): void;
}

export interface WireWishPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireWishPage(host: WireWishHost): WireWishPage {
  return new WireWishController(host);
}

class WireWishController implements WireWishPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireWishHost) {
    this.node = uiNode("WireWishPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.wish;
    GameLog.shared.info("Wish", "wire open " + (snap ? snap.pools.length : "unsynced"));
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
    place(createLabel(WIRE_WISH_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 560);
    place(createLabel(WIRE_WISH_SIDE_EFFECT, 22, { color: TITLE, width: 640 }), this.body, 0, 510);
    place(createLabel(WIRE_WISH_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 48 }), this.body, 0, 460);
    place(createLabel(WIRE_WISH_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 48 }), this.body, 0, 400);
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
    const snap = WireSession.wish;
    if (!snap) {
      place(createLabel(WIRE_WISH_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 320);
      return;
    }
    let y = 320;
    let lines = 0;
    if (snap.marks.length > 0) {
      const parts: string[] = [];
      for (let i = 0; i < snap.marks.length; i++) parts.push("字段" + snap.marks[i].field + "=" + snap.marks[i].text);
      place(createLabel(parts.join(" / "), 18, { color: MUTED, width: 640 }), rows, 0, y);
      y -= 28;
    }
    if (snap.pools.length === 0) {
      place(createLabel(WIRE_WISH_EMPTY, 28, { color: TITLE, width: 640 }), rows, 0, y);
      return;
    }
    for (let p = 0; p < snap.pools.length; p++) {
      const pool = snap.pools[p];
      place(createLabel(formatWireWishHead(pool), 18, { color: TITLE, width: 640, align: "left" }), rows, 0, y);
      y -= 30;
      const room = VISIBLE_LINES - lines;
      const visible = Math.min(pool.slots.length, room);
      for (let i = 0; i < visible; i++) {
        place(
          createLabel(formatWireWishSlot(pool.slots[i]), 18, { color: TITLE, width: 640, align: "left" }),
          rows,
          0,
          y
        );
        y -= 28;
        lines += 1;
      }
      if (pool.slots.length > visible) {
        place(
          createLabel("还有 " + (pool.slots.length - visible) + " 格", 18, { color: MUTED, width: 640 }),
          rows,
          0,
          y
        );
        y -= 28;
      }
      if (lines >= VISIBLE_LINES && p < snap.pools.length - 1) {
        place(
          createLabel("还有 " + (snap.pools.length - p - 1) + " 个池", 18, { color: MUTED, width: 640 }),
          rows,
          0,
          y
        );
        return;
      }
    }
  }
}
