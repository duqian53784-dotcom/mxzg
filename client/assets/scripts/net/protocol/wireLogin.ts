/**
 * 只编码 net-20261020.jsonl 里能对上的 c2s 1001 / 1002。
 * 字段号是从包体反解出来的，不是 .proto 里的名字。两例登录都出现的常量照写，不猜平台 OAuth。
 * 字节顺序跟日志第二例（uid 960011）对齐。第一例 uid 111 字段号和值相同，顺序不同；两例都拿到了 s2c 1001。
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
 *
 * 进主城后另外几帧也在这里编：空的 c2s 2001（wire.2001）、空的 c2s 5001（wire.5001）、
 * 空的 c2s 3007（wire.3007）、空的 c2s 3004（wire.3004）、空的 c2s 15000（wire.15000）、
 * c2s 4001 page=1（wire.4001，包体 `08 01`）、空的 c2s 17000（wire.17000）、空的 c2s 12010（wire.12010）、
 * 空的 c2s 18001（wire.18001，GReqPvpData）、空的 c2s 22000（wire.22000，GReqSevenDayLoginData）、
 * 空的 c2s 21010（wire.21010，GReqSevenDayTargetList）、
 * 空的 c2s 27001（wire.27001，许愿池 GResBlessingPoolList）、
 * 空的 c2s 4004（wire.4004，召唤次数 GResHeroSummonCount。不是英雄列表 4001）、
 * 空的 c2s 13044（wire.13044，先知召唤 GReqProphetSummonInfo / GResProphetSummonInfo。不是 4004）、
 * 空的 c2s 4101（wire.4101，英雄宝石 GReqHeroJewel / GResHeroJewel。不是 4001，也不是 13044）、
 * 空的 c2s 4013（wire.4013，英雄图鉴 GReqIllustratReward / GResIllustratReward。名字像领奖，实为查看。不是 4001，也不是 4101。不编 4014）。
 * 空的 c2s 74100（wire.74100，宠物信息 GReqPetInfoList / GResPetInfoList。不是 4001，也不是 4013。不编 74101、74102、74103、74105、74106）。
 * 空的 c2s 51001（wire.51001，世界等级 GReqWorldLevel / GResWorldLevel。level 是字段 1。不编 20101。不夹在 2001 和 3007 中间）。
 * 空的 c2s 20001（wire.20001，基金列表 GReqPromotionList / GResPromotionList。is_buy_foundation 是字段 1，foundation_reward_record 是字段 2。不编 20018。不编 20004、20010。不做 3007。挂在 51001 之后）。
 * 空的 c2s 20012（wire.20012，超值首充 GReqFirstRecharge / GResFirstRecharge。recharge 是字段 1，list 是字段 2 已领 idx，can_reward 是字段 3。不编 20013。不做 13260。挂在 20001 之后）。
 * 空的 c2s 70001（wire.70001，灵器数据 GReqReikiEquipData / GResReikiEquipData。list 是字段 1，PSReikiEquipData 的 hero_id、sys_id、reiki_equip_id。不编 70002、70003、70004、70005、70006。不编 70007、70008。不做 20011。挂在 20012 之后）。
 * 空的 c2s 73001（wire.73001，浮空岛时间 GReqFloatingIslandsTime / GResFloatingIslandsTime。next_time 是字段 2，stage 是字段 3。不编 73002、73003、73004。73002 有懒建和日刷写库。本号无写库。不做 20011。挂在 70001 之后）。
 * 空的 c2s 74300（wire.74300，图腾信息 GReqTotemsInfoList / GResTotemsInfoList。list 是字段 1，PSTotemsInfo 的 t_id、sys_id、hero_id、level、quality。不编 74301、74302、74303。不编 74304。74304 是推送，勿当拉包。本号无写库。不做 20011。挂在 73001 之后。与 74100 同城养成段）。
 * 空的 c2s 68001（wire.68001，星盘数据 GReqAstrolabeData / GResAstrolabeData。无 page。maxStar 是字段 1，active 是字段 2 的 PSMapData key、value，activeElem 是字段 3 的 int 列表，activeAstrolabe 是字段 4。不编 68002、68003、68004、68006。不编 68005。68005 是更新星数常量，勿当拉包。轻懒建，首次 load 可能 astrolabeDao.add 空行。无扣费，无领奖，无日刷写库。管理员认定可接受。不做 20011。挂在 74300 之后）。
 * 空的 c2s 75501（wire.75501，魔方数据 GReqTweakCube / GResTweakCube。无 page。handler getData 不读 req。rank_hero 是字段 1 的 int64 列表，open_count 是字段 2，trench 是字段 3 的 PSTrench index、hero_id、last_change_time。不编 75502、75503、75504、75505。不编 75506。75506 是等级推送，勿当拉包。轻懒建，首次 get 可能 doCreate + tweakCubeDao.add，建免费槽并按战力塞供奉。无扣费，无领奖。管理员认定可接受，同星盘。不做 34001。不做 20011。挂在 68001 之后）。
 * 挂机页领取再编空的 c2s 3005（wire.3005）。
 * 3007 见 wireChapter.ts。3004 / 3005 见 wireIdle.ts。5001 见 wireBag.ts。15000 见 wireMail.ts。4001 见 wireHero.ts。17000 见 wireActivity.ts。12010 见 wireAchievement.ts。18001 见 wirePvp.ts。22000 见 wireSevenDay.ts。21010 见 wireGoal7.ts。27001 见 wireWish.ts。4004 见 wireSummon.ts。13044 见 wireProphet.ts。4101 见 wireJewel.ts。4013 见 wireIllustrat.ts。74100 见 wirePet.ts。51001 见 wireWorld.ts。20001 见 wirePromotion.ts。20012 见 wireFirstRecharge.ts。70001 见 wireReiki.ts。73001 见 wireFloatingIslands.ts。74300 见 wireTotems.ts。68001 见 wireAstrolabe.ts。75501 见 wireTweakCube.ts。
 * 不编 12020。不编 22001，也不编 22002。不编 21011、21012。不编 21013。旧号 21000 / 21001 不编。
 * 3002 不编。5002 只收不发。5004–5009、5010、5011–5013 不编。
 * 邮件领取、已读、删除不编。占位 mail.* 仍是 1701–1705。
 * 英雄升级不编。占位 hero.list / hero.upgrade 仍是 1401 / 1402。
 * 不编空的 4001，也不编 12020。占位 login7.* 仍是 2201–2203，领取不编。成就不领奖。
 * 空的 18001 要编。不编 18002、18003、18005、18007、18008。
 * 空的 22000 要编。22002 只收，不当成 c2s。
 * 空的 21010 要编。21013 只收，不当成 c2s。不编 21011、21012。
 * 空的 27001 要编。不编 27002、27003、27004。不编 4201。
 * 空的 4004 要编。不编 4002、4005。不编 58001、58007。英雄列表仍是 4001，不编成空体。
 * 空的 13044 要编。不编 13041、13042、13043。不编 58007、4201。召唤次数仍是 4004。
 * 空的 4101 要编。不编 4102、4103、4104、4105、4106、4107。不编 9001。英雄列表仍是 4001。先知召唤仍是 13044。
 * 空的 4013 要编。不编 4014。4014 是 s2c 推送。不把 4013 当领奖再发写号。英雄列表仍是 4001。英雄宝石仍是 4101。
 * 空的 74100 要编。不编 74101、74102、74103。不编 74105、74106。74105、74106 是 s2c 推送。英雄列表仍是 4001。英雄图鉴仍是 4013。
 * 空的 51001 要编。不编 20101。本模块无写操作号。不夹在 2001 和 3007 中间。
 * 空的 20001 要编。不编 20018。不编 20004、20010。不做 3007。挂在 51001 之后。不是角色资料 2001。
 * 空的 20012 要编。不编 20013。不做 13260。挂在 20001 之后。不是基金列表 20001。
 * 空的 70001 要编。不编 70002、70003、70004、70005、70006。不编 70007、70008。70007、70008 是 s2c 推送，不当拉包请求。不做 20011。挂在 20012 之后。不是超值首充 20012。
 * 空的 73001 要编。不编 73002、73003、73004。73002 有懒建和日刷写库，不当纯只读。本号无写库。不做 20011。挂在 70001 之后。不是灵器数据 70001。
 * 空的 74300 要编。不编 74301、74302、74303。不编 74304。74304 是 s2c 推送，勿发、勿当拉包。本号无写库。不做 20011。挂在 73001 之后。与 74100 同城养成段。不是浮空岛时间 73001。不是宠物信息 74100。
 * 空的 68001 要编。无 page。不编 68002、68003、68004、68006。不编 68005。68005 是更新星数常量，勿发、勿当拉包。轻懒建可接受。不做 20011。挂在 74300 之后。不是图腾信息 74300。
 * 空的 75501 要编。无 page。不编 75502、75503、75504、75505。不编 75506。75506 是等级推送，勿发、勿当拉包。轻懒建可接受，同星盘。不做 34001。不做 20011。挂在 68001 之后。不是星盘数据 68001。
 */
