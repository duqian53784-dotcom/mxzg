/**
 * 真服宠物图鉴只读页。展示 s2c 74104 的 repeated int32 petTypes（已解锁宠物类型）。
 * 没有的数不写成 0。出现的值如实展示，出现的 0 仍写 0。
 * 无升级、携带、卸下入口。不发 74101、74102、74103。
 * 74105、74106 是背包增减推送，勿当拉包。28100 另只读接在其后，勿合并。不做 20011。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 74100、4201 分开发，勿合并。本刀不重复拉 74100，也不重复拉 4201。不写顶栏。
 * 页上写明轻懒建空 PetIllustrate。无扣费，无发奖。只读展示。
 * 这一帧只在 4201 之后发一次。无 page。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWirePetIllustrateHead,
  formatWirePetIllustrateLine,
  WIRE_PET_ILLUSTRATE_FIELD_NOTE,
  WIRE_PET_ILLUSTRATE_READONLY_NOTE,
  WIRE_PET_ILLUSTRATE_READONLY_TITLE,
  WIRE_PET_ILLUSTRATE_SIDE_EFFECT,
  WIRE_PET_ILLUSTRATE_UNSYNCED_TOAST,
} from "../net/protocol/wirePetIllustrate";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(24, 36, 22, 255);
const TITLE = new Color(196, 228, 168, 255);
const MUTED = new Color(176, 196, 160, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WirePetIllustrateHost {
  alive(): boolean;
  close(): void;
}

export interface WirePetIllustratePage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWirePetIllustratePage(host: WirePetIllustrateHost): WirePetIllustratePage {
  return new WirePetIllustrateController(host);
}

class WirePetIllustrateController implements WirePetIllustratePage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WirePetIllustrateHost) {
    this.node = uiNode("WirePetIllustratePage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.petIllustrate;
    GameLog.shared.info("PetIllustrate", "wire open " + (snap ? "petTypes=" + snap.petTypes.length : "unsynced"));
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
    place(createLabel(WIRE_PET_ILLUSTRATE_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_PET_ILLUSTRATE_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 140 }), this.body, 0, 440);
    place(createLabel(WIRE_PET_ILLUSTRATE_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 140 }), this.body, 0, 300);
    place(createLabel(WIRE_PET_ILLUSTRATE_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 190);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -540);
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
    const snap = WireSession.petIllustrate;
    if (!snap) {
      place(createLabel(WIRE_PET_ILLUSTRATE_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 120);
      return;
    }
    place(createLabel(formatWirePetIllustrateHead(snap), 20, { color: TITLE, width: 640, height: 96 }), rows, 0, 120);
    const visible = Math.min(snap.petTypes.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWirePetIllustrateLine(snap.petTypes[i]), 20, { color: TITLE, width: 640, height: 40, align: "left" }),
        rows,
        0,
        50 - i * 40
      );
    }
    if (snap.petTypes.length > visible) {
      place(
        createLabel("还有 " + (snap.petTypes.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        50 - visible * 40
      );
    }
  }
}
