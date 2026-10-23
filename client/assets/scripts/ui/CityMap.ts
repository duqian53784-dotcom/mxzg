/**
 * 主城地图层。挂在主城页面里，顶栏和底栏仍是 CityChrome。
 * 视差底板用 resources/ui/maps/map-bg-city-*，建筑图标用 resources/ui/city。
 * 点击只回调 atom，由 MainApp 走已有的 PanelNav，不另开一套导航。
 * 地图内容比设计画面宽，拖动是预期。不挂 Mask，避免模板把城景裁没。
 * 配置里的活动图标不再铺成通栏。右上活动在 CityChrome 的 ActGroup。
 */
import { Button, Color, EventTouch, Node, Sprite, SpriteFrame, UITransform, resources } from "cc";
import { GateSnapshot } from "../config/nav";
import { ConfigLoader } from "../config/ConfigLoader";
import { GameLog } from "../core/GameLog";
import { createLabel, uiNode } from "./UiKit";
import {
  CITY_BAR_BOTTOM,
  CITY_CFG_BTN,
  CITY_CFG_EFFECT,
  CITY_CFG_POS,
  CityEffectSpot,
  CitySpot,
  MainCityBtnFile,
  MainCityEffectFile,
  MainCityPosFile,
  buildCityMapLayout,
  cityAtomLocked,
  layerAnchorX,
} from "./cityMapLayout";

export interface CityMapQuery {
  level(): number;
  openDay(): number;
  db(): GateSnapshot | null;
}

export interface CityMapHandle {
  root: Node;
  refreshLocks(): void;
  dispose(): void;
}

const LABEL_COLOR = new Color(255, 244, 220, 255);
const LOCKED_COLOR = new Color(150, 150, 150, 255);
const OPEN_COLOR = new Color(255, 255, 255, 255);
const DRAG_PX = 12;

export async function mountCityMap(parent: Node, onAtom: (atom: string) => void, query: CityMapQuery): Promise<CityMapHandle> {
  const [pos, btn, effect] = await Promise.all([
    loadCfg<MainCityPosFile>(CITY_CFG_POS),
    loadCfg<MainCityBtnFile>(CITY_CFG_BTN),
    loadCfg<MainCityEffectFile>(CITY_CFG_EFFECT),
  ]);
  const layout = buildCityMapLayout(pos, btn, effect);
  const gesture = { dragged: false };
  const clickAtom = (atom: string) => {
    if (gesture.dragged) return;
    onAtom(atom);
  };

  const root = uiNode("CityMap");
  const rootUi = root.addComponent(UITransform);
  rootUi.setContentSize(layout.viewW, layout.viewH);
  rootUi.setAnchorPoint(0.5, 0.5);
  root.setPosition(0, 0, 0);
  root.parent = parent;

  const parallax = uiNode("CityParallax");
  const parallaxUi = parallax.addComponent(UITransform);
  parallaxUi.setContentSize(layout.contentW, layout.viewH);
  parallaxUi.setAnchorPoint(0, 0);
  parallax.parent = root;
  placeBottomLeft(parallax, root, layout.scroll, CITY_BAR_BOTTOM);

  const views = new Map<string, Node>();
  for (let i = 0; i < layout.nodes.length; i++) {
    const desc = layout.nodes[i];
    const node = uiNode(desc.name);
    const ui = node.addComponent(UITransform);
    ui.setContentSize(desc.w, desc.h);
    ui.setAnchorPoint(desc.ax, desc.ay);
    node.setScale(desc.scale, desc.scale, 1);
    const host = desc.parent ? views.get(desc.parent) || parallax : parallax;
    node.parent = host;
    if (desc.parallax) {
      placeBottomLeft(node, host, layerAnchorX(layout.scroll, desc.parallax.ratio, desc.parallax.ox), desc.parallax.oy);
    } else {
      placeBottomLeft(node, host, desc.x, desc.y);
    }
    if (desc.frame) {
      const frame = await loadFrame(desc.frame);
      if (frame) paintSprite(node, frame);
    }
    views.set(desc.name, node);
  }

  const spots = new Map<string, { sprite: Sprite | null }>();
  for (let i = 0; i < layout.effects.length; i++) {
    await placeEffect(views, layout.effects[i]);
  }
  for (let i = 0; i < layout.buildings.length; i++) {
    const built = await placeBuilding(views, layout.buildings[i], clickAtom);
    if (built) spots.set(layout.buildings[i].atom, built);
  }

  let scroll = layout.scroll;
  let moved = 0;
  const onStart = () => {
    gesture.dragged = false;
    moved = 0;
  };
  const onMove = (event: EventTouch) => {
    const delta = event.getUIDelta();
    const dx = delta && typeof delta.x === "number" ? delta.x : 0;
    moved += Math.abs(dx);
    if (moved > DRAG_PX) gesture.dragged = true;
    scroll = clamp(scroll + dx, layout.minScroll, layout.maxScroll);
    placeBottomLeft(parallax, root, scroll, CITY_BAR_BOTTOM);
    for (let i = 0; i < layout.nodes.length; i++) {
      const desc = layout.nodes[i];
      if (!desc.parallax) continue;
      const node = views.get(desc.name);
      if (!node) continue;
      placeBottomLeft(node, parallax, layerAnchorX(scroll, desc.parallax.ratio, desc.parallax.ox), desc.parallax.oy);
    }
  };
  root.on(Node.EventType.TOUCH_START, onStart);
  root.on(Node.EventType.TOUCH_MOVE, onMove);
  root.on(Node.EventType.TOUCH_CANCEL, onStart);

  const refreshLocks = () => {
    spots.forEach((spot, atom) => {
      const locked = cityAtomLocked(atom, query.level(), query.openDay(), query.db());
      if (!spot.sprite) return;
      spot.sprite.grayscale = locked;
      spot.sprite.color = locked ? LOCKED_COLOR : OPEN_COLOR;
    });
  };
  refreshLocks();
  GameLog.shared.info(
    "CityMap",
    "ready buildings=" + layout.buildings.length + " activities=0 scroll=" + scroll
  );

  return {
    root,
    refreshLocks,
    dispose() {
      if (!root.isValid) return;
      root.off(Node.EventType.TOUCH_START, onStart);
      root.off(Node.EventType.TOUCH_MOVE, onMove);
      root.off(Node.EventType.TOUCH_CANCEL, onStart);
    },
  };
}

