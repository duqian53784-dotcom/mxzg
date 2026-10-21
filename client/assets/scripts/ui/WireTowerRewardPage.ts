/**
 * 真服爬塔首通已领只读页。展示 s2c 3203 的 list（已领爬塔首通 idx，repeated int32）。
 * 不保证顺序，按出现顺序写。没有的数不写成 0。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 无买票、领首通、战斗结束、扫荡、编辑 npc 入口。
 * 不发 3202、3204、3205、3206、3220。3200 本轮勿挂。不做 4044。不做 20011。
 * 5001、51001 已有，勿重复。3099、3101、20101 勿再发。
 * 不做 3012、3010、12020、19001。4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 20101 分开发，勿合并。本刀不重复拉 20101，也不重复拉 3101，也不重复拉 3099。不写顶栏。
 * 页上写明 towerService.getTower 无档可 towerDao.add 轻懒建。handler 不走门票回复，不 updateTower。
 * 无扣费，无领奖，无养成写。轻懒建可接受。
 * 这一帧只在 20101 之后发一次。无 page。空帧 04000000830c0000。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireTowerRewardHead,
  formatWireTowerRewardLine,
  WIRE_TOWER_REWARD_FIELD_NOTE,
  WIRE_TOWER_REWARD_READONLY_NOTE,
  WIRE_TOWER_REWARD_READONLY_TITLE,
  WIRE_TOWER_REWARD_SIDE_EFFECT,
  WIRE_TOWER_REWARD_UNSYNCED_TOAST,
} from "../net/protocol/wireTowerReward";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 28, 52, 255);
const TITLE = new Color(228, 214, 236, 255);
const MUTED = new Color(186, 172, 200, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireTowerRewardHost {
  alive(): boolean;
  close(): void;
}

export interface WireTowerRewardPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireTowerRewardPage(host: WireTowerRewardHost): WireTowerRewardPage {
  return new WireTowerRewardController(host);
}

class WireTowerRewardController implements WireTowerRewardPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireTowerRewardHost) {
    this.node = uiNode("WireTowerRewardPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.towerReward;
    GameLog.shared.info("TowerReward", "wire open " + (snap ? "list=" + snap.list.length : "unsynced"));
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
    place(createLabel(WIRE_TOWER_REWARD_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_TOWER_REWARD_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 210 }), this.body, 0, 400);
    place(createLabel(WIRE_TOWER_REWARD_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 160 }), this.body, 0, 210);
    place(createLabel(WIRE_TOWER_REWARD_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 80 }), this.body, 0, 90);
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
    const snap = WireSession.towerReward;
    if (!snap) {
      place(createLabel(WIRE_TOWER_REWARD_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 20);
      return;
    }
    place(createLabel(formatWireTowerRewardHead(snap), 20, { color: TITLE, width: 640, height: 72 }), rows, 0, 20);
    const visible = Math.min(snap.list.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireTowerRewardLine(snap.list[i]), 18, { color: TITLE, width: 640, height: 36, align: "left" }),
        rows,
        0,
        -50 - i * 40
      );
    }
    if (snap.list.length > visible) {
      place(
        createLabel("还有 " + (snap.list.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        -50 - visible * 40
      );
    }
  }
}
