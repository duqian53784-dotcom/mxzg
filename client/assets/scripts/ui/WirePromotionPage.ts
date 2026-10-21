/**
 * 真服基金列表只读页。展示 s2c 20001 的 is_buy_foundation 和 foundation_reward_record。
 * 没有领奖按钮。不发 20018。不发 20004、20010。不做 3007。不写顶栏。
 * 页上写明只读，并且这一帧只在 51001 之后发一次。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWirePromotionHead,
  formatWirePromotionLine,
  WIRE_PROMOTION_FIELD_NOTE,
  WIRE_PROMOTION_READONLY_NOTE,
  WIRE_PROMOTION_READONLY_TITLE,
  WIRE_PROMOTION_SIDE_EFFECT,
  WIRE_PROMOTION_UNSYNCED_TOAST,
} from "../net/protocol/wirePromotion";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(32, 22, 18, 255);
const TITLE = new Color(255, 214, 160, 255);
const MUTED = new Color(214, 196, 170, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WirePromotionHost {
  alive(): boolean;
  close(): void;
}

export interface WirePromotionPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWirePromotionPage(host: WirePromotionHost): WirePromotionPage {
  return new WirePromotionController(host);
}

class WirePromotionController implements WirePromotionPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WirePromotionHost) {
    this.node = uiNode("WirePromotionPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.promotion;
    GameLog.shared.info(
      "Promotion",
      "wire open " + (snap ? "is_buy_foundation=" + (snap.isBuyFoundation === null ? "无" : snap.isBuyFoundation) : "unsynced")
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
    place(createLabel(WIRE_PROMOTION_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 520);
    place(createLabel(WIRE_PROMOTION_SIDE_EFFECT, 22, { color: TITLE, width: 640, height: 72 }), this.body, 0, 450);
    place(createLabel(WIRE_PROMOTION_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 370);
    place(createLabel(WIRE_PROMOTION_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 48 }), this.body, 0, 290);
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
    const snap = WireSession.promotion;
    if (!snap) {
      place(createLabel(WIRE_PROMOTION_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 200);
      return;
    }
    place(createLabel(formatWirePromotionHead(snap), 24, { color: TITLE, width: 640 }), rows, 0, 200);
    const visible = Math.min(snap.records.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWirePromotionLine(snap.records[i]), 22, { color: TITLE, width: 640, align: "left" }),
        rows,
        0,
        150 - i * 36
      );
    }
    if (snap.records.length > visible) {
      place(
        createLabel("还有 " + (snap.records.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        150 - visible * 36
      );
    }
  }
}
