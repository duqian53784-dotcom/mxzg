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
| 金币 / 钻石 | 100 / 20 |
| 英雄 | 光耀骑士 3星、林间游侠 2星、星辉法师 1星，都是 Lv1 |

规则：

- `login` 记下账号和 `serverId`，token 固定 `mock-token`。不重置角色和主线。
- 默认角色属于账号 `mock`。还没登录，或登录账号就是所属账号时，`role.enter` 回当前角色，并带 `openDay`、`stageId`、`gold`、`diamond`。登录别的账号时 `hasRole` 为 false，金币钻石回 0，不改掉已有角色。`role.create` 成功后角色改归当前登录账号。Boot 在有角色时把结果写进 `Session`（含所选服务器名和钱包）。
- `role.create` 名字去空白后为空则拒绝，不改状态。成功则改名，`roleId` 仍是 1001，主线、等级、开服天回到新号，钱包回到金币 100、钻石 20，挂机时长、强化石和召唤碎片清掉，背包重新放上小金币袋 ×2 和经验药水 ×2，英雄回到起步三名 Lv1 且新手短剑 Lv1，邮箱回到起步三封。
- `stage.enter` 的 `stageId < 1` 失败。成功回 `battleId`，形如 `mock-battle-<关卡>-<序号>`。Mock 仍允许跳关，方便自检。主线界面只放行下一关（C3）。
- `stage.result` 胜利且关卡高于已通关：`clearedStage` 推进，`level = 1 + clearedStage`，`openDay` 至少为 `1 + floor(clearedStage / 5)`（只升不降）。`nextStageId = clearedStage + 1`。奖励占位 `{ id: 1, count: 10 }`，id 1 加金币、id 2 加钻石。失败停在本关，奖励空，进度和钱包不变。回包带结算后的 `gold` / `diamond`。不改挂机起算时刻。
- `idle.query` / `idle.claim`：时长从会话创建、上次领取或创角起算，上限 8 小时。收益按当前已通关关数乘整段时长。领取把金币和强化石（id 101）写入会话。不够 1 个单位时拒绝。创角清空强化石并重新起算。断线重连沿用同一会话，时长还在。
- `hero.list` / `hero.upgrade`：名册空时种下起步三名。升级只扣金币、升 1 级，星级不变，不动挂机计时和主线。金币不足、满级或没有这名英雄时拒绝。默认录包没有这两条；预览仍走 MockTransport。
- `summon.pull`：单抽扣 10 钻石，十连扣 90。新英雄追加到名册，重复转碎片（id = 40000 + 英雄 id，每次 +10）。钻石不足或次数不是 1/10 时整次拒绝。创角把召唤游标和碎片清掉。默认录包没有这条；预览仍走 MockTransport。
- `bag.list` / `bag.use`：列出数量大于 0 的道具。新号自带小金币袋 ×2（每个 +50 金币）和经验药水 ×2（给名册第一名 +100 经验，满 100 升 1 级）。强化石和碎片不能直接使用。空背包、数量不足、领队满级时拒绝。创角清掉强化石和碎片后重新发起步消耗品。默认录包没有这两条；预览仍走 MockTransport。
- `mail.list` / `mail.read` / `mail.claim` / `mail.claimAll` / `mail.delete`：新号三封。欢迎和开服补给未读，维护公告已读且没有附件。领取把金币写入钱包、道具写入背包，并标成已领取。没有附件或已经领过会拒绝。未领附件不能删。创角把邮箱重置回这三封。默认录包没有这些消息；预览仍走 MockTransport。
- `smith.view` / `smith.strengthen`：每名英雄一把新手短剑。打开时给没有剑的英雄补 Lv1，不扣费。强化扣金币和 1 个强化石，攻击随剑等级提高。金币或强化石不足、已满级、没有这名英雄时拒绝。创角把剑重置回 Lv1。默认录包没有这两条；预览仍走 MockTransport。入口仍是主线 Lv5。
- 心跳和其它 cmd 不改进度。其它 cmd 仍 echo。

`openDay` / `stageId` / `level` / `gold` / `diamond` 是 Mock 多带的字段。真服可以不带，调用方用缺省值。

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

Boot 进 Main 之后，点 **主线 · 第 N 关** 打开关卡列表，挑战当前关。先 `Proto.stageEnter`，播一段简化战报，再 `Proto.stageResult`。胜利 `win: true`，Toast 和结算都给出奖励；顶栏等级、金币和「Lv / 开服D」跟着会话变。撤退是 `win: false`，Toast「挑战失败，进度不变」，金币不加。第 4 胜后等级到 5，底栏铁匠铺解锁；第 5 胜后等级到 6、开服天到 2、金币 150。连胜可以推过第 70 关。

