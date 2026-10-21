/**
 * 真服阵法只读页。展示 s2c 3099 的 unlockIds（已解锁阵法，repeated int32）。
 * 不保证顺序，按出现顺序写。没有的数不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 无解锁阵法、保存战斗队列入口。
 * 不发 3097 解锁第二契约、3098 解锁阵法、3100 保存战斗队列。
 * 不发 3102 查战报、3030 切磋。不做备选 3101。不做 20011。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 28107、75615 分开发，勿合并。本刀不重复拉 28107，也不重复拉 75615。不写顶栏。
 * 页上写明 getFormation 轻懒建（无记录则 add；未解锁阵法 id=1 则 unlock(1)+update）。只读，无扣费、无领奖、不写养成。
 * 这一帧只在 28107 之后发一次。无 page。空帧 040000001b0c0000。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireFormationHead,
  formatWireFormationLine,
  WIRE_FORMATION_FIELD_NOTE,
  WIRE_FORMATION_READONLY_NOTE,
  WIRE_FORMATION_READONLY_TITLE,
  WIRE_FORMATION_SIDE_EFFECT,
  WIRE_FORMATION_UNSYNCED_TOAST,
} from "../net/protocol/wireFormation";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(28, 36, 48, 255);
const TITLE = new Color(210, 224, 236, 255);
const MUTED = new Color(168, 184, 196, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireFormationHost {
  alive(): boolean;
  close(): void;
}

export interface WireFormationPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireFormationPage(host: WireFormationHost): WireFormationPage {
  return new WireFormationController(host);
}

class WireFormationController implements WireFormationPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireFormationHost) {
    this.node = uiNode("WireFormationPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.formation;
    GameLog.shared.info("Formation", "wire open " + (snap ? "unlockIds=" + snap.unlockIds.length : "unsynced"));
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
    place(createLabel(WIRE_FORMATION_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_FORMATION_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 210 }), this.body, 0, 400);
    place(createLabel(WIRE_FORMATION_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 160 }), this.body, 0, 210);
    place(createLabel(WIRE_FORMATION_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 80 }), this.body, 0, 90);
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
    const snap = WireSession.formation;
    if (!snap) {
      place(createLabel(WIRE_FORMATION_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 20);
      return;
    }
    place(createLabel(formatWireFormationHead(snap), 20, { color: TITLE, width: 640, height: 72 }), rows, 0, 20);
    const visible = Math.min(snap.unlockIds.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireFormationLine(snap.unlockIds[i]), 18, { color: TITLE, width: 640, height: 36, align: "left" }),
        rows,
        0,
        -50 - i * 40
      );
    }
    if (snap.unlockIds.length > visible) {
      place(
        createLabel("还有 " + (snap.unlockIds.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        -50 - visible * 40
      );
    }
  }
}
