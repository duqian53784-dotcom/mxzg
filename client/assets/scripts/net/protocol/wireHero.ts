/**
 * 真服英雄只读。仓库里没有 Hero.proto。
 * 字段号按 net-20261020 两例完整解开的 s2c 18001 反解，不是占位 hero.list。
 *
 * GReq 侧没有字段名。c2s 18001 没有包体。整帧 04 00 00 00 51 46 00 00。
 * 进主城时由 WireSession.pullIdle 在空 c2s 15000 之后发出。
 * Boot 仍是 pullRoleProfile → pullChapter → pullIdle，所以不改 Boot.ts。
 * 线上顺序是 2001 → 5001 → 3007 → 3004 → 15000 → 18001。
 * 已合的 2001、5001、3007、3004、15000 相对顺序不变。
 * 旧客户端的 18001 在 20001 之后。这里不发 20001，也不发升级。
 * 占位 hero.list / hero.upgrade 仍是 1401 / 1402。
 *
 * s2c 18001（完整解开的两例，包体 129 与 132 字节，各 3 名）：
 * - 外层字段 1 varint。两例都是 3。只记日志，不当成名册长度。
 * - 外层字段 2 varint。两例都是 1000，和 s2c 2001 字段 5 的奖杯相同。不写金币。
 * - 外层字段 3 repeated 英雄。空包体 = 已同步的空名册。日志里没有空包样本。
 * - 外层字段 4 varint。两例都是 1792944000。只记日志。
 * - 外层字段 6 varint。两例都是 0。只记日志。
 * - 英雄里：1 id、2 名字、3 数字、4 空子消息、6 数字、7 数字、9 数字、10 数字、11 数字。
 * 两例字段 3 都是 0，字段 4 都是空子消息，字段 6 都是 8，字段 9 都是 1000。
 * 没有 Hero.proto，不把这些写成等级或星级。字段 4 不展示。字段 9 和奖杯同一个数，详情按字段号写，不进钱包。
 * 第三例包体 156 字节，这台环境没有原始字节，不把没走过的形状写成样本。
 *
 * 钱包只认 s2c 2001 的金币和宝石。这里不写 Session.gold / diamond，也不升级。
 */

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.heroList。 */
export const WIRE_HERO_CMD = "wire.18001";

export const WIRE_HERO_READONLY_TITLE = "英雄（真服只读）";
export const WIRE_HERO_EMPTY = "空名册";
export const WIRE_HERO_UNSYNCED_TOAST = "真服英雄未同步";
export const WIRE_HERO_READONLY_NOTE = "只读。不升级，不写金币";
export const WIRE_HERO_FIELD_NOTE = "等级星级未解。只展示解开的字段号";

export interface WireHeroEntry {
  /** 英雄字段 1。没有时是 null。 */
  id: number | null;
  /** 英雄字段 2。解不开或没有时是 null。 */
  name: string | null;
  /** 英雄字段 3。两例都是 0。不是等级。 */
  mark3: number | null;
  /** 英雄字段 6。两例都是 8。不是等级。 */
  mark6: number | null;
  /** 英雄字段 7。两例是 10203003 这类数。不是星级。 */
  mark7: number | null;
  /** 英雄字段 9。两例都是 1000。和奖杯同一个数，不写金币。 */
  mark9: number | null;
  /** 英雄字段 10。两例各人不同。 */
  mark10: number | null;
  /** 英雄字段 11。两例都是 0。 */
  mark11: number | null;
}

export interface WireHeroList {
  entries: WireHeroEntry[];
  /** 外层字段 1。只记日志。 */
  outer1: number | null;
  /** 外层字段 2。只记日志。不写金币。 */
  outer2: number | null;
  /** 外层字段 4。只记日志。 */
  outer4: number | null;
  /** 外层字段 6。只记日志。 */
  outer6: number | null;
}

const MAX_BODY = 65536;

/**
 * 解 s2c 18001。空包体返回空名册，不返回 null。
 * 超长、坏 varint、有英雄包但一名都解不开、或非空却没有英雄时返回 null。
 * 调用方保持上一次，不要把未同步标成已同步。
 */
