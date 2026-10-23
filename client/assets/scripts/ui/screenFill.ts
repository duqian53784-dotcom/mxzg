/**
 * 英雄列表、背包、挂机底栏、出阵，把已有贴图填进 P4 壳。
 * 格子是运行时拼的：HeroListLayer / BackpackLayer 本身没有网格。
 * 不造假英雄、不造假道具、不发新协议。
 */
import { Button, Color, Label, Node, Overflow, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { GameStore, StoreBagItem, StoreHero } from "../core/GameStore";
import { GameLog } from "../core/GameLog";
import { heroBaseStats, heroProfile, itemBagTab, itemIconResource, itemIsWallet } from "../config/gameCatalog";
import { goldPerMin, itemEveryMs } from "../module/idle/rewards";
import { hangSpineStem } from "./idleHangRoster";
import { mountBattleSpine } from "./battleSpine";
import { deployedHeroIds, setLocalLineup } from "./localLineup";
import { createLabel, place, setText, uiNode } from "./UiKit";

const INK = new Color(122, 71, 45, 255);
const CREAM = new Color(255, 236, 190, 255);
const COUNT = new Color(255, 248, 220, 255);
const CHECK = new Color(70, 210, 90, 255);

const COLS = 4;
const HERO_CAP_TEXT = 300;
const CELL = 96;

type BagTab = "equip" | "item" | "shard" | "spirit";

const BAG_TABS: { id: BagTab; title: string }[] = [
  { id: "equip", title: "装备" },
  { id: "item", title: "道具" },
  { id: "shard", title: "碎片" },
  { id: "spirit", title: "精灵" },
];

export function fillPageShell(id: string, view: Node, openHero: (hero: StoreHero) => void): void {
  if (!view.isValid) return;
  if (id === "hero") fillHero(view, openHero);
  else if (id === "bag") fillBag(view);
}

/** 藏掉地图球，换成掉落堆、计时和每分钟收益。三钮文案改成战力UP / 战斗 / 高速战斗。 */
export function dressHangPanel(view: Node): void {
  const mark = view as Node & { mxzgHang?: boolean };
  if (mark.mxzgHang) return;
  mark.mxzgHang = true;
  const plate = view.getChildByName("CCSprite_1");
  hideNamed(view, "spr_world");
  hideNamed(view, "lbl_map");
  hideNamed(view, "spr_world_icon");
  hideNamed(view, "lbl_mission_name");
  if (plate) {
    const frame = plate.getChildByName("CCSprite_1");
    if (frame) frame.active = false;
    const drop = sprite("HangDrop", 150, 110, "ui/city/main-scene_spr-drop-1");
    place(drop, plate, 2, 28);
  }
  fitButton(findNamed(view, "btn_lineup"), "战力UP", 22);
  fitButton(findNamed(view, "btn_battle"), "战斗", 22);
  fitButton(findNamed(view, "btn_speed_battle"), "高速战斗", 20);
  pinSprites(view);
  const tick = () => {
    if (!view.isValid) return;
    const clock = clockText(idleElapsedMs());
    writeNamed(view, "lbl_progress_time", clock);
    writeNamed(view, "lbl_progress_time2", clock);
    const cleared = clearedCount();
    const gold = goldPerMin(cleared);
    const every = itemEveryMs(cleared);
    const perMin = every > 0 ? Math.max(1, Math.round(60000 / every)) : 0;
    const sec = Math.max(1, Math.round(every / 1000));
    writeNamed(view, "lbl_gold", gold + "/m");
    writeNamed(view, "lbl_souls", perMin + "/m");
    writeNamed(view, "lbl_exp", "每" + sec + "s");
  };
  tick();
  const timer = setInterval(tick, 1000);
  view.once(Node.EventType.NODE_DESTROYED, () => clearInterval(timer));
}

/** 英雄出阵。确认只记在本局，再由调用方进入挂机上的战斗。 */
export function bindFormationSheet(view: Node, onConfirm: () => void): void {
  silenceBigMenus(view);
  writeNamed(view, "lbl_title", "英雄出阵");
  const title = findNamed(view, "lbl_title");
  if (title) {
    const label = title.getComponent(Label);
    if (label && label.fontSize > 32) label.fontSize = 28;
  }
  fitButton(findNamed(view, "btn_confirm"), "出阵", 26);
  for (let n = 1; n <= 9; n++) {
    const lock = findNamed(view, "spr_lock_" + n);
    if (lock) lock.active = n === 9;
  }
  let elem = 0;
  let selected = deployedHeroIds();
  const paint = () => {
    if (!view.isValid) return;
    paintFormationGrid(view, elem, selected, (heroId) => {
      selected = toggleId(selected, heroId);
      paint();
    });
    paintFormationSlots(view, selected);
  };
  for (let i = 0; i <= 5; i++) {
    const button = findNamed(view, "btn_elem" + i);
    const pick = i;
    if (!button) continue;
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => {
      elem = pick;
      const markNode = findNamed(view, "spr_select");
      if (markNode && button.parent) {
        if (markNode.parent !== button.parent) markNode.parent = button.parent;
        markNode.setPosition(button.position.x, button.position.y, 0);
      }
      paint();
    });
  }
  const confirm = findNamed(view, "btn_confirm");
  if (confirm) {
    confirm.setSiblingIndex(Math.max(0, (confirm.parent ? confirm.parent.children.length : 1) - 1));
    if (!confirm.getComponent(Button)) confirm.addComponent(Button);
    confirm.on(Button.EventType.CLICK, () => {
      if (selected.length === 0) {
        GameLog.shared.info("Mainline", "出阵没有英雄，仍留在挂机");
        return;
      }
      setLocalLineup(selected);
      onConfirm();
    });
  }
  paint();
}

