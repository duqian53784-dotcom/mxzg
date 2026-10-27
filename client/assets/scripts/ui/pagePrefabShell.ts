/**
 * 在已经打开的页面上盖一层 1:1 Prefab，方便看新界面。
 * 关闭壳只是藏起来，下面的代码页 / 旧 Prefab / 协议探针还在。
 * 加载失败留原来的页面，不留空画面。
 */
import { BlockInputEvents, Button, Color, director, Director, Label, Node, Overflow, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { labelCenterInParent, sliceAnchorShift } from "./ccbiPlace";
import { CITY_BAR_BOTTOM, CITY_VIEW_H } from "./cityMapLayout";
import { messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { GameStore } from "../core/GameStore";
import { chapterIdleMinute } from "../config/rosterCatalog";
import { WireSession } from "../net/WireSession";
import { formatWireQuickBattle } from "../net/protocol/wireQuickBattle";
import { bindHangFill, mountIdleHang } from "./idleHangView";
import { beginHangBattle } from "./hangBattle";
import { hangLineupReady } from "./localLineup";
import { wireDebugEnabled } from "../net/transportSelect";
import { PAGE_SHELL_FIGHT, pagePrefabShell, USE_PAGE_PREFAB_SHELL } from "./prefabShellMap";
import { bindFormationSheet, dressChapterPreview, dressHangPanel, dressHeroDetail, fillPageShell, hangMissionCaption } from "./screenFill";
import { loadPrefab, spawnPrefab } from "./prefabLoad";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

/** 挂机底栏「快速战斗」。已有壳。3013 开战硬禁，只读 3012 次数。 */
export const HANG_QUICK_PREFAB = "prefabs/ui/quick-battle/QuickBattleLayer";
/** 挂机底栏「我要变强」。已有壳，标题是英雄变强。不新发协议。 */
export const HANG_GROW_PREFAB = "prefabs/ui/hero/HeroSuggestLayer";
/** 挂机「战斗」先打开的出阵。确认不新发协议。 */
export const HANG_FORMATION_PREFAB = "prefabs/ui/hero/HeroSelectLayer";
/** 挂机关卡标打开的预览。出战仍走原来的挑战，不新发协议。 */
export const HANG_CHAPTER_PREFAB = "prefabs/ui/chapter/ChapterPreviewLayer";
/** 英雄格子点开的详情。 */
export const HERO_INFO_PREFAB = "prefabs/ui/hero/HeroInfoLayer";

export { PAGE_SHELL_FIGHT, USE_PAGE_PREFAB_SHELL };

/** 挂机左侧空地长按，打开真服探针。不画在底栏上。 */
export const HANG_PROBE_EVENT = "mxzg-wire-probe";
const HANG_PROBE_MS = 720;

interface ShellHold {
  want: boolean;
  root: Node | null;
  /** 壳还在加载。第二次进来不再盖一层。 */
  pending?: boolean;
  /** 真服只读页的节点。壳盖住之前先藏，避免切换时闪出标题。 */
  veiled?: Node[];
}

const holds = new Map<Node, ShellHold>();

export function setPagePrefabShellVisible(page: Node, visible: boolean): void {
  let hold = holds.get(page);
  if (!hold) {
    hold = { want: visible, root: null };
    holds.set(page, hold);
  } else {
    hold.want = visible;
  }
  if (hold.root && hold.root.isValid) hold.root.active = visible;
  if (page.isValid) {
    const dim = page.getChildByName("ShellBackdropDim");
    const art = page.getChildByName("ShellBackdrop");
    if (dim) dim.active = visible;
    if (art) art.active = visible;
  }
  const veiled = hold.veiled || [];
  for (let i = 0; i < veiled.length; i++) {
    const node = veiled[i];
    if (node.isValid) node.active = !visible;
  }
}

/** 盖上对照表里的 Prefab。没有对照就什么都不做。 */
export async function attachPagePrefabShell(page: Node, id: string): Promise<void> {
  if (!USE_PAGE_PREFAB_SHELL) return;
  const spec = pagePrefabShell(id);
  if (!spec || !page.isValid) return;
  let hold = holds.get(page);
  if (hold && (hold.root || hold.pending)) return;
  if (!hold) {
    hold = { want: true, root: null };
    holds.set(page, hold);
  }
  hold.pending = true;
  const backdrop = shellBackdrop(id);
  if (backdrop) veilUnderShell(page, hold, backdrop);
  page.once(Node.EventType.NODE_DESTROYED, () => {
    holds.delete(page);
  });
  try {
    const prefab = await loadPrefab(spec.path);
    if (!page.isValid) return;
    if (hold.root) return;
    const root = uiNode("PagePrefabShell");
    const ui = root.addComponent(UITransform);
    ui.setContentSize(720, 1280);
    ui.setAnchorPoint(0.5, 0.5);
    root.addComponent(BlockInputEvents);
    if (spec.fight) mountIdleHang(root);
    else if (!backdrop) place(createRect("dim", 720, 1280, new Color(8, 16, 32, 255)), root, 0, 0);
    const view = spawnPrefab(prefab, root);
    mountCcbiView(view);
    fillPageShell(id, view, (hero) => {
      void openHangSheet(root, HERO_INFO_PREFAB, (sheet) => dressHeroDetail(sheet, hero));
    });
    if (spec.fight) dressHangPanel(view);
    const close = findDescendant(view, "btn_close");
    if (close) {
      liftNode(close, view);
      bindTap(close, () => setPagePrefabShellVisible(page, false));
    }
    // 真服路径不留「功能页」。这颗钮会把壳藏起来，底下的只读标题就露出来。
    if (wireDebugEnabled()) {
      const probe = createButton("功能页", () => setPagePrefabShellVisible(page, false), 96, 32);
      probe.name = "BtnShellProbe";
      place(probe, root, -300, 600);
    }
    const raise = () => pinShell(root, page);
    page.on(Node.EventType.CHILD_ADDED, raise);
    root.parent = page;
    root.active = hold.want;
    hold.root = root;
    hold.pending = false;
    raise();
    if (spec.fight) {
      bindHangFill(root);
      bindFightChrome(view, root, page);
    }
    GameLog.shared.info("MainApp", "page prefab shell " + id + " " + spec.path);
  } catch (err) {
    hold.pending = false;
    restoreVeil(page, hold);
    GameLog.shared.error("MainApp", "page prefab shell " + id + " " + messageOf(err) + "，仍用原来的页面");
  }
}

/** 英雄列表用角色岩洞，背包用店内。正式服羊皮纸是浮在这张全屏底上的。 */
function shellBackdrop(id: string): string[] | null {
  if (id === "hero") return ["ui/maps/map-bg-role-1"];
  if (id === "bag") return ["ui/bag/map-bg-backpack-1", "ui/maps/map-bg-backpack-1"];
  return null;
}

/** 先藏只读页，再铺底图。壳加载期间不再闪「真服只读」。 */
function veilUnderShell(page: Node, hold: ShellHold, paths: string[]): void {
  const veiled: Node[] = [];
  const kids = page.children.slice();
  for (let i = 0; i < kids.length; i++) {
    if (!kids[i].active) continue;
    kids[i].active = false;
    veiled.push(kids[i]);
  }
  hold.veiled = veiled;
  place(createRect("ShellBackdropDim", 720, 1280, new Color(22, 16, 20, 255)), page, 0, 0);
  const art = uiNode("ShellBackdrop");
  const ui = art.addComponent(UITransform);
  ui.setContentSize(720, 1280);
  const sprite = art.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  sprite.type = Sprite.Type.SIMPLE;
  place(art, page, 0, 0);
  const loadAt = (index: number) => {
    if (!art.isValid || index >= paths.length) return;
    resources.load(paths[index] + "/spriteFrame", SpriteFrame, (err, frame) => {
      if (!art.isValid) return;
      if (err || !frame) {
        loadAt(index + 1);
        return;
      }
      sprite.spriteFrame = frame;
    });
  };
  loadAt(0);
}

function restoreVeil(page: Node, hold: ShellHold): void {
  if (page.isValid) {
    const dim = page.getChildByName("ShellBackdropDim");
    const art = page.getChildByName("ShellBackdrop");
    if (dim && dim.isValid) dim.destroy();
    if (art && art.isValid) art.destroy();
  }
  const veiled = hold.veiled || [];
  for (let i = 0; i < veiled.length; i++) {
    if (veiled[i].isValid) veiled[i].active = true;
  }
  hold.veiled = [];
}

/**
 * 底栏「战斗」自己的挂机壳。大理石站场、英雄和演武在等 Prefab 之前就铺上。
 * 底钮仍是 BattlePanelLayer（战力UP / 战斗 / 高速战斗）和收益条。
 * 顶栏战力、头像仍是主城壳上的 hangHud，不在这一页再画一条。
 * 没有「功能页」。探针只留给 ?dev=wire，或左侧空地长按。
 * Prefab 失败时站场还在，并补三颗代码钮，中间「战斗」仍发 PAGE_SHELL_FIGHT。
 */
export async function mountHangBattleShell(page: Node): Promise<void> {
  if (!page.isValid) return;
  let hold = holds.get(page);
  if (hold && hold.root) return;
  if (!hold) {
    hold = { want: true, root: null };
    holds.set(page, hold);
  }
  const root = uiNode("PagePrefabShell");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(720, 1280);
  ui.setAnchorPoint(0.5, 0.5);
  root.addComponent(BlockInputEvents);
  mountIdleHang(root);
  bindHangProbe(root, page);
  root.on(Node.EventType.CHILD_ADDED, () => raiseHangProbe(root));
  const raise = () => pinShell(root, page);
  page.on(Node.EventType.CHILD_ADDED, raise);
  root.parent = page;
  root.active = hold.want;
  hold.root = root;
  raise();
  bindHangFill(root);
  page.once(Node.EventType.NODE_DESTROYED, () => {
    holds.delete(page);
  });
  const spec = pagePrefabShell("mainline");
  const path = spec ? spec.path : "prefabs/ui/battle/BattlePanelLayer";
  let view: Node | null = null;
  try {
    const prefab = await loadPrefab(path);
    if (!page.isValid || !root.isValid) return;
    view = spawnPrefab(prefab, root);
    mountCcbiView(view);
    dressHangPanel(view);
    bindFightChrome(view, root, page);
    dropFlatHangButtons(root);
    mountHangMissionChip(root, page);
    raiseHangProbe(root);
    GameLog.shared.info("MainApp", "hang battle shell " + path);
  } catch (err) {
    GameLog.shared.error("MainApp", "hang battle shell " + messageOf(err) + "，站场仍在");
    if (!root.isValid) return;
    if (view && view.isValid) {
      GameLog.shared.error("MainApp", "挂机面板已经在，不补扁平调试钮");
      dropFlatHangButtons(root);
      try {
        bindFightChrome(view, root, page);
      } catch (wireErr) {
        GameLog.shared.error("MainApp", "hang fight chrome " + messageOf(wireErr));
      }
      mountHangMissionChip(root, page);
      raiseHangProbe(root);
      return;
    }
    mountCodeHangBar(root, page);
    mountHangMissionChip(root, page);
    raiseHangProbe(root);
  }
}

/** 面板已经在时，清掉代码补的扁平蓝钮。Prefab 钮没有叫 bg 的色块。 */
function dropFlatHangButtons(root: Node): void {
  const names = ["btn_lineup", "btn_battle", "btn_speed_battle"];
  const kids = root.children.slice();
  for (let i = 0; i < kids.length; i++) {
    const node = kids[i];
    if (names.indexOf(node.name) < 0) continue;
    if (!node.getChildByName("bg")) continue;
    node.destroy();
  }
}

function pinShell(root: Node, page: Node): void {
  if (!root.isValid || root.parent !== page) return;
  const kids = page.children;
  let overlay = -1;
  for (let i = 0; i < kids.length; i++) {
    if (kids[i] !== root && kids[i].name === "BattleEndHold") {
      overlay = i;
      break;
    }
  }
  if (overlay < 0) {
    root.setSiblingIndex(Math.max(0, kids.length - 1));
    return;
  }
  if (kids.indexOf(root) > overlay) root.setSiblingIndex(overlay);
}

/** 左侧空地。不挡中间「战斗」和底栏三钮。按住约 0.7 秒才打开探针。 */
function bindHangProbe(root: Node, page: Node): void {
  const spot = createRect("HangProbeHotspot", 72, 88, new Color(0, 0, 0, 0));
  place(spot, root, -320, 120);
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
  };
  spot.on(Node.EventType.TOUCH_START, () => {
    const battle = root.getChildByName("HangBattle");
    if (battle && battle.active) return;
    clear();
    timer = setTimeout(() => {
      timer = null;
      if (!page.isValid || !root.isValid || !root.active) return;
      page.emit(HANG_PROBE_EVENT);
    }, HANG_PROBE_MS);
    const maybe = timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
  });
  spot.on(Node.EventType.TOUCH_END, clear);
  spot.on(Node.EventType.TOUCH_CANCEL, clear);
}

function raiseHangProbe(root: Node): void {
  const chip = root.getChildByName("HangMissionChip");
  if (chip && chip.isValid) chip.setSiblingIndex(Math.max(0, root.children.length - 1));
  const spot = root.getChildByName("HangProbeHotspot");
  if (!spot || !spot.isValid) return;
  spot.setSiblingIndex(Math.max(0, root.children.length - 1));
}

function mountCodeHangBar(root: Node, page: Node): void {
  const grow = createButton("战力UP", () => {
    void openHangSheet(root, HANG_GROW_PREFAB, (sheet) => bindGrowSheet(sheet));
  }, 180, 56);
  grow.name = "btn_lineup";
  place(grow, root, -220, -470);
  const fight = createButton("战斗", () => startShellFight(root, page), 180, 64);
  fight.name = "btn_battle";
  place(fight, root, 0, -470);
  const quick = createButton("高速战斗", () => {
    void openHangSheet(root, HANG_QUICK_PREFAB, (sheet) => bindQuickSheet(sheet));
  }, 180, 56);
  quick.name = "btn_speed_battle";
  place(quick, root, 220, -470);
}

/**
 * 把 ccbi 根放进 720×1280 父节点中心，并修正九宫格底左角和按钮上的字。
 * 根锚点是 (0,0)。不要用 Widget 的水平/垂直居中，那会把底左角钉在画面中心。
 * 底板已经铺在 0..宽 里的壳，Prefab 根位置写成同一个偏移，编辑器里打开就在设计框中间。
 * 底板中心本来就在根锚点上的壳不要写这个偏移。
 */
export function mountCcbiView(node: Node): void {
  repairCcbiView(node);
  centerInParent(node);
  seatAboveChrome(node);
}

/** 九宫格按底左角归位，小按钮上的字回到盒子中心并缩进按钮。 */
export function repairCcbiView(root: Node): void {
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as Node;
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
    repairSlice(node);
    repairLabel(node);
  }
}

