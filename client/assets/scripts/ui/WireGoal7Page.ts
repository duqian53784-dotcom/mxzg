/**
 * 真服七日目标只读页。展示 s2c 21010 的 curr_day、seven_day_value、reward_box_idx 和任务 idx / process / state。
 * state 0 写未领，1 写已领。没有领取按钮。不发 21011、21012。21013 只收。不写顶栏。
 * 页上写明首次拉取可能建档，并懒填计数。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireGoalHead,
  formatWireGoalLine,
  WIRE_GOAL7_EMPTY,
  WIRE_GOAL7_FIELD_NOTE,
  WIRE_GOAL7_PUSH_NOTE,
  WIRE_GOAL7_READONLY_NOTE,
  WIRE_GOAL7_READONLY_TITLE,
  WIRE_GOAL7_SIDE_EFFECT,
  WIRE_GOAL7_UNSYNCED_TOAST,
} from "../net/protocol/wireGoal7";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 22, 12, 255);
const TITLE = new Color(255, 214, 150, 255);
const MUTED = new Color(214, 196, 170, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireGoal7Host {
  alive(): boolean;
  close(): void;
}

export interface WireGoal7Page {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireGoal7Page(host: WireGoal7Host): WireGoal7Page {
  return new WireGoal7Controller(host);
}

class WireGoal7Controller implements WireGoal7Page {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireGoal7Host) {
    this.node = uiNode("WireGoal7Page");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.goal7;
    GameLog.shared.info("Goal7", "wire open " + (snap ? snap.tasks.length : "unsynced"));
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
    place(createLabel(WIRE_GOAL7_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 560);
    place(createLabel(WIRE_GOAL7_SIDE_EFFECT, 22, { color: TITLE, width: 640 }), this.body, 0, 510);
    place(createLabel(WIRE_GOAL7_PUSH_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 476);
    place(createLabel(WIRE_GOAL7_READONLY_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 442);
    place(createLabel(WIRE_GOAL7_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 48 }), this.body, 0, 392);
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
    const snap = WireSession.goal7;
    if (!snap) {
      place(createLabel(WIRE_GOAL7_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 320);
      return;
    }
    place(createLabel(formatWireGoalHead(snap), 20, { color: TITLE, width: 640 }), rows, 0, 320);
    if (snap.tasks.length === 0) {
      place(createLabel(WIRE_GOAL7_EMPTY, 28, { color: TITLE, width: 640 }), rows, 0, 270);
      return;
    }
    const visible = Math.min(snap.tasks.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireGoalLine(snap.tasks[i]), 20, { color: TITLE, width: 640, align: "left" }),
        rows,
        0,
        270 - i * 34
      );
    }
    if (snap.tasks.length > visible) {
      place(
        createLabel("还有 " + (snap.tasks.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        270 - visible * 34
      );
    }
  }
}
