/**
 * 挂机演武的纯规则。不碰场景，也不发协议。
 * 敌人格子和挂机真战斗的后侧三格是同一组。
 */

/**
 * map01_F 高 1280、原点在画面中心。柱廊平台大约从 y=120 往上。
 * 我方和怪都站在棕色地砖上，不把怪放到柱廊上。
 */
export const IDLE_FLOOR_TOP = 120;

/** 地砖前排。左、前、右都在我方，朝右对着敌方。 */
export const IDLE_HANG_SPOTS: ReadonlyArray<{ x: number; y: number; face: -1 | 1 }> = [
  { x: -150, y: -30, face: 1 },
  { x: 10, y: -120, face: 1 },
  { x: 150, y: -10, face: 1 },
];

/** 右侧地砖。三格都朝左对着我方。入场从格子再往右滑进来，不落到我方阵上。 */
export const IDLE_SKIRMISH_SPOTS: ReadonlyArray<{ x: number; y: number; face: -1 | 1 }> = [
  { x: 230, y: -20, face: -1 },
  { x: 300, y: 36, face: -1 },
  { x: 260, y: 84, face: -1 },
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

/** 行军时大理石每秒往左。天更慢。只走水平，不抬高，也不在段尾弹回。 */
export const IDLE_HALL_SCROLL_PX = 28;
export const IDLE_SKY_SCROLL_PX = 10;
/** 这一段跑完才遇怪。遇怪时停。 */
export const IDLE_MARCH_MS = 1400;
/** 怪从格子右侧滑进格子。 */
export const IDLE_FOE_ENTER_MS = 640;
export const IDLE_FOE_ENTER_FROM = 460;

/**
 * 行军阶段的循环偏移。时间一直涨，在宽度内折返，不会滑一段再回到原点。
 * 返回负值：图层往左走。没有 y。
 */
export function idleHangLoopOffset(elapsedMs: number, width: number, pxPerSec: number): number {
  const w = width >= 1 ? width : 1;
  const speed = pxPerSec > 0 ? pxPerSec : 0;
  let ms = elapsedMs;
  if (!isFinite(ms) || ms <= 0 || speed === 0) return 0;
  const dist = (ms / 1000) * speed;
  if (!isFinite(dist) || dist <= 0) return 0;
  let wrapped = dist % w;
  if (wrapped < 0) wrapped += w;
  if (wrapped === 0) return 0;
  return -wrapped;
}

/** 怪入场的 x。t 从 0 到 1，从格子右侧滑到格子。y 由调用方保持格子的 y。 */
export function idleFoeEnterX(slotX: number, t: number): number {
  let u = t;
  if (!isFinite(u) || u < 0) u = 0;
  if (u > 1) u = 1;
  const start = slotX + IDLE_FOE_ENTER_FROM;
  return Math.round(start + (slotX - start) * u);
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

function usableIdleFoes(
  monsters: { heroType: number; hp: number | null }[],
  hasStand: (stem: string) => boolean
): { stem: string; hp: number | null }[] {
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
  return usable;
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
  const usable = usableIdleFoes(monsters, hasStand);
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

/**
 * 这一波同时上场的怪。有几只能站的就上几只，最多三个格子。
 * 不按死亡再补下一只。表里一只就一只。一只都没有就用 fallback 的第一只，站 0 号格。
 */
export function planIdleWave(
  monsters: { heroType: number; hp: number | null }[],
  hasStand: (stem: string) => boolean,
  fallback: readonly string[]
): IdleFoePlan[] {
  const usable = usableIdleFoes(monsters, hasStand);
  if (usable.length === 0) {
    const one = planIdleFoe(0, monsters, hasStand, fallback);
    const spot = IDLE_SKIRMISH_SPOTS[0];
    return [{ stem: one.stem, spot: 0, face: spot.face, maxHp: null }];
  }
  const n = usable.length < IDLE_SKIRMISH_SPOTS.length ? usable.length : IDLE_SKIRMISH_SPOTS.length;
  const plans: IdleFoePlan[] = [];
  for (let i = 0; i < n; i++) {
    const spot = IDLE_SKIRMISH_SPOTS[i];
    plans.push({ stem: usable[i].stem, spot: i, face: spot.face, maxHp: usable[i].hp });
  }
  return plans;
}