function repairSlice(node: Node): void {
  const sprite = node.getComponent(Sprite);
  if (!sprite || sprite.type !== Sprite.Type.SLICED) return;
  const ui = node.getComponent(UITransform);
  if (!ui) return;
  const host = sizedAncestor(node);
  if (!host) return;
  const pos = anchorIn(node, host.node);
  const shift = sliceAnchorShift(
    {
      x: pos.x,
      y: pos.y,
      ax: ui.anchorX,
      ay: ui.anchorY,
      w: ui.contentSize.width,
      h: ui.contentSize.height,
      sx: node.scale.x,
      sy: node.scale.y,
    },
    {
      ax: host.ui.anchorX,
      ay: host.ui.anchorY,
      w: host.ui.contentSize.width,
      h: host.ui.contentSize.height,
    }
  );
  if (!shift) return;
  node.setPosition(node.position.x + shift.x, node.position.y + shift.y, node.position.z);
}

function repairLabel(node: Node): void {
  const label = node.getComponent(Label);
  const parent = node.parent;
  if (!label || !parent) return;
  const parentUi = parent.getComponent(UITransform);
  if (!parentUi) return;
  const width = parentUi.contentSize.width;
  const height = parentUi.contentSize.height;
  const center = labelCenterInParent(parentUi.anchorX, parentUi.anchorY, width, height, node.position.x, node.position.y);
  if (center) node.setPosition(center.x, center.y, node.position.z);
  if (Math.abs(node.scale.x - 1) > 0.05 || Math.abs(node.scale.y - 1) > 0.05) return;
  if (width < 8 || height < 8 || width > 400) return;
  const text = label.string || "";
  const wide = label.fontSize * Math.max(1, text.length) * 0.55 > width;
  const tall = label.fontSize > height * 0.85;
  if (!wide && !tall) return;
  const ui = node.getComponent(UITransform);
  if (ui) ui.setContentSize(Math.max(8, width - 8), Math.max(8, height - 4));
  label.overflow = Overflow.SHRINK;
}

