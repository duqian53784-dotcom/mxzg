import { Color, Label, Node, Overflow, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { CITY_BAR, cityBarSlot } from "../config/nav";
import { takeStagedChrome } from "./cityStage";
import {
  bindClick,
  CITY_CHROME_PREFAB_PATH,
  findNode,
  loadPrefab,
  requireNode,
  spawnPrefab,
  tintSprite,
} from "./prefabLoad";
import { createButton, createLabel, createRect, paintRect, place, setText, uiNode } from "./UiKit";
import { bindVisibleRefresh, fitVisibleRoot, squeezeWideNode, stretchBar, uiSize } from "./visibleFit";

export type TabVisual = "selected" | "open" | "locked";

export interface TabState {
  id: string;
  text: string;
  state: TabVisual;
  /** 锁着且主线门槛大于 1 时写在钮上，例如 15。0 表示不写 Lv。 */
  lockLevel?: number;
}

export interface CityChrome {
  root: Node;
  setIdentity(nameLine: string, subLine: string): void;
  setCurrencies(goldLine: string, diamondLine: string): void;
  /** 空串表示没有战力数据，不要留 Prefab 默认的 0。 */
  setPower(text: string): void;
  /** 空串藏掉头像下的占位等级。 */
  setLevelBadge(text: string): void;
  /** null 关掉空褐圈。有路径时用英雄头像盖住框心。 */
  setAvatar(icon: string | null): void;
  setTabs(tabs: TabState[]): void;
  /** 只在主城页显示 ActGroup / UtilityRow。代码壳没有这两块。 */
  setCityExtras(visible: boolean): void;
}

/** Prefab 壳上的活动列表、更多列表和邮件。底栏七项仍走 onTab。 */
export interface CityChromeActions {
  openActivity(): void;
  openMore(): void;
  openMail(): void;
}

/** 右上活动组。点开都进原来的活动列表，不另开导航。 */
const ACTIVITY_HUB_PATHS = [
  "ActGroup/ActRecommend",
  "ActGroup/ActSevenDay",
  "ActGroup/ActHeroArrive",
  "ActGroup/ActPrivilege",
  "ActGroup/ActWelfare",
  "ActGroup/BtnActExpand",
  "ActGroup/ActLimitGift",
  "ActGroup/ActLimitTime",
];

/** 底栏上方工具圆。更多进更多列表。录像、好友、排行没有单独页，也进更多列表。 */
const MORE_HUB_PATHS = [
  "UtilityRow/BtnReplay",
  "UtilityRow/BtnFriend",
  "UtilityRow/BtnRank",
  "UtilityRow/BtnMore",
];

const TAB_SELECTED = new Color(186, 122, 42, 255);
const TAB_OPEN = new Color(46, 110, 190, 255);
const TAB_LOCKED = new Color(78, 84, 98, 255);
const NAME_COLOR = new Color(255, 228, 170, 255);
const SUB_COLOR = new Color(190, 205, 225, 255);
const GOLD_COLOR = new Color(255, 214, 120, 255);
const DIAMOND_COLOR = new Color(150, 216, 235, 255);

/**
 * 顶栏和底栏。挂在 UIShell 的 chrome 层，不进页面栈。
 * 设计分辨率 720×1280，原点在画面中心。
 * USE_CITY_CHROME_PREFAB 为 false，或 Prefab 加载失败时，MainApp 仍调用这里。
 */
export function mountCityChrome(parent: Node, onTab: (id: string) => void): CityChrome {
  const root = uiNode("CityChrome");
  root.parent = parent;

  place(createRect("top-bg", 720, 112, new Color(18, 32, 58, 245)), root, 0, 576);
  const nameNode = place(
    createLabel("未登录", 26, { color: NAME_COLOR, width: 360, align: "left" }),
    root,
    -150,
    598
  );
  const subNode = place(
    createLabel("请从 Boot 进入", 18, { color: SUB_COLOR, width: 360, align: "left" }),
    root,
    -150,
    558
  );
  const goldNode = place(
    createLabel("金币 0", 22, { color: GOLD_COLOR, width: 240, align: "left" }),
    root,
    200,
    598
  );
  const diamondNode = place(
    createLabel("钻石 0", 22, { color: DIAMOND_COLOR, width: 240, align: "left" }),
    root,
    200,
    558
  );

  place(createRect("bottom-bg", 720, 104, new Color(14, 24, 44, 245)), root, 0, -580);
  const buttons: { [id: string]: Node } = {};
  for (let i = 0; i < CITY_BAR.length; i++) {
    const entry = CITY_BAR[i];
    const slot = cityBarSlot(i);
    const button = createButton(entry.title, () => onTab(entry.id), slot.size, slot.size, TAB_OPEN, 16);
    button.name = "tab-" + entry.id;
    place(button, root, slot.x, slot.y);
    buttons[entry.id] = button;
  }

  bindCityChromeFit(root);
  return {
    root,
    setIdentity(nameLine: string, subLine: string): void {
      setText(nameNode, nameLine);
      applySubLine(subNode, subLine);
    },
    setCurrencies(goldLine: string, diamondLine: string): void {
      setText(goldNode, goldLine);
      setText(diamondNode, diamondLine);
    },
    setPower(): void {},
    setLevelBadge(): void {},
    setAvatar(): void {},
    setTabs(tabs: TabState[]): void {
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const button = buttons[tab.id];
        if (!button) continue;
        const label = button.getChildByName("Label");
        const level = tab.state === "locked" && tab.lockLevel && tab.lockLevel > 1 ? tab.lockLevel : 0;
        if (label) setText(label, level > 0 ? "Lv" + level : tab.text);
        const bg = button.getChildByName("bg");
        if (bg) paintRect(bg, fillOf(tab.state));
      }
    },
    setCityExtras(): void {},
  };
}

