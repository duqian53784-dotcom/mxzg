# scripts

- `core/` 启动、会话（Boot、Session）
- `net/` 网络状态机、MockTransport（带 MockGameSession）、录包回放、P0 协议 stub（`net/protocol/`，不连真服）
- `config/` JSON 读表
- `module/` 业务系统（尚未开始）
- `ui/` 页面栈、弹窗队列、Toast、主城壳、安全区（`SafeArea.ts`）

场景在 `assets/scenes/`。Boot / Main / Battle 已建好。本目录脚本不会写进 `.scene`，需要在 Creator 里挂一次组件。

## 倩：预览 Boot → Main

1. Creator 3.8.8 打开 `client`。
2. 打开 `assets/scenes/Boot.scene`。
3. 层级里选中 **Canvas**（不要挂到 Camera）。
4. 属性检查器 → **添加组件** → 自定义脚本 → **Boot**（`scripts/core/Boot.ts`）。
5. **保存场景**。启动场景保持 Boot，点预览。
6. 屏幕上是 Mock 登录面板。点 **进入游戏**。
7. 应进入 Main，并看到主城标题和按钮（主线 · 第N关 / 召唤 / 英雄 / 背包 / 公告 / 模拟断线），右上角还有「日志」。Main 场景不用事先摆 UI；Boot 发现 Canvas 上没有 MainApp 会补挂。
8. 控制台标记：`[Boot] stage=version` → `hot-update` → `config` → `login` → `enter-main`，以及 `[Net] connect mock://local`、`[Config] loaded`。这些行现在带 `[mxzg]` 前缀，例如 `[mxzg][info][Boot] stage=version`。

可选：

- Boot 上勾选 `skipLogin`：不显示面板，仍用 Mock 账号进 Main。
- `account` 默认 `mock`，可在检查器里改。
- 只预览 Main：给 Main 场景的 Canvas 挂 **MainApp**。没有 Boot 时账号是空的，读表仍会自己加载。
- 背包：打开第二页，返回关掉。公告：连续入队两张弹窗。模拟断线：看底部「网络」从 connected 到 reconnecting 再回到 connected。主线进度在断线后还在。
- 主线：点「主线 · 第N关」会 `stage.enter` 再按胜利 `stage.result`（没有战斗画面）。Toast 给出下一关和奖励，等级和开服天跟着变。详见 `docs/mock-replay.md`。
- 发布构建前，构建场景列表要包含 Boot 和 Main，启动场景为 Boot。

热更和真 socket 都不在这一步。网络是 `mock://local`。

## 协议 stub（B5）

Boot 的登录不再手写 `request("login")`，改走 `Proto.login` / `Proto.roleEnter`。回包仍由 MockTransport 发出。

P0 消息：`login`、`heartbeat`、`role.enter`、`role.create`、`stage.enter`、`stage.result`。名字和 B4 的 Mock cmd 一致。主城「主线」已经会打进关和结算；创角 UI 仍留给 C1。

同一局 Mock 会记住开服天、等级和主线进度。录包在 `assets/resources/mock/session-login-stage.json`，默认预览不用它。见 `docs/mock-replay.md`。

真 Protobuf 怎么换掉这些 interface，见 `docs/protocol-stubs.md`。

## 日志与错误码（B7）

- `core/GameLog.ts`：`debug` / `info` / `warn` / `error`。环形缓冲默认 80 条。`mirrorConsole` 为 true 时打到控制台，前缀 `[mxzg]`。
- `core/errors.ts`：错误码 → 中文。已覆盖空角色名、关卡无效、网络未连接 / 断开 / 超时、未知指令、回放结束或不匹配。
- 登录、进关、结算失败会 Toast 这句中文，不再只写「见控制台」。
- 主城「日志」打开最近 10 条，新的在上（代码生成，不改场景）。里面两个按钮用来验收：
  1. **空名创角**：Toast「角色名不能为空」。当前角色不变。
  2. **断开提示**：Toast「网络已断开」，并关掉 Mock 连接。要继续主线请重新预览。「模拟断线」仍会重连，不会停在断开。

## 安全区（B8）

设计分辨率保持 **720×1280**（`settings/v2/packages/project.json`）。运行时不改 Fit Width / Fit Height。

`ui/SafeArea.ts` 在 Boot 和主城 `start` 时读可见区域与 `sys.getSafeAreaRect()`，窗口变化后再算。登录面板、主城按钮和 Toast 会让开刘海；安全区比设计分辨率小时只缩小不放大。不用改 `.scene`，也不要给 Canvas 再挂引擎自带的 SafeArea。

`GameLog` 的 `minLevel` 为 `debug`（默认）时，左上角有一行尺寸。桌面没有刘海时，控制台执行 `localStorage.setItem("mxzg.safe", "88,0,34,0")` 再拖一下窗口。说明见 `docs/safe-area.md`。