function sizedAncestor(node: Node): { node: Node; ui: UITransform } | null {
  let cur = node.parent;
  while (cur) {
    const ui = cur.getComponent(UITransform);
    if (ui && ui.contentSize.width > 1 && ui.contentSize.height > 1) return { node: cur, ui };
    cur = cur.parent;
  }
  return null;
}

function anchorIn(node: Node, ancestor: Node): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let cur: Node | null = node;
  while (cur && cur !== ancestor) {
    x += cur.position.x;
    y += cur.position.y;
    cur = cur.parent;
  }
  return { x, y };
}

export function centerInParent(node: Node): void {
  const ui = node.getComponent(UITransform);
  if (!ui) {
    node.setPosition(0, 0, 0);
    return;
  }
  const width = ui.contentSize.width;
  const height = ui.contentSize.height;
  node.setPosition(-(0.5 - ui.anchorX) * width, -(0.5 - ui.anchorY) * height, 0);
}

/** 底边落到 720×1280 底栏下面时，整页上移。短弹窗本来就在安全区里则不动。 */
export function seatAboveChrome(node: Node): void {
  const ui = node.getComponent(UITransform);
  if (!ui || !ui.contentSize) return;
  const height = ui.contentSize.height;
  const anchorY = typeof ui.anchorY === "number" ? ui.anchorY : 0.5;
  const bottom = node.position.y - height * anchorY;
  const limit = -CITY_VIEW_H / 2 + CITY_BAR_BOTTOM;
  if (bottom >= limit) return;
  node.setPosition(node.position.x, node.position.y + (limit - bottom), node.position.z || 0);
}

