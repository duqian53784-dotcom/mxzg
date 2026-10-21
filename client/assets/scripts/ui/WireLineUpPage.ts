/**
 * 真服副本队列只读页。展示 s2c 3101 的 list（repeated PSLineUpData）和 assistance_unlock（optional bool）。
 * 行上按字段号写。没有的数不写成 0。出现的值如实展示，出现的 0 仍写 0，出现的 1 仍写 1，出现的 -1 仍写 -1。
 * assistance_unlock 没有时保持缺省，不写成 0。
 * 无保存队列、无解锁阵法入口。
 * 不发 3100 保存队列、3098 解锁阵法、3097 解锁第二契约、3030 切磋、3102 请求战报、3103 预计算战斗力。
 * 3099 勿再发。不做备选 5001。不做 20011。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 3099 分开发，勿合并。本刀不重复拉 3099。不写顶栏。
 * 页上写明 getHeroLineUps→fillLineUp 轻修复（formationId==0 则置 1 并轻修站位后 update；本路径不走 add）。只读，无扣费、无领奖、不写养成。
 * 这一帧只在 3099 之后发一次。无 page。空帧 040000001d0c0000。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireLineUpHead,
  formatWireLineUpLine,
  WIRE_LINEUP_FIELD_NOTE,
  WIRE_LINEUP_READONLY_NOTE,
  WIRE_LINEUP_READONLY_TITLE,
  WIRE_LINEUP_SIDE_EFFECT,
  WIRE_LINEUP_UNSYNCED_TOAST,
} from "../net/protocol/wireLineUp";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(28, 36, 48, 255);
const TITLE = new Color(210, 224, 236, 255);
const MUTED = new Color(168, 184, 196, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireLineUpHost {
  alive(): boolean;
  close(): void;
}

export interface WireLineUpPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireLineUpPage(host: WireLineUpHost): WireLineUpPage {
  return new WireLineUpController(host);
}

class WireLineUpController implements WireLineUpPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireLineUpHost) {
    this.node = uiNode("WireLineUpPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.lineUp;
    GameLog.shared.info("LineUp", "wire open " + (snap ? "list=" + snap.rows.length : "unsynced"));
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
    place(createLabel(WIRE_LINEUP_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_LINEUP_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 210 }), this.body, 0, 400);
    place(createLabel(WIRE_LINEUP_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 160 }), this.body, 0, 210);
    place(createLabel(WIRE_LINEUP_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 80 }), this.body, 0, 90);
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
    const snap = WireSession.lineUp;
    if (!snap) {
      place(createLabel(WIRE_LINEUP_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 20);
      return;
    }
    place(createLabel(formatWireLineUpHead(snap), 20, { color: TITLE, width: 640, height: 72 }), rows, 0, 20);
    const visible = Math.min(snap.rows.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireLineUpLine(snap.rows[i]), 18, { color: TITLE, width: 640, height: 36, align: "left" }),
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
