/**
 * 真服神兵数据只读页。展示 s2c 75601 的 shenBinInfos。
 * 行上写 job、coreLv、fighting 和 equipData 的 job、equip_list。
 * PSHoleData 没有点名字段，按字段号写。没有的数不写成 0。
 * 出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 无合成、装备、核心升级、分解入口。
 * 不发 75602、75603、75604、75605。不发 75619、75609。不做 75606。
 * 不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 28200、28100 分开发，勿合并。本刀不重复拉 28200，也不重复拉 28100。不写顶栏。
 * 页上写明按 job 轻懒建 core（默认 coreLv=1）。客户端不把缺省 coreLv 填成 1。
 * 这一帧只在 28200 之后发一次。无 page。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireShenBinHead,
  formatWireShenBinRows,
  WIRE_SHENBIN_FIELD_NOTE,
  WIRE_SHENBIN_READONLY_NOTE,
  WIRE_SHENBIN_READONLY_TITLE,
  WIRE_SHENBIN_SIDE_EFFECT,
  WIRE_SHENBIN_UNSYNCED_TOAST,
} from "../net/protocol/wireShenBin";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(28, 24, 40, 255);
const TITLE = new Color(220, 196, 232, 255);
const MUTED = new Color(176, 164, 196, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 5;

export interface WireShenBinHost {
  alive(): boolean;
  close(): void;
}

export interface WireShenBinPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireShenBinPage(host: WireShenBinHost): WireShenBinPage {
  return new WireShenBinController(host);
}

class WireShenBinController implements WireShenBinPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireShenBinHost) {
    this.node = uiNode("WireShenBinPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.shenBin;
    GameLog.shared.info("ShenBin", "wire open " + (snap ? "infos=" + snap.infos.length : "unsynced"));
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
    place(createLabel(WIRE_SHENBIN_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_SHENBIN_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 190 }), this.body, 0, 410);
    place(createLabel(WIRE_SHENBIN_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 150 }), this.body, 0, 240);
    place(createLabel(WIRE_SHENBIN_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 90 }), this.body, 0, 120);
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
    const snap = WireSession.shenBin;
    if (!snap) {
      place(createLabel(WIRE_SHENBIN_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 40);
      return;
    }
    place(createLabel(formatWireShenBinHead(snap), 20, { color: TITLE, width: 640, height: 72 }), rows, 0, 40);
    const lines = formatWireShenBinRows(snap);
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
