/**
 * 图鉴、圣龙、星UP、宝石、神装，以及挂机底栏的每分钟收益。
 * 旧 Lua 不在仓库里。数字来自已导出的 JSON。
 * chapterreward.reward_base 是当前关每分钟的三项：900001 金币、900003 角色经验、900101 英雄经验。
 * 底栏 lbl_gold / lbl_exp / lbl_souls 旁边的图就是这三样。
 * system.idle_max_time 是秒，基础封顶。VIP 的 extra_idle_time 这里不加。
 * 随机掉落仍是 drop_group，每隔 idle_drop_frequency 秒掷一次，不写进这三格。
 */
import { ConfigTableFile } from "./types";

type Row = Record<string, unknown>;
type Table = ConfigTableFile<Row> | undefined;

export interface IdleMinute {
  stageIdx: number;
  gold: number;
  roleExp: number;
  heroExp: number;
}

export interface StarStep {
  star: number;
  levelLimit: number;
  attackShow: number;
  hpShow: number;
  cost: CostStack[];
}

export interface CostStack {
  itemType: number;
  num: number;
}

export interface SacrificeNeed {
  type: number;
  elem: number;
  star: number;
  num: number;
}

export interface JewelFace {
  id: number;
  place: number;
  rare: number;
  star: number;
}

export interface GodGearFace {
  id: number;
  place: number;
  rare: number;
  star: number;
  name: string;
}

export interface DragonFace {
  name: string;
  level: number;
  portrait: string;
}

export interface RelicFace {
  kind: number;
  rare: number;
  name: string;
  feature: string;
  icon: string;
  stages: { id: number; star: number }[];
}

const GOLD = 900001;
const ROLE_EXP = 900003;
const HERO_EXP = 900101;

const idleByIdx = new Map<number, IdleMinute>();
let idleMaxMs: number | null = null;
let heroSpace = 300;
const starSteps = new Map<number, StarStep>();
const sacrifices = new Map<string, SacrificeNeed[]>();
const jewels: JewelFace[] = [];
const gears: GodGearFace[] = [];
const dragons: DragonFace[] = [];
const relics: RelicFace[] = [];

export function clearRosterCatalog(): void {
  idleByIdx.clear();
  idleMaxMs = null;
  heroSpace = 300;
  starSteps.clear();
  sacrifices.clear();
  jewels.length = 0;
  gears.length = 0;
  dragons.length = 0;
  relics.length = 0;
}

export function bindRosterCatalog(tables: Map<string, ConfigTableFile<Row>>): void {
  clearRosterCatalog();
  const text = languageMap(tables.get("language"));
  bindIdle(tables.get("chapterreward"));
  bindSystem(tables.get("system"));
  bindStars(tables.get("herostar"));
  bindSacrifices(tables.get("herotype"));
  bindJewels(tables.get("jeweltype"));
  bindGears(tables.get("godequipment"));
  bindDragons(tables.get("dragonlevel"), text);
  bindRelics(tables.get("dragonrelic"), tables.get("item"), text);
}

/** 当前关的每分钟收益。表还没登记时是 null，调用方留原来的句子。 */
export function chapterIdleMinute(stageIdx: number): IdleMinute | null {
  if (idleByIdx.size === 0) return null;
  let idx = Math.floor(stageIdx);
  if (!isFinite(stageIdx) || idx < 1) idx = 1;
  const exact = idleByIdx.get(idx);
  if (exact) return copyMinute(exact);
  let best = 0;
  let lower = 0;
  idleByIdx.forEach((_row, key) => {
    if (key > best) best = key;
    if (key <= idx && key > lower) lower = key;
  });
  const pick = idx > best ? best : lower || best;
  const row = idleByIdx.get(pick);
  return row ? copyMinute(row) : null;
}

/** system.idle_max_time，毫秒。表上没有这一项时是 null。 */
export function idleCapMs(): number | null {
  return idleMaxMs;
}

/** system.hero_space_initial。没读到表时是 300，和旧底栏「空间 n/300」一致。 */
export function heroSpaceCap(): number {
  return heroSpace;
}

export function heroStarStep(star: number | null | undefined): StarStep | null {
  const key = whole(star);
  if (key === null) return null;
  const row = starSteps.get(key);
  return row ? { star: row.star, levelLimit: row.levelLimit, attackShow: row.attackShow, hpShow: row.hpShow, cost: row.cost.slice() } : null;
}

/** herotype.to_N_star。N 是升上去的那一星。没有这条是空数组。 */
export function heroStarNeeds(heroType: number | null | undefined, targetStar: number | null | undefined): SacrificeNeed[] {
  const type = whole(heroType);
  const star = whole(targetStar);
  if (type === null || star === null) return [];
  const row = sacrifices.get(type + ":" + star);
  return row ? row.slice() : [];
}

export function listJewels(place: number): JewelFace[] {
  const out: JewelFace[] = [];
  for (let i = 0; i < jewels.length; i++) {
    if (place === 0 || jewels[i].place === place) out.push(jewels[i]);
  }
  return out;
}

export function listGodGears(place: number): GodGearFace[] {
  const out: GodGearFace[] = [];
  for (let i = 0; i < gears.length; i++) {
    if (place === 0 || gears[i].place === place) out.push(gears[i]);
  }
  return out;
}

export function listDragons(): DragonFace[] {
  return dragons.slice();
}

export function listRelics(): RelicFace[] {
  return relics.slice();
}

