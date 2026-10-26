/**
 * 主线页里的动态 spine。只给 WireMainlinePage 用。
 * resources.load("spine/<stem>") + sp.Skeleton。加载或挂组件失败时回调，不抛到外面。
 * 英雄槽没有请求的动作时留在 stand / idle。套里没有 hit 就不播受击。不播 bisha。
 * effect 模式给 batch2 命名特效：按名字播，没有这个动作就跳过，不拆站场。
 * 这些套是 Spine 3.7.94。播之前在内存里收成 spine-3.8 能读的皮和曲线，不改磁盘上的 json。
 * Creator 3.8.8 仍可能加载失败，失败只回调，攻击照旧。不播 bisha。
 */
import { Node, resources, sp } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSpineClip } from "../net/protocol/wireBattle";
import { upgradeSpine37Json } from "./spineUpgrade";
import { place, uiNode } from "./UiKit";

export interface SpineActor {
  play(clip: WireSpineClip): void;
  /** 命名特效。找不到动作时不播，也不当成加载失败。 */
  burst(name: string): void;
}

export interface SpineMountOptions {
  /** batch2 特效。不要求套里有 stand。 */
  effect?: boolean;
  /** 1 面向右（左场的敌方）。-1 面向左（右场的我方）。缺省面向右。 */
  face?: -1 | 1;
}

const OPENING: { [stem: string]: WireSpineClip } = {
  zhandoujijian: "idle",
};

/** 大图缩小，光柱这类小图放大。没写的用 0.4。 */
const VFX_SCALE: { [stem: string]: number } = {
  yanwu: 0.12,
  chaihong: 0.1,
  hytx: 0.18,
  zhihuanfazhen: 0.14,
  "Dragon-1": 0.3,
  "Dragon-2": 0.28,
  "Dragon-3": 0.26,
  "Dragon-4": 0.22,
  zadan: 0.48,
  zadan_tx: 0.55,
  heidong: 0.5,
  guangzhu: 1.4,
  act: 0.4,
};

/** 进度条这类单节点特效。失败只留空节点，不抛。 */
export function mountNamedSpine(host: Node, stem: string, clip: string): void {
  try {
    resources.load("spine/" + stem, sp.SkeletonData, (err, asset) => {
      if (!host.isValid) return;
      if (err || !asset) {
        GameLog.shared.warn("BattleSpine", "named miss spine/" + stem + " clip=" + clip);
        return;
      }
      try {
        const view = host.getComponent(sp.Skeleton) || host.addComponent(sp.Skeleton);
        view.premultipliedAlpha = false;
        view.skeletonData = runtimeSpineData(stem, asset);
        const skinned = view as sp.Skeleton & { setSkin?: (name: string) => void };
        if (typeof skinned.setSkin === "function") {
          try {
            skinned.setSkin("default");
          } catch (_skinErr) {
            /* no default skin */
          }
        }
        view.setAnimation(0, clip, true);
      } catch (_err) {
        GameLog.shared.warn("BattleSpine", "named play fail spine/" + stem + " clip=" + clip);
      }
    });
  } catch (_err) {
    GameLog.shared.warn("BattleSpine", "named load throw spine/" + stem);
  }
}

