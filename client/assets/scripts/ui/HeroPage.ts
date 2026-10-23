/**
 * 英雄列表和详情（C5）。升级消耗金币，星级只展示。
 * 不改 .scene。底栏「英雄」打开列表，点一名英雄再压一层详情。返回走页面栈。
 */
import { Color, instantiate, Node } from "cc";
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
import { heroSkillSuffix, mockHeroCards } from "../module/hero/rosterView";
import { weaponLineText } from "../module/smith/forge";
import { HeroCard, HeroListResp, HeroUpgradeResp } from "../net/protocol/types";
import { HERO_PREFAB_PATH, bindClick, loadPrefab, requireNode, spawnPrefab } from "./prefabLoad";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

/**
 * Mock 英雄列表和详情默认挂 HeroPage.prefab。
 * false，或加载 / 绑节点失败时，仍走下面的代码页。真服只读页不挂这份 Prefab。
 */
export const USE_HERO_PREFAB = true;

export async function mountHeroListPrefab(parent: Node, host: HeroListHost): Promise<HeroListPage> {
  const prefab = await loadPrefab(HERO_PREFAB_PATH);
  const root = spawnPrefab(prefab, parent);
  try {
    return new HeroListController(host, root);
  } catch (err) {
    root.destroy();
    throw err;
  }
}

export async function mountHeroDetailPrefab(parent: Node, host: HeroDetailHost): Promise<HeroDetailPage> {
  const prefab = await loadPrefab(HERO_PREFAB_PATH);
  const root = spawnPrefab(prefab, parent);
  try {
    return new HeroDetailController(host, root);
  } catch (err) {
    root.destroy();
    throw err;
  }
}

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
  private readonly prefabRows: boolean;
  private readonly boundRows: { [name: string]: boolean } = {};
  private rowHeroes: HeroCard[] = [];

  constructor(private readonly host: HeroListHost, existing?: Node) {
    this.prefabRows = !!existing;
    if (existing) {
      this.node = existing;
      this.body = existing;
      this.rowsHost = requireNode(existing, "PanelList/RowsHost");
      this.countLabel = requireNode(existing, "PanelList/Count");
      const detail = existing.getChildByName("PanelDetail");
      if (detail) detail.active = false;
      const list = existing.getChildByName("PanelList");
      if (list) list.active = true;
      bindClick(requireNode(existing, "PanelList/BtnBack"), () => this.host.close());
      GameLog.shared.info("Hero", "open list prefab");
      void this.refresh();
      return;
    }
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
      const roster = mockHeroCards(view.heroes || []);
      this.render(roster !== null ? roster : view.heroes || []);
    } catch (err) {
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      this.noteError(messageOf(err));
    }
  }

  private render(heroes: HeroCard[]): void {
    if (this.prefabRows) {
      this.renderPrefabRows(heroes);
      return;
    }
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
        heroRowText(hero.name, hero.level, hero.star) + " · 武器Lv" + (hero.weaponLevel || 1) + heroSkillSuffix(hero.id),
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

  private renderPrefabRows(heroes: HeroCard[]): void {
    const count = heroes.length;
    this.rowHeroes = heroes;
    this.write(this.countLabel, count === 0 ? "暂无英雄" : count + " 名英雄 · 点名字查看详情");
    const rows = requireNode(this.node, "PanelList/RowsHost/Rows");
    const template = rows.getChildByName("Row_0");
    if (!template) throw new Error("缺少节点 Row_0");
    const kids = rows.children;
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i];
      if (child.name.indexOf("Row_") === 0) child.active = false;
    }
    for (let i = 0; i < heroes.length; i++) {
      const hero = heroes[i];
      let row = rows.getChildByName("Row_" + i);
      if (!row) {
        row = instantiate(template);
        row.name = "Row_" + i;
        row.parent = rows;
      }
      row.active = true;
      row.setPosition(0, 300 - i * 100, 0);
      const label = row.getChildByName("Label");
      if (label) {
        setText(label, heroRowText(hero.name, hero.level, hero.star) + " · 武器Lv" + (hero.weaponLevel || 1) + heroSkillSuffix(hero.id));
      }
      this.bindPrefabRow(row, i);
    }
  }

  private bindPrefabRow(row: Node, index: number): void {
    if (this.boundRows[row.name]) return;
    this.boundRows[row.name] = true;
    bindClick(row, () => this.openPrefabRow(index));
  }

  private openPrefabRow(index: number): void {
    if (this.disposed) return;
    const hero = this.rowHeroes[index];
    if (!hero) return;
    GameLog.shared.info("Hero", "open detail " + hero.id);
    this.host.openHero(hero.id);
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

  constructor(private readonly host: HeroDetailHost, existing?: Node) {
    if (existing) {
      this.node = existing;
      this.body = existing;
      const list = existing.getChildByName("PanelList");
      if (list) list.active = false;
      const detail = requireNode(existing, "PanelDetail");
      detail.active = true;
      this.nameLabel = requireNode(existing, "PanelDetail/Name");
      this.levelLabel = requireNode(existing, "PanelDetail/Level");
      this.atkLabel = requireNode(existing, "PanelDetail/Atk");
      this.hpLabel = requireNode(existing, "PanelDetail/Hp");
      this.defLabel = requireNode(existing, "PanelDetail/Def");
      this.weaponLabel = requireNode(existing, "PanelDetail/Weapon");
      this.goldLabel = requireNode(existing, "PanelDetail/Gold");
      this.upgradeButton = requireNode(existing, "PanelDetail/BtnUpgrade");
      bindClick(this.upgradeButton, () => void this.upgrade());
      bindClick(requireNode(existing, "PanelDetail/BtnBack"), () => this.host.close());
      GameLog.shared.info("Hero", "open detail prefab " + this.host.heroId());
      void this.refresh();
      return;
    }
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
      const roster = mockHeroCards(view.heroes || []);
      const hero = findHero(roster !== null ? roster : view.heroes || [], heroId);
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
    this.write(this.levelLabel, heroLevelText(hero.level, hero.star) + heroSkillSuffix(hero.id));
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
