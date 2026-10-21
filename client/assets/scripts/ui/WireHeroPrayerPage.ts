/**
 * 真服英雄祈愿数据只读页。展示 s2c 4201 的 privilege、end_time。
 * privilege：0/1。end_time 未开为 0。没有的数不写成 0。出现的 0 仍写 0。
 * 无祈愿写入口。不发 4202。不做 74104。不做 20011。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 4401 分刀，勿合并。本刀不重复拉 4401。不写顶栏。
 * 页上写明轻懒建 hero_prayer。特权过期清字段。只读展示。无扣费，无领奖。
 * 这一帧只在 4401 之后发一次。无 page。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireHeroPrayerLine,
  WIRE_HERO_PRAYER_FIELD_NOTE,
  WIRE_HERO_PRAYER_READONLY_NOTE,
  WIRE_HERO_PRAYER_READONLY_TITLE,
  WIRE_HERO_PRAYER_SIDE_EFFECT,
  WIRE_HERO_PRAYER_UNSYNCED_TOAST,
} from "../net/protocol/wireHeroPrayer";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 28, 18, 255);
const TITLE = new Color(232, 206, 150, 255);
const MUTED = new Color(204, 186, 150, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface WireHeroPrayerHost {
  alive(): boolean;
  close(): void;
}

export interface WireHeroPrayerPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireHeroPrayerPage(host: WireHeroPrayerHost): WireHeroPrayerPage {
  return new WireHeroPrayerController(host);
}

class WireHeroPrayerController implements WireHeroPrayerPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireHeroPrayerHost) {
    this.node = uiNode("WireHeroPrayerPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.heroPrayer;
    GameLog.shared.info(
      "HeroPrayer",
      "wire open " +
        (snap
          ? "privilege=" + (snap.privilege === null ? "无" : snap.privilege) + " end_time=" + (snap.endTime === null ? "无" : snap.endTime)
          : "unsynced")
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
    place(createLabel(WIRE_HERO_PRAYER_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 520);
    place(createLabel(WIRE_HERO_PRAYER_SIDE_EFFECT, 20, { color: TITLE, width: 640, height: 120 }), this.body, 0, 420);
    place(createLabel(WIRE_HERO_PRAYER_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 140 }), this.body, 0, 280);
    place(createLabel(WIRE_HERO_PRAYER_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 160);
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
    const snap = WireSession.heroPrayer;
    if (!snap) {
      place(createLabel(WIRE_HERO_PRAYER_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 80);
      return;
    }
    place(createLabel(formatWireHeroPrayerLine(snap), 22, { color: TITLE, width: 640, height: 96 }), rows, 0, 70);
  }
}
