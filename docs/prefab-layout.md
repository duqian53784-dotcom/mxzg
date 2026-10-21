# Prefab / 资源目录约定（P0）

- **素材**（图/音/字）：`client/assets/resources/`（`ui/`、`audio/`、`font/` 等）
- **界面 Prefab**：`client/assets/prefabs/ui/`（与素材分目录，勿把 Prefab 和 PNG 放同一层）
- Prefab 内 SpriteFrame 仍通过 uuid 引用 `resources/` 下素材
- **CreateRole 已合**入 `client/assets/prefabs/ui/login/CreateRolePanel.prefab`
- `assets/prefabs` 是 Asset Bundle，名称 `prefabs`。运行时 `assetManager.loadBundle('prefabs')`，再 `bundle.load('ui/login/LoginPanel')`（无扩展名）。编辑器尚未刷出 bundle 时，用 `.prefab.meta` 的 uuid 走 `assetManager.loadAny`。**不要** `resources.load('ui/login/LoginPanel')`：Prefab 不在 `resources/`

| Prefab | 路径（相对 assets） | 挂载点 | Flag（默认 `true`） |
|--------|---------------------|--------|---------------------|
| LoginPanel | `prefabs/ui/login/LoginPanel` | `Boot.ts` 的 `buildLoginPanel(...)` | `USE_LOGIN_PREFAB` |
| CreateRolePanel | `prefabs/ui/login/CreateRolePanel` | `Boot.ts` 的 `buildCreateRolePanel(...)` | `USE_CREATE_ROLE_PREFAB` |
| CityChrome | `prefabs/ui/city/CityChrome` | `MainApp.ts` 的 `mountCityChrome(...)` | `USE_CITY_CHROME_PREFAB` |

三个 flag 默认 **true**：Mock 启动出 Login Prefab，创角出 CreateRole Prefab，进主城后顶栏底栏来自 CityChrome Prefab。

## 回滚

把要退回的常量改成 `false`。`false` 时仍调用原来的 `buildLoginPanel` / `buildCreateRolePanel` / `mountCityChrome`，代码搭 UI 没有删，行为与接 Prefab 之前一致。三个都改 `false` 即整页回到代码 UI。

加载失败会打日志（`login prefab …，改用代码 UI` / `create prefab` / `city chrome prefab`）并退回对应的代码 UI，避免预览停在空画面。这不等于把 flag 改成 false。

## 节点

- Login：`Mask`、`Bg`、`Card/{CardBg,Title,Subtitle,AccountLabel,AccountField,PasswordLabel,PasswordField,ServerLabel,ServerRow/Btn_1|Btn_2|Btn_3,Picked,Status,Detail,BtnEnter,BtnCreate,BtnMock}`
- CreateRole：`Mask,Bg,Card/{CardBg,Title,Hint,Meta,NameLabel,NameField,Status,BtnConfirm,BtnBack}`
- CityChrome：`Top/{Name,Sub,Gold,Diamond}`、`Bottom/Tab_city|Tab_hero|Tab_summon|Tab_smith|Tab_plays`（子节点 `Label`、`Lock`）

适配只绑这些节点。Login 对外仍是 `setStatus` / `setDetail` / `setBusy` / `account` / `password` / `serverId`。CreateRole 仍是 `setStatus` / `setBusy` / `name`。CityChrome 仍是 `setIdentity` / `setCurrencies` / `setTabs`，底栏点击走原来的 `onTab`。

## CityHub（P1，未接线）

