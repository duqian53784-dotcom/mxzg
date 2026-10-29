/**
 * 挂机演武的纯规则。不碰场景，也不发协议。
 * 我方站位移植日服 BattleUtils.getHangHeroPosition（挂机 isMirror，人在左边）。
 * 下标是阵容 position（协议站位 1..9），不是把人按 0、1、2 塞进一张固定三角表。
 * 不是 BattlePage battlePrefabLayout（那是左敌右我），也不是 c2s 3100 的写入格子。
 * 没有阵位时，三只默认英雄占阵位 1、4、5。坐标由公式收到地砖左半边，不另造一张和公式无关的六格表。
 * 敌方仍用右侧三格。日服非镜像公式把怪排在同一高度，还会走出右缘，所以不替换这三格。
 */

/**
 * map01_F 高 1280、原点在画面中心。柱廊平台大约从 y=120 往上。
 * 我方和怪都站在棕色地砖上，不把怪放到柱廊上。
 */
export const IDLE_FLOOR_TOP = 120;

/** 日服挂机层。底左角，和项目设计分辨率同一套 640×1280。 */
export const HANG_LAYER_W = 640;
export const HANG_LAYER_H = 1280;

/**
 * 没有阵位时占的三格，也是战报只有顺序下标时的三格。
 * 日服公式按阵位号分列分行：floor(位号/2) 越大越靠左，位号大于 1 时偶数高、奇数低。
 * 1 在近列中行，4 在远列高行，5 和 4 同列、在低行。三格都在左半边，没有人站到 x≥0。
 */
export const IDLE_HANG_DEFAULT_POSITIONS = [1, 4, 5] as const;

/**
 * 左队收进金环左边。掉落堆心在 x≈0，图标大约铺到 x=-123。
 * 锚点在脚。朝右的骨架会向左伸出大约 120–180，远列停在 -260 时最左会裁出 640 的左缘。
 * 近列 -120、远列 -220，4/5 号落在中间（-170）。列和行的相对关系不变，身体留在地砖里。
 * 可见宽小于 640 时再由 hangAllyVisibleShift 把整列右移，不改这张表。
 * 三行收在柱廊下沿和金环上沿之间，低行的脚不踩进掉落堆。
 */
const ALLY_LANE_NEAR_X = -120;
const ALLY_LANE_FAR_X = -220;
const ALLY_LANE_LOW_Y = -36;
const ALLY_LANE_HIGH_Y = 84;

export interface HangSpot {
  x: number;
  y: number;
  face: -1 | 1;
}

/**
 * 日服 BattleUtils.getHangHeroPosition。
 * index 是 heroSrcData.position。isMirror 为真是我方（左），为假是敌方（右）。
 * 返回层的底左角坐标，还不是画面中心。
 */
export function jpHangHeroPosition(
  index: number,
  layerWidth: number,
  layerHeight: number,
  isMirror: boolean
): { x: number; y: number } {
  const width = layerWidth > 0 && isFinite(layerWidth) ? layerWidth : 0;
  const height = layerHeight > 0 && isFinite(layerHeight) ? layerHeight : 0;
  const bgH = height * 0.9;
  const centerX = width * 0.5;
  const slot = wholeIndex(index);
  let offsetX = 0;
  let offsetY = 0;
  if (isMirror) {
    const baseX = width * 0.22;
    offsetX = -baseX * (1 + Math.floor(slot / 2)) * 1.1;
    if (slot > 1) offsetY = bgH * 0.2 * (slot % 2 === 0 ? 1 : -1);
  } else {
    const baseX = width * 0.1;
    offsetX = baseX + slot * (width * 0.15);
  }
  return {
    x: centerX + offsetX + (isMirror ? width * 0.2 : 0),
    y: bgH * 0.5 + offsetY - 20,
  };
}

/**
 * 阵位号落到挂机地砖。画面中心是原点。
 * 日服底左角先减去层的一半。低行会落进底栏金环，列距也会把 4、5 号推出左缘，
 * 所以按公式的列、行比例收进左半边地砖，不改哪一号跟哪一号同列、谁高谁低。
 * 人朝右。x 保持为负，y 不超过地砖上沿。
 */
export function hangAllyFloorPoint(position: number): HangSpot {
  const slot = wholeIndex(position);
  const raw = hangCenterPoint(slot, true);
  const near = hangCenterPoint(1, true);
  const far = hangCenterPoint(9, true);
  const low = hangCenterPoint(3, true);
  const high = hangCenterPoint(2, true);
  let x = Math.round(lerp(near.x, far.x, ALLY_LANE_NEAR_X, ALLY_LANE_FAR_X, raw.x));
  let y = Math.round(lerp(low.y, high.y, ALLY_LANE_LOW_Y, ALLY_LANE_HIGH_Y, raw.y));
  if (!(x < 0) || x > ALLY_LANE_NEAR_X) x = ALLY_LANE_NEAR_X;
  if (x < ALLY_LANE_FAR_X) x = ALLY_LANE_FAR_X;
  if (y > IDLE_FLOOR_TOP) y = IDLE_FLOOR_TOP;
  if (y < ALLY_LANE_LOW_Y) y = ALLY_LANE_LOW_Y;
  return { x, y, face: 1 };
}

