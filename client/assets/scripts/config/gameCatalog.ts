/**
 * 英雄、道具、主线关卡的展示查找。
 * Boot 读完 JSON 后由 bindConfigTables 登记。没登记时调用方保持原来的句子。
 * 不读 xlsx，不改战报里的 hp。
 */
import { ConfigTableFile } from "./types";

type Row = Record<string, unknown>;
type Table = ConfigTableFile<Row> | undefined;

export interface HeroSkillFace {
  id: number;
  name: string;
}

export interface HeroProfile {
  type: number;
  name: string;
  occupation: number | null;
  elem: number | null;
  star: number | null;
  skills: HeroSkillFace[];
}

export interface HeroBaseStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export interface ItemProfile {
  idx: number;
  name: string;
  /** resources 路径，不带扩展名。对不上贴图时是 null。 */
  icon: string | null;
}

export interface ChapterPlace {
  idx: number;
  chapterId: number;
  missionId: number;
  label: string;
}

export interface ChapterEnemy {
  heroType: number;
  pos: number | null;
  star: number | null;
  name: string;
  hp: number | null;
}

const profiles = new Map<number, HeroProfile>();
const bases = new Map<string, HeroBaseStats>();
const items = new Map<number, ItemProfile>();
const itemTypes = new Map<number, number>();
const chapters = new Map<number, ChapterPlace>();
const chapterEnemiesByIdx = new Map<number, ChapterEnemy[]>();
const levels = new Map<number, number>();

export function clearGameCatalog(): void {
  profiles.clear();
  bases.clear();
  items.clear();
  itemTypes.clear();
  chapters.clear();
  chapterEnemiesByIdx.clear();
  levels.clear();
}

/** 缺表就跳过。语言对不上的技能名写成「技能 N」，不编一句。 */
export function bindGameCatalog(tables: Map<string, ConfigTableFile<Row>>): void {
  clearGameCatalog();
  const text = languageMap(tables.get("language"));
  const skillNames = skillNameMap(tables.get("heroskill"), text);
  bindHeroProfiles(tables.get("herotype"), skillNames);
  bindBases(tables.get("herobase"));
  bindItems(tables.get("item"), text);
  bindChapters(tables.get("chapter"));
  bindLevels(tables.get("mainlevel"));
}

export function heroProfile(heroType: number | null | undefined): HeroProfile | null {
  const type = whole(heroType);
  if (type === null) return null;
  return profiles.get(type) ?? null;
}

export function heroBaseStats(heroType: number | null | undefined, star: number | null | undefined): HeroBaseStats | null {
  const type = whole(heroType);
  const starN = whole(star);
  if (type === null || starN === null) return null;
  return bases.get(type + ":" + starN) ?? null;
}

/** 先按 item_type 对 item.idx，再按 item_id。两边都对不上是 null。 */
export function itemProfile(itemType: number | null | undefined, itemId: number | null | undefined): ItemProfile | null {
  const byType = whole(itemType);
  if (byType !== null && items.has(byType)) return items.get(byType) ?? null;
  const byId = whole(itemId);
  if (byId !== null && items.has(byId)) return items.get(byId) ?? null;
  return null;
}

export function itemDisplayName(
  itemType: number | null | undefined,
  itemId: number | null | undefined,
  fallback: string
): string {
  const profile = itemProfile(itemType, itemId);
  if (profile && profile.name) return profile.name;
  return fallback;
}

/** 背包贴图在 ui/bag/backpack_<idx>。没有表内图标时是 null。 */
export function itemIconResource(itemType: number | null | undefined, itemId: number | null | undefined): string | null {
  const profile = itemProfile(itemType, itemId);
  return profile ? profile.icon : null;
}

export type BagTabKind = "equip" | "item" | "shard" | "spirit";

/** 装备 14/17/22/26，碎片 7/9，精灵 8。其余进道具。对不上表也进道具。 */
export function itemBagTab(itemType: number | null | undefined, itemId: number | null | undefined): BagTabKind {
  const type = lookupItemType(itemType, itemId);
  if (type === 14 || type === 17 || type === 22 || type === 26) return "equip";
  if (type === 7 || type === 9) return "shard";
  if (type === 8) return "spirit";
  return "item";
}

/** 金币、钻石留在顶栏，不进背包格子。 */
export function itemIsWallet(itemType: number | null | undefined, itemId: number | null | undefined): boolean {
  const type = lookupItemType(itemType, itemId);
  return type === 1 || type === 2;
}

/** chapter.idx 对上时是「第 N 章 · 第 M 关」。对不上是 null，不写成第 0 章。 */
export function chapterPlaceLabel(idx: number | null | undefined): string | null {
  const key = whole(idx);
  if (key === null || key < 1) return null;
  const place = chapters.get(key);
  return place ? place.label : null;
}

export function chapterEnemies(idx: number | null | undefined): ChapterEnemy[] {
  const key = whole(idx);
  if (key === null || key < 1) return [];
  const rows = chapterEnemiesByIdx.get(key);
  return rows ? rows.slice() : [];
}

/** mainlevel.exp。没有这一级是 null。 */
export function mainlevelExpLabel(level: number | null | undefined): string | null {
  const key = whole(level);
  if (key === null || key < 1) return null;
  const exp = levels.get(key);
  if (typeof exp !== "number") return null;
  return "等级经验 " + exp;
}

