/**
 * 主城地图的贴图和建筑摆放工具。运行时主城只走 CityHub 预制。
 * 这里不再手搓 CityMap。缺预制由调用方打日志。
 * 配置里的活动图标不再铺成通栏。右上活动在 CityChrome 的 ActGroup。
 */
import { Button, Color, EventTouch, Node, Sprite, SpriteFrame, UITransform, resources } from "cc";
import { GateSnapshot } from "../config/nav";
import { ConfigLoader } from "../config/ConfigLoader";
import { GameLog } from "../core/GameLog";
import { createLabel, uiNode } from "./UiKit";
import {
  CITY_CFG_BTN,
  CITY_CFG_EFFECT,
  CITY_CFG_POS,
  CitySpot,
  MainCityBtnFile,
  MainCityEffectFile,
  MainCityPosFile,
  buildCityMapLayout,
  cityAtomLocked,
  layerAnchorX,
} from "./cityMapLayout";
import { startCityEffects, CityEffectHandle } from "./cityEffectPlay";
import { assignContentSize, bindVisibleRefresh, fitCityViewport, uiSize } from "./visibleFit";

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

export async function mountCityMap(
  _parent: Node,
  _onAtom: (atom: string) => void,
  _query: CityMapQuery
): Promise<CityMapHandle> {
  GameLog.shared.warn("CityMap", "预制主城未挂上，不手搓一整城");
  throw new Error("city map prefab missing");
}

function placeBuilding(
  views: Map<string, Node>,
  spot: CitySpot,
  onAtom: (atom: string) => void
): { sprite: Sprite | null } | null {
  const parent = views.get(spot.parent);
  if (!parent) return null;
  const node = uiNode("spot-" + spot.atom);
  const ui = node.addComponent(UITransform);
  assignContentSize(ui, 88, 48);
  ui.setAnchorPoint(0.5, 0.5);
  node.setScale(spot.scale, spot.scale, 1);
  node.parent = parent;
  placeBottomLeft(node, parent, spot.x, spot.y);
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  sprite.color = OPEN_COLOR;
  const caption = createLabel(spot.label, 18, { color: LABEL_COLOR, width: 120 });
  caption.parent = node;
  caption.setPosition(0, -38, 0);
  paintBuildingIcon(node, caption, spot.icons, 3);
  bindAtom(node, spot.atom, onAtom);
  return { sprite };
}

/** 图标晚到再补尺寸。超时不重开解码；真失败才换下一张或再试。 */
function paintBuildingIcon(node: Node, caption: Node, paths: string[], left: number): void {
  if (!paths.length || !node.isValid) return;
  const path = paths[0];
  void paintCitySpriteWhenReady(path, (frame) => {
    if (!node.isValid) return;
    const size = frameSizeOf(frame, 120, 80);
    const ui = node.getComponent(UITransform);
    assignContentSize(ui, size.w, size.h);
    const sprite = node.getComponent(Sprite);
    if (sprite) {
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      sprite.spriteFrame = frame;
    }
    caption.setPosition(0, -size.h * 0.5 - 14, 0);
  }).then((status) => {
    if (!node.isValid || status === "ok") return;
    if (status === "fail" && paths.length > 1) {
      paintBuildingIcon(node, caption, paths.slice(1), left);
      return;
    }
    if (status === "fail" && left > 1) {
      dropCitySpriteLoad(path);
      paintBuildingIcon(node, caption, paths, left - 1);
    }
  });
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
  const size = uiSize(ui) || { width: 0, height: 0 };
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
  try {
    const size = frame.originalSize;
    const w = size && typeof size.width === "number" && size.width > 0 ? size.width : fallbackW;
    const h = size && typeof size.height === "number" && size.height > 0 ? size.height : fallbackH;
    return { w, h };
  } catch (_err) {
    return { w: fallbackW, h: fallbackH };
  }
}

/** 单张底板大约 1.2 秒还不回调就放行。调用方再试，不把整张城卡死。晚到的帧仍然贴上。 */
export const CITY_PLATE_WAIT_MS = 1200;

