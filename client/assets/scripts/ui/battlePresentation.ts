/**
 * 进战表现拍子。和 planWireSpineReplay 同一份 BattleReport、同一套站位。
 * 伤害用命中 hurt。hurt 没有就不画，不写成 0。
 * 暴击只认命中上已经有的 crit。没有这个字段不画「暴击」，也不把 marks 里的号猜成暴击。
 * 技能名用 wireSpineSkillStem。表对不上就写「技能 」加 id，不编造技能名。
 * 等级、buff 只认英雄上已经有的 level、buffs。没有就不写 0，也不造图标。
 * 不发协议。
 */
import {
  WIRE_BATTLE_CAMP_ALLY,
  WIRE_BATTLE_CAMP_ENEMY,
  wireSpineSkillStem,
  WireBattleAction,
  WireBattleHero,
  WireBattleReport,
  WireSpineReplay,
  WireSpineSlot,
} from "../net/protocol/wireBattle";

export const BATTLE_CRIT_BUBBLE = "暴击";

/** 和 Prefab 的 FloatDmg_0..3、Buff_0..2 对齐。多出来的不另建节点。 */
export const BATTLE_FLOAT_SLOT_COUNT = 4;
export const BATTLE_BUFF_SLOT_COUNT = 3;

/** 1 倍一拍。最后一拍短一点，但回放结束不拆页，所以这不是关页。 */
export const BATTLE_BEAT_MS = 700;
export const BATTLE_LAST_BEAT_MS = 260;
/** 3 倍也不收成 0。收成 0 会在同一帧跳完，看起来像闪一下。 */
export const BATTLE_MIN_BEAT_MS = 80;

/**
 * 加速只缩短每一拍的等待。1、2、3 倍。其它值当 1 倍。
 * 跳过另走，不经过这里。
 */
export function battleBeatWait(speed: number, last: boolean): number {
  const base = last ? BATTLE_LAST_BEAT_MS : BATTLE_BEAT_MS;
  let steps = 1;
  if (speed === 2) steps = 2;
  else if (speed === 3) steps = 3;
  const wait = Math.floor(base / steps);
  if (wait < BATTLE_MIN_BEAT_MS) return BATTLE_MIN_BEAT_MS;
  return wait;
}

/** ×1 → ×2 → ×3 → ×1。不跳过拍子，也不拆页。 */
export function nextBattleSpeed(speed: number): number {
  if (speed === 1) return 2;
  if (speed === 2) return 3;
  return 1;
}

export interface BattleFloatCue {
  /** plan.slots 下标。对不上人时是 null。数字仍写在 FloatDmg 槽上，不按站位挪节点。 */
  anchor: number | null;
  hurt: number;
  /** true 才画「暴击」。缺字段和明确的不暴击都是 false，不写 0。 */
  crit: boolean;
}

export interface BattlePresentBeat {
  floats: BattleFloatCue[];
  /** 这一拍没有技能时是 null。 */
  skillName: string | null;
  skillId: number | null;
}

export interface BattleOverhead {
  /** plan.slots 下标。只含报告里真正带上的英雄，不含补位。 */
  slot: number;
  /** 没有 level 字段时是 null，不写成 0。出现的 0 仍是 0。 */
  level: number | null;
  /** 没有 buffs 字段时是 null。空数组表示列表在，但没有图标。 */
  buffIds: number[] | null;
}

export interface BattlePresentation {
  beats: BattlePresentBeat[];
  overhead: BattleOverhead[];
}

/**
 * 技能名。stem 来自现有取模表。表是空的、或这个 id 对不上时，写「技能 」加 id。
 * skillId 缺失时是 null，调用方关掉中场条。
 */
export function battleSkillTitle(skillId: number | null, table?: readonly string[]): string | null {
  if (skillId === null || typeof skillId !== "number" || !isFinite(skillId)) return null;
  const stem = wireSpineSkillStem(skillId, table);
  if (stem) return stem;
  return "技能 " + String(Math.trunc(skillId));
}

/**
 * 命中上已经解开的 crit。没有这个字段时是 null。
 * true，或非 0 的有限数字，才是暴击。0 和 false 是明确的不暴击，不画气泡。
 * 读不懂的值也是 null，不猜成暴击。
 */
export function readHitCrit(hit: object | null | undefined): boolean | null {
  if (!hit || typeof hit !== "object") return null;
  if (!Object.prototype.hasOwnProperty.call(hit, "crit")) return null;
  const value = (hit as { crit?: unknown }).crit;
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && isFinite(value)) return value !== 0;
  return null;
}

/** 英雄上已经解开的 level。没有字段时是 null。出现的 0 仍返回 0。 */
export function readHeroLevel(hero: object | null | undefined): number | null {
  if (!hero || typeof hero !== "object") return null;
  if (!Object.prototype.hasOwnProperty.call(hero, "level")) return null;
  const value = (hero as { level?: unknown }).level;
  if (typeof value !== "number" || !isFinite(value)) return null;
  return value;
}

/**
 * 英雄上已经解开的 buffs。没有字段，或不是数组时是 null。
 * 只收有限数字。其它元素丢掉，不编成图标名。
 */
export function readHeroBuffIds(hero: object | null | undefined): number[] | null {
  if (!hero || typeof hero !== "object") return null;
  if (!Object.prototype.hasOwnProperty.call(hero, "buffs")) return null;
  const raw = (hero as { buffs?: unknown }).buffs;
  if (!Array.isArray(raw)) return null;
  const ids: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (typeof item === "number" && isFinite(item)) ids.push(item);
  }
  return ids;
}

