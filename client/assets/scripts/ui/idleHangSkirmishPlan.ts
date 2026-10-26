/**
 * 挂机演武的纯规则。不碰场景，也不发协议。
 * 敌人格子和挂机真战斗的后侧三格是同一组。
 */

/**
 * map01_F 高 1280、原点在画面中心。柱廊平台大约从 y=120 往上。
 * 我方和怪都站在棕色地砖上，不把怪放到柱廊上。
 */
export const IDLE_FLOOR_TOP = 120;

/** 地砖前排。左、前、右，朝向怪所在的上沿。 */
export const IDLE_HANG_SPOTS: ReadonlyArray<{ x: number; y: number; face: -1 | 1 }> = [
  { x: -150, y: -30, face: 1 },
  { x: 10, y: -120, face: 1 },
  { x: 150, y: -10, face: -1 },
];

/** 地砖后沿，和我方隔开一排，仍在地砖上。左怪朝右，中、右朝左。 */
export const IDLE_SKIRMISH_SPOTS: ReadonlyArray<{ x: number; y: number; face: -1 | 1 }> = [
  { x: -80, y: 40, face: 1 },
  { x: 36, y: 86, face: -1 },
  { x: 168, y: 28, face: -1 },
];

export function hangStandPoint(side: "ally" | "enemy", index: number): { x: number; y: number; face: -1 | 1 } {
  const spots = side === "enemy" ? IDLE_SKIRMISH_SPOTS : IDLE_HANG_SPOTS;
  const i = index < 0 || !isFinite(index) ? 0 : Math.floor(index);
  return spots[i % spots.length];
}

/** 站位都在地砖上沿以下。柱廊上的 y 不算。 */
export function idleSpotsOnFloor(spots: ReadonlyArray<{ y: number }>): boolean {
  if (!spots || spots.length === 0) return false;
  for (let i = 0; i < spots.length; i++) {
    if (spots[i].y > IDLE_FLOOR_TOP) return false;
  }
  return true;
}

/**
 * 两波之间往地砖上沿跑一小段再回到原格。
 * step 从 0 到 steps。中点最靠上。
 */
export function idleMarchStep(
  spot: { x: number; y: number; face: -1 | 1 },
  step: number,
  steps: number
): { x: number; y: number } {
  const n = steps >= 2 ? Math.floor(steps) : 2;
  let i = Math.floor(step);
  if (i < 0) i = 0;
  if (i > n) i = n;
  const t = i / n;
  const wave = t < 0.5 ? t * 2 : (1 - t) * 2;
  return {
    x: spot.x + spot.face * 18 * wave,
    y: spot.y + 42 * wave,
  };
}

/** 怪已经显示才允许出刀。看不见人时不许打空。 */
export function idleSkirmishMayStrike(foeVisible: boolean): boolean {
  return foeVisible === true;
}

/** 奇数刀用 attack2，套里没有再退回 attack。 */
export function idleSkirmishSwingClip(index: number): "attack" | "attack2" {
  return Math.floor(index) % 2 === 1 ? "attack2" : "attack";
}

/** 和 WIRE_SPINE_ENEMY_STEMS 同一组。表里的怪对不上 stand 时用。 */
export const IDLE_SKIRMISH_FALLBACK_STEMS = ["10405006", "10405007", "10505010"];

export const IDLE_SKIRMISH_OPEN_MS = 480;
export const IDLE_SKIRMISH_APPEAR_MS = 720;
export const IDLE_SKIRMISH_STRIKE_MS = 680;
export const IDLE_SKIRMISH_KILL_MS = 760;
export const IDLE_SKIRMISH_GAP_MS = 560;
/** 只有一名英雄时也打两下，避免一刀就把怪收掉。 */
export const IDLE_SKIRMISH_HITS = 2;

export interface IdleFoePlan {
  stem: string;
  spot: number;
  face: -1 | 1;
  /** 表里的 hp。没有就 null，飘字改用演出数字。 */
  maxHp: number | null;
}

