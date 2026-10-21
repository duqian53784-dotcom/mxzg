/**
 * 真服时空魔塔个人信息只读页。只展示 s2c 74001 里实际出现的字段。
 * mission_id、accumulate_pass、max_pass、heart、mission_mark、starttime、endtime。
 * 没有的数不写成 0，也不补一项。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 无挑战、无排行入口。不重复拉 69001。不发 74002。不发 74003。不做 73002。不做 71001。不做 20011。
 * 不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。5001、51001、68001、70001 已有，勿重复。69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 69001 分开发，勿合并。本刀不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。不写顶栏。
 * 页上写明轻懒建（getTower 可能 add）、轻日刷（跨日清 failNum）可接受。跨服回包轮次变化可能清 weekPass。无扣费，无领奖，无挑战写。
 * 这一帧只在 69001 之后发一次。无 page。空帧 0400000011210100。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireTimeTowerLine,
  WIRE_TIME_TOWER_FIELD_NOTE,
  WIRE_TIME_TOWER_READONLY_NOTE,
  WIRE_TIME_TOWER_READONLY_TITLE,
  WIRE_TIME_TOWER_SIDE_EFFECT,
  WIRE_TIME_TOWER_UNSYNCED_TOAST,
} from "../net/protocol/wireTimeTower";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(32, 40, 56, 255);
const TITLE = new Color(214, 224, 240, 255);
const MUTED = new Color(168, 184, 210, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface WireTimeTowerHost {
  alive(): boolean;
  close(): void;
}

export interface WireTimeTowerPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireTimeTowerPage(host: WireTimeTowerHost): WireTimeTowerPage {
  return new WireTimeTowerController(host);
}

class WireTimeTowerController implements WireTimeTowerPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireTimeTowerHost) {
    this.node = uiNode("WireTimeTowerPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.timeTower;
    GameLog.shared.info("TimeTower", "wire open " + (snap ? formatWireTimeTowerLine(snap) : "unsynced"));
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
    place(createLabel(WIRE_TIME_TOWER_READONLY_TITLE, 32, { color: TITLE, width: 640 }), this.body, 0, 540);
    place(createLabel(WIRE_TIME_TOWER_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 280 }), this.body, 0, 340);
    place(createLabel(WIRE_TIME_TOWER_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 200 }), this.body, 0, 100);
    place(createLabel(WIRE_TIME_TOWER_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 100 }), this.body, 0, -20);
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
    const snap = WireSession.timeTower;
    if (!snap) {
      place(createLabel(WIRE_TIME_TOWER_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, -120);
      return;
    }
    place(
      createLabel(formatWireTimeTowerLine(snap), 26, { color: TITLE, width: 640, height: 180 }),
      rows,
      0,
      -120
    );
  }
}