/**
 * null 表示藏起 LevelLabel，不写 0，也不留 Prefab 的 Lv.1。
 * 出现的 0 仍写成 Lv.0。
 */
export function overheadLevelText(level: number | null): string | null {
  if (level === null) return null;
  return "Lv." + String(level);
}

/** null 表示不要造 buff 图标。空数组表示列表在，但不画。 */
export function buffIconTexts(buffIds: number[] | null): string[] | null {
  if (buffIds === null) return null;
  const texts: string[] = [];
  for (let i = 0; i < buffIds.length; i++) texts.push(String(buffIds[i]));
  return texts;
}

export function floatHurtText(hurt: number): string {
  if (typeof hurt !== "number" || !isFinite(hurt)) return "";
  return String(hurt);
}

export function critBubbleText(crit: boolean): string | null {
  return crit ? BATTLE_CRIT_BUBBLE : null;
}

/** 写进 FloatDmg_0..3 的前几条。多出来的不另建节点。 */
export function visibleFloats(floats: BattleFloatCue[]): BattleFloatCue[] {
  const shown: BattleFloatCue[] = [];
  const n = floats.length < BATTLE_FLOAT_SLOT_COUNT ? floats.length : BATTLE_FLOAT_SLOT_COUNT;
  for (let i = 0; i < n; i++) shown.push(floats[i]);
  return shown;
}

/** 这四条里有暴击才打开 FloatCrit。没有 crit 字段时各条都是 false。 */
export function beatShowsCrit(floats: BattleFloatCue[]): boolean {
  const shown = visibleFloats(floats);
  for (let i = 0; i < shown.length; i++) {
    if (shown[i].crit) return true;
  }
  return false;
}

/**
 * null 表示藏起 BuffRow。空列表也藏起，不把三颗染色块当成 buff。
 * 有 id 时最多亮 BATTLE_BUFF_SLOT_COUNT 颗，不另建。
 */
export function visibleBuffCount(buffIds: number[] | null): number | null {
  if (buffIds === null) return null;
  if (buffIds.length <= 0) return 0;
  return buffIds.length < BATTLE_BUFF_SLOT_COUNT ? buffIds.length : BATTLE_BUFF_SLOT_COUNT;
}

/**
 * 拍子顺序对齐 planWireSpineReplay：先站场，没有行动时每回合一拍再加胜负拍，
 * 有行动时每个行动一拍。胜负拍用 replay.win，不重新判。
 */
export function planBattlePresentation(report: WireBattleReport, replay: WireSpineReplay): BattlePresentation {
  const beats: BattlePresentBeat[] = [emptyBeat()];
  let actionCount = 0;
  for (let r = 0; r < report.rounds.length; r++) actionCount += report.rounds[r].actions.length;
  if (actionCount === 0) {
    for (let r = 0; r < report.rounds.length; r++) beats.push(emptyBeat());
    if (replay.win === true || replay.win === false) beats.push(emptyBeat());
    return { beats, overhead: overheadRows(report, replay.slots) };
  }
  for (let r = 0; r < report.rounds.length; r++) {
    const round = report.rounds[r];
    if (round.actions.length === 0) {
      beats.push(emptyBeat());
      continue;
    }
    for (let a = 0; a < round.actions.length; a++) beats.push(actionPresent(round.actions[a], replay.slots));
  }
  return { beats, overhead: overheadRows(report, replay.slots) };
}

function emptyBeat(): BattlePresentBeat {
  return { floats: [], skillName: null, skillId: null };
}

function actionPresent(action: WireBattleAction, slots: WireSpineSlot[]): BattlePresentBeat {
  const floats: BattleFloatCue[] = [];
  for (let i = 0; i < action.hits.length; i++) {
    const hit = action.hits[i];
    if (hit.hurt === null || typeof hit.hurt !== "number" || !isFinite(hit.hurt)) continue;
    let anchor: number | null = null;
    if (hit.defPos !== null) anchor = matchUnit(slots, hit.defPos, null);
    floats.push({ anchor, hurt: hit.hurt, crit: readHitCrit(hit) === true });
  }
  return {
    floats,
    skillId: action.skillId,
    skillName: battleSkillTitle(action.skillId),
  };
}

function overheadRows(report: WireBattleReport, slots: WireSpineSlot[]): BattleOverhead[] {
  const rows: BattleOverhead[] = [];
  pushSide(rows, report.atkHeroes, slots, "ally");
  pushSide(rows, report.defHeroes, slots, "enemy");
  return rows;
}

function pushSide(
  rows: BattleOverhead[],
  heroes: WireBattleHero[],
  slots: WireSpineSlot[],
  side: "ally" | "enemy"
): void {
  const n = Math.min(heroes.length, 3);
  for (let i = 0; i < n; i++) {
    const slot = nthSide(slots, side, i);
    if (slot < 0) return;
    rows.push({
      slot,
      level: readHeroLevel(heroes[i]),
      buffIds: readHeroBuffIds(heroes[i]),
    });
  }
}

function nthSide(slots: WireSpineSlot[], side: "ally" | "enemy", n: number): number {
  let seen = 0;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].side !== side) continue;
    if (seen === n) return i;
    seen += 1;
  }
  return -1;
}

function matchUnit(slots: WireSpineSlot[], pos: number, camp: number | null): number | null {
  const hits: number[] = [];
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.side !== "ally" && slot.side !== "enemy") continue;
    if (slot.pos !== pos) continue;
    if (camp === WIRE_BATTLE_CAMP_ALLY && slot.side !== "ally") continue;
    if (camp === WIRE_BATTLE_CAMP_ENEMY && slot.side !== "enemy") continue;
    hits.push(i);
  }
  if (hits.length === 1) return hits[0];
  return null;
}