/**
 * 挂机壳上的「战斗」要在页进入场景后再绑一次。
 * 第一次挂上时世界矩阵还是空的，按钮会抬偏，全屏 menu 把点击吃掉。
 * 切走再回来是新的一页，矩阵已经稳了，所以第二次才点得中。
 */
function bindFightChrome(view: Node, root: Node, page: Node): void {
  let follow = false;
  let tries = 0;
  const settle = () => {
    director.off(Director.EVENT_AFTER_UPDATE, settle);
    if (!view.isValid || !root.isValid || !page.isValid) return;
    const live = root as Node & { activeInHierarchy?: boolean };
    const seated = !!root.parent && live.activeInHierarchy !== false;
    wireFightButtons(view, root, page, seated && follow);
    if (!seated) {
      tries += 1;
      if (tries < 90) director.on(Director.EVENT_AFTER_UPDATE, settle);
      return;
    }
    if (!follow) {
      follow = true;
      director.on(Director.EVENT_AFTER_UPDATE, settle);
    }
  };
  settle();
  page.once(Node.EventType.NODE_DESTROYED, () => {
    director.off(Director.EVENT_AFTER_UPDATE, settle);
  });
}

const CHIP_INK = new Color(255, 236, 190, 255);

/** 左上角关卡标。点开已有 ChapterPreviewLayer，不把整窗铺在地上。 */
function mountHangMissionChip(root: Node, page: Node): void {
  if (!root.isValid || root.getChildByName("HangMissionChip")) return;
  const chip = uiNode("HangMissionChip");
  const ui = chip.addComponent(UITransform);
  ui.setContentSize(196, 64);
  place(chip, root, -240, 220);
  const icon = uiNode("icon");
  const iconUi = icon.addComponent(UITransform);
  iconUi.setContentSize(56, 56);
  const iconSprite = icon.addComponent(Sprite);
  iconSprite.sizeMode = Sprite.SizeMode.CUSTOM;
  place(icon, chip, -64, 0);
  paintChipIcon(icon);
  const label = createLabel(hangMissionCaption(), 16, { color: CHIP_INK, width: 120, height: 40 });
  label.name = "HangMissionLabel";
  place(label, chip, 24, 0);
  if (!chip.getComponent(Button)) chip.addComponent(Button);
  chip.on(Button.EventType.CLICK, () => {
    void openHangSheet(root, HANG_CHAPTER_PREFAB, (sheet) => {
      dressChapterPreview(sheet, () => {
        const host = sheet.parent;
        if (host && host.isValid) host.destroy();
        startShellFight(root, page);
      });
    });
  });
  const refresh = () => {
    if (!label.isValid) return;
    setText(label, hangMissionCaption());
  };
  refresh();
  const off = WireSession.onSync(refresh);
  chip.once(Node.EventType.NODE_DESTROYED, () => off());
}

