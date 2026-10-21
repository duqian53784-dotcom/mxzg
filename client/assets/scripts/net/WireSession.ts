import { GameLog } from "../core/GameLog";
import { Session } from "../core/Session";
import { NetClient } from "./NetClient";
import {
  decodeWireChapter,
  formatWireMainline,
  WIRE_CHAPTER_CMD,
  wireChapterHasIdx,
  wireChapterNote,
  WireChapterProgress,
} from "./protocol/wireChapter";
import {
  decodeWireIdle,
  decodeWireIdleClaim,
  WIRE_IDLE_CLAIM_CMD,
  WIRE_IDLE_CMD,
  wireIdleClaimNote,
  wireIdleHasTime,
  wireIdleNote,
  WireIdleClaim,
  WireIdleSnapshot,
} from "./protocol/wireIdle";
import {
  decodeWireRole,
  WIRE_ROLE_CMD,
  wireProfileHasBar,
  wireProfileNote,
  WireRoleProfile,
} from "./protocol/wireProfile";
import {
  applyWireBagGain,
  decodeWireBagGain,
  decodeWireBagList,
  WIRE_BAG_CMD,
  WIRE_BAG_GAIN_CMD,
  wireBagGainNote,
  wireBagNote,
  WireBagGain,
  WireBagItem,
  WireBagMark,
} from "./protocol/wireBag";
import {
  decodeWireMailList,
  WIRE_MAIL_CMD,
  wireMailNote,
  WireMailEntry,
} from "./protocol/wireMail";
import {
  decodeWireHeroList,
  WIRE_HERO_CMD,
  WIRE_HERO_PAGE_CAP,
  wireHeroNote,
  WireHeroEntry,
  WireHeroList,
} from "./protocol/wireHero";
import {
  decodeWireActivity,
  WIRE_ACTIVITY_CMD,
  wireActivityNote,
  WireActivityRow,
  WireActivitySnapshot,
} from "./protocol/wireActivity";
import {
  decodeWireAchievement,
  WIRE_ACHIEVEMENT_CMD,
  wireAchievementNote,
  WireAchievementSnapshot,
} from "./protocol/wireAchievement";
import {
  decodeWirePvp,
  WIRE_PVP_CMD,
  wirePvpNote,
  WirePvpOpponent,
  WirePvpSnapshot,
} from "./protocol/wirePvp";
import {
  applyWireSevenDayUpdate,
  decodeWireSevenDay,
  decodeWireSevenDayUpdate,
  WIRE_SEVEN_CMD,
  WIRE_SEVEN_PUSH_CMD,
  wireSevenNote,
  WireSevenDayRow,
  WireSevenDaySnapshot,
} from "./protocol/wireSevenDay";
import {
  decodeWireGoal7,
  WIRE_GOAL7_CMD,
  WIRE_GOAL7_PUSH_CMD,
  wireGoalNote,
  WireGoal7Snapshot,
  WireGoal7Task,
} from "./protocol/wireGoal7";
import {
  decodeWireWish,
  WIRE_WISH_CMD,
  wireWishNote,
  WireWishMark,
  WireWishPool,
  WireWishSlot,
  WireWishSnapshot,
} from "./protocol/wireWish";
import {
  decodeWireSummon,
  WIRE_SUMMON_CMD,
  wireSummonNote,
  WireSummonMark,
  WireSummonSnapshot,
} from "./protocol/wireSummon";
import {
  decodeWireProphet,
  WIRE_PROPHET_CMD,
  wireProphetNote,
  WireProphetLucky,
  WireProphetMark,
  WireProphetSnapshot,
} from "./protocol/wireProphet";
import {
  decodeWireJewel,
  WIRE_JEWEL_CMD,
  wireJewelNote,
  WireJewelHero,
  WireJewelMark,
  WireJewelPiece,
  WireJewelSnapshot,
} from "./protocol/wireJewel";
import {
  decodeWireIllustrat,
  WIRE_ILLUSTRAT_CMD,
  wireIllustratNote,
  WireIllustratMark,
  WireIllustratRow,
  WireIllustratSnapshot,
} from "./protocol/wireIllustrat";
import {
  decodeWirePet,
  WIRE_PET_CMD,
  wirePetNote,
  WirePetMark,
  WirePetRow,
  WirePetSnapshot,
} from "./protocol/wirePet";
import {
  decodeWireWorld,
  WIRE_WORLD_CMD,
  wireWorldNote,
  WireWorldMark,
  WireWorldSnapshot,
} from "./protocol/wireWorld";
import {
  decodeWirePromotion,
  WIRE_PROMOTION_CMD,
  wirePromotionNote,
  WirePromotionMark,
  WirePromotionRecord,
  WirePromotionSnapshot,
} from "./protocol/wirePromotion";
import {
  decodeWireFirstRecharge,
  WIRE_FIRST_CMD,
  wireFirstNote,
  WireFirstRechargeMark,
  WireFirstRechargeReward,
  WireFirstRechargeSnapshot,
} from "./protocol/wireFirstRecharge";
import {
  decodeWireReiki,
  WIRE_REIKI_CMD,
  wireReikiNote,
  WireReikiMark,
  WireReikiRow,
  WireReikiSnapshot,
} from "./protocol/wireReiki";
import {
  decodeWireIslands,
  WIRE_ISLANDS_CMD,
  wireIslandsNote,
  WireIslandsMark,
  WireIslandsSnapshot,
} from "./protocol/wireFloatingIslands";
import {
  decodeWireTotems,
  WIRE_TOTEMS_CMD,
  wireTotemsNote,
  WireTotemsMark,
  WireTotemsRow,
  WireTotemsSnapshot,
} from "./protocol/wireTotems";
import {
  decodeWireAstrolabe,
  WIRE_ASTROLABE_CMD,
  wireAstrolabeNote,
  WireAstrolabeActive,
  WireAstrolabeMark,
  WireAstrolabeSnapshot,
} from "./protocol/wireAstrolabe";
import {
  decodeWireTweakCube,
  WIRE_CUBE_CMD,
  wireTweakCubeNote,
  WireCubeMark,
  WireCubeSnapshot,
  WireCubeTrench,
} from "./protocol/wireTweakCube";
import {
  decodeWireDragon,
  WIRE_DRAGON_CMD,
  wireDragonNote,
  WireDragonIdentity,
  WireDragonMark,
  WireDragonSlot,
  WireDragonSnapshot,
} from "./protocol/wireDragon";
import {
  decodeWireDragonCollection,
  WIRE_DRAGON_COLLECTION_CMD,
  wireDragonCollectionNote,
  WireDragonCollectionMark,
  WireDragonCollectionSnapshot,
} from "./protocol/wireDragonCollection";
import {
  decodeWireTitle,
  WIRE_TITLE_CMD,
  wireTitleNote,
  WireTitleMark,
  WireTitleRow,
  WireTitleSnapshot,
} from "./protocol/wireTitle";
import {
  decodeWireHeadPortrait,
  WIRE_HEAD_PORTRAIT_CMD,
  wireHeadPortraitNote,
  WireHeadPortraitMark,
  WireHeadPortraitSnapshot,
} from "./protocol/wireHeadPortrait";
import {
  decodeWireBorder,
  WIRE_BORDER_CMD,
  wireBorderNote,
  WireBorderMark,
  WireBorderSnapshot,
  WireBorderUnit,
} from "./protocol/wireBorder";
import {
  decodeWireFashion,
  WIRE_FASHION_CMD,
  wireFashionNote,
  WireFashionMark,
  WireFashionRow,
  WireFashionSnapshot,
} from "./protocol/wireFashion";
import {
  decodeWireWornFashion,
  WIRE_WORN_FASHION_CMD,
  wireWornFashionNote,
  WireWornFashionMark,
  WireWornFashionRow,
  WireWornFashionSnapshot,
} from "./protocol/wireWornFashion";
import {
  decodeWireHeroPrayer,
  WIRE_HERO_PRAYER_CMD,
  wireHeroPrayerNote,
  WireHeroPrayerMark,
  WireHeroPrayerSnapshot,
} from "./protocol/wireHeroPrayer";
import {
  decodeWirePetIllustrate,
  WIRE_PET_ILLUSTRATE_CMD,
  wirePetIllustrateNote,
  WirePetIllustrateMark,
  WirePetIllustrateSnapshot,
} from "./protocol/wirePetIllustrate";
import {
  decodeWireFetter,
  WIRE_FETTER_CMD,
  wireFetterNote,
  WireFetterGoddess,
  WireFetterMark,
  WireFetterSnapshot,
} from "./protocol/wireFetter";
import {
  decodeWireFetterFashion,
  WIRE_FETTER_FASHION_CMD,
  wireFetterFashionNote,
  WireFetterFashionMark,
  WireFetterFashionSnapshot,
} from "./protocol/wireFetterFashion";
import {
  decodeWireShenBin,
  WIRE_SHENBIN_CMD,
  wireShenBinNote,
  WireShenBinEquip,
  WireShenBinHole,
  WireShenBinInfo,
  WireShenBinMark,
  WireShenBinSnapshot,
} from "./protocol/wireShenBin";
import {
  decodeWireOccupation,
  WIRE_OCCUPATION_CMD,
  wireOccupationNote,
  WireOccupationInfo,
  WireOccupationMark,
  WireOccupationSnapshot,
  WireOccupationTask,
} from "./protocol/wireOccupation";
import {
  decodeWireRoleShenBin,
  WIRE_ROLE_SHENBIN_CMD,
  wireRoleShenBinNote,
  WireRoleShenBinItem,
  WireRoleShenBinMark,
  WireRoleShenBinSnapshot,
} from "./protocol/wireRoleShenBin";
import {
  decodeWireFetterContract,
  WIRE_FETTER_CONTRACT_CMD,
  wireFetterContractNote,
  WireFetterContractMark,
  WireFetterContractSnapshot,
} from "./protocol/wireFetterContract";
import {
  decodeWireFormation,
  WIRE_FORMATION_CMD,
  wireFormationNote,
  WireFormationMark,
  WireFormationSnapshot,
} from "./protocol/wireFormation";
import {
  decodeWireLineUp,
  WIRE_LINEUP_CMD,
  wireLineUpNote,
  WireLineUpMark,
  WireLineUpRow,
  WireLineUpSnapshot,
} from "./protocol/wireLineUp";
import {
  decodeWireRunningPromotion,
  WIRE_RUNNING_PROMOTION_CMD,
  wireRunningPromotionNote,
  WireRunningPromotionMark,
  WireRunningPromotionRow,
  WireRunningPromotionSnapshot,
} from "./protocol/wireRunningPromotion";
import { wireBody } from "./protocol/wireLogin";

