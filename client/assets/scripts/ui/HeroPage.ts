/**
 * 英雄列表和详情（C5）。升级消耗金币，星级只展示。
 * 不改 .scene。底栏「英雄」打开列表，点一名英雄再压一层详情。返回走页面栈。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applyHeroUpgrade,
  heroLevelText,
  heroRowText,
  missingHeroToast,
  ownedGoldText,
  upgradeButtonText,
  upgradeFailToast,
  upgradeToast,
} from "../module/hero/growth";
import { weaponLineText } from "../module/smith/forge";
import { HeroCard, HeroListResp, HeroUpgradeResp } from "../net/protocol/types";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const STAT = new Color(255, 214, 120, 255);
const ROW_FILL = new Color(36, 72, 120, 255);
const UPGRADE_FILL = new Color(168, 116, 42, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface HeroListHost {
  showToast(text: string): void;
  alive(): boolean;
  list(): Promise<HeroListResp>;
  openHero(heroId: number): void;
  close(): void;
}

export interface HeroDetailHost {
  heroId(): number;
  showToast(text: string): void;
  alive(): boolean;
  list(): Promise<HeroListResp>;
  upgrade(heroId: number): Promise<HeroUpgradeResp>;
  onProgress(): void;
  close(): void;
}

export interface HeroListPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export interface HeroDetailPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildHeroList(host: HeroListHost): HeroListPage {
  return new HeroListController(host);
}

export function buildHeroDetail(host: HeroDetailHost): HeroDetailPage {
  return new HeroDetailController(host);
}

class HeroListController implements HeroListPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly rowsHost: Node;
  private disposed = false;
  private ticket = 0;
  private toldError = false;
  private countLabel: Node | null = null;

  constructor(private readonly host: HeroListHost) {
    this.node = uiNode("HeroListPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    place(createLabel("英雄", 40, { color: TITLE }), this.body, 0, 470);
    this.countLabel = place(createLabel("读取英雄…", 20, { color: MUTED, width: 640 }), this.body, 0, 410);
    this.rowsHost = place(uiNode("rows-host"), this.body, 0, 0);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -420);
    GameLog.shared.info("Hero", "open list");
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
      const view = await this.host.list();
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      if (!view.ok) {
        this.noteError(errorText(view.code ?? ErrorCode.UNKNOWN_CMD));
        return;
      }
      this.toldError = false;
      this.render(view.heroes || []);
    } catch (err) {
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      this.noteError(messageOf(err));
    }
  }

  private render(heroes: HeroCard[]): void {
    const count = heroes.length;
    this.write(this.countLabel, count === 0 ? "暂无英雄" : count + " 名英雄 · 点名字查看详情");
    const old = this.rowsHost.getChildByName("rows");
    if (old) {
      old.parent = null;
      if (old.isValid) old.destroy();
    }
    const rows = uiNode("rows");
    rows.parent = this.rowsHost;
    const top = 300;
    const step = 100;
    for (let i = 0; i < heroes.length; i++) {
      const hero = heroes[i];
      const button = createButton(
        heroRowText(hero.name, hero.level, hero.star) + " · 武器Lv" + (hero.weaponLevel || 1),
        () => {
          if (this.disposed) return;
          GameLog.shared.info("Hero", "open detail " + hero.id);
          this.host.openHero(hero.id);
        },
        600,
        76,
        ROW_FILL,
        24
      );
      place(button, rows, 0, top - i * step);
    }
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Hero", text);
    this.host.showToast(text);
    this.write(this.countLabel, "暂时无法读取英雄");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

class HeroDetailController implements HeroDetailPage {
  readonly node: Node;
  private readonly body: Node;
  private disposed = false;
  private busy = false;
  private ticket = 0;
  private toldError = false;
  private hero: HeroCard | null = null;
  private nameLabel: Node | null = null;
  private levelLabel: Node | null = null;
  private atkLabel: Node | null = null;
  private hpLabel: Node | null = null;
  private defLabel: Node | null = null;
  private weaponLabel: Node | null = null;
  private goldLabel: Node | null = null;
  private upgradeButton: Node | null = null;

  constructor(private readonly host: HeroDetailHost) {
    this.node = uiNode("HeroDetailPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.build();
    GameLog.shared.info("Hero", "open detail " + this.host.heroId());
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

  private build(): void {
    place(createLabel("英雄详情", 40, { color: TITLE }), this.body, 0, 470);
    this.nameLabel = place(createLabel("读取中…", 36, { color: TITLE, width: 640 }), this.body, 0, 390);
    this.levelLabel = place(createLabel("", 24, { color: MUTED, width: 640 }), this.body, 0, 330);
    place(createRect("card", 640, 220, new Color(16, 28, 48, 255)), this.body, 0, 170);
    this.atkLabel = place(createLabel("攻击 --", 26, { color: STAT, width: 560 }), this.body, 0, 230);
    this.hpLabel = place(createLabel("生命 --", 26, { color: STAT, width: 560 }), this.body, 0, 170);
    this.defLabel = place(createLabel("防御 --", 26, { color: STAT, width: 560 }), this.body, 0, 120);
    this.weaponLabel = place(createLabel("武器 --", 22, { color: STAT, width: 560 }), this.body, 0, 70);
    this.goldLabel = place(createLabel("持有金币 --", 22, { color: MUTED, width: 640 }), this.body, 0, 0);
    this.upgradeButton = place(
      createButton("升级", () => void this.upgrade(), 460, 68, UPGRADE_FILL),
      this.body,
      0,
      -80
    );
    place(
      createLabel("属性为占位。升级不改武器，武器到铁匠铺强化", 18, { color: MUTED, width: 640 }),
      this.body,
      0,
      -160
    );
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -250);
  }

  private async refresh(): Promise<void> {
    if (this.disposed) return;
    const ticket = ++this.ticket;
    const heroId = this.host.heroId();
    try {
      const view = await this.host.list();
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      if (!view.ok) {
        this.noteError(errorText(view.code ?? ErrorCode.UNKNOWN_CMD));
        return;
      }
      const hero = findHero(view.heroes || [], heroId);
      if (!hero) {
        this.hero = null;
        this.noteError(missingHeroToast());
        this.write(this.nameLabel, "未找到");
        this.write(this.goldLabel, ownedGoldText(view.gold));
        return;
      }
      this.toldError = false;
      this.render(hero, view.gold);
    } catch (err) {
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      this.noteError(messageOf(err));
    }
  }

  private render(hero: HeroCard, gold: number): void {
    this.hero = hero;
    this.write(this.nameLabel, hero.name);
    this.write(this.levelLabel, heroLevelText(hero.level, hero.star));
    this.write(this.atkLabel, "攻击 " + hero.atk);
    this.write(this.hpLabel, "生命 " + hero.hp);
    this.write(this.defLabel, "防御 " + hero.def);
    this.write(this.weaponLabel, weaponLineText(hero.weaponName, hero.weaponLevel, hero.weaponAtk));
    this.write(this.goldLabel, ownedGoldText(gold));
    this.write(this.upgradeButton ? this.upgradeButton.getChildByName("Label") : null, upgradeButtonText(hero.level));
  }

  private async upgrade(): Promise<void> {
    if (this.busy || this.disposed) return;
    const hero = this.hero;
    if (!hero) {
      this.host.showToast(missingHeroToast());
      return;
    }
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Hero", "upgrade " + hero.id);
    try {
      const resp = await this.host.upgrade(hero.id);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok || !resp.hero) {
        const text = upgradeFailToast(resp);
        GameLog.shared.warn("Hero", text);
        this.host.showToast(text);
        if (resp.hero) this.render(resp.hero, resp.gold);
        else this.write(this.goldLabel, ownedGoldText(resp.gold));
        return;
      }
      applyHeroUpgrade(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = upgradeToast(resp.hero.name, resp.hero.level, resp.cost);
      GameLog.shared.info("Hero", text + " gold " + resp.gold);
      this.host.showToast(text);
      this.render(resp.hero, resp.gold);
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Hero", text);
      this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Hero", text);
    this.host.showToast(text);
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

function findHero(heroes: HeroCard[], heroId: number): HeroCard | null {
  for (let i = 0; i < heroes.length; i++) {
    if (heroes[i].id === heroId) return heroes[i];
  }
  return null;
}
