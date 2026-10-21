/**
 * 挂机奖励时间。字段号按 Battle.proto 的 GResChapterItemList（cmd 3004）
 * 和 GResChapterItemReward（cmd 3005）。
 *
 * 旧客户端在进游戏同步里，空 c2s 3007 之后还会发空的 c2s 3004
 * （GReqChapterItemList 没有字段，整帧 04 00 00 00 bc 0b 00 00）。
 * 本客户端在进主城、空 c2s 2001 和空 c2s 3007 之后发这一帧，不等 s2c 2001。
 * 不把 51001 夹在 2001 和 3004 中间。51001 由 pullIdle 在空 c2s 74100 之后发一次。20001 接在 51001 之后，20012 接在 20001 之后，70001 接在 20012 之后，73001 接在 70001 之后，74300 接在 73001 之后，68001 接在 74300 之后，也不夹在这里。仍不发 11005、58017，也不发 3002 / 3010 / 3012。
 * 点挂机页的领取才发空的 c2s 3005（整帧 04 00 00 00 bd 0b 00 00）。
 *
 * net-20261020 没有单独摘出的 s2c 3004 / 3005 包体，所以不把某一串十六进制写成样本。
 * 字段号只按 .proto：
 * - 3004 字段 1 reward_time：上一次领取资源时间。和 3007 字段 1 同一类。
 *   大于等于 10 亿时当成 unix 秒，用来推「已挂机」。更小的数（含 0）是包里的原值，
 *   不当成时间戳，时长不从本机时钟推。
 * - 3004 字段 2 max_reward_time：最大挂机时间。小于 10 亿时当成秒数上限，0 是包里的 0。
 *   大于等于 10 亿时只把原数记下来，不当成「已挂机」的分母。
 * - 3005 字段 1 reward_time：上一次领取资源的时间。有这个字段就改记下的领取时间。
 * 两包都没有道具列表。不写金币，不写强化石，不用 Mock 的每分钟公式。
 */
import { formatDuration } from "../../module/idle/rewards";
import { decodeProtoFields, ProtoField } from "./wireLogin";

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.chapterItemList。 */
export const WIRE_IDLE_CMD = "wire.3004";
/** 领取。数字号是 WireCmd.chapterItemReward。 */
export const WIRE_IDLE_CLAIM_CMD = "wire.3005";

/** 2001-09-09 附近的 unix 秒。比这小的 int32 更像时长，不像「上次领取」。 */
export const IDLE_UNIX_FLOOR = 1000000000;

export interface WireIdleSnapshot {
  /** 字段 1 reward_time。没有这个字段时是 null。0 表示服上就是 0。 */
  rewardTime: number | null;
  /** 字段 2 max_reward_time。没有这个字段时是 null。0 表示服上就是 0。 */
  maxRewardTime: number | null;
}

export interface WireIdleClaim {
  /** 字段 1。没有这个字段时是 null。 */
  rewardTime: number | null;
}

export interface WireIdleView {
  /** 对照 Mock 挂机页的「已挂机 时:分:秒 / 上限」。推不出来时是「已挂机 未同步」。 */
  duration: string;
  /** 最大挂机时间。秒数上限写成时:分:秒；像时间戳的原数照写。 */
  cap: string;
  /** 上次领取。 */
  last: string;
  /** 这一包能展示的预览。没有道具列表时说明不写金币。 */
  preview: string;
  /** 已挂机被秒数上限截断。 */
  capped: boolean;
}

const MAX_BODY = 8192;

/**
 * 解 s2c 3004。解不开、超长、空包都返回 null，不抛。
 * 包能解开但两个时间都没有时，两个值都是 null。
 */
export function decodeWireIdle(body: Uint8Array | null | undefined): WireIdleSnapshot | null {
  const fields = readFields(body);
  if (!fields) return null;
  return {
    rewardTime: nonNegativeVarint(fields, 1),
    maxRewardTime: nonNegativeVarint(fields, 2),
  };
}

/** 解 s2c 3005。只读字段 1。别的字段不写成奖励。 */
export function decodeWireIdleClaim(body: Uint8Array | null | undefined): WireIdleClaim | null {
  const fields = readFields(body);
  if (!fields) return null;
  return { rewardTime: nonNegativeVarint(fields, 1) };
}

export function wireIdleHasTime(snapshot: WireIdleSnapshot): boolean {
  return snapshot.rewardTime !== null || snapshot.maxRewardTime !== null;
}

/** 只列出这一包带上的时间。没出现的字段不写「未同步」。 */
export function wireIdleNote(snapshot: WireIdleSnapshot): string {
  const bits: string[] = [];
  if (snapshot.rewardTime !== null) bits.push("上次领取 " + snapshot.rewardTime);
  if (snapshot.maxRewardTime !== null) bits.push("最大挂机 " + snapshot.maxRewardTime);
  if (bits.length === 0) return "挂机 没有可展示的时间";
  return "挂机 " + bits.join(" ");
}

export function wireIdleClaimNote(claim: WireIdleClaim): string {
  if (claim.rewardTime === null) return "没有 reward_time，金币不改";
  return "上次领取 " + claim.rewardTime + "，金币不改";
}

/**
 * 挂机页上的三行。nowSec 是调用方的 unix 秒，方便测试固定时钟。
 * 奖励预览不套 Mock 的金币和强化石公式。
 */
export function formatWireIdle(snapshot: WireIdleSnapshot, nowSec: number): WireIdleView {
  const reward = snapshot.rewardTime;
  const max = snapshot.maxRewardTime;
  const rewardUnix = reward !== null && reward >= IDLE_UNIX_FLOOR;
  const maxDuration = max !== null && max < IDLE_UNIX_FLOOR ? max : null;
  let elapsed = 0;
  let capped = false;
  if (rewardUnix && reward !== null) {
    elapsed = finiteSec(nowSec) - reward;
    if (elapsed < 0) elapsed = 0;
    if (maxDuration !== null && elapsed > maxDuration) {
      elapsed = maxDuration;
      capped = true;
    }
  }
  const capClock = maxDuration !== null ? formatDuration(maxDuration * 1000) : null;
  const duration = rewardUnix
    ? "已挂机 " + formatDuration(elapsed * 1000) + " / " + (capClock !== null ? capClock : "上限未同步")
    : "已挂机 未同步";
  let cap: string;
  if (max === null) cap = "最大挂机 未同步";
  else if (max >= IDLE_UNIX_FLOOR) cap = "最大挂机 " + max + "（像时间戳，不当成秒数上限）";
  else cap = "最大挂机 " + formatDuration(max * 1000);
  let last: string;
  if (reward === null) last = "上次领取 未同步";
  else if (!rewardUnix) last = "上次领取 " + reward + "（不是可用的时间戳，时长不推）";
  else last = "上次领取 " + reward;
  return {
    duration,
    cap,
    last,
    preview: "这一包没有奖励清单。不写金币，不写强化石",
    capped,
  };
}

function readFields(body: Uint8Array | null | undefined): ProtoField[] | null {
  if (!body || body.length === 0 || body.length > MAX_BODY) return null;
  try {
    return decodeProtoFields(body);
  } catch (_err) {
    return null;
  }
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

function finiteSec(nowSec: number): number {
  if (typeof nowSec !== "number" || !isFinite(nowSec)) return 0;
  return Math.floor(nowSec);
}