/** 英雄详情：装备圈、属性、技能、育成页签。不发升级协议。 */
export function dressHeroDetail(view: Node, hero: StoreHero): void {
  silenceBigMenus(view);
  const profile = heroProfile(hero.heroType);
  const name = hero.name || (profile ? profile.name : "英雄");
  writeNamed(view, "lbl_hero_name", name);
  const elem = profile && profile.elem !== null ? profile.elem : 0;
  const badge = findNamed(view, "icon_elem");
  if (badge) paintSprite(badge, "ui/hero/hero-icon_elem-" + clamp(elem, 0, 5));
  const stars = findNamed(view, "node_star");
  if (stars) {
    const count = hero.star ?? (profile && profile.star) ?? 0;
    const n = clamp(count, 0, 6);
    for (let i = 0; i < n; i++) {
      const star = sprite("star", 22, 22, "ui/hero/hero-info_spr-star-1");
      place(star, stars, (i - (n - 1) / 2) * 24, 0);
    }
  }
  if (hero.heroId) {
    const spot = place(uiNode("DetailSpine"), view, 320, 620);
    mountBattleSpine(spot, hangSpineStem(hero.heroId, hero.heroType), () => {
      if (spot.isValid) spot.active = false;
    });
  }
  const stats = heroBaseStats(hero.heroType, hero.star ?? (profile ? profile.star : 1));
  const board = uiNode("DetailBoard");
  place(board, view, 320, 250);
  const tabs = ["育成", "星UP", "宝石", "神装"];
  let tab = 0;
  const body = uiNode("DetailBody");
  place(body, board, 0, -36);
  const paint = () => {
    if (!body.isValid) return;
    const old = body.children.slice();
    for (let i = 0; i < old.length; i++) old[i].destroy();
    if (tab !== 0) {
      place(createLabel("这一页还没有配置", 18, { color: INK, width: 360, height: 40 }), body, 0, 20);
      return;
    }
    const level = hero.level === null ? "—" : String(hero.level);
    place(createLabel("等级 " + level, 18, { color: INK, width: 200, height: 28 }), body, -120, 78);
    const power = hero.fighting === null ? "—" : String(hero.fighting);
    place(createLabel("战力 " + power, 18, { color: INK, width: 200, height: 28 }), body, 120, 78);
    const atk = stats ? String(stats.atk) : "—";
    const hp = stats ? String(stats.hp) : "—";
    const def = stats ? String(stats.def) : "—";
    const spd = stats ? String(stats.spd) : "—";
    place(createLabel("攻击 " + atk, 18, { color: INK, width: 180, height: 28 }), body, -120, 40);
    place(createLabel("HP " + hp, 18, { color: INK, width: 180, height: 28 }), body, 120, 40);
    place(createLabel("防御 " + def, 18, { color: INK, width: 180, height: 28 }), body, -120, 8);
    place(createLabel("速度 " + spd, 18, { color: INK, width: 180, height: 28 }), body, 120, 8);
    const skills = profile ? profile.skills : [];
    const names: string[] = [];
    for (let i = 0; i < skills.length && i < 4; i++) names.push(skills[i].name);
    place(
      createLabel(names.length > 0 ? names.join("  ") : "无技能", 16, { color: INK, width: 460, height: 36 }),
      body,
      0,
      -36
    );
  };
  for (let i = 0; i < tabs.length; i++) {
    const index = i;
    const button = sprite(tabs[i], 100, 36, index === 0 ? "ui/common/button_btn-tab-24" : "ui/common/button_btn-tab-23");
    place(button, board, -180 + i * 110, 70);
    const label = createLabel(tabs[i], 16, { color: INK, width: 90, height: 28 });
    place(label, button, 0, 0);
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => {
      tab = index;
      paint();
    });
  }
  fitButton(findNamed(view, "btn_evolution"), "升级", 22);
  const up = findNamed(view, "btn_evolution");
  if (up) {
    if (!up.getComponent(Button)) up.addComponent(Button);
    up.on(Button.EventType.CLICK, () => {
      GameLog.shared.info("Hero", "升级仍走原来的英雄页，详情不新发协议");
    });
  }
  paint();
}

