import { BagTabKind, itemBagTab, itemIconResource, itemIsWallet, itemProfile } from "../../config/gameCatalog";
import { StoreBagItem } from "../../core/GameStore";
import { formatStoreBagLine } from "./bagView";
import { plainTalk } from "../../ui/idleHangTalkPlan";

/** language 5788。店员那句，不另写文案。 */
const BAG_SHOP_LAN = "5788";
const BAG_SHOP_FALLBACK = "欢迎光临～";

export const BAG_COLS = 4;
/** 与 screenFill.fillBag 同一套。格子 96，缝约 22。日服设计宽 pitch 约 129，118 仍能露出第 5 行大半。 */
export const BAG_PITCH_X = 118;
export const BAG_PITCH_Y = 118;
export const BAG_MIN_ROWS = 5;
export const BAG_ORIGIN_X = -177;
export const BAG_ORIGIN_Y = -56;

export const BAG_TABS: { id: BagTabKind; title: string }[] = [
  { id: "equip", title: "装备" },
  { id: "item", title: "道具" },
  { id: "shard", title: "碎片" },
  { id: "spirit", title: "精灵" },
];

export interface BagFace {
  title: string;
  typeLine: string;
  body: string;
  icon: string;
  fallback: string;
  frame: string;
}

/**
 * null 是背包还没同步，调用方不要画成空背包。
 * 空数组是已同步但这一页没有格子。数量小于等于 0 的不进格子。金币钻石不进格子。
 */
export function rowsForBagTab(items: StoreBagItem[] | null, tab: BagTabKind): StoreBagItem[] | null {
  if (!items) return null;
  const rows: StoreBagItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.num !== null && item.num <= 0) continue;
    if (itemIsWallet(item.itemType, item.itemId)) continue;
    if (itemBagTab(item.itemType, item.itemId) !== tab) continue;
    rows.push(item);
  }
  return rows;
}

export function sameBagItem(a: StoreBagItem, b: StoreBagItem): boolean {
  return a.itemId === b.itemId && a.itemType === b.itemType;
}

/** 至少 5 行。多出来的行按 4 列补满。 */
export function bagSlotCount(count: number): number {
  const filled = Math.max(count, BAG_COLS * BAG_MIN_ROWS);
  const rows = Math.max(BAG_MIN_ROWS, Math.ceil(filled / BAG_COLS));
  return rows * BAG_COLS;
}

export function bagSlotPosition(index: number): { x: number; y: number } {
  return {
    x: BAG_ORIGIN_X + (index % BAG_COLS) * BAG_PITCH_X,
    y: BAG_ORIGIN_Y - Math.floor(index / BAG_COLS) * BAG_PITCH_Y,
  };
}

export function bagContentHeight(slots: number): number {
  const rows = Math.max(BAG_MIN_ROWS, Math.ceil(Math.max(slots, 1) / BAG_COLS));
  return Math.max(400, rows * BAG_PITCH_Y + 24);
}

export function bagTabTitle(tab: BagTabKind): string {
  for (let i = 0; i < BAG_TABS.length; i++) {
    if (BAG_TABS[i].id === tab) return BAG_TABS[i].title;
  }
  return "道具";
}

/** 详情文案。对不上表时不把缺的数写成 0。 */
export function describeBagItem(item: StoreBagItem): BagFace {
  const profile = itemProfile(item.itemType, item.itemId);
  const raw = formatStoreBagLine(item);
  const tab = itemBagTab(item.itemType, item.itemId);
  if (!profile) {
    return {
      icon: item.itemId ? "ui/bag/backpack_" + item.itemId : "ui/bag/backpack_spr-default",
      fallback: "ui/bag/backpack_spr-default",
      frame: "ui/bag/backpack_item-frame-1",
      title: "道具",
      typeLine: raw,
      body: "对不上表。缺的数不写成 0。",
    };
  }
  const count = item.num === null ? "数量 无" : "数量 " + item.num;
  const rare = profile.rare > 0 ? "  稀有 " + profile.rare : "";
  return {
    icon: profile.icon || itemIconResource(item.itemType, item.itemId) || "ui/bag/backpack_spr-default",
    fallback: "ui/bag/backpack_spr-default",
    frame: rareFrame(profile.rare),
    title: profile.name || "道具",
    typeLine: "类型：" + bagTabTitle(tab) + "  " + count + rare,
    body: profile.blurb || " ",
  };
}

export function bagShopGreeting(rows: { key?: unknown; value?: unknown }[] | null): string {
  const list = rows || [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (row.key === undefined || String(row.key) !== BAG_SHOP_LAN) continue;
    const text = plainTalk(typeof row.value === "string" ? row.value : "");
    if (text) return text;
  }
  return BAG_SHOP_FALLBACK;
}

function rareFrame(rare: number): string {
  if (rare === 2 || rare === 3 || rare === 4) return "ui/bag/backpack_spr-rare-" + rare;
  return "ui/bag/backpack_item-frame-1";
}
