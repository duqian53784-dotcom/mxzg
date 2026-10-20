# 本机起服联调（D1 提纲）

这份是提纲，还不能照着把 Java 服跑起来。旧《项目分析与启动指南》不在本仓库。`server/` 和 `config/` 是本机 junction，GitHub 上没有实体。下面只写仓库里已经能确定的事，以及下次在开发机上要补的空档。

**D1 仍未勾选。** 端口、JDK、启动命令补上并在本机跑通之前，不要把 `PROJECT_PLAN.md` 里的 D1 打勾。

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

## 客户端现在连的是 Mock

预览不需要起服。

- Boot 走 `mock://`，`MockTransport` 里一份 `MockGameSession`。
- 协议在 `client/assets/scripts/net/protocol/`。`CmdId` 是客户端占位号，**不是**旧服消息号。限时活动是 `2801`–`2804`，同样是占位。
- 编解码仍是明文对象。真 WebSocket 要改的是 `codec.ts` 和传输层，调用方继续用 `Proto.*`。
- 细节见 `docs/protocol-stubs.md` 和 `docs/mock-replay.md`。

## 建议的联调顺序

`PROJECT_PLAN.md` 第 8 节已经定了顺序，这里只展开到能对照旧服的粒度：

1. 在本机把 `server` junction 指到的 Java 工程跑起来，确认进程在听端口。
2. 登录。客户端现在的 `login` / `role.enter` / `role.create` 先对齐字段，再改占位 ID。
3. 进主城。顶栏要能读到角色名、等级、金币、钻石、开服天。
4. 主线 `stage.enter` / `stage.result`。
5. 背包，然后一次只接一个系统。限时活动、礼包、商店都先留在 Mock，等登录到主城稳定后再换。

开服自然日用旧服 `ServerParamService.getOpenDays()`，不要用角色登录天代替。七日登录看的是角色登录天，和开服天是两套。

## 下次在开发机上要填的空档

对照 `F:\源码\mj\program` 里的《项目分析与启动指南》（或同等启动说明），把下面每行写成可执行步骤。仓库里没有这些答案，不要猜：

| 空档 | 要写什么 |
|------|----------|
| JDK | 版本，以及 `JAVA_HOME` 是否必须指定 |
| 工作目录 | 在 junction 的 `server` 里启动，还是必须在 `F:\源码\mj\program\server` |
| 依赖 | MySQL / Redis / 配置目录是否要先起来；库名和账号放哪 |
| 配置 | 服读 `F:\mxzg-local` 还是服工程内部的表；和客户端 JSON 导出是否同一份 |
| 启动命令 | 实际使用的脚本或主类。写全命令，不要写「运行某个 jar」这种空话 |
| 端口 | 登录、网关、HTTP 或 WebSocket 各是多少。客户端 H5 要连哪一个 |
| 网关 | H5 是直连 TCP，还是要一层 WS→TCP。这是 D2，本提纲只把入口记下来 |
| 开服时间 | 本机如何设置，才能让 `getOpenDays()` 落在第 1 天 |

填完之后用同一份文档记一次：进程起来了、端口在听、客户端仍然走 Mock（D2 才改连接）。
