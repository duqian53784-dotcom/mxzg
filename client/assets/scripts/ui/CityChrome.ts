import { Color, Node } from "cc";
import { BOTTOM_TABS } from "../config/nav";
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
