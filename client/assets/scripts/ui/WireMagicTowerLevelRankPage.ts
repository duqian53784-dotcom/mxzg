/**
 * 真服关卡榜只读页。只展示 s2c 76520 里实际出现的字段。
 * self、list 按声明顺序是字段 1、2。行内 rid、server_id、name、border_id、head_id、pass_level、pass_time、rank 按声明顺序是字段 1–8。
 * 没有的数不写成 0，也不补一项。出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。
 * 不发 76501–76506。不发 76543、76544。备选 76251 本轮不做。不重复拉 76542。不做 75001。不做 73002。不做 71001。不做 20011。
 * 不夹发 74121、74122。不是圣诞连线 76081。不是出游寻春 76301。5001、51001、68001、70001 已有，勿重复。76081、76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 与 76081 分开发，勿合并。不并入 76081。本刀不重复拉 76081，也不重复拉 76301，也不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。不写顶栏。
 * 页上写明纯读可接受。无扣费，无领奖，无养成写。
 * 这一帧只在 76081 之后发一次。无 page，无 FIELD。空帧 04000000e82a0100。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireMagicTowerLevelRankLine,
  WIRE_MAGIC_TOWER_LEVEL_RANK_FIELD_NOTE,
  WIRE_MAGIC_TOWER_LEVEL_RANK_READONLY_NOTE,
  WIRE_MAGIC_TOWER_LEVEL_RANK_READONLY_TITLE,
  WIRE_MAGIC_TOWER_LEVEL_RANK_SIDE_EFFECT,
  WIRE_MAGIC_TOWER_LEVEL_RANK_UNSYNCED_TOAST,
} from "../net/protocol/wireMagicTowerLevelRank";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(24, 32, 40, 255);
const TITLE = new Color(210, 224, 236, 255);
const MUTED = new Color(160, 184, 204, 255);
const BACK_FILL = new Color(36, 88, 128, 255);

export interface WireMagicTowerLevelRankHost {
  alive(): boolean;
  close(): void;
}

export interface WireMagicTowerLevelRankPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireMagicTowerLevelRankPage(host: WireMagicTowerLevelRankHost): WireMagicTowerLevelRankPage {
  return new WireMagicTowerLevelRankController(host);
}

class WireMagicTowerLevelRankController implements WireMagicTowerLevelRankPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireMagicTowerLevelRankHost) {
    this.node = uiNode("WireMagicTowerLevelRankPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.magicTowerLevelRank;
    GameLog.shared.info("MagicTowerLevelRank", "wire open " + (snap ? formatWireMagicTowerLevelRankLine(snap) : "unsynced"));
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
    place(createLabel(WIRE_MAGIC_TOWER_LEVEL_RANK_READONLY_TITLE, 32, { color: TITLE, width: 640 }), this.body, 0, 540);
    place(createLabel(WIRE_MAGIC_TOWER_LEVEL_RANK_SIDE_EFFECT, 18, { color: TITLE, width: 640, height: 280 }), this.body, 0, 340);
    place(createLabel(WIRE_MAGIC_TOWER_LEVEL_RANK_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 220 }), this.body, 0, 80);
    place(createLabel(WIRE_MAGIC_TOWER_LEVEL_RANK_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 120 }), this.body, 0, -40);
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
    const snap = WireSession.magicTowerLevelRank;
    if (!snap) {
      place(createLabel(WIRE_MAGIC_TOWER_LEVEL_RANK_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, -140);
      return;
    }
    place(
      createLabel(formatWireMagicTowerLevelRankLine(snap), 24, { color: TITLE, width: 640, height: 220 }),
      rows,
      0,
      -140
    );
  }
}
