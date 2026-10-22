/**
 * 真服主线进战。c2s / s2c 都是 3001。
 * c2s 是 GReqBattleMatch，没有字段。整帧 04 00 00 00 b9 0b 00 00，即 04000000b90b0000。
 * 3001 = 0x0BB9，小端是 b9 0b 00 00。
 * 服侧 BattleHandler.challenge：读 RoleMission.chapterId，打 chapterId+1，invokePVEBattle(BattleType.MAIN)。
 * 3007 的 max_idx 就是 chapterId。须先有 3007。3101 若登录链已经拉过，这里不重发。
 *
 * 不进 pullIdle，不接在活动链末（不接 76251 后面），不夹活动号。
 * 主线页「挑战」才发。Boot.ts 不改。
 * 胜则服写 receiveReward / chapterId / missionRankTime，并记战斗日志。
 * 已有未领通关奖时服可能另走 3002 发 first_reward。本端不发 3002。
 * Handler 内未见扣体力。胜（战报字段 2 = 1）后再拉一次已有的空 c2s 3007 刷新，不是登录链加发。
 *
 * 不发领奖写 3002、3005、3008、3011、3013。
 * 不发 3100、3097、3098、18002、18001。
 * 不重发已挂的 3007（登录链）、3004、3099、3101、3203。
 * 硬禁 4601、29001。
 * 不把 Mock 1201 / 1202 当这帧战报。不写金币，不写钻石。不回落 Mock。不接 spine。
 *
 * s2c 是 GResBattleMatch。report 是字段 1，length-delimited 的 BattleReport。
 * 仓库没有 BattleReport 的字段表。字段 2 出现 0 或 1 时当作胜负：1 胜，0 负。
 * 没有字段 2 不写成 0，不判胜，不回拉 3007。其它号按字段号留在 marks。
 * 空包体是已同步空表，report 保持缺省。有 report 才用 planBattle 色块回放。
 */
import { BattlePlan, planBattle } from "../../module/mainline/battle";

const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.battleMatch。 */
export const WIRE_BATTLE_MATCH_CMD = "wire.3001";

export const WIRE_BATTLE_MATCH_FRAME = "04000000b90b0000";

/** GResBattleMatch.report。声明顺序第 1 个字段。 */
export const WIRE_BATTLE_REPORT_FIELD = 1;

/**
 * BattleReport 里用来判胜负的 bool。
 * 没有 Battle.proto 全文时只认这一个号：出现的 0 仍是负，出现的 1 仍是胜。
 * 没出现不写成 0。
 */
export const WIRE_BATTLE_WIN_FIELD = 2;

export const WIRE_BATTLE_EMPTY = "已同步空表";
export const WIRE_BATTLE_UNSYNCED_TOAST = "真服未同步";
export const WIRE_BATTLE_NO_REPORT = "没有 report";

export const WIRE_BATTLE_MATCH_NOTE =
  "挑战发空 c2s 3001（GReqBattleMatch，整帧 04000000b90b0000）。须已有 3007 的 idx。3101 已有则不重发。有 report 用 planBattle 色块回放，不接 spine。不发 3002、3005、3008、3011、3013、3100、3097、3098、18002、18001。不重发 3004、3099、3203。硬禁 4601、29001。不把 Mock 1201/1202 当战报。缺字段不写成 0。空包体是已同步空表。未同步 Toast「真服未同步」。不回落 Mock。不写金币，不写钻石。不夹活动号。不进 pullIdle。不改 Boot";

export const WIRE_BATTLE_MATCH_SIDE_EFFECT =
  "服侧胜则写 receiveReward、chapterId、missionRankTime 和战斗日志。已有未领通关奖可能另推 3002 first_reward，本端不发 3002。Handler 内未见扣体力。胜后只再拉已有的空 c2s 3007。不进活动链";

export interface WireBattleMark {
  field: number;
  text: string;
}

export interface WireBattleReport {
  /** 字段 2。没有时是 null，不写成 false。 */
  win: boolean | null;
  marks: WireBattleMark[];
}

export interface WireBattleMatch {
  /** 空包体。report 保持缺省。 */
  empty: boolean;
  /** 字段 1。没有时是 null。 */
  report: WireBattleReport | null;
  /** 外层对不上 report 的号。 */
  marks: WireBattleMark[];
}

/**
 * 解 s2c 3001。空包体返回已同步空表。
 * 超长、坏 varint、report 有包但解不开时返回 null，调用方保持上一次。
 */