export function decodeWireHeroList(body: Uint8Array | null | undefined): WireHeroList | null {
  if (!body) return null;
  if (body.length === 0) return emptyList();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const parsed: WireHeroEntry[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== 3 || row.kind !== "bytes" || !row.bytes) continue;
    blobs += 1;
    const entry = decodeHeroEntry(row.bytes);
    if (!entry) continue;
    parsed.push(entry);
  }
  if (blobs === 0 || parsed.length === 0) return null;
  return {
    entries: parsed,
    outer1: nonNegativeVarint(fields, 1),
    outer2: nonNegativeVarint(fields, 2),
    outer4: nonNegativeVarint(fields, 4),
    outer6: nonNegativeVarint(fields, 6),
  };
}

/** 有名字就用名字。没有就写无名，有 id 时带上。字段 10 有数才写在行上。 */
export function formatWireHeroLine(entry: WireHeroEntry): string {
  const named = (entry.name || "").trim();
  let text = named || "无名";
  if (entry.id !== null) text += " · id " + entry.id;
  if (entry.mark10 !== null) text += " · 字段10 " + entry.mark10;
  return text;
}

/** 详情只写解开的号。字段 4 的空子消息不写。不写等级、星级、升级。 */
export function formatWireHeroDetail(entry: WireHeroEntry): string[] {
  const named = (entry.name || "").trim();
  const lines = [named ? "名字 " + named : "名字未解", entry.id !== null ? "id " + entry.id : "id 未解"];
  pushMark(lines, 3, entry.mark3);
  pushMark(lines, 6, entry.mark6);
  pushMark(lines, 7, entry.mark7);
  pushMark(lines, 9, entry.mark9);
  pushMark(lines, 10, entry.mark10);
  pushMark(lines, 11, entry.mark11);
  return lines;
}

export function wireHeroNote(list: WireHeroList): string {
  const entries = list.entries;
  if (entries.length === 0) return "空名册。不写金币";
  const parts: string[] = [];
  const n = Math.min(entries.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireHeroLine(entries[i]));
  if (entries.length > n) parts.push("其余 " + (entries.length - n) + " 名");
  return (
    entries.length +
    " 名 " +
    parts.join("；") +
    "。外层字段1=" +
    markText(list.outer1) +
    " 字段2=" +
    markText(list.outer2) +
    " 字段4=" +
    markText(list.outer4) +
    " 字段6=" +
    markText(list.outer6) +
    "。等级星级未解，不升级，不写金币"
  );
}

function emptyList(): WireHeroList {
  return { entries: [], outer1: null, outer2: null, outer4: null, outer6: null };
}

function pushMark(lines: string[], field: number, value: number | null): void {
  if (value === null) return;
  lines.push("字段" + field + " " + value);
}

function markText(value: number | null): string {
  return value === null ? "无" : String(value);
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function decodeHeroEntry(body: Uint8Array): WireHeroEntry | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const id = nonNegativeVarint(fields, 1);
  const name = utf8Field(fields, 2);
  const named = name !== null && name.trim().length > 0;
  if (id === null && !named) return null;
  return {
    id,
    name,
    mark3: nonNegativeVarint(fields, 3),
    mark6: nonNegativeVarint(fields, 6),
    mark7: nonNegativeVarint(fields, 7),
    mark9: nonNegativeVarint(fields, 9),
    mark10: nonNegativeVarint(fields, 10),
    mark11: nonNegativeVarint(fields, 11),
  };
}

function utf8Field(fields: RawField[], field: number): string | null {
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== field || row.kind !== "bytes" || !row.bytes) continue;
    return decodeUtf8(row.bytes);
  }
  return null;
}

function nonNegativeVarint(fields: RawField[], field: number): number | null {
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== field || row.kind !== "varint" || typeof row.varint !== "number") continue;
    if (!isFinite(row.varint) || row.varint < 0) continue;
    return Math.floor(row.varint);
  }
  return null;
}

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

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
  } catch (_err) {
    return null;
  }
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] >= 0x80) return null;
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}
