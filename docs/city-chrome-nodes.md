# 主城顶底栏节点（CityChrome）

设计画布 **720×1280**，原点在画面中心，和 `CityHub`、原来的 `CityChrome` 一样。底栏、顶栏原图大约 640 宽，Prefab 里拉到 720，运行时 `sealBottomBg` 仍把 `BottomBar/Bg` 加宽到 724，垫住左右透边。

再生：`python3 client/tools/gen_citychrome_prefab.py`。脚本从 chrome zip 覆盖同路径 PNG（有则写），给新图补 Creator 3.8 `.meta`，已有图只在裁切数字变化时改 `.meta`，**不改 uuid**。不写 #66 那五张九宫格，不引用日文 `lbl` 位图。

`CityChromeShell` 只有 `@property` 节点引用。不加载 Prefab，不发协议。`USE_CITY_CHROME_PREFAB` 仍是原来的开关，本刀不改它。`CityChrome.ts` 只把已有绑定改到下面这些路径，好让顶栏名字、货币和五个底栏继续能写、能点。

## 节点

坐标是画面中心系。父节点不是根时，表里写的是换算后的画面位置。

| 节点 | 画面位置 | 尺寸 | 作用 |
| --- | --- | --- | --- |
| `TopBar` | (0, 568) | 720×160 | 顶栏组，挡点击 |
| `TopBar/Bg` | (0, 567) | 720×146 | 金边顶条 |
| `TopBar/Avatar` | (-304, 588) | 104×104 | 头像金圈 |
| `TopBar/LevelBg` | (-304, 546) | 60×22 | 等级底，压在头像下沿 |
| `TopBar/LblLevel` | (-304, 546) | 52×20 | 等级，默认 `1` |
| `TopBar/NameBg` | (-150, 602) | 176×34 | 名字底 |
| `TopBar/LblName` | (-150, 602) | 160×28 | 名字。绑定写 `formatNameLine()` |
| `TopBar/LblSub` | (-150, 574) | 200×18 | 区服行。绑定写 `formatSubLine()` |
| `TopBar/PowerSlot` | (22, 602) | 112×30 | 战力槽 |
| `TopBar/PowerSlot/Value` | (38, 602) | 52×24 | 战力数字，默认 `0`。现有绑定不写它 |
| `TopBar/CurrencyGold` | (154, 602) | 136×30 | 金币槽 |
| `TopBar/CurrencyGold/Value` | (150, 602) | 68×24 | 绑定写 `formatGoldLine()`，过长会缩小 |
| `TopBar/CurrencyGold/BtnAddGold` | (206, 602) | 24×24 | 蓝色加号。`clickEvents` 空 |
| `TopBar/CurrencyGem` | (292, 602) | 124×30 | 钻石槽 |
| `TopBar/CurrencyGem/Value` | (290, 602) | 62×24 | 绑定写 `formatDiamondLine()` |
| `TopBar/CurrencyGem/BtnAddGem` | (340, 602) | 22×22 | 蓝色加号。`clickEvents` 空 |
| `ActGroup` | (210, 424) | 280×116 | 右上活动组，不是通栏 |
| `ActGroup/ActRecommend` | (98, 450) | 50×50 | 英雄推荐 |
| `ActGroup/ActSevenDay` | (154, 450) | 50×50 | 七日目标 |
| `ActGroup/ActHeroArrive` | (210, 450) | 50×50 | 英雄降临 |
| `ActGroup/ActPrivilege` | (266, 450) | 50×50 | 特权 |
| `ActGroup/ActWelfare` | (322, 450) | 50×50 | 福利 |
| `ActGroup/BtnActExpand` | (210, 394) | 36×28 | 展开箭头 |
| `ActGroup/ActLimitGift` | (266, 394) | 50×50 | 限时礼包 |
| `ActGroup/ActLimitTime` | (322, 394) | 50×50 | 限时活动 |
| `MonthCard` | (-330, 300) | 44×168 | 左侧月卡条空桩，无贴图 |
| `UtilityRow` | (208, -468) | 300×52 | 底栏上方右侧小圆钮 |
| `UtilityRow/BtnReplay` | (96, -468) | 48×48 | 录像 |
| `UtilityRow/BtnFriend` | (152, -468) | 48×48 | 好友 |
| `UtilityRow/BtnMail` | (208, -468) | 48×48 | 邮件 |
| `UtilityRow/BtnRank` | (264, -468) | 48×48 | 排行 |
| `UtilityRow/BtnMore` | (320, -468) | 48×48 | 更多（蓝圆加号） |
| `BottomBar` | (0, -575) | 720×140 | 底栏组，挡点击 |
| `BottomBar/Bg` | (0, -575.5) | 720×129 | 金边底框 |
| `BottomBar/TabCity` | (-288, -562) | 86×86 | 主城。子节点 `Icon` `Label` `Lock` |
| `BottomBar/TabHero` | (-144, -562) | 86×86 | 英雄 |
| `BottomBar/TabSummon` | (0, -562) | 86×86 | 召唤 |
| `BottomBar/TabForge` | (144, -562) | 86×86 | 铁匠铺 |
| `BottomBar/TabPlay` | (288, -554) | 100×100 | 玩法，用战斗双剑，圆底更大、位置略高 |
| `BtnActivity` | (-160, -470) | 168×48 | **未激活**。对齐 `CITY_SCREEN_ACTIVITY` |
| `BtnMorePanel` | (160, -470) | 168×48 | **未激活**。对齐 `CITY_SCREEN_MORE` |

