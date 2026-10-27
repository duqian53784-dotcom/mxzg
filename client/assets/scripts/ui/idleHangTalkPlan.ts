/**
 * 挂机对白只读 herotalk。句子在 language，这里不编新的。
 * 按等级筛，再用时间桶轮换，不掷随机数。
 */

export interface HeroTalkRow {
  levelMin: number;
  levelMax: number;
  lan: number;
}

/** 大约 8 秒换一句。 */
export const HANG_TALK_MS = 8000;

/**
 * 气泡中心。默认第一格是阵位 1（IDLE_HANG_SPOTS[0]），气泡底边停在地砖上沿之上。
 * other_spr-bubble-5 的尾巴在左边，所以中心放到格子右侧。
 */
export function hangTalkAnchor(spot: { x: number; y: number }, floorTop: number): { x: number; y: number } {
  return { x: spot.x + 90, y: floorTop + 78 };
}

export function hangTalkBucket(nowMs: number): number {
  if (!isFinite(nowMs) || nowMs <= 0) return 0;
  return Math.floor(nowMs / HANG_TALK_MS);
}

/** 没同步到等级时按 1 级，只留 level_min ≤ 1 的句子。 */
export function hangTalkLevel(level: number | null): number {
  if (typeof level !== "number" || !isFinite(level) || level < 1) return 1;
  return Math.floor(level);
}

export function readHeroTalkRows(file: { rows?: unknown } | null): HeroTalkRow[] {
  const rows = file && Array.isArray(file.rows) ? file.rows : [];
  const out: HeroTalkRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    if (!raw || typeof raw !== "object") continue;
    const row = raw as { level_min?: unknown; level_max?: unknown; lan?: unknown };
    const levelMin = whole(row.level_min);
    const levelMax = whole(row.level_max);
    const lan = whole(row.lan);
    if (levelMin === null || levelMax === null || lan === null) continue;
    out.push({ levelMin, levelMax, lan });
  }
  return out;
}

export function heroTalkCandidates(rows: ReadonlyArray<HeroTalkRow>, level: number | null): HeroTalkRow[] {
  const lv = hangTalkLevel(level);
  const out: HeroTalkRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (lv < row.levelMin || lv > row.levelMax) continue;
    out.push(row);
  }
  return out;
}

export function pickHeroTalkLan(rows: ReadonlyArray<HeroTalkRow>, level: number | null, bucket: number): number | null {
  const list = heroTalkCandidates(rows, level);
  if (list.length === 0) return null;
  let index = Math.floor(bucket);
  if (!isFinite(index) || index < 0) index = 0;
  return list[index % list.length].lan;
}

/** 去掉 font 标签。和加载提示同一条规则。 */
export function plainTalk(value: string): string {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function whole(value: unknown): number | null {
  if (typeof value === "number" && isFinite(value)) return Math.floor(value);
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return parseInt(value.trim(), 10);
  return null;
}
