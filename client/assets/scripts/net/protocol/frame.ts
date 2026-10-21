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
   * c2s GReqHeroList。必须带 page，进主城发 page=1。
   * 整帧 `06 00 00 00 a1 0f 00 00 08 01`。禁止空体：page 缺省 0 时服端负下标。
   * s2c 是 GResHeroList。不是占位 hero.list（1401）。
   * 18001 是竞技场 GReqPvpData，见 pvpData。不是英雄。
   */
  heroList: 4001,
  /**
   * c2s 空体。进主城、c2s 4001 page=1 之后发。
   * 整帧 `04 00 00 00 68 42 00 00`。BuyGoldHandler.buyGoldList。
   * s2c 是 GResBuyGoldLog。不是占位 login7.view（2201）。不点金。
   */
  buyGoldList: 17000,
  /**
   * c2s 空体。进主城、空 c2s 17000 之后发。
   * 整帧 `04 00 00 00 ea 2e 00 00`。AchievementHandler.achievementList。
   * s2c 是 GResAchievementList。不发 12020。不领奖。
   * 服端会懒建首链成就并落库，客户端仍只读。
   */
  achievementList: 12010,
  /**
   * c2s 空体。进主城、空 c2s 12010 之后发。
   * 整帧 `04 00 00 00 51 46 00 00`。PvpHandler.pvpData，GReqPvpData。
   * s2c 是 GResPvpData。不发 18002、18003、18005、18007、18008。
   * 对手空时服可能补名单。不匹配，不扣次，不开战。
   */
  pvpData: 18001,
  /**
   * c2s 空体。进主城、空 c2s 18001 之后发。
   * 整帧 `04 00 00 00 f0 55 00 00`。GReqSevenDayLoginData，没有字段，也没有 page。
   * s2c 是 GResSevenDayLoginData。不发 22001。
   * 22002 是隔天推送，只收不发。无写库，无自动领奖。
   * 不是占位 login7.view（2201）。不是点金 17000，也不是七日目标。
   */
  sevenDayLogin: 22000,
  /**
   * c2s 空体。进主城、空 c2s 22000 之后发。
   * 整帧 `04 00 00 00 12 52 00 00`。21010 = 0x5212，小端 12 52 00 00。不要写成 02 52。
   * GReqSevenDayTargetList，没有字段。s2c 是 GResSevenDayTargetList。
   * 不发 21011、21012。21013 只收。旧号 21000 / 21001 不用。
   * 首次拉取可能建档并懒填计数，不发奖。不是七日登录 22000，也不是点金 17000。
   * 不是占位 goal7.view（2301）。
   */
  sevenDayTarget: 21010,
  /**
   * c2s 空体。进主城、空 c2s 21010 之后发。
   * 整帧 `04 00 00 00 79 69 00 00`。27001 = 0x6979，小端 79 69 00 00。
   * GReq 没有字段。s2c 是 GResBlessingPoolList。
   * 不发 27002 刷新、27003 抽奖、27004 幸运领奖。备选 4201 本刀不发。
   * 可能懒建或跨日写库，无扣费。不是占位 wish.view（2501）。
   */
  blessingPool: 27001,
  /**
   * c2s 空体。进主城、空 c2s 27001 之后发。
   * 整帧 `04 00 00 00 a4 0f 00 00`。4004 = 0x0FA4，小端 a4 0f 00 00。
   * GReq 没有字段，也没有 page。s2c 是 GResHeroSummonCount。
   * 不发 4002 召唤、4005 累积召唤奖。不做 58001、58007、4201。
   * 副作用仅可能懒建 HeroSummon。不写金币，不写钻石。
   * 不是英雄列表 4001。不是占位 summon.pull（1501）。
   */
  heroSummonCount: 4004,
  /**
   * c2s 空体。进主城、空 c2s 4004 之后发。
   * 整帧 `04 00 00 00 f4 32 00 00`。13044 = 0x32F4，小端 f4 32 00 00。
   * GReqProphetSummonInfo / GResProphetSummonInfo。
   * 不发 13041、13042、13043。不做 58007、4201。
   * 不是召唤次数 4004。不是占位 summon.pull（1501）。
   */
  prophetSummon: 13044,
  /**
   * c2s 空体。进主城、空 c2s 13044 之后发。
   * 整帧 `04 00 00 00 05 10 00 00`。4101 = 0x1005，小端 05 10 00 00。
   * GReqHeroJewel / GResHeroJewel。没有 page，空体安全。无写库。
   * 不发 4102 替换、4103 卸、4104 一键穿、4105 一键卸、4106 合成、4107 一键合成。不做 9001。
   * 不是英雄列表 4001。不是先知召唤 13044。
   */
  heroJewel: 4101,
  /**
   * c2s 空体。进主城、空 c2s 4101 之后发。
   * 整帧 `04 00 00 00 ad 0f 00 00`。4013 = 0x0FAD，小端 ad 0f 00 00。
   * GReqIllustratReward / GResIllustratReward。名字像领奖，实为查看。空体安全。
   * 不发 4014。4014 仅 s2c 推送。不把 4013 当领奖再发写号。
   * 无档时服端可能懒建空记录，可接受。
   * 不是英雄列表 4001。不是英雄宝石 4101。
   */
  illustratReward: 4013,
  /**
   * c2s 空体。进主城、空 c2s 4013 之后发。
   * 整帧 `04 00 00 00 74 21 01 00`。74100 = 0x12174，小端 74 21 01 00。
   * GReqPetInfoList / GResPetInfoList。空体安全。无写库。
   * 不发 74101 升级、74102 携带、74103 卸下。74105、74106 仅 s2c 推送，不主动发。
   * 不是英雄列表 4001。不是英雄图鉴 4013。
   */
  petInfoList: 74100,
  /**
   * c2s 空体。进主城、空 c2s 74100 之后发，只发一次。
   * 整帧 `04 00 00 00 39 c7 00 00`。51001 = 0xC739，小端 39 c7 00 00。
   * GReqWorldLevel / GResWorldLevel。level 是字段 1，int64。空体安全。无写库。
   * 不夹在 2001 和 3007 中间。本模块无写操作号。不做 20101。
   * 不是角色资料 2001。
   */
  worldLevel: 51001,
  /**
   * c2s 空体。进主城、空 c2s 51001 之后发，只发一次。
   * 整帧 `04 00 00 00 21 4e 00 00`。20001 = 0x4E21，小端 21 4e 00 00。
   * GReqPromotionList / GResPromotionList。is_buy_foundation 是字段 1。
   * foundation_reward_record 是字段 2，PSMapData 的 key、value。
   * 不发 20018 领奖。不发 20004、20010。不做 3007。
   * 不夹在 2001 和 3007 中间。不是角色资料 2001。不是世界等级 51001。
   */
  promotionList: 20001,
  /**
   * c2s 空体。进主城、空 c2s 20001 之后发，只发一次。
   * 整帧 `04 00 00 00 2c 4e 00 00`。20012 = 0x4E2C，小端 2c 4e 00 00。
   * GReqFirstRecharge / GResFirstRecharge。recharge 是字段 1。
   * list 是字段 2，已领 idx。can_reward 是字段 3，PSMapData 的 key 是档位，value 0 可领、1 不可。
   * 不发 20013 领奖。不做 13260。
   * 不夹在 2001 和 3007 中间。不是角色资料 2001。不是基金列表 20001。
   */
  firstRecharge: 20012,
  /**
   * c2s 空体。进主城、空 c2s 20012 之后发，只发一次。
   * 整帧 `04 00 00 00 71 11 01 00`。70001 = 0x11171，小端 71 11 01 00。
   * GReqReikiEquipData / GResReikiEquipData。list 是字段 1，repeated PSReikiEquipData。
   * hero_id、sys_id、reiki_equip_id 按声明顺序是 1、2、3。
   * 不发 70002 激活、70003 穿、70004 卸、70005 转换、70006 合成。
   * 70007、70008 仅 s2c 推送，不当拉包请求。不做 20011。
   * 不夹在 2001 和 3007 中间。不是角色资料 2001。不是基金列表 20001。不是超值首充 20012。
   */
  reikiEquipData: 70001,
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
