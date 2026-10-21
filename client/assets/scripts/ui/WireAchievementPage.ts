/**
 * 真服成就记录只读页。展示 s2c 12010 的 idx / process / state。
 * 不领奖，不改 state，不写顶栏。同步可能在服上补成就。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireAchievementLine,
  WIRE_ACHIEVEMENT_EMPTY,
  WIRE_ACHIEVEMENT_FIELD_NOTE,
  WIRE_ACHIEVEMENT_READONLY_NOTE,
  WIRE_ACHIEVEMENT_READONLY_TITLE,
  WIRE_ACHIEVEMENT_SIDE_EFFECT,
  WIRE_ACHIEVEMENT_UNSYNCED_TOAST,
} from "../net/protocol/wireAchievement";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 22;

export interface WireAchievementHost {
  alive(): boolean;
  close(): void;
}

export interface WireAchievementPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireAchievementPage(host: WireAchievementHost): WireAchievementPage {
  return new WireAchievementController(host);
}

class WireAchievementController implements WireAchievementPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;

  constructor(private readonly host: WireAchievementHost) {
    this.node = uiNode("WireAchievementPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const snap = WireSession.achievements;
    GameLog.shared.info("Achievement", "wire open " + (snap ? snap.tasks.length : "unsynced"));
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
    place(createLabel(WIRE_ACHIEVEMENT_READONLY_TITLE, 36, { color: TITLE }), this.body, 0, 520);
    place(createLabel(WIRE_ACHIEVEMENT_SIDE_EFFECT, 22, { color: TITLE, width: 640 }), this.body, 0, 470);
    place(createLabel(WIRE_ACHIEVEMENT_READONLY_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 430);
    place(createLabel(WIRE_ACHIEVEMENT_FIELD_NOTE, 18, { color: MUTED, width: 640 }), this.body, 0, 396);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -520);
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
    const snap = WireSession.achievements;
    if (!snap) {
      place(createLabel(WIRE_ACHIEVEMENT_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 320);
      return;
    }
    if (snap.tasks.length === 0) {
      place(createLabel(WIRE_ACHIEVEMENT_EMPTY, 28, { color: TITLE, width: 640 }), rows, 0, 320);
      return;
    }
    const top = 340;
    const step = 28;
    const visible = Math.min(snap.tasks.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      place(
        createLabel(formatWireAchievementLine(snap.tasks[i]), 20, {
          color: TITLE,
          width: 640,
          align: "left",
        }),
        rows,
        0,
        top - i * step
      );
    }
    if (snap.tasks.length > visible) {
      place(
        createLabel("还有 " + (snap.tasks.length - visible) + " 条", 18, { color: MUTED, width: 640 }),
        rows,
        0,
        top - visible * step
      );
    }
  }
}
