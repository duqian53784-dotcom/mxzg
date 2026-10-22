/**
 * 真服圣诞连线只读页。只展示 s2c 76081 里实际出现的字段。活动 CHRISTMAS_MISSION / promo085。
 * mission、mission_box_reward_record 按内层字段号写，不发明行名字。open_day 是标量。
 * 没有的数不写成 0，也不补一项。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 无领任务奖、无进度写、无领任务箱入口。不发 76082 领任务奖。不发 76083 进度推送。不发 76084 领任务箱。旁支勿夹 76121、76122、76141、76143、76161、76163。备选 76520 暂不做。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。
 * 不夹发 74121、74122。不是出游寻春 76301。不是约惠圣诞 76101。5001、51001、68001、70001 已有，勿重复。76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 76301 分开发，勿合并。不并入 76301。本刀不重复拉 76301，也不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。不写顶栏。
 * 页上写明轻懒建可接受。轻日刷可接受。跨日清 mission/box 可接受。未开活动回默认空包可接受。无扣费，无领奖，无养成写。
 * 这一帧只在 76301 之后发一次。无 page，无 FIELD。空帧 0400000031290100。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireChristmasMissionLine,
  WIRE_CHRISTMAS_MISSION_FIELD_NOTE,
  WIRE_CHRISTMAS_MISSION_READONLY_NOTE,
  WIRE_CHRISTMAS_MISSION_READONLY_TITLE,
  WIRE_CHRISTMAS_MISSION_SIDE_EFFECT,
  WIRE_CHRISTMAS_MISSION_UNSYNCED_TOAST,
} from "../net/protocol/wireChristmasMission";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(28, 36, 28, 255);
const TITLE = new Color(214, 224, 210, 255);
const MUTED = new Color(168, 196, 176, 255);
const BACK_FILL = new Color(36, 96, 64, 255);

export interface WireChristmasMissionHost {
  alive(): boolean;
  close(): void;
}

export interface WireChristmasMissionPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireChristmasMissionPage(host: WireChristmasMissionHost): WireChristmasMissionPage {
  return new WireChristmasMissionController(host);
}

class WireChristmasMissionController implements WireChristmasMissionPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireChristmasMissionHost) {
    this.node = uiNode("WireChristmasMissionPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.christmasMission;
    GameLog.shared.info("ChristmasMission", "wire open " + (snap ? formatWireChristmasMissionLine(snap) : "unsynced"));
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
    place(createLabel(WIRE_CHRISTMAS_MISSION_READONLY_TITLE, 32, { color: TITLE, width: 640 }), this.body, 0, 540);
    place(createLabel(WIRE_CHRISTMAS_MISSION_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 280 }), this.body, 0, 340);
    place(createLabel(WIRE_CHRISTMAS_MISSION_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 220 }), this.body, 0, 80);
    place(createLabel(WIRE_CHRISTMAS_MISSION_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 120 }), this.body, 0, -40);
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
    const snap = WireSession.christmasMission;
    if (!snap) {
      place(createLabel(WIRE_CHRISTMAS_MISSION_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, -140);
      return;
    }
    place(
      createLabel(formatWireChristmasMissionLine(snap), 24, { color: TITLE, width: 640, height: 220 }),
      rows,
      0,
      -140
    );
  }
}