/** 「真服 · 角色 id」是调试行。正式服顶栏只留名字和等级。 */
function applySubLine(node: Node, subLine: string): void {
  const debug = subLine.indexOf("真服 ·") === 0;
  node.active = !debug;
  setText(node, debug ? "" : subLine);
}

function fillOf(state: TabVisual): Color {
  if (state === "locked") return TAB_LOCKED;
  if (state === "selected") return TAB_SELECTED;
  return TAB_OPEN;
}

const PREFAB_TAB_SELECTED = new Color(255, 210, 140, 255);
const PREFAB_TAB_OPEN = new Color(255, 255, 255, 255);
const PREFAB_TAB_LOCKED = new Color(160, 164, 176, 255);

/**
 * main-scene_spr-bottom-bg 原始 640×129，Prefab 里 CUSTOM 拉到 720×129。
 * 左右装饰没有铺满：左侧约 9–25px 全透明，外缘描边约 (52, 30, 26)。
 * 拉宽后这块透出清屏黑。垫色取这条描边，避免透缝变成另一条色带。
 */
const BOTTOM_BG_WIDTH = 724;
const BOTTOM_PAD_COLOR = new Color(46, 26, 22, 255);

/**
 * 底栏字图。副本的文件名是 skin，字是「副本」。
 * 最右一格用日服 VIP 字，不用国服「羁绊」。
 */
const TAB_CAPTION: { [id: string]: string } = {
  city: "ui/city/main-scene-lang_lbl-city",
  hero: "ui/city/main-scene-lang_lbl-hero",
  bag: "ui/city/main-scene-lang_lbl-backpack",
  battle: "ui/city/main-scene-lang_lbl-battle",
  dungeon: "ui/city/main-scene-lang_lbl-skin",
  clan: "ui/city/main-scene-lang_lbl-clan",
  fetter: "ui/city/main-scene-lang_lbl-fetters-unlock",
};

/** 最右一格的图标。Prefab 里可能还是粉钻，这里换成同套皇冠。 */
const TAB_ICON: { [id: string]: string } = {
  fetter: "ui/city/main-scene_spr-fetters-unlock",
};

/**
 * 绑定 CityChrome.prefab。
 * TopBar 下是 LblName、LblSub、CurrencyGold/Value、CurrencyGem/Value。
 * BottomBar 下是 TabCity、TabHero、TabBag、TabBattle、TabDungeon、TabClan、TabFetter，子节点 Label、Lock。
 * 路径相对 assets：prefabs/ui/city/CityChrome。Prefab 不走 resources.load。
 * 七个底栏字是 resources 里的字图（副本文件名 lbl-skin，最右是 VIP）。
 * 不改 USE_CITY_CHROME_PREFAB，也不改 Boot。
 * ActGroup 打开活动列表，UtilityRow/BtnMore 打开更多列表，BtnMail 打开原来的邮件页。
 * BtnActivity / BtnMorePanel 保持 Prefab 里的未激活，避免再盖一层矩形。
 * 底栏七个钮仍把 id 交给 onTab。战斗进主线，副本进日常副本。
 */
export async function mountCityChromePrefab(
  parent: Node,
  onTab: (id: string) => void,
  actions: CityChromeActions
): Promise<CityChrome> {
  const staged = takeStagedChrome();
  const root = staged ?? spawnPrefab(await loadPrefab(CITY_CHROME_PREFAB_PATH), parent);
  if (staged) root.parent = parent;
  try {
    return bindCityChromePrefab(root, onTab, actions);
  } catch (err) {
    root.destroy();
    throw err;
  }
}