/**
 * ?transport=ws 登录进主城后，这条 NetClient 要活过 Boot 切场景。
 * 心跳 1004 继续发。
 * 连上就听 wire.2001、wire.5001、wire.5002、wire.3007、wire.3004、wire.3005、wire.15000、wire.4001、wire.17000、wire.12010、wire.18001、wire.22000、wire.22002、wire.21010、wire.21013、wire.27001、wire.4004、wire.13044、wire.4101、wire.4013、wire.74100、wire.51001、wire.20001、wire.20012、wire.70001、wire.73001、wire.74300、wire.68001、wire.75501、wire.59001、wire.59010、wire.55001、wire.34001、wire.32001 、wire.4402、wire.4401、wire.4201、wire.74104、wire.28100、wire.28200、wire.75601、wire.75606、wire.75615、wire.28107 、wire.3099、wire.3101 和 wire.20101。
 * 登录成功后先发空的 c2s 2001（日志里的拉角色资料）。pullRoleProfile 紧接着发空的 c2s 5001。
 * Boot 不改，随后仍是空的 c2s 3007，再发空的 c2s 3004。pullIdle 在 3004 之后再发空的 c2s 15000，然后 c2s 4001 page=1，再发空的 c2s 17000，再发空的 c2s 12010，再发空的 c2s 18001，再发空的 c2s 22000，再发空的 c2s 21010，再发空的 c2s 27001，再发空的 c2s 4004，再发空的 c2s 13044，再发空的 c2s 4101，再发空的 c2s 4013，再发空的 c2s 74100，再发空的 c2s 51001，再发空的 c2s 20001，再发空的 c2s 20012，再发空的 c2s 70001，再发空的 c2s 73001，再发空的 c2s 74300，再发空的 c2s 68001，再发空的 c2s 75501，再发空的 c2s 59001，再发空的 c2s 59010，再发空的 c2s 55001，再发空的 c2s 34001，再发空的 c2s 32001，再发空的 c2s 4402，再发空的 c2s 4401，再发空的 c2s 4201，再发空的 c2s 74104，再发空的 c2s 28100，再发空的 c2s 28200，再发空的 c2s 75601，再发空的 c2s 75606，再发空的 c2s 75615，再发空的 c2s 28107，再发空的 c2s 3099，再发空的 c2s 3101，再发空的 c2s 20101。
 * 相对顺序是 2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101。不等 s2c 2001。51001 在 74100 之后发一次，20001 接在 51001 之后，20012 接在 20001 之后，70001 接在 20012 之后，73001 接在 70001 之后，74300 接在 73001 之后，68001 接在 74300 之后，75501 接在 68001 之后，59001 接在 75501 之后，59010 接在 59001 之后，55001 接在 59010 之后，34001 接在 55001 之后，32001 接在 34001 之后，4402 接在 32001 之后，4401 接在 4402 之后，4201 接在 4401 之后，74104 接在 4201 之后，28100 接在 74104 之后，28200 接在 28100 之后，75601 接在 28200 之后，75606 接在 75601 之后，75615 接在 75606 之后，28107 接在 75615 之后，3099 接在 28107 之后，3101 接在 3099 之后，20101 接在 3101 之后。不夹在 2001 和 3007 中间。11005、58017 仍不发。不做 3007 的加发。
 * 不发 5010，也不发 5004–5009、5011–5013。不发邮件领取、已读、删除。不发英雄升级。空 c2s 20001 只读，不发 20018，不发 20004、20010。空 c2s 20012 只读，不发 20013，不做 13260。空 c2s 70001 只读，不发 70002、70003、70004、70005、70006。70007、70008 仅推送，不当拉包请求。不做 20011。空 c2s 73001 只读，不发 73002、73003、73004。73002 有懒建和日刷写库，不当纯只读。本号无写库。不做 20011。空 c2s 74300 只读，不发 74301 升级/升阶、74302 装备/卸/换、74303 重置。74304 是推送，勿发、勿当拉包。本号无写库。不做 20011。与 74100 同城养成段。空 c2s 68001 只读，无 page。不发 68002 激活元素、68003 点亮星盘、68004 重置、68006 激活星盘。68005 是更新星数常量，勿当拉包。轻懒建，首次 load 可能 astrolabeDao.add 空行，无扣费、无领奖、无日刷写库，管理员认定可接受。不做 20011。空 c2s 75501 只读，无 page。不发 75502 添加、75503 卸下、75504 开格子、75505 清 cd。75506 是等级推送，勿当拉包。轻懒建，首次 get 可能 doCreate + tweakCubeDao.add，建免费槽并按战力塞供奉，无扣费、无领奖，管理员认定可接受，同星盘。不做 34001。不做 20011。空 c2s 59001 只读，无 page。handler scanDragonInfo 不读 msg。不发 59002 放源石、59003 提升鉴定、59005 加速鉴定、59006 鉴定领奖、59007 提升圣龙等级、59008 圣物替换、59009 调顺序、59011、59012 升星、59013 分解。59010 是另只读，单独在 59001 之后拉包，勿与 59001 合并成一个请求，勿当写号。轻懒建，首次 dragonDao.add。无扣费，无领奖。不做 34001。不做 20011。空 c2s 55001 只读，无 page。Title.proto 仅 55001 读写对，同模块无写号。轻懒建，TitleService.getTitle → dao.add。无扣费，无领奖，无日刷。34001 是另只读，单独在 55001 之后拉包，勿与 55001 合并。不发 34002。34003 是解锁推送，勿发、勿当拉包。32001 另只读接在其后。不做 20011。34001 只读，无 page。轻懒建，RoleHeadPortraitService.select 无记录则 dao.add 默认解锁头。无扣费，无领奖，不改当前头像。不点金。不发 12020，不领奖。不发 18002、18003、18005、18007、18008。不发 22001。22002 只收。不发 21011、21012。21013 只收。不发 27002、27003、27004。4201 是英雄祈愿空体，接在 4401 之后。不发 4202。74104 另只读接在其后，勿合并。不发 4002、4005。不做 58001、58007。4004 不是 4001。不发 13041、13042、13043。13044 不是 4004。不发 4102、4103、4104、4105、4106、4107。不做 9001。4101 不是 4001，也不是 13044。不发 4014。4014 仅 s2c 推送。不把 4013 当领奖再发写号。4013 不是 4001，也不是 4101。不发 74101 升级、74102 携带、74103 卸下。74105、74106 仅 s2c 推送，不主动发。74100 不是 4001，也不是 4013。51001 无写操作号。20101 是进行中活动，另帧挂在 3101 之后，不发 20102。空 c2s 4402 只读，无 page。GReqHeroFashionList 空体。不发 4403 激活、4404 替换/使用、4405 皮肤升级。4406 无实现，勿发。4401 穿戴皮肤英雄列表另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。过期限时皮剔除，并可能把英雄 fashionId 置 0。只读展示。无扣费，无领奖。挂在 32001 之后。
 * s2c 2001 按 Role.proto：字段 9 角色名、字段 6 等级、字段 2 金币、字段 1 宝石（顶栏钻石）。
 * s2c 3007 按 Battle.proto：字段 2 now_idx、字段 3 max_idx。缺的 idx 不写成 0。
 * 不写 Session.stageId，主城按钮用 mainlineLabel()。
 * 至少有一个 idx 时点按钮打开只读代码页；两个都没有仍 Toast。
 * 不打开 Mock 关卡页，不发 3002 / 3010。
 * s2c 3004 按 Battle.proto：字段 1 reward_time、字段 2 max_reward_time。缺的不写成 0。
 * 不写 Session.gold。挂机页用 rewardTime / maxRewardTime。没有这两项时主城挂机只 Toast。
 * s2c 3005 只改 reward_time。没有奖励清单，不改金币和钻石。
 * s2c 5001 按 GResBackPackList 替换本地背包。空包体是已同步的空背包。
 * 从未收到 5001 时主城背包只 Toast，不打开 Mock 背包页。
 * s2c 5002 在已经有列表之后合并：num > 0 加上，num = 0 删掉该格。type 只记日志，不弹窗。
 * 背包、5002、5010、50000 都不写顶栏。钱包只认 s2c 2001 的金币和宝石。
 * s2c 15000 替换本地邮件列表。空包体是已同步的空邮箱。
 * 从未收到 15000 时主城邮件只 Toast，不打开 Mock 邮件页。
 * 字段 3、字段 4 只记日志，不当成已读或未读。不领取，不删除，不写顶栏。
 * s2c 4001 在 send_status=1（或翻页停下）后替换本地英雄名册。字段 3 长度为 0 是已同步的空名册。空体不是。
 * send_status=0 时接着发下一页，未收齐前不替换名册。
 * 从未收到 4001 时主城英雄只 Toast，不打开 Mock 英雄页。
 * 不升级，不写顶栏。类型对不上 CHeroType 就写类型号。
 * s2c 17000 替换本地点金记录。空包体、以及 list 为 0 条，都是已同步的空表。
 * 按 GResBuyGoldLog 写 status、time 和 idx / num。time 不推开服天。
 * 从未收到 17000 时主城「点金」只 Toast。不从七日登录进入，也不打开 Mock 七日登录。
 * 不点金，不写顶栏。占位 login7.* 仍是 2201–2203。
 * s2c 12010 替换本地成就记录。空包体和 task 为 0 条都是空成就表。
 * 按 PSTaskData 写 idx / process / state。同步可能在服上补成就。不领奖，不改 state。
 * 从未收到 12010 时主城「成就记录」只 Toast，不回落 Mock。
 * s2c 18001 替换本地竞技场。空包体、以及 list 为 0 条，都是已同步的空对手表。
 * 按 GResPvpData 写 free_count、score、season_end_time、like_rids、season_count、season_reward。
 * 对手名字用 PSRankPlayerData.name。score 不写金币。对手空时服可能补名单。
 * 从未收到 18001 时玩法「竞技场」只 Toast，不打开 Mock 竞技场。不挑战，不扣次。
 * s2c 22000 替换本地七日登录。空包体、以及 list 为 0 条，都是已同步的空表。
 * 按 GResSevenDayLoginData 写 end_time、cur_day。行上写 PSSevenLoginStatus 的 idx、status。
 * status 0 是未领，1 是已领。空领奖表仍带 cur_day / end_time，逐日 status=0，不是未同步。
 * 22000 无写库，无自动领奖。不发 22001，不写金币。
 * s2c 22002 只在已经有 22000 时改 cur_day。单独先到不算同步。不是 c2s。
 * 从未收到 22000 时「七日登录」只 Toast，不打开 Mock 七日登录。占位 login7.* 仍是 2201–2203。
 * s2c 21010 替换本地七日目标。空包体、以及 task 为 0 条，都是已同步的空表。
 * 按 GResSevenDayTargetList 写 curr_day、seven_day_value、reward_box_idx。行上写 PSTaskData 的 idx、process、state。
 * state 0 是未领，1 是已领。空表外层仍带 seven_day_value / curr_day，不是未同步。
 * 首次拉取可能建档并懒填计数。不发奖。不发 21011、21012，不写金币。
 * s2c 21013 只收，不改这份表，也不算同步。不是 c2s。
 * 从未收到 21010 时「七日目标」只 Toast，不打开 Mock 七日目标。不从七日登录或点金进入。占位 goal7.* 仍是 2301 / 2302。
 * s2c 27001 替换本地许愿池。空包体、以及 blessing_data 为 0 条，都是已同步的空表。
 * 按 GResBlessingPoolList 写 type、refresh_times、lucky_value、lucky_reward_id、refresh_time。格子写 position、times。item 对得上才写名字，对不上写字段号。
 * 可能懒建或跨日写库，无扣费。不刷新，不抽奖，不领幸运奖。不写金币，不写钻石。
 * 从未收到 27001 时玩法「许愿池」只 Toast，不打开 Mock 许愿池。占位 wish.* 仍是 2501 / 2502。备选 4201 不发。
 * s2c 4004 替换本地召唤次数。空包体是已同步。按 GResHeroSummonCount 写 free_time、senior_free_time。没有的数不写成 0。
 * 可能懒建 HeroSummon。无 page。不召唤，不领累积奖。不写金币，不写钻石。英雄列表仍是 4001。
 * 从未收到 4004 时底栏「召唤」和七日目标的前往只 Toast，不打开 Mock 召唤。占位 summon.pull 仍是 1501。不发 4002、4005。不做 58001、58007。
 * s2c 13044 替换本地先知召唤幸运值。空包体、以及 luckys 为 0 条，都是已同步的空表。
 * 按 GResProphetSummonInfo 写 PSProphetLucky 的 type、lucky。没有的数不写成 0。
 * 可能懒建 HeroSummon。跨日可能重置 levelResetTimes。不抽，不置换，不确认置换。不写金币，不写钻石。召唤次数仍是 4004。
 * 从未收到 13044 时主城「先知召唤」只 Toast，不打开 Mock 召唤。不发 13041、13042、13043。不做 58007、4201。
 * s2c 4101 替换本地英雄宝石。空包体、以及 jewel_list 为 0 条，都是已同步的空表。
 * 按 GResHeroJewel 写 PSHeroJewelData 的 hero_id，以及 PSJewelData 的 jewel_id、place、jewel_type。没有的数不写成 0。
 * 无写库。无 page。空体安全。不替换，不卸下，不一键穿，不一键卸，不合成。不写金币，不写钻石。英雄列表仍是 4001。
 * 从未收到 4101 时主城「英雄宝石」只 Toast，不回落 Mock。不发 4102、4103、4104、4105、4106、4107。不做 9001。
 * s2c 4013 替换本地英雄图鉴。空包体、以及 list 为 0 条，都是已同步的空表。
 * 按 GResIllustratReward 写 ResIllustratRewardData 的 hero_type、star。没有的数不写成 0。
 * 名字像领奖，实为查看。空体安全。无档时服端可能懒建空记录，可接受。不写金币，不写钻石。英雄列表仍是 4001。英雄宝石仍是 4101。
 * 从未收到 4013 时主城「英雄图鉴」只 Toast，不回落 Mock。不发 4014。不把 4013 当领奖再发写号。
 * s2c 74100 替换本地宠物信息。空包体、以及 list 为 0 条，都是已同步的空表。空 list 仍可以是非空外层。
 * 按 GResPetInfoList 写 PSPetInfo 的 pet_id、sys_id、hero_id、level。没有的数不写成 0。
 * 无写库。空体安全。不升级，不携带，不卸下。不写金币，不写钻石。英雄列表仍是 4001。英雄图鉴仍是 4013。
 * 从未收到 74100 时主城「宠物信息」只 Toast，不回落 Mock。不发 74101、74102、74103。不主动发 74105、74106。
 * s2c 51001 替换本地世界等级。空包体是已同步，level 保持缺省，不写成 0。出现的 0 仍写 0。
 * 按 GResWorldLevel 写字段 1 level（int64）。对不上的号按字段号写。无写库。空体安全。
 * 只在 pullIdle 链尾、空 c2s 74100 之后发一次。不夹在 2001 和 3007 中间。不做 20101。不写金币，不写钻石。
 * 从未收到 51001 时主城「世界等级」只 Toast，不回落 Mock。
 * s2c 20001 替换本地基金列表。空包体是已同步，is_buy_foundation 保持缺省，不写成 0。记录为空写「空记录」。
 * 按 GResPromotionList 写字段 1 is_buy_foundation，字段 2 foundation_reward_record（PSMapData 的 key、value）。没有的数不写成 0。
 * 只在 pullIdle 链尾、空 c2s 51001 之后发一次。不发 20018。不发 20004、20010。不做 3007。不写金币，不写钻石。
 * 从未收到 20001 时主城「基金列表」只 Toast，不回落 Mock。
 * s2c 20012 替换本地超值首充记录。空包体是已同步，recharge 保持缺省，不写成 0。已领 idx 为空不写成 0。can_reward 为空写「空记录」。
 * 按 GResFirstRecharge 写字段 1 recharge，字段 2 list（已领 idx），字段 3 can_reward（PSMapData 的 key 是档位，value 0 可领、1 不可）。没有的数不写成 0。
 * 只在 pullIdle 链尾、空 c2s 20001 之后发一次。不发 20013。不做 13260。不写金币，不写钻石。
 * 从未收到 20012 时主城「超值首充」只 Toast，不回落 Mock。
 * s2c 70001 替换本地灵器数据。空包体是已同步，list 为空写「空列表」，不写成 0。
 * 按 GResReikiEquipData 写字段 1 list（PSReikiEquipData 的 hero_id、sys_id、reiki_equip_id）。没有的数不写成 0。
 * 只在 pullIdle 链尾、空 c2s 20012 之后发一次。不发 70002、70003、70004、70005、70006。70007、70008 仅推送，不当拉包请求。不做 20011。不写金币，不写钻石。
 * 从未收到 70001 时主城「灵器数据」只 Toast，不回落 Mock。
 * s2c 73001 替换本地浮空岛时间。空包体是已同步，next_time 和 stage 保持缺省，不写成 0。出现的 0 仍写 0。
 * 按 GResFloatingIslandsTime 写字段 2 next_time、字段 3 stage。没有的数不写成 0。不补字段 1。
 * 只在 pullIdle 链尾、空 c2s 70001 之后发一次。不发 73002、73003、73004。73002 有懒建和日刷写库，不当纯只读。本号无写库。不做 20011。不写金币，不写钻石。
 * 从未收到 73001 时主城「浮空岛时间」只 Toast，不回落 Mock。
 * s2c 74300 替换本地图腾信息。空包体、以及 list 为 0 条，都是已同步的空表。空 list 仍可以是非空外层。
 * 按 GResTotemsInfoList 写字段 1 list（PSTotemsInfo 的 t_id、sys_id、hero_id、level、quality）。没有的数不写成 0。出现的 0 仍写 0。
 * 只在 pullIdle 链尾、空 c2s 73001 之后发一次。不发 74301、74302、74303。74304 仅推送，勿发、勿当拉包。本号无写库。不做 20011。不写金币，不写钻石。与 74100 同城养成段。
 * 从未收到 74300 时主城「图腾信息」只 Toast，不回落 Mock。
 * s2c 68001 替换本地星盘数据。空包体是已同步，maxStar 和 activeAstrolabe 保持缺省，不写成 0。active 为空写「空记录」。activeElem 为空不写成 0。
 * 按 GResAstrolabeData 写字段 1 maxStar，字段 2 active（PSMapData 的 key、value），字段 3 activeElem，字段 4 activeAstrolabe。没有的数不写成 0。出现的 0 仍写 0。
 * 只在 pullIdle 链尾、空 c2s 74300 之后发一次。无 page。不发 68002、68003、68004、68006。68005 是更新星数常量，勿发、勿当拉包。轻懒建，首次 load 可能 astrolabeDao.add 空行。无扣费，无领奖，无日刷写库。管理员认定可接受。不做 20011。不写金币，不写钻石。
 * 从未收到 68001 时主城「星盘数据」只 Toast，不回落 Mock。
 * s2c 75501 替换本地魔方数据。空包体是已同步，open_count 保持缺省，不写成 0。rank_hero 为空不写成 0。trench 为空写「空槽」。
 * 按 GResTweakCube 写字段 1 rank_hero（repeated int64），字段 2 open_count，字段 3 trench（PSTrench 的 index、hero_id、last_change_time）。没有的数不写成 0。出现的 0 仍写 0。
 * 只在 pullIdle 链尾、空 c2s 68001 之后发一次。无 page。不发 75502、75503、75504、75505。75506 是等级推送，勿发、勿当拉包。轻懒建，首次 get 可能 doCreate + tweakCubeDao.add，建免费槽并按战力塞供奉。无扣费，无领奖。管理员认定可接受，同星盘。不做 34001。不做 20011。不写金币，不写钻石。
 * 从未收到 75501 时主城「魔方数据」只 Toast，不回落 Mock。
 * s2c 59001 替换本地圣龙数据。空包体是已同步，identify_level、attr_level、privilege_end_time 保持缺省，不写成 0。identities 为空写「空鉴定」。slots 为空写「空槽位」。
 * 按 GResDragonScanInfo 写字段 1 identify_level，字段 2 attr_level，字段 3 identities（type、start_time、level、speed_add），字段 4 slots（id、sys_id），字段 5 privilege_end_time。没有的数不写成 0。出现的 0 仍写 0。
 * 只在 pullIdle 链尾、空 c2s 75501 之后发一次。无 page。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。59010 是另只读，单独在 59001 之后拉包，勿与 59001 合并成一个请求，勿当写号。轻懒建，首次 dragonDao.add。无扣费，无领奖。不做 34001。不做 20011。不写金币，不写钻石。
 * 从未收到 59001 时主城「圣龙数据」只 Toast，不回落 Mock。
 * s2c 59010 替换本地圣物图鉴。空包体是已同步，sys_id 为空写「空图鉴」，不写成 0。
 * 按 GResDragonCollection 写字段 1 repeated int32 sys_id（图鉴 manuals）。没有的数不写成 0。出现的 0 仍写 0。
 * 只在 pullIdle 链尾、空 c2s 59001 之后发一次。无 page。handler 不读 msg。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。勿与 59001 合并成一个请求。轻懒建，与 59001 同 getDragon / dragonDao.add。无扣费，无领奖。不做 34001。不做 20011。不写金币，不写钻石。
 * 从未收到 59010 时主城「圣物图鉴」只 Toast，不回落 Mock。59001 单独到不算。
 * s2c 55001 替换本地称号列表。空包体是已同步，titles 为空写「空称号」，不写成 0。
 * 按 GResScanTitleList 写字段 1 repeated PSTitle titles（idx、end_time）。end_time：-1 永久，0 未激活，时间戳为到期。没有的数不写成 0。出现的 0 仍写 0。
 * 只在 pullIdle 链尾、空 c2s 59010 之后发一次。无 page。Title.proto 仅 55001 读写对，同模块无写号。轻懒建，TitleService.getTitle → dao.add。无扣费，无领奖，无日刷。34001 另只读接在其后。不做 20011。不写金币，不写钻石。
 * 从未收到 55001 时主城「称号列表」只 Toast，不回落 Mock。59010 单独到不算。
 * s2c 34001 替换本地头像列表。空包体是已同步，idx_list 为空写「空头像」，不写成 0。
 * s2c 32001 替换本地头像框数据。空包体是已同步，units 为空写「空头像框」，不写成 0。
 * 按 GResBorderData 写字段 1 repeated PSBorderUnit units（id、active_state）。没有的数不写成 0。出现的 0 仍写 0。
 * 只在 pullIdle 链尾、空 c2s 34001 之后发一次。无 page。不发 32002 道具激活。不发 32003 使用/切换边框。32003 是服侧推送，当前框过期时服侧可能写 role.borderId 回落并另推，客户端不发、勿当拉包。轻懒建免费框可接受。4402 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。不写金币，不写钻石。
 * 从未收到 32001 时主城「头像框数据」只 Toast，不回落 Mock。34001 单独到不算。
 * 缺的顶栏字段不写，那个格子保持未同步。字段 5 是奖杯，不写进金币。开服天不推。
 * 别的 s2c 仍只记 wire.<cmdId>。解不开就忽略，不抛进拆帧循环。
 */
export class WireSession {
  static net: NetClient | null = null;

  /** s2c 3007 字段 2。没出现过是 null。 */
  static nowIdx: number | null = null;
  /** s2c 3007 字段 3。0 是服上的 0。没出现过是 null。 */
  static maxIdx: number | null = null;
  /** s2c 3004 字段 1。0 是服上的 0。没出现过是 null。 */
  static rewardTime: number | null = null;
  /** s2c 3004 字段 2。0 是服上的 0。没出现过是 null。 */
  static maxRewardTime: number | null = null;
  /** 每处理一帧 s2c 3005 加一。挂机页用来认领回包。 */
  static claimSerial = 0;
  /** 最近一帧 s2c 3005 的说明。不写金币。 */
  static claimNote = "";
  /**
   * s2c 5001 的整表。null 表示这次进主城还没收到 5001。
   * 空数组是已同步的空背包，不是未同步。
   * 缺的 item_id / item_type / num 留 null，不写成 0。
   */
  static bagItems: WireBagItem[] | null = null;
  /** 对不上 list 的外层字段。未同步时是空数组。 */
  static bagMarks: WireBagMark[] = [];
  /**
   * s2c 15000 的列表。null 表示这次进主城还没收到 15000。
   * 空数组是已同步的空邮箱，不是未同步。
   */
  static mailEntries: WireMailEntry[] | null = null;
  /**
   * 收齐的 s2c 4001 名册。null 表示这次进主城还没收到完整的 4001。
   * 空数组是已同步的空名册，不是未同步。
   */
  static heroes: WireHeroEntry[] | null = null;
  /**
   * 收齐的 s2c 17000。null 表示这次进主城还没收到 17000。
   * 空表是已同步，不是未同步。
   */
  static activity: WireActivitySnapshot | null = null;
  /**
   * 收到的 s2c 12010。null 表示这次进主城还没收到 12010。
   * 空 tasks 是已同步的空成就表，不是未同步。
   */
  static achievements: WireAchievementSnapshot | null = null;
  /**
   * 收到的 s2c 18001。null 表示这次进主城还没收到 18001。
   * 空 opponents 是已同步的空对手表，不是未同步。
   */
  static pvp: WirePvpSnapshot | null = null;
  /**
   * 收到的 s2c 22000。null 表示这次进主城还没收到 22000。
   * 空 rows 是已同步的空表，不是未同步。
   */
  static sevenDay: WireSevenDaySnapshot | null = null;
  /**
   * 收到的 s2c 21010。null 表示这次进主城还没收到 21010。
   * 空 tasks 是已同步的空表，不是未同步。
   */
  static goal7: WireGoal7Snapshot | null = null;
  /**
   * 收到的 s2c 27001。null 表示这次进主城还没收到 27001。
   * 空 pools 是已同步的空表，不是未同步。
   */
  static wish: WireWishSnapshot | null = null;
  /**
   * 收到的 s2c 4004。null 表示这次进主城还没收到 4004。
   * 两个次数都没有也是已同步，不是未同步。
   */
  static summon: WireSummonSnapshot | null = null;
  /**
   * 收到的 s2c 13044。null 表示这次进主城还没收到 13044。
   * 空 luckys 是已同步的空表，不是未同步。
   */
  static prophet: WireProphetSnapshot | null = null;
  /**
   * 收到的 s2c 4101。null 表示这次进主城还没收到 4101。
   * 空 heroes 是已同步的空表，不是未同步。
   */
  static jewel: WireJewelSnapshot | null = null;
  /**
   * 收到的 s2c 4013。null 表示这次进主城还没收到 4013。
   * 空 rows 是已同步的空表，不是未同步。
   */
  static illustrat: WireIllustratSnapshot | null = null;
  /**
   * 收到的 s2c 74100。null 表示这次进主城还没收到 74100。
   * 空 rows 是已同步的空表，不是未同步。
   */
  static pet: WirePetSnapshot | null = null;
  /**
   * 收到的 s2c 51001。null 表示这次进主城还没收到 51001。
   * 空包体是已同步，level 为 null，不是未同步，也不写成 0。
   */
  static world: WireWorldSnapshot | null = null;
  /**
   * 收到的 s2c 20001。null 表示这次进主城还没收到 20001。
   * 空包体是已同步，is_buy_foundation 为 null，记录为空，不是未同步，也不写成 0。
   */
  static promotion: WirePromotionSnapshot | null = null;
  /**
   * 收到的 s2c 20012。null 表示这次进主城还没收到 20012。
   * 空包体是已同步，recharge 为 null，已领 idx 和 can_reward 为空，不是未同步，也不写成 0。
   */
  static firstRecharge: WireFirstRechargeSnapshot | null = null;
  /**
   * 收到的 s2c 70001。null 表示这次进主城还没收到 70001。
   * 空包体是已同步，list 为空，不是未同步，也不写成 0。
   */
  static reiki: WireReikiSnapshot | null = null;
  /**
   * 收到的 s2c 73001。null 表示这次进主城还没收到 73001。
   * 空包体是已同步，next_time 和 stage 为 null，不是未同步，也不写成 0。
   */
  static islands: WireIslandsSnapshot | null = null;
  /**
   * 收到的 s2c 74300。null 表示这次进主城还没收到 74300。
   * 空 rows 是已同步的空表，不是未同步，也不写成 0。
   */
  static totems: WireTotemsSnapshot | null = null;
  /**
   * 收到的 s2c 68001。null 表示这次进主城还没收到 68001。
   * 空包体是已同步，maxStar 和 activeAstrolabe 为 null，active 与 activeElem 为空，不是未同步，也不写成 0。
   */
  static astrolabe: WireAstrolabeSnapshot | null = null;
  /**
   * 收到的 s2c 75501。null 表示这次进主城还没收到 75501。
   * 空包体是已同步，open_count 为 null，rank_hero 与 trench 为空，不是未同步，也不写成 0。
   */
  static tweakCube: WireCubeSnapshot | null = null;
  /**
   * 收到的 s2c 59001。null 表示这次进主城还没收到 59001。
   * 空包体是已同步，identify_level、attr_level、privilege_end_time 为 null，identities 与 slots 为空，不是未同步，也不写成 0。
   */
  static dragon: WireDragonSnapshot | null = null;
  /**
   * 收到的 s2c 59010。null 表示这次进主城还没收到 59010。
   * 空包体是已同步，sys_id 为空，不是未同步，也不写成 0。
   */
  static dragonCollection: WireDragonCollectionSnapshot | null = null;
  /**
   * 收到的 s2c 55001。null 表示这次进主城还没收到 55001。
   * 空包体是已同步，titles 为空，不是未同步，也不写成 0。
   */
  static titleList: WireTitleSnapshot | null = null;
  /**
   * 收到的 s2c 34001。null 表示这次进主城还没收到 34001。
   * 空包体是已同步，idx_list 为空，不是未同步，也不写成 0。
   */
  static headPortrait: WireHeadPortraitSnapshot | null = null;
  /**
   * 收到的 s2c 32001。null 表示这次进主城还没收到 32001。
   * 空包体是已同步，units 为空，不是未同步，也不写成 0。
   */
  static border: WireBorderSnapshot | null = null;
  /**
   * 收到的 s2c 4402。null 表示这次进主城还没收到 4402。
   * 空包体是已同步，list 为空，不是未同步，也不写成 0。
   */
  static fashion: WireFashionSnapshot | null = null;
  /**
   * 收到的 s2c 4401。null 表示这次进主城还没收到 4401。
   * 空包体是已同步，list 为空，不是未同步，也不写成 0。
   */
  static wornFashion: WireWornFashionSnapshot | null = null;
  /**
   * 收到的 s2c 4201。null 表示这次进主城还没收到 4201。
   * 空包体是已同步，privilege、end_time 保持缺省，不是未同步，也不写成 0。
   */
  static heroPrayer: WireHeroPrayerSnapshot | null = null;
  /**
   * 收到的 s2c 74104。null 表示这次进主城还没收到 74104。
   * 空包体是已同步，petTypes 为空，不是未同步，也不写成 0。
   */
  static petIllustrate: WirePetIllustrateSnapshot | null = null;
  /**
   * 收到的 s2c 28100。null 表示这次进主城还没收到 28100。
   * 空包体是已同步，reset_count 保持缺省，goddess 为空，不是未同步，也不写成 0。
   */
  static fetter: WireFetterSnapshot | null = null;
  /**
   * 收到的 s2c 28200。null 表示这次进主城还没收到 28200。
   * 空包体是已同步，active_type 为空，use_type 保持缺省，不是未同步，也不写成 0。
   */
  static fetterFashion: WireFetterFashionSnapshot | null = null;
  /**
   * 收到的 s2c 75601。null 表示这次进主城还没收到 75601。
   * 空包体是已同步，shenBinInfos 为空，不是未同步，也不写成 0。
   */
  static shenBin: WireShenBinSnapshot | null = null;
  /**
   * 收到的 s2c 75606。null 表示这次进主城还没收到 75606。
   * 空包体是已同步，occupationInfo 保持缺省，不是未同步，也不写成 0。
   */
  static occupation: WireOccupationSnapshot | null = null;
  /**
   * 收到的 s2c 75615。null 表示这次进主城还没收到 75615。
   * 空包体是已同步，roleShenBins 为空，不是未同步，也不写成 0。
   */
  static roleShenBin: WireRoleShenBinSnapshot | null = null;
  /**
   * 收到的 s2c 28107。null 表示这次进主城还没收到 28107。
   * 空包体是已同步，contracts 为空，不是未同步，也不写成 0。
   */
  static fetterContract: WireFetterContractSnapshot | null = null;
  /**
   * 收到的 s2c 3099。null 表示这次进主城还没收到 3099。
   * 空包体是已同步，unlockIds 为空，不是未同步，也不写成 0。
   */
  static formation: WireFormationSnapshot | null = null;
  /**
   * 收到的 s2c 3101。null 表示这次进主城还没收到 3101。
   * 空包体是已同步，list 为空，assistance_unlock 保持缺省，不是未同步，也不写成 0。
   */
  static lineUp: WireLineUpSnapshot | null = null;
  /**
   * 收到的 s2c 20101。null 表示这次进主城还没收到 20101。
   * 空包体是已同步，promotions 为空，不是未同步，也不写成 0。
   */
  static runningPromotion: WireRunningPromotionSnapshot | null = null;

