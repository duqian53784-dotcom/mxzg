# 本机起服联调

`server/` 和 `config/` 是本机 junction，GitHub 上没有实体。下面只记已经核对过的端口，以及 H5 怎么连 13101。JDK、库表和完整 Java 命令仍以倩机器上的《项目分析与启动指南》为准，这里不抄密码和内网地址。

**D1：** 倩本机已验证 center + gameserver 起来，**11122 / 9902 / 13101** 在听。一键脚本是 `scripts/start-local-server.bat`（在本机，不在这个 Git 快照里）。

**D2：** 预览可加 `?transport=ws` 去连 `ws://127.0.0.1:13101`。勾选仍等倩自己打开预览看连通。步骤见 `docs/h5-websocket.md`。

## 已经确定的路径

| 用途 | 路径 |
|------|------|
| 工程根 | `F:\project\mxzg` |
| 新客户端 | `F:\project\mxzg\client`（Creator 3.8.8 打开这个目录） |
| 配置表 | `F:\project\mxzg\config` → `F:\mxzg-local` |
| Java 服 | `F:\project\mxzg\server` → `F:\源码\mj\program\server` |
| 旧工程参考 | `F:\源码\mj\program` |
| 开服日口径 | `docs/day60-open-server.md`：开服当天 = 第 1 天 |

`.gitignore` 忽略了 `/config` 和 `/server`。不要把 junction 背后的整仓推进 Git。

## 客户端默认仍是 Mock

不加参数时，预览不需要起服。

- Boot 走 `mock://`，`MockTransport` 里一份 `MockGameSession`。
- 协议在 `client/assets/scripts/net/protocol/`。`CmdId` 是客户端占位号，**不是**旧服消息号。限时活动是 `2801`–`2804`，同样是占位。心跳占位是 **1002**。旧桥日志里的心跳是 **1004**，不要混。
- 编解码仍是明文对象。`?transport=ws` 只打开套接字，**不把** `encodeRequest` 的对象写到 13101。调用方继续用 `Proto.*` 走 Mock。
- 细节见 `docs/protocol-stubs.md`、`docs/mock-replay.md`、`docs/h5-websocket.md`。

## 建议的联调顺序

`PROJECT_PLAN.md` 第 8 节已经定了顺序，这里只展开到能对照旧服的粒度：

1. 在本机把 `server` junction 指到的 Java 工程跑起来，确认进程在听端口。
2. 登录。客户端现在的 `login` / `role.enter` / `role.create` 先对齐字段，再改占位 ID。
3. 进主城。顶栏要能读到角色名、等级、金币、钻石、开服天。
4. 主线 `stage.enter` / `stage.result`。
5. 背包，然后一次只接一个系统。限时活动、礼包、商店都先留在 Mock，等登录到主城稳定后再换。

开服自然日用旧服 `ServerParamService.getOpenDays()`，不要用角色登录天代替。七日登录看的是角色登录天，和开服天是两套。

## 下次在开发机上要填的空档

对照 `F:\源码\mj\program` 里的《项目分析与启动指南》（或同等启动说明）。端口和 H5 入口已经按倩本机验证和分析里的公开事实写上。JDK、库账号不要猜，也不要写进仓库。

| 空档 | 要写什么 |
|------|----------|
| JDK | 版本，以及 `JAVA_HOME` 是否必须指定 |
| 工作目录 | 在 junction 的 `server` 里启动，还是必须在 `F:\源码\mj\program\server` |
| 依赖 | MySQL / Redis / 配置目录是否要先起来；库名和账号放哪 |
| 配置 | 服读 `F:\mxzg-local` 还是服工程内部的表；和客户端 JSON 导出是否同一份 |
| 启动命令 | 倩本机一键：`scripts/start-local-server.bat`。仓库里没有这个文件，也没有 Java 主类命令 |
| 端口 | center TCP **11122**。gameserver TCP **9902**，WebSocket **13101**。H5 这一步连 13101，不连 9902 |
| 网关 | 新客户端直连 `ws://127.0.0.1:13101`（本地不用 wss）。旧 H5 是另一条路：`/game/9902` 再桥到 TCP 9902，不要套到 13101 上。帧还没对齐，见 `docs/h5-websocket.md` |
| 开服时间 | 本机如何设置，才能让 `getOpenDays()` 落在第 1 天 |

进程和端口倩本机已经听过。客户端默认仍走 Mock。D2 只在 `?transport=ws` 时连 13101，而且不发登录包。
