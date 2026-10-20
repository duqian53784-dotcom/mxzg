# 配置表导出（规划，阶段 D 落地）

客户端现在只吃 JSON。源 xlsx 不在本仓库：本机 `config/` 是 junction，指向 `F:\mxzg-local`。

## 现在就能读到的样例

`client/assets/resources/config/`

- `opencondition.json` — 入口（等级 + 可选开服日）
- `system_gate.json` — 开服日门槛

加载：`ConfigLoader.loadAll()` → `resources.load("config/<表名>", JsonAsset)`。

Boot 会打日志 `[Boot] config open@Lv1/D1 ...`。主城底部显示开服第 1 天、1 级已开的入口。

## 以后 xlsx 怎么进来

1. 只导出当前分期白名单，禁止把全量 xlsx 打进 `client`。
2. 脚本读 `config/*.xlsx`（或导出后的中间表），写出与样例相同的 `{ "table", "note", "rows" }` JSON。
3. 产物放到 `client/assets/resources/config/<表名>.json`。文件名与逻辑表名一致，例如 `opencondition.xlsx` → `opencondition.json`。
4. 客户端继续走 `ConfigLoader`，不在运行时解析 xlsx。
5. 每张表补一个同名 `.meta`（Creator 导入 JSON 用）。uuid 稳定后再提交。

`opencondition` 行字段保持：`id`、`name`、`condition_type`、`level`、`open_server_day`。  
`system` 的 `*_open_day` 收成 `system_gate` 行：`key`、`open_server_day`、`note`。

## P0 起步白名单（不是完整清单）

- `opencondition`
- `system`（先抽开服日门槛）
- `promotioncontrol`
- 主线关卡、英雄、召唤、道具
- 七日目标、七天登录

完整文件名等待对照 `F:\mxzg-local` 再补。导表脚本本身还没写。
