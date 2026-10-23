# 登录 → 主城 → 主线（P1–P4 Prefab 壳）

冷启动用新的 1:1 Prefab 看登录、主城和主线。原来的代码页、协议探针和 `BattlePage` 都还在。本轮不建 P5 Prefab，不改战斗特效，也不再迁素材。

## 怎么跑

1. 用 Cocos Creator **3.8.8** 打开 `client/`。
2. 打开 `assets/scenes/Boot.scene`，Canvas 上挂 `Boot`（不要挂到 Camera）。启动场景保持 Boot。
3. 预览。默认 **Mock**，不连服务器。地址加 `?transport=ws` 才走本机桥（见 `docs/h5-websocket.md`）。
4. 检查器勾选 `skipLogin` 会跳过登录壳，直接进主城。

预览后的路径：

1. **NoticeLayer** 先盖在登录上。点「确定」或关闭回到登录。
2. **UserLoginLayer** 是登录屏。账号写在用户条上。点服务器条打开 **ChooseServerLayer**，三台 Mock 服用 **ChooseServerCell**。点「登录」走原来的 Mock / 1001。
3. 右上关闭打开 **LanguageSelectLayer**（只看，不改语言）。登录失败一类状态打开 **ErrorLayer**。
4. 没有角色，或点屏幕下方「创角」，仍进原来的 **CreateRolePanel**（`USE_CREATE_ROLE_PREFAB`）。
5. 进主城后中间是 **CityHub**（`USE_CITY_HUB_PREFAB`）：整屏城景（天空、广场、召唤圆台）和建筑标，顶栏底栏叠在上面。不是中间一块黑。左右拖地图，点建筑。底栏七项是 **主城 / 英雄 / 背包 / 战斗 / 副本 / 公会 / 羁绊**。战斗进主线。城景上移一个底栏高度，圆台和建筑标不要落在底栏下面。
6. 左下 **BtnMainline**（或「更多」里的主线）打开主线页，上面盖 **BattlePanelLayer**。点「战斗」走原来的挑战：Mock 打当前关并播代码战报；真服发 3001，有战报时仍挂 `BattlePage`（`USE_BATTLE_PREFAB`）。
7. 壳上的「功能页」，或 Prefab 里的关闭，只把壳藏起来。下面的关卡列表、真服探针或占位页还在，返回也还在。

## 开关

都在代码常量里，默认 `true`。改成 `false` 即退回，不用改场景。

| 常量 | 文件 | 打开时 | 关掉时 |
|------|------|--------|--------|
| `USE_P1_LOGIN_PREFAB` | `Boot.ts` | UserLogin / ChooseServer / Notice / Language / Error | 交给下一行 |
| `USE_LOGIN_PREFAB` | `Boot.ts` | 旧 `LoginPanel.prefab`。P1 加载失败时也会落到这里 | `buildLoginPanel` |
| `USE_CREATE_ROLE_PREFAB` | `Boot.ts` | `CreateRolePanel.prefab` | `buildCreateRolePanel` |
| `USE_CITY_HUB_PREFAB` | `MainApp.ts` | CityHub 地图和建筑 | 代码地图 |
| `USE_CITY_CHROME_PREFAB` | `MainApp.ts` | 顶栏底栏 Prefab | 代码顶底栏 |
| `USE_PAGE_PREFAB_SHELL` | `prefabShellMap.ts` | 下表的 1:1 壳盖在已有页面上 | 只有原来的页面 |
| `USE_BATTLE_PREFAB` | `BattlePage.ts` | 真服回放挂 BattlePage | 代码战斗页。不改 Boot |

`USE_PAGE_PREFAB_SHELL` 不进 Boot。主城开关也不进 Boot。

## 建筑和页面壳

有协议或代码页的，壳盖在那一页上。没有路由的建筑仍是占位页（`cityAtomRoute` 不改），壳只负责能看见。

