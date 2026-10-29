# 英雄与主阵容：第一批接口与复用边界

更新：2026-10-29。对应 P3-02、P4-01/P4-02/P4-03，当前为实现中的最小契约，尚未生成客户端类型或接入正式英雄页面。

## 当前已实现的接口

四个接口都需要 `Authorization: Bearer <accessToken>`。角色从服务端会话确定，不接受客户端指定别人的 roleId。

- `GET /api/v1/heroes`：返回当前角色的英雄数组；新角色目前返回空数组，不在登录时伪造或赠送英雄。
- `GET /api/v1/heroes/{heroId}`：读取自己的英雄；不存在或属于别人统一 404。
- `GET /api/v1/lineups/main`：返回主阵容 version 与 slots；初始值为 version=0、slots=[]。
- `PUT /api/v1/lineups/main`：按 expectedVersion 替换完整主阵容，返回保存后的快照。

HeroProfile 字段为 id（英雄实例 UUID 字符串）、templateId（配置类型整数）、level、star（正整数）。当前没有战力、技能等级、装备等字段，不应由客户端补造。列表当前按实例 ID 排序，未做分页。

英雄实例 UUID 与旧协议的数值 hero_id 是不同类型，不能把 templateId 当成实例 ID，也不能把 UUID 强转成数字塞进旧 GameStore。

## 保存示例

```json
{
  "expectedVersion": 0,
  "slots": [
    { "position": 2, "heroId": "00000000-0000-4000-8000-000000000001" }
  ]
}
```

示例 UUID 只是字段形状，实际必须是该角色拥有的数据库英雄。响应的 slots 按 position 升序，version 在有实际变更时递增；空 slots 明确表示撤下全部英雄。

- 校验失败返回 400：缺字段、null 条目、错误 UUID、重复站位/英雄、非拥有英雄、非法站位。
- 小数和字符串不会自动转换成整数字段；请求 JSON 的数值类型必须正确。
- 未提供/失效会话返回 401；英雄不可见返回 404；expectedVersion 过时返回 409。
- 同一版本的并发写入只有一个可以改变状态；过时请求不会覆盖已保存阵容。
- 版本正确且阵容内容相同的保存不重复增加版本。
- 超时后先 GET 确认当前快照；409 后重新读取并让用户确认，不盲目重试旧请求。当前没有单独的幂等请求键。
- 保存先完成结构、版本和拥有权检查，再在同一事务中替换槽位和更新版本。数据库同时约束一个英雄不能占两个位置、不能跨角色引用英雄。

## 当前站位政策与旧规则证据

当前最小主阵容接受 2、3、5、6、7、8、9，对齐已有真服路径 wireLineUpSave.ts 的阵法 1 映射；最多七项。旧 Mock 的 localLineup 有“最多八个”的另一套行为，不作为新服务端规则来源。

日服 LineupData.lua 将返回英雄按 position 索引并补齐空槽，支持“实例和站位分离”的数据结构。此次没有宣称已验证其他阵法、助阵、站位解锁、所有模式限制或旧服战斗数值；这些仍需规则样本与配置对照。battleformation 的 idx 是模式相关配置，不能未经核对当作格子编号。

新手赠送、召唤、养成和配置模板绑定还没有业务入口。测试种入的英雄仅存在于隔离 H2 测试库，不写入用户 local 数据库，不开放客户端任意发英雄接口。

## 持久化与维护入口

- hero/HeroController、HeroRepository、HeroProfile：身份隔离的只读英雄数据。
- lineup/LineupController、LineupService、LineupRepository、Lineup：版本与站位策略、事务写入、DTO。
- Flyway V2：game_hero、game_lineup_slot，以及 game_role.lineup_version；不改已执行的 V1。
- local CORS 增加 PUT，继续只允许已有两个 Creator 本地来源。
- 测试 HeroLineupTest：新角色空数据、拥有权、非法输入不修改已有阵容、重登、版本冲突、并发、真实 HTTP、PUT 预检及 V1→V2 迁移保留数据。

H2 验证不能替代 MySQL 8.4 的迁移和并发验证。重登一致性已有测试，完整进程重启与真实渠道身份仍需后续证据。

## 客户端数据层与待接界面

客户端列表数据层已建立，但尚未装配到 RemakeApp 或打开英雄页面：

- HeroApi：GET /api/v1/heroes 的运行时校验，UUID 实例 ID 与整数模板 ID 分离；拒绝坏结构、重复实例和小数/字符串数值。
- HeroRosterModel：只存 idle/loading/ready/error 与不可变英雄快照，不含 token。ready + [] 是有效空名册，不回退旧 Mock/图鉴。
- HeroRosterService：鉴权读取、并发请求去重、失败后重试；退出、换号、关闭和销毁均作废迟到结果。普通网络错误保留会话，当前会话 401 清理身份与名册。
- AccountService.authenticated：各功能共用的会话能力；请求前和返回后检查有效期，旧账号的 401 不清除新账号，不允许各页面自行读本地 token。
- HeroCatalog：独立投影 herotype/item 的名称、元素与图标，不写旧 GameStore、WireSession 或全局 gameCatalog。英雄实际等级/星级以服务器为准。

已有 HeroListView 仍依赖旧 GameStore/WireSession。下一批为它注入新列表展示模型，继续复用 HeroListLayer、HeroListHeroLayer 与 HeroIconCell，并由统一 UIManager 管理开关和返回。不把新 UUID 强转成旧 StoreHero 的数值 ID。先接只读列表及加载/空态/失败重试，再接详情和出阵。

最小 hero 配置组已登记 herotype/item，按需准备，登录和主城不提前请求。详情所需品质、技能、职业等依赖、图标 Bundle 生命周期和页面实际运行仍待接入。初始英雄发放方案未完成，空列表必须有真实空态。

检查入口：`node client/tools/check-project.mjs --suite hero-roster`。可用 MXZG_REMAKE_API 指向隔离测试后端，实连执行开发登录、读取空名册、无效 token 401 与恢复会话再读。此模式会创建测试账号，应使用隔离库；本轮以随机端口和 H2 内存库执行，不连接用户文件库。

当前主城“英雄/出阵”入口仍提示未开放；尚无可验收的客户端英雄/出阵交互。OpenAPI/客户端代码生成与接口漂移检查仍待 P3-02 后续实施，本 Markdown 不能替代机器可读契约。