底栏五个钮都有 `cc.Button`（缩放，`clickEvents` 为空）。选中时现有逻辑染的是圆底，不染 `Icon`。`Lock` 默认隐藏，锁定时由绑定打开。`Label` 文案仍走原来的 `setTabs`。

`BtnActivity` / `BtnMorePanel` 没有可见底图。主屏上的红「活动」、蓝「更多」仍是 `MainApp.buildCity()` 画的，本刀不接。

## 贴图

| 用途 | 路径 |
| --- | --- |
| 顶条 | `ui/city/main-scene_spr-up-bg.png` |
| 底框 | `ui/city/main-scene_spr-bottom-bg.png`（zip 垫边覆盖，uuid 不变） |
| 头像框 | `ui/city/main-scene_spr-head-frame-1.png` |
| 名字底 | `ui/city/main-scene_spr-name-bg-1.png` |
| 等级底 | `ui/city/main-scene_spr-level-bg.png` |
| 货币 / 战力槽 | `ui/city/main-scene_spr-res-bg.png` |
| 战力字 | `ui/common/other_spr-power.png` |
| 金币、钻石 | `ui/common/res-icon_res-1.png`、`res-icon_res-2.png` |
| 蓝色加号 | `ui/common/button_btn-add-4.png` |
| 底栏圆底 | `ui/common/button_btn-circle-blue-1.png`；玩法用 `button_btn-circle-blue-2.png` |
| 主城 / 英雄 / 玩法图标 | `ui/city/main-scene-lang_spr-city.png`、`spr-hero.png`、`spr-battle.png` |
| 召唤 / 铁匠铺图标 | `ui/city/main-city_icon-main_summon.png`、`icon-main_smith_shop.png` |
| 锁 | `ui/city/main-scene_spr-lock.png` |
| 活动图标 | `main-city_btn-hero-recommend-1`、`icon-act_sevent_day_target`、`icon-act_hero_arrive`、`icon-act_privilege`、`icon-act_welfare`、`icon-act_limit_gift`、`icon-act_limit_time_activity` |
| 展开 | `ui/common/button_btn-down.png` |
| 工具圆钮 | `main-city_btn-main-video-studio`、`btn-friend-1`、`btn-mail-1`、`btn-rank-1`、`btn-unfold-1` |

字用 `font/FZCSJW-GB1-0.ttf`。没有把日文 `main-scene-lang_lbl-*` 放进 Prefab。

zip 里另外盖上、本 Prefab 没用的图：`main-scene_spr-battle-bottom`（640×369 的面板框，不是底栏）、`spr-backpack`、`main-scene-lang_spr-backpack/clan/skin`、`button_btn-add-1/2/10/11`、`button_btn-info*`、`button_btn-left*`、`other_spr-power-bg`、`power_spr-power-bg`、`power_spr-power-title`。uuid 已有的保持不变。

## 和日文主城的差别

日文参考是白金顶条、右上小叠活动圆、底栏上方一排工具圆、底栏约 7 个大圆标（主城 / 英雄 / 背包 / 战斗 / 副本 / 公会 / 羁绊），战斗在中间略突出。

本刀：

- 底栏仍是 **5** 格：主城、英雄、召唤、铁匠铺、玩法。没有背包、副本、公会、羁绊四个独立页签。玩法用战斗双剑，圆底用更亮的 `circle-blue-2`，直径 100，比其余 86 略高，仍排在最右，不改五个 id 的顺序。
- 顶条是现有 `spr-up-bg`（蓝底金边），图集里没有另一张纯白顶条。
- 加号是蓝色菱形 `btn-add-4`，不是圆角小蓝钮。
- 召唤、铁匠铺没有独立圆标，用的是地图建筑牌（自带「召唤法阵」「铁匠铺」横幅），再加中文 `Label`。
- 活动只放了 7 个占位，叠成两排靠右。`CityMap.placeActivities` 仍会按配置把活动图标铺成通栏，本刀不改地图拖动，也不改那条布局。运行时两套会叠在一起，等客户端把活动生成改挂到 `ActGroup` 再停掉通栏。
- 月卡条只有空节点 `MonthCard`。
- 战力数字和等级徽章还是占位。现有绑定只写名字（名字串里仍带 `Lv`）、区服、金币、钻石。
- 红「活动」、蓝「更多」仍由页面代码画在 (-160, -470) 和 (160, -470)。Prefab 里同坐标的桩是关着的，避免再叠一层纯色矩形。
