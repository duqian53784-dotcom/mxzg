# 读表（B3）

运行时只读 `assets/resources/config/*.json`。`ConfigLoader.loadAll()` 用 `resources.load`，路径不带扩展名，例如 `config/opencondition`。

| 文件 | 作用 |
|------|------|
| `opencondition.json` | 系统入口。`condition_type=1` 看主线等级；`open_server_day>0` 还要看开服自然日 |
| `system_gate.json` | 对应 `system.xlsx` 的 `*_open_day` |

判定在 `gates.ts`：`isEntryOpen` / `isServerGateOpen`。开服当天算第 1 天。主城底栏和玩法列表在 `nav.ts`，未开启仍显示，Toast 用 `entryAccess` 的提示。

xlsx 导出约定见仓库 `docs/config-pipeline.md`。源表在本机 `config/` junction，不要拷进 client。
