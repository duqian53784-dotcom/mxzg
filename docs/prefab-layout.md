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
