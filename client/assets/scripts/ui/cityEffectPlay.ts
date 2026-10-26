/**
 * 主城地图特效：序列帧轮播 + spine（dx / chuanghu 等）。
 * CityHub Prefab 已有 fx-* 节点时在其上换帧；spine 型动态建节点。
 * 失败打 GameLog，不静默。
 */
import { Node, Sprite, SpriteFrame, UITransform, resources } from "cc";
import { GameLog } from "../core/GameLog";
import { mountNamedSpine } from "./battleSpine";
import { CityEffectSpot, effectFrameStem } from "./cityMapLayout";
import { uiNode } from "./UiKit";

const FRAME_MS = 80;
const MAX_FRAMES = 64;

export interface CityEffectHandle {
  stop(): void;
}

type PlaceFn = (node: Node, parent: Node, x: number, y: number) => void;

/** 在已有 views（按节点名索引）上启动 layout.effects。 */
export function startCityEffects(
  views: Map<string, Node>,
  effects: CityEffectSpot[],
  placeBottomLeft: PlaceFn
): CityEffectHandle {
  const stops: Array<() => void> = [];
  for (let i = 0; i < effects.length; i++) {
    const spot = effects[i];
    const parent = views.get(spot.parent);
    if (!parent) {
      GameLog.shared.warn("CityFx", "missing parent " + spot.parent + " for " + spot.name);
      continue;
    }
    if (spot.kind === "spine" && spot.spine) {
      const stop = mountSpineEffect(views, parent, spot, placeBottomLeft);
      if (stop) stops.push(stop);
      continue;
    }
    const stop = mountAnimEffect(views, parent, spot, placeBottomLeft);
    if (stop) stops.push(stop);
  }
  GameLog.shared.info("CityFx", "started effects=" + effects.length + " runners=" + stops.length);
  return {
    stop() {
      for (let i = 0; i < stops.length; i++) stops[i]();
      stops.length = 0;
    },
  };
}

function mountAnimEffect(
  views: Map<string, Node>,
  parent: Node,
  spot: CityEffectSpot,
  placeBottomLeft: PlaceFn
): (() => void) | null {
  let stem = effectFrameStem(spot.name);
  if (!stem && spot.frame) stem = spot.frame.replace(/-\d+$/, "");
  if (!stem) {
    GameLog.shared.warn("CityFx", "no frame stem for " + spot.name);
    return null;
  }
  let node = views.get("fx-" + spot.name) || parent.getChildByName("fx-" + spot.name);
  if (!node) {
    node = uiNode("fx-" + spot.name);
    const ui = node.addComponent(UITransform);
    ui.setContentSize(64, 64);
    ui.setAnchorPoint(0.5, 0.5);
    node.parent = parent;
    views.set("fx-" + spot.name, node);
  }
  placeBottomLeft(node, parent, spot.x, spot.y);
  const sprite = node.getComponent(Sprite) || node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  let token = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let alive = true;
  const stop = () => {
    alive = false;
    token += 1;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
  const my = ++token;
  void loadFrameSequence(stem).then((frames) => {
    if (!alive || my !== token || !node.isValid) return;
    if (frames.length === 0) {
      GameLog.shared.warn("CityFx", "anim frames empty " + stem);
      return;
    }
    const first = frames[0];
    const size = first.originalSize;
    const ui = node.getComponent(UITransform);
    if (ui && size && size.width > 0 && size.height > 0) {
      ui.setContentSize(size.width, size.height);
    }
    let index = 0;
    sprite.spriteFrame = frames[0];
    if (frames.length === 1) {
      GameLog.shared.info("CityFx", "anim static " + stem);
      return;
    }
    timer = setInterval(() => {
      if (!alive || !node.isValid) {
        stop();
        return;
      }
      index = (index + 1) % frames.length;
      sprite.spriteFrame = frames[index];
    }, FRAME_MS);
    GameLog.shared.info("CityFx", "anim loop " + stem + " frames=" + frames.length);
  });
  return stop;
}

function mountSpineEffect(
  views: Map<string, Node>,
  parent: Node,
  spot: CityEffectSpot,
  placeBottomLeft: PlaceFn
): (() => void) | null {
  const stem = spot.spine as string;
  let node = views.get("fx-" + spot.name) || parent.getChildByName("fx-" + spot.name);
  if (!node) {
    node = uiNode("fx-" + spot.name);
    const ui = node.addComponent(UITransform);
    ui.setContentSize(80, 80);
    ui.setAnchorPoint(0.5, 0.5);
    node.parent = parent;
    views.set("fx-" + spot.name, node);
  }
  placeBottomLeft(node, parent, spot.x, spot.y);
  mountNamedSpine(node, stem, "stand");
  return () => {
    if (node.isValid) node.destroy();
  };
}

function loadFrameSequence(stem: string): Promise<SpriteFrame[]> {
  const jobs: Promise<SpriteFrame | null>[] = [];
  for (let i = 0; i < MAX_FRAMES; i++) jobs.push(loadOne(stem + "-" + String(i)));
  return Promise.all(jobs).then((all) => {
    const out: SpriteFrame[] = [];
    for (let i = 0; i < all.length; i++) {
      if (!all[i]) break;
      out.push(all[i] as SpriteFrame);
    }
    return out;
  });
}

function loadOne(path: string): Promise<SpriteFrame | null> {
  return new Promise((resolve) => {
    try {
      resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
        if (err || !asset) {
          resolve(null);
          return;
        }
        resolve(asset);
      });
    } catch (_e) {
      resolve(null);
    }
  });
}
