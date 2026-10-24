# 英雄 / 背包 / 挂机 / 出阵 / 战斗

对照旧工程：主城点英雄、背包、底栏战斗进挂机，战斗在挂机舞台上打，不另开一块黑底森林。中文文案。不发新协议，不打开 P5 活动壳。

贴图都在 `client/assets/resources/`。格子不在 ccbi 壳里，运行时用这些图拼。

| 屏幕 | Prefab | 数据 | 贴图 |
|------|--------|------|------|
| 英雄列表 | `prefabs/ui/hero/HeroListLayer` | `GameStore.heroes()` 全部进滚动格，不再停在 16 格。名字和元素用 `herotype`。头像是 `herotype.item_id`，不是类型号。出战标用 MAIN 或本局出阵。空间字是 `n/` + `system.hero_space_initial`（300）。图鉴是整张 `herotype`，没有的灰掉加锁。圣龙是 `dragonlevel` 四个名字加 `dragonrelic` 15 种 | `ui/common/button_btn-tab-23` / `button_btn-tab-24`，`ui/hero/hero-icon_elem-0`…`5`，`hero-icon_icon-bg-2`，`hero-icon_icon-frame-1`，`hero-info_spr-star-1`，`hero-icon_spr-battle`，没有的头像 `hero-icon_spr-default`，锁 `hero-icon_spr-lock`。圣龙立绘 `ui/dragon/dragon_identify-1`…`4`，锁 `dragon_spr-lock` |
| 英雄详情 | `prefabs/ui/hero/HeroInfoLayer` | 同一名册。育成页攻击 / HP / 防御 / 速度用 `herobase`。没有表就写「—」，不写 0。星UP 读 `herostar` 和 `herotype.to_N_star`，只展示，不发协议。宝石按 `jeweltype.place`（攻击 / 生命 / 速度）。神装按 `godequipment.place`（戒指 / 耳环 / 披风 / 腰带）。持有数来自背包，没有就上锁 | 详情壳自带装备圈。页签 育成 / 星UP / 宝石 / 神装 用同一套 tab 图。稀有 2/3/4 用 `backpack_spr-rare-*`，其余 `backpack_item-frame-1` |
| 背包 | `prefabs/ui/backpack/BackpackLayer` | `GameStore.bag()` 全部进滚动格，不再停在 16 格。`item.type`：装备 14/17/22/26，碎片 7/9，精灵 8，其余道具。金币钻石不进格子。点格子弹出说明，不发使用 | 空格 `ui/common/other_spr-null`，框 `ui/bag/backpack_item-frame-1` 或 `backpack_spr-rare-2|3|4`，图标 `ui/bag/backpack_<idx>`，缺图用 `backpack_spr-default`。说明卡底 `ui/common/win-bg_block-bg-24`，关 `button_btn-close-1` |
| 挂机 | `prefabs/ui/battle/BattlePanelLayer` 盖在 `ui/chapter/hang/map01_B` + `map01_F` 上 | 底栏三格读 `chapterreward.reward_base`：当前关每分钟的 900001 金币、900101 英雄经验、900003 角色经验。关号用 Mock 的 `stageId`，否则 3007 的 `nowIdx`，再否则 `maxIdx`，都没有就是 1。表没绑上才退回 `goldPerMin` / `itemEveryMs`。计时用 3007 挂机时长，没有就从打开这一页算，读到 `system.idle_max_time` 时封顶（21600 秒）。Mock 领取仍走占位公式 | 关掉 `spr_world` 那张地图。掉落 `ui/city/main-scene_spr-drop-1`。进度条 `main-scene_progress-AFK` / `progress-hangs`。三格旁边已是 `backpack_900001` / `backpack_900101` / `backpack_900003` |
| 出阵 | `prefabs/ui/hero/HeroSelectLayer` | 点将记在本局 `localLineup`。不发 3100。MAIN 已经有英雄就跳过这一层。`scroll_view_backpack` 里放筛选后的全部英雄，不再停在 8 个。上阵仍最多 8 | 筛选 `hero-icon_elem-*`，格子 `hero-icon_icon-bg-2`，锁 `hero-select_spr-lock`，头像同样走 `item_id` |
| 战斗 | 仍挂 `BattlePage` 播战报，画面叠在挂机壳上 | 真服仍是 3001。飘字用战报 hurt，或上一拍血量差。没有数字不写 0。没有技能名、这一拍在攻击时，条上写「攻击」 | 挂机舞台留下。`map-bg-mission-1` 下半是黑的，放大下移，避免黑带盖住站位 |

页签上的字原来是 48 号，按钮只有约 111×43，三颗页签会叠成一串。现在把字缩进按钮里。

空名册、空背包只画空格，并且至少铺满一屏（4 行）。格子多了就在这一屏里滚。不补假英雄、不补假道具。图鉴、宝石、神装、圣物没有服数据时按表画，没有的上锁。

英雄列表和背包的 ccbi 壳上没有滚动节点，滚动是运行时加的。出阵用壳上已有的 `scroll_view_backpack`。

和旧版仍不一样的地方写在 `docs/prefab-1to1-deviations.md` 末尾「功能偏差」。

「我要变强」仍打开 `HeroSuggestLayer`。「高速战斗」仍只读 3012，不发 3013。
