/**
 * 真服邮件只读页。只展示 s2c 15000 解开的标题和有无附件。
 * 不领取，不删除，不写顶栏。字段 3、字段 4 只在 GameLog。Mock 邮件页仍是 MailPage。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireMailLine,
  WIRE_MAIL_EMPTY,
  WIRE_MAIL_READONLY_NOTE,
  WIRE_MAIL_READONLY_TITLE,
  WIRE_MAIL_STATUS_NOTE,
  WIRE_MAIL_UNSYNCED_TOAST,
} from "../net/protocol/wireMail";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 10;

export interface WireMailHost {
  alive(): boolean;
  close(): void;
}

export interface WireMailPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireMailPage(host: WireMailHost): WireMailPage {
  return new WireMailController(host);
}

class WireMailController implements WireMailPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireMailHost) {
    this.node = uiNode("WireMailPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const entries = WireSession.mailEntries;
    GameLog.shared.info("Mail", "wire open " + (entries ? entries.length : "unsynced"));
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
    place(createLabel(WIRE_MAIL_READONLY_TITLE, 40, { color: TITLE }), this.body, 0, 470);
    place(createLabel(WIRE_MAIL_READONLY_NOTE, 22, { color: MUTED, width: 640 }), this.body, 0, 420);
    place(createLabel(WIRE_MAIL_STATUS_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 380);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -460);
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
    const entries = WireSession.mailEntries;
    if (!entries) {
      place(createLabel(WIRE_MAIL_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 280);
      return;
    }
    if (entries.length === 0) {
      place(createLabel(WIRE_MAIL_EMPTY, 28, { color: TITLE, width: 640 }), rows, 0, 280);
      return;
    }
    const visible = Math.min(entries.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireMailLine(entries[i]), 22, {
          color: TITLE,
          width: 640,
          align: "left",
        }),
        rows,
        0,
        320 - i * 44
      );
    }
    if (entries.length > visible) {
      place(
        createLabel("还有 " + (entries.length - visible) + " 封", 20, { color: MUTED, width: 640 }),
        rows,
        0,
        320 - visible * 44
      );
    }
  }
}
