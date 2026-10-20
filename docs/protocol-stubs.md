# P0 协议 stub（B5）

手写类型，不生成 Protobuf，不连真实服。调用仍走 `NetClient.request` → `MockTransport`。

旧 `.proto` 不在本仓库（`server/` 是本机 junction，未入库）。下面的数值 ID 是客户端占位，**不是**旧服消息号。阶段 D 对照旧协议时只改 ID 和编解码，尽量不动 `Proto.*` 的调用方。

## B4 已经有的，和谁在调

| cmd | MockTransport（B4） | 调用方 |
|-----|---------------------|--------|
| `login` | `ok` / `account` / `token` | Boot |
| `role.enter` | `roleId` / `name` / `level`（默认 MockHero） | Boot |
| `heartbeat` | `serverTime` | NetClient 定时发送，不走 `request` |
| 其它 cmd | `{ ok: true, echo }` | 自检里的 `bag.list`；MainApp 不发业务包 |

B5 给 login 补了 `serverId`（缺省 1），给 `role.enter` 补了 `ok` / `hasRole`。原字段还在，Boot → Main 的 Mock 登录不变。

## P0 清单

| 占位 ID | cmd | 请求 | 响应 | 留给 |
|---------|-----|------|------|------|
| 1001 | `login` | `LoginReq` | `LoginResp` | Boot，C1 选服可带 `serverId` |
| 1002 | `heartbeat` | `HeartbeatReq` | `HeartbeatResp` | NetClient |
| 1101 | `role.enter` | `RoleEnterReq` | `RoleEnterResp` | Boot；默认已有角色 |
| 1102 | `role.create` | `RoleCreateReq` | `RoleCreateResp` | C1 创角 |
| 1201 | `stage.enter` | `StageEnterReq` | `StageEnterResp` | C3 进关 |
| 1202 | `stage.result` | `StageResultReq` | `StageResultResp` | C3 结算 |

代码在 `client/assets/scripts/net/protocol/`：`cmds.ts`（名字和 ID）、`types.ts`（字段）、`codec.ts`（现在是明文对象）、`Proto.ts`（`Proto.login` 等）。

```typescript
const login = await Proto.login({ account: "mock" });
const role = await Proto.roleEnter({ account: login.account });
```

不传第二个参数时用 `NetClient.shared`。自检要传入自己 new 的 `NetClient`。

Mock 约定（给 C1 / C3 直接用，不用再改传输层）：

- 每个 MockTransport 一开始就有角色 `1001 / MockHero / Lv1`，所以只 `role.enter` 也能进主城。
- `role.create` 名字去空白后为空则 `ok: false`，不改当前角色；成功则改名，之后 `role.enter` 返回新名字，`roleId` 仍是 1001。
- `stage.enter` 的 `stageId < 1` 失败；成功回 `battleId`，形如 `mock-battle-<关卡>-<序号>`。
- `stage.result` 胜利时 `nextStageId = stageId + 1`，奖励占位 `{ id: 1, count: 10 }`；失败停在本关，奖励空。`id: 1` 不是真实道具表。

## 以后换成真 Protobuf

1. 只生成上表这些消息（或当时的 P0 白名单），不要一次生成全量。
2. 用生成类替换 `types.ts` 里的 interface。`Cmd` / `CmdId` 改成与服一致的名字和编号。
3. 只改 `codec.ts`：`encodeRequest` 把对象编成字节，`decodeResponse` 解回同一套字段。`Proto.login` 的函数签名保持不变。
4. `mock://` 继续走 MockTransport 的明文对象。真 WebSocket（阶段 D）在传输层发送 `encodeRequest` 的结果。
5. Boot、以及之后的 C1，继续调 `Proto.*`，不要改回散落的 cmd 字符串。
