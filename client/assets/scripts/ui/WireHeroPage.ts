/**
 * 真服英雄只读页。展示 s2c 4001 的类型、id、等级、星级和战力。
 * 列表点进去是详情。不升级，不写顶栏。Mock 英雄页仍是 HeroPage。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireHeroDetail,
  formatWireHeroLine,
  WIRE_HERO_EMPTY,
  WIRE_HERO_FIELD_NOTE,
  WIRE_HERO_READONLY_NOTE,
  WIRE_HERO_READONLY_TITLE,
  WIRE_HERO_UNSYNCED_TOAST,
  WireHeroEntry,
} from "../net/protocol/wireHero";
import { createButton, createLabel, createRect, place, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const ROW_FILL = new Color(28, 48, 84, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const VISIBLE_ROWS = 8;

export interface WireHeroHost {
  alive(): boolean;
  close(): void;
}

export interface WireHeroPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildWireHeroPage(host: WireHeroHost): WireHeroPage {
  return new WireHeroController(host);
}

class WireHeroController implements WireHeroPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly listHost: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;
  private selected = -1;

  constructor(private readonly host: WireHeroHost) {
    this.node = uiNode("WireHeroPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.listHost = place(uiNode("list-host"), this.body, 0, 0);
    this.build();
    this.render();
    const heroes = WireSession.heroes;
    GameLog.shared.info("Hero", "wire open " + (heroes ? heroes.length : "unsynced"));
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
    place(createLabel(WIRE_HERO_READONLY_TITLE, 40, { color: TITLE }), this.body, 0, 470);
    place(createLabel(WIRE_HERO_READONLY_NOTE, 22, { color: MUTED, width: 640 }), this.body, 0, 420);
    place(createLabel(WIRE_HERO_FIELD_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 380);
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
    const heroes = WireSession.heroes;
    if (!heroes) {
      this.selected = -1;
      place(createLabel(WIRE_HERO_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 280);
      return;
    }
    if (this.selected >= heroes.length) this.selected = -1;
    if (heroes.length === 0) {
      this.selected = -1;
      place(createLabel(WIRE_HERO_EMPTY, 28, { color: TITLE, width: 640 }), rows, 0, 280);
      return;
    }
    if (this.selected >= 0) {
      this.renderDetail(rows, heroes[this.selected]);
      return;
    }
    const visible = Math.min(heroes.length, VISIBLE_ROWS);
    for (let i = 0; i < visible; i++) {
      const index = i;
      place(
        createButton(
          formatWireHeroLine(heroes[i]),
          () => this.openDetail(index),
          640,
          44,
          ROW_FILL,
          20
        ),
        rows,
        0,
        300 - i * 52
      );
    }
    if (heroes.length > visible) {
      place(
        createLabel("还有 " + (heroes.length - visible) + " 名", 20, { color: MUTED, width: 640 }),
        rows,
        0,
        300 - visible * 52
      );
    }
  }

  private openDetail(index: number): void {
    if (this.disposed) return;
    this.selected = index;
    const heroes = WireSession.heroes;
    const entry = heroes && heroes[index] ? heroes[index] : null;
    GameLog.shared.info("Hero", "wire detail " + (entry ? formatWireHeroLine(entry) : "missing"));
    this.render();
  }

  private renderDetail(rows: Node, entry: WireHeroEntry): void {
    const lines = formatWireHeroDetail(entry);
    for (let i = 0; i < lines.length; i++) {
      place(
        createLabel(lines[i], 24, { color: TITLE, width: 640, align: "left" }),
        rows,
        0,
        300 - i * 40
      );
    }
    place(createButton("返回列表", () => this.closeDetail(), 240, 48, ROW_FILL), rows, 0, 300 - lines.length * 40 - 24);
  }

  private closeDetail(): void {
    if (this.disposed) return;
    this.selected = -1;
    this.render();
  }
}
