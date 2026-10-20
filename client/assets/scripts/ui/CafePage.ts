/**
 * 咖啡馆招待。选出 1 到 2 名英雄派出，立刻领取金币和咖啡豆。
 * 不改 .scene。玩法列表「咖啡馆」在主线 Lv12 打开本页。返回走页面栈。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applyCafeClaim,
  CAFE_MAX_HEROES,
  cafeAttemptsLine,
  cafeBusyToast,
  cafeClaimButton,
  cafeClaimToast,
  cafeEmptyToast,
  cafeFailToast,
  cafeHeroRow,
  cafeNoHeroToast,
  cafePreviewLine,
  cafeSendButton,
  cafeSendToast,
  cafeStatusLine,
  cafeTooManyToast,
  cafeWalletLine,
  joinNames,
} from "../module/cafe/serve";
import { CafeClaimResp, CafeHero, CafeSendResp, CafeViewResp } from "../net/protocol/types";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(42, 24, 18, 255);
const TITLE = new Color(255, 214, 160, 255);
const MUTED = new Color(220, 196, 176, 255);
const STAT = new Color(255, 228, 180, 255);
const ROW_FILL = new Color(112, 68, 40, 255);
const PICKED_FILL = new Color(168, 96, 42, 255);
const SERVING_FILL = new Color(86, 58, 72, 255);
const SEND_FILL = new Color(176, 112, 36, 255);
const CLAIM_FILL = new Color(46, 122, 86, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface CafeHost {
  showToast(text: string): void;
  alive(): boolean;
  view(): Promise<CafeViewResp>;
  send(heroIds: number[]): Promise<CafeSendResp>;
  claim(): Promise<CafeClaimResp>;
  onProgress(): void;
  close(): void;
}

export interface CafePage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildCafePage(host: CafeHost): CafePage {
  return new CafeController(host);
}

class CafeController implements CafePage {
  readonly node: Node;
  private readonly body: Node;
  private readonly rowsHost: Node;
  private disposed = false;
  private busy = false;
  private ticket = 0;
  private toldError = false;
  private selected: number[] = [];
  private heroes: CafeHero[] = [];
  private used = 0;
  private limit = 0;
  private servingCount = 0;
  private ready = false;
  private lastView: CafeViewResp | null = null;
  private attemptsLabel: Node | null = null;
  private walletLabel: Node | null = null;
  private statusLabel: Node | null = null;
  private resultLabel: Node | null = null;
  private sendButton: Node | null = null;
  private claimButton: Node | null = null;
  private backButton: Node | null = null;
  private lastReport = "选出 1 到 2 名英雄，点派出招待，再领取金币和咖啡豆";

  constructor(private readonly host: CafeHost) {
    this.node = uiNode("CafePage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    place(createLabel("咖啡馆", 40, { color: TITLE }), this.body, 0, 520);
    place(
      createLabel("主线 Lv12 开启。选出英雄招待，派出后立刻可领", 18, { color: MUTED, width: 640 }),
      this.body,
      0,
      468
    );
    this.attemptsLabel = place(createLabel("读取中…", 26, { color: STAT, width: 640 }), this.body, 0, 416);
    this.walletLabel = place(createLabel("", 22, { color: MUTED, width: 640 }), this.body, 0, 372);
    place(createLabel(cafePreviewLine(), 18, { color: MUTED, width: 640, height: 56 }), this.body, 0, 318);
    this.statusLabel = place(createLabel("", 20, { color: STAT, width: 640 }), this.body, 0, 260);
    this.rowsHost = place(uiNode("rows-host"), this.body, 0, 0);
    this.sendButton = place(createButton("派出招待", () => void this.send(), 560, 56, SEND_FILL, 22), this.body, 0, -40);
    this.claimButton = place(createButton("领取招待", () => void this.claim(), 560, 56, CLAIM_FILL, 22), this.body, 0, -112);
    this.resultLabel = place(
      createLabel(this.lastReport, 18, { color: MUTED, width: 640, height: 72 }),
      this.body,
      0,
      -190
    );
    this.backButton = place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -270);
    GameLog.shared.info("Cafe", "open");
    void this.refresh();
  }

  reload(): void {
    if (this.disposed) return;
    void this.refresh();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.ticket += 1;
  }

  private async refresh(): Promise<void> {
    if (this.disposed) return;
    const ticket = ++this.ticket;
    try {
      const view = await this.host.view();
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      if (!view.ok) {
        this.noteError(errorText(view.code ?? ErrorCode.UNKNOWN_CMD));
        return;
      }
      this.toldError = false;
      this.render(view);
    } catch (err) {
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      this.noteError(messageOf(err));
    }
  }

  private render(view: CafeViewResp): void {
    this.lastView = view;
    const heroes = view.heroes || [];
    this.heroes = heroes;
    this.used = view.used;
    this.limit = view.limit;
    this.servingCount = finite(view.servingCount);
    this.ready = view.ready === true && this.servingCount > 0;
    if (this.servingCount > 0) this.selected = [];
    else this.selected = keepIds(this.selected, heroes);
    const names = servingNames(heroes);
    this.write(this.attemptsLabel, cafeAttemptsLine(view.used, view.limit));
    this.write(this.walletLabel, cafeWalletLine(view.gold, view.beanOwned));
    this.write(this.statusLabel, cafeStatusLine(names, this.ready));
    this.write(this.resultLabel, this.lastReport);
    this.write(
      labelOf(this.sendButton),
      cafeSendButton(this.selected.length, view.used, view.limit, this.servingCount > 0)
    );
    this.write(labelOf(this.claimButton), cafeClaimButton(this.ready));
    this.layoutActions(heroes.length);
    const old = this.rowsHost.getChildByName("rows");
    if (old) {
      old.parent = null;
      if (old.isValid) old.destroy();
    }
    const rows = uiNode("rows");
    rows.parent = this.rowsHost;
    const top = 200;
    const step = 44;
    for (let i = 0; i < heroes.length; i++) {
      const hero = heroes[i];
      const picked = indexOf(this.selected, hero.id) >= 0;
      const serving = hero.serving === true;
      const fill = serving ? SERVING_FILL : picked ? PICKED_FILL : ROW_FILL;
      const button = createButton(
        cafeHeroRow(hero.name, hero.level, picked, serving),
        () => this.toggle(hero.id),
        640,
        40,
        fill,
        18
      );
      place(button, rows, 0, top - i * step);
    }
  }

  private layoutActions(count: number): void {
    const base = 200 - finite(count) * 44 - 36;
    move(this.sendButton, base);
    move(this.claimButton, base - 68);
    move(this.resultLabel, base - 140);
    move(this.backButton, base - 220);
  }

  private toggle(id: number): void {
    if (this.disposed) return;
    if (this.servingCount > 0) {
      this.host.showToast(cafeBusyToast());
      return;
    }
    const index = indexOf(this.selected, id);
    if (index >= 0) {
      this.selected.splice(index, 1);
    } else if (this.selected.length >= CAFE_MAX_HEROES) {
      this.host.showToast(cafeTooManyToast());
      return;
    } else {
      this.selected.push(id);
    }
    if (this.lastView) this.render(this.lastView);
  }

  private async send(): Promise<void> {
    if (this.busy || this.disposed) return;
    if (this.heroes.length === 0) {
      this.host.showToast(cafeEmptyToast());
      return;
    }
    if (this.servingCount > 0) {
      this.host.showToast(cafeBusyToast());
      return;
    }
    if (this.selected.length === 0) {
      this.host.showToast(cafeNoHeroToast());
      return;
    }
    const heroIds = this.selected.slice();
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Cafe", "send " + heroIds.join(","));
    try {
      const resp = await this.host.send(heroIds);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = cafeFailToast(resp);
        GameLog.shared.warn("Cafe", text);
        this.host.showToast(text);
        void this.refresh();
        return;
      }
      const text = cafeSendToast(resp.names);
      this.lastReport = text;
      GameLog.shared.info("Cafe", text);
      this.host.showToast(text);
      this.selected = [];
      void this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Cafe", text);
      this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  private async claim(): Promise<void> {
    if (this.busy || this.disposed) return;
    if (!this.ready) {
      this.host.showToast(cafeFailToast({ code: ErrorCode.CAFE_NOTHING }));
      return;
    }
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Cafe", "claim");
    try {
      const resp = await this.host.claim();
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = cafeFailToast(resp);
        GameLog.shared.warn("Cafe", text);
        this.host.showToast(text);
        void this.refresh();
        return;
      }
      applyCafeClaim(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = cafeClaimToast(resp.goldGain, resp.itemName, resp.itemGain);
      this.lastReport = text + " · " + joinNames(resp.names);
      GameLog.shared.info("Cafe", text + " gold " + resp.gold);
      this.host.showToast(text);
      this.selected = [];
      void this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Cafe", text);
      this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Cafe", text);
    this.host.showToast(text);
    this.write(this.attemptsLabel, "暂时无法打开咖啡馆");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

function servingNames(heroes: CafeHero[]): string[] {
  const names: string[] = [];
  for (let i = 0; i < heroes.length; i++) {
    if (heroes[i].serving) names.push(heroes[i].name);
  }
  return names;
}

function keepIds(selected: number[], heroes: CafeHero[]): number[] {
  const next: number[] = [];
  for (let i = 0; i < selected.length; i++) {
    if (indexOfHero(heroes, selected[i]) >= 0) next.push(selected[i]);
  }
  return next;
}

function indexOf(ids: number[], id: number): number {
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === id) return i;
  }
  return -1;
}

function indexOfHero(heroes: CafeHero[], id: number): number {
  for (let i = 0; i < heroes.length; i++) {
    if (heroes[i].id === id) return i;
  }
  return -1;
}

function labelOf(button: Node | null): Node | null {
  if (!button) return null;
  return button.getChildByName("Label");
}

function move(node: Node | null, y: number): void {
  if (node && node.isValid) node.setPosition(0, y, 0);
}

function finite(value: number | undefined): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.floor(value);
}
