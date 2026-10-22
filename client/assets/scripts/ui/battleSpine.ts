/**
 * 主线页里的动态 spine。只给 WireMainlinePage 用。
 * resources.load("spine/<stem>") + sp.Skeleton。加载或挂组件失败时回调，不抛到外面。
 * 英雄槽没有请求的动作时留在 stand / idle。套里没有 hit 就不播受击。不播 bisha。
 * effect 模式给 batch2 命名特效：按名字播，没有这个动作就跳过，不拆站场。
 * 这些套是 Spine 3.7.94。Creator 3.8.8 的 spine-3.8 可能加载失败，失败只回调，攻击照旧。
 */
import { Node, resources, sp } from "cc";
import { WireSpineClip } from "../net/protocol/wireBattle";
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
  const fail = (): void => {
    if (dead) return;
    dead = true;
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
        view.skeletonData = asset;
        view.premultipliedAlpha = false;
        skel = view;
        if (effect) {
          if (pending) burst(pending);
          return;
        }
        const opening = OPENING[stem] || "stand";
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
