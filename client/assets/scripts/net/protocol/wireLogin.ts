/**
 * 只编码 net-20261020.jsonl 里能对上的 c2s 1001 / 1002。
 * 字段号是从包体反解出来的，不是 .proto 里的名字。两例登录都出现的常量照写，不猜平台 OAuth。
 *
 * c2s 1001（两例，uid 和字段5不同）：
 *   字段1 varint = 7
 *   字段2 varint = 平台 uid（111 与 960011）
 *   字段3 varint = 2
 *   字段5 string = 十进制 unix 秒（1792464901 与 1792466798）
 *   字段6 string = localdev
 *   字段7 string = mxzg-web-1001
 * 空的 s2c 1001 之后客户端才发 1002。成功的 s2c 1001：字段1 角色 id，字段2 毫秒时间，字段4 = 28800。
 *
 * c2s 1002：
 *   字段1 string = 角色名（日志里是「见习冒险家」）
 *   字段2 varint = 0
 *   字段3 varint = 2
 *   字段4 string = local
 *   字段5 string = mxzg-web-1001
 * s2c 1002 字段1 = 新角色 id。
 */
import { NetMessage } from "../NetTypes";
import { Cmd } from "./cmds";
import { bytesToHex, encodeFrame, WireCmd } from "./frame";

const LOGIN_FIELD1 = 7;
const LOGIN_FIELD3 = 2;
const LOGIN_DEVICE = "localdev";
const LOGIN_CHANNEL = "mxzg-web-1001";
const CREATE_FIELD2 = 0;
const CREATE_FIELD3 = 2;
const CREATE_PLACE = "local";

export interface ProtoField {
  field: number;
  kind: "varint" | "string" | "bytes";
  varint?: number;
  text?: string;
  hex?: string;
}

export interface WireInbound {
  cmdId: number;
  frameLength: number;
  body: Uint8Array;
  hex: string;
}

export interface WirePacket {
  cmdId: number;
  bytes: Uint8Array;
  note: string;
}

export interface LoginReplySummary {
  empty: boolean;
  roleId: number | null;
  status: string;
  detail: string;
}

export function uidFromAccount(account: string): number | null {
  const text = (account || "").trim();
  if (!/^[1-9][0-9]{0,9}$/.test(text)) return null;
  const n = Number(text);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}

/** 字段顺序与日志第二例（uid 960011）一致，便于对字节。没有 uid 时省掉字段2。 */
export function encodeObservedLoginBody(uid: number | null, nowSec: number): Uint8Array {
  const parts: number[] = [];
  pushString(parts, 5, String(Math.floor(nowSec)));
  if (uid !== null) pushVarintField(parts, 2, uid);
  pushVarintField(parts, 1, LOGIN_FIELD1);
  pushVarintField(parts, 3, LOGIN_FIELD3);
  pushString(parts, 7, LOGIN_CHANNEL);
  pushString(parts, 6, LOGIN_DEVICE);
  return Uint8Array.from(parts);
}

export function encodeObservedCreateBody(name: string): Uint8Array | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const parts: number[] = [];
  pushString(parts, 1, trimmed);
  pushVarintField(parts, 2, CREATE_FIELD2);
  pushVarintField(parts, 3, CREATE_FIELD3);
  pushString(parts, 4, CREATE_PLACE);
  pushString(parts, 5, LOGIN_CHANNEL);
  return Uint8Array.from(parts);
}

/**
 * 把 NetClient 的明文 cmd 编成线上帧。
 * heartbeat → 1004 空体。login → 1001。role.create → 1002。
 * 别的 cmd 返回 null，调用方不得把占位包写到线上。
 */
export function encodeWireMessage(msg: NetMessage): WirePacket | null {
  const cmd = msg && msg.cmd ? msg.cmd : "";
  if (cmd === Cmd.heartbeat) {
    return {
      cmdId: WireCmd.heartbeat,
      bytes: encodeFrame(WireCmd.heartbeat),
      note: "空体",
    };
  }
  if (cmd === Cmd.login) {
    const uid = readUid(msg.data);
    const nowSec = readNowSec(msg.data);
    const body = encodeObservedLoginBody(uid, nowSec);
    const uidNote = uid === null ? "字段2未写" : "字段2=" + uid;
    return {
      cmdId: WireCmd.login,
      bytes: encodeFrame(WireCmd.login, body),
      note:
        "字段1=" +
        LOGIN_FIELD1 +
        " " +
        uidNote +
        " 字段3=" +
        LOGIN_FIELD3 +
        " 字段5=" +
        Math.floor(nowSec) +
        " 字段6=" +
        LOGIN_DEVICE +
        " 字段7=" +
        LOGIN_CHANNEL,
    };
  }
  if (cmd === Cmd.roleCreate) {
    const name = readName(msg.data);
    const body = encodeObservedCreateBody(name);
    if (!body) return null;
    return {
      cmdId: WireCmd.roleCreate,
      bytes: encodeFrame(WireCmd.roleCreate, body),
      note: "字段1名字 字段2=0 字段3=2 字段4=" + CREATE_PLACE + " 字段5=" + LOGIN_CHANNEL,
    };
  }
  return null;
}