function fillHero(view: Node, openHero: (hero: StoreHero) => void): void {
  fitButton(findNamed(view, "btn_hero"), "英雄", 20);
  fitButton(findNamed(view, "btn_illustrat"), "图鉴", 20);
  fitButton(findNamed(view, "btn_dragon"), "圣龙", 20);
  const cap = findNamed(view, "node_capacity");
  if (cap) cap.active = true;
  writeNamed(view, "lbl_go", "点头像看详情");
  let tab: "hero" | "book" | "dragon" = "hero";
  let elem = 0;
  const host = uiNode("HeroFill");
  place(host, view, 0, 0);
  const paint = () => {
    if (!host.isValid) return;
    const old = host.children.slice();
    for (let i = 0; i < old.length; i++) old[i].destroy();
    const roster = tab === "hero" ? rosterOf(elem) : [];
    const all = GameStore.heroes();
    writeNamed(view, "lbl_capacity", "空间 " + (all ? all.length : 0) + "/" + HERO_CAP_TEXT);
    const deployed = deployedSet();
    const cells = Math.max(16, Math.ceil(roster.length / COLS) * COLS);
    const shown = cells > 16 ? 16 : cells;
    for (let i = 0; i < shown; i++) {
      const hero = i < roster.length ? roster[i] : null;
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cell = heroCell(hero, hero ? deployed.has(hero.heroId || 0) : false, hero ? () => openHero(hero) : null);
      place(cell, host, 108 + col * 108, 548 - row * 112);
    }
    if (tab !== "hero") {
      place(createLabel(tab === "book" ? "图鉴" : "圣龙", 20, { color: INK, width: 200, height: 32 }), host, 320, 590);
    }
  };
  const filters = [0, 1, 2, 3, 4, 5];
  for (let i = 0; i < filters.length; i++) {
    const id = filters[i];
    const button = sprite("elem" + id, 48, 48, "ui/hero/hero-icon_elem-" + id);
    place(button, host, 78 + i * 78, 618);
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => {
      elem = id;
      tab = "hero";
      paint();
    });
  }
  bindTab(view, "btn_hero", () => {
    tab = "hero";
    paint();
  });
  bindTab(view, "btn_illustrat", () => {
    tab = "book";
    paint();
  });
  bindTab(view, "btn_dragon", () => {
    tab = "dragon";
    paint();
  });
  const skin = sprite("Permanent", 148, 46, "ui/permanent-skin/permanent-skin_btn-permanent-shop");
  place(skin, host, 130, 168);
  place(createLabel("永久技能", 16, { color: CREAM, width: 130, height: 28 }), skin, 0, 0);
  paint();
}