function bindCityChromePrefab(root: Node, onTab: (id: string) => void, actions: CityChromeActions): CityChrome {
  sealBottomBg(root);
  const nameNode = requireNode(root, "TopBar/LblName");
  const subNode = requireNode(root, "TopBar/LblSub");
  const goldNode = requireNode(root, "TopBar/CurrencyGold/Value");
  const diamondNode = requireNode(root, "TopBar/CurrencyGem/Value");
  const tabPath: { [id: string]: string } = {
    city: "BottomBar/TabCity",
    hero: "BottomBar/TabHero",
    bag: "BottomBar/TabBag",
    battle: "BottomBar/TabBattle",
    dungeon: "BottomBar/TabDungeon",
    clan: "BottomBar/TabClan",
    fetter: "BottomBar/TabFetter",
  };
  const buttons: { [id: string]: Node } = {};
  for (let i = 0; i < CITY_BAR.length; i++) {
    const entry = CITY_BAR[i];
    const button = requireNode(root, tabPath[entry.id]);
    const lock = button.getChildByName("Lock");
    if (lock) lock.active = false;
    const label = button.getChildByName("Label");
    if (label) label.active = false;
    mountTabCaption(button, TAB_CAPTION[entry.id] || "");
    mountTabIcon(button, TAB_ICON[entry.id] || "");
    bindClick(button, () => onTab(entry.id));
    buttons[entry.id] = button;
  }
  for (let i = 0; i < ACTIVITY_HUB_PATHS.length; i++) {
    bindClick(requireNode(root, ACTIVITY_HUB_PATHS[i]), () => actions.openActivity());
  }
  for (let i = 0; i < MORE_HUB_PATHS.length; i++) {
    bindClick(requireNode(root, MORE_HUB_PATHS[i]), () => actions.openMore());
  }
  bindClick(requireNode(root, "UtilityRow/BtnMail"), () => actions.openMail());
  bindCityChromeFit(root);

  return {
    root,
    setIdentity(nameLine: string, subLine: string): void {
      setText(nameNode, nameLine);
      applySubLine(subNode, subLine);
    },
    setCurrencies(goldLine: string, diamondLine: string): void {
      setText(goldNode, goldLine);
      setText(diamondNode, diamondLine);
    },
    setPower(text: string): void {
      const node = findNode(root, "TopBar/PowerSlot/Value");
      if (!node) return;
      setText(node, text);
      const label = node.getComponent(Label);
      if (label) label.overflow = Overflow.SHRINK;
      const ui = node.getComponent(UITransform);
      if (ui) ui.setContentSize(68, 24);
    },
    setLevelBadge(text: string): void {
      const label = findNode(root, "TopBar/LblLevel");
      const bg = findNode(root, "TopBar/LevelBg");
      const show = text.length > 0;
      if (label) {
        label.active = show;
        if (show) setText(label, text);
      }
      if (bg) bg.active = show;
    },
    setAvatar(icon: string | null): void {
      paintAvatar(root, icon);
    },
    setTabs(tabs: TabState[]): void {
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const button = buttons[tab.id];
        if (!button) continue;
        // 字图保持「副本」。不要把「锁·」写进 84px 的 Label，挤开会像「领·副本」。
        tintSprite(button, prefabTabColor(tab.state));
        const lock = button.getChildByName("Lock");
        if (lock) {
          const locked = tab.state === "locked";
          lock.active = locked;
          if (locked) paintLockLevel(lock, tab.lockLevel && tab.lockLevel > 1 ? tab.lockLevel : 0);
        }
      }
    },
    setCityExtras(visible: boolean): void {
      const act = findNode(root, "ActGroup");
      const utility = findNode(root, "UtilityRow");
      if (act) act.active = visible;
      if (utility) utility.active = visible;
    },
  };
}

/**
 * 顶栏（名字、战力、头像，挂机页也不另画一条）和底栏七项。
 * Widget 左右拉到 view.getVisibleSize() 的宽，不写死 720。
 * 窄屏只把按钮往中间收，背景仍铺满可见宽。
 */
function bindCityChromeFit(root: Node): void {
  bindVisibleRefresh(root, () => {
    if (!root.isValid) return;
    const box = fitVisibleRoot(root);
    fitChromeChildren(root, box.width);
  });
}

/** 底栏贴住已经铺满可见高度的根节点底边，左右仍由 stretchBar 拉到可见宽。 */
function pinBottomBar(bar: Node, width: number): void {
  stretchBar(bar, width, "bottom");
}

