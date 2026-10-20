# 本地 Mock 会话与录包回放（B6）

没有 Java 服时，编辑器预览仍然只走 `MockTransport`。不需要另起进程，也没有 `npm run mock-server`。

假服状态在 `MockGameSession` 上，和传输绑在一起。同一次预览里多次请求共用这一份：登录、创角、主线连打都会改它。断线重连不新建会话，进度还在。

## 默认路径

`NetClient.shared` 自己 `new MockTransport()`。Boot 的 Mock 登录和主城「主线」都走它。

一局开始时：

| 字段 | 初值 |
|------|------|
| 角色 | `1001 / MockHero / Lv1` |
| `stageId` | 1（下一关） |
| `clearedStage` | 0 |
| `openDay` | 1 |

规则：

- `login` 记下账号和 `serverId`，token 固定 `mock-token`。不重置角色和主线。
- 默认角色属于账号 `mock`。还没登录，或登录账号就是所属账号时，`role.enter` 回当前角色，并带 `openDay`、`stageId`。登录别的账号时 `hasRole` 为 false，不改掉已有角色。`role.create` 成功后角色改归当前登录账号。Boot 在有角色时把结果写进 `Session`（含所选服务器名）。
- `role.create` 名字去空白后为空则拒绝，不改状态。成功则改名，`roleId` 仍是 1001，主线、等级、开服天回到新号。
- `stage.enter` 的 `stageId < 1` 失败。成功回 `battleId`，形如 `mock-battle-<关卡>-<序号>`。Mock 允许跳关，方便调试；正式拦关留到 C3。
- `stage.result` 胜利且关卡高于已通关：`clearedStage` 推进，`level = 1 + clearedStage`，`openDay` 至少为 `1 + floor(clearedStage / 5)`（只升不降）。`nextStageId = clearedStage + 1`。奖励占位 `{ id: 1, count: 10 }`。失败停在本关，奖励空，进度不变。
- 心跳和其它 cmd 不改进度。其它 cmd 仍 echo。

`openDay` / `stageId` / `level` 是 Mock 多带的字段。真服可以不带，调用方用缺省值。

## 录包

文件：`client/assets/resources/mock/session-login-stage.json`

- `session`：喂给 `new MockGameSession(fixture.session)` 的初始进度。
- `steps`：按顺序的回包（`login`、`role.enter`、`role.create`、`stage.enter`、`stage.result`）。`ReplayTransport` 只看 cmd 顺序，不看请求体，也不会按上面的公式重算。

心跳不在录包里，传输层自己回 `serverTime`。cmd 和下一步不一致时不前进。步数走完后再请求，回 `ok: false`。

默认预览不读这个 JSON。要回放时：

```typescript
import { NetClient } from "./NetClient";
import { loadMockFixture } from "./MockFixtureLoader";
import { ReplayTransport } from "./ReplayTransport";
import { Proto } from "./protocol";

const fixture = await loadMockFixture();
const net = new NetClient(new ReplayTransport(fixture));
await net.connect("replay://local");
const login = await Proto.login({ account: "mock" }, net);
```

`loadMockFixture()` 走 `resources.load("mock/session-login-stage")`。Node 自检直接读该 JSON 文件。

## 主城「主线」

Boot 进 Main 之后，点 **主线 · 第 N 关**。没有战斗场景：立刻 `Proto.stageEnter`，再 `Proto.stageResult`（`win: true`）。Toast 显示下一关和奖励，按钮和底部「Lv / 开服D」跟着会话变。连点五次后等级到 6、开服天到 2，铁匠铺（Lv5）会出现在已开入口里。

只预览 Main、没有从 Boot 连上 Mock 时，按钮提示先从 Boot 进入。

## 自检

仓库根目录：

```text
npx --yes esbuild client/tools/skeleton-check.ts --bundle --platform=node --format=cjs --tsconfig=client/tools/tsconfig.check.json --outfile=/tmp/mxzg-skeleton-check.js && node /tmp/mxzg-skeleton-check.js
```

覆盖：五连胜后的等级和开服天、失败不回退、创角重置、重连后进度还在、录包按序播放。

## 倩：Creator 里点一次

1. Creator 3.8.8 打开 `client`。
2. Boot 场景的 Canvas 挂好 `Boot`（若之前已挂过，确认脚本还在）。
3. 启动场景保持 Boot，预览。
4. 选一个服务器，点「进入游戏」（账号保持 `mock`），进入主城。标题下应有 `MockHero` 和所选服务器。按钮应是「主线 · 第1关」。
5. 点它。Toast 为「第1关胜利，下一关 2，奖励 10」。按钮变成「第2关」，标题旁等级变为 Lv2。
6. 再点几次。满 5 关后底部开服天变为 D2，已开入口里出现铁匠铺。
7. 控制台有 `[MainApp] stage enter` 和 `[MainApp] stage result`。不需要起 server。
