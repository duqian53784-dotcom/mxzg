/**
 * 游戏服二进制帧。格式来自旧 H5 `serve.ps1` 桥的 net-20261020.jsonl，不是占位 CmdId。
 *
 * 字节 0–3：uint32 小端，值 = cmdId + 包体的长度 = 整帧长度 - 4
 * 字节 4–7：uint32 小端 cmdId
 * 字节 8…：protobuf 包体，可以是空的
 *
 * 心跳 c2s 1004 整帧 8 字节：04 00 00 00 ec 03 00 00
 * 一条 WebSocket 二进制消息里可以粘多帧（日志里出现过），半帧会留到下一条。
 * 2026-10-21 倩本机：这套帧在 TCP 9902 上会立刻回 1001。直连 13101 能握手，但同一帧没有回包。
 * 预览走 scripts/start-ws-bridge.bat（13111/game → 9902），不要把 13101 当默认地址。
 */

export const WireCmd = {
  /** c2s / s2c 登录。空回包在日志里表示还没有角色。 */
  login: 1001,
  /** c2s 创角。不是占位表里的 heartbeat 1002。 */
  roleCreate: 1002,
  /** c2s / s2c 心跳。c2s 包体为空。 */
  heartbeat: 1004,
  /** 只在 s2c 见过。字段含义未从 .proto 证实，只记录。 */
  s2c1005: 1005,
  /**
   * c2s 空体。旧桥日志里登录后客户端会发这一帧，s2c 回角色资料。
   * 不是占位表里的 tower.view（也占了数字 2001，只给 Mock）。
   */
  roleProfile: 2001,
  /**
   * c2s 空体。Battle.proto 的 GReqChapterData。旧桥日志里进游戏同步会发这一帧，
   * s2c 回 now_idx / max_idx。占位表里没有 3007。不是 stage.enter。
   */
  chapterData: 3007,
  /**
   * c2s 空体。Battle.proto 的 GReqChapterItemList。进主城、空 c2s 3007 之后发。
   * s2c 回 reward_time / max_reward_time。不是占位 idle.query（1301）。
   */
  chapterItemList: 3004,
  /**
   * c2s 空体。Battle.proto 的 GReqChapterItemReward。挂机页点领取才发。
   * s2c 只读 reward_time。不写金币。不是占位 idle.claim（1302）。
   */
  chapterItemReward: 3005,
  /**
   * c2s 空体。GReqBackPackList。进主城、空 c2s 2001 之后、空 c2s 3007 之前发。
   * s2c 是背包整表。空包体是已同步的空背包。不是占位 bag.list（1601）。
   */
  backpackList: 5001,
  /**
   * 只在 s2c 见过的变更。GResBackpackGain。客户端不发。
   * 合并进本地背包。type 只记日志。不写顶栏。不是占位 bag.use（1602）。
   */
  backpackGain: 5002,
  /**
   * c2s 空体。进主城、空 c2s 3004 之后发。
   * s2c 带回标题和附件。空包体是已同步的空邮箱。不是占位 mail.list（1701）。
   * 仓库里没有 Mail.proto。字段见 wireMail.ts。
   */
  mailList: 15000,
  /**
   * c2s 空体。进主城、空 c2s 15000 之后发。
   * s2c 带回英雄 id 和名字。空包体是已同步的空名册。不是占位 hero.list（1401）。
   * 仓库里没有 Hero.proto。字段见 wireHero.ts。不发升级。
   */
  heroList: 18001,
} as const;

/**
 * 旧桥日志里 c2s 1004 的间隔。1606 个间隔里中位数 25.009 秒，约 1533 个落在 25.0 秒。
 * 分析里的 TCP 空闲是 60 秒，25 秒在这之内。不是占位 NetClient 的 5 秒。
 */
export const WIRE_HEARTBEAT_MS = 25000;

const MAX_FRAME_BYTES = 2 * 1024 * 1024;

export interface GameFrame {
  cmdId: number;
  body: Uint8Array;
}

export interface DecodeFramesResult {
  frames: GameFrame[];
  /** 不够一帧的尾巴。下一次拼上再解。 */
  rest: Uint8Array;
  /** 长度字段小于 4，或大过上限。这一段不能再当粘包。 */
  fatal: boolean;
}

export function encodeFrame(cmdId: number, body?: Uint8Array): Uint8Array {
  const payload = body && body.length > 0 ? body : new Uint8Array(0);
  const length = 4 + payload.length;
  const out = new Uint8Array(4 + length);
  writeU32(out, 0, length);
  writeU32(out, 4, cmdId >>> 0);
  if (payload.length > 0) out.set(payload, 8);
  return out;
}

export function decodeFrames(input: Uint8Array): DecodeFramesResult {
  const frames: GameFrame[] = [];
  let offset = 0;
  while (offset + 4 <= input.length) {
    const length = readU32(input, offset);
    if (length < 4 || length > MAX_FRAME_BYTES) {
      return { frames, rest: new Uint8Array(0), fatal: true };
    }
    const total = 4 + length;
    if (offset + total > input.length) break;
    const cmdId = readU32(input, offset + 4);
    const body = copyBytes(input, offset + 8, length - 4);
    frames.push({ cmdId, body });
    offset += total;
  }
  return { frames, rest: copyBytes(input, offset, input.length - offset), fatal: false };
}

export function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  if (a.length > 0) out.set(a, 0);
  if (b.length > 0) out.set(b, a.length);
  return out;
}

function copyBytes(src: Uint8Array, offset: number, length: number): Uint8Array {
  const out = new Uint8Array(length);
  if (length > 0) out.set(src.subarray(offset, offset + length), 0);
  return out;
}

export function bytesToHex(bytes: Uint8Array, maxBytes = 80): string {
  const n = Math.min(bytes.length, maxBytes);
  let out = "";
  for (let i = 0; i < n; i++) {
    const b = bytes[i];
    out += (b < 16 ? "0" : "") + b.toString(16);
  }
  if (bytes.length > maxBytes) out += "…";
  return out;
}

export function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return copy as ArrayBuffer;
}

function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  const n = value >>> 0;
  bytes[offset] = n & 0xff;
  bytes[offset + 1] = (n >>> 8) & 0xff;
  bytes[offset + 2] = (n >>> 16) & 0xff;
  bytes[offset + 3] = (n >>> 24) & 0xff;
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}
