/**
 * 主线页里的动态 spine。只给 WireMainlinePage 用。
 * resources.load("spine/<stem>") + sp.Skeleton。加载或挂组件失败时回调，不抛到外面。
 * 套上没有请求的动作时留在 stand / idle。不播 hit，不播 bisha。
 */
import { Node, resources, sp } from "cc";
import { WireSpineClip } from "../net/protocol/wireBattle";
import { place, uiNode } from "./UiKit";

export interface SpineActor {
  play(clip: WireSpineClip): void;
}

const OPENING: { [stem: string]: WireSpineClip } = {
  zhandoujijian: "idle",
};

export function mountBattleSpine(parent: Node, stem: string, onFail: () => void): SpineActor {
  const node = uiNode("spine-" + stem);
  const accent = stem === "zhandoujijian" || stem === "battle-sword";
  const scale = accent ? 0.16 : 0.32;
  node.setScale(scale, scale, 1);
  place(node, parent, 0, 24);
  let skel: sp.Skeleton | null = null;
  let dead = false;
  const fail = (): void => {
    if (dead) return;
    dead = true;
    onFail();
  };
  const play = (clip: WireSpineClip): void => {
    if (!skel || !node.isValid) return;
    const chosen = pickClip(skel, clip);
    if (!chosen) return;
    try {
      skel.setAnimation(0, chosen, chosen === "stand" || chosen === "idle");
    } catch (err) {
      fail();
    }
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
  return { play };
}

function pickClip(skel: sp.Skeleton, clip: WireSpineClip): string | null {
  const order: WireSpineClip[] = [clip];
  if (clip === "attack" || clip === "die") {
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
