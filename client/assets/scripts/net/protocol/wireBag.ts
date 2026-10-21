/**
 * 真服背包只读。字段号按已收口的对照，不是占位 bag.list。
 *
 * GReqBackPackList（c2s 5001）没有字段。整帧 04 00 00 00 89 13 00 00。
 * 进主城时由 WireSession.pullRoleProfile 在空 c2s 2001 之后立刻发出，
 * 然后 Boot 里原有的 pullChapter / pullIdle 仍是 3007、3004。
 * 线上顺序是 2001 → 5001 → 3007 → 3004。不改 Boot.ts。
 * 已合的 2001、3007、3004 相对顺序不变。旧客户端的 5001 也在 3007 前。
 * 不发 5010，也不发 5004–5009、5011–5013。
 *
 * GResBackPackList（s2c 5001）：
 * - 空包体 = 已同步的空背包。界面写「空背包」，不要当成还没同步。
 * - 字段 1 repeated ResBackPackItem：1 item_id、2 item_type、3 num。
 * net-20261020 没有非空 5001 样本，嵌套格子按这三件字段解。
 *
 * GResBackpackGain（s2c 5002）登录窗可能没有：
 * - 字段 1 varint type，只打日志，不弹窗，不决定加减。
 * - 字段 2 repeated ResBackPackItem。num > 0 加到同 item_id + item_type；num = 0 删掉该格。
 * 5001 是整表替换。5002 只在已经收到过 5001 之后合并。列表之前的 5002 丢掉。
 *
 * 钱包只认 s2c 2001 的金币和宝石。这里不写 Session.gold / diamond，也不写顶栏。
 * 50000 仍只记日志。占位 bag.list / bag.use 仍是 1601 / 1602。
 * 客户端还没有道具配置表。没有名字时行上写类型和 id。
 */
import { decodeProtoFields, ProtoField } from "./wireLogin";

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.backpackList。 */
export const WIRE_BAG_CMD = "wire.5001";
/** s2c。客户端不发。数字号是 WireCmd.backpackGain。 */
export const WIRE_BAG_GAIN_CMD = "wire.5002";

export const WIRE_BAG_READONLY_TITLE = "背包（真服只读）";
export const WIRE_BAG_EMPTY = "空背包";
export const WIRE_BAG_UNSYNCED_TOAST = "真服背包未同步";
export const WIRE_BAG_READONLY_NOTE = "只读。不使用，不写金币";

export interface WireBagItem {
  /** 字段 1 item_id。 */
  itemId: number;
  /** 字段 2 item_type。 */
  itemType: number;
  /** 字段 3 num。快照里 0 不进列表。5002 里 0 表示删掉该格。 */
  num: number;
}

export interface WireBagList {
  items: WireBagItem[];
}

export interface WireBagGain {
  /** 字段 1。没有这个字段时是 null。只打日志。 */
  type: number | null;
  items: WireBagItem[];
}

const MAX_BODY = 65536;

/**
 * 解 s2c 5001。空包体返回空列表，不返回 null。
 * 超长、坏 varint、字段 1 有包但一格都解不开时返回 null，调用方保持上一次。
 */
export function decodeWireBagList(body: Uint8Array | null | undefined): WireBagList | null {
  if (!body) return null;
  if (body.length === 0) return { items: [] };
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const parsed: WireBagItem[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== 1 || row.kind !== "bytes" || !row.bytes) continue;
    blobs += 1;
    const item = decodeBagItem(row.bytes);
    if (!item) continue;
    parsed.push(item);
  }
  if (blobs > 0 && parsed.length === 0) return null;
  return { items: replaceWireBagList(parsed) };
}

/**
 * 解 s2c 5002。空包体当成没有变更。
 * 坏包、字段 2 有包但一格都解不开时返回 null。
 */
export function decodeWireBagGain(body: Uint8Array | null | undefined): WireBagGain | null {
  if (!body) return null;
  if (body.length === 0) return { type: null, items: [] };
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  let type: number | null = null;
  const items: WireBagItem[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && type === null && typeof row.varint === "number") {
      type = row.varint;
      continue;
    }
    if (row.field !== 2 || row.kind !== "bytes" || !row.bytes) continue;
    blobs += 1;
    const item = decodeBagItem(row.bytes);
    if (!item) continue;
    items.push(item);
  }
  if (blobs > 0 && items.length === 0) return null;
  if (type === null && items.length === 0) return null;
  return { type, items };
}

/** 5001 整表。同 id + 类型后来的覆盖。num <= 0 的格子不留。 */
export function replaceWireBagList(items: readonly WireBagItem[]): WireBagItem[] {
  const out: WireBagItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const idx = findBagItem(out, item.itemId, item.itemType);
    if (item.num <= 0) {
      if (idx >= 0) out.splice(idx, 1);
      continue;
    }
    const next = copyItem(item);
    if (idx >= 0) out[idx] = next;
    else out.push(next);
  }
  return out;
}

