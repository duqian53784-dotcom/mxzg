/**
 * 绑定 CityHub.prefab。中间是旧主城：map-bg-city 视差板和建筑图标。
 * 路径相对 assets：prefabs/ui/city/CityHub。不走 resources.load。
 * 不挂脚本组件，不改 Prefab。USE_CITY_HUB_PREFAB 为 false，或加载 / 绑节点失败时，
 * MainApp 仍走 mountCityMap。顶栏底栏仍是 CityChrome。
 * 建筑点击交给原来的 onCityAtom。根上的 BtnMainline 打开原来的主线页。
 * 活动通栏不画在这张 Prefab 上，避免盖住建筑。右上活动仍是 CityChrome 的 ActGroup。
 */
import { Button, Color, EventTouch, Mask, Node, Sprite, UITransform } from "cc";
import { ConfigLoader } from "../config/ConfigLoader";
import { GameLog } from "../core/GameLog";
import { CityMapHandle, CityMapQuery } from "./CityMap";
import {
  CITY_CFG_BTN,
  CITY_CFG_EFFECT,
  CITY_CFG_POS,
  CityMapLayout,
  CityMapNode,
  MainCityBtnFile,
  MainCityEffectFile,
  MainCityPosFile,
  buildCityMapLayout,
  cityAtomLocked,
  layerAnchorX,
} from "./cityMapLayout";
import { CITY_HUB_PREFAB_PATH, bindClick, loadPrefab, spawnPrefab } from "./prefabLoad";

export { CITY_HUB_PREFAB_PATH };

export interface CityHubHandle extends CityMapHandle {
  /** 屏幕固定的主线入口。文案由 MainApp 写成当前关。 */
  mainButton: Node | null;
}

const LOCKED_COLOR = new Color(150, 150, 150, 255);
const OPEN_COLOR = new Color(255, 255, 255, 255);
const DRAG_PX = 12;

const MAP_NODES = [
  "CityParallax",
  "spr_map_bg4",
  "spr_map_bg3",
  "spr_map_bg2",
  "spr_map_bg1",
  "spr_map_bg4_1",
  "spr_map_bg3_1",
  "spr_map_bg2_1",
  "spr_map_bg1_1",
  "spr_map_bg1_2",
];

export async function mountCityHubPrefab(
  parent: Node,
  onAtom: (atom: string) => void,
  onMainline: () => void,
  query: CityMapQuery
): Promise<CityHubHandle> {
  const prefab = await loadPrefab(CITY_HUB_PREFAB_PATH);
  const root = spawnPrefab(prefab, parent);
  try {
    return await bindCityHub(root, onAtom, onMainline, query);
  } catch (err) {
    root.destroy();
    throw err;
  }
}

