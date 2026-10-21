/**
 * 真服超值首充只读页。展示 s2c 20012 的 recharge、已领 idx 和 can_reward。
 * 没有领奖按钮。不发 20013。不做 13260。不写顶栏。
 * 页上写明只读，并且这一帧只在 20001 之后发一次。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireFirstHead,
  formatWireFirstLine,
  WIRE_FIRST_FIELD_NOTE,
  WIRE_FIRST_READONLY_NOTE,
  WIRE_FIRST_READONLY_TITLE,
  WIRE_FIRST_SIDE_EFFECT,
  WIRE_FIRST_UNSYNCED_TOAST,
} from "../net/protocol/wireFirstRecharge";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(32, 18, 22, 255);
const TITLE = new Color(255, 214, 160, 255);
const MUTED = new Color(214, 196, 170, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireFirstRechargeHost {
  alive(): boolean;
  close(): void;
}

export interface WireFirstRechargePage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireFirstRechargePage(host: WireFirstRechargeHost): WireFirstRechargePage {
  return new WireFirstRechargeController(host);
}

class WireFirstRechargeController implements WireFirstRechargePage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireFirstRechargeHost) {
    this.node = uiNode("WireFirstRechargePage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.firstRecharge;
    GameLog.shared.info(
      "FirstRecharge",
      "wire open " + (snap ? "recharge=" + (snap.recharge === null ? "无" : snap.recharge) : "unsynced")
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
    place(createLabel(WIRE_FIRST_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 520);
    place(createLabel(WIRE_FIRST_SIDE_EFFECT, 22, { color: TITLE, width: 640, height: 72 }), this.body, 0, 450);
    place(createLabel(WIRE_FIRST_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 370);
    place(createLabel(WIRE_FIRST_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 280);
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
    const snap = WireSession.firstRecharge;
    if (!snap) {
      place(createLabel(WIRE_FIRST_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 200);
      return;
    }
    place(createLabel(formatWireFirstHead(snap), 22, { color: TITLE, width: 640, height: 72 }), rows, 0, 180);
    const visible = Math.min(snap.rewards.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireFirstLine(snap.rewards[i]), 22, { color: TITLE, width: 640, align: "left" }),
        rows,
        0,
        120 - i * 36
      );
    }
    if (snap.rewards.length > visible) {
      place(
        createLabel("还有 " + (snap.rewards.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        120 - visible * 36
      );
    }
  }
}
