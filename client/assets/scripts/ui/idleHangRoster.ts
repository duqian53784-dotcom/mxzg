/**
 * 挂机站场用哪几套 spine。
 * MAIN（3101 type=0）有英雄时，用名册 hero_type 对已有皮肤表。
 * 名册还没到、或类型对不上，再试 hero_id 本身是不是套名。
 * 阵容是空的才退回三套默认。不发协议。
 */
import { mainFormationHeroes, MainFormationHero, StarterLineView } from "../net/protocol/starterLineup";
import { wireSpineHasClip, WIRE_SPINE_ALLY_STEMS } from "../net/protocol/wireBattle";

export interface HangHeroType {
  heroId: number | null;
  heroType: number | null;
}

/** 没有 MAIN 英雄时挂机仍站这三套。和战斗补位的我方默认套同一组。 */
export function idleHangDefaultStems(limit: number): string[] {
  const stems: string[] = [];
  const n = limit < WIRE_SPINE_ALLY_STEMS.length ? limit : WIRE_SPINE_ALLY_STEMS.length;
  for (let i = 0; i < n; i++) stems.push(WIRE_SPINE_ALLY_STEMS[i]);
  return stems;
}

/**
 * hero_type 对得上皮肤表就用类型号。
 * 对不上时，hero_id 自己对得上才用实例号。
 * 两边都对不上仍返回类型号或实例号，调用方去加载；失败只藏格子，不换成默认套。
 */
export function hangSpineStem(heroId: number, heroType: number | null): string {
  const typeName = typeof heroType === "number" && Number.isFinite(heroType) ? String(Math.floor(heroType)) : "";
  if (typeName && wireSpineHasClip(typeName, "stand")) return typeName;
  const idName = String(heroId);
  if (wireSpineHasClip(idName, "stand") || wireSpineHasClip(idName, "attack")) return idName;
  if (typeName) return typeName;
  return idName;
}

/** 按站位从小到大。没有站位的排在后面。最多 limit 只。空阵容返回空数组，不填默认套。 */
export function hangStemsForFormation(formation: MainFormationHero[], bag: HangHeroType[] | null, limit: number): string[] {
  if (!formation || formation.length === 0 || limit <= 0) return [];
  const ordered = formation.slice().sort(byPosition);
  const stems: string[] = [];
  const n = ordered.length < limit ? ordered.length : limit;
  for (let i = 0; i < n; i++) {
    stems.push(hangSpineStem(ordered[i].heroId, typeOf(bag, ordered[i].heroId)));
  }
  return stems;
}

/**
 * 3101 还没到，或 MAIN 没有英雄，用默认三套。
 * 有 MAIN 英雄就只用这几只，不满三只也不用默认套凑数。
 */
export function idleHangStemsFrom(lineUp: StarterLineView | null | undefined, bag: HangHeroType[] | null, limit: number): string[] {
  const stems = hangStemsForFormation(mainFormationHeroes(lineUp), bag, limit);
  if (stems.length === 0) return idleHangDefaultStems(limit);
  return stems;
}

function typeOf(bag: HangHeroType[] | null, heroId: number): number | null {
  if (!bag) return null;
  for (let i = 0; i < bag.length; i++) {
    if (bag[i].heroId === heroId) return bag[i].heroType;
  }
  return null;
}

function byPosition(a: MainFormationHero, b: MainFormationHero): number {
  const ap = a.position === null ? 1000 : a.position;
  const bp = b.position === null ? 1000 : b.position;
  if (ap !== bp) return ap - bp;
  return a.heroId - b.heroId;
}
