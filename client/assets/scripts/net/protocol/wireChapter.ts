/**
 * 登录后的主线关卡进度。字段号按 Battle.proto 的 GResChapterData（cmd 3007）。
 *
 * 旧客户端在进游戏的同步里发空的 c2s 3007（整帧 04 00 00 00 bf 0b 00 00）。
 * net-20261020.jsonl 三例都在空 c2s 2001 和对应的 s2c 2001 之后发出，
 * 夹在 c2s 58017 和 c2s 3004 中间。这一文件只解 3007。空 c2s 3004 在 wireIdle.ts，
 * 跟在 3007 后面发。3002 / 3010 / 3012 仍不发，也不补 51001、11005 那一长串。
 *
 * 三例 s2c 3007 包体都是 8 字节：
 * - c3bfce22  2026-10-20T00:00:11.775  08 f7 96 d8 d6 06 18 00
 * - d6108a92  2026-10-20T10:55:08.164  08 d0 af db d6 06 18 00
 * - 5d7c0ba6  2026-10-20T11:26:42.423  08 b6 be db d6 06 18 00
 * 字段 1 varint = res_reward_time（上次领资源的 unix 秒：1792412535 / 1792464848 / 1792466742）。不写进按钮。
 * 字段 2 now_idx 三例都没有。不写成 0。
 * 字段 3 max_idx = 0（18 00）。0 是包里的 0。
 * 字段 4 extra_reward_id 三例都没有。这一轮不读。
 *
 * 主城按钮按解开的 idx 写，不改成 Mock 的「第 N 关」，也不写 Session.stageId：
 * - 两个都没有：主线 · 未同步
 * - 只有 now_idx：主线 · 当前 N
 * - 只有 max_idx：主线 · 最高 M
 * - 两个都有：主线 · 当前 N / 最高 M
 * 数字前面有空格。日志三例是「主线 · 最高 0」。
 * 点按钮仍 Toast，不打开 Mock 关卡页。
 */
import { decodeProtoFields, ProtoField } from "./wireLogin";

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.chapterData。 */
export const WIRE_CHAPTER_CMD = "wire.3007";

export interface WireChapterProgress {
  /** 字段 2 now_idx。没有这个字段时是 null，不要当成 0。 */
  nowIdx: number | null;
  /** 字段 3 max_idx。没有这个字段时是 null。0 表示服上就是 0。 */
  maxIdx: number | null;
}

const MAX_BODY = 8192;

/**
 * 解 s2c 3007。解不开、超长、空包都返回 null，不抛。
 * 包能解开但没有 now_idx / max_idx 时，两个值都是 null。字段 1 的时间不返回。
 */
export function decodeWireChapter(body: Uint8Array | null | undefined): WireChapterProgress | null {
  if (!body || body.length === 0 || body.length > MAX_BODY) return null;
  let fields: ProtoField[] | null = null;
  try {
    fields = decodeProtoFields(body);
  } catch (_err) {
    return null;
  }
  if (!fields) return null;
  return {
    nowIdx: nonNegativeVarint(fields, 2),
    maxIdx: nonNegativeVarint(fields, 3),
  };
}

export function wireChapterHasIdx(progress: WireChapterProgress): boolean {
  return progress.nowIdx !== null || progress.maxIdx !== null;
}

/** 只列出这一包带上的 idx。没出现的字段不写「未同步」。 */
export function wireChapterNote(progress: WireChapterProgress): string {
  return "主线 " + formatWireMainline(progress.nowIdx, progress.maxIdx).replace(/^主线 · /, "");
}

/**
 * 主城「主线」按钮。当前 = 字段 2 now_idx，最高 = 字段 3 max_idx。
 * 不是 Mock 的「第 N 关」（那是下一关 stageId）。
 */
export function formatWireMainline(nowIdx: number | null, maxIdx: number | null): string {
  if (nowIdx !== null && maxIdx !== null) return "主线 · 当前 " + nowIdx + " / 最高 " + maxIdx;
  if (nowIdx !== null) return "主线 · 当前 " + nowIdx;
  if (maxIdx !== null) return "主线 · 最高 " + maxIdx;
  return "主线 · 未同步";
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