export function mountBattleSpine(parent: Node, stem: string, onFail: () => void, options?: SpineMountOptions): SpineActor {
  const effect = !!(options && options.effect);
  const node = uiNode("spine-" + stem);
  const accent = stem === "zhandoujijian" || stem === "battle-sword";
  const namedScale = VFX_SCALE[stem];
  const scale = effect ? (typeof namedScale === "number" ? namedScale : 0.4) : accent ? 0.16 : 0.58;
  const face = options && options.face === -1 ? -1 : 1;
  node.setScale(scale * face, scale, 1);
  place(node, parent, 0, effect || accent ? 0 : -36);
  let skel: sp.Skeleton | null = null;
  let dead = false;
  let pending: string | null = null;
  let pendingHero: WireSpineClip | null = null;
  const fail = (): void => {
    if (dead) return;
    dead = true;
    GameLog.shared.warn("BattleSpine", "hero/vfx miss spine/" + stem);
    onFail();
  };
  const playNamed = (name: string, hero: boolean): void => {
    if (!skel || !node.isValid) return;
    const chosen = hero ? pickClip(skel, name as WireSpineClip) : pickNamed(skel, name);
    if (!chosen) return;
    const loop = chosen === "stand" || chosen === "idle";
    try {
      skel.setAnimation(0, chosen, loop);
    } catch (err) {
      fail();
    }
  };
  const play = (clip: WireSpineClip): void => {
    pendingHero = clip;
    playNamed(clip, true);
  };
  const burst = (name: string): void => {
    pending = name;
    playNamed(name, false);
  };
  try {
    resources.load("spine/" + stem, sp.SkeletonData, (err, asset) => {
      if (!node.isValid) return;
      if (err || !asset) {
        fail();
        return;
      }
      try {
        const view = node.addComponent(sp.Skeleton);
        view.premultipliedAlpha = false;
        view.skeletonData = runtimeSpineData(stem, asset);
        const skinned = view as sp.Skeleton & { setSkin?: (name: string) => void };
        if (typeof skinned.setSkin === "function") {
          try {
            skinned.setSkin("default");
          } catch (skinErr) {
            /* 缺省皮仍可播站场和攻击 */
          }
        }
        skel = view;
        if (effect) {
          if (pending) burst(pending);
          return;
        }
        const opening = pendingHero || OPENING[stem] || "stand";
        if (!pickClip(view, opening)) fail();
        else play(opening);
      } catch (loadErr) {
        fail();
      }
    });
  } catch (err) {
    fail();
  }
  return { play, burst };
}

const runtimePacks: { [stem: string]: sp.SkeletonData } = {};

/** 原资源的 wasm 缓存按 uuid 记住第一次解析。3.7 失败过的 uuid 不能复用，所以副本用 #38。 */
function runtimeSpineData(stem: string, asset: sp.SkeletonData): sp.SkeletonData {
  const cached = runtimePacks[stem];
  if (cached) return cached;
  try {
    const src = asset as sp.SkeletonData & {
      skeletonJson?: unknown;
      _skeletonJson?: unknown;
      atlasText?: string;
      textures?: unknown;
      textureNames?: unknown;
      scale?: number;
      _uuid?: string;
    };
    const raw = src.skeletonJson || src._skeletonJson;
    if (!raw || !src.atlasText) {
      if (raw) {
        try {
          (src as { skeletonJson?: unknown }).skeletonJson = upgradeSpine37Json(raw);
        } catch (assignErr) {
          /* 写不回去就仍用原套 */
        }
      }
      return asset;
    }
    const copy = new sp.SkeletonData();
    const dst = copy as sp.SkeletonData & {
      skeletonJson?: unknown;
      atlasText?: string;
      textures?: unknown;
      textureNames?: unknown;
      scale?: number;
      _uuid?: string;
    };
    const uuid = (src._uuid || stem) + "#38";
    dst._uuid = uuid;
    dst.atlasText = src.atlasText;
    dst.textures = src.textures;
    dst.textureNames = src.textureNames;
    if (typeof src.scale === "number") dst.scale = src.scale;
    dst._uuid = uuid;
    dst.skeletonJson = upgradeSpine37Json(raw);
    runtimePacks[stem] = copy;
    return copy;
  } catch (err) {
    return asset;
  }
}

function pickClip(skel: sp.Skeleton, clip: WireSpineClip): string | null {
  const order: WireSpineClip[] = [clip];
  if (clip === "hit") {
    order.push("stand");
    order.push("idle");
  } else if (clip === "attack" || clip === "die") {
    order.push("stand");
    order.push("idle");
  } else if (clip === "stand") order.push("idle");
  else order.push("stand");
  for (let i = 0; i < order.length; i++) {
    try {
      if (skel.findAnimation(order[i])) return order[i];
    } catch (err) {
      return null;
    }
  }
  return null;
}

function pickNamed(skel: sp.Skeleton, name: string): string | null {
  const order = [name, "stand", "idle", "act1", "act", "attack"];
  const seen: { [key: string]: boolean } = {};
  for (let i = 0; i < order.length; i++) {
    const clip = order[i];
    if (seen[clip]) continue;
    seen[clip] = true;
    try {
      if (skel.findAnimation(clip)) return clip;
    } catch (err) {
      return null;
    }
  }
  return null;
}