const cityPlateMisses = new Set<string>();

interface PlateLoad {
  promise: Promise<SpriteFrame | null>;
  frame: SpriteFrame | null;
  failed: boolean;
  waiters: Array<(frame: SpriteFrame | null) => void>;
}

const plateLoads = new Map<string, PlateLoad>();

/**
 * 同一路径只解码一次。超时把 await 放开（返回 null），不取消加载。
 * 图晚到时写进 record.frame，并通知 waiters。真失败才标 failed，方便再试。
 */
export function loadCitySpriteFrame(path: string): Promise<SpriteFrame | null> {
  const existing = plateLoads.get(path);
  if (existing) {
    if (existing.frame) return Promise.resolve(existing.frame);
    return existing.promise;
  }
  const record: PlateLoad = {
    promise: Promise.resolve(null),
    frame: null,
    failed: false,
    waiters: [],
  };
  record.promise = new Promise((resolve) => {
    let unblocked = false;
    const give = (frame: SpriteFrame | null, failed: boolean) => {
      if (frame) record.frame = frame;
      if (failed) record.failed = true;
      const pending = record.waiters.splice(0, record.waiters.length);
      for (let i = 0; i < pending.length; i++) pending[i](frame);
      if (unblocked) return;
      unblocked = true;
      resolve(frame);
    };
    const timer = setTimeout(() => {
      if (unblocked) return;
      unblocked = true;
      resolve(null);
    }, CITY_PLATE_WAIT_MS);
    try {
      resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
        clearTimeout(timer);
        if (err || !asset) give(null, true);
        else give(asset, false);
      });
    } catch (_err) {
      clearTimeout(timer);
      give(null, true);
    }
  });
  plateLoads.set(path, record);
  return record.promise;
}

/** 真失败之后才允许再 load 一次。进行中的解码不丢掉。 */
export function dropCitySpriteLoad(path: string): void {
  const record = plateLoads.get(path);
  if (!record || record.frame || !record.failed) return;
  plateLoads.delete(path);
}

/**
 * 图到了就画。超时不算缺图：晚到的帧仍会画上。
 * 只有 resources 明确失败才返回 fail，调用方再试。
 */
export function paintCitySpriteWhenReady(path: string, apply: (frame: SpriteFrame) => void): Promise<"ok" | "fail"> {
  let record = plateLoads.get(path);
  if (record && record.frame) {
    apply(record.frame);
    return Promise.resolve("ok");
  }
  if (record && record.failed) return Promise.resolve("fail");
  if (!record) {
    void loadCitySpriteFrame(path);
    record = plateLoads.get(path);
  }
  if (!record) return Promise.resolve("fail");
  if (record.frame) {
    apply(record.frame);
    return Promise.resolve("ok");
  }
  if (record.failed) return Promise.resolve("fail");
  const live = record;
  live.waiters.push((frame) => {
    if (frame) apply(frame);
  });
  return live.promise.then((frame) => {
    if (frame || live.frame) return "ok";
    if (live.failed) return "fail";
    return new Promise<"ok" | "fail">((resolve) => {
      live.waiters.push((late) => {
        resolve(late || live.frame ? "ok" : "fail");
      });
    });
  });
}

function paintCityFrames(jobs: { node: Node; path: string }[]): void {
  for (let i = 0; i < jobs.length; i++) paintCityFrame(jobs[i].node, jobs[i].path, 3);
}

function paintCityFrame(node: Node, path: string, left: number): void {
  void paintCitySpriteWhenReady(path, (frame) => {
    if (!node.isValid) return;
    paintSprite(node, frame);
  }).then((status) => {
    if (!node.isValid || status === "ok") return;
    if (left > 1) {
      dropCitySpriteLoad(path);
      paintCityFrame(node, path, left - 1);
      return;
    }
    if (cityPlateMisses.has(path)) return;
    cityPlateMisses.add(path);
    GameLog.shared.warn("CityMap", "plate miss " + path);
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