function fillBag(view: Node): void {
  writeNamed(view, "lbl_title", "背包");
  let tab: BagTab = "item";
  const host = uiNode("BagFill");
  place(host, view, 0, 0);
  const tabs: Node[] = [];
  const paint = () => {
    const grid = host.getChildByName("BagGrid");
    if (grid) grid.destroy();
    const next = uiNode("BagGrid");
    place(next, host, 0, 0);
    for (let i = 0; i < tabs.length; i++) {
      paintSprite(tabs[i], BAG_TABS[i].id === tab ? "ui/common/button_btn-tab-24" : "ui/common/button_btn-tab-23");
    }
    const rows = bagRows(tab);
    const cells = Math.max(16, Math.ceil(rows.length / COLS) * COLS);
    const shown = cells > 16 ? 16 : cells;
    for (let i = 0; i < shown; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const item = i < rows.length ? rows[i] : null;
      const cell = item ? bagCell(item) : emptyBag();
      place(cell, next, 145 + col * 112, 500 - row * 104);
    }
  };
  for (let i = 0; i < BAG_TABS.length; i++) {
    const spec = BAG_TABS[i];
    const button = sprite(spec.title, 108, 40, i === 1 ? "ui/common/button_btn-tab-24" : "ui/common/button_btn-tab-23");
    place(button, host, 125 + i * 118, 590);
    place(createLabel(spec.title, 18, { color: INK, width: 96, height: 28 }), button, 0, 0);
    tabs.push(button);
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => {
      tab = spec.id;
      paint();
    });
  }
  const bubble = findNamed(view, "spr_bubble_bg");
  if (bubble && bubble.parent && !findNamed(bubble.parent, "BagTip")) {
    const tip = createLabel("道具在背包里", 16, { color: INK, width: 200, height: 48 });
    tip.name = "BagTip";
    place(tip, bubble.parent, 150, 90);
  }
  paint();
}

