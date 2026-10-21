/**
 * 真服圣物图鉴只读页。展示 s2c 59010 的 repeated int32 sys_id（图鉴 manuals）。
 * 没有放源石、提升鉴定、加速鉴定、鉴定领奖、提升圣龙等级、圣物替换、调顺序、升星、分解按钮。
 * 不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。
 * 勿与 59001 合并成一个请求。不做 34001。不做 20011。不写顶栏。
 * 页上写明轻懒建：与 59001 同 getDragon / dragonDao.add。无扣费，无领奖。
 * 这一帧只在 59001 之后发一次。无 page。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireDragonCollectionHead,
  formatWireDragonCollectionLine,
  WIRE_DRAGON_COLLECTION_FIELD_NOTE,
  WIRE_DRAGON_COLLECTION_READONLY_NOTE,
  WIRE_DRAGON_COLLECTION_READONLY_TITLE,
  WIRE_DRAGON_COLLECTION_SIDE_EFFECT,
  WIRE_DRAGON_COLLECTION_UNSYNCED_TOAST,
} from "../net/protocol/wireDragonCollection";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 28, 22, 255);
const TITLE = new Color(232, 210, 176, 255);
const MUTED = new Color(204, 186, 160, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireDragonCollectionHost {
  alive(): boolean;
  close(): void;
}

export interface WireDragonCollectionPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireDragonCollectionPage(host: WireDragonCollectionHost): WireDragonCollectionPage {
  return new WireDragonCollectionController(host);
}

class WireDragonCollectionController implements WireDragonCollectionPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireDragonCollectionHost) {
    this.node = uiNode("WireDragonCollectionPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.dragonCollection;
    GameLog.shared.info("DragonCollection", "wire open " + (snap ? "sys_id=" + snap.sysIds.length : "unsynced"));
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
    place(createLabel(WIRE_DRAGON_COLLECTION_READONLY_TITLE, 34, { color: TITLE }), this.body, 0, 540);
    place(createLabel(WIRE_DRAGON_COLLECTION_SIDE_EFFECT, 20, { color: TITLE, width: 640, height: 120 }), this.body, 0, 450);
    place(createLabel(WIRE_DRAGON_COLLECTION_READONLY_NOTE, 18, { color: MUTED, width: 640, height: 110 }), this.body, 0, 330);
    place(createLabel(WIRE_DRAGON_COLLECTION_FIELD_NOTE, 18, { color: MUTED, width: 640, height: 72 }), this.body, 0, 230);
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
    const snap = WireSession.dragonCollection;
    if (!snap) {
      place(createLabel(WIRE_DRAGON_COLLECTION_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 160);
      return;
    }
    place(createLabel(formatWireDragonCollectionHead(snap), 20, { color: TITLE, width: 640, height: 96 }), rows, 0, 150);
    const visible = Math.min(snap.sysIds.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireDragonCollectionLine(snap.sysIds[i]), 20, { color: TITLE, width: 640, height: 40, align: "left" }),
        rows,
        0,
        80 - i * 40
      );
    }
    if (snap.sysIds.length > visible) {
      place(
        createLabel("还有 " + (snap.sysIds.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        80 - visible * 40
      );
    }
  }
}
