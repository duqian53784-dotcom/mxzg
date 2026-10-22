/**
 * 绑定 BattlePage.prefab。节点名对齐 docs/battle-prefab-layout.md。
 * 路径相对 assets：prefabs/ui/battle/BattlePage。不走 resources.load。
 * 不挂脚本组件，不改 Prefab。USE_BATTLE_PREFAB 为 false，或加载 / 绑节点失败时，调用方仍走代码 UI。
 * 不发协议。WireBattlePage 没有站位和特效挂点，这一刀不挂它。
 */
import { Node, UITransform } from "cc";
import {
  BATTLE_PREFAB_PATH,
  battleHpPath,
  battlePrefabRequiredPaths,
  battleSkillLabelPath,
  battleSlotPath,
  battleVfxPath,
  BattleSlotSide,
  BattleVfxRole,
  HP_FILL_HEIGHT,
  hpFillLayout,
  vfxLocal,
} from "./battlePrefabLayout";
import { bindClick, loadPrefab, requireNode, spawnPrefab } from "./prefabLoad";
import { setText } from "./UiKit";

export { BATTLE_PREFAB_PATH };

/**
 * 真服进战默认挂 BattlePage。和登录、主城壳一样默认开。
 * 改成 false 再预览，就回到 WireMainlinePage 里代码搭的战斗页。不要改 Boot。
 */
export const USE_BATTLE_PREFAB = true;

export interface BattlePrefabShell {
  root: Node;
  roundLabel: Node;
  logLabel: Node;
  layerField: Node;
  slot(side: BattleSlotSide, index: number): Node;
  hpLabel(side: BattleSlotSide, index: number): Node | null;
  setHpFill(side: BattleSlotSide, index: number, hp: number | null, maxHp: number | null): void;
  clearSkillLabels(): void;
  setSkillLabel(index: number, text: string): void;
  vfxAnchor(role: BattleVfxRole): Node;
  placeVfx(holder: Node, role: "skill" | "hit", pageX: number, pageY: number): void;
  bindSkip(fn: () => void): void;
  bindRetreat(fn: () => void): void;
  bindClose(fn: () => void): void;
}

export async function mountBattlePrefab(parent: Node): Promise<BattlePrefabShell> {
  const prefab = await loadPrefab(BATTLE_PREFAB_PATH);
  const root = spawnPrefab(prefab, parent);
  try {
    return bindBattlePrefab(root);
  } catch (err) {
    root.destroy();
    throw err;
  }
}

function bindBattlePrefab(root: Node): BattlePrefabShell {
  const paths = battlePrefabRequiredPaths();
  for (let i = 0; i < paths.length; i++) requireNode(root, paths[i]);
  const roundLabel = requireNode(root, "LayerHud/TopBar/RoundLabel");
  const logLabel = requireNode(root, "LayerHud/Log");
  const layerField = requireNode(root, "LayerField");
  const skip = requireNode(root, "LayerHud/BtnSkip");
  const retreat = requireNode(root, "LayerHud/BtnRetreat");
  const close = requireNode(root, "LayerHud/TopBar/BtnClose");

  return {
    root,
    roundLabel,
    logLabel,
    layerField,
    slot(side: BattleSlotSide, index: number): Node {
      const path = battleSlotPath(side, index);
      if (!path) throw new Error("站位超出 Prefab " + side + " " + index);
      return requireNode(root, path);
    },
    hpLabel(side: BattleSlotSide, index: number): Node | null {
      const path = battleHpPath(side, index);
      if (!path) return null;
      return requireNode(root, path + "/Label");
    },
    setHpFill(side: BattleSlotSide, index: number, hp: number | null, maxHp: number | null): void {
      const path = battleHpPath(side, index);
      if (!path || hp === null || maxHp === null || maxHp <= 0) return;
      paintHpFill(requireNode(root, path + "/Fill"), hp / maxHp);
    },
    clearSkillLabels(): void {
      for (let i = 0; i < 3; i++) setText(requireNode(root, "LayerHud/SkillBars/SkillBar_" + i + "/Label"), "");
    },
    setSkillLabel(index: number, text: string): void {
      const path = battleSkillLabelPath(index);
      if (!path) return;
      setText(requireNode(root, path), text);
    },
    vfxAnchor(role: BattleVfxRole): Node {
      return requireNode(root, battleVfxPath(role));
    },
    placeVfx(holder: Node, role: "skill" | "hit", pageX: number, pageY: number): void {
      const anchor = requireNode(root, battleVfxPath(role));
      if (holder.parent !== anchor) holder.parent = anchor;
      const local = vfxLocal(role, pageX, pageY);
      holder.setPosition(local.x, local.y, 0);
    },
    bindSkip(fn: () => void): void {
      bindClick(skip, fn);
    },
    bindRetreat(fn: () => void): void {
      bindClick(retreat, fn);
    },
    bindClose(fn: () => void): void {
      bindClick(close, fn);
    },
  };
}

function paintHpFill(node: Node, ratio: number): void {
  const ui = node.getComponent(UITransform);
  if (!ui) return;
  const layout = hpFillLayout(ratio);
  node.active = layout.visible;
  if (!layout.visible) return;
  ui.setContentSize(layout.width, HP_FILL_HEIGHT);
  node.setPosition(layout.x, 0, 0);
}