function paintFormationGrid(view: Node, elem: number, selected: number[], toggle: (id: number) => void): void {
  const scroll = findNamed(view, "scroll_view_backpack");
  const host = scroll || view;
  const old = host.getChildByName("FormGrid");
  if (old) old.destroy();
  const grid = uiNode("FormGrid");
  place(grid, host, 0, scroll ? 180 : 640);
  const roster = rosterOf(elem);
  const n = roster.length < 8 ? roster.length : 8;
  for (let i = 0; i < n; i++) {
    const hero = roster[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const on = hero.heroId !== null && selected.indexOf(hero.heroId) >= 0;
    const cell = heroCell(hero, false, () => {
      if (hero.heroId) toggle(hero.heroId);
    });
    if (on) {
      const mark = createLabel("✓", 22, { color: CHECK, width: 28, height: 28 });
      place(mark, cell, 30, 36);
    }
    place(cell, grid, -180 + col * 110, -row * 100);
  }
}

function paintFormationSlots(view: Node, selected: number[]): void {
  const order = [4, 3, 2, 1, 8, 7, 6, 5];
  const roster = GameStore.heroes() || [];
  let power = 0;
  for (let i = 0; i < order.length; i++) {
    const slot = findNamed(view, "node_icon_" + order[i]);
    if (!slot) continue;
    const old = slot.getChildByName("SlotFace");
    if (old) old.destroy();
    const hero = i < selected.length ? heroById(roster, selected[i]) : null;
    const label = findNamed(slot, "lbl_attr_add_" + order[i]);
    if (!hero || !hero.heroType) {
      if (label) label.active = false;
      continue;
    }
    const face = sprite("SlotFace", 64, 64, "ui/hero/hero-icon_" + hero.heroType);
    place(face, slot, 0, 0);
    if (hero.fighting !== null) power += hero.fighting;
    if (label) {
      const stats = heroBaseStats(hero.heroType, hero.star);
      label.active = !!stats;
      if (stats) setText(label, "攻" + stats.atk);
    }
  }
  writeNamed(view, "lbl_battle_count", String(power));
}

function heroCell(hero: StoreHero | null, deployed: boolean, onTap: (() => void) | null): Node {
  const root = uiNode(hero ? "HeroCell" : "HeroEmpty");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(CELL, CELL + 8);
  place(sprite("bg", 84, 84, "ui/hero/hero-icon_icon-bg-2"), root, 0, 6);
  place(sprite("frame", 88, 88, "ui/hero/hero-icon_icon-frame-1"), root, 0, 6);
  if (!hero) return root;
  const profile = heroProfile(hero.heroType);
  if (hero.heroType) {
    place(sprite("face", 72, 72, "ui/hero/hero-icon_" + hero.heroType), root, 0, 6);
  } else {
    place(createLabel(shortName(hero.name), 14, { color: CREAM, width: 72, height: 36 }), root, 0, 6);
  }
  const elem = profile && profile.elem !== null ? profile.elem : null;
  if (elem !== null && elem >= 0 && elem <= 5) {
    place(sprite("elem", 26, 26, "ui/hero/hero-icon_elem-" + elem), root, -28, 32);
  }
  const stars = hero.star ?? (profile && profile.star) ?? 0;
  const n = clamp(stars, 0, 5);
  for (let i = 0; i < n; i++) {
    place(sprite("star", 14, 14, "ui/hero/hero-info_spr-star-1"), root, (i - (n - 1) / 2) * 15, -40);
  }
  if (deployed) place(sprite("battle", 28, 28, "ui/hero/hero-icon_spr-battle"), root, 30, 32);
  if (onTap) {
    if (!root.getComponent(Button)) root.addComponent(Button);
    root.on(Button.EventType.CLICK, onTap);
  }
  return root;
}

function bagCell(item: StoreBagItem): Node {
  const root = uiNode("BagCell");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(96, 96);
  place(sprite("frame", 88, 88, "ui/bag/backpack_item-frame-1"), root, 0, 0);
  const icon = itemIconResource(item.itemType, item.itemId);
  const face = sprite("icon", 72, 72, icon || "ui/bag/backpack_spr-default");
  place(face, root, 0, 6);
  if (!icon && item.itemId) paintFirst(face, ["ui/bag/backpack_" + item.itemId, "ui/bag/backpack_spr-default"]);
  const count = item.num === null ? "" : String(item.num);
  if (count) {
    const label = createLabel(count, 16, { color: COUNT, width: 72, height: 22 });
    place(label, root, 18, -30);
  }
  return root;
}

function emptyBag(): Node {
  const root = uiNode("BagEmpty");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(96, 96);
  place(sprite("frame", 88, 88, "ui/common/other_spr-null"), root, 0, 0);
  return root;
}

function rosterOf(elem: number): StoreHero[] {
  const all = GameStore.heroes();
  if (!all) return [];
  if (elem === 0) return all;
  const rows: StoreHero[] = [];
  for (let i = 0; i < all.length; i++) {
    const profile = heroProfile(all[i].heroType);
    if (profile && profile.elem === elem) rows.push(all[i]);
  }
  return rows;
}

function bagRows(tab: BagTab): StoreBagItem[] {
  const all = GameStore.bag();
  if (!all) return [];
  const rows: StoreBagItem[] = [];
  for (let i = 0; i < all.length; i++) {
    const item = all[i];
    if (item.num !== null && item.num <= 0) continue;
    if (itemIsWallet(item.itemType, item.itemId)) continue;
    if (itemBagTab(item.itemType, item.itemId) !== tab) continue;
    rows.push(item);
  }
  return rows;
}

function deployedSet(): Set<number> {
  const set = new Set<number>();
  const ids = deployedHeroIds();
  for (let i = 0; i < ids.length; i++) set.add(ids[i]);
  return set;
}

function heroById(roster: StoreHero[], id: number): StoreHero | null {
  for (let i = 0; i < roster.length; i++) {
    if (roster[i].heroId === id) return roster[i];
  }
  return null;
}

function toggleId(selected: number[], id: number): number[] {
  const next = selected.slice();
  const index = next.indexOf(id);
  if (index >= 0) {
    next.splice(index, 1);
    return next;
  }
  if (next.length >= 8) return next;
  next.push(id);
  return next;
}

function bindTab(view: Node, name: string, fn: () => void): void {
  const node = findNamed(view, name);
  if (!node) return;
  if (!node.getComponent(Button)) node.addComponent(Button);
  node.on(Button.EventType.CLICK, fn);
}

function fitButton(node: Node | null, text: string, size: number): void {
  if (!node) return;
  const spriteComp = node.getComponent(Sprite);
  if (spriteComp) spriteComp.sizeMode = Sprite.SizeMode.CUSTOM;
  eachLabel(node, (label, host) => {
    label.string = text;
    label.fontSize = size;
    label.lineHeight = size + 4;
    label.overflow = Overflow.SHRINK;
    const ui = host.getComponent(UITransform);
    const parent = host.parent ? host.parent.getComponent(UITransform) : null;
    if (ui && parent && parent.contentSize.width > 8) {
      ui.setContentSize(Math.max(8, parent.contentSize.width - 8), Math.max(8, parent.contentSize.height - 4));
    }
  });
}

function writeNamed(root: Node, name: string, text: string): void {
  const node = findNamed(root, name);
  if (!node) return;
  setText(node, text);
  const label = node.getComponent(Label);
  if (label && label.fontSize > 28) {
    label.fontSize = 18;
    label.overflow = Overflow.SHRINK;
  }
}

function hideNamed(root: Node, name: string): void {
  const node = findNamed(root, name);
  if (node) node.active = false;
}

function sprite(name: string, width: number, height: number, path: string): Node {
  const node = uiNode(name);
  const ui = node.addComponent(UITransform);
  ui.setContentSize(width, height);
  const image = node.addComponent(Sprite);
  image.sizeMode = Sprite.SizeMode.CUSTOM;
  image.type = Sprite.Type.SIMPLE;
  paintSprite(node, path);
  return node;
}

function paintSprite(node: Node, path: string): void {
  paintFirst(node, [path]);
}

function paintFirst(node: Node, paths: string[]): void {
  const image = node.getComponent(Sprite);
  if (!image) return;
  const loadAt = (index: number) => {
    if (!node.isValid || index >= paths.length) return;
    try {
      resources.load(paths[index] + "/spriteFrame", SpriteFrame, (err, asset) => {
        if (!node.isValid) return;
        if (err || !asset) {
          loadAt(index + 1);
          return;
        }
        image.spriteFrame = asset;
      });
    } catch (_err) {
      return;
    }
  };
  loadAt(0);
}

function pinSprites(node: Node): void {
  const image = node.getComponent(Sprite);
  if (image) image.sizeMode = Sprite.SizeMode.CUSTOM;
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) pinSprites(kids[i]);
}

