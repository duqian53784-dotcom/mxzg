/**
 * 把进战表现写进 #163 的 Prefab 挂点。
 * 只改已有节点的字和显隐，不新建 FloatDmg / SkillNameBanner / HeadAnchor。
 * 缺字段就藏起，不写成 0，也不留编辑器占位（-12345、圣光打击、Lv.1、三色 buff）。
 * 不发协议，不加载 PVR。
 */
import { Node } from "cc";
import {
  BATTLE_BUFF_SLOT_COUNT,
  BATTLE_FLOAT_CRIT_PATH,
  BATTLE_FLOAT_SLOT_COUNT,
  BATTLE_SKILL_NAME_BANNER_PATH,
  BATTLE_SKILL_NAME_LABEL_PATH,
  battleFloatDmgPath,
} from "./battlePrefabLayout";
import {
  BATTLE_CRIT_BUBBLE,
  BattleFloatCue,
  BattleOverhead,
  beatShowsCrit,
  floatHurtText,
  overheadLevelText,
  visibleBuffCount,
  visibleFloats,
} from "./battlePresentation";
import { requireNode } from "./prefabLoad";
import { setText } from "./UiKit";

export interface BattlePresentMount {
  floats: Node[];
  crit: Node;
  skillBanner: Node;
  skillLabel: Node;
}

/** 绑 Prefab 上的挂点。缺一个就抛错，调用方退回代码 UI。 */
export function bindBattlePresent(root: Node): BattlePresentMount {
  const floats: Node[] = [];
  for (let i = 0; i < BATTLE_FLOAT_SLOT_COUNT; i++) {
    const path = battleFloatDmgPath(i);
    if (!path) throw new Error("飘字序号超出 Prefab " + i);
    const node = requireNode(root, path);
    setText(node, "");
    node.active = false;
    floats.push(node);
  }
  const crit = requireNode(root, BATTLE_FLOAT_CRIT_PATH);
  crit.active = false;
  const skillBanner = requireNode(root, BATTLE_SKILL_NAME_BANNER_PATH);
  const skillLabel = requireNode(root, BATTLE_SKILL_NAME_LABEL_PATH);
  setText(skillLabel, "");
  skillBanner.active = false;
  return { floats, crit, skillBanner, skillLabel };
}

export function paintBattleSkillName(mount: BattlePresentMount, name: string | null): void {
  if (!mount.skillBanner.isValid || !mount.skillLabel.isValid) return;
  if (name === null || name === "") {
    setText(mount.skillLabel, "");
    mount.skillBanner.active = false;
    return;
  }
  setText(mount.skillLabel, name);
  mount.skillBanner.active = true;
}

/** 按顺序写入 FloatDmg_0..3。没用到的藏起。有暴击才打开 FloatCrit。不挪坐标。 */
export function paintBattleFloats(mount: BattlePresentMount, floats: BattleFloatCue[]): void {
  const shown = visibleFloats(floats);
  for (let i = 0; i < mount.floats.length; i++) {
    const node = mount.floats[i];
    if (!node || !node.isValid) continue;
    if (i >= shown.length) {
      setText(node, "");
      node.active = false;
      continue;
    }
    const text = floatHurtText(shown[i].hurt);
    if (!text) {
      setText(node, "");
      node.active = false;
      continue;
    }
    setText(node, text);
    node.active = true;
  }
  if (!mount.crit.isValid) return;
  if (!beatShowsCrit(floats)) {
    mount.crit.active = false;
    return;
  }
  setText(mount.crit, BATTLE_CRIT_BUBBLE);
  mount.crit.active = true;
}

/**
 * 前排槽上的 HeadAnchor。后排没有这个节点，直接返回，不补造。
 * 等级缺失就藏起 LevelLabel。buff 列表缺失或为空就藏起 BuffRow。
 */
export function paintBattleOverhead(slot: Node, row: BattleOverhead): void {
  if (!slot.isValid) return;
  const head = slot.getChildByName("HeadAnchor");
  if (!head) return;
  const level = head.getChildByName("LevelLabel");
  const levelText = overheadLevelText(row.level);
  if (level) {
    if (levelText === null) {
      setText(level, "");
      level.active = false;
    } else {
      setText(level, levelText);
      level.active = true;
    }
  }
  const buffRow = head.getChildByName("BuffRow");
  if (!buffRow) return;
  const count = visibleBuffCount(row.buffIds);
  if (count === null || count <= 0) {
    buffRow.active = false;
    hideBuffChips(buffRow);
    return;
  }
  buffRow.active = true;
  for (let i = 0; i < BATTLE_BUFF_SLOT_COUNT; i++) {
    const chip = buffRow.getChildByName("Buff_" + i);
    if (!chip) continue;
    chip.active = i < count;
  }
}

export function clearBattleOverhead(slot: Node): void {
  paintBattleOverhead(slot, { slot: -1, level: null, buffIds: null });
}

function hideBuffChips(buffRow: Node): void {
  for (let i = 0; i < BATTLE_BUFF_SLOT_COUNT; i++) {
    const chip = buffRow.getChildByName("Buff_" + i);
    if (chip) chip.active = false;
  }
}
