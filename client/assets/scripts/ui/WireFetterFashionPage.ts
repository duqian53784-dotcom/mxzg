/**
 * 真服羁绊皮肤只读页。展示 s2c 28200 的 active_type 和 use_type。
 * active_type 是 repeated int32。use_type 没有时保持缺省。
 * 没有的数不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 无熔炼、激活、领任务奖、使用皮肤入口。不夹发 28203 任务列表。
 * 不发 28201、28202、28203、28204、28205。不发 28101–28109、28002、28003。
 * 不做 75601。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 28100、74104 分开发，勿合并。本刀不重复拉 28100，也不重复拉 74104。不写顶栏。
 * 页上写明轻懒建 goddess_fashion。无扣费，无发奖，不改皮肤。只读展示。
 * 这一帧只在 28100 之后发一次。无 page。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireFetterFashionHead,
  formatWireFetterFashionLine,
  WIRE_FETTER_FASHION_FIELD_NOTE,
  WIRE_FETTER_FASHION_READONLY_NOTE,
  WIRE_FETTER_FASHION_READONLY_TITLE,
  WIRE_FETTER_FASHION_SIDE_EFFECT,
  WIRE_FETTER_FASHION_UNSYNCED_TOAST,
} from "../net/protocol/wireFetterFashion";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(40, 28, 24, 255);
const TITLE = new Color(232, 204, 176, 255);
const MUTED = new Color(196, 172, 152, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 5;

export interface WireFetterFashionHost {
  alive(): boolean;
  close(): void;
}

export interface WireFetterFashionPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireFetterFashionPage(host: WireFetterFashionHost): WireFetterFashionPage {
  return new WireFetterFashionController(host);
}

class WireFetterFashionController implements WireFetterFashionPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireFetterFashionHost) {
    this.node = uiNode("WireFetterFashionPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.fetterFashion;
    GameLog.shared.info("FetterFashion", "wire open " + (snap ? "active=" + snap.activeTypes.length : "unsynced"));
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
    place(createLabel(WIRE_FETTER_FASHION_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_FETTER_FASHION_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 170 }), this.body, 0, 420);
    place(createLabel(WIRE_FETTER_FASHION_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 150 }), this.body, 0, 260);
    place(createLabel(WIRE_FETTER_FASHION_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 150);
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
    const snap = WireSession.fetterFashion;
    if (!snap) {
      place(createLabel(WIRE_FETTER_FASHION_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 70);
      return;
    }
    place(createLabel(formatWireFetterFashionHead(snap), 20, { color: TITLE, width: 640, height: 96 }), rows, 0, 70);
    const visible = Math.min(snap.activeTypes.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireFetterFashionLine(snap.activeTypes[i]), 18, { color: TITLE, width: 660, height: 48, align: "left" }),
        rows,
        0,
        -20 - i * 52
      );
    }
    if (snap.activeTypes.length > visible) {
      place(
        createLabel("还有 " + (snap.activeTypes.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        -20 - visible * 52
      );
    }
  }
}
