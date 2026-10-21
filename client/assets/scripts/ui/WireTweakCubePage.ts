/**
 * 真服魔方数据只读页。展示 s2c 75501 的 rank_hero、open_count、trench（index、hero_id、last_change_time）。
 * 没有添加、卸下、开格子、清 cd 按钮。不发 75502、75503、75504、75505。
 * 75506 是等级推送，勿发、勿当拉包。不做 34001。不做 20011。不写顶栏。
 * 页上写明轻懒建：首次 get 可能 doCreate + tweakCubeDao.add，建免费槽并按战力塞供奉。无扣费，无领奖。同星盘。
 * 这一帧只在 68001 之后发一次。无 page。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireTweakCubeHead,
  formatWireTweakCubeLine,
  WIRE_CUBE_FIELD_NOTE,
  WIRE_CUBE_READONLY_NOTE,
  WIRE_CUBE_READONLY_TITLE,
  WIRE_CUBE_SIDE_EFFECT,
  WIRE_CUBE_UNSYNCED_TOAST,
} from "../net/protocol/wireTweakCube";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(18, 36, 48, 255);
const TITLE = new Color(186, 220, 214, 255);
const MUTED = new Color(168, 196, 198, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireTweakCubeHost {
  alive(): boolean;
  close(): void;
}

export interface WireTweakCubePage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireTweakCubePage(host: WireTweakCubeHost): WireTweakCubePage {
  return new WireTweakCubeController(host);
}

class WireTweakCubeController implements WireTweakCubePage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireTweakCubeHost) {
    this.node = uiNode("WireTweakCubePage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.tweakCube;
    GameLog.shared.info("TweakCube", "wire open " + (snap ? "trench=" + snap.trenches.length : "unsynced"));
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
    place(createLabel(WIRE_CUBE_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_CUBE_SIDE_EFFECT, 20, { color: TITLE, width: 640, height: 120 }), this.body, 0, 450);
    place(createLabel(WIRE_CUBE_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 110 }), this.body, 0, 330);
    place(createLabel(WIRE_CUBE_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 230);
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
    const snap = WireSession.tweakCube;
    if (!snap) {
      place(createLabel(WIRE_CUBE_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 160);
      return;
    }
    place(createLabel(formatWireTweakCubeHead(snap), 20, { color: TITLE, width: 640, height: 96 }), rows, 0, 150);
    const visible = Math.min(snap.trenches.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireTweakCubeLine(snap.trenches[i]), 20, { color: TITLE, width: 640, height: 40, align: "left" }),
        rows,
        0,
        80 - i * 40
      );
    }
    if (snap.trenches.length > visible) {
      place(
        createLabel("还有 " + (snap.trenches.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        80 - visible * 40
      );
    }
  }
}
