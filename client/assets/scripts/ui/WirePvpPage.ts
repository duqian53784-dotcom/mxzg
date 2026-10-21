/**
 * 真服竞技场只读页。展示 s2c 18001 的 free_count、score 和对手名字。
 * 不挑战，不匹配，不扣次，不写积分，不写顶栏。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWirePvpLine,
  formatWirePvpSelfLines,
  WIRE_PVP_EMPTY,
  WIRE_PVP_FIELD_NOTE,
  WIRE_PVP_READONLY_NOTE,
  WIRE_PVP_READONLY_TITLE,
  WIRE_PVP_SEASON_NOTE,
  WIRE_PVP_SIDE_EFFECT,
  WIRE_PVP_UNSYNCED_TOAST,
} from "../net/protocol/wirePvp";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WirePvpHost {
  alive(): boolean;
  close(): void;
}

export interface WirePvpPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWirePvpPage(host: WirePvpHost): WirePvpPage {
  return new WirePvpController(host);
}

class WirePvpController implements WirePvpPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WirePvpHost) {
    this.node = uiNode("WirePvpPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.pvp;
    GameLog.shared.info("Pvp", "wire open " + (snap ? snap.opponents.length : "unsynced"));
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
    place(createLabel(WIRE_PVP_READONLY_TITLE, 36, { color: TITLE }), this.body, 0, 560);
    place(createLabel(WIRE_PVP_SIDE_EFFECT, 22, { color: TITLE, width: 640 }), this.body, 0, 510);
    place(createLabel(WIRE_PVP_SEASON_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 476);
    place(createLabel(WIRE_PVP_READONLY_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 442);
    place(createLabel(WIRE_PVP_FIELD_NOTE, 18, { color: MUTED, width: 640 }), this.body, 0, 400);
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
    const snap = WireSession.pvp;
    if (!snap) {
      place(createLabel(WIRE_PVP_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 340);
      return;
    }
    const selfLines = formatWirePvpSelfLines(snap);
    const top = 350;
    for (let i = 0; i < selfLines.length; i++) {
      place(
        createLabel(selfLines[i], 22, { color: TITLE, width: 640, align: "left" }),
        rows,
        0,
        top - i * 28
      );
    }
    const listTop = top - selfLines.length * 28 - 8;
    if (snap.opponents.length === 0) {
      place(createLabel(WIRE_PVP_EMPTY, 28, { color: TITLE, width: 640 }), rows, 0, listTop - 20);
      return;
    }
    const visible = Math.min(snap.opponents.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWirePvpLine(snap.opponents[i]), 18, {
          color: TITLE,
          width: 640,
          align: "left",
        }),
        rows,
        0,
        listTop - i * 36
      );
    }
    if (snap.opponents.length > visible) {
      place(
        createLabel("还有 " + (snap.opponents.length - visible) + " 名", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        listTop - visible * 36
      );
    }
  }
}
