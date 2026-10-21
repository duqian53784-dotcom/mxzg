/**
 * 真服召唤次数只读页。展示 s2c 4004 的 free_time、senior_free_time。
 * 没有召唤按钮，也没有领累积奖按钮。不发 4002、4005。不写顶栏。
 * 页上写明可能懒建 HeroSummon。英雄列表仍是 4001。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireSummonLine,
  WIRE_SUMMON_FIELD_NOTE,
  WIRE_SUMMON_READONLY_NOTE,
  WIRE_SUMMON_READONLY_TITLE,
  WIRE_SUMMON_SIDE_EFFECT,
  WIRE_SUMMON_UNSYNCED_TOAST,
} from "../net/protocol/wireSummon";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(18, 16, 36, 255);
const TITLE = new Color(255, 214, 150, 255);
const MUTED = new Color(214, 196, 170, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface WireSummonHost {
  alive(): boolean;
  close(): void;
}

export interface WireSummonPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireSummonPage(host: WireSummonHost): WireSummonPage {
  return new WireSummonController(host);
}

class WireSummonController implements WireSummonPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireSummonHost) {
    this.node = uiNode("WireSummonPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.summon;
    GameLog.shared.info(
      "Summon",
      "wire open " + (snap ? "free_time=" + (snap.freeTime === null ? "无" : snap.freeTime) : "unsynced")
    );
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
    place(createLabel(WIRE_SUMMON_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 520);
    place(createLabel(WIRE_SUMMON_SIDE_EFFECT, 22, { color: TITLE, width: 640 }), this.body, 0, 460);
    place(createLabel(WIRE_SUMMON_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 390);
    place(createLabel(WIRE_SUMMON_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 48 }), this.body, 0, 310);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -520);
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
    const snap = WireSession.summon;
    if (!snap) {
      place(createLabel(WIRE_SUMMON_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 200);
      return;
    }
    place(createLabel(formatWireSummonLine(snap), 26, { color: TITLE, width: 640 }), rows, 0, 200);
  }
}