function bindIdle(table: Table): void {
  for (const row of rows(table)) {
    const idx = num(row.idx);
    if (idx === null || idx < 1) continue;
    const stacks = parseStacks(row.reward_base);
    idleByIdx.set(idx, {
      stageIdx: idx,
      gold: stackNum(stacks, GOLD),
      roleExp: stackNum(stacks, ROLE_EXP),
      heroExp: stackNum(stacks, HERO_EXP),
    });
  }
}

function bindSystem(table: Table): void {
  for (const row of rows(table)) {
    if (row.key === "idle_max_time") {
      const sec = num(row.value);
      if (sec !== null && sec > 0) idleMaxMs = sec * 1000;
    } else if (row.key === "hero_space_initial") {
      const cap = num(row.value);
      if (cap !== null && cap > 0) heroSpace = cap;
    }
  }
}

function bindStars(table: Table): void {
  for (const row of rows(table)) {
    const star = num(row.star);
    const levelLimit = num(row.level_limit);
    if (star === null || levelLimit === null) continue;
    starSteps.set(star, {
      star,
      levelLimit,
      attackShow: num(row.attack_show) ?? 0,
      hpShow: num(row.hp_show) ?? 0,
      cost: parseStacks(row.upstar_cost),
    });
  }
}

function bindSacrifices(table: Table): void {
  for (const row of rows(table)) {
    const type = num(row.type);
    if (type === null) continue;
    for (let star = 5; star <= 14; star++) {
      const needs = parseNeeds(row["to_" + star + "_star"]);
      if (needs.length > 0) sacrifices.set(type + ":" + star, needs);
    }
  }
}

function bindJewels(table: Table): void {
  for (const row of rows(table)) {
    const id = num(row.jewel_type);
    const place = num(row.place);
    if (id === null || place === null) continue;
    jewels.push({
      id,
      place,
      rare: num(row.rare) ?? 0,
      star: num(row.star) ?? 0,
    });
  }
}

function bindGears(table: Table): void {
  for (const row of rows(table)) {
    const id = num(row.equipment_type);
    const place = num(row.place);
    if (id === null || place === null) continue;
    const note = typeof row.description === "string" ? row.description.trim() : "";
    gears.push({
      id,
      place,
      rare: num(row.rare) ?? 0,
      star: num(row.star) ?? 0,
      name: note,
    });
  }
}

function bindDragons(table: Table, text: Map<string, string>): void {
  const seen = new Set<string>();
  let portrait = 1;
  for (const row of rows(table)) {
    const nameKey = num(row.name);
    const name = nameKey === null ? "" : text.get(String(nameKey)) || "";
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const level = num(row.level);
    dragons.push({
      name,
      level: level === null || level < 1 ? 1 : level,
      portrait: "ui/dragon/dragon_identify-" + portrait,
    });
    portrait += 1;
  }
}

function bindRelics(table: Table, items: Table, text: Map<string, string>): void {
  const names = new Map<number, string>();
  for (const row of rows(items)) {
    const idx = num(row.idx);
    const nameKey = num(row.name);
    if (idx === null || nameKey === null) continue;
    const name = text.get(String(nameKey)) || "";
    if (name) names.set(idx, name);
  }
  const byKind = new Map<number, RelicFace>();
  for (const row of rows(table)) {
    const id = num(row.relic_type);
    const kind = num(row.kind);
    const star = num(row.star);
    if (id === null || kind === null || star === null) continue;
    let face = byKind.get(kind);
    if (!face) {
      const featureKey = num(row.features);
      const feature = featureKey === null ? "" : plain(text.get(String(featureKey)) || "");
      face = {
        kind,
        rare: num(row.rare) ?? 0,
        name: names.get(id) || "圣物 " + id,
        feature,
        icon: "ui/bag/backpack_" + id,
        stages: [],
      };
      byKind.set(kind, face);
      relics.push(face);
    }
    face.stages.push({ id, star });
    if (star === 1) {
      face.rare = num(row.rare) ?? face.rare;
      face.icon = "ui/bag/backpack_" + id;
      const named = names.get(id);
      if (named) face.name = named;
    }
  }
}

function copyMinute(row: IdleMinute): IdleMinute {
  return { stageIdx: row.stageIdx, gold: row.gold, roleExp: row.roleExp, heroExp: row.heroExp };
}

function stackNum(stacks: CostStack[], itemType: number): number {
  for (let i = 0; i < stacks.length; i++) {
    if (stacks[i].itemType === itemType) return stacks[i].num;
  }
  return 0;
}

function parseStacks(value: unknown): CostStack[] {
  const list = parseJsonArray(value);
  const out: CostStack[] = [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const itemType = num(row.item_type);
    const count = num(row.item_num);
    if (itemType === null || count === null || count < 0) continue;
    out.push({ itemType, num: count });
  }
  return out;
}

function parseNeeds(value: unknown): SacrificeNeed[] {
  const list = parseJsonArray(value);
  const out: SacrificeNeed[] = [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const type = num(row.type);
    const elem = num(row.elem);
    const star = num(row.star);
    const count = num(row.num);
    if (type === null || elem === null || star === null || count === null || count <= 0) continue;
    out.push({ type, elem, star, num: count });
  }
  return out;
}

function parseJsonArray(value: unknown): Row[] {
  if (typeof value !== "string" || !value.trim() || value.trim() === "[]") return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const out: Row[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i];
      if (row && typeof row === "object") out.push(row as Row);
    }
    return out;
  } catch (_err) {
    return [];
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

function plain(value: string): string {
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
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

function whole(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  return Math.floor(value);
}