export function decodeWireBattleMatch(body: Uint8Array | null | undefined): WireBattleMatch | null {
  if (!body) return null;
  if (body.length === 0) return { empty: true, report: null, marks: [] };
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireBattleMark[] = [];
  let report: WireBattleReport | null = null;
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === WIRE_BATTLE_REPORT_FIELD && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeReport(row.bytes);
      if (!parsed) continue;
      report = parsed;
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && !report) return null;
  return { empty: false, report, marks };
}

/** 3007 max_idx 是 chapterId，进战是 chapterId+1。没有 max 时才看 now，不把缺的 max 写成 0。 */
export function wireMainlineFightStage(nowIdx: number | null, maxIdx: number | null): number | null {
  if (typeof maxIdx === "number" && isFinite(maxIdx) && maxIdx >= 0) return Math.floor(maxIdx) + 1;
  if (typeof nowIdx === "number" && isFinite(nowIdx) && nowIdx >= 1) return Math.floor(nowIdx);
  if (nowIdx === 0) return 1;
  return null;
}

export function formatWireFightLine(nowIdx: number | null, maxIdx: number | null): string {
  const stage = wireMainlineFightStage(nowIdx, maxIdx);
  if (stage === null) return "进战 idx 未同步";
  return "进战 idx " + stage;
}

export function formatWireBattleMatch(snap: WireBattleMatch): string {
  if (snap.empty) return WIRE_BATTLE_EMPTY;
  if (!snap.report) return joinMarks(WIRE_BATTLE_NO_REPORT, snap.marks);
  const win = snap.report.win === null ? "胜负未带" : snap.report.win ? "胜" : "负";
  return joinMarks("report " + win, snap.report.marks.concat(snap.marks));
}

/**
 * 有 report 才播。胜负未带时只播 planBattle 的第 1 回合，不把缺的胜负播成胜利。
 * 已知胜负时走现有四回合色块，不读 spine。
 */
export function planWireReportReplay(stageId: number, win: boolean | null, roleName: string): BattlePlan {
  if (win === true) return planBattle({ stageId, level: stageId, roleName, forced: "win" });
  if (win === false) return planBattle({ stageId, level: stageId, roleName, forced: "lose" });
  const pending = planBattle({ stageId, level: stageId, roleName, forced: "win" });
  return {
    stageId: pending.stageId,
    level: pending.level,
    win: false,
    reason: "clear",
    rounds: [pending.rounds[0]],
  };
}

function decodeReport(body: Uint8Array): WireBattleReport | null {
  if (body.length === 0) return { win: null, marks: [] };
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireBattleMark[] = [];
  let win: boolean | null = null;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === WIRE_BATTLE_WIN_FIELD && row.kind === "varint") {
      if (row.varint === 1) {
        win = true;
        continue;
      }
      if (row.varint === 0) {
        win = false;
        continue;
      }
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  return { win, marks };
}

function joinMarks(line: string, marks: WireBattleMark[]): string {
  if (marks.length === 0) return line;
  const parts: string[] = [];
  const n = Math.min(marks.length, 6);
  for (let i = 0; i < n; i++) parts.push("字段" + marks[i].field + "=" + marks[i].text);
  if (marks.length > n) parts.push("其余 " + (marks.length - n) + " 项");
  return line + " / " + parts.join(" / ");
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function markOf(row: RawField): WireBattleMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint)) {
    if (row.varint === -1) return { field: row.field, text: "-1" };
    if (row.varint >= 0) return { field: row.field, text: String(Math.floor(row.varint)) };
  }
  if (row.kind === "bytes" && row.bytes) {
    if (row.bytes.length === 0) return { field: row.field, text: "空" };
    return { field: row.field, text: "包" + row.bytes.length };
  }
  return { field: row.field, text: "未解" };
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
  while (i < body.length && shift <= 63) {
    const b = body[i];
    i += 1;
    value += (b & 0x7f) * Math.pow(2, shift);
    if ((b & 0x80) === 0) {
      if (isProtoInt64Neg1(body, offset, i)) return { value: -1, next: i };
      if (!Number.isSafeInteger(value) || value < 0) return null;
      return { value, next: i };
    }
    shift += 7;
  }
  return null;
}

function isProtoInt64Neg1(body: Uint8Array, start: number, end: number): boolean {
  if (end - start !== 10) return false;
  for (let i = 0; i < 9; i++) {
    if (body[start + i] !== 0xff) return false;
  }
  return body[start + 9] === 0x01;
}