function paintChipIcon(node: Node): void {
  const sprite = node.getComponent(Sprite);
  if (!sprite) return;
  const path = "ui/city/main-city_icon-main_mission";
  try {
    resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
      if (!node.isValid) return;
      if (err || !asset) {
        GameLog.shared.warn("Mainline", "关卡标 " + path + " 没有挂上，字仍在");
        return;
      }
      sprite.spriteFrame = asset;
    });
  } catch (err) {
    GameLog.shared.warn("Mainline", "关卡标 ui/city/main-city_icon-main_mission 没有挂上，字仍在");
  }
}

/** MAIN 空着先出阵，已经有英雄就直接开战。出阵和关卡预览的「出战」都走这里。 */
export function startShellFight(root: Node, page: Node): void {
  if (!page.isValid) return;
  const go = () => {
    beginHangBattle(page, "我方", "敌方");
    if (page.isValid) page.emit(PAGE_SHELL_FIGHT);
  };
  if (hangLineupReady()) {
    go();
    return;
  }
  void openHangSheet(root, HANG_FORMATION_PREFAB, (sheet) => {
    bindFormationSheet(sheet, () => {
      const host = sheet.parent;
      if (host && host.isValid) host.destroy();
      go();
    });
  });
}

/** 中间「战斗」和两侧底栏抬到壳根上。全屏 menu 不再当命中框。 */
function wireFightButtons(view: Node, root: Node, page: Node, again: boolean): void {
  const battle = findDescendant(root, "btn_battle");
  if (battle) {
    liftNode(battle, root);
    bindTapOnce(battle, () => startShellFight(root, page));
    pokeButton(battle, again);
  }
  bindHangSheets(view, root, again);
  silenceHangMenu(view);
  raiseHangProbe(root);
}