- **路径**：`client/assets/prefabs/ui/city/CityHub.prefab`（bundle 内 `ui/city/CityHub`）
- **对照**：`MainApp.buildCity()`，设计基准 **720×1280**，坐标相对页面中心
- **状态**：**未接** Boot、`MainApp.buildCity()`、以及任何 `USE_*_PREFAB`。主城枢纽仍由代码按钮画出。倩验收通过后，再由客户端加加载开关。
- 与 CityChrome 分开：本 Prefab **没有** `Top` / `Bottom` / `Tab_*`。
- 素材只引用 `client/assets/resources/` 的 spriteFrame uuid，Prefab 目录里没有 PNG。
- 再生：`python3 client/tools/gen_cityhub_prefab.py`（从现有 `.meta` 读 `@f9941`，不手写 uuid）

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | — |
| `Title` | (0, 400) | 360×72 | `主城` |
| `BtnMainline` | (0, 280) | 420×76 | `主线` |
| `BtnIdle` | (0, 200) | 420×64 | `挂机` |
| `BtnBag` | (0, 120) | 420×64 | `背包` |
| `BtnMail` | (0, 40) | 420×64 | `邮件` |
| `BtnLogin7` | (-249, -120) | 156×52 | `七日登录` |
| `BtnGoal7` | (-83, -120) | 156×52 | `七日目标` |
| `BtnShop` | (83, -120) | 156×52 | `商店` |
| `BtnGift` | (249, -120) | 156×52 | `礼包` |
| `BtnLimited` | (0, -188) | 420×48 | `限时活动` |
| `BtnLog` | (-180, -40) | 140×48 | `日志` |
| `BtnNotice` | (0, -40) | 140×48 | `公告` |
| `BtnNetDrop` | (190, -40) | 160×48 | `模拟断线` |
| `Hint` | (0, -248) | 640×28 | `系统从底栏进入。带「锁」的点开会提示条件` |
| `Gate` | (0, -330) | 680×72 | `网关…` |
| `NetState` | (0, -420) | 680×28 | `网络 connected` |

按钮节点上是 `cc.Sprite` + `cc.Button`（缩放过渡，`clickEvents` 为空）。文案在子节点 `Label`。有专用图的按钮另有子节点 `Icon`：`BtnMainline`（主线建筑）、`BtnBag`（背包）、`BtnMail`（邮件）、`BtnGoal7`（任务）、`BtnShop`（商店）。没有专用图的按钮只用通用按钮底加文字。`Title` 自身带 Label，底图是 `main-city_spr-title-bg`。

## Mainline（P1，未接线）

Mock 关卡页和真服只读页各一份 Prefab。`MainlinePage.ts` 在同一页里换三个阶段（列表 / 战斗 / 结算）。`WireMainlinePage.ts` 只有标题、当前 idx、最高 idx、说明和返回，标题在 y=220，不是列表的 y=470。两页没有可以共用的内容根。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| MainlinePage | `prefabs/ui/mainline/MainlinePage` | **未接** |
| WireMainlinePage | `prefabs/ui/mainline/WireMainlinePage` | **未接** |

- **路径**：`client/assets/prefabs/ui/mainline/MainlinePage.prefab`、`client/assets/prefabs/ui/mainline/WireMainlinePage.prefab`
- **状态**：**未接** Boot、`MainApp`、`MainlinePage.ts`、`WireMainlinePage.ts`，以及任何 `USE_*_PREFAB`。运行时仍走代码 UI。验收通过后再由客户端加加载开关。
- 设计基准 **720×1280**，坐标相对页面中心（与 `place(...)` 一致）。
- 素材只引用 `client/assets/resources/` 的 spriteFrame uuid。Prefab 目录里没有 PNG。没有主线专用底图：页面底用 `win-bg_win-bg-12` 染成代码里的深蓝 `(8, 16, 32)`；按钮用 `button_btn-blue-big` / `button_btn-orange-big`；战报底用 `win-bg_msg-bg`；单位卡用 `win-bg_block-bg-5`；血条用 `win-bg_num-bg`。
- 按钮节点是 `cc.Sprite` + `cc.Button`（缩放过渡，`clickEvents` 为空），文案在子节点 `Label`。普通文案节点自身带 `cc.Label`。
- 再生：`python3 client/tools/gen_mainline_prefab.py`（从现有 `.meta` 读 `@f9941`，并核对页面脚本里的坐标和文案常量）

### MainlinePage（Mock，三面板）

根 `MainlinePage`。`Bg` 与三个面板同级，铺满 720×1280。代码里深蓝底画在页面根上，换阶段只清 `body`，所以底不放进 `PanelList`。面板自身也是 720×1280、放在 (0, 0)，子节点坐标就是 `place()` 的页面坐标。

| 节点 | 默认 | 对齐 |
|------|------|------|
| `PanelList` | 显示 | `showList()` |
| `PanelBattle` | `_active: false` | `showBattle()` |
| `PanelSettle` | `_active: false` | `showSettlement()` |