function silenceBigMenus(root: Node): void {
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as Node;
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
    if (node.name === "UIMenu_1" || node.name === "UIMenu_2" || node.name === "menu_equip") continue;
    if (node.name.indexOf("Menu") < 0 && node.name !== "menu") continue;
    const ui = node.getComponent(UITransform);
    if (!ui || ui.contentSize.width < 500 || ui.contentSize.height < 500) continue;
    ui.setContentSize(0, 0);
  }
}

function findNamed(root: Node, name: string): Node | null {
  if (root.name === name) return root;
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) {
    const found = findNamed(kids[i], name);
    if (found) return found;
  }
  return null;
}

function eachLabel(node: Node, fn: (label: Label, host: Node) => void): void {
  const label = node.getComponent(Label);
  if (label) fn(label, node);
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) eachLabel(kids[i], fn);
}

function shortName(name: string): string {
  if (!name) return "";
  return name.length > 4 ? name.slice(0, 4) : name;
}

function clamp(value: number, min: number, max: number): number {
  if (!isFinite(value)) return min;
  const n = Math.floor(value);
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function clearedCount(): number {
  const stage = GameStore.mockStageId();
  if (stage !== null) return Math.max(0, stage - 1);
  const chapter = GameStore.chapter();
  if (chapter.fromStore && chapter.nowIdx !== null && chapter.nowIdx > 1) return chapter.nowIdx - 1;
  return 0;
}

function idleElapsedMs(): number {
  const idle = GameStore.idle();
  const bank = idle.fromStore ? bankedMs(idle.rewardTime) : 0;
  const started = (dressClock as { t: number }).t;
  return bank + Math.max(0, Date.now() - started);
}

const dressClock = { t: Date.now() };

function bankedMs(rewardTime: number | null): number {
  if (rewardTime === null || !isFinite(rewardTime) || rewardTime <= 0) return 0;
  if (rewardTime > 1e12) return Math.max(0, Date.now() - rewardTime);
  if (rewardTime > 1e9) return Math.max(0, Date.now() - rewardTime * 1000);
  if (rewardTime > 8 * 3600) return rewardTime;
  return rewardTime * 1000;
}

function clockText(ms: number): string {
  let total = Math.floor(ms / 1000);
  if (total < 0) total = 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  const mm = m < 10 ? "0" + m : String(m);
  const ss = s < 10 ? "0" + s : String(s);
  return mm + ":" + ss;
}