/**
 * 阵位号原样用。没有阵位时按顺序补 1、4、5，避开已经占了的号。
 * used 由调用方带着，避免两只人叠在同一格。
 */
export function hangLinePosition(position: number | null, order: number, used: number[]): number {
  if (typeof position === "number" && isFinite(position) && position >= 1) {
    const n = Math.floor(position);
    used.push(n);
    return n;
  }
  const start = isFinite(order) && order >= 0 ? Math.floor(order) : 0;
  for (let step = 0; step < IDLE_HANG_DEFAULT_POSITIONS.length; step++) {
    const candidate = IDLE_HANG_DEFAULT_POSITIONS[(start + step) % IDLE_HANG_DEFAULT_POSITIONS.length];
    if (used.indexOf(candidate) < 0) {
      used.push(candidate);
      return candidate;
    }
  }
  let extra = IDLE_HANG_DEFAULT_POSITIONS.length + 1;
  while (used.indexOf(extra) >= 0) extra += 1;
  used.push(extra);
  return extra;
}

/** 默认三格：阵位 1、4、5。战报条只有顺序下标时也站这三格。 */
export const IDLE_HANG_SPOTS: ReadonlyArray<HangSpot> = [
  hangAllyFloorPoint(IDLE_HANG_DEFAULT_POSITIONS[0]),
  hangAllyFloorPoint(IDLE_HANG_DEFAULT_POSITIONS[1]),
  hangAllyFloorPoint(IDLE_HANG_DEFAULT_POSITIONS[2]),
];

/** 右侧地砖。三格都朝左对着我方。入场从格子再往右滑进来，不落到我方阵上。 */
export const IDLE_SKIRMISH_SPOTS: ReadonlyArray<HangSpot> = [
  { x: 230, y: -20, face: -1 },
  { x: 300, y: 36, face: -1 },
  { x: 260, y: 84, face: -1 },
];

/**
 * 演武条和战报格子只有顺序下标。我方 0、1、2 是默认阵位 1、4、5，不是 BattlePage 槽，也不是把下标当成阵位号。
 * 知道阵位号时用 hangAllyFloorPoint。敌方下标仍是右侧三格。
 */
export function hangStandPoint(side: "ally" | "enemy", index: number): HangSpot {
  const spots = side === "enemy" ? IDLE_SKIRMISH_SPOTS : IDLE_HANG_SPOTS;
  const i = index < 0 || !isFinite(index) ? 0 : Math.floor(index);
  const n = i % spots.length;
  return spots[n < 0 ? n + spots.length : n];
}

/**
 * 窄屏按 Fit Height 裁掉 640 左右两边。远列按 640 摆时会再被裁一截。
 * 返回整列要右移的距离。宽屏和正好 640 不挪，避免把左列拉到中线。
 * 9:16 的可视宽仍约 720，大于设计宽，也不挪。
 */
export function hangAllyVisibleShift(layerWidth: number): number {
  const width = layerWidth > 0 && isFinite(layerWidth) ? layerWidth : HANG_LAYER_W;
  if (width >= HANG_LAYER_W - 0.5) return 0;
  return (HANG_LAYER_W - width) / 2;
}

function hangCenterPoint(index: number, isMirror: boolean): { x: number; y: number } {
  const jp = jpHangHeroPosition(index, HANG_LAYER_W, HANG_LAYER_H, isMirror);
  return { x: jp.x - HANG_LAYER_W / 2, y: jp.y - HANG_LAYER_H / 2 };
}

function lerp(from: number, to: number, outFrom: number, outTo: number, value: number): number {
  const span = to - from;
  if (span === 0) return outFrom;
  return outFrom + ((value - from) / span) * (outTo - outFrom);
}

