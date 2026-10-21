/**
 * 真服英雄等级重生次数只读页。展示 s2c 4044 的 times。
 * 没有的数不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 无重生、扣费、清符文、降级、返还入口。不发 4043。不做 13010。不做 20011。
 * 5001、51001 已有，勿重复。3203、20101、3101、3099 勿再发。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 3203 分开发，勿合并。本刀不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。不写顶栏。
 * 页上写明 getHeroSummon 可能轻懒建。跨日可能把 times 清零并更新。轻懒建、轻日刷可接受。
 * 无扣费，无领奖，无养成写。
 * 这一帧只在 3203 之后发一次。无 page。空帧 04000000cc0f0000。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireHeroLevelResetTimesLine,
  WIRE_HERO_LEVEL_RESET_TIMES_FIELD_NOTE,
  WIRE_HERO_LEVEL_RESET_TIMES_READONLY_NOTE,
  WIRE_HERO_LEVEL_RESET_TIMES_READONLY_TITLE,
  WIRE_HERO_LEVEL_RESET_TIMES_SIDE_EFFECT,
  WIRE_HERO_LEVEL_RESET_TIMES_UNSYNCED_TOAST,
} from "../net/protocol/wireHeroLevelResetTimes";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(48, 28, 40, 255);
const TITLE = new Color(236, 214, 220, 255);
const MUTED = new Color(200, 172, 180, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface WireHeroLevelResetTimesHost {
  alive(): boolean;
  close(): void;
}

export interface WireHeroLevelResetTimesPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireHeroLevelResetTimesPage(host: WireHeroLevelResetTimesHost): WireHeroLevelResetTimesPage {
  return new WireHeroLevelResetTimesController(host);
}

class WireHeroLevelResetTimesController implements WireHeroLevelResetTimesPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireHeroLevelResetTimesHost) {
    this.node = uiNode("WireHeroLevelResetTimesPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.heroLevelResetTimes;
    GameLog.shared.info("HeroLevelResetTimes", "wire open " + (snap ? formatWireHeroLevelResetTimesLine(snap) : "unsynced"));
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
    place(createLabel(WIRE_HERO_LEVEL_RESET_TIMES_READONLY_TITLE, 32, { color: TITLE, width: 640 }), this.body, 0, 540);
    place(createLabel(WIRE_HERO_LEVEL_RESET_TIMES_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 220 }), this.body, 0, 380);
    place(createLabel(WIRE_HERO_LEVEL_RESET_TIMES_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 160 }), this.body, 0, 180);
    place(createLabel(WIRE_HERO_LEVEL_RESET_TIMES_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 80 }), this.body, 0, 60);
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
    const snap = WireSession.heroLevelResetTimes;
    if (!snap) {
      place(createLabel(WIRE_HERO_LEVEL_RESET_TIMES_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, -40);
      return;
    }
    place(
      createLabel(formatWireHeroLevelResetTimesLine(snap), 28, { color: TITLE, width: 640, height: 80 }),
      rows,
      0,
      -40
    );
  }
}
