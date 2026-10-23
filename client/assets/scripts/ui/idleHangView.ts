/**
 * 底栏「战斗」先看到的挂机站场。不是森林 BattlePage。
 * 仓里没有把殿堂、站场英雄和三钮合成一张的挂机 Prefab。
 * 殿堂用已有 chapter/hang/map01_B（天）和 map01_F（柱、像、大理石地）。
 * 底栏「我要变强 / 战斗 / 快速战斗」仍是 BattlePanelLayer，盖在这块地上。
 * 站场人用已有 spine 默认套。加载失败把格子藏起来，不写套名。
 */
import { Color, Node, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { WIRE_SPINE_ALLY_STEMS } from "../net/protocol/wireBattle";
import { mountBattleSpine } from "./battleSpine";
import { createLabel, createRect, place, uiNode } from "./UiKit";

export const IDLE_HANG_SKY = "ui/chapter/hang/map01_B";
export const IDLE_HANG_FLOOR = "ui/chapter/hang/map01_F";

/** 写进自检和说明。森林 BattlePage 不是这张壳。 */
export const IDLE_HANG_MISSING_PREFAB =
  "没有整张挂机 Prefab。殿堂用 chapter/hang/map01_B + map01_F，底栏三钮仍是 BattlePanelLayer，不是森林 BattlePage。";

/** 大理石地中部。底栏三钮盖住更低的位置。 */
export const IDLE_HANG_SPOTS: ReadonlyArray<{ x: number; y: number; face: -1 | 1 }> = [
  { x: -150, y: 30, face: 1 },
  { x: 16, y: -70, face: 1 },
  { x: 168, y: 50, face: -1 },
];

export function idleHangStems(): string[] {
  const stems: string[] = [];
  const n = IDLE_HANG_SPOTS.length < WIRE_SPINE_ALLY_STEMS.length ? IDLE_HANG_SPOTS.length : WIRE_SPINE_ALLY_STEMS.length;
  for (let i = 0; i < n; i++) stems.push(WIRE_SPINE_ALLY_STEMS[i]);
  return stems;
}

/** 盖在主线壳最底层。BattlePanelLayer 后挂，所以三钮在上面。 */
export function mountIdleHang(parent: Node): Node {
  const root = uiNode("IdleHang");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(720, 1280);
  place(root, parent, 0, 0);

  place(createRect("IdleFill", 720, 1280, new Color(186, 156, 124, 255)), root, 0, 0);
  const sky = spriteNode("IdleSky", 720, 420);
  place(sky, root, 0, 430);
  paintSprite(sky, IDLE_HANG_SKY);

  const floor = spriteNode("IdleFloor", 720, 1280);
  place(floor, root, 0, 0);
  paintSprite(floor, IDLE_HANG_FLOOR);

  const stems = idleHangStems();
  for (let i = 0; i < stems.length; i++) {
    const spot = IDLE_HANG_SPOTS[i];
    const slot = place(uiNode("IdleHero"), root, spot.x, spot.y);
    mountBattleSpine(slot, stems[i], () => {
      if (slot.isValid) slot.active = false;
    }, { face: spot.face });
  }

  place(createLabel("挂机", 28, { width: 240, height: 40 }), root, 0, 500);
  return root;
}

function spriteNode(name: string, width: number, height: number): Node {
  const node = uiNode(name);
  const ui = node.addComponent(UITransform);
  ui.setContentSize(width, height);
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  sprite.type = Sprite.Type.SIMPLE;
  return node;
}

function paintSprite(node: Node, path: string): void {
  const sprite = node.getComponent(Sprite);
  if (!sprite) return;
  try {
    resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
      if (err || !asset || !node.isValid) return;
      sprite.spriteFrame = asset;
    });
  } catch (err) {
    return;
  }
}
