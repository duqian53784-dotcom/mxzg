/**
 * 真服羁绊数据只读页。展示 s2c 28100 的 reset_count 和 goddess[]。
 * PSFetterData：type、exp、level、skill_level、refine_level、uplimit_level、soul_level、wash_level。
 * 没有的数不写成 0。出现的值如实展示，出现的 0 仍写 0。
 * 无升级、升技、突破、重置、铸魂、契约、洗炼、领奖、精炼入口。
 * 不发 28101、28102、28104、28105、28106、28108、28109、28002、28003。
 * 28200 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 74104、4201 分开发，勿合并。本刀不重复拉 74104，也不重复拉 4201。不写顶栏。
 * 页上写明轻懒建（load/getFetterTask）。无扣费，无领奖。只读展示。
 * 这一帧只在 74104 之后发一次。无 page。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireFetterHead,
  formatWireFetterLine,
  WIRE_FETTER_FIELD_NOTE,
  WIRE_FETTER_READONLY_NOTE,
  WIRE_FETTER_READONLY_TITLE,
  WIRE_FETTER_SIDE_EFFECT,
  WIRE_FETTER_UNSYNCED_TOAST,
} from "../net/protocol/wireFetter";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 24, 36, 255);
const TITLE = new Color(228, 196, 220, 255);
const MUTED = new Color(196, 168, 188, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 4;

export interface WireFetterHost {
  alive(): boolean;
  close(): void;
}

export interface WireFetterPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireFetterPage(host: WireFetterHost): WireFetterPage {
  return new WireFetterController(host);
}

class WireFetterController implements WireFetterPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireFetterHost) {
    this.node = uiNode("WireFetterPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.fetter;
    GameLog.shared.info("Fetter", "wire open " + (snap ? "goddess=" + snap.goddess.length : "unsynced"));
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
    place(createLabel(WIRE_FETTER_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_FETTER_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 160 }), this.body, 0, 430);
    place(createLabel(WIRE_FETTER_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 140 }), this.body, 0, 280);
    place(createLabel(WIRE_FETTER_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 80 }), this.body, 0, 160);
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
    const snap = WireSession.fetter;
    if (!snap) {
      place(createLabel(WIRE_FETTER_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 80);
      return;
    }
    place(createLabel(formatWireFetterHead(snap), 20, { color: TITLE, width: 640, height: 72 }), rows, 0, 80);
    const visible = Math.min(snap.goddess.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireFetterLine(snap.goddess[i]), 16, { color: TITLE, width: 660, height: 72, align: "left" }),
        rows,
        0,
        10 - i * 78
      );
    }
    if (snap.goddess.length > visible) {
      place(
        createLabel("还有 " + (snap.goddess.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        10 - visible * 78
      );
    }
  }
}
