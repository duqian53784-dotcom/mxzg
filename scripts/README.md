# 本地启动入口

重做版开发请双击 **start-remake-backend.bat**，启动 backend 下的 Java 21 游戏 API，地址 http://127.0.0.1:18080。保持窗口打开，用 Ctrl+C 停止。看到应用 Started 后，在 Creator 打开 Remake.scene，预览当前场景。登录页已复用已有登录美术与控件，默认开发账号 player_1，点击“开始游戏”；右上角“开发账号”可修改账号、恢复或清除本机会话。登录后复用已有主城地图和顶底栏，显示新后端真实昵称、等级、金币与钻石；“账号”面板可退出。尚未接入的功能点击提示暂未开放。当前后端没有网页管理后台。

其余脚本属于尚未替换的旧客户端链路：

- start-local-server：Java 8 center 与 gameserver。
- start-ws-bridge：13111 WebSocket 转发到旧服 TCP 9902。
- start-local-all：组合启动旧服与桥。
- stop-local、stop-ws：上述旧链路的停止入口，具体行为见脚本说明。

旧场景已整理到 assets/scenes/legacy：Boot 仍使用旧链路，登录后进入 Main；日常新开发预览顶层 Remake.scene，使用新后端。Battle 放在 legacy/placeholders，只是历史空占位。两条开发路径在验收切换前分别保留，避免把旧服启动成功误当作新后端已经启动。

新 bat 对本次 PowerShell 子进程设置 ExecutionPolicy Bypass，不修改系统执行策略；Java 与 Maven 环境由 backend/dev.ps1 隔离装配。脚本使用自身路径定位后端，不要求先切换工作目录。
