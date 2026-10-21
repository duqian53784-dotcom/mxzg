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
