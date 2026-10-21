/**
 * 真服进行中活动只读页。展示 s2c 20101 的 promotions（repeated PbPromotionData）。
 * 行上写 id、start_time、end_time、clear_time、turns。没有的数不写成 0。
 * 出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。
 * 无领奖入口。
 * 不发各活动领奖写号（20018、20013、20004、20010，分散在各 Promotion*Handler）。
 * 同文件 20102 非空体勿挂。不做 20011。
 * 51001 已有，勿重复。5001 已有，勿重复。3101、3099 勿再发。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 3101 分开发，勿合并。本刀不重复拉 3101，也不重复拉 3099。不写顶栏。
 * 页上写明 promotionControlService.getAllWillRun() 组列表。纯读。无扣费，无领奖，不写养成。
 * 这一帧只在 3101 之后发一次。无 page。空帧 04000000854e0000。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireRunningPromotionHead,
  formatWireRunningPromotionLine,
  WIRE_RUNNING_PROMOTION_FIELD_NOTE,
  WIRE_RUNNING_PROMOTION_READONLY_NOTE,
  WIRE_RUNNING_PROMOTION_READONLY_TITLE,
  WIRE_RUNNING_PROMOTION_SIDE_EFFECT,
  WIRE_RUNNING_PROMOTION_UNSYNCED_TOAST,
} from "../net/protocol/wireRunningPromotion";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(48, 32, 28, 255);
const TITLE = new Color(236, 214, 186, 255);
const MUTED = new Color(196, 176, 156, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireRunningPromotionHost {
  alive(): boolean;
  close(): void;
}

export interface WireRunningPromotionPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireRunningPromotionPage(host: WireRunningPromotionHost): WireRunningPromotionPage {
  return new WireRunningPromotionController(host);
}

class WireRunningPromotionController implements WireRunningPromotionPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireRunningPromotionHost) {
    this.node = uiNode("WireRunningPromotionPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.runningPromotion;
    GameLog.shared.info("RunningPromotion", "wire open " + (snap ? "promotions=" + snap.rows.length : "unsynced"));
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
    place(createLabel(WIRE_RUNNING_PROMOTION_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_RUNNING_PROMOTION_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 210 }), this.body, 0, 400);
    place(createLabel(WIRE_RUNNING_PROMOTION_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 160 }), this.body, 0, 210);
    place(createLabel(WIRE_RUNNING_PROMOTION_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 80 }), this.body, 0, 90);
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
    const snap = WireSession.runningPromotion;
    if (!snap) {
      place(createLabel(WIRE_RUNNING_PROMOTION_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 20);
      return;
    }
    place(createLabel(formatWireRunningPromotionHead(snap), 20, { color: TITLE, width: 640, height: 72 }), rows, 0, 20);
    const visible = Math.min(snap.rows.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireRunningPromotionLine(snap.rows[i]), 18, { color: TITLE, width: 640, height: 36, align: "left" }),
        rows,
        0,
        -50 - i * 40
      );
    }
    if (snap.rows.length > visible) {
      place(
        createLabel("还有 " + (snap.rows.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        -50 - visible * 40
      );
    }
  }
}