async function placeEffect(views: Map<string, Node>, spot: CityEffectSpot): Promise<void> {
  if (!spot.frame) return;
  const parent = views.get(spot.parent);
  if (!parent) return;
  const frame = await loadFrame(spot.frame);
  if (!frame) return;
  const size = frameSizeOf(frame, 64, 64);
  const node = uiNode(spot.name);
  const ui = node.addComponent(UITransform);
  ui.setContentSize(size.w, size.h);
  ui.setAnchorPoint(0.5, 0.5);
  node.parent = parent;
  placeBottomLeft(node, parent, spot.x, spot.y);
  paintSprite(node, frame);
}

async function placeBuilding(
  views: Map<string, Node>,
  spot: CitySpot,
  onAtom: (atom: string) => void
): Promise<{ sprite: Sprite | null } | null> {
  const parent = views.get(spot.parent);
  if (!parent) return null;
  const frame = await loadFirst(spot.icons);
  const node = uiNode("spot-" + spot.atom);
  const ui = node.addComponent(UITransform);
  const size = frame ? frameSizeOf(frame, 120, 80) : { w: 88, h: 48 };
  ui.setContentSize(size.w, size.h);
  ui.setAnchorPoint(0.5, 0.5);
  node.setScale(spot.scale, spot.scale, 1);
  node.parent = parent;
  placeBottomLeft(node, parent, spot.x, spot.y);
  const sprite = frame ? paintSprite(node, frame) : null;
  const caption = createLabel(spot.label, 18, { color: LABEL_COLOR, width: Math.max(120, size.w) });
  caption.parent = node;
  caption.setPosition(0, -size.h * 0.5 - 14, 0);
  bindAtom(node, spot.atom, onAtom);
  return { sprite };
}

function bindAtom(node: Node, atom: string, onAtom: (atom: string) => void): void {
  const button = node.addComponent(Button);
  button.transition = Button.Transition.SCALE;
  button.zoomScale = 0.94;
  node.on(Button.EventType.CLICK, () => onAtom(atom));
}

/** x/y 是父节点左下角空间里、本节点锚点的位置。 */
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

function paintSprite(node: Node, frame: SpriteFrame): Sprite {
  const sprite = node.getComponent(Sprite) || node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  sprite.spriteFrame = frame;
  sprite.grayscale = false;
  sprite.color = OPEN_COLOR;
  return sprite;
}

function frameSizeOf(frame: SpriteFrame, fallbackW: number, fallbackH: number): { w: number; h: number } {
  const size = frame.originalSize;
  const w = size && typeof size.width === "number" && size.width > 0 ? size.width : fallbackW;
  const h = size && typeof size.height === "number" && size.height > 0 ? size.height : fallbackH;
  return { w, h };
}

async function loadFirst(paths: string[]): Promise<SpriteFrame | null> {
  for (let i = 0; i < paths.length; i++) {
    const frame = await loadFrame(paths[i]);
    if (frame) return frame;
  }
  return null;
}

function loadFrame(path: string): Promise<SpriteFrame | null> {
  return new Promise((resolve) => {
    resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
      if (err || !asset) {
        resolve(null);
        return;
      }
      resolve(asset);
    });
  });
}

async function loadCfg<T>(path: string): Promise<T | null> {
  try {
    return await ConfigLoader.loadJson<T>(path);
  } catch (err) {
    GameLog.shared.error("CityMap", path + " " + (err instanceof Error ? err.message : "load failed"));
    return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