import { NetMessage } from "../NetTypes";
import { Cmd } from "./cmds";
import { bytesToHex, encodeFrame, WireCmd } from "./frame";
import { WIRE_ACHIEVEMENT_CMD } from "./wireAchievement";
import { WIRE_ACTIVITY_CMD } from "./wireActivity";
import { WIRE_PVP_CMD } from "./wirePvp";
import { WIRE_GOAL7_CMD } from "./wireGoal7";
import { WIRE_SEVEN_CMD } from "./wireSevenDay";
import { WIRE_WISH_CMD } from "./wireWish";
import { WIRE_SUMMON_CMD } from "./wireSummon";
import { WIRE_PROPHET_CMD } from "./wireProphet";
import { WIRE_JEWEL_CMD } from "./wireJewel";
import { WIRE_ILLUSTRAT_CMD } from "./wireIllustrat";
import { WIRE_PET_CMD } from "./wirePet";
import { WIRE_WORLD_CMD } from "./wireWorld";
import { WIRE_PROMOTION_CMD } from "./wirePromotion";
import { WIRE_FIRST_CMD } from "./wireFirstRecharge";
import { WIRE_REIKI_CMD } from "./wireReiki";
import { WIRE_ISLANDS_CMD } from "./wireFloatingIslands";
import { WIRE_TOTEMS_CMD } from "./wireTotems";
import { WIRE_ASTROLABE_CMD } from "./wireAstrolabe";
import { WIRE_CUBE_CMD } from "./wireTweakCube";
import { encodeWireHeroListBody, readWireHeroPage, WIRE_HERO_CMD } from "./wireHero";

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

