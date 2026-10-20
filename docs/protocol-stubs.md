# P0 协议 stub（B5）

手写类型，不生成 Protobuf，不连真实服。调用仍走 `NetClient.request` → `MockTransport`。

旧 `.proto` 不在本仓库（`server/` 是本机 junction，未入库）。下面的数值 ID 是客户端占位，**不是**旧服消息号。阶段 D 对照旧协议时只改 ID 和编解码，尽量不动 `Proto.*` 的调用方。

## B4 已经有的，和谁在调

| cmd | MockTransport（B4） | 调用方 |
|-----|---------------------|--------|
| `login` | `ok` / `account` / `token` | Boot |
| `role.enter` | `roleId` / `name` / `level`（默认 MockHero） | Boot |
| `heartbeat` | `serverTime` | NetClient 定时发送，不走 `request` |
| 其它 cmd | `{ ok: true, echo }` | 自检里的 `echo.ping` |

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
| 1401 | `hero.list` | `HeroListReq` | `HeroListResp` | 英雄名册（C5）。空名册先种下起步三名。不改钱包 |
| 1402 | `hero.upgrade` | `HeroUpgradeReq` | `HeroUpgradeResp` | 英雄升级（C5）。扣金币。不足 `HERO_GOLD_SHORT`，满级 `HERO_LEVEL_MAX`，没有这名英雄 `HERO_NOT_FOUND` |
| 1501 | `summon.pull` | `SummonPullReq` | `SummonPullResp` | 召唤（C6）。`count` 为 1 或 10。扣钻石。不足 `SUMMON_DIAMOND_SHORT`，次数不对 `SUMMON_COUNT_INVALID` |
| 1601 | `bag.list` | `BagListReq` | `BagListResp` | 背包（C7）。只列数量大于 0 的道具。不改钱包 |
| 1602 | `bag.use` | `BagUseReq` | `BagUseResp` | 使用道具（C7）。默认 1 个。金币袋加金币，经验药水给领队加经验。不可使用、数量不足、空背包会拒绝 |
| 1701 | `mail.list` | `MailListReq` | `MailListResp` | 邮件列表（C8）。不改已读。新号三封：欢迎、开服补给、维护公告 |
| 1702 | `mail.read` | `MailReadReq` | `MailReadResp` | 标成已读（C8）。没有这封是 `MAIL_NOT_FOUND`。不发附件 |
| 1703 | `mail.claim` | `MailClaimReq` | `MailClaimResp` | 领取一封（C8）。金币钻石进钱包，道具进背包。没有附件 `MAIL_NO_ATTACHMENT`，领过 `MAIL_ALREADY_CLAIMED` |
| 1704 | `mail.claimAll` | `MailClaimAllReq` | `MailClaimAllResp` | 领取全部未领附件（C8）。一封都没有是 `MAIL_NOTHING` |
| 1705 | `mail.delete` | `MailDeleteReq` | `MailDeleteResp` | 删除（C8）。未领附件 `MAIL_DELETE_BLOCKED` |
| 1801 | `smith.view` | `SmithViewReq` | `SmithViewResp` | 铁匠铺（C9）。列出每名英雄的新手短剑。没有武器时补 Lv1，不扣费 |
| 1802 | `smith.strengthen` | `SmithStrengthenReq` | `SmithStrengthenResp` | 强化 1 级（C9）。扣金币和 1 个强化石。不足 `SMITH_GOLD_SHORT` / `SMITH_STONE_SHORT`，满级 `SMITH_LEVEL_MAX`，没有英雄 `HERO_NOT_FOUND` |
| 1901 | `arena.view` | `ArenaViewReq` | `ArenaViewResp` | 竞技场（C10）。积分、约占位名次、战力和固定对手。按开服天刷新今日次数。不改钱包 |
| 1902 | `arena.challenge` | `ArenaChallengeReq` | `ArenaChallengeResp` | 一键挑战（C10）。战力不低于对手则胜，加积分和金币；否则扣积分。每天 5 次。没有对手 `ARENA_NOT_FOUND`，次数用完 `ARENA_NO_CHANCE` |
| 2001 | `tower.view` | `TowerViewReq` | `TowerViewResp` | 幻境之塔（C11）。当前层、守关战力和今日次数。按开服天刷新次数。不改钱包。不是幻魔塔 |
| 2002 | `tower.challenge` | `TowerChallengeReq` | `TowerChallengeResp` | 一键挑战当前层（C11）。战力不低于守关则胜，层数 +1，加金币和强化石；否则层数不变。每天 10 次。已到塔顶 `TOWER_CLEARED`，次数用完 `TOWER_NO_CHANCE` |
| 2101 | `daily.view` | `DailyViewReq` | `DailyViewResp` | 日常金币副本（C12）。今日次数和三档难度的金币预览。按开服天刷新次数。不改钱包。不是经验或英雄副本 |
| 2102 | `daily.challenge` | `DailyChallengeReq` | `DailyChallengeResp` | 一键挑战所选难度（C12）。战力够则发该档金币，普通和困难再加强化石；否则不发奖励。每天 2 次。没有难度 `DAILY_NOT_FOUND`，次数用完 `DAILY_NO_CHANCE` |