/** 当前关。Mock 关号只在已经是 Mock 时用。真服用 3007，都没有就是 1。 */
export function idleSkirmishStageIdx(mockStage: number | null, nowIdx: number | null, maxIdx: number | null): number {
  if (mockStage !== null && mockStage >= 1) return Math.floor(mockStage);
  if (nowIdx !== null && nowIdx >= 1) return Math.floor(nowIdx);
  if (maxIdx !== null && maxIdx >= 1) return Math.floor(maxIdx);
  return 1;
}

/** 有几名英雄就打几下，至少 IDLE_SKIRMISH_HITS 下。没有英雄时仍按最少下数分血。 */
export function idleSkirmishSwings(allyCount: number): number {
  if (allyCount >= IDLE_SKIRMISH_HITS) return Math.floor(allyCount);
  return IDLE_SKIRMISH_HITS;
}

/**
 * 把这一只的血分到每一刀。最后一刀把剩下的打完，并标记击杀。
 * 没有 hp 时用固定演出数字，仍是最后一刀击杀。不掷随机数。
 */
export function idleSkirmishHurt(maxHp: number | null, hitIndex: number, hits: number): { hurt: number; kill: boolean } {
  const n = hits >= 1 ? Math.floor(hits) : 1;
  let index = Math.floor(hitIndex);
  if (index < 0) index = 0;
  if (index >= n) index = n - 1;
  const kill = index === n - 1;
  if (maxHp === null || !isFinite(maxHp) || maxHp <= 0) {
    return { hurt: 48 + index * 16, kill };
  }
  const total = Math.floor(maxHp);
  const each = Math.max(1, Math.floor(total / n));
  const hurt = kill ? total - each * (n - 1) : each;
  return { hurt: hurt > 0 ? hurt : 1, kill };
}

/** 有 die 播倒地，否则有 hit 播受击，再没有就站着被收掉。 */
export function idleSkirmishKillClip(stem: string, hasClip: (name: string, clip: "die" | "hit" | "stand") => boolean): "die" | "hit" | "stand" {
  if (hasClip(stem, "die")) return "die";
  if (hasClip(stem, "hit")) return "hit";
  return "stand";
}

/**
 * 当前关有 stand 的怪优先，按波次轮换。
 * 一只都对不上就用 fallback，仍按波次换格子。
 */
export function planIdleFoe(
  wave: number,
  monsters: { heroType: number; hp: number | null }[],
  hasStand: (stem: string) => boolean,
  fallback: readonly string[]
): IdleFoePlan {
  const turn = wave >= 0 ? Math.floor(wave) : 0;
  const spot = IDLE_SKIRMISH_SPOTS[turn % IDLE_SKIRMISH_SPOTS.length];
  const usable: { stem: string; hp: number | null }[] = [];
  for (let i = 0; i < monsters.length; i++) {
    const type = monsters[i].heroType;
    if (typeof type !== "number" || !isFinite(type) || type <= 0) continue;
    const stem = String(Math.floor(type));
    if (!hasStand(stem)) continue;
    let seen = false;
    for (let j = 0; j < usable.length; j++) {
      if (usable[j].stem === stem) seen = true;
    }
    if (seen) continue;
    const hp = monsters[i].hp;
    usable.push({ stem, hp: typeof hp === "number" && isFinite(hp) && hp > 0 ? Math.floor(hp) : null });
  }
  if (usable.length > 0) {
    const row = usable[turn % usable.length];
    return { stem: row.stem, spot: turn % IDLE_SKIRMISH_SPOTS.length, face: spot.face, maxHp: row.hp };
  }
  const pool = fallback.length > 0 ? fallback : IDLE_SKIRMISH_FALLBACK_STEMS;
  return {
    stem: pool[turn % pool.length],
    spot: turn % IDLE_SKIRMISH_SPOTS.length,
    face: spot.face,
    maxHp: null,
  };
}
