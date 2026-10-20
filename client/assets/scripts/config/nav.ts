import { isEntryOpen, isServerGateOpen } from "./gates";
import { OpenConditionRow, SystemGateRow } from "./types";

/**
 * 主城底栏和「玩法」列表。
 * gateId 对齐 opencondition.id；serverGateKey 对齐 system_gate.key。
 * 都不填表示随时可进（主城、玩法目录本身）。
 */
export interface NavEntry {
  id: string;
  title: string;
  gateId?: string;
  serverGateKey?: string;
  blurb: string;
}

export const CITY_TAB = "city";

export const BOTTOM_TABS: NavEntry[] = [
  { id: "city", title: "主城", blurb: "主城" },
  { id: "hero", title: "英雄", gateId: "main_hero", blurb: "英雄列表、详情与升级" },
  { id: "summon", title: "召唤", gateId: "main_summon", blurb: "单抽与十连。新英雄进名册，重复转碎片" },
  { id: "smith", title: "铁匠铺", gateId: "main_smith_shop", blurb: "铁匠铺留到 C9" },
  { id: "plays", title: "玩法", blurb: "按主线等级或开服天开启" },
];

/** 不放底栏的系统。背包在这里，避免底栏塞不下。 */
export const PLAY_ENTRIES: NavEntry[] = [
  { id: "idle", title: "挂机", blurb: "时长、收益预览、快速作战。主城按钮也能进" },
  { id: "bag", title: "背包", gateId: "bag", blurb: "强化石、英雄碎片，以及可使用的金币袋和经验药水" },
  { id: "fetter", title: "羁绊", gateId: "main_fetter", blurb: "羁绊占位" },
  { id: "mail", title: "邮件", gateId: "mail", blurb: "系统欢迎、开服补给和公告。主城按钮也能进" },
  { id: "arena", title: "竞技场", gateId: "main_pvp", blurb: "竞技场留到 C10" },
  { id: "wish", title: "许愿池", gateId: "main_blessingpool", blurb: "许愿池占位" },
  { id: "cafe", title: "咖啡馆", gateId: "main_cafe", blurb: "咖啡馆占位" },
  { id: "daily", title: "日常副本", gateId: "main_mission", blurb: "日常副本留到 C12" },
  { id: "tower", title: "幻境之塔", gateId: "main_fantasy_tower", blurb: "幻境之塔留到 C11" },
  {
    id: "magic",
    title: "幻魔塔",
    gateId: "magic_tower",
    serverGateKey: "magic_tower_open_day",
    blurb: "幻魔塔按开服天开启",
  },
];

const BOTTOM_IDS: { [id: string]: boolean } = {};
for (let i = 0; i < BOTTOM_TABS.length; i++) BOTTOM_IDS[BOTTOM_TABS[i].id] = true;

export interface GateSnapshot {
  opencondition: OpenConditionRow[];
  systemGate: SystemGateRow[];
}

export interface EntryAccess {
  open: boolean;
  hint: string;
}

export function findNavEntry(id: string): NavEntry | null {
  for (let i = 0; i < BOTTOM_TABS.length; i++) {
    if (BOTTOM_TABS[i].id === id) return BOTTOM_TABS[i];
  }
  for (let i = 0; i < PLAY_ENTRIES.length; i++) {
    if (PLAY_ENTRIES[i].id === id) return PLAY_ENTRIES[i];
  }
  return null;
}

/**
 * 未开启时仍显示按钮。hint 给 Toast。
 * 表里没有对应 id 时当作已开启，避免样例表缺行就把入口卡死。
 * 配置还没加载、又写了 gate 时先锁上。
 */
export function entryAccess(
  entry: NavEntry,
  level: number,
  openDay: number,
  db: GateSnapshot | null
): EntryAccess {
  if (!entry.gateId && !entry.serverGateKey) return { open: true, hint: "" };
  if (!db) return { open: false, hint: entry.title + "未开启，配置未加载" };
  const reasons: string[] = [];
  let blocked = false;
  if (entry.gateId) {
    const row = findOpen(db.opencondition, entry.gateId);
    if (row && !isEntryOpen(row, level, openDay)) {
      blocked = true;
      if (row.condition_type === 1 && level < row.level) reasons.push("主线达到 Lv" + row.level);
      if (row.open_server_day > 0 && openDay < row.open_server_day) reasons.push("开服第" + row.open_server_day + "天");
    }
  }
  if (entry.serverGateKey) {
    const gate = findGate(db.systemGate, entry.serverGateKey);
    if (gate && !isServerGateOpen(gate, openDay)) {
      blocked = true;
      const text = "开服第" + gate.open_server_day + "天";
      if (reasons.indexOf(text) < 0) reasons.push(text);
    }
  }
  if (!blocked) return { open: true, hint: "" };
  if (reasons.length === 0) reasons.push("尚未达到开启条件");
  return { open: false, hint: entry.title + "未开启，需要" + reasons.join("、") };
}

export function tabLabel(title: string, open: boolean): string {
  return open ? title : "锁·" + title;
}

/** 子页面高亮它所属的底栏。日志、主线和挂机从主城进时仍算主城。英雄详情仍算英雄。 */
export function rootTabFor(pageId: string): string {
  if (BOTTOM_IDS[pageId]) return pageId;
  if (pageId === "log" || pageId === "mainline" || pageId === "idle") return CITY_TAB;
  if (pageId === "hero-detail") return "hero";
  return "plays";
}

/** 和页面栈对齐的名字栈。根是主城，不弹出。 */
export class NavHistory {
  private stack: string[] = [];

  reset(root = CITY_TAB): void {
    this.stack = [root];
  }

  get depth(): number {
    return this.stack.length;
  }

  get current(): string | null {
    if (this.stack.length === 0) return null;
    return this.stack[this.stack.length - 1];
  }

  push(id: string): void {
    if (this.current === id) return;
    this.stack.push(id);
  }

  pop(): string | null {
    if (this.stack.length <= 1) return null;
    return this.stack.pop() ?? null;
  }

  popTo(id: string): void {
    const index = this.stack.lastIndexOf(id);
    if (index < 0) {
      this.stack = [id];
      return;
    }
    this.stack.length = index + 1;
  }

  rootTab(): string {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (BOTTOM_IDS[this.stack[i]]) return this.stack[i];
    }
    const current = this.current;
    if (!current) return CITY_TAB;
    return rootTabFor(current);
  }
}

function findOpen(rows: OpenConditionRow[], id: string): OpenConditionRow | null {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].id === id) return rows[i];
  }
  return null;
}

function findGate(rows: SystemGateRow[], key: string): SystemGateRow | null {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].key === key) return rows[i];
  }
  return null;
}