代码在 `client/assets/scripts/net/protocol/`：`cmds.ts`（名字和 ID）、`types.ts`（字段）、`codec.ts`（现在是明文对象）、`Proto.ts`（`Proto.login` 等）。

```typescript
const login = await Proto.login({ account: "mock" });
const role = await Proto.roleEnter({ account: login.account });
```

不传第二个参数时用 `NetClient.shared`。自检要传入自己 new 的 `NetClient`。

Mock 约定（给 C1 / C6 直接用，不用再改传输层）：

- 每个 MockTransport 带一份 `MockGameSession`。一开始就有角色 `1001 / MockHero / Lv1`，属于账号 `mock`，下一关 1、开服第 1 天。还没 `login`，或登录的就是 `mock` 时，只 `role.enter` 也能进主城。登录别的账号则 `hasRole` 为 false，直到 `role.create`。同一局里进度会留下来。细节和录包见 `docs/mock-replay.md`。
- `role.enter` 额外带 `openDay`、`stageId`、`gold`、`diamond`（真服可以不带）。Boot 写进 `Session`。没有角色时金币钻石回 0。
- `role.create` 名字去空白后为空则 `ok: false`，不改当前角色；成功则改名，`roleId` 仍是 1001，并重置等级、主线、开服天、钱包（金币 100、钻石 20）、挂机（时长、强化石）、召唤碎片和英雄名册（回到起步三名 Lv1，每人新手短剑 Lv1）。背包重新放上小金币袋 ×2、经验药水 ×2。邮箱回到起步三封。竞技场积分回到 1000，今日次数清零。幻境之塔回到第 1 层，今日次数清零。金币副本今日次数清零。
- `stage.enter` 的 `stageId < 1` 失败；成功回 `battleId`，形如 `mock-battle-<关卡>-<序号>`。Mock 允许跳关。主线列表只放行下一关，高于等级的战报判负。
- `stage.result` 新通关后 `nextStageId = clearedStage + 1`，`level = 1 + clearedStage`，奖励占位 `{ id: 1, count: 10 }`（id 1 加金币，id 2 加钻石）。失败停在本关，奖励空，钱包不变。回包可带 `openDay` / `level` / `gold` / `diamond`。快速作战和主线战报共用这条，不另开消息。
- `idle.query` 只读。时长 = 现在 − 起算时刻，上限 8 小时。金币、强化石（id 101）按当前已通关关数计算。回包带可领数量、挂满 8 小时的预览、已有强化石和钱包。
- `idle.claim` 把可领的金币和强化石计入钱包，然后重新起算。一个都不够时 `ok: false`，`code` 为 `IDLE_EMPTY`（「挂机时间太短，暂无收益」），钱包和起算时刻不动。创角会把时长和强化石清掉。
- `hero.list` 只读。名册为空时种下光耀骑士（id 10001，3星）、林间游侠（10002，2星）、星辉法师（10003，1星），都是 Lv1，并各带新手短剑 Lv1。回包带每名英雄的等级、星级、占位属性（攻击 / 生命 / 防御）、武器等级和武器攻击、下一级金币消耗，以及当前钱包。剑是 Lv1 时攻击加成为 0。
- `hero.upgrade` 把指定英雄升 1 级并扣除金币。Lv1→2 花 30，之后每级再多 20，最高 Lv10。星级和武器等级不变。成功回包带新等级、新属性、本次花费和扣完后的钱包。金币不够时 `HERO_GOLD_SHORT`（「金币不足，无法升级」），并带 `needGold`；已满级 `HERO_LEVEL_MAX`；id 不存在 `HERO_NOT_FOUND`。这三种失败都不改等级和钱包，也不动挂机计时和主线进度。
- `summon.pull` 的 `count` 只能是 1（10 钻石）或 10（90 钻石）。不够时 `SUMMON_DIAMOND_SHORT`（「钻石不足，无法召唤」），并带 `needDiamond`；其它次数 `SUMMON_COUNT_INVALID`。失败不改钻石、名册和召唤游标。成功按固定卡池顺序抽出：不在名册里的英雄追加到末尾（Lv1，星级按卡池），已拥有的不改等级星级，改为该英雄碎片 +10。碎片道具 id = `40000 + heroId`。回包带本次掉落、新英雄人数、碎片次数和扣完后的钱包。不改金币、挂机计时和主线。创角把游标和碎片清掉。
- `bag.list` 只读。数量大于 0 才出现。顺序是小金币袋（id 201）、经验药水（id 202）、强化石（id 101），然后英雄碎片和其它材料。金币 id 1、钻石 id 2 不进背包。新号没有另填道具时，自带小金币袋 ×2、经验药水 ×2。
- `bag.use` 的 `count` 缺省 1，小于 1 为 `BAG_COUNT_INVALID`。小金币袋每个 +50 金币。经验药水每个给名册第一名 +100 经验，满 100 升 1 级；领队已满级为 `BAG_HERO_MAX`，不扣药水。强化石和碎片为 `BAG_NOT_USABLE`，数量不动。背包没有任何道具时 `BAG_EMPTY`；有别的道具但没有这一个时 `BAG_NOT_FOUND`；持有不够 `BAG_NOT_ENOUGH`。失败不改金币、英雄、挂机和主线。成功回包带剩余数量、扣完后的钱包，经验药水再带英雄名和等级。
- `mail.list` 只读。新号三封：未读的「欢迎来到梦想之光」（无附件）、未读的「开服补给」（金币 80、强化石 ×3、小金币袋 ×1）、已读的「维护公告」（无附件）。不改已读和钱包。
- `mail.read` 把指定信标成已读。已经读过也成功。没有这封是 `MAIL_NOT_FOUND`。不发附件，不改钱包。
- `mail.claim` 领取一封附件。id 1 加金币，id 2 加钻石，其它 id 进背包。成功后标成已领取和已读。没有这封 `MAIL_NOT_FOUND`，没有附件 `MAIL_NO_ATTACHMENT`（「这封邮件没有附件」），已经领过 `MAIL_ALREADY_CLAIMED`（「附件已经领取过了」）。失败不改钱包、背包、英雄、挂机和主线。
- `mail.claimAll` 把每封还没领的附件都领掉，奖励按道具 id 合并。没有可领的是 `MAIL_NOTHING`（「没有可领取的附件」）。没有附件的信保持原样，不会被标成已读。
- `mail.delete` 删一封。还有未领附件时 `MAIL_DELETE_BLOCKED`（「请先领取附件再删除」）。没有附件或已经领过可以删。没有这封是 `MAIL_NOT_FOUND`。
- `smith.view` 只读武器，并给还没有剑的英雄补 Lv1 新手短剑。补武器不扣金币和强化石。回包带每名英雄的剑等级、当前攻击、下一次消耗、背包里的强化石和钱包。名册第一名是 `leadId`。
- `smith.strengthen` 把指定英雄的新手短剑升 1 级。Lv1→2 花 20 金币和 1 个强化石，之后每级金币再多 10，最高 Lv10。每级攻击 +8，Lv1 加成为 0。金币不够 `SMITH_GOLD_SHORT`（「金币不足，无法强化」），并带 `needGold`；强化石不够 `SMITH_STONE_SHORT`（「强化石不足」），并带 `needStone`；已满级 `SMITH_LEVEL_MAX`；没有这名英雄 `HERO_NOT_FOUND`。失败不扣金币和强化石，也不提升已有等级。不改英雄等级、星级、钻石、挂机计时和主线。创角把剑重置回 Lv1。
- `arena.view` 只读。新号积分 1000，约第 41 名。战力是名册攻击之和（含武器）。对手固定五名。`used` / `limit` 是今日次数，上限 5。开服天和上次挑战不是同一天时，次数清零，积分不动。不改钱包。入口仍由客户端 `opencondition` 的 `main_pvp`（主线 Lv8）上锁，Mock 不重复拦等级。
- `arena.challenge` 按 `opponentId` 一键结算，不播战报。玩家战力不低于对手战力则胜：积分 +24、金币 +20。否则积分 -12，金币不变。积分限制在 800 到 2000，到边界时实际增减可以更少，到下限再输则变化为 0。胜负都占 1 次今日次数。没有这位对手 `ARENA_NOT_FOUND`（「没有这位对手」），次数用完 `ARENA_NO_CHANCE`（「今日挑战次数已用完」）。失败不改积分、金币和次数。不改英雄、武器、钻石、挂机计时和主线。创角把积分重置回 1000、次数清零。
- `tower.view` 只读。新号在第 1 层，共 20 层。守关战力从 100 起，每层 +20。我方战力是名册攻击之和（含武器）。`used` / `limit` 是今日次数，上限 10。开服天和上次挑战不是同一天时，次数清零，层数不动。不改钱包。入口仍由客户端 `opencondition` 的 `main_fantasy_tower`（主线 Lv16，不看开服天）上锁，Mock 不重复拦等级。幻魔塔不走这两条消息。
- `tower.challenge` 只打当前层，一键结算，不播战报。玩家战力不低于守关则胜：层数 +1，金币为 `20 + 层数 × 10`（第 1 层 30），强化石（id 101）+1。否则层数不变，金币和强化石不加。胜负都占 1 次今日次数。已到塔顶 `TOWER_CLEARED`（「已到达塔顶」），次数用完 `TOWER_NO_CHANCE`（「今日挑战次数已用完」）。这两种失败不改层数、金币、道具和次数。不改英雄、武器、钻石、挂机计时、主线和竞技场。创角把层数重置回 1、次数清零。
- `daily.view` 只读金币副本。三档：简单（战力 120，金币 120）、普通（战力 160，金币 200，强化石 ×1）、困难（战力 240，金币 320，强化石 ×2）。我方战力是名册攻击之和（含武器）。`used` / `limit` 是今日次数，上限 2。开服天和上次挑战不是同一天时，次数清零。不改钱包。入口仍由客户端 `opencondition` 的 `main_mission`（主线 Lv15，不看开服天）上锁，Mock 不重复拦等级。经验副本和英雄副本不走这两条消息。
- `daily.challenge` 按 `tierId` 一键结算，不播战报。玩家战力不低于该档建议战力则胜，发放该档金币；普通和困难再发强化石（id 101）。否则不发金币和道具。胜负都占 1 次今日次数。没有这个难度 `DAILY_NOT_FOUND`（「没有这个难度」），次数用完 `DAILY_NO_CHANCE`（「今日金币副本次数已用完」）。这两种失败不改金币、道具和次数。不改英雄、武器、钻石、挂机计时、主线、竞技场和幻境之塔。创角把次数清零。

1301 / 1302 / 1401 / 1402 / 1501 / 1601 / 1602 / 1701–1705 / 1801 / 1802 / 1901 / 1902 / 2001 / 2002 / 2101 / 2102 仍是客户端占位号，不是旧服消息号。

## 以后换成真 Protobuf

1. 只生成上表这些消息（或当时的 P0 白名单），不要一次生成全量。
2. 用生成类替换 `types.ts` 里的 interface。`Cmd` / `CmdId` 改成与服一致的名字和编号。
3. 只改 `codec.ts`：`encodeRequest` 把对象编成字节，`decodeResponse` 解回同一套字段。`Proto.login` 的函数签名保持不变。
4. `mock://` 继续走 MockTransport 的明文对象。真 WebSocket（阶段 D）在传输层发送 `encodeRequest` 的结果。
5. Boot、以及之后的 C1，继续调 `Proto.*`，不要改回散落的 cmd 字符串。