async function bindCityHub(
  root: Node,
  onAtom: (atom: string) => void,
  onMainline: () => void,
  query: CityMapQuery
): Promise<CityHubHandle> {
  const [pos, btn, effect] = await Promise.all([
    loadCfg<MainCityPosFile>(CITY_CFG_POS),
    loadCfg<MainCityBtnFile>(CITY_CFG_BTN),
    loadCfg<MainCityEffectFile>(CITY_CFG_EFFECT),
  ]);
  const layout = buildCityMapLayout(pos, btn, effect);
  const views = indexByName(root);
  for (let i = 0; i < MAP_NODES.length; i++) {
    if (!views.has(MAP_NODES[i])) throw new Error("缺少节点 " + MAP_NODES[i]);
  }
  const parallax = views.get("CityParallax") as Node;
  const rootUi = root.getComponent(UITransform);
  if (rootUi) rootUi.setContentSize(layout.viewW, layout.viewH);
  const mask = root.getComponent(Mask) || root.addComponent(Mask);
  mask.type = Mask.Type.GRAPHICS_RECT;

  const parallaxUi = parallax.getComponent(UITransform);
  if (parallaxUi) {
    parallaxUi.setContentSize(layout.contentW, layout.viewH);
    parallaxUi.setAnchorPoint(0, 0);
  }

  for (let i = 0; i < layout.nodes.length; i++) {
    const desc = layout.nodes[i];
    const node = views.get(desc.name);
    if (!node) throw new Error("缺少节点 " + desc.name);
    fitNode(node, desc.w, desc.h, desc.ax, desc.ay, desc.scale);
  }

  const gesture = { dragged: false };
  const spots = new Map<string, { sprite: Sprite | null }>();
  let bound = 0;
  for (let i = 0; i < layout.buildings.length; i++) {
    const spot = layout.buildings[i];
    const node = views.get("spot-" + spot.atom);
    if (!node) continue;
    node.setScale(spot.scale, spot.scale, 1);
    const sprite = node.getComponent(Sprite);
    if (sprite) {
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      sprite.color = OPEN_COLOR;
    }
    const button = node.getComponent(Button);
    if (!button) throw new Error(node.name + " 缺少 Button");
    bindAtom(node, spot.atom, onAtom, () => gesture.dragged);
    spots.set(spot.atom, { sprite });
    bound += 1;
  }
  if (bound < 1 || !views.has("spot-main_summon")) throw new Error("CityHub 没有建筑按钮");

  for (let i = 0; i < layout.effects.length; i++) {
    const spot = layout.effects[i];
    const node = views.get("fx-" + spot.name);
    if (!node) continue;
    const parent = views.get(spot.parent);
    if (!parent || node.parent !== parent) continue;
    placeBottomLeft(node, parent, spot.x, spot.y);
  }

  let scroll = layout.scroll;

  const placeBuildings = (): void => {
    for (let i = 0; i < layout.buildings.length; i++) {
      const spot = layout.buildings[i];
      const node = views.get("spot-" + spot.atom);
      const parent = views.get(spot.parent);
      if (!node || !parent) continue;
      placeBottomLeft(node, parent, spot.x, spot.y);
    }
  };

  const applyScroll = (next: number): void => {
    scroll = next;
    placeBottomLeft(parallax, root, scroll, 0);
    for (let i = 0; i < layout.nodes.length; i++) {
      const desc = layout.nodes[i];
      if (!desc.parallax) continue;
      const node = views.get(desc.name);
      if (!node) continue;
      placeBottomLeft(node, parallax, layerAnchorX(scroll, desc.parallax.ratio, desc.parallax.ox), desc.parallax.oy);
    }
  };

  for (let i = 0; i < layout.nodes.length; i++) {
    const desc = layout.nodes[i];
    if (desc.parallax) continue;
    const node = views.get(desc.name);
    const host = desc.parent ? views.get(desc.parent) : parallax;
    if (!node || !host) continue;
    placeBottomLeft(node, host, desc.x, desc.y);
  }
  placeBuildings();
  applyScroll(layout.scroll);

  let moved = 0;
  const onStart = (): void => {
    gesture.dragged = false;
    moved = 0;
  };
  const onMove = (event: EventTouch): void => {
    const delta = event.getUIDelta();
    const dx = delta && typeof delta.x === "number" ? delta.x : 0;
    moved += Math.abs(dx);
    if (moved > DRAG_PX) gesture.dragged = true;
    applyScroll(clamp(scroll + dx, layout.minScroll, layout.maxScroll));
  };
  root.on(Node.EventType.TOUCH_START, onStart);
  root.on(Node.EventType.TOUCH_MOVE, onMove);
  root.on(Node.EventType.TOUCH_CANCEL, onStart);

  const mainButton = views.get("BtnMainline") || null;
  if (mainButton) {
    if (!mainButton.getComponent(Button)) throw new Error("BtnMainline 缺少 Button");
    bindClick(mainButton, () => {
      if (gesture.dragged) return;
      onMainline();
    });
  }

  const refreshLocks = (): void => {
    spots.forEach((spot, atom) => {
      const locked = cityAtomLocked(atom, query.level(), query.openDay(), query.db());
      if (!spot.sprite) return;
      spot.sprite.grayscale = locked;
      spot.sprite.color = locked ? LOCKED_COLOR : OPEN_COLOR;
    });
  };
  refreshLocks();
  GameLog.shared.info(
    "CityHub",
    "prefab buildings=" + bound + " scroll=" + scroll + " " + CITY_HUB_PREFAB_PATH
  );

  return {
    root,
    mainButton,
    refreshLocks,
    dispose() {
      if (!root.isValid) return;
      root.off(Node.EventType.TOUCH_START, onStart);
      root.off(Node.EventType.TOUCH_MOVE, onMove);
      root.off(Node.EventType.TOUCH_CANCEL, onStart);
    },
  };
}

function bindAtom(node: Node, atom: string, onAtom: (atom: string) => void, dragged: () => boolean): void {
  bindClick(node, () => {
    if (dragged()) return;
    onAtom(atom);
  });
}

function fitNode(node: Node, w: number, h: number, ax: number, ay: number, scale: number): void {
  const ui = node.getComponent(UITransform);
  if (ui) {
    ui.setContentSize(w, h);
    ui.setAnchorPoint(ax, ay);
  }
  node.setScale(scale, scale, 1);
}

function indexByName(root: Node): Map<string, Node> {
  const out = new Map<string, Node>();
  const walk = (node: Node): void => {
    if (!out.has(node.name)) out.set(node.name, node);
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) walk(kids[i]);
  };
  walk(root);
  return out;
}

function placeBottomLeft(node: Node, parent: Node, x: number, y: number): void {
  const ui = parent.getComponent(UITransform);
  const size = ui && ui.contentSize ? ui.contentSize : { width: 0, height: 0 };
  const anchor = anchorOf(ui);
  node.setPosition(x - size.width * anchor.x, y - size.height * anchor.y, 0);
}

function anchorOf(ui: UITransform | null): { x: number; y: number } {
  if (!ui) return { x: 0.5, y: 0.5 };
  if (typeof ui.anchorX === "number" && typeof ui.anchorY === "number") return { x: ui.anchorX, y: ui.anchorY };
  const point = ui.anchorPoint;
  if (point && typeof point.x === "number" && typeof point.y === "number") return { x: point.x, y: point.y };
  return { x: 0.5, y: 0.5 };
}

async function loadCfg<T>(path: string): Promise<T | null> {
  try {
    return await ConfigLoader.loadJson<T>(path);
  } catch (err) {
    GameLog.shared.error("CityHub", path + " " + (err instanceof Error ? err.message : "load failed"));
    return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** 布局类型留下，方便对照 cityMapLayout。运行时位置以 buildCityMapLayout 为准。 */
export type CityHubLayout = CityMapLayout;