function fitChromeChildren(root: Node, width: number): void {
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) {
    const child = kids[i];
    if (child.name === "TopBar" || child.name === "top-bg") stretchBar(child, width, "top");
    else if (child.name === "BottomBar" || child.name === "bottom-bg") pinBottomBar(child, width);
    else squeezeWideNode(child, width);
  }
  for (let i = 0; i < kids.length; i++) {
    const child = kids[i];
    if (child.name !== "TopBar" && child.name !== "BottomBar") continue;
    const inner = child.children;
    for (let j = 0; j < inner.length; j++) {
      const node = inner[j];
      if (node.name === "Bg" || node.name === "BgPad") continue;
      squeezeWideNode(node, width);
    }
  }
}

function paintAvatar(root: Node, icon: string | null): void {
  const avatar = findNode(root, "TopBar/Avatar");
  if (!avatar) return;
  if (!icon) {
    avatar.active = false;
    return;
  }
  avatar.active = true;
  let face = avatar.getChildByName("Face");
  if (!face) {
    face = uiNode("Face");
    const ui = face.addComponent(UITransform);
    ui.setContentSize(78, 78);
    const sprite = face.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    face.setPosition(0, 0, 0);
    face.parent = avatar;
  }
  const mark = face as Node & { mxzgIcon?: string };
  if (mark.mxzgIcon === icon) return;
  mark.mxzgIcon = icon;
  const sprite = face.getComponent(Sprite);
  if (!sprite) return;
  const wanted = icon;
  resources.load(wanted + "/spriteFrame", SpriteFrame, (err, frame) => {
    if (err || !frame || !face || !face.isValid) return;
    if (mark.mxzgIcon !== wanted) return;
    sprite.spriteFrame = frame;
  });
}

function mountTabCaption(button: Node, path: string): void {
  if (!path) return;
  const ui = button.getComponent(UITransform);
  const plate = ui ? ui.contentSize.height : 78;
  const node = uiNode("Caption");
  const captionUi = node.addComponent(UITransform);
  captionUi.setContentSize(plate >= 90 ? 65 : 54, plate >= 90 ? 36 : 30);
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  node.setPosition(0, plate >= 90 ? -46 : -36, 0);
  node.parent = button;
  resources.load(path + "/spriteFrame", SpriteFrame, (err, frame) => {
    if (err || !frame || !sprite.isValid) return;
    sprite.spriteFrame = frame;
  });
}

/** 只换指定格子的 Icon。其它格子继续用 Prefab 里的图。 */
function mountTabIcon(button: Node, path: string): void {
  if (!path) return;
  const icon = button.getChildByName("Icon");
  const sprite = icon ? icon.getComponent(Sprite) : null;
  if (!sprite) return;
  resources.load(path + "/spriteFrame", SpriteFrame, (err, frame) => {
    if (err || !frame || !sprite.isValid) return;
    sprite.spriteFrame = frame;
  });
}

/**
 * BottomBar/Bg 背后垫满底栏，盖住 640→屏宽的左右透边，以及贴图底边到屏幕底的缝。
 * 不改七个 Tab 的位置。顶栏原图左缘不透明，这里不垫。
 */
function sealBottomBg(root: Node): void {
  const bg = requireNode(root, "BottomBar/Bg");
  const ui = bg.getComponent(UITransform);
  const bottom = bg.parent;
  if (!bottom) return;
  const barUi = bottom.getComponent(UITransform);
  const barSize = uiSize(barUi);
  const bgSize = uiSize(ui);
  const barW = barSize && barSize.width > BOTTOM_BG_WIDTH ? barSize.width : BOTTOM_BG_WIDTH;
  const barH = barSize && barSize.height > 0 ? barSize.height : 140;
  const height = bgSize && bgSize.height > 0 ? bgSize.height : 129;
  if (ui) ui.setContentSize(barW, height);
  const pad = createRect("BgPad", barW, barH, BOTTOM_PAD_COLOR);
  pad.setPosition(0, 0, 0);
  const index = bg.getSiblingIndex();
  pad.parent = bottom;
  pad.setSiblingIndex(index);
}

function paintLockLevel(lock: Node, level: number): void {
  const text = level > 1 ? "Lv" + level : "";
  let node = lock.getChildByName("Lv");
  if (!text) {
    if (node) node.active = false;
    return;
  }
  if (!node) {
    node = createLabel(text, 16, { color: new Color(255, 244, 220, 255), width: 64, height: 22 });
    node.name = "Lv";
    node.setPosition(0, -20, 0);
    node.parent = lock;
  }
  node.active = true;
  setText(node, text);
  const label = node.getComponent(Label);
  if (label) label.overflow = Overflow.SHRINK;
}

function prefabTabColor(state: TabVisual): Color {
  if (state === "locked") return PREFAB_TAB_LOCKED;
  if (state === "selected") return PREFAB_TAB_SELECTED;
  return PREFAB_TAB_OPEN;
}
