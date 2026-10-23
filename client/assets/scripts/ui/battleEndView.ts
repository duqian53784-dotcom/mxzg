/**
 * 战斗结算。用已有 BattleEndLayer，不新做恭喜获得，不发 3002。
 * 确定回到挂机。加载失败返回 null，调用方仍用代码结算。
 */
import { BlockInputEvents, Color, Node, UITransform } from "cc";
import { messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { bindTap, findDescendant, liftNode, mountCcbiView } from "./pagePrefabShell";
import { loadPrefab, spawnPrefab } from "./prefabLoad";
import { createButton, createRect, place, setText, uiNode } from "./UiKit";

export const BATTLE_END_PREFAB = "prefabs/ui/battle/BattleEndLayer";

/**
 * 盖在战斗页上。胜负写进已有标题和失败字。
 * 「5秒后关闭」藏起来，不自动关。确定才回调。
 */
export async function mountBattleEnd(parent: Node, win: boolean | null, onClose: () => void): Promise<Node | null> {
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
    const confirm = findDescendant(view, "btn_confirm");
    if (confirm) {
      liftNode(confirm, view);
      bindTap(confirm, onClose);
    } else {
      place(createButton("确定", onClose, 200, 52), hold, 0, -420);
    }
    hold.parent = parent;
    hold.setSiblingIndex(Math.max(0, parent.children.length - 1));
    GameLog.shared.info("Mainline", "BattleEndLayer " + headline);
    return hold;
  } catch (err) {
    GameLog.shared.warn("Mainline", "BattleEndLayer " + messageOf(err));
    return null;
  }
}
