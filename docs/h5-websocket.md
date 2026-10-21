# H5 连本机游戏服 WebSocket（D2）

默认预览仍然是 Mock，不连 13101。要看真套接字时再加查询参数。

## 倩怎么开

1. 先双击 `scripts/start-local-server.bat`，确认本机 **13101** 在听（center **11122**、游戏服 TCP **9902** 一起起来即可）。这个 bat 在倩的机器上，不在 Git 里。
2. Creator 3.8.8 打开 `client`，启动场景保持 Boot，预览。
3. 浏览器打开：

`http://127.0.0.1:7456/?transport=ws`

安全区调试可以写在一起：`http://127.0.0.1:7456/?transport=ws&safe=88,0,34,0`。

4. 登录面板标题下应出现 `ws://127.0.0.1:13101`。进入游戏只测连通，不进真实主城。
5. 看三处中文：
   - 面板状态：`已打开，尚未发登录包`，或 `服未启动，请检查启动 bat`，或 `连接已关闭`
   - Toast：`WebSocket 已打开` / `服未启动，请检查启动 bat` / `连接已关闭`
   - 控制台 `[mxzg][info][Ws]`：`正在连接`、`已打开`、`出错`、`已关闭`
6. 服没开时点 **改走 Mock**，应还能进原来的 Mock 主城，预览不中断。
7. 不想连服时去掉 `?transport=ws`，或改成 `?transport=mock`。`skipLogin` 只跳过 Mock 面板；带了 `transport=ws` 仍会显示这块面板，方便看连通。

换地址（一般不用）：`?transport=ws&ws=wss://127.0.0.1:13101`。本地分析里 SSL 证书是空的，默认用 **ws**，不要改成 wss。

代码开关在 `client/assets/scripts/net/transportSelect.ts` 的 `TransportConfig.defaultKind`，仓库里保持 `"mock"`。查询参数优先于这个开关。

## 这一步做了什么

- `WsTransport` 实现和 `MockTransport` / `ReplayTransport` 相同的 `ITransport`。
- Boot 在 `transport=ws` 时另开一条 `NetClient` 去连 `ws://127.0.0.1:13101`。原来的 `NetClient.shared` 仍是 Mock，改走 Mock 时主城还走它。
- 连上之后 **不发送** 登录、创角、心跳。打开成功时会立刻记一行 `未发送 heartbeat：二进制帧未对齐`，线上没有字节。

## 为什么还不能进真实主城

分析文档（2026-10-19）里和帧有关的只有这些，而且来自 **旧 H5 的 WS↔TCP 桥日志**，不是本仓库占位号：

| 事实 | 出处 |
|------|------|
| gameserver 监听 WebSocket **13101** | `network.webSocket.port=13101` |
| 本地不需要 wss，证书两项置空 | 分析 Q12 |
| 旧桥日志每帧原始字节，**第 5–8 字节小端是协议号** | 网络桥日志说明 |
| 旧客户端登录请求 **1001**，心跳 **1004** | 同上 |
| 旧 H5 并不直连 13101，而是 WebSocket 路径 `/game/9902`，由 `serve.ps1` 桥到 TCP **9902** | 分析「客户端连接本地服务器」 |

还没写明、所以这里不组包的部分：

- 第 1–4 字节是不是长度，总长度多少
- 包体是不是 Protobuf，字段怎么排
- 13101 上的 WebSocket 是否跟那条桥的 TCP 帧一样，要不要路径
- 本仓库 `CmdId.heartbeat` 仍是占位 **1002**，不是旧服心跳 1004。`CmdId.login` 占位也是 1001，只是数字碰上了，不能当成已经对齐

`readObservedCmdId` 只在 **收到** 满 8 字节时，把第 5–8 字节记进 GameLog（`第5-8字节协议号 …`）。它不发送，也不当成登录成功。

D2 勾选要等倩用上面的地址看过「已打开」或「服未启动」。真实登录到主城是 D3。

Mock 行为见 `docs/mock-replay.md`。占位协议见 `docs/protocol-stubs.md`。起服端口见 `docs/server-local-run.md`。
