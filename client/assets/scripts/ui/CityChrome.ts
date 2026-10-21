import { Color, Node, UITransform } from "cc";
import { BOTTOM_TABS } from "../config/nav";
import {
  bindClick,
  CITY_CHROME_PREFAB_PATH,
  loadPrefab,
  requireNode,
  spawnPrefab,
  tintSprite,
} from "./prefabLoad";
import { createButton, createLabel, createRect, paintRect, place, setText, uiNode } from "./UiKit";

export type TabVisual = "selected" | "open" | "locked";

export interface TabState {
  id: string;
  text: string;
  state: TabVisual;
}

export interface CityChrome {
  root: Node;
  setIdentity(nameLine: string, subLine: string): void;
  setCurrencies(goldLine: string, diamondLine: string): void;
  setTabs(tabs: TabState[]): void;
}

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
  const width = 124;
  const gap = 6;
  const span = BOTTOM_TABS.length * width + (BOTTOM_TABS.length - 1) * gap;
  const origin = -span / 2 + width / 2;
  for (let i = 0; i < BOTTOM_TABS.length; i++) {
    const entry = BOTTOM_TABS[i];
    const button = createButton(entry.title, () => onTab(entry.id), width, 72, TAB_OPEN, 18);
    button.name = "tab-" + entry.id;
    place(button, root, origin + i * (width + gap), -580);
    buttons[entry.id] = button;
  }

  return {
    root,
    setIdentity(nameLine: string, subLine: string): void {
      setText(nameNode, nameLine);
      setText(subNode, subLine);
    },
    setCurrencies(goldLine: string, diamondLine: string): void {
      setText(goldNode, goldLine);
      setText(diamondNode, diamondLine);
    },
    setTabs(tabs: TabState[]): void {
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const button = buttons[tab.id];
        if (!button) continue;
        const label = button.getChildByName("Label");
        if (label) setText(label, tab.text);
        const bg = button.getChildByName("bg");
        if (bg) paintRect(bg, fillOf(tab.state));
      }
    },
  };
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
const BOTTOM_PAD_WIDTH = 728;
const BOTTOM_PAD_COLOR = new Color(46, 26, 22, 255);

/**
 * 绑定 CityChrome.prefab。Top/Bottom 下是 Name、Sub、Gold、Diamond 和 Tab_*。
 * 路径相对 assets：prefabs/ui/city/CityChrome。不走 resources.load。
 */
export async function mountCityChromePrefab(parent: Node, onTab: (id: string) => void): Promise<CityChrome> {
  const prefab = await loadPrefab(CITY_CHROME_PREFAB_PATH);
  const root = spawnPrefab(prefab, parent);
  try {
    return bindCityChromePrefab(root, onTab);
  } catch (err) {
    root.destroy();
    throw err;
  }
}

function bindCityChromePrefab(root: Node, onTab: (id: string) => void): CityChrome {
  sealBottomBg(root);
  const nameNode = requireNode(root, "Top/Name");
  const subNode = requireNode(root, "Top/Sub");
  const goldNode = requireNode(root, "Top/Gold");
  const diamondNode = requireNode(root, "Top/Diamond");
  const buttons: { [id: string]: Node } = {};
  for (let i = 0; i < BOTTOM_TABS.length; i++) {
    const entry = BOTTOM_TABS[i];
    const button = requireNode(root, "Bottom/Tab_" + entry.id);
    const lock = button.getChildByName("Lock");
    if (lock) lock.active = false;
    bindClick(button, () => onTab(entry.id));
    buttons[entry.id] = button;
  }

  return {
    root,
    setIdentity(nameLine: string, subLine: string): void {
      setText(nameNode, nameLine);
      setText(subNode, subLine);
    },
    setCurrencies(goldLine: string, diamondLine: string): void {
      setText(goldNode, goldLine);
      setText(diamondNode, diamondLine);
    },
    setTabs(tabs: TabState[]): void {
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        const button = buttons[tab.id];
        if (!button) continue;
        const label = button.getChildByName("Label");
        if (label) setText(label, tab.text);
        tintSprite(button, prefabTabColor(tab.state));
        const lock = button.getChildByName("Lock");
        if (lock) lock.active = tab.state === "locked";
      }
    },
  };
}

/**
 * Bottom/Bg 背后垫满宽实色，并略加宽贴图节点，盖住 640→720 的左右透边。
 * 不改五个 Tab 的位置。Top/Bg 原始 616×146 且左缘不透明，这里不垫。
 */
function sealBottomBg(root: Node): void {
  const bg = requireNode(root, "Bottom/Bg");
  const ui = bg.getComponent(UITransform);
  const height = ui && ui.contentSize && typeof ui.contentSize.height === "number" ? ui.contentSize.height : 129;
  if (ui) ui.setContentSize(BOTTOM_BG_WIDTH, height);
  const bottom = bg.parent;
  if (!bottom) return;
  const pad = createRect("BgPad", BOTTOM_PAD_WIDTH, height, BOTTOM_PAD_COLOR);
  pad.setPosition(bg.position.x, bg.position.y, 0);
  const index = bg.getSiblingIndex();
  pad.parent = bottom;
  pad.setSiblingIndex(index);
}

function prefabTabColor(state: TabVisual): Color {
  if (state === "locked") return PREFAB_TAB_LOCKED;
  if (state === "selected") return PREFAB_TAB_SELECTED;
  return PREFAB_TAB_OPEN;
}
