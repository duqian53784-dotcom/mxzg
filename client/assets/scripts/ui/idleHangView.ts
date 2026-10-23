/**
 * 底栏「战斗」先看到的挂机站场。不是森林 BattlePage。
 * 仓里没有把殿堂、站场英雄和三钮合成一张的挂机 Prefab。
 * 殿堂用已有 chapter/hang/map01_B（天）和 map01_F（柱、像、大理石地）。
 * 底栏「我要变强 / 战斗 / 快速战斗」仍是 BattlePanelLayer，盖在这块地上。
 * 站场优先 MAIN 阵容：hero_id 经名册 hero_type 对已有皮肤，再走内存里的 spine 升级。
 * 阵容是空的才用三套默认。加载失败把格子藏起来，不写套名。
 */
import { Color, Node, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { GameStore } from "../core/GameStore";
import { WireSession } from "../net/WireSession";
import { mountBattleSpine } from "./battleSpine";
import { idleHangStemsFrom } from "./idleHangRoster";
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

/** 当前 3101 / 4001。没有 MAIN 英雄时是三套默认。 */
export function idleHangStems(): string[] {
  const roster = GameStore.hangRoster();
  if (roster) return idleHangStemsFrom(roster.lineUp, roster.heroes, IDLE_HANG_SPOTS.length);
  const bag = WireSession.heroes;
  return idleHangStemsFrom(WireSession.lineUp, bag, IDLE_HANG_SPOTS.length);
}

/** 盖在主线壳最底层。BattlePanelLayer 后挂，所以三钮在上面。阵容晚到会换站场。 */
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

  const heroes = uiNode("IdleHeroes");
  place(heroes, root, 0, 0);
  let painted = "";
  const paint = () => {
    if (!heroes.isValid) return;
    const stems = idleHangStems();
    const key = stems.join(",");
    if (key === painted) return;
    painted = key;
    const kids = heroes.children.slice();
    for (let i = 0; i < kids.length; i++) kids[i].destroy();
    for (let i = 0; i < stems.length; i++) {
      const spot = IDLE_HANG_SPOTS[i];
      const slot = place(uiNode("IdleHero"), heroes, spot.x, spot.y);
      mountBattleSpine(slot, stems[i], () => {
        if (slot.isValid) slot.active = false;
      }, { face: spot.face });
    }
  };
  paint();
  let off = () => {};
  off = WireSession.onSync(paint);
  root.once(Node.EventType.NODE_DESTROYED, () => off());

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