  private static watched: NetClient | null = null;
  private static offProfile: (() => void) | null = null;
  private static offChapter: (() => void) | null = null;
  private static offIdle: (() => void) | null = null;
  private static offIdleClaim: (() => void) | null = null;
  private static offBag: (() => void) | null = null;
  private static offBagGain: (() => void) | null = null;
  private static offMail: (() => void) | null = null;
  private static offHero: (() => void) | null = null;
  private static offActivity: (() => void) | null = null;
  private static offAchievement: (() => void) | null = null;
  private static offPvp: (() => void) | null = null;
  private static offSeven: (() => void) | null = null;
  private static offSevenPush: (() => void) | null = null;
  private static offGoal: (() => void) | null = null;
  private static offGoalPush: (() => void) | null = null;
  private static offWish: (() => void) | null = null;
  private static offSummon: (() => void) | null = null;
  private static offProphet: (() => void) | null = null;
  private static offJewel: (() => void) | null = null;
  private static offIllustrat: (() => void) | null = null;
  private static offPet: (() => void) | null = null;
  private static offWorld: (() => void) | null = null;
  private static offPromotion: (() => void) | null = null;
  private static offFirstRecharge: (() => void) | null = null;
  private static offReiki: (() => void) | null = null;
  private static offIslands: (() => void) | null = null;
  private static offTotems: (() => void) | null = null;
  private static offAstrolabe: (() => void) | null = null;
  private static offTweakCube: (() => void) | null = null;
  private static offDragon: (() => void) | null = null;
  private static offDragonCollection: (() => void) | null = null;
  private static offTitle: (() => void) | null = null;
  private static offHeadPortrait: (() => void) | null = null;
  private static offBorder: (() => void) | null = null;
  private static offFashion: (() => void) | null = null;
  private static offWornFashion: (() => void) | null = null;
  private static offHeroPrayer: (() => void) | null = null;
  private static offPetIllustrate: (() => void) | null = null;
  private static offFetter: (() => void) | null = null;
  private static offFetterFashion: (() => void) | null = null;
  private static offShenBin: (() => void) | null = null;
  private static offOccupation: (() => void) | null = null;
  private static offRoleShenBin: (() => void) | null = null;
  private static offFetterContract: (() => void) | null = null;
  private static offFormation: (() => void) | null = null;
  private static offLineUp: (() => void) | null = null;
  private static offRunningPromotion: (() => void) | null = null;
  private static pending: WireRoleProfile | null = null;
  private static pendingChapter: WireChapterProgress | null = null;
  private static pendingIdle: WireIdleSnapshot | null = null;
  /** null 表示登录过程里还没看到 5001。空数组是空背包。 */
  private static pendingBag: WireBagItem[] | null = null;
  private static pendingBagMarks: WireBagMark[] = [];
  /** 快照之后、进主城之前到达的 5002。新的 5001 会清掉。 */
  private static pendingGains: WireBagGain[] = [];
  /** null 表示登录过程里还没看到 15000。空数组是空邮箱。 */
  private static pendingMail: WireMailEntry[] | null = null;
  /** null 表示还没收齐一版 4001。空名册的 entries 是空数组。 */
  private static pendingHero: WireHeroList | null = null;
  /** send_status=0 时先攒页，收齐再写入 heroes。 */
  private static heroAcc: WireHeroEntry[] = [];
  private static heroGathering = false;
  private static heroExpect = 1;
  /** null 表示登录过程里还没看到 17000。空表的 rows 是空数组。 */
  private static pendingActivity: WireActivitySnapshot | null = null;
  /** null 表示登录过程里还没看到 12010。空表的 tasks 是空数组。 */
  private static pendingAchievement: WireAchievementSnapshot | null = null;
  /** null 表示登录过程里还没看到 18001。空对手表的 opponents 是空数组。 */
  private static pendingPvp: WirePvpSnapshot | null = null;
  /** null 表示登录过程里还没看到 22000。空表的 rows 是空数组。 */
  private static pendingSeven: WireSevenDaySnapshot | null = null;
  /** null 表示登录过程里还没看到 21010。空表的 tasks 是空数组。 */
  private static pendingGoal: WireGoal7Snapshot | null = null;
  /** null 表示登录过程里还没看到 27001。空表的 pools 是空数组。 */
  private static pendingWish: WireWishSnapshot | null = null;
  /** null 表示登录过程里还没看到 4004。空次数的两个字段都是 null。 */
  private static pendingSummon: WireSummonSnapshot | null = null;
  /** null 表示登录过程里还没看到 13044。空表的 luckys 是空数组。 */
  private static pendingProphet: WireProphetSnapshot | null = null;
  /** null 表示登录过程里还没看到 4101。空表的 heroes 是空数组。 */
  private static pendingJewel: WireJewelSnapshot | null = null;
  /** null 表示登录过程里还没看到 4013。空表的 rows 是空数组。 */
  private static pendingIllustrat: WireIllustratSnapshot | null = null;
  /** null 表示登录过程里还没看到 74100。空表的 rows 是空数组。 */
  private static pendingPet: WirePetSnapshot | null = null;
  /** null 表示登录过程里还没看到 51001。空包体的 level 是 null。 */
  private static pendingWorld: WireWorldSnapshot | null = null;
  /** null 表示登录过程里还没看到 20001。空包体的 is_buy_foundation 是 null，记录是空数组。 */
  private static pendingPromotion: WirePromotionSnapshot | null = null;
  /** null 表示登录过程里还没看到 20012。空包体的 recharge 是 null，已领 idx 和 can_reward 是空数组。 */
  private static pendingFirstRecharge: WireFirstRechargeSnapshot | null = null;
  /** null 表示登录过程里还没看到 70001。空包体的 list 是空数组。 */
  private static pendingReiki: WireReikiSnapshot | null = null;
  /** null 表示登录过程里还没看到 73001。空包体的 next_time 和 stage 是 null。 */
  private static pendingIslands: WireIslandsSnapshot | null = null;
  /** null 表示登录过程里还没看到 74300。空包体的 list 是空数组。 */
  private static pendingTotems: WireTotemsSnapshot | null = null;
  /** null 表示登录过程里还没看到 68001。空包体的 maxStar 和 activeAstrolabe 是 null，active 与 activeElem 是空数组。 */
  private static pendingAstrolabe: WireAstrolabeSnapshot | null = null;
  /** null 表示登录过程里还没看到 75501。空包体的 open_count 是 null，rank_hero 与 trench 是空数组。 */
  private static pendingTweakCube: WireCubeSnapshot | null = null;
  /** null 表示登录过程里还没看到 59001。空包体的 identify_level、attr_level、privilege_end_time 是 null，identities 与 slots 是空数组。 */
  private static pendingDragon: WireDragonSnapshot | null = null;
  /** null 表示登录过程里还没看到 59010。空包体的 sys_id 是空数组。 */
  private static pendingDragonCollection: WireDragonCollectionSnapshot | null = null;
  /** null 表示登录过程里还没看到 55001。空包体的 titles 是空数组。 */
  private static pendingTitle: WireTitleSnapshot | null = null;
  /** null 表示登录过程里还没看到 34001。空包体的 idx_list 是空数组。 */
  private static pendingHeadPortrait: WireHeadPortraitSnapshot | null = null;
  /** null 表示登录过程里还没看到 32001。空包体的 units 是空数组。 */
  private static pendingBorder: WireBorderSnapshot | null = null;
  /** null 表示登录过程里还没看到 4402。空包体的 list 是空数组。 */
  private static pendingFashion: WireFashionSnapshot | null = null;
  /** null 表示登录过程里还没看到 4401。空包体的 list 是空数组。 */
  private static pendingWornFashion: WireWornFashionSnapshot | null = null;
  /** null 表示登录过程里还没看到 4201。空包体的 privilege、end_time 保持缺省。 */
  private static pendingHeroPrayer: WireHeroPrayerSnapshot | null = null;
  /** null 表示登录过程里还没看到 74104。空包体的 petTypes 是空数组。 */
  private static pendingPetIllustrate: WirePetIllustrateSnapshot | null = null;
  /** null 表示登录过程里还没看到 28100。空包体的 reset_count 保持缺省，goddess 是空数组。 */
  private static pendingFetter: WireFetterSnapshot | null = null;
  /** null 表示登录过程里还没看到 28200。空包体的 active_type 是空数组，use_type 保持缺省。 */
  private static pendingFetterFashion: WireFetterFashionSnapshot | null = null;
  /** null 表示登录过程里还没看到 75601。空包体的 shenBinInfos 是空数组。 */
  private static pendingShenBin: WireShenBinSnapshot | null = null;
  /** null 表示登录过程里还没看到 75606。空包体的 occupationInfo 保持缺省。 */
  private static pendingOccupation: WireOccupationSnapshot | null = null;
  /** null 表示登录过程里还没看到 75615。空包体的 roleShenBins 是空数组。 */
  private static pendingRoleShenBin: WireRoleShenBinSnapshot | null = null;
  /** null 表示登录过程里还没看到 28107。空包体的 contracts 是空数组。 */
  private static pendingFetterContract: WireFetterContractSnapshot | null = null;
  /** null 表示登录过程里还没看到 3099。空包体的 unlockIds 是空数组。 */
  private static pendingFormation: WireFormationSnapshot | null = null;
  /** null 表示登录过程里还没看到 3101。空包体的 list 是空数组，assistance_unlock 保持缺省。 */
  private static pendingLineUp: WireLineUpSnapshot | null = null;
  /** null 表示登录过程里还没看到 20101。空包体的 promotions 是空数组。 */
  private static pendingRunningPromotion: WireRunningPromotionSnapshot | null = null;
  private static listeners = new Set<() => void>();

  /** 套接字一开就听。登录回包里如果已经夹着 2001、5001、3007 或 3004，先记下，等角色写入后再套上。 */
  static watch(net: NetClient): void {
    if (
      this.watched === net &&
      this.offProfile &&
      this.offChapter &&
      this.offIdle &&
      this.offIdleClaim &&
      this.offBag &&
      this.offBagGain &&
      this.offMail &&
      this.offHero &&
      this.offActivity &&
      this.offAchievement &&
      this.offPvp &&
      this.offSeven &&
      this.offSevenPush &&
      this.offGoal &&
      this.offGoalPush &&
      this.offWish &&
      this.offSummon &&
      this.offProphet &&
      this.offJewel &&
      this.offIllustrat &&
      this.offPet &&
      this.offWorld &&
      this.offPromotion &&
      this.offFirstRecharge &&
      this.offReiki &&
      this.offIslands &&
      this.offTotems &&
      this.offAstrolabe &&
      this.offTweakCube &&
      this.offDragon &&
      this.offDragonCollection &&
      this.offTitle &&
      this.offHeadPortrait &&
      this.offBorder &&
      this.offFashion &&
      this.offWornFashion &&
      this.offHeroPrayer &&
      this.offPetIllustrate &&
      this.offFetter &&
      this.offFetterFashion &&
      this.offShenBin &&
      this.offOccupation &&
      this.offRoleShenBin &&
      this.offFetterContract &&
      this.offFormation &&
      this.offLineUp &&
      this.offRunningPromotion
    ) {
      return;
    }
    this.unhook();
    this.watched = net;
    this.offProfile = net.subscribe(WIRE_ROLE_CMD, (msg) => this.onRole(msg.data));
    this.offChapter = net.subscribe(WIRE_CHAPTER_CMD, (msg) => this.onChapter(msg.data));
    this.offIdle = net.subscribe(WIRE_IDLE_CMD, (msg) => this.onIdle(msg.data));
    this.offIdleClaim = net.subscribe(WIRE_IDLE_CLAIM_CMD, (msg) => this.onIdleClaim(msg.data));
    this.offBag = net.subscribe(WIRE_BAG_CMD, (msg) => this.onBag(msg.data));
    this.offBagGain = net.subscribe(WIRE_BAG_GAIN_CMD, (msg) => this.onBagGain(msg.data));
    this.offMail = net.subscribe(WIRE_MAIL_CMD, (msg) => this.onMail(msg.data));
    this.offHero = net.subscribe(WIRE_HERO_CMD, (msg) => this.onHero(msg.data));
    this.offActivity = net.subscribe(WIRE_ACTIVITY_CMD, (msg) => this.onActivity(msg.data));
    this.offAchievement = net.subscribe(WIRE_ACHIEVEMENT_CMD, (msg) => this.onAchievement(msg.data));
    this.offPvp = net.subscribe(WIRE_PVP_CMD, (msg) => this.onPvp(msg.data));
    this.offSeven = net.subscribe(WIRE_SEVEN_CMD, (msg) => this.onSevenDay(msg.data));
    this.offSevenPush = net.subscribe(WIRE_SEVEN_PUSH_CMD, (msg) => this.onSevenDayPush(msg.data));
    this.offGoal = net.subscribe(WIRE_GOAL7_CMD, (msg) => this.onGoal7(msg.data));
    this.offGoalPush = net.subscribe(WIRE_GOAL7_PUSH_CMD, (msg) => this.onGoal7Push(msg.data));
    this.offWish = net.subscribe(WIRE_WISH_CMD, (msg) => this.onWish(msg.data));
    this.offSummon = net.subscribe(WIRE_SUMMON_CMD, (msg) => this.onSummon(msg.data));
    this.offProphet = net.subscribe(WIRE_PROPHET_CMD, (msg) => this.onProphet(msg.data));
    this.offJewel = net.subscribe(WIRE_JEWEL_CMD, (msg) => this.onJewel(msg.data));
    this.offIllustrat = net.subscribe(WIRE_ILLUSTRAT_CMD, (msg) => this.onIllustrat(msg.data));
    this.offPet = net.subscribe(WIRE_PET_CMD, (msg) => this.onPet(msg.data));
    this.offWorld = net.subscribe(WIRE_WORLD_CMD, (msg) => this.onWorld(msg.data));
    this.offPromotion = net.subscribe(WIRE_PROMOTION_CMD, (msg) => this.onPromotion(msg.data));
    this.offFirstRecharge = net.subscribe(WIRE_FIRST_CMD, (msg) => this.onFirstRecharge(msg.data));
    this.offReiki = net.subscribe(WIRE_REIKI_CMD, (msg) => this.onReiki(msg.data));
    this.offIslands = net.subscribe(WIRE_ISLANDS_CMD, (msg) => this.onIslands(msg.data));
    this.offTotems = net.subscribe(WIRE_TOTEMS_CMD, (msg) => this.onTotems(msg.data));
    this.offAstrolabe = net.subscribe(WIRE_ASTROLABE_CMD, (msg) => this.onAstrolabe(msg.data));
    this.offTweakCube = net.subscribe(WIRE_CUBE_CMD, (msg) => this.onTweakCube(msg.data));
    this.offDragon = net.subscribe(WIRE_DRAGON_CMD, (msg) => this.onDragon(msg.data));
    this.offDragonCollection = net.subscribe(WIRE_DRAGON_COLLECTION_CMD, (msg) => this.onDragonCollection(msg.data));
    this.offTitle = net.subscribe(WIRE_TITLE_CMD, (msg) => this.onTitle(msg.data));
    this.offHeadPortrait = net.subscribe(WIRE_HEAD_PORTRAIT_CMD, (msg) => this.onHeadPortrait(msg.data));
    this.offBorder = net.subscribe(WIRE_BORDER_CMD, (msg) => this.onBorder(msg.data));
    this.offFashion = net.subscribe(WIRE_FASHION_CMD, (msg) => this.onFashion(msg.data));
    this.offWornFashion = net.subscribe(WIRE_WORN_FASHION_CMD, (msg) => this.onWornFashion(msg.data));
    this.offHeroPrayer = net.subscribe(WIRE_HERO_PRAYER_CMD, (msg) => this.onHeroPrayer(msg.data));
    this.offPetIllustrate = net.subscribe(WIRE_PET_ILLUSTRATE_CMD, (msg) => this.onPetIllustrate(msg.data));
    this.offFetter = net.subscribe(WIRE_FETTER_CMD, (msg) => this.onFetter(msg.data));
    this.offFetterFashion = net.subscribe(WIRE_FETTER_FASHION_CMD, (msg) => this.onFetterFashion(msg.data));
    this.offShenBin = net.subscribe(WIRE_SHENBIN_CMD, (msg) => this.onShenBin(msg.data));
    this.offOccupation = net.subscribe(WIRE_OCCUPATION_CMD, (msg) => this.onOccupation(msg.data));
    this.offRoleShenBin = net.subscribe(WIRE_ROLE_SHENBIN_CMD, (msg) => this.onRoleShenBin(msg.data));
    this.offFetterContract = net.subscribe(WIRE_FETTER_CONTRACT_CMD, (msg) => this.onFetterContract(msg.data));
    this.offFormation = net.subscribe(WIRE_FORMATION_CMD, (msg) => this.onFormation(msg.data));
    this.offLineUp = net.subscribe(WIRE_LINEUP_CMD, (msg) => this.onLineUp(msg.data));
    this.offRunningPromotion = net.subscribe(WIRE_RUNNING_PROMOTION_CMD, (msg) => this.onRunningPromotion(msg.data));
  }

  static hold(net: NetClient): void {
    if (this.net && this.net !== net) this.net.close();
    this.net = net;
    this.watch(net);
  }