| 入口 | 页面 | 壳 |
|------|------|----|
| 主线（BtnMainline / 更多） | 原来的主线页 | `battle/BattlePanelLayer`，「战斗」= 原来的挑战 |
| 召唤法阵 | 城内建筑，不是底栏 | `summon/SummonLayer` |
| 铁匠铺 | 城内建筑，不是底栏 | `smith/SmithLayer` |
| 英雄 | 底栏英雄 | `hero/HeroListLayer` |
| 更多 → 英雄殿堂 | `heroPalace` | `hero/HeroPalaceLayer` |
| 英雄详情 | `hero-detail` | `hero/HeroInfoLayer` |
| 竞技场 | `arena` | `pvp/PvpLayer` |
| 幻境之塔 | `tower` | `fantasy-tower/FantasyTowerLayer` |
| 背包 | `bag` | `backpack/BackpackLayer` |
| 邮件（底栏邮件 / 更多） | `mail` | `mail/MailLayer` |
| 挂机 | `idle` | `quick-battle/QuickBattleLayer` |
| 成就 | `achieve` | `achievement/AchievementLayer` |
| 世界等级 | `world` | `role/WorldLevelLayer` |
| 宠物 | `pet` | `pet/PetInfoLayer` |
| 咖啡馆 | `cafe` | `main-task/MainTaskLayer` |
| 远古遗迹 | 占位 `main_ancient` | `ancient/AncientLayer` |
| 英雄合成 | 占位 `main_hero_make` | `hero-creat/HeroCreatLayer` |
| 酒馆任务 | 占位 `main_pub_task` | `main-task/MainTaskLayer`（标题是咖啡馆） |
| 祭坛 | 占位 `main_altar` | `altar/AltarLayer` |
| 幻境之地 | 占位 `main_fantasy_land` | `fantasy-land/FantasyLandMainLayer` |
| 英雄置换 | 占位 `main_hero_pernute` | `hero/HeroPernuteLayer` |
| 异域冒险 | 占位 `main_exotic_adventure` | `exotic-adventure/ExoticAdventureLayer` |
| 魔方 | 占位 `main_magic_cube` | `magic-cube/MagicCubeLayer` |

商店、祈福池、先知之树、黑市、远征、国战没有 P1–P4 的 1:1 Prefab，仍走原来的页面或占位，不在这轮做壳。

## 验收

预览进主城后应看到：

- 中间是城景（欧式建筑、广场、天空），召唤圆台在画面中下，建筑标可点。顶栏和底栏叠在城景上。
- 底栏从左到右：主城、英雄、背包、战斗、副本、公会、羁绊。战斗在正中，略大。
- 圆台和近景建筑在底栏之上。点战斗进主线，点英雄进英雄列表。
- 公告盖住登录，登录字不会透出来。「确定」在公告窗里。

主城页不挂 `USE_PAGE_PREFAB_SHELL`。壳上的「功能页」在左上，不压 1:1 画面中间。

## 已知缺口

- **空图**：老 ccbi 有的图在资源和旧包里都没有（例如 `button/btn-close-2.png`，选服关闭改用 `btn-close-1`）。这种格子会空着。
- **九宫格**：一批切片和 ccbi 要求不一致，采用值记在各批节点表和 `docs/prefab-1to1-deviations.md`。Prefab 不再改 `.meta`。
- **只是壳**：LanguageSelect 不改语言。BattlePanel 的「快速战斗」「我要变强」没有接到协议。没有路由的建筑没有协议，功能页上是占位和返回。
- **CreateNickRewardLayer** 不在这条路径上。创角仍用 `CreateRolePanel`，不是起名领奖层。
- **UserLoginLayer** 没有密码框。Mock 不校验密码。`password()` 返回空字符串。
- **MissionLayer** 是日常副本，不是主线挑战，所以主线壳用 BattlePanelLayer。
- 全屏 CCMenu 会挡住后面的按钮。登录和壳会把关闭 / 登录 / 战斗抬到最上层；其余按钮若点不到，用「功能页」进原来的页面。
- 壳是异步盖上去的，第一下可能先闪原来的页面。加载失败打日志并留原来的页面。
- 战斗回放、受击和技能帧不动。`WireBattlePage` 仍不挂。