export function heroSkillText(heroType: number | null | undefined): string {
  const profile = heroProfile(heroType);
  if (!profile || profile.skills.length === 0) return "";
  const names: string[] = [];
  const n = profile.skills.length < 3 ? profile.skills.length : 3;
  for (let i = 0; i < n; i++) names.push(profile.skills[i].name);
  return names.join("/");
}

function bindHeroProfiles(table: Table, skillNames: Map<number, string>): void {
  for (const row of rows(table)) {
    const type = num(row.type);
    if (type === null) continue;
    const note = typeof row.note === "string" ? row.note.trim() : "";
    if (!note) continue;
    const skills: HeroSkillFace[] = [];
    for (let i = 1; i <= 5; i++) {
      const id = num(row["skill_" + i]);
      if (id === null || id <= 0) continue;
      skills.push({ id, name: skillNames.get(id) || "技能 " + id });
    }
    profiles.set(type, {
      type,
      name: note,
      occupation: num(row.occupation),
      elem: num(row.elem),
      star: num(row.star),
      skills,
    });
  }
}

function bindBases(table: Table): void {
  for (const row of rows(table)) {
    const type = num(row.type);
    const star = num(row.star);
    const hp = num(row.hp);
    const atk = num(row.atk);
    const def = num(row.def);
    const spd = num(row.spd);
    if (type === null || star === null || hp === null || atk === null || def === null || spd === null) continue;
    if (hp <= 0) continue;
    bases.set(type + ":" + star, { hp, atk, def, spd });
  }
}

function bindItems(table: Table, text: Map<string, string>): void {
  for (const row of rows(table)) {
    const idx = num(row.idx);
    if (idx === null || idx <= 0) continue;
    const type = num(row.type);
    if (type !== null) itemTypes.set(idx, type);
    const nameKey = num(row.name);
    const name = nameKey === null ? "" : text.get(String(nameKey)) || "";
    if (!name) continue;
    const iconField = typeof row.icon === "string" ? row.icon : "";
    const icon = iconField.indexOf("backpack/") === 0 ? "ui/bag/backpack_" + idx : null;
    items.set(idx, { idx, name, icon });
  }
}

function bindChapters(table: Table): void {
  for (const row of rows(table)) {
    const idx = num(row.idx);
    const chapterId = num(row.chapter_id);
    const missionId = num(row.mission_id);
    if (idx === null || idx < 1 || chapterId === null || missionId === null) continue;
    if (!chapters.has(idx)) {
      chapters.set(idx, {
        idx,
        chapterId,
        missionId,
        label: "第" + chapterId + "章 · 第" + missionId + "关",
      });
    }
    const heroType = num(row.hero_type);
    if (heroType === null || heroType <= 0) continue;
    const star = num(row.hero_star);
    const stats = star === null ? null : bases.get(heroType + ":" + star);
    const profile = profiles.get(heroType);
    const enemy: ChapterEnemy = {
      heroType,
      pos: num(row.pos),
      star,
      name: profile ? profile.name : "类型 " + heroType,
      hp: stats ? stats.hp : null,
    };
    const list = chapterEnemiesByIdx.get(idx) || [];
    list.push(enemy);
    chapterEnemiesByIdx.set(idx, list);
  }
}

function bindLevels(table: Table): void {
  for (const row of rows(table)) {
    const level = num(row.level);
    const exp = num(row.exp);
    if (level === null || level < 1 || exp === null || exp < 0) continue;
    levels.set(level, exp);
  }
}

function languageMap(table: Table): Map<string, string> {
  const text = new Map<string, string>();
  for (const row of rows(table)) {
    const key = row.key;
    const value = typeof row.value === "string" ? row.value.trim() : "";
    if (!value) continue;
    if (typeof key === "number" && isFinite(key)) text.set(String(Math.floor(key)), value);
    else if (typeof key === "string" && key.trim()) text.set(key.trim(), value);
  }
  return text;
}

function skillNameMap(table: Table, text: Map<string, string>): Map<number, string> {
  const chosen = new Map<number, { rank: number; name: string }>();
  for (const row of rows(table)) {
    const skillId = num(row.type);
    if (skillId === null || skillId <= 0) continue;
    const level = num(row.level);
    const rank = level === null ? 9999 : level;
    const prev = chosen.get(skillId);
    if (prev && rank >= prev.rank) continue;
    const lang = num(row.lan_name);
    const name = lang === null ? "" : text.get(String(lang)) || "";
    if (!name) continue;
    chosen.set(skillId, { rank, name });
  }
  const names = new Map<number, string>();
  chosen.forEach((item, skillId) => names.set(skillId, item.name));
  return names;
}

function rows(table: Table): Row[] {
  if (!table || !Array.isArray(table.rows)) return [];
  return table.rows;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && isFinite(value)) return Math.floor(value);
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return parseInt(value.trim(), 10);
  return null;
}

function lookupItemType(itemType: number | null | undefined, itemId: number | null | undefined): number | null {
  const byType = whole(itemType);
  if (byType !== null && itemTypes.has(byType)) return itemTypes.get(byType) ?? null;
  const byId = whole(itemId);
  if (byId !== null && itemTypes.has(byId)) return itemTypes.get(byId) ?? null;
  return null;
}

function whole(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  return Math.floor(value);
}
