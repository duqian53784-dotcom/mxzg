/**
 * 真服活动进度只读。c2s / s2c 都是 17000。仓库里没有这条消息的 proto。
 * 不是占位 login7.view / login7.claim / login7.advance（2201–2203）。
 *
 * c2s 没有包体。整帧 04 00 00 00 68 42 00 00。
 * 由 WireSession.pullIdle 在 c2s 4001 page=1 之后发出。Boot.ts 不改。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000。
 * 不发 18001，不发 20001。不领取，不写钱包。
 *
 * s2c 17000 只按字段号读。net-20261020 三例同形，一例包体 26 字节：
 * `08 01 10 90 fa da d6 06 1a 04 08 01 10 00 1a 04 08 02 10 00 1a 04 08 03 10 00`
 * - 外层字段 1 varint。三例都是 1。只记日志，不命名，列表不写。
 * - 外层字段 2 varint。像日界 unix 秒。列表写原数，不推开服天。
 * - 外层字段 3 repeated 子消息。三例各 3 条。
 *   - 子字段 1 varint：1 / 2 / 3。行上写「字段1=N」。
 *   - 子字段 2 varint：都是 0。行上写「字段2=0」。
 * 不写成已领或未领，也不写成七日登录。
 * 空包体是已同步的空表。日志里没有空包样本，这是和背包空包同一条规则。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.activityProgress。 */
export const WIRE_ACTIVITY_CMD = "wire.17000";

export const WIRE_ACTIVITY_READONLY_TITLE = "活动进度（真服只读）";
export const WIRE_ACTIVITY_EMPTY = "已同步空表";
export const WIRE_ACTIVITY_UNSYNCED_TOAST = "真服未同步";
export const WIRE_ACTIVITY_READONLY_NOTE = "只读。不领取，不写金币";
export const WIRE_ACTIVITY_FIELD_NOTE = "外层字段1只记日志。外层字段2写原数";

export interface WireActivityRow {
  /** 子消息字段 1。没有时是 null，不写成 0。 */
  field1: number | null;
  /** 子消息字段 2。没有时是 null，不写成 0。 */
  field2: number | null;
}

export interface WireActivitySnapshot {
  /** 外层字段 1。只记日志。 */
  field1: number | null;
  /** 外层字段 2。原数，不是开服天。 */
  field2: number | null;
  rows: WireActivityRow[];
}

/**
 * 解 s2c 17000。空包体返回空表，不返回 null。
 * 超长、坏 varint、非空却没有一条能解开的字段 3 时返回 null。
 * 调用方保持上一次，不要把未同步标成已同步。
 */
export function decodeWireActivity(body: Uint8Array | null | undefined): WireActivitySnapshot | null {
  if (!body) return null;
  if (body.length === 0) return { field1: null, field2: null, rows: [] };
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const rows: WireActivityRow[] = [];
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== 3 || row.kind !== "bytes" || !row.bytes) continue;
    blobs += 1;
    const parsed = decodeActivityRow(row.bytes);
    if (!parsed) continue;
    rows.push(parsed);
  }
  if (blobs === 0 || rows.length === 0) return null;
  return {
    field1: nonNegativeVarint(fields, 1),
    field2: nonNegativeVarint(fields, 2),
    rows,
  };
}

/** 行上只写字段号。不写已领、未领或天数。 */
export function formatWireActivityLine(row: WireActivityRow): string {
  return "字段1=" + numText(row.field1) + " / 字段2=" + numText(row.field2);
}

/** 外层字段 2 的原数。没有就不写。不换成日期，也不换成开服天。 */
export function formatWireActivityStamp(field2: number | null): string | null {
  if (field2 === null) return null;
  return "外层字段2=" + field2;
}

export function wireActivityNote(snap: WireActivitySnapshot): string {
  const head = "外层字段1=" + numText(snap.field1) + " 外层字段2=" + numText(snap.field2);
  if (snap.rows.length === 0) return "已同步空表。" + head + "。不写金币";
  const parts: string[] = [];
  const n = Math.min(snap.rows.length, 4);
  for (let i = 0; i < n; i++) parts.push(formatWireActivityLine(snap.rows[i]));
  if (snap.rows.length > n) parts.push("其余 " + (snap.rows.length - n) + " 条");
  return head + " " + parts.join("；") + "。不写金币";
}

function numText(value: number | null): string {
  return value === null ? "无" : String(value);
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function decodeActivityRow(body: Uint8Array): WireActivityRow | null {
  const fields = readRawFields(body);
  if (!fields) return null;
  const field1 = nonNegativeVarint(fields, 1);
  const field2 = nonNegativeVarint(fields, 2);
  if (field1 === null && field2 === null) return null;
  return { field1, field2 };
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