export function decodeProtoFields(body: Uint8Array): ProtoField[] | null {
  const fields: ProtoField[] = [];
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
      if (!len || i < 0) return null;
      i = len.next;
      if (len.value < 0 || i + len.value > body.length) return null;
      const blob = body.slice(i, i + len.value);
      i += len.value;
      const text = decodeUtf8(blob);
      if (text !== null) fields.push({ field, kind: "string", text });
      else fields.push({ field, kind: "bytes", hex: bytesToHex(blob, 24) });
      continue;
    }
    return null;
  }
  return fields;
}

export function varintField(fields: ProtoField[] | null, field: number): number | null {
  if (!fields) return null;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === field && row.kind === "varint" && typeof row.varint === "number") return row.varint;
  }
  return null;
}

export function formatProtoFields(fields: ProtoField[]): string {
  const parts: string[] = [];
  for (let i = 0; i < fields.length && i < 8; i++) {
    const row = fields[i];
    if (row.kind === "varint") parts.push("字段" + row.field + "=" + row.varint);
    else if (row.kind === "string") parts.push("字段" + row.field + "=" + row.text);
    else parts.push("字段" + row.field + "=" + row.hex);
  }
  if (fields.length > 8) parts.push("…");
  return parts.join(" ");
}

export function wireBody(data: unknown): Uint8Array {
  if (data && typeof data === "object") {
    const body = (data as { body?: unknown }).body;
    if (body instanceof Uint8Array) return body;
  }
  return new Uint8Array(0);
}

export function summarizeLoginReply(body: Uint8Array): LoginReplySummary {
  if (body.length === 0) {
    return {
      empty: true,
      roleId: null,
      status: "登录回包是空的",
      detail: "日志里空的 1001 表示还没有角色。点创角发 1002。不进主城。",
    };
  }
  const fields = decodeProtoFields(body);
  const roleId = varintField(fields, 1);
  const time = varintField(fields, 2);
  const tz = varintField(fields, 4);
  const bits: string[] = ["体长 " + body.length];
  if (roleId !== null) bits.push("字段1=" + roleId);
  if (time !== null) bits.push("字段2=" + time);
  if (tz !== null) bits.push("字段4=" + tz);
  bits.push("不进主城");
  return {
    empty: false,
    roleId,
    status: roleId !== null ? "登录回包 角色 " + roleId : "登录回包 1001",
    detail: bits.join(" "),
  };
}

export function summarizeCreateReply(body: Uint8Array): { roleId: number | null; status: string } {
  const roleId = varintField(decodeProtoFields(body), 1);
  if (roleId === null) return { roleId: null, status: "创角回包 1002 体长 " + body.length };
  return { roleId, status: "创角回包 角色 " + roleId };
}

function readUid(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as { uid?: unknown; account?: unknown };
  if (typeof raw.uid === "number" && Number.isSafeInteger(raw.uid) && raw.uid > 0) return raw.uid;
  if (typeof raw.account === "string") return uidFromAccount(raw.account);
  return null;
}

function readNowSec(data: unknown): number {
  if (data && typeof data === "object") {
    const nowSec = (data as { nowSec?: unknown }).nowSec;
    if (typeof nowSec === "number" && Number.isFinite(nowSec)) return Math.floor(nowSec);
  }
  return Math.floor(Date.now() / 1000);
}

function readName(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const name = (data as { name?: unknown }).name;
  return typeof name === "string" ? name : "";
}

function pushVarintField(parts: number[], field: number, value: number): void {
  pushVarint(parts, (field << 3) | 0);
  pushVarint(parts, value);
}

function pushString(parts: number[], field: number, text: string): void {
  const bytes = utf8(text);
  pushVarint(parts, (field << 3) | 2);
  pushVarint(parts, bytes.length);
  for (let i = 0; i < bytes.length; i++) parts.push(bytes[i]);
}

function pushVarint(parts: number[], value: number): void {
  let n = Math.floor(value);
  if (n < 0) n = 0;
  while (n > 127) {
    parts.push((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  parts.push(n);
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

function utf8(text: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text);
  const parts: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (next - 0xdc00);
        i += 1;
      }
    }
    if (c < 0x80) parts.push(c);
    else if (c < 0x800) parts.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0x10000) parts.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else parts.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return Uint8Array.from(parts);
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    if (typeof TextDecoder !== "undefined") {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return text;
    }
  } catch (_err) {
    return null;
  }
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
      i += 1;
      continue;
    }
    return null;
  }
  return out;
}