/** 字段 1 是已证明的角色 id。空包或没有这个字段时不进主城。 */
export function wireRoleReady(summary: LoginReplySummary): boolean {
  return typeof summary.roleId === "number" && summary.roleId > 0;
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
 * heartbeat → 1004 空体。login → 1001。role.create → 1002。wire.2001 → 空的 c2s 2001。
 * wire.5001 → 空的 c2s 5001（背包整表）。
 * wire.3007 → 空的 c2s 3007（主线关卡进度）。
 * wire.3004 → 空的 c2s 3004（挂机奖励列表）。wire.3005 → 空的 c2s 3005（领取挂机）。
 * wire.15000 → 空的 c2s 15000（邮件列表）。
 * wire.4001 → c2s 4001，GReqHeroList.page（缺省按 1，不会编成 0）。
 * wire.17000 → 空的 c2s 17000（点金 GResBuyGoldLog，不点金）。
 * wire.12010 → 空的 c2s 12010（成就 GResAchievementList，不领奖）。不编 12020。
 * wire.18001 → 空的 c2s 18001（竞技场 GReqPvpData / GResPvpData）。不编 18002、18003、18005、18007、18008。
 * wire.22000 → 空的 c2s 22000（七日登录 GReqSevenDayLoginData / GResSevenDayLoginData）。不编 22001。不编 22002。
 * wire.21010 → 空的 c2s 21010（七日目标 GReqSevenDayTargetList / GResSevenDayTargetList）。不编 21011、21012。不编 21013。
 * wire.27001 → 空的 c2s 27001（许愿池 GResBlessingPoolList）。不编 27002、27003、27004。不编 4201。
 * wire.4004 → 空的 c2s 4004（召唤次数 GResHeroSummonCount）。不编 4002、4005。不编 58001、58007。不是 4001。
 * wire.13044 → 空的 c2s 13044（先知召唤 GReqProphetSummonInfo / GResProphetSummonInfo）。不编 13041、13042、13043。不编 58007、4201。不是 4004。
 * wire.4101 → 空的 c2s 4101（英雄宝石 GReqHeroJewel / GResHeroJewel）。不编 4102、4103、4104、4105、4106、4107。不编 9001。不是 4001，也不是 13044。
 * wire.4013 → 空的 c2s 4013（英雄图鉴 GReqIllustratReward / GResIllustratReward）。不编 4014。不是 4001，也不是 4101。
 * wire.74100 → 空的 c2s 74100（宠物信息 GReqPetInfoList / GResPetInfoList）。不编 74101、74102、74103、74105、74106。不是 4001，也不是 4013。
 * wire.51001 → 空的 c2s 51001（世界等级 GReqWorldLevel / GResWorldLevel）。不编 20101。
 * wire.20001 → 空的 c2s 20001（基金列表 GReqPromotionList / GResPromotionList）。不编 20018。不编 20004、20010。不做 3007。不是角色资料 2001。
 * wire.20012 → 空的 c2s 20012（超值首充 GReqFirstRecharge / GResFirstRecharge）。不编 20013。不做 13260。不是基金列表 20001。
 * wire.70001 → 空的 c2s 70001（灵器数据 GReqReikiEquipData / GResReikiEquipData）。不编 70002、70003、70004、70005、70006。不编 70007、70008。不做 20011。不是超值首充 20012。
 * wire.73001 → 空的 c2s 73001（浮空岛时间 GReqFloatingIslandsTime / GResFloatingIslandsTime）。不编 73002、73003、73004。不做 20011。不是灵器数据 70001。
 * wire.74300 → 空的 c2s 74300（图腾信息 GReqTotemsInfoList / GResTotemsInfoList）。不编 74301、74302、74303、74304。不做 20011。不是浮空岛时间 73001。不是宠物信息 74100。
 * wire.68001 → 空的 c2s 68001（星盘数据 GReqAstrolabeData / GResAstrolabeData）。无 page。不编 68002、68003、68004、68005、68006。不做 20011。不是图腾信息 74300。
 * wire.75501 → 空的 c2s 75501（魔方数据 GReqTweakCube / GResTweakCube）。无 page。不编 75502、75503、75504、75505、75506。不做 34001。不做 20011。不是星盘数据 68001。
 * 别的 cmd 返回 null，调用方不得把占位包写到线上。占位表里的 2001 仍是 Mock 的 tower.view。
 * 占位 idle.query / idle.claim 仍是 1301 / 1302，和这两帧不是一回事。
 * 占位 bag.list / bag.use 仍是 1601 / 1602。3002 / 3010 不编码。
 * 5002 不编码。5004–5009、5010、5011–5013 不编码。
 * 占位 mail.list / mail.read / mail.claim / mail.claimAll / mail.delete 仍是 1701–1705。领取和删除不编码。
 * 占位 hero.list / hero.upgrade 仍是 1401 / 1402。升级不编码。18001 不是英雄。
 * 占位 login7.view / login7.claim / login7.advance 仍是 2201–2203。领取不编码。wire.12020 不编码。
 * wire.22001、wire.22002 不编码。22002 是 s2c 推送。
 * 占位 goal7.view / goal7.claim 仍是 2301 / 2302。领取不编码。
 * wire.21011、wire.21012、wire.21013 不编码。21013 是 s2c。wire.21000、wire.21001 不编码。
 * 占位 wish.view / wish.draw 仍是 2501 / 2502。刷新、抽奖和幸运领奖不编码。
 * wire.27002、wire.27003、wire.27004、wire.4201 不编码。
 * 占位 summon.pull 仍是 1501。召唤和累积奖不编码。
 * wire.4002、wire.4005、wire.58001、wire.58007 不编码。
 * wire.13041、wire.13042、wire.13043 不编码。先知召唤的 58007、4201 也不编码。
 * wire.4102、wire.4103、wire.4104、wire.4105、wire.4106、wire.4107、wire.9001 不编码。
 * wire.4014 不编码。4014 是 s2c 推送。
 * wire.74101、wire.74102、wire.74103、wire.74105、wire.74106 不编码。74105、74106 是 s2c 推送。
 * wire.20101 不编码。51001 只编码空体。本模块无写操作号。
 * wire.20018、wire.20004、wire.20010 不编码。20001 只编码空体。不做 3007。
 * wire.20013、wire.13260 不编码。20012 只编码空体。不做 13260。
 * wire.70002、wire.70003、wire.70004、wire.70005、wire.70006、wire.70007、wire.70008、wire.20011 不编码。70001 只编码空体。70007、70008 是 s2c 推送。不做 20011。
 * wire.73002、wire.73003、wire.73004、wire.20011 不编码。73001 只编码空体。73002 有懒建和日刷写库。不做 20011。
 * wire.74301、wire.74302、wire.74303、wire.74304、wire.20011 不编码。74300 只编码空体。74304 是 s2c 推送，勿当拉包。不做 20011。
 * wire.68002、wire.68003、wire.68004、wire.68005、wire.68006、wire.20011 不编码。68001 只编码空体。68005 是更新星数常量，勿当拉包。不做 20011。
 * wire.75502、wire.75503、wire.75504、wire.75505、wire.75506、wire.34001、wire.20011 不编码。75501 只编码空体。75506 是等级推送，勿当拉包。不做 34001。不做 20011。
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
  if (cmd === "wire.2001") {
    return {
      cmdId: WireCmd.roleProfile,
      bytes: encodeFrame(WireCmd.roleProfile),
      note: "空体",
    };
  }
  if (cmd === "wire.5001") {
    return {
      cmdId: WireCmd.backpackList,
      bytes: encodeFrame(WireCmd.backpackList),
      note: "空体",
    };
  }
  if (cmd === "wire.3007") {
    return {
      cmdId: WireCmd.chapterData,
      bytes: encodeFrame(WireCmd.chapterData),
      note: "空体",
    };
  }
  if (cmd === "wire.3004") {
    return {
      cmdId: WireCmd.chapterItemList,
      bytes: encodeFrame(WireCmd.chapterItemList),
      note: "空体",
    };
  }
  if (cmd === "wire.3005") {
    return {
      cmdId: WireCmd.chapterItemReward,
      bytes: encodeFrame(WireCmd.chapterItemReward),
      note: "空体",
    };
  }
  if (cmd === "wire.15000") {
    return {
      cmdId: WireCmd.mailList,
      bytes: encodeFrame(WireCmd.mailList),
      note: "空体",
    };
  }
  if (cmd === WIRE_HERO_CMD) {
    const page = readWireHeroPage(msg.data);
    return {
      cmdId: WireCmd.heroList,
      bytes: encodeFrame(WireCmd.heroList, encodeWireHeroListBody(page)),
      note: "page=" + page,
    };
  }
  if (cmd === WIRE_ACTIVITY_CMD) {
    return {
      cmdId: WireCmd.buyGoldList,
      bytes: encodeFrame(WireCmd.buyGoldList),
      note: "空体",
    };
  }
  if (cmd === WIRE_ACHIEVEMENT_CMD) {
    return {
      cmdId: WireCmd.achievementList,
      bytes: encodeFrame(WireCmd.achievementList),
      note: "空体",
    };
  }
  if (cmd === WIRE_PVP_CMD) {
    return {
      cmdId: WireCmd.pvpData,
      bytes: encodeFrame(WireCmd.pvpData),
      note: "空体",
    };
  }
  if (cmd === WIRE_SEVEN_CMD) {
    return {
      cmdId: WireCmd.sevenDayLogin,
      bytes: encodeFrame(WireCmd.sevenDayLogin),
      note: "空体",
    };
  }
  if (cmd === WIRE_GOAL7_CMD) {
    return {
      cmdId: WireCmd.sevenDayTarget,
      bytes: encodeFrame(WireCmd.sevenDayTarget),
      note: "空体",
    };
  }
  if (cmd === WIRE_WISH_CMD) {
    return {
      cmdId: WireCmd.blessingPool,
      bytes: encodeFrame(WireCmd.blessingPool),
      note: "空体",
    };
  }
  if (cmd === WIRE_SUMMON_CMD) {
    return {
      cmdId: WireCmd.heroSummonCount,
      bytes: encodeFrame(WireCmd.heroSummonCount),
      note: "空体",
    };
  }
  if (cmd === WIRE_PROPHET_CMD) {
    return {
      cmdId: WireCmd.prophetSummon,
      bytes: encodeFrame(WireCmd.prophetSummon),
      note: "空体",
    };
  }
  if (cmd === WIRE_JEWEL_CMD) {
    return {
      cmdId: WireCmd.heroJewel,
      bytes: encodeFrame(WireCmd.heroJewel),
      note: "空体",
    };
  }
  if (cmd === WIRE_ILLUSTRAT_CMD) {
    return {
      cmdId: WireCmd.illustratReward,
      bytes: encodeFrame(WireCmd.illustratReward),
      note: "空体",
    };
  }
  if (cmd === WIRE_PET_CMD) {
    return {
      cmdId: WireCmd.petInfoList,
      bytes: encodeFrame(WireCmd.petInfoList),
      note: "空体",
    };
  }
  if (cmd === WIRE_WORLD_CMD) {
    return {
      cmdId: WireCmd.worldLevel,
      bytes: encodeFrame(WireCmd.worldLevel),
      note: "空体",
    };
  }
  if (cmd === WIRE_PROMOTION_CMD) {
    return {
      cmdId: WireCmd.promotionList,
      bytes: encodeFrame(WireCmd.promotionList),
      note: "空体",
    };
  }
  if (cmd === WIRE_FIRST_CMD) {
    return {
      cmdId: WireCmd.firstRecharge,
      bytes: encodeFrame(WireCmd.firstRecharge),
      note: "空体",
    };
  }
  if (cmd === WIRE_REIKI_CMD) {
    return {
      cmdId: WireCmd.reikiEquipData,
      bytes: encodeFrame(WireCmd.reikiEquipData),
      note: "空体",
    };
  }
  if (cmd === WIRE_ISLANDS_CMD) {
    return {
      cmdId: WireCmd.floatingIslandsTime,
      bytes: encodeFrame(WireCmd.floatingIslandsTime),
      note: "空体",
    };
  }
  if (cmd === WIRE_TOTEMS_CMD) {
    return {
      cmdId: WireCmd.totemsInfoList,
      bytes: encodeFrame(WireCmd.totemsInfoList),
      note: "空体",
    };
  }
  if (cmd === WIRE_ASTROLABE_CMD) {
    return {
      cmdId: WireCmd.astrolabeData,
      bytes: encodeFrame(WireCmd.astrolabeData),
      note: "空体",
    };
  }
  if (cmd === WIRE_CUBE_CMD) {
    return {
      cmdId: WireCmd.tweakCubeData,
      bytes: encodeFrame(WireCmd.tweakCubeData),
      note: "空体",
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
      detail: "日志里空的 1001 表示还没有角色。点创角发 1002。有角色才会进主城。",
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
  const ready = roleId !== null && roleId > 0;
  bits.push(ready ? "进入主城" : "没有角色 id，不进主城");
  return {
    empty: false,
    roleId,
    status: ready ? "登录回包 角色 " + roleId : "登录回包 1001",
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
