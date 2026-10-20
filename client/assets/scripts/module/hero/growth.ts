import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import { HeroCard } from "../../net/protocol/types";

/**
 * 英雄养成（C5）。只做升级这一条线，消耗金币。
 * 星级只展示，不在这里升。属性是占位，随等级和星级算出，不另存。
 * 空名册用三名起步英雄，避免底栏点进去是空的。
 */

export const HERO_MAX_LEVEL = 10;
export const HERO_MAX_STAR = 5;

export interface HeroRosterEntry {
  id: number;
  name: string;
  level: number;
  star: number;
}

export interface HeroSeed {
  id?: number;
  name?: string;
  level?: number;
  star?: number;
}

export function starterRoster(): HeroRosterEntry[] {
  return [
    { id: 10001, name: "光耀骑士", level: 1, star: 3 },
    { id: 10002, name: "林间游侠", level: 1, star: 2 },
    { id: 10003, name: "星辉法师", level: 1, star: 1 },
  ];
}

/** 不填、空数组、或每行都无效时，退回起步三名。重复 id 留第一条。 */
export function normalizeRoster(raw: HeroSeed[] | null | undefined): HeroRosterEntry[] {
  if (!raw || raw.length === 0) return starterRoster();
  const out: HeroRosterEntry[] = [];
  const seen: { [id: number]: boolean } = {};
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row.id !== "number" || !isFinite(row.id) || row.id < 1) continue;
    const id = Math.floor(row.id);
    if (seen[id]) continue;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    seen[id] = true;
    out.push({
      id,
      name,
      level: clampLevel(row.level),
      star: clampStar(row.star),
    });
  }
  if (out.length === 0) return starterRoster();
  return out;
}

/** 未满级：Lv1→2 为 30，之后每级再 +20。满级为 0。 */
export function upgradeCost(level: number): number {
  const lv = clampLevel(level);
  if (lv >= HERO_MAX_LEVEL) return 0;
  return 30 + (lv - 1) * 20;
}

export function heroStats(level: number, star: number): { atk: number; hp: number; def: number } {
  const lv = clampLevel(level);
  const st = clampStar(star);
  return {
    atk: 40 + (lv - 1) * 12 + (st - 1) * 15,
    hp: 200 + (lv - 1) * 80 + (st - 1) * 60,
    def: 10 + (lv - 1) * 4 + (st - 1) * 5,
  };
}

export function toHeroCard(entry: HeroRosterEntry): HeroCard {
  const level = clampLevel(entry.level);
  const star = clampStar(entry.star);
  const stats = heroStats(level, star);
  return {
    id: entry.id,
    name: entry.name,
    level,
    star,
    atk: stats.atk,
    hp: stats.hp,
    def: stats.def,
    upgradeCost: upgradeCost(level),
    maxLevel: HERO_MAX_LEVEL,
  };
}

export function heroRowText(name: string, level: number, star: number): string {
  return name + "  Lv" + level + " · " + star + "星";
}

export function heroLevelText(level: number, star: number): string {
  return "Lv" + level + " · " + star + "星";
}

export function upgradeButtonText(level: number): string {
  if (level >= HERO_MAX_LEVEL) return "已满级";
  return "升级（金币 " + upgradeCost(level) + "）";
}

export function ownedGoldText(gold: number): string {
  const value = typeof gold === "number" && isFinite(gold) ? Math.floor(gold) : 0;
  return "持有金币 " + value;
}

export function upgradeToast(name: string, level: number, cost: number): string {
  const who = name || "英雄";
  const lv = typeof level === "number" && isFinite(level) ? Math.floor(level) : 1;
  const spent = typeof cost === "number" && isFinite(cost) ? Math.floor(cost) : 0;
  return who + "升至 Lv" + lv + "，消耗金币 " + spent;
}

export function goldShortToast(need: number): string {
  const value = typeof need === "number" && isFinite(need) ? Math.floor(need) : 0;
  return "金币不足，升级需要 " + value;
}

export function maxLevelToast(): string {
  return "已达最高等级";
}

export function missingHeroToast(): string {
  return "没有这名英雄";
}

export function upgradeFailToast(resp: { code?: number; needGold?: number } | null | undefined): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  if (code === ErrorCode.HERO_GOLD_SHORT) {
    const need = resp && typeof resp.needGold === "number" ? resp.needGold : 0;
    if (need > 0) return goldShortToast(need);
    return errorText(ErrorCode.HERO_GOLD_SHORT);
  }
  if (code === ErrorCode.HERO_LEVEL_MAX) return maxLevelToast();
  if (code === ErrorCode.HERO_NOT_FOUND) return missingHeroToast();
  return errorText(code);
}

/** 升级成功才把钱包写进 Session。失败不动。 */
export function applyHeroUpgrade(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
}

function clampLevel(level: number | undefined): number {
  if (typeof level !== "number" || !isFinite(level)) return 1;
  const value = Math.floor(level);
  if (value < 1) return 1;
  if (value > HERO_MAX_LEVEL) return HERO_MAX_LEVEL;
  return value;
}

function clampStar(star: number | undefined): number {
  if (typeof star !== "number" || !isFinite(star)) return 1;
  const value = Math.floor(star);
  if (value < 1) return 1;
  if (value > HERO_MAX_STAR) return HERO_MAX_STAR;
  return value;
}