/** menu 是 640×960 的空命中框，盖住中间「战斗」。收成 0 后点击落到按钮上。 */
function silenceHangMenu(view: Node): void {
  const menu = findDescendant(view, "menu");
  if (!menu) return;
  const ui = menu.getComponent(UITransform);
  if (!ui || !ui.contentSize) return;
  if (ui.contentSize.width > 400 || ui.contentSize.height > 400) ui.setContentSize(0, 0);
}

/**
 * 底栏两侧。快速战斗打开已有 QuickBattleLayer，并读 3012。不发 3013。
 * 我要变强打开已有 HeroSuggestLayer（英雄变强）。关掉回到挂机。
 */
function bindHangSheets(view: Node, host: Node, again: boolean): void {
  const quick = findDescendant(host, "btn_speed_battle") || findDescendant(view, "btn_speed_battle");
  if (quick) {
    liftNode(quick, host);
    bindTapOnce(quick, () => {
      void openHangSheet(host, HANG_QUICK_PREFAB, (sheet) => bindQuickSheet(sheet));
    });
    pokeButton(quick, again);
  }
  const grow = findDescendant(host, "btn_lineup") || findDescendant(view, "btn_lineup");
  if (grow) {
    liftNode(grow, host);
    bindTapOnce(grow, () => {
      void openHangSheet(host, HANG_GROW_PREFAB, (sheet) => bindGrowSheet(sheet));
    });
    pokeButton(grow, again);
  }
}

function bindQuickSheet(sheet: Node): void {
  const write = () => {
    const line = formatWireQuickBattle(WireSession.quickBattle);
    const tip = findDescendant(sheet, "lbl_tip_2");
    if (tip && tip.isValid) setText(tip, line + " · 不发 3013");
    return line;
  };
  write();
  if (!WireSession.hasQuickBattle()) WireSession.pullQuickBattleCount();
  let off = () => {};
  off = WireSession.onSync(() => {
    if (!sheet.isValid) {
      off();
      return;
    }
    write();
  });
  sheet.once(Node.EventType.NODE_DESTROYED, () => off());
  const preview = quickPreviewLine();
  const tip = findDescendant(sheet, "lbl_tip_1");
  if (tip) setText(tip, preview);
  const go = findDescendant(sheet, "btn_quick");
  if (go) {
    liftNode(go, sheet);
    bindTap(go, () => {
      const line = write();
      if (tip && tip.isValid) setText(tip, preview + " · 未发 3013");
      GameLog.shared.info("Mainline", "快速战斗只读 " + line + "，不发 3013。" + preview);
    });
  }
  const info = findDescendant(sheet, "btn_info");
  if (info) {
    bindTap(info, () => {
      if (tip && tip.isValid) setText(tip, "高速战斗按两小时挂机收益预览，不发 3013");
    });
  }
  const jump = findDescendant(sheet, "btn_jump");
  if (jump) {
    bindTap(jump, () => {
      if (tip && tip.isValid) setText(tip, "这一页不跳转");
    });
  }
}