  /**
   * 这次进主城还没看到新的 s2c 3007 / 3004 / 5001 / 15000 / 4001 / 17000 / 12010 / 18001 / 22000 / 21010 / 27001 / 4004 / 13044 / 4101 / 4013 / 74100 / 51001 / 20001 / 20012 / 70001 / 73001 / 74300 / 68001 / 75501 / 59001 / 59010 / 55001 / 34001 / 32001 / 4402 / 4401 / 4201。丢掉上一名角色的 idx、挂机时间、背包、邮件、英雄、点金、成就、竞技场、七日登录、七日目标、许愿池、召唤次数、先知召唤幸运值、英雄宝石、英雄图鉴、宠物信息、世界等级、基金列表、超值首充记录、灵器数据、浮空岛时间、图腾信息、星盘数据、魔方数据、圣龙数据、圣物图鉴、称号列表、头像列表、头像框数据、激活皮肤列表、穿戴皮肤英雄列表和英雄祈愿数据。
   * 登录过程中先到的包仍留在 pending，接着 flush 再写。
   */
  static prepareCity(): void {
    this.nowIdx = null;
    this.maxIdx = null;
    this.rewardTime = null;
    this.maxRewardTime = null;
    this.claimNote = "";
    this.claimSerial = 0;
    this.bagItems = null;
    this.bagMarks = [];
    this.mailEntries = null;
    this.heroes = null;
    this.activity = null;
    this.achievements = null;
    this.pvp = null;
    this.sevenDay = null;
    this.goal7 = null;
    this.wish = null;
    this.summon = null;
    this.prophet = null;
    this.jewel = null;
    this.illustrat = null;
    this.pet = null;
    this.world = null;
    this.promotion = null;
    this.firstRecharge = null;
    this.reiki = null;
    this.islands = null;
    this.totems = null;
    this.astrolabe = null;
    this.tweakCube = null;
    this.dragon = null;
    this.dragonCollection = null;
    this.titleList = null;
    this.headPortrait = null;
    this.border = null;
    this.fashion = null;
    this.wornFashion = null;
    this.heroPrayer = null;
    this.petIllustrate = null;
    this.fetter = null;
    this.fetterFashion = null;
    this.shenBin = null;
    this.occupation = null;
    this.roleShenBin = null;
    this.fetterContract = null;
    this.formation = null;
    this.lineUp = null;
    this.runningPromotion = null;
  }

  /** 只放下引用。调用方自己 close。 */
  static release(net: NetClient | null): void {
    if (net && this.net === net) this.net = null;
    if (net && this.watched === net) {
      this.unhook();
      this.watched = null;
      this.pending = null;
      this.pendingChapter = null;
      this.pendingIdle = null;
      this.pendingBag = null;
      this.pendingBagMarks = [];
      this.pendingGains = [];
      this.pendingMail = null;
      this.pendingHero = null;
      this.pendingActivity = null;
      this.pendingAchievement = null;
      this.pendingPvp = null;
      this.pendingSeven = null;
      this.pendingGoal = null;
      this.pendingWish = null;
      this.pendingSummon = null;
      this.pendingProphet = null;
      this.pendingJewel = null;
      this.pendingIllustrat = null;
      this.pendingPet = null;
      this.pendingWorld = null;
      this.pendingPromotion = null;
      this.pendingFirstRecharge = null;
      this.pendingReiki = null;
      this.pendingIslands = null;
      this.pendingTotems = null;
      this.pendingAstrolabe = null;
      this.pendingTweakCube = null;
      this.pendingDragon = null;
      this.pendingDragonCollection = null;
      this.pendingTitle = null;
      this.pendingHeadPortrait = null;
      this.pendingBorder = null;
      this.pendingFashion = null;
      this.pendingWornFashion = null;
      this.pendingHeroPrayer = null;
      this.pendingPetIllustrate = null;
      this.pendingFetter = null;
      this.pendingFetterFashion = null;
      this.pendingShenBin = null;
      this.pendingOccupation = null;
      this.pendingRoleShenBin = null;
      this.pendingFetterContract = null;
      this.pendingFormation = null;
      this.pendingLineUp = null;
      this.pendingRunningPromotion = null;
      this.resetHeroGather();
      this.nowIdx = null;
      this.maxIdx = null;
      this.rewardTime = null;
      this.maxRewardTime = null;
      this.claimNote = "";
      this.claimSerial = 0;
      this.bagItems = null;
      this.bagMarks = [];
      this.mailEntries = null;
      this.heroes = null;
      this.activity = null;
      this.achievements = null;
      this.pvp = null;
      this.sevenDay = null;
      this.goal7 = null;
      this.wish = null;
      this.summon = null;
      this.prophet = null;
      this.jewel = null;
      this.illustrat = null;
      this.pet = null;
      this.world = null;
      this.promotion = null;
      this.firstRecharge = null;
      this.reiki = null;
      this.islands = null;
      this.totems = null;
      this.astrolabe = null;
      this.tweakCube = null;
      this.dragon = null;
      this.dragonCollection = null;
      this.titleList = null;
      this.headPortrait = null;
      this.border = null;
      this.fashion = null;
      this.wornFashion = null;
      this.heroPrayer = null;
    this.petIllustrate = null;
    this.fetter = null;
    this.fetterFashion = null;
    this.shenBin = null;
    this.occupation = null;
    this.roleShenBin = null;
    this.fetterContract = null;
    this.formation = null;
    this.lineUp = null;
    this.runningPromotion = null;
    }
  }

  static close(): void {
    const net = this.net;
    this.net = null;
    this.unhook();
    this.watched = null;
    this.pending = null;
    this.pendingChapter = null;
    this.pendingIdle = null;
    this.pendingBag = null;
    this.pendingBagMarks = [];
    this.pendingGains = [];
    this.pendingMail = null;
    this.pendingHero = null;
    this.pendingActivity = null;
    this.pendingAchievement = null;
    this.pendingPvp = null;
    this.pendingSeven = null;
    this.pendingGoal = null;
    this.pendingWish = null;
    this.pendingSummon = null;
    this.pendingProphet = null;
    this.pendingJewel = null;
    this.pendingIllustrat = null;
    this.pendingPet = null;
    this.pendingWorld = null;
    this.pendingPromotion = null;
    this.pendingFirstRecharge = null;
    this.pendingReiki = null;
    this.pendingIslands = null;
    this.pendingTotems = null;
    this.pendingAstrolabe = null;
    this.pendingTweakCube = null;
    this.pendingDragon = null;
    this.pendingDragonCollection = null;
    this.pendingTitle = null;
    this.pendingHeadPortrait = null;
    this.pendingBorder = null;
    this.pendingFashion = null;
    this.pendingWornFashion = null;
    this.pendingHeroPrayer = null;
    this.pendingPetIllustrate = null;
    this.pendingFetter = null;
    this.pendingFetterFashion = null;
    this.pendingShenBin = null;
    this.pendingOccupation = null;
    this.pendingRoleShenBin = null;
    this.pendingFetterContract = null;
    this.pendingFormation = null;
      this.pendingLineUp = null;
      this.pendingRunningPromotion = null;
    this.resetHeroGather();
    this.nowIdx = null;
    this.maxIdx = null;
    this.rewardTime = null;
    this.maxRewardTime = null;
    this.claimNote = "";
    this.claimSerial = 0;
    this.bagItems = null;
    this.bagMarks = [];
    this.mailEntries = null;
    this.heroes = null;
    this.activity = null;
    this.achievements = null;
    this.pvp = null;
    this.sevenDay = null;
    this.goal7 = null;
    this.wish = null;
    this.summon = null;
    this.prophet = null;
    this.jewel = null;
    this.illustrat = null;
    this.pet = null;
    this.world = null;
    this.promotion = null;
    this.firstRecharge = null;
    this.reiki = null;
    this.islands = null;
    this.totems = null;
    this.astrolabe = null;
    this.tweakCube = null;
    this.dragon = null;
    this.dragonCollection = null;
    this.titleList = null;
    this.headPortrait = null;
    this.border = null;
    this.fashion = null;
    this.wornFashion = null;
    this.heroPrayer = null;
    this.petIllustrate = null;
    this.fetter = null;
    this.fetterFashion = null;
    this.shenBin = null;
    this.occupation = null;
    this.roleShenBin = null;
    this.fetterContract = null;
    this.formation = null;
    this.lineUp = null;
    this.runningPromotion = null;
    if (net) net.close();
  }

  /** 顶栏或主线按钮有变化时通知。MainApp 用来重画。 */
  static onSync(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** applyWireRole 之后调用。登录过程中先到的资料在这里写上。 */
  static flush(): void {
    this.commit();
    this.commitChapter();
    this.commitIdle();
    this.commitBag();
    this.commitMail();
    this.commitHero();
    this.commitActivity();
    this.commitAchievement();
    this.commitPvp();
    this.commitSevenDay();
    this.commitGoal7();
    this.commitWish();
    this.commitSummon();
    this.commitProphet();
    this.commitJewel();
    this.commitIllustrat();
    this.commitPet();
    this.commitWorld();
    this.commitPromotion();
    this.commitFirstRecharge();
    this.commitReiki();
    this.commitIslands();
    this.commitTotems();
    this.commitAstrolabe();
    this.commitTweakCube();
    this.commitDragon();
    this.commitDragonCollection();
    this.commitTitle();
    this.commitHeadPortrait();
    this.commitBorder();
    this.commitFashion();
    this.commitWornFashion();
    this.commitHeroPrayer();
    this.commitPetIllustrate();
    this.commitFetter();
    this.commitFetterFashion();
    this.commitShenBin();
    this.commitOccupation();
    this.commitRoleShenBin();
    this.commitFetterContract();
    this.commitFormation();
    this.commitLineUp();
    this.commitRunningPromotion();
  }

  /**
   * 空的 c2s 2001，紧接着空的 c2s 5001。
   * Boot 仍只调用这一处再调用 pullChapter / pullIdle，所以不改 Boot.ts。
   * 相对顺序因此是 2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101。
   * 15000、4001、17000、12010、18001、22000、21010、27001、4004、13044、4101、4013、74100、51001、20001、20012、70001、73001、74300、68001、75501、59001、59010、55001、34001、32001、4402、4401、4201、74104 、28100、28200、75601、75606、75615、28107、3099、3101 和 20101 在 pullIdle 里，跟在 3004 后面。4001 带 page=1，不是空体。17000、12010、18001、22000、21010、27001、4004、13044、4101、4013、74100、51001、20001、20012、70001、73001、74300、68001、75501、59001、59010、55001、34001、32001、4402、4401、4201、74104 、28100、28200、75601、75606、75615、28107、3099、3101 和 20101 是空体。20101 的空帧是 04000000854e0000。75606 的空帧是 0400000056270100，不是 75607。75615 的空帧是 040000005f270100，不是 75607。
   */
  static pullRoleProfile(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ROLE_CMD);
    this.pullBackpack();
  }

