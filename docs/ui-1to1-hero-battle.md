# 英雄 / 背包 / 挂机 / 出阵 / 战斗

对照旧工程：主城点英雄、背包、底栏战斗进挂机，战斗在挂机舞台上打，不另开一块黑底森林。中文文案。不发新协议，不打开 P5 活动壳。

贴图都在 `client/assets/resources/`。格子不在 ccbi 壳里，运行时用这些图拼。

| 屏幕 | Prefab | 数据 | 贴图 |
|------|--------|------|------|
| 英雄列表 | `prefabs/ui/hero/HeroListLayer` | `GameStore.heroes()`，名字和元素用 `herotype`，出战标用 MAIN 或本局出阵 | `ui/common/button_btn-tab-23` / `button_btn-tab-24`，`ui/hero/hero-icon_elem-0`…`5`，`hero-icon_icon-bg-2`，`hero-icon_icon-frame-1`，`hero-info_spr-star-1`，`hero-icon_spr-battle` |
| 英雄详情 | `prefabs/ui/hero/HeroInfoLayer` | 同一名册。攻击 / HP / 防御 / 速度用 `herobase`。没有表就写「—」，不写 0 | 详情壳自带装备圈。页签 育成 / 星UP / 宝石 / 神装 用同一套 tab 图 |
| 背包 | `prefabs/ui/backpack/BackpackLayer` | `GameStore.bag()`。`item.type`：装备 14/17/22/26，碎片 7/9，精灵 8，其余道具。金币钻石不进格子 | 空格 `ui/common/other_spr-null`，框 `ui/bag/backpack_item-frame-1`，图标 `ui/bag/backpack_<idx>`，缺图用 `backpack_spr-default` |
| 挂机 | `prefabs/ui/battle/BattlePanelLayer` 盖在 `ui/chapter/hang/map01_B` + `map01_F` 上 | 收益用已有 `goldPerMin` / `itemEveryMs`。计时用 3007 挂机时长，没有就从打开这一页算 | 关掉 `spr_world` 那张地图。掉落 `ui/city/main-scene_spr-drop-1`。进度条 `main-scene_progress-AFK` / `progress-hangs` |
| 出阵 | `prefabs/ui/hero/HeroSelectLayer` | 点将记在本局 `localLineup`。不发 3100。MAIN 已经有英雄就跳过这一层 | 筛选 `hero-icon_elem-*`，格子 `hero-icon_icon-bg-2`，锁 `hero-select_spr-lock` |
| 战斗 | 仍挂 `BattlePage` 播战报，画面叠在挂机壳上 | 真服仍是 3001。飘字用战报 hurt，或上一拍血量差。没有数字不写 0。没有技能名、这一拍在攻击时，条上写「攻击」 | 挂机舞台留下。`map-bg-mission-1` 下半是黑的，放大下移，避免黑带盖住站位 |

页签上的字原来是 48 号，按钮只有约 111×43，三颗页签会叠成一串。现在把字缩进按钮里。

空名册、空背包只画空格。不补假英雄、不补假道具。

「我要变强」仍打开 `HeroSuggestLayer`。「高速战斗」仍只读 3012，不发 3013。
