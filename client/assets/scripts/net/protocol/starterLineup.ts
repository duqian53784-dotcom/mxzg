/**
 * 空号第一次点主线「挑战」时，补第一只英雄并放到 MAIN。
 *
 * 仓内没有教程、新手引导、创角发英雄的 opcode。4001 只读名册。4002 召唤未编码。
 * 服端肯收的实例只有 GM 探针已经在用的两帧：
 * c2s 2015 ADD_HERO（默认类型 10505010、星级 9，实例在 s2c 4030），
 * c2s 3100（type=0，formation_id=1，position=2）。
 * 这是过渡，直到完整新手引导 Prefab 和出阵 Prefab 落地。点「挑战」自动走这两帧，不必打开 GM。
 * 不进 pullIdle。登录链不发。GM 两颗按钮仍在，探针行为不变。
 * MAIN 已有英雄，或本会话 3100 已空包确认，就只发 3001。
 * 名册里已有服端 hero_id 时只发 3100，不再发 2015。
 * 名册和 3101 都还没到时先等，不发明实例。
 */
import { WIRE_MAIN_LINE_TYPE } from "./wireLineUpSave";

export const STARTER_LINEUP_NOTE =
  "过渡：没有教程发英雄 opcode。空 MAIN 且空名册时，点挑战复用 2015 ADD_HERO（默认 10505010 / 星 9）和 3100 上 MAIN（type=0，formation_id=1，position=2）。不打开 GM。不进 pullIdle。完整新手 Prefab 与出阵 Prefab 落地后删掉。";

export type StarterChallengeKind = "challenge" | "grant" | "save" | "wait";

export interface StarterLineMark {
  field: number;
  text: string;
}

export interface StarterLineView {
  rows: { marks: StarterLineMark[] }[];
}

export interface StarterHeroView {
  heroId: number | null;
}

export interface StarterChallengeInput {
  /** 3101 已同步。null 表示还没收到。空 rows 是已同步的空队列。 */
  lineUp: StarterLineView | null;
  /** 4001 已收齐。null 表示还没收到。空数组是已同步的空名册。 */
  heroes: StarterHeroView[] | null;
  /** 最近一次 4030 的实例。没有是 null。 */
  gmHeroId: number | null;
  /** 本会话已经收到空的 s2c 3100。3101 快照不会被这次 3100 改写。 */
  mainSaved: boolean;
}

export interface StarterChallengePlan {
  kind: StarterChallengeKind;
  /** save 时要用的服端实例。其余是 null。 */
  heroId: number | null;
}

/**
 * MAIN 是 type=0 的那一行。英雄实例在字段 4（hero_list）嵌套的字段 1。
 * 没有正整数就不算在阵上。其它 type 的行不算 MAIN。
 */
export function mainFormationHeroId(lineUp: StarterLineView | null | undefined): number | null {
  if (!lineUp || !lineUp.rows) return null;
  for (let r = 0; r < lineUp.rows.length; r++) {
    const marks = lineUp.rows[r].marks || [];
    if (!isMainRow(marks)) continue;
    const id = heroIdInHeroList(marks);
    if (id !== null) return id;
  }
  return null;
}

/** 名册里第一只服端实例。类型号不算。0 和空不算。 */
export function firstBagHeroId(heroes: StarterHeroView[] | null | undefined): number | null {
  if (!heroes) return null;
  for (let i = 0; i < heroes.length; i++) {
    const id = positive(heroes[i].heroId);
    if (id !== null) return id;
  }
  return null;
}

/**
 * 点「挑战」之前决定发哪一帧。
 * challenge：只发 3001。grant：先 2015。save：先 3100。wait：名册或 3101 还没到。
 */
export function planStarterChallenge(input: StarterChallengeInput): StarterChallengePlan {
  if (input.mainSaved) return { kind: "challenge", heroId: null };
  if (mainFormationHeroId(input.lineUp) !== null) return { kind: "challenge", heroId: null };
  const bagId = firstBagHeroId(input.heroes);
  const knownId = bagId !== null ? bagId : positive(input.gmHeroId);
  if (knownId !== null) {
    if (input.lineUp === null) return { kind: "wait", heroId: null };
    return { kind: "save", heroId: knownId };
  }
  if (input.heroes !== null) return { kind: "grant", heroId: null };
  return { kind: "wait", heroId: null };
}

function isMainRow(marks: StarterLineMark[]): boolean {
  const typeText = String(WIRE_MAIN_LINE_TYPE);
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].field === 1 && marks[i].text === typeText) return true;
  }
  return false;
}

function heroIdInHeroList(marks: StarterLineMark[]): number | null {
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].field !== 4) continue;
    const found = nestedHeroId(marks[i].text);
    if (found !== null) return found;
  }
  return null;
}

/** 字段 4 的正文是「字段1=<hero_id>,字段3=<position>」。只收字段 1 的正整数。 */
function nestedHeroId(text: string): number | null {
  if (!text) return null;
  const match = /(?:^|,)字段1=([1-9]\d*)/.exec(text);
  if (!match) return null;
  return positive(Number(match[1]));
}

function positive(value: number | null): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) return null;
  return value;
}
