# scripts

- `core/` 启动、会话（Boot、Session）
- `net/` 网络状态机、MockTransport、P0 协议 stub（`net/protocol/`，不连真服）
- `config/` JSON 读表
- `module/` 业务系统（尚未开始）
- `ui/` 页面栈、弹窗队列、Toast、主城壳

场景在 `assets/scenes/`。Boot / Main / Battle 已建好。本目录脚本不会写进 `.scene`，需要在 Creator 里挂一次组件。

## 倩：预览 Boot → Main

1. Creator 3.8.8 打开 `client`。
2. 打开 `assets/scenes/Boot.scene`。
3. 层级里选中 **Canvas**（不要挂到 Camera）。
4. 属性检查器 → **添加组件** → 自定义脚本 → **Boot**（`scripts/core/Boot.ts`）。
5. **保存场景**。启动场景保持 Boot，点预览。
6. 屏幕上是 Mock 登录面板。点 **进入游戏**。
7. 应进入 Main，并看到主城标题和按钮（主线 / 召唤 / 英雄 / 背包 / 公告 / 模拟断线）。Main 场景不用事先摆 UI；Boot 发现 Canvas 上没有 MainApp 会补挂。
8. 控制台标记：`[Boot] stage=version` → `hot-update` → `config` → `login` → `enter-main`，以及 `[Net] connect mock://local`、`[Config] loaded`。

可选：

- Boot 上勾选 `skipLogin`：不显示面板，仍用 Mock 账号进 Main。
- `account` 默认 `mock`，可在检查器里改。
- 只预览 Main：给 Main 场景的 Canvas 挂 **MainApp**。没有 Boot 时账号是空的，读表仍会自己加载。
- 背包：打开第二页，返回关掉。公告：连续入队两张弹窗。模拟断线：看底部「网络」从 connected 到 reconnecting 再回到 connected。
- 发布构建前，构建场景列表要包含 Boot 和 Main，启动场景为 Boot。

热更和真 socket 都不在这一步。网络是 `mock://local`。

## 协议 stub（B5）

Boot 的登录不再手写 `request("login")`，改走 `Proto.login` / `Proto.roleEnter`。回包仍由 MockTransport 发出。

P0 消息：`login`、`heartbeat`、`role.enter`、`role.create`、`stage.enter`、`stage.result`。名字和 B4 的 Mock cmd 一致；创角和主线结算是给 C1 / C3 预留的，主城按钮还没接。

真 Protobuf 怎么换掉这些 interface，见 `docs/protocol-stubs.md`。
