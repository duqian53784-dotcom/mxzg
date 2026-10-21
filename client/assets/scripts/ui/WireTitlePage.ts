/**
 * 真服称号列表只读页。展示 s2c 55001 的 repeated PSTitle titles（idx、end_time）。
 * end_time：-1 永久，0 未激活，时间戳为到期。没有的数不写成 0。
 * 无扣费、领奖、日刷入口。Title.proto 仅 55001 读写对，同模块无写号。
 * 不做 34001。不做 20011。不写顶栏。
 * 页上写明轻懒建：TitleService.getTitle → dao.add。无扣费，无领奖，无日刷。
 * 这一帧只在 59010 之后发一次。无 page。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireTitleHead,
  formatWireTitleLine,
  WIRE_TITLE_FIELD_NOTE,
  WIRE_TITLE_READONLY_NOTE,
  WIRE_TITLE_READONLY_TITLE,
  WIRE_TITLE_SIDE_EFFECT,
  WIRE_TITLE_UNSYNCED_TOAST,
} from "../net/protocol/wireTitle";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 28, 22, 255);
const TITLE = new Color(232, 210, 176, 255);
const MUTED = new Color(204, 186, 160, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireTitleHost {
  alive(): boolean;
  close(): void;
}

export interface WireTitlePage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireTitlePage(host: WireTitleHost): WireTitlePage {
  return new WireTitleController(host);
}

class WireTitleController implements WireTitlePage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireTitleHost) {
    this.node = uiNode("WireTitlePage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.titleList;
    GameLog.shared.info("TitleList", "wire open " + (snap ? "titles=" + snap.titles.length : "unsynced"));
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
    place(createLabel(WIRE_TITLE_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_TITLE_SIDE_EFFECT, 20, { color: TITLE, width: 640, height: 120 }), this.body, 0, 450);
    place(createLabel(WIRE_TITLE_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 110 }), this.body, 0, 330);
    place(createLabel(WIRE_TITLE_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 230);
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
    const snap = WireSession.titleList;
    if (!snap) {
      place(createLabel(WIRE_TITLE_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 160);
      return;
    }
    place(createLabel(formatWireTitleHead(snap), 20, { color: TITLE, width: 640, height: 96 }), rows, 0, 150);
    const visible = Math.min(snap.titles.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireTitleLine(snap.titles[i]), 20, { color: TITLE, width: 640, height: 40, align: "left" }),
        rows,
        0,
        80 - i * 40
      );
    }
    if (snap.titles.length > visible) {
      place(
        createLabel("还有 " + (snap.titles.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        80 - visible * 40
      );
    }
  }
}