#### PanelList

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Title` | (0, 470) | 680×56 | `主线关卡` |
| `Progress` | (0, 410) | 640×36 | `已通关 0 关 · 当前第 1 关 · Lv1` |
| `StageRow_0` … `StageRow_5` | (0, 320 − i×68) | 560×52 | `第N关    挑战/未开启` |
| `Hint` | (0, -130) | 640×34 | `挑战当前关。战斗中可以跳过，撤退算失败` |
| `BtnPush` | (0, -200) | 420×52 | `推到第70关` |
| `PushHint` | (0, -258) | 640×32 | `一关关仍可打。调试按钮连推到第70关，每关金币 +10，不播战报` |
| `BtnBack` | (0, -330) | 240×52 | `返回主城` |

`StageRow_*` 共 6 行，等于 `listStages` 的默认窗口（`WINDOW = 6`）。占位按新号第 1 关：`StageRow_0` 为 `第1关    挑战`（蓝色按钮），`StageRow_1` … `StageRow_5` 为第 2–6 关 `未开启`（同一张按钮图，灰度）。`BtnPush` 的静态文案是规格里的 `推到第70关`；代码 `pushButtonText()` 运行时是 `推关到70（调试）`。`PushHint` 与 `pushHint()` 一致。

#### PanelBattle

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Title` | (0, 470) | 680×56 | `第1关` |
| `Round` | (0, 410) | 640×38 | `准备战斗` |
| `EnemyLabel` | (0, 355) | 680×34 | `敌方` |
| `EnemyRow` | (0, 270) | 660×108 | — |
| `AllyLabel` | (0, 165) | 680×34 | `我方` |
| `AllyRow` | (0, 70) | 660×108 | — |
| `LogBg` | (0, -80) | 660×110 | — |
| `Log` | (0, -80) | 620×96 | 两行战报占位，左对齐 |
| `BtnSkip` | (-140, -230) | 200×52 | `跳过` |
| `BtnRetreat` | (140, -230) | 200×52 | `撤退` |

`EnemyRow` / `AllyRow` 各有 `Unit_0` … `Unit_2`（180×108，x = -220 / 0 / 220）。单位卡上是染色底，加 `Name`、`Hp`、`Bar`。敌方占位 `前锋` / `守卫` / `术士`（120/120），我方占位 `勇者` / `护卫` / `术士`（100/100），与 `battle.ts` 的站位和名字一致。`Log` 占位为 `第1回合 · 我方突进` 与 `第2回合 · 集火前排`。

#### PanelSettle

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Result` | (0, 430) | 680×72 | `胜利` |
| `Sub` | (0, 350) | 640×38 | `第1关 · 通关` |
| `Rewards` | (0, 270) | 640×44 | `金币 +0` |
| `Meta` | (0, 120) | 640×36 | `Lv1 · 下一关 2 · 金币 0 · 钻石 0` |
| `BtnNext` | (0, 10) | 420×64 | `下一关` |
| `BtnList` | (0, -90) | 240×48 | `关卡列表` |
| `BtnBack` | (0, -170) | 240×48 | `返回主城` |

`Sub` 是规格里的静态占位。代码胜利时 `reasonText("clear")` 写出的是 `顺利通关`，接线后由逻辑改字。

### WireMainlinePage（真服只读）

根 `WireMainlinePage`。没有 `Panel*`。对齐 `WireMainlineController.build()`。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | — |
| `Title` | (0, 220) | 680×56 | `主线（真服只读）` |
| `Now` | (0, 120) | 640×44 | `当前 idx 未同步` |
| `Max` | (0, 60) | 640×44 | `最高 idx 未同步` |
| `Note` | (0, -20) | 640×38 | `本轮不发进关协议，不挑战` |
| `BtnBack` | (0, -140) | 240×48 | `返回` |

`Title` / `Note` 与 `WIRE_MAINLINE_READONLY_TITLE` / `WIRE_MAINLINE_READONLY_NOTE` 相同。`Now` / `Max` 是 `formatWireChapterIdx` 在 idx 还没同步时的句子（`当前 idx` / `最高 idx` + `未同步`）。