界面不让跳关。Mock 的 `stage.enter` 仍接受更高的关卡号，自检和录包还走这条。

只预览 Main、没有从 Boot 连上 Mock 时，按钮提示网络未连接。

## 主城「挂机」

点 **挂机** 打开收益页：时长、当前可领、挂满 8 小时的预览。领取走 `Proto.idleClaim`，顶栏金币跟着变。**快速作战** 对当前关发 `stage.enter` 再 `stage.result`（`win: true`），不播战报。默认录包没有这两条挂机消息；预览仍走 MockTransport。

## 主城「英雄」

底栏点 **英雄** 打开名册，再点一名英雄打开详情。升级走 `Proto.heroUpgrade`，顶栏金币跟着变。返回先回到列表，再回到主城。见 `client/assets/scripts/README.md` 的 C5。默认录包没有英雄消息。

## 主城「召唤」

底栏点 **召唤** 打开召唤页。单抽和十连走 `Proto.summonPull`，顶栏钻石跟着变。新英雄再进 **英雄** 能看到。见 `client/assets/scripts/README.md` 的 C6。默认录包没有召唤消息。

## 主城「背包」

主城点 **背包**，或从玩法列表进入。列表和「使用」走 `Proto.bagList` / `Proto.bagUse`。金币袋刷新顶栏金币；经验药水升级领队，再开英雄列表能看到。强化石和碎片点使用只 Toast。见 `client/assets/scripts/README.md` 的 C7。默认录包没有背包消息。

## 主城「邮件」

主城点 **邮件**，或从玩法列表进入。列表、已读、领取和删除走 `Proto.mailList` / `mailRead` / `mailClaim` / `mailClaimAll` / `mailDelete`。领取补给后顶栏金币增加，再进背包能看到强化石和小金币袋。见 `client/assets/scripts/README.md` 的 C8。默认录包没有邮件消息。

## 自检

仓库根目录：

```text
npx --yes esbuild client/tools/skeleton-check.ts --bundle --platform=node --format=cjs --tsconfig=client/tools/tsconfig.check.json --outfile=/tmp/mxzg-skeleton-check.js && node /tmp/mxzg-skeleton-check.js
```

覆盖：五连胜后的等级、开服天和金币、失败不回退、创角重置钱包、重连后进度还在、底栏解锁提示、面板返回栈、录包按序播放、挂机时长上限与领取、快速结算不重置挂机计时、英雄升级扣金币、金币不足和满级不改等级、升级不重置挂机计时、召唤单抽新英雄与重复碎片、钻石不足不改名册、十连一次扣费、背包使用金币袋和经验药水、强化石和碎片不可使用、空背包与数量不足、邮件领取金币和道具、已领取和无附件不改钱包、未领附件不能删除、四连胜到 Lv5、铁匠铺强化扣金币和强化石、材料不足和满级不改剑、创角重置武器。

## 倩：Creator 里点一次

1. Creator 3.8.8 打开 `client`。Canvas 上已经有 Boot，不用再挂。
2. 启动场景保持 Boot，预览。
3. 选一个服务器，点「进入游戏」（账号保持 `mock`），进入主城。顶栏应有 `MockHero`、Lv1、所选服务器，以及金币 100、钻石 20。按钮应是「主线 · 第1关」，下面有「挂机」。底栏「铁匠铺」带「锁」。
4. 点主线，再点第 1 关「挑战」。看战报（或点「跳过」）。结算为胜利，Toast「第1关胜利，金币 +10」。点「返回主城」后按钮变成「第2关」，顶栏变为 Lv2、金币 110。
5. 再胜几关。第 4 胜后铁匠铺不再带「锁」。满 5 胜后开服天变为 D2，金币 150。战斗里点「撤退」应 Toast 失败，关卡号和金币不变。
6. 点「挂机」看时长和收益。领取、快速作战见 `client/assets/scripts/README.md` 的 C4。不需要起 server，也不用改场景。
7. 底栏点「英雄」，再点光耀骑士升级。见 README 的 C5。挂机按钮还在主城。
8. 底栏点「召唤」，再点「召唤一次」。见 README 的 C6。然后回「英雄」应能看到霜刃刺客。
9. 主城点「背包」。见 README 的 C7。小金币袋会加顶栏金币，经验药水会让光耀骑士升级。玩法列表里的「背包」进的是同一页。
10. 主城点「邮件」。见 README 的 C8。领取开服补给后顶栏金币增加，背包里多出强化石和小金币袋。玩法列表里的「邮件」进的是同一页。
11. 铁匠铺仍要主线 Lv5。见 README 的 C9：主线或快速作战打赢 4 关后底栏开锁，再用邮件里的强化石强化新手短剑。Lv1 点它只 Toast，不进面板。
