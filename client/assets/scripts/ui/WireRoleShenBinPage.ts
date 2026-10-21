/**
 * 真服神兵道具/精华只读页。展示 s2c 75615 的 roleShenBins。
 * 行上写 item_type、itemNum。902048 标精华。其余 item_type 按原数写。
 * 没有的数不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 无合成、装备、分解、晋升入口。
 * 不发 75602、75603、75604、75605、75619。不发 75607、75609。
 * 75608 为服推，勿当 c2s。28107 查看契约另只读接在其后，勿合并。不做 20011。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 75606、75601 分开发，勿合并。本刀不重复拉 75606，也不重复拉 75601。不写顶栏。
 * 页上写明允许 getOrCreate 轻懒建（默认 knighthoodId=1）。只读拼包。无扣费，无领奖。
 * 这一帧只在 75606 之后发一次。无 page。空帧 040000005f270100。不发 75607。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireRoleShenBinHead,
  formatWireRoleShenBinRows,
  WIRE_ROLE_SHENBIN_FIELD_NOTE,
  WIRE_ROLE_SHENBIN_READONLY_NOTE,
  WIRE_ROLE_SHENBIN_READONLY_TITLE,
  WIRE_ROLE_SHENBIN_SIDE_EFFECT,
  WIRE_ROLE_SHENBIN_UNSYNCED_TOAST,
} from "../net/protocol/wireRoleShenBin";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(40, 28, 22, 255);
const TITLE = new Color(232, 208, 176, 255);
const MUTED = new Color(196, 172, 148, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 5;

export interface WireRoleShenBinHost {
  alive(): boolean;
  close(): void;
}

export interface WireRoleShenBinPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireRoleShenBinPage(host: WireRoleShenBinHost): WireRoleShenBinPage {
  return new WireRoleShenBinController(host);
}

class WireRoleShenBinController implements WireRoleShenBinPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireRoleShenBinHost) {
    this.node = uiNode("WireRoleShenBinPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.roleShenBin;
    GameLog.shared.info("RoleShenBin", "wire open " + (snap ? "items=" + snap.items.length : "unsynced"));
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
    place(createLabel(WIRE_ROLE_SHENBIN_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_ROLE_SHENBIN_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 190 }), this.body, 0, 410);
    place(createLabel(WIRE_ROLE_SHENBIN_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 150 }), this.body, 0, 240);
    place(createLabel(WIRE_ROLE_SHENBIN_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 90 }), this.body, 0, 120);
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
    const snap = WireSession.roleShenBin;
    if (!snap) {
      place(createLabel(WIRE_ROLE_SHENBIN_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 40);
      return;
    }
    place(createLabel(formatWireRoleShenBinHead(snap), 20, { color: TITLE, width: 640, height: 72 }), rows, 0, 40);
    const lines = formatWireRoleShenBinRows(snap);
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