/** 我要变强。四个页签只切换已有节点，不发协议。 */
function bindGrowSheet(sheet: Node): void {
  const panels = ["node_strong", "node_resource", "node_hero", "node_lineup"];
  const show = (name: string) => {
    for (let i = 0; i < panels.length; i++) {
      const node = findDescendant(sheet, panels[i]);
      if (node) node.active = panels[i] === name;
    }
  };
  show("node_strong");
  const name = findDescendant(sheet, "_heroStrongName");
  if (name) setText(name, growLine());
  const pairs = [
    ["btn_strong", "node_strong"],
    ["btn_resource", "node_resource"],
    ["btn_hero", "node_hero"],
    ["btn_lineup", "node_lineup"],
  ];
  for (let i = 0; i < pairs.length; i++) {
    const button = findDescendant(sheet, pairs[i][0]);
    const panel = pairs[i][1];
    if (!button) continue;
    bindTap(button, () => show(panel));
  }
  const strategy = findDescendant(sheet, "btn_strategy");
  if (strategy) {
    bindTap(strategy, () => {
      if (name && name.isValid) setText(name, growLine());
      GameLog.shared.info("Mainline", "我要变强没有服端协议，只展示名册，不改战力，不发 3013");
    });
  }
}

function growLine(): string {
  const heroes = GameStore.heroes() || [];
  if (heroes.length === 0) return "名册是空的";
  const names: string[] = [];
  for (let i = 0; i < heroes.length && names.length < 3; i++) {
    if (heroes[i].name) names.push(heroes[i].name);
  }
  return names.length > 0 ? names.join("、") : "已有英雄";
}

/** idle_speed_up 是 7200 秒，按两小时的 reward_base 预览。不发放。 */
function quickPreviewLine(): string {
  const minute = chapterIdleMinute(hangStageIdx());
  if (!minute) return "两小时收益还没有配置";
  return "两小时约 金币 " + minute.gold * 120 + " · 英雄经验 " + minute.heroExp * 120 + " · 角色经验 " + minute.roleExp * 120;
}

function silenceSheetMenus(root: Node): void {
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as Node;
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
    if (node.name.indexOf("Menu") < 0 && node.name !== "menu" && node.name.indexOf("menu") < 0) continue;
    const ui = node.getComponent(UITransform);
    if (!ui || ui.contentSize.width < 400 || ui.contentSize.height < 400) continue;
    ui.setContentSize(0, 0);
  }
}

function hangStageIdx(): number {
  const mock = GameStore.mockStageId();
  if (mock !== null && mock >= 1) return Math.floor(mock);
  const chapter = GameStore.chapter();
  if (chapter.nowIdx !== null && chapter.nowIdx >= 1) return Math.floor(chapter.nowIdx);
  if (chapter.maxIdx !== null && chapter.maxIdx >= 1) return Math.floor(chapter.maxIdx);
  return 1;
}

async function openHangSheet(host: Node, path: string, onReady?: (view: Node) => void): Promise<void> {
  if (!host.isValid) return;
  const old = host.getChildByName("BattleSheet");
  if (old) old.destroy();
  try {
    const prefab = await loadPrefab(path);
    if (!host.isValid) return;
    const sheet = uiNode("BattleSheet");
    const ui = sheet.addComponent(UITransform);
    ui.setContentSize(720, 1280);
    sheet.addComponent(BlockInputEvents);
    place(createRect("dim", 720, 1280, new Color(8, 16, 32, 170)), sheet, 0, 0);
    const view = spawnPrefab(prefab, sheet);
    mountCcbiView(view);
    silenceSheetMenus(view);
    const close = () => {
      if (sheet.isValid) sheet.destroy();
    };
    const button = findDescendant(view, "btn_close");
    if (button) {
      liftNode(button, view);
      bindTap(button, close);
    } else {
      const back = createButton("关闭", close, 160, 44);
      back.name = "BtnSheetClose";
      place(back, sheet, 0, -460);
    }
    if (onReady) onReady(view);
    sheet.parent = host;
    sheet.setSiblingIndex(Math.max(0, host.children.length - 1));
    GameLog.shared.info("Mainline", "hang sheet " + path);
  } catch (err) {
    GameLog.shared.warn("Mainline", "hang sheet " + path + " " + messageOf(err));
  }
}

