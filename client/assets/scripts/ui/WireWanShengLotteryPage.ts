/**
 * 真服万圣抽奖只读页。只展示 s2c 75901 里实际出现的字段。活动 WAN_SHENG_LOTTERY / promo078。
 * select_info、lottery_reward 按内层字段号写，不发明行名字。lottery_count、lottery_best_remaining_count、last_lottery_id 是标量。
 * 没有的数不写成 0，也不补一项。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 无选档、无抽奖、无领次数奖入口。不发 75902。不发 75903。不发 75904。不夹发 75931、75932。不夹发 75941–75944。76001 黑五活动另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。
 * 不夹发 74121、74122。不是秋赏明月 75801。5001、51001、68001、70001 已有，勿重复。75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 75801 分开发，勿合并。不并入 75801。本刀不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。不写顶栏。
 * 页上写明轻懒建（getPromotionInfo）可接受。轮次清 select/次数/记录可接受。非开启回默认可接受。无扣费，无领奖，无抽奖。
 * 这一帧只在 75801 之后发一次。无 page，无 FIELD。空帧 040000007d280100。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireWanShengLotteryLine,
  WIRE_WAN_SHENG_LOTTERY_FIELD_NOTE,
  WIRE_WAN_SHENG_LOTTERY_READONLY_NOTE,
  WIRE_WAN_SHENG_LOTTERY_READONLY_TITLE,
  WIRE_WAN_SHENG_LOTTERY_SIDE_EFFECT,
  WIRE_WAN_SHENG_LOTTERY_UNSYNCED_TOAST,
} from "../net/protocol/wireWanShengLottery";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 28, 48, 255);
const TITLE = new Color(214, 224, 240, 255);
const MUTED = new Color(168, 184, 210, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface WireWanShengLotteryHost {
  alive(): boolean;
  close(): void;
}

export interface WireWanShengLotteryPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireWanShengLotteryPage(host: WireWanShengLotteryHost): WireWanShengLotteryPage {
  return new WireWanShengLotteryController(host);
}

class WireWanShengLotteryController implements WireWanShengLotteryPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireWanShengLotteryHost) {
    this.node = uiNode("WireWanShengLotteryPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.wanShengLottery;
    GameLog.shared.info("WanShengLottery", "wire open " + (snap ? formatWireWanShengLotteryLine(snap) : "unsynced"));
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
    place(createLabel(WIRE_WAN_SHENG_LOTTERY_READONLY_TITLE, 32, { color: TITLE, width: 640 }), this.body, 0, 540);
    place(createLabel(WIRE_WAN_SHENG_LOTTERY_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 280 }), this.body, 0, 340);
    place(createLabel(WIRE_WAN_SHENG_LOTTERY_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 220 }), this.body, 0, 80);
    place(createLabel(WIRE_WAN_SHENG_LOTTERY_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 120 }), this.body, 0, -40);
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
    const snap = WireSession.wanShengLottery;
    if (!snap) {
      place(createLabel(WIRE_WAN_SHENG_LOTTERY_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, -140);
      return;
    }
    place(
      createLabel(formatWireWanShengLotteryLine(snap), 24, { color: TITLE, width: 640, height: 220 }),
      rows,
      0,
      -140
    );
  }
}
