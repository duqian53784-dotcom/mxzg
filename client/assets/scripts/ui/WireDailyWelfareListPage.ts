/**
 * 真服每日福利列表只读页。只展示 s2c 26002 里实际出现的字段。
 * list 是 repeated PSMapData，key 是 giftPackId，value 是 num。
 * 没有的数不写成 0，也不补一项。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 无领奖入口。26001 每月福利列表另只读接在其后，勿合并。不发明领奖写号。不发 12021。不发 12022。不做 20011。
 * 不是启动链 12010。不是每日任务列表 12020。5001、51001 已有，勿重复。12020、13010、4044、3203、20101、3101、3099 勿再发。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 12020 分开发，勿合并。本刀不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。不是启动链 12010。不写顶栏。
 * 页上写明纯读。轻副作用可接受。无扣费，无领奖写。
 * 这一帧只在 12020 之后发一次。无 page。空帧 0400000092650000。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireDailyWelfareListLine,
  WIRE_DAILY_WELFARE_LIST_FIELD_NOTE,
  WIRE_DAILY_WELFARE_LIST_READONLY_NOTE,
  WIRE_DAILY_WELFARE_LIST_READONLY_TITLE,
  WIRE_DAILY_WELFARE_LIST_SIDE_EFFECT,
  WIRE_DAILY_WELFARE_LIST_UNSYNCED_TOAST,
} from "../net/protocol/wireDailyWelfareList";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(32, 40, 56, 255);
const TITLE = new Color(214, 224, 240, 255);
const MUTED = new Color(168, 184, 210, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface WireDailyWelfareListHost {
  alive(): boolean;
  close(): void;
}

export interface WireDailyWelfareListPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireDailyWelfareListPage(host: WireDailyWelfareListHost): WireDailyWelfareListPage {
  return new WireDailyWelfareListController(host);
}

class WireDailyWelfareListController implements WireDailyWelfareListPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireDailyWelfareListHost) {
    this.node = uiNode("WireDailyWelfareListPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.dailyWelfareList;
    GameLog.shared.info("DailyWelfareList", "wire open " + (snap ? formatWireDailyWelfareListLine(snap) : "unsynced"));
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
    place(createLabel(WIRE_DAILY_WELFARE_LIST_READONLY_TITLE, 32, { color: TITLE, width: 640 }), this.body, 0, 540);
    place(createLabel(WIRE_DAILY_WELFARE_LIST_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 240 }), this.body, 0, 360);
    place(createLabel(WIRE_DAILY_WELFARE_LIST_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 180 }), this.body, 0, 140);
    place(createLabel(WIRE_DAILY_WELFARE_LIST_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 100 }), this.body, 0, 10);
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
    const snap = WireSession.dailyWelfareList;
    if (!snap) {
      place(createLabel(WIRE_DAILY_WELFARE_LIST_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, -80);
      return;
    }
    place(
      createLabel(formatWireDailyWelfareListLine(snap), 26, { color: TITLE, width: 640, height: 160 }),
      rows,
      0,
      -80
    );
  }
}