function wholeIndex(index: number): number {
  if (!isFinite(index)) return 0;
  return Math.floor(index);
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

export interface HangFightMonster {
  heroType: number;
  hp: number | null;
  name: string;
}

export interface HangFightReportHero {
  heroId: number | null;
  hp: number | null;
  maxHp: number | null;
}

export interface HangFightFoe {
  stem: string;
  spot: number;
  face: -1 | 1;
  maxHp: number | null;
  name: string;
}

export interface HangFightLine {
  stageId: number | null;
  source: "report" | "chapter" | "none";
  reason: string;
  foes: HangFightFoe[];
}

/**
 * 开战用的关卡号。
 * 真服没有 now/max 时返回 null，不用第 1 关冒充未同步。
 * Mock 没有关号时仍是 1，和演武同一张 chapter 表。
 */
export function hangFightStageId(
  mockStage: number | null,
  nowIdx: number | null,
  maxIdx: number | null,
  wire: boolean
): number | null {
  if (!wire && mockStage !== null && mockStage >= 1) return Math.floor(mockStage);
  if (nowIdx !== null && nowIdx >= 1) return Math.floor(nowIdx);
  if (maxIdx !== null && maxIdx >= 1) return Math.floor(maxIdx);
  if (wire) return null;
  return 1;
}

/**
 * 开战右侧的怪。战报守方优先，对不上 stand 再读 chapter。
 * 不补演武 fallback，也不补默认三套。空表、未同步、没有 stand 都留空，调用方打日志。
 */
export function planHangFightLine(
  stageId: number | null,
  monsters: HangFightMonster[],
  hasStand: (stem: string) => boolean,
  reportHeroes: HangFightReportHero[] | null
): HangFightLine {
  const fromReport = foesFromReport(reportHeroes, hasStand);
  if (fromReport.foes.length > 0) {
    return { stageId, source: "report", reason: fromReport.reason, foes: fromReport.foes };
  }
  const prefix = fromReport.reason ? fromReport.reason + "，" : "";
  if (stageId === null) {
    return { stageId: null, source: "none", reason: prefix + "主线未同步", foes: [] };
  }
  const rows = monsters || [];
  if (rows.length === 0) {
    return { stageId, source: "none", reason: prefix + "第" + stageId + "关守方表是空的", foes: [] };
  }
  const missed: string[] = [];
  const foes: HangFightFoe[] = [];
  for (let i = 0; i < rows.length && foes.length < IDLE_SKIRMISH_SPOTS.length; i++) {
    const row = rows[i];
    const type = row.heroType;
    if (typeof type !== "number" || !isFinite(type) || type <= 0) continue;
    const stem = String(Math.floor(type));
    if (!hasStand(stem)) {
      missed.push(stem);
      continue;
    }
    const spot = IDLE_SKIRMISH_SPOTS[foes.length];
    const hp = row.hp;
    foes.push({
      stem,
      spot: foes.length,
      face: spot.face,
      maxHp: typeof hp === "number" && isFinite(hp) && hp > 0 ? Math.floor(hp) : null,
      name: row.name || "类型 " + stem,
    });
  }
  if (foes.length === 0) {
    const tail = missed.length > 0 ? "守方没有 stand " + missed.join(",") : "守方没有可用类型";
    return { stageId, source: "none", reason: prefix + "第" + stageId + "关" + tail, foes: [] };
  }
  const names: string[] = [];
  for (let i = 0; i < foes.length; i++) names.push(foes[i].stem);
  return {
    stageId,
    source: "chapter",
    reason: prefix + "第" + stageId + "关 " + names.join(","),
    foes,
  };
}

function foesFromReport(
  heroes: HangFightReportHero[] | null,
  hasStand: (stem: string) => boolean
): { reason: string; foes: HangFightFoe[] } {
  if (!heroes) return { reason: "", foes: [] };
  if (heroes.length === 0) return { reason: "战报没有守方", foes: [] };
  const missed: string[] = [];
  const foes: HangFightFoe[] = [];
  for (let i = 0; i < heroes.length && foes.length < IDLE_SKIRMISH_SPOTS.length; i++) {
    const hero = heroes[i];
    const id = hero.heroId;
    if (typeof id !== "number" || !isFinite(id) || id <= 0) continue;
    const stem = String(Math.floor(id));
    if (!hasStand(stem)) {
      missed.push(stem);
      continue;
    }
    const spot = IDLE_SKIRMISH_SPOTS[foes.length];
    const maxHp = hero.maxHp;
    const hp = hero.hp;
    const shown = typeof maxHp === "number" && isFinite(maxHp) && maxHp > 0 ? Math.floor(maxHp) : typeof hp === "number" && isFinite(hp) && hp > 0 ? Math.floor(hp) : null;
    foes.push({
      stem,
      spot: foes.length,
      face: spot.face,
      maxHp: shown,
      name: "类型 " + stem,
    });
  }
  if (foes.length === 0) {
    const tail = missed.length > 0 ? missed.join(",") : "没有 hero_id";
    return { reason: "战报守方对不上 stand " + tail, foes: [] };
  }
  const names: string[] = [];
  for (let i = 0; i < foes.length; i++) names.push(foes[i].stem);
  return { reason: "战报守方 " + names.join(","), foes };
}
