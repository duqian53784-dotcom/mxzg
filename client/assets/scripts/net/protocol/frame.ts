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
  /**
   * c2s 空体。进主城、空 c2s 70001 之后发，只发一次。
   * 整帧 `04 00 00 00 29 1d 01 00`。73001 = 0x11D29，小端 29 1d 01 00。
   * GReqFloatingIslandsTime / GResFloatingIslandsTime。next_time 是字段 2，stage 是字段 3。
   * 不发 73002。73002 有懒建和日刷写库，不当纯只读。
   * 不发 73003 挑战、73004 买次数。本号无写库。不做 20011。
   * 不夹在 2001 和 3007 中间。不是角色资料 2001。不是灵器数据 70001。
   */
  floatingIslandsTime: 73001,
  /**
   * c2s 空体。进主城、空 c2s 73001 之后发，只发一次。
   * 整帧 `04 00 00 00 3c 22 01 00`。74300 = 0x1223C，小端 3c 22 01 00。
   * GReqTotemsInfoList / GResTotemsInfoList。list 是字段 1，repeated PSTotemsInfo。
   * t_id、sys_id、hero_id、level、quality 按声明顺序是 1、2、3、4、5。
   * 不发 74301 升级/升阶、74302 装备/卸/换、74303 重置。
   * 74304 仅 s2c 推送，勿发、勿当拉包请求。本号无写库。不做 20011。
   * 不夹在 2001 和 3007 中间。与 74100 宠物同城养成段。不是浮空岛时间 73001。不是宠物信息 74100。
   */
  totemsInfoList: 74300,
  /**
   * c2s 空体。进主城、空 c2s 74300 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 a1 09 01 00`。68001 = 0x109A1，小端 a1 09 01 00。
   * GReqAstrolabeData / GResAstrolabeData。handler getData 不读 req。
   * maxStar 是字段 1。active 是字段 2，repeated PSMapData 的 key、value。
   * activeElem 是字段 3，int 列表。activeAstrolabe 是字段 4。
   * 不发 68002 激活元素、68003 点亮星盘、68004 重置、68006 激活星盘。
   * 68005 是更新星数常量，勿发、勿当拉包请求。不做 20011。
   * 服侧轻懒建：首次 load 可能 astrolabeDao.add 空行。无扣费，无领奖，无日刷写库。管理员认定可接受。
   * 不夹在 2001 和 3007 中间。不是图腾信息 74300。不是浮空岛时间 73001。
   */
  astrolabeData: 68001,
  /**
   * c2s 空体。进主城、空 c2s 68001 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 ed 26 01 00`。75501 = 0x126ED，小端 ed 26 01 00。
   * GReqTweakCube / GResTweakCube。handler getData 不读 req。
   * rank_hero 是字段 1，repeated int64。open_count 是字段 2。
   * trench 是字段 3，repeated PSTrench 的 index、hero_id、last_change_time。
   * 不发 75502 添加、75503 卸下、75504 开格子、75505 清 cd。
   * 75506 是等级推送，勿发、勿当拉包请求。不做 34001。不做 20011。
   * 服侧轻懒建：首次 get 可能 doCreate + tweakCubeDao.add，建免费槽并按战力塞供奉。无扣费，无领奖。管理员认定可接受，同星盘。
   * 不夹在 2001 和 3007 中间。不是星盘数据 68001。不是图腾信息 74300。
   */
  tweakCubeData: 75501,
  /**
   * c2s 空体。进主城、空 c2s 75501 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 79 e6 00 00`。59001 = 0xE679，小端 79 e6 00 00。
   * GReqDragonScanInfo / GResDragonScanInfo。handler scanDragonInfo 不读 msg。
   * identify_level 是字段 1。attr_level 是字段 2。
   * identities 是字段 3，type、start_time、level、speed_add。
   * slots 是字段 4，id、sys_id。privilege_end_time 是字段 5。
   * 不发 59002 放源石、59003 提升鉴定、59005 加速鉴定、59006 鉴定领奖、59007 提升圣龙等级、59008 圣物替换、59009 调顺序、59011、59012 升星、59013 分解。
   * 59010 是另只读，单独在 59001 之后拉包，勿与 59001 合并成一个请求，勿当写号。不做 34001。不做 20011。
   * 服侧轻懒建：首次 dragonDao.add。无扣费，无领奖。
   * 不夹在 2001 和 3007 中间。不是魔方数据 75501。不是星盘数据 68001。
   */
  dragonScan: 59001,
  /**
   * c2s 空体。进主城、空 c2s 59001 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 82 e6 00 00`。59010 = 0xE682，小端 82 e6 00 00。
   * GReqDragonCollection / GResDragonCollection。handler 不读 msg。
   * sys_id 是字段 1，repeated int32，图鉴 manuals。
   * 不发 59002 放源石、59003 提升鉴定、59005 加速鉴定、59006 鉴定领奖、59007 提升圣龙等级、59008 圣物替换、59009 调顺序、59011、59012 升星、59013 分解。
   * 勿与 59001 合并成一个请求。不做 34001。不做 20011。
   * 服侧轻懒建：与 59001 同 getDragon / dragonDao.add。无扣费，无领奖。
   * 不夹在 2001 和 3007 中间。不是圣龙数据 59001。不是魔方数据 75501。
   */
  dragonCollection: 59010,
  /**
   * c2s 空体。进主城、空 c2s 59010 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 d9 d6 00 00`。55001 = 0xD6D9，小端 d9 d6 00 00。
   * GReqScanTitleList / GResScanTitleList。
   * titles 是字段 1，repeated PSTitle。idx 是字段 1，end_time 是字段 2。
   * end_time：-1 永久，0 未激活，时间戳为到期。
   * Title.proto 仅 55001 读写对，同模块无写号。不做 34001。不做 20011。
   * 服侧轻懒建：TitleService.getTitle → dao.add。无扣费，无领奖，无日刷。
   * 不夹在 2001 和 3007 中间。不是圣物图鉴 59010。不是圣龙数据 59001。
   * 34001 是另只读，单独在 55001 之后拉包，勿与 55001 合并成一个请求，勿当写号。
   */
  scanTitleList: 55001,
  /**
   * c2s 空体。进主城、空 c2s 55001 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 d1 84 00 00`。34001 = 0x84D1，小端 d1 84 00 00。
   * GReqHeadPortraitList / GResHeadPortraitList。空体，无 page。
   * idx_list 是字段 1，repeated int32，已解锁头像 id。
   * 不发 34002 更换头像。34003 是解锁推送 s2c，无 c2s，勿发、勿当拉包。32001 另只读接在其后，勿与本帧合并。不做 20011。
   * 服侧轻懒建：RoleHeadPortraitService.select 无记录则 dao.add 默认解锁头。无扣费，无领奖，不改当前头像。
   * 不夹在 2001 和 3007 中间。不是称号列表 55001。不是圣物图鉴 59010。
   */
  headPortraitList: 34001,
  /**
   * c2s 空体。进主城、空 c2s 34001 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 01 7d 00 00`。32001 = 0x7D01，小端 01 7d 00 00。
   * GReqBorderData / GResBorderData。空体，无 page。
   * units 是字段 1，repeated PSBorderUnit。id 是字段 1，active_state 是字段 2。
   * 不发 32002 道具激活。不发 32003 使用/切换边框。
   * 32003 是服侧推送：当前框过期时服侧可能写 role.borderId 回落并另推。客户端不发，勿当拉包。
   * 4402 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。
   * 服侧轻懒建免费框可接受。
   * 不夹在 2001 和 3007 中间。不是头像列表 34001。不是称号列表 55001。
   */
  borderData: 32001,
  /**
   * c2s 空体。进主城、空 c2s 32001 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 32 11 00 00`。4402 = 0x1132，小端 32 11 00 00。
   * GReqHeroFashionList / GResHeroFashionList。空体，无 page。
   * list 是字段 1，repeated PSFashionData。
   * hero_type、fashion_id、level、status、end_time 按声明顺序是 1、2、3、4、5。
   * status：0 永久，1 限时。
   * 不发 4403 激活。不发 4404 替换/使用。不发 4405 皮肤升级。
   * 4406 无实现，勿发。4401 穿戴皮肤英雄列表另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。
   * 服侧轻懒建 HeroFashion 可接受。过期限时皮剔除，并可能把英雄 fashionId 置 0。只读展示。无扣费，无领奖。
   * 不夹在 2001 和 3007 中间。不是头像框数据 32001。不是头像列表 34001。
   */
  heroFashionList: 4402,
  /**
   * c2s 空体。进主城、空 c2s 4402 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 31 11 00 00`。4401 = 0x1131，小端 31 11 00 00。
   * GReqHeroFashion / GResHeroFashion。空体，无 page。
   * list 是字段 1，repeated PSHeroFashion。
   * hero_id、fashion_id 按声明顺序是 1、2。
   * 不发 4403 激活。不发 4404 替换/使用。不发 4405 皮肤升级。
   * 4406 无实现，勿发。与 4402 分刀，勿合并。本刀不重复拉 4402。
   * 4201 英雄祈愿数据另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
   * 服侧轻懒建 HeroFashion 可接受。过期限时皮清理，并可能卸英雄 fashionId。只读展示。无扣费，无领奖，无邮件。
   * 不夹在 2001 和 3007 中间。不是激活皮肤列表 4402。不是头像框数据 32001。
   */
  heroFashion: 4401,
  /**
   * c2s 空体。进主城、空 c2s 4401 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 69 10 00 00`。4201 = 0x1069，小端 69 10 00 00。
   * GReqHeroPrayerData / GResHeroPrayerData。空体，无 page。
   * privilege 是字段 1，end_time 是字段 2。privilege：0/1。end_time 未开为 0。
   * 不发 4202 英雄祈愿。4202 扣道具并发奖。74104 另只读接在其后，勿合并。不做 20011。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 4401 分刀，勿合并。本刀不重复拉 4401，也不重复拉 4402。
   * 服侧轻懒建 hero_prayer。特权过期清字段。只读展示。无扣费，无领奖。
   * 不夹在 2001 和 3007 中间。不是穿戴皮肤英雄列表 4401。不是激活皮肤列表 4402。
   * 74104 宠物图鉴另只读接在其后，勿合并。
   */
  heroPrayerData: 4201,
  /**
   * c2s 空体。进主城、空 c2s 4201 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 78 21 01 00`。74104 = 0x12178，小端 78 21 01 00。
   * GReqPetIllustrate / GResPetIllustrate。空体，无 page。
   * petTypes 是字段 1，repeated int32，已解锁宠物类型。
   * 不发 74101 升级、74102 携带、74103 卸下。
   * 74105、74106 是背包增减推送，勿发、勿当拉包请求。
   * 28100 羁绊数据另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 74100、4201 分开发，勿合并。本刀不重复拉 74100，也不重复拉 4201。
   * 服侧允许轻懒建空 PetIllustrate。无扣费，无发奖。只读展示。
   * 不夹在 2001 和 3007 中间。不是宠物信息 74100。不是英雄祈愿数据 4201。
   */
  petIllustrate: 74104,
  /**
   * c2s 空体。进主城、空 c2s 74104 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 C4 6D 00 00`。28100 = 0x6DC4，小端 C4 6D 00 00。
   * GReqFetterList / GResFetterList。空体，无 page。
   * reset_count 是字段 1。goddess 是字段 2，repeated PSFetterData。
   * type、exp、level、skill_level、refine_level、uplimit_level、soul_level、wash_level 按声明顺序是 1 到 8。
   * 不发 28101 升级、28102 升技、28104 突破、28105 重置、28106 铸魂、28108 解锁契约、28109 洗炼。
   * 不发 28002 领任务奖、28003 精炼。
   * 28200 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 74104、4201 分开发，勿合并。本刀不重复拉 74104，也不重复拉 4201。
   * 服侧允许轻懒建（load/getFetterTask）。无扣费，无领奖。只读展示。
   * 不夹在 2001 和 3007 中间。不是宠物图鉴 74104。不是英雄祈愿数据 4201。
   */
  fetterList: 28100,
  /**
   * c2s 空体。进主城、空 c2s 28100 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 28 6E 00 00`。28200 = 0x6E28，小端 28 6E 00 00。
   * GReqFashionData / GResFashionData。空体，无 page。
   * active_type 是字段 1，repeated int32。use_type 是字段 2。
   * 不发 28201 熔炼、28202 激活、28204 领任务奖、28205 使用皮肤。
   * 28203 任务列表虽只读，本刀勿夹发。
   * 不发 28101、28102、28103、28104、28105、28106、28107、28108、28109。不发 28002、28003。
   * 75601 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 28100、74104 分开发，勿合并。本刀不重复拉 28100，也不重复拉 74104。
   * 服侧允许轻懒建 goddess_fashion。无扣费，无发奖，不改皮肤。只读展示。
   * 不夹在 2001 和 3007 中间。不是羁绊数据 28100。不是激活皮肤列表 4402。
   * 75601 神兵数据另只读接在其后，勿合并。
   */
  fetterFashion: 28200,
  /**
   * c2s 空体。进主城、空 c2s 28200 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 51 27 01 00`。75601 = 0x12751，小端 51 27 01 00。
   * GReqShenBinInfo / GResShenBinInfo。空体，无 page。
   * shenBinInfos 是字段 1，repeated PSShenBinInfo。
   * job、coreLv、equipData、fighting 按声明顺序是 1、2、3、4。
   * equipData 的 job 是字段 1，equip_list 是字段 2，repeated PSHoleData。
   * PSHoleData 按字段号写，不猜孔位名。
   * 不发 75602 合成、75603 装备、75604 核心升级、75605 分解。
   * 不发 75619、75609。75606 职级信息另只读接在其后，勿合并。不做 20011。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 28200、28100 分开发，勿合并。本刀不重复拉 28200，也不重复拉 28100。
   * 服侧允许按 job 轻懒建 core（默认 coreLv=1）。无合成，无装备，无核心升级，无分解。只读展示。
   * 不夹在 2001 和 3007 中间。不是羁绊皮肤 28200。不是羁绊数据 28100。
   * 75606 职级信息另只读接在其后，勿合并。
   */
  shenBin: 75601,
  /**
   * c2s 空体。进主城、空 c2s 75601 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 56 27 01 00`。75606 = 0x12756，小端 56 27 01 00。
   * GReqGetOccupationInfo / GResGetOccupationInfo。空体，无 page。
   * occupationInfo 是字段 1。oc_id 是字段 1，taskInfos 是字段 2。
   * taskId、targetCount、condition、complete_type 按声明顺序是 1、2、3、4。
   * 75607 晋升职级也吃同一空体 GReqGetOccupationInfo，cmd 小端 57 27 01 00。只发 75606，不发 75607。
   * 不发 75609 职级任务手动完成。75608 是服推，勿当 c2s。
   * 不发 75602、75603、75604、75605、75619。75615 神兵道具另只读接在其后，勿合并。不做 20011。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 75601、28200 分开发，勿合并。本刀不重复拉 75601，也不重复拉 28200。
   * 服侧允许 getOrCreate 轻懒建。无扣费，无领奖。只读展示。
   * 不夹在 2001 和 3007 中间。不是神兵数据 75601。不是羁绊皮肤 28200。
   * 75615 神兵道具另只读接在其后，勿合并。
   */
  occupation: 75606,
  /**
   * c2s 空体。进主城、空 c2s 75606 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 5F 27 01 00`。75615 = 0x1275F，小端 5F 27 01 00。
   * GReqRoleShenBinInfo / GResRoleShenBinInfo。空体，无 page。
   * roleShenBins 是字段 1，repeated。item_type 是字段 1，itemNum 是字段 2。
   * item_type=902048 是 SHENBIN_ESSENCE 精华。其余 item_type 是 shenBinMap 材料。
   * 不发 75602 合成、75603 装备、75604 核心升级、75605 分解、75619。
   * 不发 75607 晋升职级、75609 职级任务手动完成。75608 是服推，勿当 c2s。
   * 75607 同为空体，cmd 小端 57 27 01 00。只发 75615，不发 75607。
   * 28107 查看契约另只读接在其后，勿合并。不做 20011。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 75606、75601 分开发，勿合并。本刀不重复拉 75606，也不重复拉 75601。
   * 服侧允许 getOrCreate 轻懒建（默认 knighthoodId=1）。只读拼包。无扣费，无领奖。
   * 不夹在 2001 和 3007 中间。不是职级信息 75606。不是神兵数据 75601。
   */
  roleShenBin: 75615,
  /**
   * c2s 空体。进主城、空 c2s 75615 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 CB 6D 00 00`。28107 = 0x6DCB，小端 CB 6D 00 00。
   * GReqFetterContractInfo / GResFetterContractInfo。空体，无 page。
   * contracts 是字段 1，repeated int32，已激活契约。不保证顺序。
   * 不发 28101 升级、28102 升技、28104 突破、28105 重置、28106 铸魂、28108 解锁契约、28109 洗炼。
   * 不发 28002、28003、28004。不发 28201、28202、28203、28204、28205。
   * 3099 查询阵法另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 75615、75606 分开发，勿合并。本刀不重复拉 75615，也不重复拉 75606。
   * 服侧允许 getFetterTask 轻懒建。只读，无解锁、无扣费、无领奖。
   * 不夹在 2001 和 3007 中间。不是神兵道具 75615。不是羁绊数据 28100。
   */
  fetterContract: 28107,
  /**
   * c2s 空体。进主城、空 c2s 28107 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 1B 0C 00 00`。3099 = 0x0C1B，小端 1B 0C 00 00。
   * GReqQueryFormation / GResQueryFormation。空体，无 page。
   * unlockIds 是字段 1，repeated int32，已解锁阵法。不保证顺序。
   * 服侧 BattleHandler.queryFormation @CMD _3099；CmdCode._3099；FormationService.getFormation。
   * 不发 3097 解锁第二契约、3098 解锁阵法、3100 保存战斗队列。
   * 不发 3102 查战报、3030 切磋。3101 副本队列另只读接在其后，勿合并。不做 20011。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 28107、75615 分开发，勿合并。本刀不重复拉 28107，也不重复拉 75615。
   * 服侧允许 getFormation 轻懒建（无记录则 add；未解锁阵法 id=1 则 unlock(1)+update）。
   * 只读，无扣费、无领奖、不写养成。
   * 不夹在 2001 和 3007 中间。不是契约 28107。不是神兵道具 75615。
   */
  formation: 3099,
  /**
   * c2s 空体。进主城、空 c2s 3099 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 1D 0C 00 00`。3101 = 0x0C1D，小端 1D 0C 00 00。
   * GReqLineUp / GResLineUp。空体，无 page。
   * list 是字段 1，repeated PSLineUpData。assistance_unlock 是字段 2，optional bool。
   * 服侧 BattleHandler.getLineUp @CMD _3101；CmdCode._3101；HeroLineUpService.getHeroLineUps / fillLineUp。
   * 不发 3100 保存队列、3098 解锁阵法、3097 解锁第二契约、3030 切磋、3102 请求战报、3103 预计算战斗力。
   * 3099 勿再发。不做备选 5001。不做 20011。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 3099 分开发，勿合并。本刀不重复拉 3099。
   * 服侧允许 getHeroLineUps→fillLineUp 轻修复（formationId==0 则置 1 并轻修站位后 update；本路径不走 add）。
   * 只读，无扣费、无领奖、不写养成。
   * 20101 进行中活动另只读接在其后，勿合并。
   * 不夹在 2001 和 3007 中间。不是阵法 3099。不是契约 28107。
   */
  lineUp: 3101,
  /**
   * c2s 空体。进主城、空 c2s 3101 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 85 4E 00 00`。20101 = 0x4E85，小端 85 4E 00 00。
   * GReqRunningPromotion / GResRunningPromotion。空体，无 page。
   * promotions 是字段 1，repeated PbPromotionData。
   * PbPromotionData：1 id，2 start_time，3 end_time，4 clear_time，5 turns。
   * 服侧 PromotionNewHandler.getAllRunningPromotion；promotionControlService.getAllWillRun() 组列表。纯读。
   * 不发各活动领奖写号（20018、20013、20004、20010，分散在各 Promotion*Handler）。
   * 同文件 20102 非空体勿挂。不做 20011。
   * 51001 已有，勿重复。5001 已有，勿重复。3101、3099 勿再发。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 3101 分开发，勿合并。本刀不重复拉 3101，也不重复拉 3099。
   * 3203 爬塔首通已领另只读接在其后，勿合并。
   * 无扣费，无领奖，不写养成。
   * 不夹在 2001 和 3007 中间。不是副本队列 3101。不是世界等级 51001。不是背包 5001。
   */
  runningPromotion: 20101,
  /**
   * c2s 空体。进主城、空 c2s 20101 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 83 0C 00 00`。3203 = 0x0C83，小端 83 0C 00 00。
   * GReqTowerRewardList / GResTowerRewardList。空体，无 page。
   * list 是字段 1，repeated int32，已领爬塔首通 idx。不保证顺序。
   * 服侧 TowerHandler.towerRewardList @CMD _3203；TowerGMsg；CmdCode._3203。
   * towerService.getTower 无档可 towerDao.add 轻懒建。handler 不走门票回复，不 updateTower。
   * 无扣费，无领奖，无养成写。轻懒建可接受。
   * 不发 3202 买票、3204 领首通、3205 战斗结束、3206 扫荡、3220 编辑 npc。
   * 另只读 3200（含门票回复写库）本轮勿挂、勿编码。
   * 4044 英雄等级重生次数另只读接在其后，勿合并。不做 20011。5001 已有，勿重复。51001 已有，勿重复。
   * 3099、3101、20101 勿再发。不做 3012、3010、19001。12020 每日任务列表另只读接在 13010 之后。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 20101 分开发，勿合并。本刀不重复拉 20101，也不重复拉 3101，也不重复拉 3099。
   * 不夹在 2001 和 3007 中间。不是进行中活动 20101。不是副本队列 3101。不是世界等级 51001。
   */
  towerReward: 3203,
  /**
   * c2s 空体。进主城、空 c2s 3203 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 CC 0F 00 00`。4044 = 0x0FCC，小端 CC 0F 00 00。
   * GReqHeroLevelResetTimes / GResHeroLevelResetTimes。空体，无 page。
   * times 是字段 1。没有的数不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。
   * 服侧 HeroHandler.levelResetTimes @CMD _4044；CmdCode._4044；HeroSummonService.getHeroSummon。
   * getHeroSummon 可能轻懒建。跨日可能把 times 清零并更新。轻懒建、轻日刷可接受。
   * 无扣费，无领奖，无养成写。
   * 不发 4043 英雄等级重生（扣费、清符文、降级、返还）。4043 是写号，不编码、不发送。
   * 13010 签到列表另只读接在其后，勿合并。不做 20011。
   * 5001 已有，勿重复。51001 已有，勿重复。
   * 3203、20101、3101、3099 勿再发。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 3203 分开发，勿合并。本刀不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。
   * 不夹在 2001 和 3007 中间。不是爬塔首通已领 3203。不是进行中活动 20101。不是世界等级 51001。
   * 13010 签到列表另只读接在其后，勿合并。
   */
  heroLevelResetTimes: 4044,
  /**
   * c2s 空体。进主城、空 c2s 4044 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 D2 32 00 00`。13010 = 0x32D2，小端 D2 32 00 00。
   * GReqSignInList / GResSignInList。空体，无 page。
   * days、isSignIn、month、charged、newServer 按声明顺序是字段 1、2、3、4、5。
   * days 是 repeated int32。没有的数不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。只展示实际出现的字段。
   * getSignday 轻懒建。跨日、跨月可能把签到日重置并写库。轻懒建、轻日刷、轻月刷可接受。
   * 无扣费，无领奖。
   * 不发 13011 签到领奖。13011 是写号，不编码、不发送。
   * 12020 每日任务列表另只读接在其后，勿合并。不做 20011。不是启动链 12010。
   * 5001 已有，勿重复。51001 已有，勿重复。
   * 4044、3203、20101、3101、3099 勿再发。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 4044 分开发，勿合并。本刀不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。
   * 不夹在 2001 和 3007 中间。不是英雄等级重生次数 4044。不是世界等级 51001。不是背包 5001。
   */
  signInList: 13010,
  /**
   * c2s 空体。进主城、空 c2s 13010 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 F4 2E 00 00`。12020 = 0x2EF4，小端 F4 2E 00 00。
   * GReqDailyTaskList / GResDailyTaskList。空体，无 page。
   * Task、RewardBoxIdx、DailyValue 按声明顺序是字段 1、2、3。
   * Task 是 repeated PSTaskData。RewardBoxIdx 是 repeated int32。没有的数不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。只展示实际出现的字段。
   * getDailyTasks 可能 reset / checkNew。loadRoleDailyTask 可能按日刷新宝箱进度。轻懒建、轻日刷可接受。
   * 无扣费，无领奖。
   * 不发 12021 领每日任务奖。不发 12022 领活跃宝箱。12021、12022 是写号，不编码、不发送。
   * 26002 每日福利列表另只读接在其后，勿合并。26001 每月福利列表另只读接在 26002 之后，勿合并。不做 20011。不是启动链 12010。
   * 5001 已有，勿重复。51001 已有，勿重复。
   * 13010、4044、3203、20101、3101、3099 勿再发。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 13010 分开发，勿合并。本刀不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。
   * 不夹在 2001 和 3007 中间。不是签到列表 13010。不是成就列表 12010。不是世界等级 51001。不是背包 5001。
   */
  dailyTaskList: 12020,
  /**
   * c2s 空体。进主城、空 c2s 12020 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 92 65 00 00`。26002 = 0x6592，小端 92 65 00 00。
   * GReqDailyWelfareList / GResDailyWelfareList。空体，无 page。
   * list 按声明顺序是字段 1，repeated PSMapData。key 是 giftPackId，value 是 num。
   * 没有的数不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。只展示实际出现的字段。
   * 纯读。轻副作用可接受。无扣费，无领奖写。不发明领奖写号。
   * 26001 每月福利列表另只读接在其后，勿合并。本刀不重复拉 26002。
   * 不发 12021、12022。不做 20011。不是启动链 12010。不是每日任务列表 12020。
   * 5001 已有，勿重复。51001 已有，勿重复。
   * 12020、13010、4044、3203、20101、3101、3099 勿再发。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 12020 分开发，勿合并。本刀不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。
   * 不夹在 2001 和 3007 中间。不是签到列表 13010。不是成就列表 12010。不是世界等级 51001。不是背包 5001。
   */
  dailyWelfareList: 26002,
  /**
   * c2s 空体。进主城、空 c2s 26002 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 91 65 00 00`。26001 = 0x6591，小端 91 65 00 00。
   * GReqMouthWelfareList / GResMouthWelfareList。空体，无 page。proto 名 mouth，就是 month。
   * list 按声明顺序是字段 1，repeated PSMapData。key 是 giftPackId，value 是 num。
   * 没有的数不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。只展示实际出现的字段。
   * 纯读。轻副作用可接受。无扣费，无领奖写。不发明领奖写号。
   * 不重复拉 26002。同模块 26002 已合，不合并、不重发。
   * 不发 12021、12022。61001 周末礼包另只读接在其后，勿合并。不发 61002。不做 62001、63001。不做 20011。不是启动链 12010。不是每日福利列表 26002。不是每日任务列表 12020。
   * 5001 已有，勿重复。51001 已有，勿重复。
   * 26002、12020、13010、4044、3203、20101、3101、3099 勿再发。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 26002 分开发，勿合并。本刀不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。
   * 不夹在 2001 和 3007 中间。不是签到列表 13010。不是成就列表 12010。不是世界等级 51001。不是背包 5001。
   */
  mouthWelfareList: 26001,
  /**
   * c2s 空体。进主城、空 c2s 26001 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 49 EE 00 00`。61001 = 0xEE49，小端 49 EE 00 00。
   * GReqWeekendGiftData / GResWeekendGiftData。空体，无 page。
   * start_time、end_time、reward_status 按声明顺序是字段 1、2、3。
   * reward_status 是 repeated，内层 idx、status。没有的数不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。只展示实际出现的字段。
   * 轻懒建、轻日刷可接受。无扣费，无领奖写。不发明领奖写号。
   * 不重复拉 26001。同模块已合的 26001 不合并、不重发。
   * 不发 61002 领奖。62001 神迹遗物另只读接在其后，勿合并。不做 63001。不发 12021、12022。不做 20011。不是启动链 12010。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。
   * 5001 已有，勿重复。51001 已有，勿重复。
   * 26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 26001 分开发，勿合并。本刀不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。
   * 不夹在 2001 和 3007 中间。不是签到列表 13010。不是成就列表 12010。不是世界等级 51001。不是背包 5001。
   */
  weekendGift: 61001,
  /**
   * c2s 空体。进主城、空 c2s 61001 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 31 F2 00 00`。62001 = 0xF231，小端 31 F2 00 00。
   * GReqGodRelicData / GResGodRelicData。空体，无 page。
   * buyCount、canChallengeCount、starMap、starRewardRecord 按声明顺序是字段 1、2、3、4。
   * starMap 内层 key、value。starRewardRecord 按出现的数或内层字段号写。没有的数不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。只展示实际出现的字段。
   * 轻懒建、轻日刷可接受。无扣费，无领奖写，无成长写。
   * 不重复拉 61001。同模块已合的 61001 不合并、不重发。
   * 不发 62002 挑战。不发 62003 买次数。不发 62004 领星级奖。不发 62005 扫荡。63001 英雄殿堂另只读接在其后，勿合并。不发 63002、63003。69001 积天豪礼2另帧，勿合并。不发 69002。不做 71001。不做 20011。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。
   * 5001 已有，勿重复。51001 已有，勿重复。
   * 61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 61001 分开发，勿合并。本刀不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。
   * 不夹在 2001 和 3007 中间。不是签到列表 13010。不是成就列表 12010。不是世界等级 51001。不是背包 5001。
   */
  godRelic: 62001,
  /**
   * c2s 空体。进主城、空 c2s 62001 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 19 F6 00 00`。63001 = 0xF619，小端 19 F6 00 00。
   * GReqHeroPalaceData / GResHeroPalaceData。空体，无 page。
   * PSHeroPalace 的 type、rankRole、isReward、isWorship、serverRankRole 按声明顺序是字段 1–5。
   * 没有的数不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。只展示实际出现的字段。
   * 轻懒建、轻日刷可接受。跨日会清 worshipType。无扣费，无领奖写，无成长写。
   * 不重复拉 62001。同模块已合的 62001 不合并、不重发。
   * 不发 63002 膜拜。不发 63003 领排名奖。69001 积天豪礼2另帧，勿合并。不发 69002。不做 71001。不做 20011。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。
   * 5001 已有，勿重复。51001 已有，勿重复。
   * 62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 62001 分开发，勿合并。本刀不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。
   * 不夹在 2001 和 3007 中间。不是签到列表 13010。不是成就列表 12010。不是世界等级 51001。不是背包 5001。
   */
  heroPalace: 63001,
  /**
   * c2s 空体。进主城、空 c2s 63001 之后发，只发一次。无 page。
   * 整帧 `04 00 00 00 89 0D 01 00`。69001 = 0x10D89，小端 89 0D 01 00。
   * GReqRechargeDaysBList / GResRechargeDaysBList。空体，无 page。
   * list 为 repeated PSRechargeDaysInfo。day、money、hasReward 按声明顺序是字段 1、2、3。
   * 没有的数不写成 0。出现的 0 仍写 0。出现的 -1 仍写 -1。只展示实际出现的字段。
   * 轻懒建、轻日刷可接受。无扣费，无领奖写，无成长写。
   * 不重复拉 63001。同模块已合的 63001 不合并、不重发。
   * 不发 69002 领取积天豪礼2奖励。不做 71001。不做 20011。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。
   * 5001 已有，勿重复。51001 已有，勿重复。68001 已有，勿重复。70001 已有，勿重复。
   * 63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。
   * 4601 有 page，硬禁。29001 有 page，硬禁。
   * 与 63001 分开发，勿合并。本刀不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。
   * 不夹在 2001 和 3007 中间。不是签到列表 13010。不是成就列表 12010。不是世界等级 51001。不是背包 5001。不是星盘 68001。不是灵器 70001。
   */
  rechargeDaysB: 69001,
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
