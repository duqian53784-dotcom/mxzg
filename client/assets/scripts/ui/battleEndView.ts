/**
 * 战斗结算。用已有 BattleEndLayer，不新做恭喜获得，不发 3002。
 * 确定回到挂机。胜利时 btn_report 改成「下一关」。
 * 星用已有星星图：表上没有星级列，胜利画 3 颗，失败不画。
 * 奖励读 chapterreward.first_reward。加载失败返回 null，调用方仍用代码结算。
 */
import { BlockInputEvents, Color, Label, Node, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { itemDisplayName, itemIconResource } from "../config/gameCatalog";
import { chapterClearReward } from "../config/rosterCatalog";
import { messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { bindTap, findDescendant, liftNode, mountCcbiView } from "./pagePrefabShell";
import { loadPrefab, spawnPrefab } from "./prefabLoad";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

export const BATTLE_END_PREFAB = "prefabs/ui/battle/BattleEndLayer";

export interface BattleEndOptions {
  stageId?: number;
  /** 胜利才出现。点了先关结算，再由调用方开下一关。 */
  onNext?: () => void;
}

/**
 * 盖在战斗页上。胜负写进已有标题和失败字。
 * 「5秒后关闭」藏起来，不自动关。确定回挂机，下一关走 btn_report。
 * 挂机壳在页面最上层时，结算改挂到壳里面，避免被壳挡住。
 */
export async function mountBattleEnd(
  parent: Node,
  win: boolean | null,
  onClose: () => void,
  options?: BattleEndOptions
): Promise<Node | null> {
  try {
    const prefab = await loadPrefab(BATTLE_END_PREFAB);
    if (!parent.isValid) return null;
    const hold = uiNode("BattleEndHold");
    const ui = hold.addComponent(UITransform);
    ui.setContentSize(720, 1280);
    hold.addComponent(BlockInputEvents);
    place(createRect("dim", 720, 1280, new Color(8, 16, 32, 160)), hold, 0, 0);
    const view = spawnPrefab(prefab, hold);
    mountCcbiView(view);
    const headline = win === true ? "胜利" : win === false ? "失败" : "胜负未带";
    const name = findDescendant(view, "lbl_hero_name");
    if (name) setText(name, headline);
    const fail = findDescendant(view, "lbl_faild");
    if (fail) {
      if (win === false) {
        fail.active = true;
        setText(fail, "失败，不要气馁");
      } else {
        fail.active = false;
      }
    }
    const timer = findDescendant(view, "lbl_time");
    if (timer) timer.active = false;
    paintStars(view, win === true);
    paintClearRewards(view, win === true ? options && options.stageId : undefined);
    const confirm = findDescendant(view, "btn_confirm");
    if (confirm) {
      caption(confirm, "回挂机");
      liftNode(confirm, view);
      bindTap(confirm, onClose);
    } else {
      place(createButton("回挂机", onClose, 200, 52), hold, 0, -420);
    }
    const next = findDescendant(view, "btn_report");
    if (next) {
      if (win === true && options && options.onNext) {
        next.active = true;
        caption(next, "下一关");
        liftNode(next, view);
        const go = options.onNext;
        bindTap(next, () => {
          if (hold.isValid) hold.destroy();
          go();
        });
      } else {
        next.active = false;
      }
    }
    const shell = parent.getChildByName("PagePrefabShell");
    const host = shell && shell.isValid && shell.active ? shell : parent;
    hold.parent = host;
    hold.setSiblingIndex(Math.max(0, host.children.length - 1));
    GameLog.shared.info("Mainline", "BattleEndLayer " + headline);
    return hold;
  } catch (err) {
    GameLog.shared.warn("Mainline", "BattleEndLayer " + messageOf(err));
    return null;
  }
}

function paintStars(view: Node, win: boolean): void {
  const old = view.getChildByName("EndStars");
  if (old) old.destroy();
  if (!win) return;
  const host = findDescendant(view, "show_hero") || view;
  const row = uiNode("EndStars");
  place(row, host, 0, -36);
  for (let i = 0; i < 3; i++) {
    const star = uiNode("star");
    const ui = star.addComponent(UITransform);
    ui.setContentSize(28, 28);
    const sprite = star.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    place(star, row, (i - 1) * 34, 0);
    paintFrame(star, "ui/hero/hero-info_spr-star-1");
  }
}

function paintClearRewards(view: Node, stageId: number | undefined): void {
  const old = view.getChildByName("EndRewards");
  if (old) old.destroy();
  const stacks = typeof stageId === "number" ? chapterClearReward(stageId) : null;
  const nums = findDescendant(view, "lbl_hero_nums");
  if (!stacks || stacks.length === 0) {
    if (nums) setText(nums, "");
    return;
  }
  const names: string[] = [];
  const host = findDescendant(view, "show_rich") || view;
  const row = uiNode("EndRewards");
  place(row, host, 0, -20);
  const shown = stacks.length < 6 ? stacks.length : 6;
  for (let i = 0; i < shown; i++) {
    const stack = stacks[i];
    const title = itemDisplayName(stack.itemType, null, String(stack.itemType));
    names.push(title + "×" + stack.num);
    const icon = itemIconResource(stack.itemType, null) || "ui/bag/backpack_spr-default";
    const cell = uiNode("reward");
    const ui = cell.addComponent(UITransform);
    ui.setContentSize(64, 64);
    const sprite = cell.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    place(cell, row, (i - (shown - 1) / 2) * 72, 24);
    paintFrame(cell, icon);
    place(createLabel(String(stack.num), 14, { color: new Color(255, 248, 220, 255), width: 60, height: 18 }), cell, 0, -36);
  }
  if (nums) setText(nums, names.join("  "));
}

function caption(node: Node, text: string): void {
  let found = false;
  const stack: Node[] = [node];
  while (stack.length > 0) {
    const cur = stack.pop() as Node;
    const label = cur.getComponent(Label);
    if (label) {
      label.string = text;
      found = true;
    }
    const kids = cur.children;
    for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
  }
  if (!found) {
    place(createLabel(text, 20, { color: new Color(255, 248, 220, 255), width: 120, height: 28 }), node, 0, 0);
  }
}

function paintFrame(node: Node, path: string): void {
  const sprite = node.getComponent(Sprite);
  if (!sprite) return;
  try {
    resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
      if (err || !asset || !node.isValid) return;
      sprite.spriteFrame = asset;
    });
  } catch (_err) {
    return;
  }
}