/**
 * 5002 合并。num > 0 加到已有数量，没有就新增。
 * num = 0 删掉同 id + 类型。负数加完 <= 0 也删，解不出负数时不会走到。
 */
export function applyWireBagGain(list: readonly WireBagItem[], gain: WireBagGain): WireBagItem[] {
  const out = list.map(copyItem);
  for (let i = 0; i < gain.items.length; i++) {
    const delta = gain.items[i];
    const idx = findBagItem(out, delta.itemId, delta.itemType);
    if (delta.num === 0) {
      if (idx >= 0) out.splice(idx, 1);
      continue;
    }
    if (idx < 0) {
      if (delta.num > 0) out.push(copyItem(delta));
      continue;
    }
    const sum = out[idx].num + delta.num;
    if (sum <= 0) out.splice(idx, 1);
    else out[idx] = { itemId: delta.itemId, itemType: delta.itemType, num: sum };
  }
  return out;
}

/** 有配置名就用名字。没有就写类型和 id。数量都带上。 */
export function formatWireBagLine(item: WireBagItem, name?: string | null): string {
  const qty = "×" + item.num;
  const named = (name || "").trim();
  if (named) return named + " " + qty;
  return "类型 " + item.itemType + " · id " + item.itemId + " " + qty;
}

/** 道具配置还没进客户端。只读页因此始终走类型和 id。 */
export function wireBagItemName(_item: WireBagItem): string | null {
  return null;
}

export function wireBagNote(items: readonly WireBagItem[]): string {
  if (items.length === 0) return "空背包";
  const parts: string[] = [];
  const n = Math.min(items.length, 8);
  for (let i = 0; i < n; i++) parts.push(formatWireBagLine(items[i], wireBagItemName(items[i])));
  if (items.length > n) parts.push("其余 " + (items.length - n) + " 件");
  return items.length + " 件 " + parts.join("；");
}

export function wireBagGainNote(gain: WireBagGain): string {
  const typeText = gain.type === null ? "无" : String(gain.type);
  return "type " + typeText + "，合并 " + gain.items.length + " 条，顶栏不改";
}

export function findBagItem(items: readonly WireBagItem[], itemId: number, itemType: number): number {
  for (let i = 0; i < items.length; i++) {
    if (items[i].itemId === itemId && items[i].itemType === itemType) return i;
  }
  return -1;
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function decodeBagItem(body: Uint8Array): WireBagItem | null {
  let fields: ProtoField[] | null = null;
  try {
    fields = decodeProtoFields(body);
  } catch (_err) {
    return null;
  }
  if (!fields) return null;
  const itemId = nonNegativeVarint(fields, 1);
  const itemType = nonNegativeVarint(fields, 2);
  const num = nonNegativeVarint(fields, 3);
  if (itemId === null || itemType === null || num === null) return null;
  return { itemId, itemType, num };
}

function nonNegativeVarint(fields: ProtoField[], field: number): number | null {
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== field || row.kind !== "varint" || typeof row.varint !== "number") continue;
    if (!isFinite(row.varint) || row.varint < 0) continue;
    return Math.floor(row.varint);
  }
  return null;
}

/**
 * 顶层字段。length-delimited 保留原始字节，不先改成字符串。
 * 嵌套的 ResBackPackItem 经常是合法 UTF-8，走 decodeProtoFields 会丢掉格子。
 */
function readRawFields(body: Uint8Array): RawField[] | null {
  const fields: RawField[] = [];
  let i = 0;
  while (i < body.length) {
    const key = readVarint(body, i);
    if (!key) return null;
    const field = key.value >>> 3;
    const wt = key.value & 7;
    i = key.next;
    if (field <= 0) return null;
    if (wt === 0) {
      const val = readVarint(body, i);
      if (!val) return null;
      fields.push({ field, kind: "varint", varint: val.value });
      i = val.next;
      continue;
    }
    if (wt === 2) {
      const len = readVarint(body, i);
      if (!len) return null;
      i = len.next;
      if (len.value < 0 || i + len.value > body.length) return null;
      const blob = body.slice(i, i + len.value);
      i += len.value;
      fields.push({ field, kind: "bytes", bytes: blob });
      continue;
    }
    return null;
  }
  return fields;
}

function readVarint(body: Uint8Array, offset: number): { value: number; next: number } | null {
  let value = 0;
  let shift = 0;
  let i = offset;
  while (i < body.length && shift <= 49) {
    const b = body[i];
    i += 1;
    value += (b & 0x7f) * Math.pow(2, shift);
    if ((b & 0x80) === 0) {
      if (!Number.isSafeInteger(value)) return null;
      return { value, next: i };
    }
    shift += 7;
  }
  return null;
}

function copyItem(item: WireBagItem): WireBagItem {
  return { itemId: item.itemId, itemType: item.itemType, num: item.num };
}