  /** 空的 c2s 5001。GReqBackPackList 没有包体。 */
  static pullBackpack(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_BAG_CMD);
  }

  /** 收到过 s2c 5001（含空包体）才算同步。5002 单独到不算。 */
  static hasBag(): boolean {
    return this.bagItems !== null;
  }

  /**
   * 空的 c2s 3007。旧桥日志三例都在 c2s 2001 之后的进游戏同步里发这一帧，包体是空的。
   * 这里跟在 pullRoleProfile 后面发。pullRoleProfile 已经先发了空的 5001。
   * 不等 s2c 2001，也不发夹在中间的其它号。
   */
  static pullChapter(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_CHAPTER_CMD);
  }

  /** 主城「主线」按钮。还没有 now_idx / max_idx 时是「主线 · 未同步」。 */
  static mainlineLabel(): string {
    return formatWireMainline(this.nowIdx, this.maxIdx);
  }

  /** 主城主线入口。两个 idx 都没出现过就不打开只读页。max_idx=0 算有。 */
  static hasChapter(): boolean {
    return wireChapterHasIdx({ nowIdx: this.nowIdx, maxIdx: this.maxIdx });
  }

  /**
   * 空的 c2s 3004，紧接着空的 c2s 15000，再发 c2s 4001 page=1，然后空的 c2s 17000，再发空的 c2s 12010，再发空的 c2s 18001，再发空的 c2s 22000，再发空的 c2s 21010，再发空的 c2s 27001，再发空的 c2s 4004，再发空的 c2s 13044，再发空的 c2s 4101，再发空的 c2s 4013，再发空的 c2s 74100，再发空的 c2s 51001，再发空的 c2s 20001，再发空的 c2s 20012，再发空的 c2s 70001，再发空的 c2s 73001，再发空的 c2s 74300，再发空的 c2s 68001，再发空的 c2s 75501，再发空的 c2s 59001，再发空的 c2s 59010，再发空的 c2s 55001，再发空的 c2s 34001，再发空的 c2s 32001，再发空的 c2s 4402，再发空的 c2s 4401，再发空的 c2s 4201，再发空的 c2s 74104，再发空的 c2s 28100，再发空的 c2s 28200，再发空的 c2s 75601，再发空的 c2s 75606，再发空的 c2s 75615，再发空的 c2s 28107，再发空的 c2s 3099，再发空的 c2s 3101，再发空的 c2s 20101。
   * 跟在 pullChapter 后面发，不等 s2c 2001。51001 在 74100 之后发一次，20001 接在 51001 之后，20012 接在 20001 之后，70001 接在 20012 之后，73001 接在 70001 之后，74300 接在 73001 之后，68001 接在 74300 之后，75501 接在 68001 之后，59001 接在 75501 之后，59010 接在 59001 之后，55001 接在 59010 之后，34001 接在 55001 之后，32001 接在 34001 之后，4402 接在 32001 之后，4401 接在 4402 之后，4201 接在 4401 之后，74104 接在 4201 之后，28100 接在 74104 之后，28200 接在 28100 之后，75601 接在 28200 之后，75606 接在 75601 之后，75615 接在 75606 之后，28107 接在 75615 之后，3099 接在 28107 之后，3101 接在 3099 之后，20101 接在 3101 之后。不夹在 2001 和 3007 中间。不做 3007 的加发。
   * 3004 在空 c2s 3007 之后，包体是空的。15000、4001、17000、12010、18001、22000、21010、27001、4004、13044、4101、4013、74100、51001、20001、20012、70001、73001、74300、68001、75501、59001、59010、55001、34001、32001、4402、4401、4201 和 74104 接在 3004 后，不改 Boot.ts。
   * 不发 20018，也不发 20004、20010，也不发 20013，也不发 13260，也不发 12020，也不发 18002，也不发 22001，也不发 21011、21012，也不发 27002、27003、27004，也不发 4202。74104 是另只读，接在 4201 之后，勿与 4201 或 74100 合并。也不发 4002、4005，也不发 58001、58007，也不发 13041、13042、13043，也不发 4102、4103、4104、4105、4106、4107，也不发 9001，也不发 4014，也不发 74101、74102、74103、74105、74106，20101 是进行中活动空体，挂在 3101 之后，不发 20102。17000 不点金。12010 不领奖。18001 不开战。22000 不领奖。21010 不发奖。27001 不刷新，不抽奖，不领幸运奖。4004 不召唤，不领累积奖。4004 不是 4001。13044 不抽，不置换，不确认置换。13044 不是 4004。4101 不替换，不卸下，不一键穿，不一键卸，不合成。4101 不是 4001，也不是 13044。4013 不领奖。4013 不是 4001，也不是 4101。4014 仅 s2c 推送。74100 不升级，不携带，不卸下。74100 不是 4001，也不是 4013。74105、74106 仅 s2c 推送。51001 无写操作号。20001 不领奖。20012 不领奖。70001 不激活，不穿，不卸，不转换，不合成。70007、70008 仅推送。不做 20011。73001 不挑战，不买次数。不发 73002、73003、73004。73002 有懒建和日刷写库。本号无写库。不做 20011。74300 不升级，不升阶，不装备，不卸下，不更换，不重置。不发 74301、74302、74303。74304 仅推送，勿当拉包。本号无写库。不做 20011。68001 不激活元素，不点亮星盘，不重置，不激活星盘。不发 68002、68003、68004、68006。68005 是更新星数常量，勿当拉包。无 page。轻懒建，首次 load 可能 astrolabeDao.add 空行。无扣费，无领奖，无日刷写库。管理员认定可接受。不做 20011。75501 不添加，不卸下，不开格子，不清 cd。不发 75502、75503、75504、75505。75506 是等级推送，勿当拉包。无 page。轻懒建，首次 get 可能 doCreate + tweakCubeDao.add，建免费槽并按战力塞供奉。无扣费，无领奖。管理员认定可接受，同星盘。不做 34001。不做 20011。59001 不放源石，不提升鉴定，不加速鉴定，不领鉴定奖，不提升圣龙等级，不替换圣物，不调顺序，不升星，不分解。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。59010 是另只读，单独在 59001 之后拉包，勿与 59001 合并成一个请求，勿当写号。无 page。轻懒建，首次 dragonDao.add。无扣费，无领奖。不做 34001。不做 20011。55001 只读，无 page。Title.proto 仅 55001 读写对，同模块无写号。轻懒建，TitleService.getTitle → dao.add。无扣费，无领奖，无日刷。34001 是另只读，单独在 55001 之后拉包，勿与 55001 合并。不发 34002。34003 是解锁推送，勿发、勿当拉包。32001 另只读接在其后。不做 20011。34001 只读，无 page。轻懒建，RoleHeadPortraitService.select 无记录则 dao.add 默认解锁头。无扣费，无领奖，不改当前头像。4402 只读，无 page。不发 4403 激活、4404 替换/使用、4405 皮肤升级。4406 无实现，勿发。4401 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。过期限时皮剔除，并可能把英雄 fashionId 置 0。只读展示。无扣费，无领奖。挂在 32001 之后。
   */
  static pullIdle(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_IDLE_CMD);
    this.pullMail();
    this.pullHero();
    this.pullActivity();
    this.pullAchievement();
    this.pullPvp();
    this.pullSevenDay();
    this.pullGoal7();
    this.pullWish();
    this.pullSummon();
    this.pullProphet();
    this.pullJewel();
    this.pullIllustrat();
    this.pullPet();
    this.pullWorld();
    this.pullPromotion();
    this.pullFirstRecharge();
    this.pullReiki();
    this.pullIslands();
    this.pullTotems();
    this.pullAstrolabe();
    this.pullTweakCube();
    this.pullDragon();
    this.pullDragonCollection();
    this.pullTitleList();
    this.pullHeadPortrait();
    this.pullBorder();
    this.pullFashion();
    this.pullWornFashion();
    this.pullHeroPrayer();
    this.pullPetIllustrate();
    this.pullFetter();
    this.pullFetterFashion();
    this.pullShenBin();
    this.pullOccupation();
    this.pullRoleShenBin();
    this.pullFetterContract();
    this.pullFormation();
    this.pullLineUp();
    this.pullRunningPromotion();
  }

  /** 空的 c2s 15000。没有包体。不发领取和删除。 */
  static pullMail(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_MAIL_CMD);
  }

  /** 收到过 s2c 15000（含空包体）才算同步。解不开的包不算。 */
  static hasMail(): boolean {
    return this.mailEntries !== null;
  }

  /**
   * c2s 4001，GReqHeroList.page。缺省和小于 1 都按 1 发，不发空体。
   * page=1 会丢掉还没收齐的翻页。不发升级。
   */
  static pullHero(page = 1): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    const safe = page >= 1 && Number.isFinite(page) ? Math.floor(page) : 1;
    if (safe === 1) this.resetHeroGather();
    net.send(WIRE_HERO_CMD, { page: safe });
  }

  /** 收齐过 s2c 4001（含空名册）才算同步。空体和解不开的包不算。 */
  static hasHero(): boolean {
    return this.heroes !== null;
  }

  /** 空的 c2s 17000。没有包体。不点金。 */
  static pullActivity(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ACTIVITY_CMD);
  }

  /** 收到过 s2c 17000（含空包体）才算同步。解不开的包不算。 */
  static hasActivity(): boolean {
    return this.activity !== null;
  }

  /** 空的 c2s 12010。没有包体。不领奖。服端可能因此补成就。 */
  static pullAchievement(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ACHIEVEMENT_CMD);
  }

  /** 收到过 s2c 12010（含空包体、含空 task）才算同步。解不开的包不算。 */
  static hasAchievement(): boolean {
    return this.achievements !== null;
  }

  /** 空的 c2s 18001。GReqPvpData 没有包体。不开战，不刷新，不买票，不点赞。 */
  static pullPvp(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_PVP_CMD);
  }

  /** 收到过 s2c 18001（含空包体、含空对手表）才算同步。解不开的包不算。 */
  static hasPvp(): boolean {
    return this.pvp !== null;
  }

  /** 空的 c2s 22000。GReqSevenDayLoginData 没有包体。不领奖。 */
  static pullSevenDay(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_SEVEN_CMD);
  }

  /** 收到过 s2c 22000（含空包体、含空表）才算同步。解不开的包不算。22002 单独到不算。 */
  static hasSevenDay(): boolean {
    return this.sevenDay !== null;
  }

  /** 空的 c2s 21010。GReqSevenDayTargetList 没有包体。不发奖。可能建档并懒填计数。 */
  static pullGoal7(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_GOAL7_CMD);
  }

  /** 收到过 s2c 21010（含空包体、含空表）才算同步。解不开的包不算。21013 单独到不算。 */
  static hasGoal7(): boolean {
    return this.goal7 !== null;
  }

  /** 空的 c2s 27001。没有包体。不刷新，不抽奖，不领幸运奖。可能懒建或跨日写库，无扣费。 */
  static pullWish(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_WISH_CMD);
  }

  /** 收到过 s2c 27001（含空包体、含空表）才算同步。解不开的包不算。 */
  static hasWish(): boolean {
    return this.wish !== null;
  }

  /** 空的 c2s 4004。没有包体，也没有 page。不召唤，不领累积奖。可能懒建 HeroSummon。 */
  static pullSummon(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_SUMMON_CMD);
  }

  /** 收到过 s2c 4004（含空包体）才算同步。解不开的包不算。 */
  static hasSummon(): boolean {
    return this.summon !== null;
  }

  /** 空的 c2s 13044。GReqProphetSummonInfo 没有包体。不抽，不置换，不确认置换。可能懒建 HeroSummon。跨日可能重置 levelResetTimes。 */
  static pullProphet(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_PROPHET_CMD);
  }

  /** 收到过 s2c 13044（含空包体、含空表）才算同步。解不开的包不算。 */
  static hasProphet(): boolean {
    return this.prophet !== null;
  }

  /** 空的 c2s 4101。GReqHeroJewel 没有包体，也没有 page。不替换，不卸下，不合成。无写库。 */
  static pullJewel(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_JEWEL_CMD);
  }

  /** 收到过 s2c 4101（含空包体、含空表）才算同步。解不开的包不算。 */
  static hasJewel(): boolean {
    return this.jewel !== null;
  }

  /** 空的 c2s 4013。GReqIllustratReward 没有包体。名字像领奖，实为查看。不发 4014。无档时服端可能懒建空记录。 */
  static pullIllustrat(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ILLUSTRAT_CMD);
  }

  /** 收到过 s2c 4013（含空包体、含空表）才算同步。解不开的包不算。4014 单独到不算。 */
  static hasIllustrat(): boolean {
    return this.illustrat !== null;
  }

  /** 空的 c2s 74100。GReqPetInfoList 没有包体。不升级，不携带，不卸下。不主动发 74105、74106。无写库。 */
  static pullPet(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_PET_CMD);
  }

  /** 收到过 s2c 74100（含空包体、含空表）才算同步。解不开的包不算。74105、74106 单独到不算。 */
  static hasPet(): boolean {
    return this.pet !== null;
  }

  /** 空的 c2s 51001。GReqWorldLevel 没有包体。只在 74100 之后发一次。不做 20101。无写库。 */
  static pullWorld(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_WORLD_CMD);
  }

  /** 收到过 s2c 51001（含空包体）才算同步。解不开的包不算。20101 单独到不算。 */
  static hasWorld(): boolean {
    return this.world !== null;
  }

  /** 空的 c2s 20001。GReqPromotionList 没有包体。只在 51001 之后发一次。不发 20018。不发 20004、20010。不做 3007。 */
  static pullPromotion(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_PROMOTION_CMD);
  }

  /** 收到过 s2c 20001（含空包体）才算同步。解不开的包不算。20018、20004、20010 单独到不算。 */
  static hasPromotion(): boolean {
    return this.promotion !== null;
  }

  /** 空的 c2s 20012。GReqFirstRecharge 没有包体。只在 20001 之后发一次。不发 20013。不做 13260。 */
  static pullFirstRecharge(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_FIRST_CMD);
  }

  /** 收到过 s2c 20012（含空包体）才算同步。解不开的包不算。20013、13260 单独到不算。 */
  static hasFirstRecharge(): boolean {
    return this.firstRecharge !== null;
  }

  /** 空的 c2s 70001。GReqReikiEquipData 没有包体。只在 20012 之后发一次。不发 70002、70003、70004、70005、70006。不做 20011。70007、70008 不当拉包请求。 */
  static pullReiki(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_REIKI_CMD);
  }

  /** 收到过 s2c 70001（含空包体）才算同步。解不开的包不算。70002–70008、20011 单独到不算。 */
  static hasReiki(): boolean {
    return this.reiki !== null;
  }

  /** 空的 c2s 73001。GReqFloatingIslandsTime 没有包体。只在 70001 之后发一次。不发 73002、73003、73004。不做 20011。本号无写库。 */
  static pullIslands(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ISLANDS_CMD);
  }

  /** 收到过 s2c 73001（含空包体）才算同步。解不开的包不算。73002、73003、73004、20011 单独到不算。 */
  static hasIslands(): boolean {
    return this.islands !== null;
  }

  /** 空的 c2s 74300。GReqTotemsInfoList 没有包体。只在 73001 之后发一次。不发 74301、74302、74303。74304 不当拉包请求。不做 20011。本号无写库。 */
  static pullTotems(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_TOTEMS_CMD);
  }

  /** 收到过 s2c 74300（含空包体、含空表）才算同步。解不开的包不算。74301、74302、74303、74304、20011 单独到不算。 */
  static hasTotems(): boolean {
    return this.totems !== null;
  }

  /** 空的 c2s 68001。GReqAstrolabeData 没有包体，没有 page。只在 74300 之后发一次。不发 68002、68003、68004、68006。68005 不当拉包请求。不做 20011。轻懒建可接受。 */
  static pullAstrolabe(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ASTROLABE_CMD);
  }

  /** 收到过 s2c 68001（含空包体）才算同步。解不开的包不算。68002、68003、68004、68005、68006、20011 单独到不算。 */
  static hasAstrolabe(): boolean {
    return this.astrolabe !== null;
  }

  /** 空的 c2s 75501。GReqTweakCube 没有包体，没有 page。只在 68001 之后发一次。不发 75502、75503、75504、75505。75506 不当拉包请求。不做 34001。不做 20011。轻懒建可接受，同星盘。 */
  static pullTweakCube(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_CUBE_CMD);
  }

  /** 收到过 s2c 75501（含空包体）才算同步。解不开的包不算。75502、75503、75504、75505、75506、34001、20011 单独到不算。 */
  static hasTweakCube(): boolean {
    return this.tweakCube !== null;
  }

  /** 空的 c2s 59001。GReqDragonScanInfo 没有包体，没有 page。只在 75501 之后发一次。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。59010 单独在其后拉包，勿与本请求合并，勿当写号。不做 34001。不做 20011。轻懒建可接受。 */
  static pullDragon(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_DRAGON_CMD);
  }

  /** 收到过 s2c 59001（含空包体）才算同步。解不开的包不算。59002、59003、59005、59006、59007、59008、59009、59010、59011、59012、59013、34001、20011 单独到不算。 */
  static hasDragon(): boolean {
    return this.dragon !== null;
  }

  /** 空的 c2s 59010。GReqDragonCollection 没有包体，没有 page。只在 59001 之后发一次。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。勿与 59001 合并成一个请求。不做 34001。不做 20011。轻懒建可接受。 */
  static pullDragonCollection(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_DRAGON_COLLECTION_CMD);
  }

  /** 收到过 s2c 59010（含空包体）才算同步。解不开的包不算。59001、59002、59003、59005、59006、59007、59008、59009、59011、59012、59013、34001、20011 单独到不算。 */
  static hasDragonCollection(): boolean {
    return this.dragonCollection !== null;
  }

  /** 空的 c2s 55001。GReqScanTitleList 没有包体，没有 page。只在 59010 之后发一次。Title.proto 仅 55001 读写对，同模块无写号。34001 另只读接在其后，勿合并。不做 20011。轻懒建可接受。 */
  static pullTitleList(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_TITLE_CMD);
  }

  /** 收到过 s2c 55001（含空包体）才算同步。解不开的包不算。59010、59001、34001、34002、34003、32001、20011 单独到不算。 */
  static hasTitleList(): boolean {
    return this.titleList !== null;
  }

  /** 空的 c2s 34001。GReqHeadPortraitList 没有包体，没有 page。只在 55001 之后发一次。不发 34002。34003 不当拉包。32001 另只读接在其后。不做 20011。轻懒建可接受。 */
  static pullHeadPortrait(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_HEAD_PORTRAIT_CMD);
  }

  /** 收到过 s2c 34001（含空包体）才算同步。解不开的包不算。55001、34002、34003、32001、32002、32003、20011 单独到不算。 */
  static hasHeadPortrait(): boolean {
    return this.headPortrait !== null;
  }

  /** 空的 c2s 32001。GReqBorderData 没有包体，没有 page。只在 34001 之后发一次。不发 32002。不发 32003。32003 不当拉包。4402 另只读接在其后。不做 20011。29001 有 page，硬禁。轻懒建免费框可接受。 */
  static pullBorder(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_BORDER_CMD);
  }

  /** 收到过 s2c 32001（含空包体）才算同步。解不开的包不算。34001、32002、32003、4402、29001、20011 单独到不算。 */
  static hasBorder(): boolean {
    return this.border !== null;
  }

  /** 空的 c2s 4402。GReqHeroFashionList 没有包体，没有 page。只在 32001 之后发一次。不发 4403、4404、4405。4406 无实现，勿发。4401 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。 */
  static pullFashion(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_FASHION_CMD);
  }

  /** 收到过 s2c 4402（含空包体）才算同步。解不开的包不算。32001、4401、4403、4404、4405、4406、29001、20011 单独到不算。 */
  static hasFashion(): boolean {
    return this.fashion !== null;
  }

  /** 空的 c2s 4401。GReqHeroFashion 没有包体，没有 page。只在 4402 之后发一次。不发 4403、4404、4405。4406 无实现，勿发。与 4402 分刀，勿合并。本刀不重复拉 4402。4201 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。 */
  static pullWornFashion(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_WORN_FASHION_CMD);
  }

  /** 收到过 s2c 4401（含空包体）才算同步。解不开的包不算。4402、4403、4404、4405、4406、4601、4201、4202、74104、29001、20011 单独到不算。 */
  static hasWornFashion(): boolean {
    return this.wornFashion !== null;
  }

  /** 空的 c2s 4201。GReqHeroPrayerData 没有包体，没有 page。只在 4401 之后发一次。不发 4202。74104 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 4401 分刀，勿合并。本刀不重复拉 4401。轻懒建 hero_prayer 可接受。 */
  static pullHeroPrayer(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_HERO_PRAYER_CMD);
  }

  /** 收到过 s2c 4201（含空包体）才算同步。解不开的包不算。4401、4402、4202、74104、4601、29001、20011 单独到不算。 */
  static hasHeroPrayer(): boolean {
    return this.heroPrayer !== null;
  }

  /** 空的 c2s 74104。GReqPetIllustrate 没有包体，没有 page。只在 4201 之后发一次。不发 74101、74102、74103。74105、74106 是背包增减推送，勿当拉包。28100 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74100、4201 分开发，勿合并。本刀不重复拉 74100，也不重复拉 4201。轻懒建空 PetIllustrate 可接受。 */
  static pullPetIllustrate(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_PET_ILLUSTRATE_CMD);
  }

  /** 收到过 s2c 74104（含空包体）才算同步。解不开的包不算。74100、74101、74102、74103、74105、74106、4201、28101、4601、29001、20011 单独到不算。28100 是下一帧，单独到不算这一份。 */
  static hasPetIllustrate(): boolean {
    return this.petIllustrate !== null;
  }

  /** 空的 c2s 28100。GReqFetterList 没有包体，没有 page。只在 74104 之后发一次。不发 28101、28102、28104、28105、28106、28108、28109。不发 28002、28003。28200 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74104、4201 分开发，勿合并。本刀不重复拉 74104，也不重复拉 4201。轻懒建（load/getFetterTask）可接受。 */
  static pullFetter(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_FETTER_CMD);
  }

  /** 收到过 s2c 28100（含空包体）才算同步。解不开的包不算。74104、4201、28101、28102、28104、28105、28106、28108、28109、28002、28003、28200、4601、29001、20011 单独到不算。 */
  static hasFetter(): boolean {
    return this.fetter !== null;
  }

  /** 空的 c2s 28200。GReqFashionData 没有包体，没有 page。只在 28100 之后发一次。不发 28201、28202、28203、28204、28205。28203 任务列表虽只读，本刀勿夹发。不发 28101–28109、28002、28003。75601 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28100、74104 分开发，勿合并。本刀不重复拉 28100，也不重复拉 74104。轻懒建 goddess_fashion 可接受。无扣费，无发奖，不改皮肤。 */
  static pullFetterFashion(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_FETTER_FASHION_CMD);
  }

  /** 收到过 s2c 28200（含空包体）才算同步。解不开的包不算。28100、74104、28201、28202、28203、28204、28205、28101、28102、28103、28104、28105、28106、28107、28108、28109、28002、28003、75601、4601、29001、20011 单独到不算。75601 是下一帧，单独到不算这一份。 */
  static hasFetterFashion(): boolean {
    return this.fetterFashion !== null;
  }

  /** 空的 c2s 75601。GReqShenBinInfo 没有包体，没有 page。只在 28200 之后发一次。不发 75602、75603、75604、75605。不发 75619、75609。75606 职级信息另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28200、28100 分开发，勿合并。本刀不重复拉 28200，也不重复拉 28100。按 job 轻懒建 core（默认 coreLv=1）可接受。无合成，无装备，无核心升级，无分解。 */
  static pullShenBin(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_SHENBIN_CMD);
  }

  /** 收到过 s2c 75601（含空包体）才算同步。解不开的包不算。28200、28100、75602、75603、75604、75605、75607、75608、75609、75619、75615、4601、29001、20011 单独到不算。75606 是下一帧，单独到不算这一份。 */
  static hasShenBin(): boolean {
    return this.shenBin !== null;
  }

  /** 空的 c2s 75606。GReqGetOccupationInfo 没有包体，没有 page。只在 75601 之后发一次。整帧 0400000056270100。75607 同为空体，不发 75607。不发 75609。75608 为服推，勿当 c2s。不发 75602、75603、75604、75605、75619。75615 神兵道具另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75601、28200 分开发，勿合并。本刀不重复拉 75601，也不重复拉 28200。允许 getOrCreate 轻懒建。无扣费，无领奖。 */
  static pullOccupation(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_OCCUPATION_CMD);
  }

  /** 收到过 s2c 75606（含空包体）才算同步。解不开的包不算。75601、28200、75602、75603、75604、75605、75607、75608、75609、75619、4601、29001、20011 单独到不算。75615 是下一帧，单独到不算这一份。 */
  static hasOccupation(): boolean {
    return this.occupation !== null;
  }

  /** 空的 c2s 75615。GReqRoleShenBinInfo 没有包体，没有 page。只在 75606 之后发一次。整帧 040000005f270100。不发 75602、75603、75604、75605、75619。不发 75607、75609。75608 为服推，勿当 c2s。75607 同为空体，不发 75607。28107 查看契约另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75606、75601 分开发，勿合并。本刀不重复拉 75606，也不重复拉 75601。允许 getOrCreate 轻懒建（默认 knighthoodId=1）。只读拼包。无扣费，无领奖。 */
  static pullRoleShenBin(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ROLE_SHENBIN_CMD);
  }

  /** 收到过 s2c 75615（含空包体）才算同步。解不开的包不算。75606、75601、75602、75603、75604、75605、75607、75608、75609、75619、4601、29001、20011 单独到不算。28107 是下一帧，单独到不算这一份。 */
  static hasRoleShenBin(): boolean {
    return this.roleShenBin !== null;
  }

  /** 空的 c2s 28107。GReqFetterContractInfo 没有包体，没有 page。只在 75615 之后发一次。整帧 04000000cb6d0000。不发 28101、28102、28104、28105、28106、28108、28109。不发 28002、28003、28004。不发 28201、28202、28203、28204、28205。3099 查询阵法另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75615、75606 分开发，勿合并。本刀不重复拉 75615，也不重复拉 75606。轻懒建（getFetterTask）可接受。只读，无解锁、无扣费、无领奖。 */
  static pullFetterContract(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_FETTER_CONTRACT_CMD);
  }

  /** 收到过 s2c 28107（含空包体）才算同步。解不开的包不算。75615、75606、28100、28101、28102、28104、28105、28106、28108、28109、28002、28003、28004、28201、28202、28203、28204、28205、3099、4601、29001、20011 单独到不算。 */
  static hasFetterContract(): boolean {
    return this.fetterContract !== null;
  }

  /** 空的 c2s 3099。GReqQueryFormation 没有包体，没有 page。只在 28107 之后发一次。整帧 040000001b0c0000。不发 3097 解锁第二契约、3098 解锁阵法、3100 保存战斗队列。不发 3102 查战报、3030 切磋。3101 副本队列另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28107、75615 分开发，勿合并。本刀不重复拉 28107，也不重复拉 75615。getFormation 轻懒建可接受（无记录则 add；未解锁阵法 id=1 则 unlock(1)+update）。只读，无扣费、无领奖、不写养成。 */
  static pullFormation(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_FORMATION_CMD);
  }

  /** 收到过 s2c 3099（含空包体）才算同步。解不开的包不算。28107、75615、3097、3098、3100、3101、3102、3030、4601、29001、20011 单独到不算。 */
  static hasFormation(): boolean {
    return this.formation !== null;
  }

  /** 空的 c2s 3101。GReqLineUp 没有包体，没有 page。只在 3099 之后发一次。整帧 040000001d0c0000。不发 3100 保存队列、3098 解锁阵法、3097 解锁第二契约、3030 切磋、3102 请求战报、3103 预计算战斗力。3099 勿再发。不做备选 5001。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 3099 分开发，勿合并。本刀不重复拉 3099。getHeroLineUps→fillLineUp 轻修复可接受（formationId==0 则置 1 并轻修站位后 update；本路径不走 add）。只读，无扣费、无领奖、不写养成。 */
  static pullLineUp(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_LINEUP_CMD);
  }

  /** 收到过 s2c 3101（含空包体）才算同步。解不开的包不算。3099、3100、3098、3097、3030、3102、3103、5001、20011、4601、29001、20101 单独到不算。 */
  static hasLineUp(): boolean {
    return this.lineUp !== null;
  }

  /** 空的 c2s 20101。GReqRunningPromotion 没有包体，没有 page。只在 3101 之后发一次。整帧 04000000854e0000。同文件 20102 非空体勿挂。不发各活动领奖写号（20018、20013、20004、20010）。不做 20011。51001 已有，勿重复。5001 已有，勿重复。3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3101 分开发，勿合并。本刀不重复拉 3101，也不重复拉 3099。promotionControlService.getAllWillRun() 组列表。纯读。无扣费，无领奖，不写养成。 */
  static pullRunningPromotion(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_RUNNING_PROMOTION_CMD);
  }

  /** 收到过 s2c 20101（含空包体）才算同步。解不开的包不算。3101、3099、20102、20018、20013、20004、20010、20011、51001、5001、4601、29001 单独到不算。 */
  static hasRunningPromotion(): boolean {
    return this.runningPromotion !== null;
  }

  /** 空的 c2s 3005。没连上时返回 false，调用方 Toast。 */
  static claimIdle(): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    net.send(WIRE_IDLE_CLAIM_CMD);
    return true;
  }

  /** 主城挂机入口。两个时间都没出现过就是还没同步。 */
  static hasIdle(): boolean {
    return wireIdleHasTime({ rewardTime: this.rewardTime, maxRewardTime: this.maxRewardTime });
  }

  private static onRole(data: unknown): void {
    let profile: WireRoleProfile | null = null;
    try {
      profile = decodeWireRole(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 2001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!profile) {
      GameLog.shared.info("Wire", "s2c 2001 解不开，顶栏不改");
      return;
    }
    if (!wireProfileHasBar(profile)) {
      GameLog.shared.info("Wire", "s2c 2001 没有可写入顶栏的字段，顶栏不改");
      return;
    }
    this.remember(profile);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 2001 先记下：" + wireProfileNote(this.pending || profile));
      return;
    }
    this.commit();
  }

  private static onChapter(data: unknown): void {
    let progress: WireChapterProgress | null = null;
    try {
      progress = decodeWireChapter(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3007 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!progress) {
      GameLog.shared.info("Wire", "s2c 3007 解不开，主线不改");
      return;
    }
    if (!wireChapterHasIdx(progress)) {
      GameLog.shared.info("Wire", "s2c 3007 没有 now_idx/max_idx，主线不改");
      return;
    }
    this.rememberChapter(progress);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 3007 先记下：" + wireChapterNote(this.pendingChapter || progress));
      return;
    }
    this.commitChapter();
  }

  private static onIdle(data: unknown): void {
    let snapshot: WireIdleSnapshot | null = null;
    try {
      snapshot = decodeWireIdle(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3004 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snapshot) {
      GameLog.shared.info("Wire", "s2c 3004 解不开，挂机不改");
      return;
    }
    if (!wireIdleHasTime(snapshot)) {
      GameLog.shared.info("Wire", "s2c 3004 没有 reward_time/max_reward_time，挂机不改");
      return;
    }
    this.rememberIdle(snapshot);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 3004 先记下：" + wireIdleNote(this.pendingIdle || snapshot));
      return;
    }
    this.commitIdle();
  }

  private static onIdleClaim(data: unknown): void {
    let claim: WireIdleClaim | null = null;
    try {
      claim = decodeWireIdleClaim(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3005 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      this.finishClaim("s2c 3005 解不开，金币不改");
      return;
    }
    if (!claim) {
      GameLog.shared.info("Wire", "s2c 3005 解不开，金币不改");
      this.finishClaim("s2c 3005 解不开，金币不改");
      return;
    }
    if (claim.rewardTime === null) {
      GameLog.shared.info("Wire", "s2c 3005 没有 reward_time，金币不改");
      this.finishClaim("s2c 3005 没有 reward_time，金币不改");
      return;
    }
    const inCity = Session.source === "wire" && !!Session.role;
    if (this.pendingIdle) {
      this.pendingIdle = {
        rewardTime: claim.rewardTime,
        maxRewardTime: this.pendingIdle.maxRewardTime,
      };
    } else if (!inCity) {
      this.pendingIdle = { rewardTime: claim.rewardTime, maxRewardTime: null };
    }
    if (inCity) this.rewardTime = claim.rewardTime;
    const note = "s2c 3005 " + wireIdleClaimNote(claim);
    GameLog.shared.info("Wire", note);
    this.finishClaim(note);
  }

  private static onBag(data: unknown): void {
    let list: ReturnType<typeof decodeWireBagList> = null;
    try {
      list = decodeWireBagList(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 5001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!list) {
      GameLog.shared.info("Wire", "s2c 5001 解不开，背包不改");
      return;
    }
    this.pendingBag = list.items.map(copyBagItem);
    this.pendingBagMarks = list.marks.map(copyBagMark);
    this.pendingGains = [];
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 5001 先记下：" + wireBagNote(list));
      return;
    }
    this.commitBag();
  }

  private static onBagGain(data: unknown): void {
    let gain: WireBagGain | null = null;
    try {
      gain = decodeWireBagGain(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 5002 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!gain) {
      GameLog.shared.info("Wire", "s2c 5002 解不开，背包不改，顶栏不改");
      return;
    }
    GameLog.shared.info("Wire", "s2c 5002 " + wireBagGainNote(gain));
    if (gain.items.length === 0) return;
    const inCity = Session.source === "wire" && !!Session.role;
    if (!inCity) {
      if (this.pendingBag === null) {
        GameLog.shared.info("Wire", "s2c 5002 在背包列表之前，不合并");
        return;
      }
      this.pendingGains.push(gain);
      return;
    }
    if (this.bagItems === null) {
      GameLog.shared.info("Wire", "s2c 5002 在背包列表之前，不合并");
      return;
    }
    this.bagItems = applyWireBagGain(this.bagItems, gain);
    this.emit();
  }

  private static onMail(data: unknown): void {
    let list: { entries: WireMailEntry[] } | null = null;
    try {
      list = decodeWireMailList(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 15000 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!list) {
      GameLog.shared.info("Wire", "s2c 15000 解不开，邮件不改");
      return;
    }
    this.pendingMail = list.entries.map(copyMail);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 15000 先记下：" + wireMailNote(list.entries));
      return;
    }
    this.commitMail();
  }

  private static onHero(data: unknown): void {
    let list: WireHeroList | null = null;
    try {
      list = decodeWireHeroList(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!list) {
      GameLog.shared.info("Wire", "s2c 4001 解不开，英雄不改");
      return;
    }
    const done = this.takeHeroPage(list);
    if (!done) return;
    this.pendingHero = done;
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4001 先记下：" + wireHeroNote(done));
      return;
    }
    this.commitHero();
  }

  private static onActivity(data: unknown): void {
    let snap: WireActivitySnapshot | null = null;
    try {
      snap = decodeWireActivity(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 17000 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 17000 解不开，点金不改");
      return;
    }
    this.pendingActivity = copyActivity(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 17000 先记下：" + wireActivityNote(snap));
      return;
    }
    this.commitActivity();
  }

  private static onAchievement(data: unknown): void {
    let snap: WireAchievementSnapshot | null = null;
    try {
      snap = decodeWireAchievement(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 12010 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 12010 解不开，成就不改");
      return;
    }
    this.pendingAchievement = copyAchievement(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 12010 先记下：" + wireAchievementNote(snap));
      return;
    }
    this.commitAchievement();
  }

  private static onPvp(data: unknown): void {
    let snap: WirePvpSnapshot | null = null;
    try {
      snap = decodeWirePvp(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 18001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 18001 解不开，竞技场不改");
      return;
    }
    this.pendingPvp = copyPvp(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 18001 先记下：" + wirePvpNote(snap));
      return;
    }
    this.commitPvp();
  }

  private static onSevenDay(data: unknown): void {
    let snap: WireSevenDaySnapshot | null = null;
    try {
      snap = decodeWireSevenDay(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 22000 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 22000 解不开，七日登录不改");
      return;
    }
    this.pendingSeven = copySevenDay(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 22000 先记下：" + wireSevenNote(snap));
      return;
    }
    this.commitSevenDay();
  }

  /** 隔天推送。只改已经有的 cur_day。没有 22000 时不建表，也不算同步。 */
  private static onSevenDayPush(data: unknown): void {
    let curDay: number | null = null;
    try {
      curDay = decodeWireSevenDayUpdate(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 22002 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (curDay === null) {
      GameLog.shared.info("Wire", "s2c 22002 解不开，七日登录不改");
      return;
    }
    if (this.pendingSeven) this.pendingSeven = applyWireSevenDayUpdate(this.pendingSeven, curDay);
    if (Session.source === "wire" && Session.role && this.sevenDay) {
      this.sevenDay = applyWireSevenDayUpdate(this.sevenDay, curDay);
      GameLog.shared.info("Wire", "s2c 22002 cur_day=" + curDay + "。不领奖，不写金币");
      this.emit();
      return;
    }
    if (this.pendingSeven) {
      GameLog.shared.info("Wire", "s2c 22002 先记下 cur_day=" + curDay);
      return;
    }
    GameLog.shared.info("Wire", "s2c 22002 还没有 22000，七日登录不改");
  }

  private static onGoal7(data: unknown): void {
    let snap: WireGoal7Snapshot | null = null;
    try {
      snap = decodeWireGoal7(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 21010 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 21010 解不开，七日目标不改");
      return;
    }
    this.pendingGoal = copyGoal7(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 21010 先记下：" + wireGoalNote(snap));
      return;
    }
    this.commitGoal7();
  }

  private static onWish(data: unknown): void {
    let snap: WireWishSnapshot | null = null;
    try {
      snap = decodeWireWish(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 27001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 27001 解不开，许愿池不改");
      return;
    }
    this.pendingWish = copyWish(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 27001 先记下：" + wireWishNote(snap));
      return;
    }
    this.commitWish();
  }

  private static onSummon(data: unknown): void {
    let snap: WireSummonSnapshot | null = null;
    try {
      snap = decodeWireSummon(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4004 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4004 解不开，召唤次数不改");
      return;
    }
    this.pendingSummon = copySummon(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4004 先记下：" + wireSummonNote(snap));
      return;
    }
    this.commitSummon();
  }

  private static onProphet(data: unknown): void {
    let snap: WireProphetSnapshot | null = null;
    try {
      snap = decodeWireProphet(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 13044 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 13044 解不开，先知召唤不改");
      return;
    }
    this.pendingProphet = copyProphet(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 13044 先记下：" + wireProphetNote(snap));
      return;
    }
    this.commitProphet();
  }

  private static onJewel(data: unknown): void {
    let snap: WireJewelSnapshot | null = null;
    try {
      snap = decodeWireJewel(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4101 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4101 解不开，英雄宝石不改");
      return;
    }
    this.pendingJewel = copyJewel(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4101 先记下：" + wireJewelNote(snap));
      return;
    }
    this.commitJewel();
  }

  private static onIllustrat(data: unknown): void {
    let snap: WireIllustratSnapshot | null = null;
    try {
      snap = decodeWireIllustrat(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4013 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4013 解不开，英雄图鉴不改");
      return;
    }
    this.pendingIllustrat = copyIllustrat(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4013 先记下：" + wireIllustratNote(snap));
      return;
    }
    this.commitIllustrat();
  }

  private static onPet(data: unknown): void {
    let snap: WirePetSnapshot | null = null;
    try {
      snap = decodeWirePet(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 74100 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 74100 解不开，宠物信息不改");
      return;
    }
    this.pendingPet = copyPet(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 74100 先记下：" + wirePetNote(snap));
      return;
    }
    this.commitPet();
  }

  private static onWorld(data: unknown): void {
    let snap: WireWorldSnapshot | null = null;
    try {
      snap = decodeWireWorld(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 51001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 51001 解不开，世界等级不改");
      return;
    }
    this.pendingWorld = copyWorld(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 51001 先记下：" + wireWorldNote(snap));
      return;
    }
    this.commitWorld();
  }

  private static onPromotion(data: unknown): void {
    let snap: WirePromotionSnapshot | null = null;
    try {
      snap = decodeWirePromotion(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 20001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 20001 解不开，基金列表不改");
      return;
    }
    this.pendingPromotion = copyPromotion(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 20001 先记下：" + wirePromotionNote(snap));
      return;
    }
    this.commitPromotion();
  }

  private static onFirstRecharge(data: unknown): void {
    let snap: WireFirstRechargeSnapshot | null = null;
    try {
      snap = decodeWireFirstRecharge(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 20012 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 20012 解不开，超值首充记录不改");
      return;
    }
    this.pendingFirstRecharge = copyFirstRecharge(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 20012 先记下：" + wireFirstNote(snap));
      return;
    }
    this.commitFirstRecharge();
  }

  private static onReiki(data: unknown): void {
    let snap: WireReikiSnapshot | null = null;
    try {
      snap = decodeWireReiki(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 70001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 70001 解不开，灵器数据不改");
      return;
    }
    this.pendingReiki = copyReiki(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 70001 先记下：" + wireReikiNote(snap));
      return;
    }
    this.commitReiki();
  }

  private static onIslands(data: unknown): void {
    let snap: WireIslandsSnapshot | null = null;
    try {
      snap = decodeWireIslands(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 73001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 73001 解不开，浮空岛时间不改");
      return;
    }
    this.pendingIslands = copyIslands(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 73001 先记下：" + wireIslandsNote(snap));
      return;
    }
    this.commitIslands();
  }

  private static onTotems(data: unknown): void {
    let snap: WireTotemsSnapshot | null = null;
    try {
      snap = decodeWireTotems(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 74300 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 74300 解不开，图腾信息不改");
      return;
    }
    this.pendingTotems = copyTotems(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 74300 先记下：" + wireTotemsNote(snap));
      return;
    }
    this.commitTotems();
  }

  private static onAstrolabe(data: unknown): void {
    let snap: WireAstrolabeSnapshot | null = null;
    try {
      snap = decodeWireAstrolabe(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 68001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 68001 解不开，星盘数据不改");
      return;
    }
    this.pendingAstrolabe = copyAstrolabe(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 68001 先记下：" + wireAstrolabeNote(snap));
      return;
    }
    this.commitAstrolabe();
  }

  private static onTweakCube(data: unknown): void {
    let snap: WireCubeSnapshot | null = null;
    try {
      snap = decodeWireTweakCube(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 75501 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 75501 解不开，魔方数据不改");
      return;
    }
    this.pendingTweakCube = copyTweakCube(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 75501 先记下：" + wireTweakCubeNote(snap));
      return;
    }
    this.commitTweakCube();
  }

  private static onDragon(data: unknown): void {
    let snap: WireDragonSnapshot | null = null;
    try {
      snap = decodeWireDragon(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 59001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 59001 解不开，圣龙数据不改");
      return;
    }
    this.pendingDragon = copyDragon(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 59001 先记下：" + wireDragonNote(snap));
      return;
    }
    this.commitDragon();
  }

  private static onDragonCollection(data: unknown): void {
    let snap: WireDragonCollectionSnapshot | null = null;
    try {
      snap = decodeWireDragonCollection(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 59010 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 59010 解不开，圣物图鉴不改");
      return;
    }
    this.pendingDragonCollection = copyDragonCollection(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 59010 先记下：" + wireDragonCollectionNote(snap));
      return;
    }
    this.commitDragonCollection();
  }

  private static onTitle(data: unknown): void {
    let snap: WireTitleSnapshot | null = null;
    try {
      snap = decodeWireTitle(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 55001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 55001 解不开，称号列表不改");
      return;
    }
    this.pendingTitle = copyTitle(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 55001 先记下：" + wireTitleNote(snap));
      return;
    }
    this.commitTitle();
  }

  private static onHeadPortrait(data: unknown): void {
    let snap: WireHeadPortraitSnapshot | null = null;
    try {
      snap = decodeWireHeadPortrait(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 34001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 34001 解不开，头像列表不改");
      return;
    }
    this.pendingHeadPortrait = copyHeadPortrait(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 34001 先记下：" + wireHeadPortraitNote(snap));
      return;
    }
    this.commitHeadPortrait();
  }

  private static onBorder(data: unknown): void {
    let snap: WireBorderSnapshot | null = null;
    try {
      snap = decodeWireBorder(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 32001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 32001 解不开，头像框数据不改");
      return;
    }
    this.pendingBorder = copyBorder(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 32001 先记下：" + wireBorderNote(snap));
      return;
    }
    this.commitBorder();
  }

  private static onFashion(data: unknown): void {
    let snap: WireFashionSnapshot | null = null;
    try {
      snap = decodeWireFashion(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4402 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4402 解不开，激活皮肤列表不改");
      return;
    }
    this.pendingFashion = copyFashion(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4402 先记下：" + wireFashionNote(snap));
      return;
    }
    this.commitFashion();
  }

  private static onWornFashion(data: unknown): void {
    let snap: WireWornFashionSnapshot | null = null;
    try {
      snap = decodeWireWornFashion(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4401 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4401 解不开，穿戴皮肤英雄列表不改");
      return;
    }
    this.pendingWornFashion = copyWornFashion(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4401 先记下：" + wireWornFashionNote(snap));
      return;
    }
    this.commitWornFashion();
  }

  private static onHeroPrayer(data: unknown): void {
    let snap: WireHeroPrayerSnapshot | null = null;
    try {
      snap = decodeWireHeroPrayer(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4201 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4201 解不开，英雄祈愿数据不改");
      return;
    }
    this.pendingHeroPrayer = copyHeroPrayer(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4201 先记下：" + wireHeroPrayerNote(snap));
      return;
    }
    this.commitHeroPrayer();
  }

  private static onPetIllustrate(data: unknown): void {
    let snap: WirePetIllustrateSnapshot | null = null;
    try {
      snap = decodeWirePetIllustrate(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 74104 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 74104 解不开，宠物图鉴不改");
      return;
    }
    this.pendingPetIllustrate = copyPetIllustrate(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 74104 先记下：" + wirePetIllustrateNote(snap));
      return;
    }
    this.commitPetIllustrate();
  }

  private static onFetter(data: unknown): void {
    let snap: WireFetterSnapshot | null = null;
    try {
      snap = decodeWireFetter(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 28100 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 28100 解不开，羁绊数据不改");
      return;
    }
    this.pendingFetter = copyFetter(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 28100 先记下：" + wireFetterNote(snap));
      return;
    }
    this.commitFetter();
  }

  private static onFetterFashion(data: unknown): void {
    let snap: WireFetterFashionSnapshot | null = null;
    try {
      snap = decodeWireFetterFashion(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 28200 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 28200 解不开，羁绊皮肤不改");
      return;
    }
    this.pendingFetterFashion = copyFetterFashion(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 28200 先记下：" + wireFetterFashionNote(snap));
      return;
    }
    this.commitFetterFashion();
  }

  private static onShenBin(data: unknown): void {
    let snap: WireShenBinSnapshot | null = null;
    try {
      snap = decodeWireShenBin(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 75601 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 75601 解不开，神兵数据不改");
      return;
    }
    this.pendingShenBin = copyShenBin(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 75601 先记下：" + wireShenBinNote(snap));
      return;
    }
    this.commitShenBin();
  }

  private static onOccupation(data: unknown): void {
    let snap: WireOccupationSnapshot | null = null;
    try {
      snap = decodeWireOccupation(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 75606 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 75606 解不开，职级信息不改");
      return;
    }
    this.pendingOccupation = copyOccupation(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 75606 先记下：" + wireOccupationNote(snap));
      return;
    }
    this.commitOccupation();
  }

  private static onRoleShenBin(data: unknown): void {
    let snap: WireRoleShenBinSnapshot | null = null;
    try {
      snap = decodeWireRoleShenBin(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 75615 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 75615 解不开，神兵道具不改");
      return;
    }
    this.pendingRoleShenBin = copyRoleShenBin(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 75615 先记下：" + wireRoleShenBinNote(snap));
      return;
    }
    this.commitRoleShenBin();
  }

  private static onFetterContract(data: unknown): void {
    let snap: WireFetterContractSnapshot | null = null;
    try {
      snap = decodeWireFetterContract(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 28107 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 28107 解不开，契约不改");
      return;
    }
    this.pendingFetterContract = copyFetterContract(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 28107 先记下：" + wireFetterContractNote(snap));
      return;
    }
    this.commitFetterContract();
  }

  private static onFormation(data: unknown): void {
    let snap: WireFormationSnapshot | null = null;
    try {
      snap = decodeWireFormation(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3099 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 3099 解不开，阵法不改");
      return;
    }
    this.pendingFormation = copyFormation(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 3099 先记下：" + wireFormationNote(snap));
      return;
    }
    this.commitFormation();
  }

  private static onLineUp(data: unknown): void {
    let snap: WireLineUpSnapshot | null = null;
    try {
      snap = decodeWireLineUp(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3101 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 3101 解不开，副本队列不改");
      return;
    }
    this.pendingLineUp = copyLineUp(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 3101 先记下：" + wireLineUpNote(snap));
      return;
    }
    this.commitLineUp();
  }

  private static onRunningPromotion(data: unknown): void {
    let snap: WireRunningPromotionSnapshot | null = null;
    try {
      snap = decodeWireRunningPromotion(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 20101 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 20101 解不开，进行中活动不改");
      return;
    }
    this.pendingRunningPromotion = copyRunningPromotion(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 20101 先记下：" + wireRunningPromotionNote(snap));
      return;
    }
    this.commitRunningPromotion();
  }

  /** 只收。不建表，不改已经有的七日目标，也不发奖。 */
  private static onGoal7Push(_data: unknown): void {
    GameLog.shared.info("Wire", "s2c 21013 只收，七日目标不改，不发奖");
  }

  /**
   * 按页攒名册。send_status=0 时发出下一页并返回 null，先不替换。
   * 页码对不上也返回 null，保持上一次。
   */
  private static takeHeroPage(list: WireHeroList): WireHeroList | null {
    const page = list.page !== null ? list.page : this.heroGathering ? this.heroExpect : 1;
    if (!this.heroGathering) {
      if (page !== 1) {
        GameLog.shared.info("Wire", "s2c 4001 页 " + page + " 不是 1，名册不改");
        return null;
      }
      this.heroAcc = list.entries.map(copyHero);
      this.heroGathering = true;
      this.heroExpect = 1;
    } else if (page !== this.heroExpect) {
      GameLog.shared.info("Wire", "s2c 4001 页 " + page + " 不是 " + this.heroExpect + "，名册不改");
      return null;
    } else {
      for (let i = 0; i < list.entries.length; i++) this.heroAcc.push(copyHero(list.entries[i]));
    }
    if (list.sendStatus === 0 && page < WIRE_HERO_PAGE_CAP) {
      const next = page + 1;
      this.heroExpect = next;
      GameLog.shared.info("Wire", "s2c 4001 send_status=0，继续 page=" + next);
      this.pullHero(next);
      return null;
    }
    if (list.sendStatus === 0) {
      GameLog.shared.info("Wire", "s2c 4001 翻页停止 page=" + page);
    }
    const done: WireHeroList = {
      entries: this.heroAcc.map(copyHero),
      heroCapacity: list.heroCapacity,
      buySpaceTimes: list.buySpaceTimes,
      sendStatus: list.sendStatus,
      page: list.page,
    };
    this.resetHeroGather();
    return done;
  }

  private static resetHeroGather(): void {
    this.heroAcc = [];
    this.heroGathering = false;
    this.heroExpect = 1;
  }

  /** 后到的包只补上自己有的字段，不把先记下、这一包没有的格子清掉。 */
  private static remember(profile: WireRoleProfile): void {
    const prev = this.pending;
    this.pending = {
      name: profile.name !== null ? profile.name : prev ? prev.name : null,
      level: profile.level !== null ? profile.level : prev ? prev.level : null,
      gold: profile.gold !== null ? profile.gold : prev ? prev.gold : null,
      diamond: profile.diamond !== null ? profile.diamond : prev ? prev.diamond : null,
    };
  }

  private static rememberChapter(progress: WireChapterProgress): void {
    const prev = this.pendingChapter;
    this.pendingChapter = {
      nowIdx: progress.nowIdx !== null ? progress.nowIdx : prev ? prev.nowIdx : null,
      maxIdx: progress.maxIdx !== null ? progress.maxIdx : prev ? prev.maxIdx : null,
    };
  }

  private static rememberIdle(snapshot: WireIdleSnapshot): void {
    const prev = this.pendingIdle;
    this.pendingIdle = {
      rewardTime: snapshot.rewardTime !== null ? snapshot.rewardTime : prev ? prev.rewardTime : null,
      maxRewardTime: snapshot.maxRewardTime !== null ? snapshot.maxRewardTime : prev ? prev.maxRewardTime : null,
    };
  }

  private static commit(): void {
    const profile = this.pending;
    if (!profile || !wireProfileHasBar(profile)) return;
    if (
      !Session.applyWireSync({
        name: profile.name,
        level: profile.level,
        gold: profile.gold,
        diamond: profile.diamond,
      })
    ) {
      return;
    }
    this.pending = null;
    GameLog.shared.info("Wire", wireProfileNote(profile));
    this.emit();
  }

  private static commitChapter(): void {
    const progress = this.pendingChapter;
    if (!progress || !wireChapterHasIdx(progress)) return;
    if (Session.source !== "wire" || !Session.role) return;
    if (progress.nowIdx !== null) this.nowIdx = progress.nowIdx;
    if (progress.maxIdx !== null) this.maxIdx = progress.maxIdx;
    this.pendingChapter = null;
    GameLog.shared.info("Wire", wireChapterNote(progress));
    this.emit();
  }

  private static commitBag(): void {
    if (this.pendingBag === null) return;
    if (Session.source !== "wire" || !Session.role) return;
    let items = this.pendingBag.map(copyBagItem);
    for (let i = 0; i < this.pendingGains.length; i++) {
      items = applyWireBagGain(items, this.pendingGains[i]);
    }
    const marks = this.pendingBagMarks.map(copyBagMark);
    this.pendingBag = null;
    this.pendingBagMarks = [];
    this.pendingGains = [];
    this.bagItems = items;
    this.bagMarks = marks;
    GameLog.shared.info("Wire", "s2c 5001 " + wireBagNote({ items, marks }));
    this.emit();
  }

  private static commitMail(): void {
    if (this.pendingMail === null) return;
    if (Session.source !== "wire" || !Session.role) return;
    const entries = this.pendingMail.map(copyMail);
    this.pendingMail = null;
    this.mailEntries = entries;
    GameLog.shared.info("Wire", "s2c 15000 " + wireMailNote(entries));
    this.emit();
  }

  private static commitHero(): void {
    const list = this.pendingHero;
    if (!list) return;
    if (Session.source !== "wire" || !Session.role) return;
    const entries = list.entries.map(copyHero);
    this.pendingHero = null;
    this.heroes = entries;
    GameLog.shared.info("Wire", "s2c 4001 " + wireHeroNote({ ...list, entries }));
    this.emit();
  }

  private static commitActivity(): void {
    const snap = this.pendingActivity;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyActivity(snap);
    this.pendingActivity = null;
    this.activity = next;
    GameLog.shared.info("Wire", "s2c 17000 " + wireActivityNote(next));
    this.emit();
  }

  private static commitAchievement(): void {
    const snap = this.pendingAchievement;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyAchievement(snap);
    this.pendingAchievement = null;
    this.achievements = next;
    GameLog.shared.info("Wire", "s2c 12010 " + wireAchievementNote(next));
    this.emit();
  }

  private static commitPvp(): void {
    const snap = this.pendingPvp;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyPvp(snap);
    this.pendingPvp = null;
    this.pvp = next;
    GameLog.shared.info("Wire", "s2c 18001 " + wirePvpNote(next));
    this.emit();
  }

  private static commitSevenDay(): void {
    const snap = this.pendingSeven;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copySevenDay(snap);
    this.pendingSeven = null;
    this.sevenDay = next;
    GameLog.shared.info("Wire", "s2c 22000 " + wireSevenNote(next));
    this.emit();
  }

  private static commitGoal7(): void {
    const snap = this.pendingGoal;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyGoal7(snap);
    this.pendingGoal = null;
    this.goal7 = next;
    GameLog.shared.info("Wire", "s2c 21010 " + wireGoalNote(next));
    this.emit();
  }

  private static commitWish(): void {
    const snap = this.pendingWish;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyWish(snap);
    this.pendingWish = null;
    this.wish = next;
    GameLog.shared.info("Wire", "s2c 27001 " + wireWishNote(next));
    this.emit();
  }

  private static commitSummon(): void {
    const snap = this.pendingSummon;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copySummon(snap);
    this.pendingSummon = null;
    this.summon = next;
    GameLog.shared.info("Wire", "s2c 4004 " + wireSummonNote(next));
    this.emit();
  }

  private static commitProphet(): void {
    const snap = this.pendingProphet;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyProphet(snap);
    this.pendingProphet = null;
    this.prophet = next;
    GameLog.shared.info("Wire", "s2c 13044 " + wireProphetNote(next));
    this.emit();
  }

  private static commitJewel(): void {
    const snap = this.pendingJewel;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyJewel(snap);
    this.pendingJewel = null;
    this.jewel = next;
    GameLog.shared.info("Wire", "s2c 4101 " + wireJewelNote(next));
    this.emit();
  }

  private static commitIllustrat(): void {
    const snap = this.pendingIllustrat;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyIllustrat(snap);
    this.pendingIllustrat = null;
    this.illustrat = next;
    GameLog.shared.info("Wire", "s2c 4013 " + wireIllustratNote(next));
    this.emit();
  }

  private static commitPet(): void {
    const snap = this.pendingPet;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyPet(snap);
    this.pendingPet = null;
    this.pet = next;
    GameLog.shared.info("Wire", "s2c 74100 " + wirePetNote(next));
    this.emit();
  }

  private static commitWorld(): void {
    const snap = this.pendingWorld;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyWorld(snap);
    this.pendingWorld = null;
    this.world = next;
    GameLog.shared.info("Wire", "s2c 51001 " + wireWorldNote(next));
    this.emit();
  }

  private static commitPromotion(): void {
    const snap = this.pendingPromotion;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyPromotion(snap);
    this.pendingPromotion = null;
    this.promotion = next;
    GameLog.shared.info("Wire", "s2c 20001 " + wirePromotionNote(next));
    this.emit();
  }

  private static commitFirstRecharge(): void {
    const snap = this.pendingFirstRecharge;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyFirstRecharge(snap);
    this.pendingFirstRecharge = null;
    this.firstRecharge = next;
    GameLog.shared.info("Wire", "s2c 20012 " + wireFirstNote(next));
    this.emit();
  }

  private static commitReiki(): void {
    const snap = this.pendingReiki;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyReiki(snap);
    this.pendingReiki = null;
    this.reiki = next;
    GameLog.shared.info("Wire", "s2c 70001 " + wireReikiNote(next));
    this.emit();
  }

  private static commitIslands(): void {
    const snap = this.pendingIslands;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyIslands(snap);
    this.pendingIslands = null;
    this.islands = next;
    GameLog.shared.info("Wire", "s2c 73001 " + wireIslandsNote(next));
    this.emit();
  }

  private static commitTotems(): void {
    const snap = this.pendingTotems;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyTotems(snap);
    this.pendingTotems = null;
    this.totems = next;
    GameLog.shared.info("Wire", "s2c 74300 " + wireTotemsNote(next));
    this.emit();
  }

  private static commitAstrolabe(): void {
    const snap = this.pendingAstrolabe;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyAstrolabe(snap);
    this.pendingAstrolabe = null;
    this.astrolabe = next;
    GameLog.shared.info("Wire", "s2c 68001 " + wireAstrolabeNote(next));
    this.emit();
  }

  private static commitTweakCube(): void {
    const snap = this.pendingTweakCube;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyTweakCube(snap);
    this.pendingTweakCube = null;
    this.tweakCube = next;
    GameLog.shared.info("Wire", "s2c 75501 " + wireTweakCubeNote(next));
    this.emit();
  }

  private static commitDragon(): void {
    const snap = this.pendingDragon;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyDragon(snap);
    this.pendingDragon = null;
    this.dragon = next;
    GameLog.shared.info("Wire", "s2c 59001 " + wireDragonNote(next));
    this.emit();
  }

  private static commitDragonCollection(): void {
    const snap = this.pendingDragonCollection;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyDragonCollection(snap);
    this.pendingDragonCollection = null;
    this.dragonCollection = next;
    GameLog.shared.info("Wire", "s2c 59010 " + wireDragonCollectionNote(next));
    this.emit();
  }

  private static commitTitle(): void {
    const snap = this.pendingTitle;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyTitle(snap);
    this.pendingTitle = null;
    this.titleList = next;
    GameLog.shared.info("Wire", "s2c 55001 " + wireTitleNote(next));
    this.emit();
  }

  private static commitHeadPortrait(): void {
    const snap = this.pendingHeadPortrait;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyHeadPortrait(snap);
    this.pendingHeadPortrait = null;
    this.headPortrait = next;
    GameLog.shared.info("Wire", "s2c 34001 " + wireHeadPortraitNote(next));
    this.emit();
  }

  private static commitBorder(): void {
    const snap = this.pendingBorder;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyBorder(snap);
    this.pendingBorder = null;
    this.border = next;
    GameLog.shared.info("Wire", "s2c 32001 " + wireBorderNote(next));
    this.emit();
  }

  private static commitFashion(): void {
    const snap = this.pendingFashion;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyFashion(snap);
    this.pendingFashion = null;
    this.fashion = next;
    GameLog.shared.info("Wire", "s2c 4402 " + wireFashionNote(next));
    this.emit();
  }

  private static commitWornFashion(): void {
    const snap = this.pendingWornFashion;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyWornFashion(snap);
    this.pendingWornFashion = null;
    this.wornFashion = next;
    GameLog.shared.info("Wire", "s2c 4401 " + wireWornFashionNote(next));
    this.emit();
  }

  private static commitHeroPrayer(): void {
    const snap = this.pendingHeroPrayer;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyHeroPrayer(snap);
    this.pendingHeroPrayer = null;
    this.heroPrayer = next;
    GameLog.shared.info("Wire", "s2c 4201 " + wireHeroPrayerNote(next));
    this.emit();
  }

  private static commitPetIllustrate(): void {
    const snap = this.pendingPetIllustrate;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyPetIllustrate(snap);
    this.pendingPetIllustrate = null;
    this.petIllustrate = next;
    GameLog.shared.info("Wire", "s2c 74104 " + wirePetIllustrateNote(next));
    this.emit();
  }

  private static commitFetter(): void {
    const snap = this.pendingFetter;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyFetter(snap);
    this.pendingFetter = null;
    this.fetter = next;
    GameLog.shared.info("Wire", "s2c 28100 " + wireFetterNote(next));
    this.emit();
  }

  private static commitFetterFashion(): void {
    const snap = this.pendingFetterFashion;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyFetterFashion(snap);
    this.pendingFetterFashion = null;
    this.fetterFashion = next;
    GameLog.shared.info("Wire", "s2c 28200 " + wireFetterFashionNote(next));
    this.emit();
  }

  private static commitShenBin(): void {
    const snap = this.pendingShenBin;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyShenBin(snap);
    this.pendingShenBin = null;
    this.shenBin = next;
    GameLog.shared.info("Wire", "s2c 75601 " + wireShenBinNote(next));
    this.emit();
  }

  private static commitOccupation(): void {
    const snap = this.pendingOccupation;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyOccupation(snap);
    this.pendingOccupation = null;
    this.occupation = next;
    GameLog.shared.info("Wire", "s2c 75606 " + wireOccupationNote(next));
    this.emit();
  }

  private static commitRoleShenBin(): void {
    const snap = this.pendingRoleShenBin;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyRoleShenBin(snap);
    this.pendingRoleShenBin = null;
    this.roleShenBin = next;
    GameLog.shared.info("Wire", "s2c 75615 " + wireRoleShenBinNote(next));
    this.emit();
  }

  private static commitFetterContract(): void {
    const snap = this.pendingFetterContract;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyFetterContract(snap);
    this.pendingFetterContract = null;
    this.fetterContract = next;
    GameLog.shared.info("Wire", "s2c 28107 " + wireFetterContractNote(next));
    this.emit();
  }

  private static commitFormation(): void {
    const snap = this.pendingFormation;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyFormation(snap);
    this.pendingFormation = null;
    this.formation = next;
    GameLog.shared.info("Wire", "s2c 3099 " + wireFormationNote(next));
    this.emit();
  }

  private static commitLineUp(): void {
    const snap = this.pendingLineUp;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyLineUp(snap);
    this.pendingLineUp = null;
    this.lineUp = next;
    GameLog.shared.info("Wire", "s2c 3101 " + wireLineUpNote(next));
    this.emit();
  }

  private static commitRunningPromotion(): void {
    const snap = this.pendingRunningPromotion;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyRunningPromotion(snap);
    this.pendingRunningPromotion = null;
    this.runningPromotion = next;
    GameLog.shared.info("Wire", "s2c 20101 " + wireRunningPromotionNote(next));
    this.emit();
  }

  private static commitIdle(): void {
    const snapshot = this.pendingIdle;
    if (!snapshot || !wireIdleHasTime(snapshot)) return;
    if (Session.source !== "wire" || !Session.role) return;
    if (snapshot.rewardTime !== null) this.rewardTime = snapshot.rewardTime;
    if (snapshot.maxRewardTime !== null) this.maxRewardTime = snapshot.maxRewardTime;
    this.pendingIdle = null;
    GameLog.shared.info("Wire", wireIdleNote(snapshot));
    this.emit();
  }

  private static finishClaim(note: string): void {
    this.claimNote = note;
    this.claimSerial += 1;
    this.emit();
  }

  private static emit(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener();
      } catch (err) {
        GameLog.shared.error("Wire", "刷新顶栏失败 " + (err instanceof Error ? err.message : "未知错误"));
      }
    }
  }

  private static unhook(): void {
    if (this.offProfile) {
      this.offProfile();
      this.offProfile = null;
    }
    if (this.offChapter) {
      this.offChapter();
      this.offChapter = null;
    }
    if (this.offIdle) {
      this.offIdle();
      this.offIdle = null;
    }
    if (this.offIdleClaim) {
      this.offIdleClaim();
      this.offIdleClaim = null;
    }
    if (this.offBag) {
      this.offBag();
      this.offBag = null;
    }
    if (this.offBagGain) {
      this.offBagGain();
      this.offBagGain = null;
    }
    if (this.offMail) {
      this.offMail();
      this.offMail = null;
    }
    if (this.offHero) {
      this.offHero();
      this.offHero = null;
    }
    if (this.offActivity) {
      this.offActivity();
      this.offActivity = null;
    }
    if (this.offAchievement) {
      this.offAchievement();
      this.offAchievement = null;
    }
    if (this.offPvp) {
      this.offPvp();
      this.offPvp = null;
    }
    if (this.offSeven) {
      this.offSeven();
      this.offSeven = null;
    }
    if (this.offSevenPush) {
      this.offSevenPush();
      this.offSevenPush = null;
    }
    if (this.offGoal) {
      this.offGoal();
      this.offGoal = null;
    }
    if (this.offGoalPush) {
      this.offGoalPush();
      this.offGoalPush = null;
    }
    if (this.offWish) {
      this.offWish();
      this.offWish = null;
    }
    if (this.offSummon) {
      this.offSummon();
      this.offSummon = null;
    }
    if (this.offProphet) {
      this.offProphet();
      this.offProphet = null;
    }
    if (this.offJewel) {
      this.offJewel();
      this.offJewel = null;
    }
    if (this.offIllustrat) {
      this.offIllustrat();
      this.offIllustrat = null;
    }
    if (this.offPet) {
      this.offPet();
      this.offPet = null;
    }
    if (this.offWorld) {
      this.offWorld();
      this.offWorld = null;
    }
    if (this.offPromotion) {
      this.offPromotion();
      this.offPromotion = null;
    }
    if (this.offFirstRecharge) {
      this.offFirstRecharge();
      this.offFirstRecharge = null;
    }
    if (this.offReiki) {
      this.offReiki();
      this.offReiki = null;
    }
    if (this.offIslands) {
      this.offIslands();
      this.offIslands = null;
    }
    if (this.offTotems) {
      this.offTotems();
      this.offTotems = null;
    }
    if (this.offAstrolabe) {
      this.offAstrolabe();
      this.offAstrolabe = null;
    }
    if (this.offTweakCube) {
      this.offTweakCube();
      this.offTweakCube = null;
    }
    if (this.offDragon) {
      this.offDragon();
      this.offDragon = null;
    }
    if (this.offDragonCollection) {
      this.offDragonCollection();
      this.offDragonCollection = null;
    }
    if (this.offTitle) {
      this.offTitle();
      this.offTitle = null;
    }
    if (this.offHeadPortrait) {
      this.offHeadPortrait();
      this.offHeadPortrait = null;
    }
    if (this.offBorder) {
      this.offBorder();
      this.offBorder = null;
    }
    if (this.offFashion) {
      this.offFashion();
      this.offFashion = null;
    }
    if (this.offWornFashion) {
      this.offWornFashion();
      this.offWornFashion = null;
    }
    if (this.offHeroPrayer) {
      this.offHeroPrayer();
      this.offHeroPrayer = null;
    }
    if (this.offPetIllustrate) {
      this.offPetIllustrate();
      this.offPetIllustrate = null;
    }
    if (this.offFetter) {
      this.offFetter();
      this.offFetter = null;
    }
    if (this.offFetterFashion) {
      this.offFetterFashion();
      this.offFetterFashion = null;
    }
    if (this.offShenBin) {
      this.offShenBin();
      this.offShenBin = null;
    }
    if (this.offOccupation) {
      this.offOccupation();
      this.offOccupation = null;
    }
    if (this.offRoleShenBin) {
      this.offRoleShenBin();
      this.offRoleShenBin = null;
    }
    if (this.offFetterContract) {
      this.offFetterContract();
      this.offFetterContract = null;
    }
    if (this.offFormation) {
      this.offFormation();
      this.offFormation = null;
    }
    if (this.offLineUp) {
      this.offLineUp();
      this.offLineUp = null;
    }
    if (this.offRunningPromotion) {
      this.offRunningPromotion();
      this.offRunningPromotion = null;
    }
  }
}

function copyBagItem(item: WireBagItem): WireBagItem {
  const marks = item.marks ? item.marks.map(copyBagMark) : [];
  return { itemId: item.itemId, itemType: item.itemType, num: item.num, marks };
}

function copyBagMark(mark: WireBagMark): WireBagMark {
  return { field: mark.field, text: mark.text };
}

function copyMail(entry: WireMailEntry): WireMailEntry {
  return {
    id: entry.id,
    time: entry.time,
    mark3: entry.mark3,
    mark4: entry.mark4,
    title: entry.title,
    body: entry.body,
    attachment: entry.attachment,
    attachments: entry.attachments.map((row) => ({ itemId: row.itemId, count: row.count })),
  };
}

function copyActivity(snap: WireActivitySnapshot): WireActivitySnapshot {
  return {
    status: snap.status,
    time: snap.time,
    rows: snap.rows.map(copyActivityRow),
  };
}

function copyActivityRow(row: WireActivityRow): WireActivityRow {
  return { idx: row.idx, num: row.num };
}

function copyAchievement(snap: WireAchievementSnapshot): WireAchievementSnapshot {
  return {
    tasks: snap.tasks.map((task) => ({ idx: task.idx, process: task.process, state: task.state })),
  };
}

function copyPvp(snap: WirePvpSnapshot): WirePvpSnapshot {
  return {
    freeCount: snap.freeCount,
    score: snap.score,
    opponents: snap.opponents.map(copyPvpOpponent),
    seasonEndTime: snap.seasonEndTime,
    likeRids: snap.likeRids ? snap.likeRids.slice() : null,
    likeRidsUnparsed: snap.likeRidsUnparsed,
    seasonCount: snap.seasonCount,
    seasonReward: snap.seasonReward,
    seasonRewardUnparsed: snap.seasonRewardUnparsed,
  };
}

function copySevenDay(snap: WireSevenDaySnapshot): WireSevenDaySnapshot {
  return {
    endTime: snap.endTime,
    curDay: snap.curDay,
    rows: snap.rows.map(copySevenDayRow),
  };
}

function copySevenDayRow(row: WireSevenDayRow): WireSevenDayRow {
  return { idx: row.idx, status: row.status };
}

function copyGoal7(snap: WireGoal7Snapshot): WireGoal7Snapshot {
  return {
    currDay: snap.currDay,
    sevenDayValue: snap.sevenDayValue,
    rewardBoxIdx: snap.rewardBoxIdx.slice(),
    tasks: snap.tasks.map(copyGoal7Task),
  };
}

function copyGoal7Task(task: WireGoal7Task): WireGoal7Task {
  return { idx: task.idx, process: task.process, state: task.state };
}

function copyWish(snap: WireWishSnapshot): WireWishSnapshot {
  return {
    pools: snap.pools.map(copyWishPool),
    marks: snap.marks.map(copyWishMark),
  };
}

function copyWishPool(pool: WireWishPool): WireWishPool {
  return {
    type: pool.type,
    refreshTimes: pool.refreshTimes,
    luckyValue: pool.luckyValue,
    luckyRewardId: pool.luckyRewardId,
    refreshTime: pool.refreshTime,
    slots: pool.slots.map(copyWishSlot),
    marks: pool.marks.map(copyWishMark),
  };
}

function copyWishSlot(slot: WireWishSlot): WireWishSlot {
  return {
    position: slot.position,
    times: slot.times,
    item: slot.item,
    marks: slot.marks.map(copyWishMark),
  };
}

function copyWishMark(mark: WireWishMark): WireWishMark {
  return { field: mark.field, text: mark.text };
}

function copySummon(snap: WireSummonSnapshot): WireSummonSnapshot {
  return {
    freeTime: snap.freeTime,
    seniorFreeTime: snap.seniorFreeTime,
    marks: snap.marks.map(copySummonMark),
  };
}

function copySummonMark(mark: WireSummonMark): WireSummonMark {
  return { field: mark.field, text: mark.text };
}

function copyProphet(snap: WireProphetSnapshot): WireProphetSnapshot {
  return {
    luckys: snap.luckys.map(copyProphetLucky),
    marks: snap.marks.map(copyProphetMark),
  };
}

function copyProphetLucky(row: WireProphetLucky): WireProphetLucky {
  return {
    type: row.type,
    lucky: row.lucky,
    marks: row.marks.map(copyProphetMark),
  };
}

function copyProphetMark(mark: WireProphetMark): WireProphetMark {
  return { field: mark.field, text: mark.text };
}

function copyJewel(snap: WireJewelSnapshot): WireJewelSnapshot {
  return {
    heroes: snap.heroes.map(copyJewelHero),
    marks: snap.marks.map(copyJewelMark),
  };
}

function copyJewelHero(row: WireJewelHero): WireJewelHero {
  return {
    heroId: row.heroId,
    jewels: row.jewels.map(copyJewelPiece),
    marks: row.marks.map(copyJewelMark),
  };
}

function copyJewelPiece(row: WireJewelPiece): WireJewelPiece {
  return {
    jewelId: row.jewelId,
    place: row.place,
    jewelType: row.jewelType,
    marks: row.marks.map(copyJewelMark),
  };
}

function copyJewelMark(mark: WireJewelMark): WireJewelMark {
  return { field: mark.field, text: mark.text };
}

function copyIllustrat(snap: WireIllustratSnapshot): WireIllustratSnapshot {
  return {
    rows: snap.rows.map(copyIllustratRow),
    marks: snap.marks.map(copyIllustratMark),
  };
}

function copyIllustratRow(row: WireIllustratRow): WireIllustratRow {
  return {
    heroType: row.heroType,
    star: row.star,
    marks: row.marks.map(copyIllustratMark),
  };
}

function copyIllustratMark(mark: WireIllustratMark): WireIllustratMark {
  return { field: mark.field, text: mark.text };
}

function copyPet(snap: WirePetSnapshot): WirePetSnapshot {
  return {
    rows: snap.rows.map(copyPetRow),
    marks: snap.marks.map(copyPetMark),
  };
}

function copyPetRow(row: WirePetRow): WirePetRow {
  return {
    petId: row.petId,
    sysId: row.sysId,
    heroId: row.heroId,
    level: row.level,
    marks: row.marks.map(copyPetMark),
  };
}

function copyPetMark(mark: WirePetMark): WirePetMark {
  return { field: mark.field, text: mark.text };
}

function copyWorld(snap: WireWorldSnapshot): WireWorldSnapshot {
  return {
    level: snap.level,
    marks: snap.marks.map(copyWorldMark),
  };
}

function copyWorldMark(mark: WireWorldMark): WireWorldMark {
  return { field: mark.field, text: mark.text };
}

function copyPromotion(snap: WirePromotionSnapshot): WirePromotionSnapshot {
  return {
    isBuyFoundation: snap.isBuyFoundation,
    records: snap.records.map(copyPromotionRecord),
    marks: snap.marks.map(copyPromotionMark),
  };
}

function copyPromotionRecord(row: WirePromotionRecord): WirePromotionRecord {
  return {
    key: row.key,
    value: row.value,
    marks: row.marks.map(copyPromotionMark),
  };
}

function copyPromotionMark(mark: WirePromotionMark): WirePromotionMark {
  return { field: mark.field, text: mark.text };
}

function copyFirstRecharge(snap: WireFirstRechargeSnapshot): WireFirstRechargeSnapshot {
  return {
    recharge: snap.recharge,
    claimed: snap.claimed.slice(),
    rewards: snap.rewards.map(copyFirstRechargeReward),
    marks: snap.marks.map(copyFirstRechargeMark),
  };
}

function copyFirstRechargeReward(row: WireFirstRechargeReward): WireFirstRechargeReward {
  return {
    key: row.key,
    value: row.value,
    marks: row.marks.map(copyFirstRechargeMark),
  };
}

function copyFirstRechargeMark(mark: WireFirstRechargeMark): WireFirstRechargeMark {
  return { field: mark.field, text: mark.text };
}

function copyReiki(snap: WireReikiSnapshot): WireReikiSnapshot {
  return {
    rows: snap.rows.map(copyReikiRow),
    marks: snap.marks.map(copyReikiMark),
  };
}

function copyReikiRow(row: WireReikiRow): WireReikiRow {
  return {
    heroId: row.heroId,
    sysId: row.sysId,
    reikiEquipId: row.reikiEquipId,
    marks: row.marks.map(copyReikiMark),
  };
}

function copyReikiMark(mark: WireReikiMark): WireReikiMark {
  return { field: mark.field, text: mark.text };
}

function copyIslands(snap: WireIslandsSnapshot): WireIslandsSnapshot {
  return {
    nextTime: snap.nextTime,
    stage: snap.stage,
    marks: snap.marks.map(copyIslandsMark),
  };
}

function copyIslandsMark(mark: WireIslandsMark): WireIslandsMark {
  return { field: mark.field, text: mark.text };
}

function copyTotems(snap: WireTotemsSnapshot): WireTotemsSnapshot {
  return {
    rows: snap.rows.map(copyTotemsRow),
    marks: snap.marks.map(copyTotemsMark),
  };
}

function copyTotemsRow(row: WireTotemsRow): WireTotemsRow {
  return {
    tId: row.tId,
    sysId: row.sysId,
    heroId: row.heroId,
    level: row.level,
    quality: row.quality,
    marks: row.marks.map(copyTotemsMark),
  };
}

function copyTotemsMark(mark: WireTotemsMark): WireTotemsMark {
  return { field: mark.field, text: mark.text };
}

function copyAstrolabe(snap: WireAstrolabeSnapshot): WireAstrolabeSnapshot {
  return {
    maxStar: snap.maxStar,
    active: snap.active.map(copyAstrolabeActive),
    activeElem: snap.activeElem.slice(),
    activeAstrolabe: snap.activeAstrolabe,
    marks: snap.marks.map(copyAstrolabeMark),
  };
}

function copyAstrolabeActive(row: WireAstrolabeActive): WireAstrolabeActive {
  return {
    key: row.key,
    value: row.value,
    marks: row.marks.map(copyAstrolabeMark),
  };
}

function copyAstrolabeMark(mark: WireAstrolabeMark): WireAstrolabeMark {
  return { field: mark.field, text: mark.text };
}

function copyTweakCube(snap: WireCubeSnapshot): WireCubeSnapshot {
  return {
    rankHero: snap.rankHero.slice(),
    openCount: snap.openCount,
    trenches: snap.trenches.map(copyTweakCubeTrench),
    marks: snap.marks.map(copyTweakCubeMark),
  };
}

function copyTweakCubeTrench(row: WireCubeTrench): WireCubeTrench {
  return {
    index: row.index,
    heroId: row.heroId,
    lastChangeTime: row.lastChangeTime,
    marks: row.marks.map(copyTweakCubeMark),
  };
}

function copyTweakCubeMark(mark: WireCubeMark): WireCubeMark {
  return { field: mark.field, text: mark.text };
}

function copyDragon(snap: WireDragonSnapshot): WireDragonSnapshot {
  return {
    identifyLevel: snap.identifyLevel,
    attrLevel: snap.attrLevel,
    identities: snap.identities.map(copyDragonIdentity),
    slots: snap.slots.map(copyDragonSlot),
    privilegeEndTime: snap.privilegeEndTime,
    marks: snap.marks.map(copyDragonMark),
  };
}

function copyDragonIdentity(row: WireDragonIdentity): WireDragonIdentity {
  return {
    type: row.type,
    startTime: row.startTime,
    level: row.level,
    speedAdd: row.speedAdd,
    marks: row.marks.map(copyDragonMark),
  };
}

function copyDragonSlot(row: WireDragonSlot): WireDragonSlot {
  return {
    id: row.id,
    sysId: row.sysId,
    marks: row.marks.map(copyDragonMark),
  };
}

function copyDragonMark(mark: WireDragonMark): WireDragonMark {
  return { field: mark.field, text: mark.text };
}

function copyDragonCollection(snap: WireDragonCollectionSnapshot): WireDragonCollectionSnapshot {
  return {
    sysIds: snap.sysIds.slice(),
    marks: snap.marks.map(copyDragonCollectionMark),
  };
}

function copyDragonCollectionMark(mark: WireDragonCollectionMark): WireDragonCollectionMark {
  return { field: mark.field, text: mark.text };
}

function copyTitle(snap: WireTitleSnapshot): WireTitleSnapshot {
  return {
    titles: snap.titles.map(copyTitleRow),
    marks: snap.marks.map(copyTitleMark),
  };
}

function copyTitleRow(row: WireTitleRow): WireTitleRow {
  return {
    idx: row.idx,
    endTime: row.endTime,
    marks: row.marks.map(copyTitleMark),
  };
}

function copyTitleMark(mark: WireTitleMark): WireTitleMark {
  return { field: mark.field, text: mark.text };
}

function copyHeadPortrait(snap: WireHeadPortraitSnapshot): WireHeadPortraitSnapshot {
  return {
    idxList: snap.idxList.slice(),
    marks: snap.marks.map(copyHeadPortraitMark),
  };
}

function copyHeadPortraitMark(mark: WireHeadPortraitMark): WireHeadPortraitMark {
  return { field: mark.field, text: mark.text };
}

function copyBorder(snap: WireBorderSnapshot): WireBorderSnapshot {
  return {
    units: snap.units.map(copyBorderUnit),
    marks: snap.marks.map(copyBorderMark),
  };
}

function copyBorderUnit(row: WireBorderUnit): WireBorderUnit {
  return {
    id: row.id,
    activeState: row.activeState,
    marks: row.marks.map(copyBorderMark),
  };
}

function copyBorderMark(mark: WireBorderMark): WireBorderMark {
  return { field: mark.field, text: mark.text };
}

function copyFashion(snap: WireFashionSnapshot): WireFashionSnapshot {
  return {
    list: snap.list.map(copyFashionRow),
    marks: snap.marks.map(copyFashionMark),
  };
}

function copyFashionRow(row: WireFashionRow): WireFashionRow {
  return {
    heroType: row.heroType,
    fashionId: row.fashionId,
    level: row.level,
    status: row.status,
    endTime: row.endTime,
    marks: row.marks.map(copyFashionMark),
  };
}

function copyFashionMark(mark: WireFashionMark): WireFashionMark {
  return { field: mark.field, text: mark.text };
}

function copyWornFashion(snap: WireWornFashionSnapshot): WireWornFashionSnapshot {
  return {
    list: snap.list.map(copyWornFashionRow),
    marks: snap.marks.map(copyWornFashionMark),
  };
}

function copyWornFashionRow(row: WireWornFashionRow): WireWornFashionRow {
  return {
    heroId: row.heroId,
    fashionId: row.fashionId,
    marks: row.marks.map(copyWornFashionMark),
  };
}

function copyWornFashionMark(mark: WireWornFashionMark): WireWornFashionMark {
  return { field: mark.field, text: mark.text };
}

function copyHeroPrayer(snap: WireHeroPrayerSnapshot): WireHeroPrayerSnapshot {
  return {
    privilege: snap.privilege,
    endTime: snap.endTime,
    marks: snap.marks.map(copyHeroPrayerMark),
  };
}

function copyHeroPrayerMark(mark: WireHeroPrayerMark): WireHeroPrayerMark {
  return { field: mark.field, text: mark.text };
}

function copyPetIllustrate(snap: WirePetIllustrateSnapshot): WirePetIllustrateSnapshot {
  return {
    petTypes: snap.petTypes.slice(),
    marks: snap.marks.map(copyPetIllustrateMark),
  };
}

function copyPetIllustrateMark(mark: WirePetIllustrateMark): WirePetIllustrateMark {
  return { field: mark.field, text: mark.text };
}

function copyFetter(snap: WireFetterSnapshot): WireFetterSnapshot {
  return {
    resetCount: snap.resetCount,
    goddess: snap.goddess.map(copyFetterGoddess),
    marks: snap.marks.map(copyFetterMark),
  };
}

function copyFetterGoddess(row: WireFetterGoddess): WireFetterGoddess {
  return {
    type: row.type,
    exp: row.exp,
    level: row.level,
    skillLevel: row.skillLevel,
    refineLevel: row.refineLevel,
    uplimitLevel: row.uplimitLevel,
    soulLevel: row.soulLevel,
    washLevel: row.washLevel,
    marks: row.marks.map(copyFetterMark),
  };
}

function copyFetterMark(mark: WireFetterMark): WireFetterMark {
  return { field: mark.field, text: mark.text };
}

function copyFetterFashion(snap: WireFetterFashionSnapshot): WireFetterFashionSnapshot {
  return {
    activeTypes: snap.activeTypes.slice(),
    useType: snap.useType,
    marks: snap.marks.map(copyFetterFashionMark),
  };
}

function copyFetterFashionMark(mark: WireFetterFashionMark): WireFetterFashionMark {
  return { field: mark.field, text: mark.text };
}

function copyShenBin(snap: WireShenBinSnapshot): WireShenBinSnapshot {
  return {
    infos: snap.infos.map(copyShenBinInfo),
    marks: snap.marks.map(copyShenBinMark),
  };
}

function copyShenBinInfo(row: WireShenBinInfo): WireShenBinInfo {
  return {
    job: row.job,
    coreLv: row.coreLv,
    fighting: row.fighting,
    equip: row.equip ? copyShenBinEquip(row.equip) : null,
    marks: row.marks.map(copyShenBinMark),
  };
}

function copyShenBinEquip(equip: WireShenBinEquip): WireShenBinEquip {
  return {
    job: equip.job,
    holes: equip.holes.map(copyShenBinHole),
    marks: equip.marks.map(copyShenBinMark),
  };
}

function copyShenBinHole(hole: WireShenBinHole): WireShenBinHole {
  return { marks: hole.marks.map(copyShenBinMark) };
}

function copyShenBinMark(mark: WireShenBinMark): WireShenBinMark {
  return { field: mark.field, text: mark.text };
}

function copyOccupation(snap: WireOccupationSnapshot): WireOccupationSnapshot {
  return {
    info: snap.info ? copyOccupationInfo(snap.info) : null,
    marks: snap.marks.map(copyOccupationMark),
  };
}

function copyOccupationInfo(info: WireOccupationInfo): WireOccupationInfo {
  return {
    ocId: info.ocId,
    tasks: info.tasks.map(copyOccupationTask),
    marks: info.marks.map(copyOccupationMark),
  };
}

function copyOccupationTask(row: WireOccupationTask): WireOccupationTask {
  return {
    taskId: row.taskId,
    targetCount: row.targetCount,
    condition: row.condition,
    completeType: row.completeType,
    marks: row.marks.map(copyOccupationMark),
  };
}

function copyOccupationMark(mark: WireOccupationMark): WireOccupationMark {
  return { field: mark.field, text: mark.text };
}

function copyRoleShenBin(snap: WireRoleShenBinSnapshot): WireRoleShenBinSnapshot {
  return {
    items: snap.items.map(copyRoleShenBinItem),
    marks: snap.marks.map(copyRoleShenBinMark),
  };
}

function copyRoleShenBinItem(row: WireRoleShenBinItem): WireRoleShenBinItem {
  return {
    itemType: row.itemType,
    itemNum: row.itemNum,
    marks: row.marks.map(copyRoleShenBinMark),
  };
}

function copyFetterContract(snap: WireFetterContractSnapshot): WireFetterContractSnapshot {
  return {
    contracts: snap.contracts.slice(),
    marks: snap.marks.map(copyFetterContractMark),
  };
}

function copyFetterContractMark(mark: WireFetterContractMark): WireFetterContractMark {
  return { field: mark.field, text: mark.text };
}

function copyFormation(snap: WireFormationSnapshot): WireFormationSnapshot {
  return {
    unlockIds: snap.unlockIds.slice(),
    marks: snap.marks.map(copyFormationMark),
  };
}

function copyFormationMark(mark: WireFormationMark): WireFormationMark {
  return { field: mark.field, text: mark.text };
}

function copyLineUp(snap: WireLineUpSnapshot): WireLineUpSnapshot {
  return {
    rows: snap.rows.map(copyLineUpRow),
    assistanceUnlock: snap.assistanceUnlock,
    marks: snap.marks.map(copyLineUpMark),
  };
}

function copyLineUpRow(row: WireLineUpRow): WireLineUpRow {
  return { marks: row.marks.map(copyLineUpMark) };
}

function copyLineUpMark(mark: WireLineUpMark): WireLineUpMark {
  return { field: mark.field, text: mark.text };
}

function copyRunningPromotion(snap: WireRunningPromotionSnapshot): WireRunningPromotionSnapshot {
  return {
    rows: snap.rows.map(copyRunningPromotionRow),
    marks: snap.marks.map(copyRunningPromotionMark),
  };
}

function copyRunningPromotionRow(row: WireRunningPromotionRow): WireRunningPromotionRow {
  return {
    id: row.id,
    startTime: row.startTime,
    endTime: row.endTime,
    clearTime: row.clearTime,
    turns: row.turns,
    marks: row.marks.map(copyRunningPromotionMark),
  };
}

function copyRunningPromotionMark(mark: WireRunningPromotionMark): WireRunningPromotionMark {
  return { field: mark.field, text: mark.text };
}

function copyRoleShenBinMark(mark: WireRoleShenBinMark): WireRoleShenBinMark {
  return { field: mark.field, text: mark.text };
}

function copyPvpOpponent(row: WirePvpOpponent): WirePvpOpponent {
  return {
    playerId: row.playerId,
    name: row.name,
    marks: row.marks.map((mark) => ({ field: mark.field, text: mark.text })),
  };
}

function copyHero(entry: WireHeroEntry): WireHeroEntry {
  return {
    heroId: entry.heroId,
    heroType: entry.heroType,
    level: entry.level,
    stage: entry.stage,
    star: entry.star,
    elem: entry.elem,
    occupation: entry.occupation,
    isLock: entry.isLock,
    fighting: entry.fighting,
  };
}
