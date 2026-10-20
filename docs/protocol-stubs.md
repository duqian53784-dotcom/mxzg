# P0 协议 stub（B5）

手写类型，不生成 Protobuf，不连真实服。调用仍走 `NetClient.request` → `MockTransport`。

旧 `.proto` 不在本仓库（`server/` 是本机 junction，未入库）。下面的数值 ID 是客户端占位，**不是**旧服消息号。阶段 D 对照旧协议时只改 ID 和编解码，尽量不动 `Proto.*` 的调用方。

## B4 已经有的，和谁在调

| cmd | MockTransport（B4） | 调用方 |
|-----|---------------------|--------|
| `login` | `ok` / `account` / `token` | Boot |
| `role.enter` | `roleId` / `name` / `level`（默认 MockHero） | Boot |
| `heartbeat` | `serverTime` | NetClient 定时发送，不走 `request` |
| 其它 cmd | `{ ok: true, echo }` | 自检里的 `bag.list` |

B5 给 login 补了 `serverId`（缺省 1），给 `role.enter` 补了 `ok` / `hasRole`。原字段还在。C1 登录面板会把选中的服务器放进 `serverId`。B6 起，主城「主线」会发 `stage.enter` / `stage.result`。

## P0 清单

| 占位 ID | cmd | 请求 | 响应 | 留给 |
|---------|-----|------|------|------|
| 1001 | `login` | `LoginReq` | `LoginResp` | Boot 登录，带上选中的 `serverId` |
| 1002 | `heartbeat` | `HeartbeatReq` | `HeartbeatResp` | NetClient |
| 1101 | `role.enter` | `RoleEnterReq` | `RoleEnterResp` | Boot；账号 `mock` 默认已有角色，其它账号 `hasRole` 为 false |
| 1102 | `role.create` | `RoleCreateReq` | `RoleCreateResp` | 登录面板「创角」 |
| 1201 | `stage.enter` | `StageEnterReq` | `StageEnterResp` | 主线战报（C3）。界面只打下一关。快速作战也走这条 |
| 1202 | `stage.result` | `StageResultReq` | `StageResultResp` | 主线结算（C3）。撤退传 `win: false`。快速作战传 `win: true` |
| 1301 | `idle.query` | `IdleQueryReq` | `IdleQueryResp` | 挂机预览（C4）。不改钱包 |
| 1302 | `idle.claim` | `IdleClaimReq` | `IdleClaimResp` | 领取挂机（C4）。太短则 `IDLE_EMPTY` |

代码在 `client/assets/scripts/net/protocol/`：`cmds.ts`（名字和 ID）、`types.ts`（字段）、`codec.ts`（现在是明文对象）、`Proto.ts`（`Proto.login` 等）。

```typescript
const login = await Proto.login({ account: "mock" });
const role = await Proto.roleEnter({ account: login.account });
```

不传第二个参数时用 `NetClient.shared`。自检要传入自己 new 的 `NetClient`。

Mock 约定（给 C1 / C4 直接用，不用再改传输层）：

- 每个 MockTransport 带一份 `MockGameSession`。一开始就有角色 `1001 / MockHero / Lv1`，属于账号 `mock`，下一关 1、开服第 1 天。还没 `login`，或登录的就是 `mock` 时，只 `role.enter` 也能进主城。登录别的账号则 `hasRole` 为 false，直到 `role.create`。同一局里进度会留下来。细节和录包见 `docs/mock-replay.md`。
- `role.enter` 额外带 `openDay`、`stageId`、`gold`、`diamond`（真服可以不带）。Boot 写进 `Session`。没有角色时金币钻石回 0。
- `role.create` 名字去空白后为空则 `ok: false`，不改当前角色；成功则改名，`roleId` 仍是 1001，并重置等级、主线、开服天、钱包（金币 100、钻石 20）和挂机（时长、强化石）。
- `stage.enter` 的 `stageId < 1` 失败；成功回 `battleId`，形如 `mock-battle-<关卡>-<序号>`。Mock 允许跳关。主线列表只放行下一关，高于等级的战报判负。
- `stage.result` 新通关后 `nextStageId = clearedStage + 1`，`level = 1 + clearedStage`，奖励占位 `{ id: 1, count: 10 }`（id 1 加金币，id 2 加钻石）。失败停在本关，奖励空，钱包不变。回包可带 `openDay` / `level` / `gold` / `diamond`。快速作战和主线战报共用这条，不另开消息。
- `idle.query` 只读。时长 = 现在 − 起算时刻，上限 8 小时。金币、强化石（id 101）按当前已通关关数计算。回包带可领数量、挂满 8 小时的预览、已有强化石和钱包。
- `idle.claim` 把可领的金币和强化石计入钱包，然后重新起算。一个都不够时 `ok: false`，`code` 为 `IDLE_EMPTY`（「挂机时间太短，暂无收益」），钱包和起算时刻不动。创角会把时长和强化石清掉。

1301 / 1302 仍是客户端占位号，不是旧服消息号。

## 以后换成真 Protobuf

1. 只生成上表这些消息（或当时的 P0 白名单），不要一次生成全量。
2. 用生成类替换 `types.ts` 里的 interface。`Cmd` / `CmdId` 改成与服一致的名字和编号。
3. 只改 `codec.ts`：`encodeRequest` 把对象编成字节，`decodeResponse` 解回同一套字段。`Proto.login` 的函数签名保持不变。
4. `mock://` 继续走 MockTransport 的明文对象。真 WebSocket（阶段 D）在传输层发送 `encodeRequest` 的结果。
5. Boot、以及之后的 C1，继续调 `Proto.*`，不要改回散落的 cmd 字符串。