export function findDescendant(root: Node, name: string): Node | null {
  if (root.name === name) return root;
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) {
    const found = findDescendant(kids[i], name);
    if (found) return found;
  }
  return null;
}

export function bindTap(node: Node, fn: () => void): void {
  if (!node.getComponent(Button)) node.addComponent(Button);
  node.on(Button.EventType.CLICK, fn);
}

/** 同一颗钮只绑一次。CLICK 和 TOUCH_END 都会到，80ms 内只算一下。 */
function bindTapOnce(node: Node, fn: () => void): void {
  const mark = node as Node & { mxzgTap?: boolean };
  if (mark.mxzgTap) return;
  mark.mxzgTap = true;
  if (!node.getComponent(Button)) node.addComponent(Button);
  let last = 0;
  const fire = () => {
    const now = Date.now();
    if (now - last < 80) return;
    last = now;
    fn();
  };
  node.on(Button.EventType.CLICK, fire);
  node.on(Node.EventType.TOUCH_END, fire);
}

/** 进了场景再拨一下 active，指针列表才会收这颗钮。没进场景时不拨。 */
function pokeButton(node: Node, again: boolean): void {
  const mark = node as Node & { mxzgPoked?: boolean; activeInHierarchy?: boolean };
  if (mark.mxzgPoked && !again) return;
  if (!node.parent || mark.activeInHierarchy === false) return;
  mark.mxzgPoked = true;
  node.active = false;
  node.active = true;
}

/**
 * 全屏 CCMenu 会挡住兄弟节点。把按钮抬到宿主最上层，世界位置不变。
 * 记下 Prefab 里的原位。下一帧矩阵稳了再抬一次，不会停在第一次的空矩阵上。
 * 已经在宿主上时仍把这颗钮放到最前。
 */
export function liftNode(node: Node, host: Node): void {
  const mark = node as Node & { mxzgRest?: { parent: Node; x: number; y: number; z: number } };
  if (!mark.mxzgRest && node.parent && node.parent !== host) {
    mark.mxzgRest = { parent: node.parent, x: node.position.x, y: node.position.y, z: node.position.z };
  }
  const rest = mark.mxzgRest;
  const from = rest && rest.parent.isValid ? rest.parent : node.parent;
  if (!from) return;
  if (from === host) {
    node.setSiblingIndex(Math.max(0, host.children.length - 1));
    return;
  }
  const pos =
    rest && from === rest.parent
      ? { x: rest.x, y: rest.y, z: rest.z }
      : { x: node.position.x, y: node.position.y, z: node.position.z };
  const fromUi = from.getComponent(UITransform);
  const hostUi = host.getComponent(UITransform);
  const fromConv = fromUi as UITransform & {
    convertToWorldSpaceAR?: (p: { x: number; y: number; z?: number }) => { x: number; y: number; z?: number };
  };
  const hostConv = hostUi as UITransform & {
    convertToNodeSpaceAR?: (p: { x: number; y: number; z?: number }) => { x: number; y: number; z?: number };
  };
  if (!fromConv || !fromConv.convertToWorldSpaceAR || !hostConv || !hostConv.convertToNodeSpaceAR) {
    node.setSiblingIndex(Math.max(0, from.children.length - 1));
    return;
  }
  try {
    const world = fromConv.convertToWorldSpaceAR(pos);
    if (!world || !isFinite(world.x) || !isFinite(world.y)) {
      node.setSiblingIndex(Math.max(0, from.children.length - 1));
      return;
    }
    if (node.parent !== host) node.parent = host;
    const local = hostConv.convertToNodeSpaceAR(world);
    if (!local || !isFinite(local.x) || !isFinite(local.y)) {
      node.setSiblingIndex(Math.max(0, host.children.length - 1));
      return;
    }
    node.setPosition(local.x, local.y, local.z || 0);
    node.setSiblingIndex(Math.max(0, host.children.length - 1));
  } catch (_err) {
    if (node.parent) node.setSiblingIndex(Math.max(0, node.parent.children.length - 1));
  }
}
