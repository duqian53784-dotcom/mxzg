/**
 * 真服契约只读页。展示 s2c 28107 的 contracts（已激活契约，repeated int32）。
 * 不保证顺序，按出现顺序写。没有的数不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 无解锁契约、升级、升技、突破、重置、铸魂、洗炼入口。
 * 不发 28101、28102、28104、28105、28106、28108、28109。不发 28002、28003、28004。
 * 不发 28201、28202、28203、28204、28205。3099 查询阵法另只读接在其后，勿合并。不做 20011。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 75615、75606 分开发，勿合并。本刀不重复拉 75615，也不重复拉 75606。不写顶栏。
 * 页上写明 getFetterTask 轻懒建。只读，无解锁、无扣费、无领奖。
 * 这一帧只在 75615 之后发一次。无 page。空帧 04000000cb6d0000。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireFetterContractHead,
  formatWireFetterContractLine,
  WIRE_FETTER_CONTRACT_FIELD_NOTE,
  WIRE_FETTER_CONTRACT_READONLY_NOTE,
  WIRE_FETTER_CONTRACT_READONLY_TITLE,
  WIRE_FETTER_CONTRACT_SIDE_EFFECT,
  WIRE_FETTER_CONTRACT_UNSYNCED_TOAST,
} from "../net/protocol/wireFetterContract";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 28, 44, 255);
const TITLE = new Color(228, 210, 236, 255);
const MUTED = new Color(186, 168, 196, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireFetterContractHost {
  alive(): boolean;
  close(): void;
}

export interface WireFetterContractPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireFetterContractPage(host: WireFetterContractHost): WireFetterContractPage {
  return new WireFetterContractController(host);
}

class WireFetterContractController implements WireFetterContractPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireFetterContractHost) {
    this.node = uiNode("WireFetterContractPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.fetterContract;
    GameLog.shared.info("FetterContract", "wire open " + (snap ? "contracts=" + snap.contracts.length : "unsynced"));
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
    place(createLabel(WIRE_FETTER_CONTRACT_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_FETTER_CONTRACT_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 210 }), this.body, 0, 400);
    place(createLabel(WIRE_FETTER_CONTRACT_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 160 }), this.body, 0, 210);
    place(createLabel(WIRE_FETTER_CONTRACT_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 80 }), this.body, 0, 90);
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
    const snap = WireSession.fetterContract;
    if (!snap) {
      place(createLabel(WIRE_FETTER_CONTRACT_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 20);
      return;
    }
    place(createLabel(formatWireFetterContractHead(snap), 20, { color: TITLE, width: 640, height: 72 }), rows, 0, 20);
    const visible = Math.min(snap.contracts.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireFetterContractLine(snap.contracts[i]), 18, { color: TITLE, width: 640, height: 36, align: "left" }),
        rows,
        0,
        -50 - i * 40
      );
    }
    if (snap.contracts.length > visible) {
      place(
        createLabel("还有 " + (snap.contracts.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        -50 - visible * 40
      );
    }
  }
}
