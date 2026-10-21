/**
 * 真服职级信息只读页。展示 s2c 75606 的 occupationInfo。
 * 头上写 oc_id。行上写 taskId、targetCount、condition、complete_type。
 * 没有的数不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 无晋升、手动完成任务入口。
 * 不发 75607、75609。75608 为服推，勿当 c2s。
 * 不发 75602、75603、75604、75605、75619。75615 神兵道具另只读接在其后，勿合并。不做 20011。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 75601、28200 分开发，勿合并。本刀不重复拉 75601，也不重复拉 28200。不写顶栏。
 * 页上写明允许 getOrCreate 轻懒建。无扣费，无领奖。
 * 这一帧只在 75601 之后发一次。无 page。空帧 0400000056270100。不发 75607。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireOccupationHead,
  formatWireOccupationRows,
  WIRE_OCCUPATION_FIELD_NOTE,
  WIRE_OCCUPATION_READONLY_NOTE,
  WIRE_OCCUPATION_READONLY_TITLE,
  WIRE_OCCUPATION_SIDE_EFFECT,
  WIRE_OCCUPATION_UNSYNCED_TOAST,
} from "../net/protocol/wireOccupation";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(24, 32, 44, 255);
const TITLE = new Color(196, 220, 232, 255);
const MUTED = new Color(164, 180, 196, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 5;

export interface WireOccupationHost {
  alive(): boolean;
  close(): void;
}

export interface WireOccupationPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireOccupationPage(host: WireOccupationHost): WireOccupationPage {
  return new WireOccupationController(host);
}

class WireOccupationController implements WireOccupationPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireOccupationHost) {
    this.node = uiNode("WireOccupationPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.occupation;
    GameLog.shared.info("Occupation", "wire open " + (snap ? "tasks=" + taskCount(snap.info) : "unsynced"));
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
    place(createLabel(WIRE_OCCUPATION_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_OCCUPATION_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 190 }), this.body, 0, 410);
    place(createLabel(WIRE_OCCUPATION_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 150 }), this.body, 0, 240);
    place(createLabel(WIRE_OCCUPATION_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 90 }), this.body, 0, 120);
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
    const snap = WireSession.occupation;
    if (!snap) {
      place(createLabel(WIRE_OCCUPATION_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 40);
      return;
    }
    place(createLabel(formatWireOccupationHead(snap), 20, { color: TITLE, width: 640, height: 72 }), rows, 0, 40);
    const lines = formatWireOccupationRows(snap);
    const visible = Math.min(lines.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(lines[i], 18, { color: TITLE, width: 660, height: 64, align: "left" }),
        rows,
        0,
        -40 - i * 68
      );
    }
    if (lines.length > visible) {
      place(
        createLabel("还有 " + (lines.length - visible) + " 行", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        -40 - visible * 68
      );
    }
  }
}

function taskCount(info: { tasks: readonly unknown[] } | null): number {
  return info ? info.tasks.length : 0;
}
