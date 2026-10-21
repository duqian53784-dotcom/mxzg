/**
 * 真服头像列表只读页。展示 s2c 34001 的 repeated int32 idx_list（已解锁头像 id）。
 * 没有的数不写成 0。出现的 0 仍写 0。
 * 无更换入口。不发 34002。34003 仅为解锁推送，无 c2s，勿当拉包、勿当写号。
 * 不做 32001。不做 20011。不写顶栏。
 * 页上写明轻懒建：RoleHeadPortraitService.select 无记录则 dao.add 默认解锁头。无扣费，无领奖，不改当前头像。
 * 这一帧只在 55001 之后发一次。无 page。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireHeadPortraitHead,
  formatWireHeadPortraitLine,
  WIRE_HEAD_PORTRAIT_FIELD_NOTE,
  WIRE_HEAD_PORTRAIT_READONLY_NOTE,
  WIRE_HEAD_PORTRAIT_READONLY_TITLE,
  WIRE_HEAD_PORTRAIT_SIDE_EFFECT,
  WIRE_HEAD_PORTRAIT_UNSYNCED_TOAST,
} from "../net/protocol/wireHeadPortrait";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 28, 22, 255);
const TITLE = new Color(232, 210, 176, 255);
const MUTED = new Color(204, 186, 160, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireHeadPortraitHost {
  alive(): boolean;
  close(): void;
}

export interface WireHeadPortraitPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireHeadPortraitPage(host: WireHeadPortraitHost): WireHeadPortraitPage {
  return new WireHeadPortraitController(host);
}

class WireHeadPortraitController implements WireHeadPortraitPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireHeadPortraitHost) {
    this.node = uiNode("WireHeadPortraitPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.headPortrait;
    GameLog.shared.info("HeadPortrait", "wire open " + (snap ? "idx_list=" + snap.idxList.length : "unsynced"));
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
    place(createLabel(WIRE_HEAD_PORTRAIT_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_HEAD_PORTRAIT_SIDE_EFFECT, 20, { color: TITLE, width: 640, height: 120 }), this.body, 0, 450);
    place(createLabel(WIRE_HEAD_PORTRAIT_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 110 }), this.body, 0, 330);
    place(createLabel(WIRE_HEAD_PORTRAIT_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 230);
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
    const snap = WireSession.headPortrait;
    if (!snap) {
      place(createLabel(WIRE_HEAD_PORTRAIT_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 160);
      return;
    }
    place(createLabel(formatWireHeadPortraitHead(snap), 20, { color: TITLE, width: 640, height: 96 }), rows, 0, 150);
    const visible = Math.min(snap.idxList.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireHeadPortraitLine(snap.idxList[i]), 20, { color: TITLE, width: 640, height: 40, align: "left" }),
        rows,
        0,
        80 - i * 40
      );
    }
    if (snap.idxList.length > visible) {
      place(
        createLabel("还有 " + (snap.idxList.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        80 - visible * 40
      );
    }
  }
}
