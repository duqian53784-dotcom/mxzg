/**
 * 底栏「战斗」先看到的挂机站场。不是森林 BattlePage。
 * 仓里没有把殿堂、站场英雄和三钮合成一张的挂机 Prefab。
 * 殿堂用已有 chapter/hang/map01_B（天）和 map01_F（柱、像、大理石地）。
 * 底栏「我要变强 / 战斗 / 快速战斗」仍是 BattlePanelLayer，盖在这块地上。
 * 站场优先 MAIN 阵容：hero_id 经名册 hero_type 对已有皮肤，再走内存里的 spine 升级。
 * 阵容是空的才用三套默认。加载失败把格子藏起来，不写套名。
 * 不给每个站位写「待命」。计时泡只有 Prefab 里那一个，挪到掉落堆上。
 * main-scene_spr-drop-1 是空的蓝金匾，不拿来当掉落堆。
 * 站场站好之后演武自己打：怪出现、挨打、收掉。点「战斗」才进真战报。
 */
import { Color, Node, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { GameStore } from "../core/GameStore";
import { WireSession } from "../net/WireSession";
import { mountBattleSpine, SpineActor } from "./battleSpine";
import { hangStemsForFormation, idleHangStemsFrom } from "./idleHangRoster";
import { mountIdleSkirmish } from "./idleHangSkirmish";
import { localLineupIds, onLocalLineup } from "./localLineup";
import { createRect, place, uiNode } from "./UiKit";

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

/** 当前 3101 / 4001。本局出阵优先。没有 MAIN 英雄时是三套默认。 */
export function idleHangStems(): string[] {
  const localIds = localLineupIds();
  if (localIds.length > 0) {
    const formation = [];
    for (let i = 0; i < localIds.length; i++) formation.push({ heroId: localIds[i], position: i + 1 });
    const stems = hangStemsForFormation(formation, GameStore.heroes(), IDLE_HANG_SPOTS.length);
    if (stems.length > 0) return stems;
  }
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
  const skirmish = mountIdleSkirmish(root);
  let painted = "";
  const paint = () => {
    if (!heroes.isValid) return;
    const stems = idleHangStems();
    const key = stems.join(",");
    if (key === painted) return;
    painted = key;
    const kids = heroes.children.slice();
    for (let i = 0; i < kids.length; i++) kids[i].destroy();
    const actors: SpineActor[] = [];
    for (let i = 0; i < stems.length; i++) {
      const spot = IDLE_HANG_SPOTS[i];
      const slot = place(uiNode("IdleHero"), heroes, spot.x, spot.y);
      actors.push(mountBattleSpine(slot, stems[i], () => {
        if (slot.isValid) slot.active = false;
      }, { face: spot.face }));
    }
    skirmish.retarget(actors);
  };
  paint();
  let off = () => {};
  off = WireSession.onSync(paint);
  const offLocal = onLocalLineup(paint);
  root.once(Node.EventType.NODE_DESTROYED, () => {
    off();
    offLocal();
  });

  return root;
}

const LOOT_AT: ReadonlyArray<{ x: number; y: number; w: number }> = [
  { x: -88, y: -2, w: 34 },
  { x: -58, y: 18, w: 40 },
  { x: -30, y: -16, w: 32 },
  { x: -4, y: 8, w: 46 },
  { x: 28, y: -12, w: 34 },
  { x: 56, y: 14, w: 36 },
  { x: 82, y: -4, w: 30 },
  { x: -74, y: 28, w: 28 },
  { x: -18, y: 26, w: 36 },
  { x: 40, y: 28, w: 28 },
  { x: 6, y: -4, w: 42 },
  { x: -42, y: -6, w: 38 },
  { x: 64, y: 24, w: 26 },
  { x: -12, y: -8, w: 30 },
];

/**
 * 用已有金币、水晶、宝箱和掉落图标叠一堆。没有图标时不留节点。
 * 不使用 main-scene_spr-drop-1。
 */
export function paintIdleLoot(hang: Node, icons: string[]): void {
  const key = icons.join("|");
  const mark = hang as Node & { mxzgLoot?: string };
  const live = hang.getChildByName("IdleLoot");
  if (mark.mxzgLoot === key && live && live.isValid) return;
  mark.mxzgLoot = key;
  if (live) live.destroy();
  if (icons.length === 0) return;
  const pile = uiNode("IdleLoot");
  place(pile, hang, 8, -168);
  const n = icons.length < LOOT_AT.length ? icons.length : LOOT_AT.length;
  for (let i = 0; i < n; i++) {
    const spot = LOOT_AT[i];
    const icon = spriteNode("loot", spot.w, spot.w);
    place(icon, pile, spot.x, spot.y);
    paintSprite(icon, icons[i]);
  }
}

/** Prefab 计时泡的子节点偏移是按底板算的。收到挂机地上，盖在掉落堆上沿。只挪一次。 */
export function seatHangTimer(hang: Node, bubble: Node): void {
  const mark = bubble as Node & { mxzgSeat?: boolean };
  if (!mark.mxzgSeat) {
    mark.mxzgSeat = true;
    const spr = bubble.getChildByName("spr_bubble");
    const label = bubble.getChildByName("lbl_progress_time2");
    if (bubble.parent !== hang) bubble.parent = hang;
    if (spr) spr.setPosition(0, 4, 0);
    if (label) label.setPosition(0, 10, 0);
    bubble.setPosition(56, -118, 0);
  }
  if (bubble.parent === hang) bubble.setSiblingIndex(Math.max(0, hang.children.length - 1));
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
