# Prefab 1:1 九宫格偏差清单（P1 + P2 + P3）

Manager 裁定：一张图的 .meta 已有边距（P1/P2 改过的，或原本就有）而某些节点按 ccbi insets 换算出的值不同时，**保留现有 .meta 值**，不改。这些节点会按现值 SLICED 显示，与老版可能有几像素的差别，统一在这里列出。P3 内部同一张图要两套值时，取用得多的那套，其余节点也列在这里。

基线 main@c3e81f83（P1 #199、P2 #201/#200/#202 已合）。T/B/L/R = top/bottom/left/right。

## 汇总

| meta | .meta 现值/采用值 T/B/L/R | 节点要求值 → 节点数（按批次） |
|---|---|---|
| `ui/common/win-bg_win-bg-11.png` | [59, 59, 59, 59] | [74, 74, 74, 74]→1 (P3B2); [79, 79, 79, 79]→1 (P1); [79, 79, 79, 79]→3 (P2A); [79, 79, 79, 79]→4 (P2B); [79, 79, 79, 79]→5 (P2C); [79, 79, 79, 79]→12 (P3A); [79, 79, 79, 79]→12 (P3B1); [79, 79, 79, 79]→6 (P3B2); [79, 79, 79, 79]→10 (P3C); [79, 79, 79, 79]→3 (P3D1); [79, 79, 79, 79]→7 (P3D2); [79, 79, 79, 79]→1 (P3E1); [79, 79, 79, 79]→2 (P3E2); [79, 79, 79, 79]→9 (P3F); [79, 79, 79, 79]→6 (P3G); [79, 79, 79, 79]→4 (P3H) |
| `ui/common/win-bg_block-bg-5.png` | [11, 11, 11, 11] | [7, 7, 7, 7]→1 (P3A); [7, 7, 7, 7]→1 (P3B1); [7, 7, 7, 7]→1 (P3B2); [9, 9, 9, 9]→4 (P1); [9, 9, 9, 9]→13 (P2A); [9, 9, 9, 9]→3 (P2C); [9, 9, 9, 9]→11 (P3A); [9, 9, 9, 9]→11 (P3B1); [9, 9, 9, 9]→3 (P3B2); [9, 9, 9, 9]→6 (P3C); [9, 9, 9, 9]→2 (P3D2); [9, 9, 9, 9]→5 (P3E1); [9, 9, 9, 9]→3 (P3E2); [9, 9, 9, 9]→7 (P3G); [9, 9, 9, 9]→9 (P3H); [19, 19, 19, 19]→3 (P3B2) |
| `ui/maps/map-bg-result-1.png` | [150, 150, 10, 10] | [50, 50, 50, 50]→1 (P3H); [80, 80, 100, 100]→1 (P3A); [100, 100, 0, 0]→1 (P3C); [130, 130, 0, 0]→2 (P3B2); [130, 130, 0, 0]→1 (P3D1); [150, 150, 0, 0]→1 (P3A); [150, 150, 0, 0]→1 (P3F) |
| `ui/common/win-bg_win-bg-12.png` | [20, 20, 15, 18] | [9, 9, 9, 9]→1 (P2C); [14, 14, 14, 14]→1 (P1); [14, 14, 14, 14]→1 (P2C); [21, 21, 21, 21]→2 (P2C); [21, 21, 21, 21]→1 (P3B1) |
| `ui/common/rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40]→1 (P2C); [40, 40, 40, 40]→1 (P3B2); [40, 40, 40, 40]→2 (P3C); [40, 40, 40, 40]→2 (P3D2) |
| `ui/common/win-bg_block-bg-10.png` | [9, 9, 9, 9] | [39, 9, 9, 9]→1 (P3F); [39, 11, 11, 11]→1 (P3F); [49, 9, 9, 9]→1 (P3G) |
| `ui/battle/battle-end_spr-title.png` | [4, 4, 0, 0] | [10, 10, 0, 0]→2 (P3A) |
| `ui/common/win-bg_cell-bg-6.png` | [29, 28, 29, 29] | [39, 38, 39, 39]→1 (P3A); [39, 38, 39, 39]→1 (P3B1) |
| `ui/misc/fantasy-land_spr-cell-bg.png` | [10, 10, 10, 10] | [0, 0, 10, 10]→1 (P3C); [0, 0, 10, 10]→1 (P3D2) |
| `ui/common/win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14]→2 (P3H) |
| `ui/common/win-bg_block-bg-15.png` | [0, 0, 29, 29] | [9, 9, 29, 29]→2 (P2A) |
| `ui/hero/hero-info_spr-hero-image-3.png` | [60, 20, 20, 20] | [80, 50, 20, 20]→1 (P3B1) |
| `ui/common/win-bg_win-bg-3.png` | [19, 19, 19, 19] | [14, 14, 14, 14]→1 (P3A) |
| `ui/common/win-bg_win-bg-14.png` | [14, 14, 14, 14] | [9, 9, 9, 9]→1 (P3A) |
| `ui/misc/super-stage_block-3.png` | [15, 15, 15, 15] | [12, 12, 12, 12]→1 (P3B1) |
| `ui/common/win-bg_line-2.png` | [0, 0, 9, 9] | [0, 0, 2, 2]→1 (P3B2) |
| `ui/common/win-bg_block-bg-40.png` | [12, 12, 12, 12] | [9, 9, 9, 9]→1 (P3G) |
| `ui/common/win-bg_block-bg-20.png` | [9, 9, 9, 9] | [11, 11, 11, 11]→1 (P2A) |

重点：`win-bg_win-bg-11`（P1 设 59，P2/P3 很多节点要 79）、`win-bg_block-bg-5`（P1 设 11，多处要 9）、`win-bg_win-bg-12`（原有 20/20/15/18，节点要 14 或 9）、`win-bg_block-bg-15`（P1 设 0/0/29/29，P2 节点要 9/9/29/29）。

## 逐节点

| 批次 | meta | 采用值 | 节点要求值 | 节点 |
|---|---|---|---|---|
| P1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChooseServerLayer:/layer/spr_scroll_bg` |
| P1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChooseServerLayer:/layer/spr_tab_bg` |
| P1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `NoticeLayer:/layer/spr_gray_bg` |
| P1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `NoticeLayer:/layer/spr_gray_bg` |
| P1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `NoticeLayer:/layer/spr_bg` |
| P1 | `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [14, 14, 14, 14] | `UserLoginLayer:/layer/spr_bg` |
| P2A | `win-bg_block-bg-15.png` | [0, 0, 29, 29] | [9, 9, 29, 29] | `RoleUpgradeLayer:/RoleUpgradeLayer/CCScale9Sprite_1` |
| P2A | `win-bg_block-bg-15.png` | [0, 0, 29, 29] | [9, 9, 29, 29] | `RoleUpgradeLayer:/RoleUpgradeLayer/CCScale9Sprite_2` |
| P2A | `win-bg_block-bg-20.png` | [9, 9, 9, 9] | [11, 11, 11, 11] | `ChangeNickLayer:/ChangeNickLayer/spr_input_bg` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/CCSprite_1/spr_cite1` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/CCSprite_1/spr_cite2` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/CCSprite_1/spr_cite3` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/CCSprite_1/spr_cite4` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/CCSprite_1/spr_send1` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/CCSprite_1/spr_send2` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/CCSprite_1/spr_send3` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/spr_bg_battle` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/spr_gm_f` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GMLayer:/GMLayer/spr_search` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ListLayer:/ListLayer/spr_panel_bg` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `RoleInfoLayer:/RoleInfoLayer/node_pannel/spr_pannel_bg` |
| P2A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `SettingChooseLayer:/SettingChooseLayer/spr_bg` |
| P2A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `GMLayer:/GMLayer/spr_bg` |
| P2A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ListLayer:/ListLayer/spr_bg` |
| P2A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SettingChooseLayer:/SettingChooseLayer/spr_bg` |
| P2B | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FriendLayer:/FriendLayer/spr_bg` |
| P2B | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FriendSearchLayer:/FriendSearchLayer/spr_bg` |
| P2B | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MailInfoLayer:/MailInfoLayer/spr_bg` |
| P2B | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MailLayer:/MailLayer/spr_bg` |
| P2C | `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `RankTopThreeCell:/RankTopThreeCell/CCScale9Sprite_1` |
| P2C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ItemSelectLayer:/ItemSelectLayer/spr_scroll_bg` |
| P2C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `RankLayer:/RankLayer/spr_my_bg` |
| P2C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `RankSingleLayer:/RankSingleLayer/spr_panel_bg` |
| P2C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `AchievementLayer:/AchievementLayer/spr_bg` |
| P2C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RankLayer:/RankLayer/spr_bg` |
| P2C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RankListLayer:/RankListLayer/spr_bg` |
| P2C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RankSingleLayer:/RankSingleLayer/spr_bg` |
| P2C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RankTopThreeLayer:/RankTopThreeLayer/spr_bg` |
| P2C | `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [9, 9, 9, 9] | `ItemBuyLayer:/ItemBuyLayer/CCScale9Sprite_1` |
| P2C | `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [14, 14, 14, 14] | `ItemExhibitionLayer:/ItemExhibitionLayer/spr_bg` |
| P2C | `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [21, 21, 21, 21] | `UpStarSuccessLayer:/UpStarSuccessLayer/spr_bg` |
| P2C | `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [21, 21, 21, 21] | `UpgradeSuccessLayer:/UpgradeSuccessLayer/spr_bg` |
| P3A | `battle-end_spr-title.png` | [4, 4, 0, 0] | [10, 10, 0, 0] | `BattleEndLayer:/BattleEndLayer/CCScale9Sprite_1` |
| P3A | `battle-end_spr-title.png` | [4, 4, 0, 0] | [10, 10, 0, 0] | `QuickBattleEndLayer:/QuickBattleEndLayer/node_role/CCScale9Sprite_1` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `BattleEditLayer:/BattleEditLayer/CCSprite_1/spr_send1` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChapterPreviewLayer:/ChapterPreviewLayer/spr_bg` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChapterRewardLayer:/ChapterRewardLayer/spr_box` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `IdleHeroSelectLayer:/IdleHeroSelectLayer/spr_bg_battle` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MainTaskChooseHeroLayer:/MainTaskChooseHeroLayer/CCNode_1/spr_list_bg` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MainTaskChooseHeroLayer:/MainTaskChooseHeroLayer/CCNode_1/spr_list_bg` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MainTaskLayer:/MainTaskLayer/spr_list_bg` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MainTaskLayer:/MainTaskLayer/spr_select_bg` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [7, 7, 7, 7] | `MissionLayer:/MissionLayer/node_content/scroll_view_bg` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MissionRewardInfoLayer:/MissionRewardInfoLayer/spr_scroll_bg` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `MissionRewardLayer:/MissionRewardLayer/spr_box` |
| P3A | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `QuickBattleLayer:/QuickBattleLayer/CCScale9Sprite_3` |
| P3A | `win-bg_cell-bg-6.png` | [29, 28, 29, 29] | [39, 38, 39, 39] | `MissionCell:/MissionCell/CCScale9Sprite_1` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `BattleDetailLayer:/BattleDetailLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `BattleEditLayer:/BattleEditLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChapterPreviewLayer:/ChapterPreviewLayer/CCScale9Sprite_1` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChapterRewardLayer:/ChapterRewardLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `HardSelectLayer:/HardSelectLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `IdleHeroSelectLayer:/IdleHeroSelectLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MainTaskChooseHeroLayer:/MainTaskChooseHeroLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MainTaskLayer:/MainTaskLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MissionLayer:/MissionLayer/node_content/content_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MissionRewardInfoLayer:/MissionRewardInfoLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `MissionRewardLayer:/MissionRewardLayer/spr_bg` |
| P3A | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `QuickBattleLayer:/QuickBattleLayer/CCScale9Sprite_1` |
| P3A | `win-bg_win-bg-14.png` | [14, 14, 14, 14] | [9, 9, 9, 9] | `QuickBattleTipLayer:/QuickBattleTipLayer/spr_bg` |
| P3A | `win-bg_win-bg-3.png` | [19, 19, 19, 19] | [14, 14, 14, 14] | `MainTaskPowerLayer:/MainTaskPowerLayer/spr_bg` |
| P3A | `map-bg-result-1.png` | [150, 150, 10, 10] | [150, 150, 0, 0] | `ChapterEndLayer:/ChapterEndLayer/spr_bg` |
| P3A | `map-bg-result-1.png` | [150, 150, 10, 10] | [80, 80, 100, 100] | `QuickBattleEndLayer:/QuickBattleEndLayer/spr_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DungeonHeroSelectLayer:/DungeonHeroSelectLayer/spr_lineup_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DungeonKillRewardLayer:/DungeonKillRewardLayer/spr_scroll_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DungeonShopLayer:/DungeonShopLayer/spr_reward_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DungeonShopListLayer:/DungeonShopListLayer/spr_scroll_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FantasyTowerLogLayer:/FantasyTowerLogLayer/spr_scroll_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FloatingIslandsBossLayer:/FloatingIslandsBossLayer/node_bottom/node_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FloatingIslandsDamageLayer:/FloatingIslandsDamageLayer/spr_panel_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `FloatingIslandsRewardLayer:/FloatingIslandsRewardLayer/spr_my_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [7, 7, 7, 7] | `PlaneWarMissionLayer:/PlaneWarMissionLayer/node_mission/scroll_view_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `PlaneWarRankLayer:/PlaneWarRankLayer/rank/rank_scroll_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `PlaneWarRankLayer:/PlaneWarRankLayer/rank/spr_self_bg` |
| P3B1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `PlaneWarRankLayer:/PlaneWarRankLayer/reward/reward_scroll_bg` |
| P3B1 | `win-bg_cell-bg-6.png` | [29, 28, 29, 29] | [39, 38, 39, 39] | `PlaneWarMissionCell:/PlaneWarMissionCell/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonBoxUseLayer:/DungeonBoxUseLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonHeroAttackLayer:/DungeonHeroAttackLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonHeroSelectLayer:/DungeonHeroSelectLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonKillRewardLayer:/DungeonKillRewardLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonLayer:/DungeonLayer/spr_hero_list_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonShopLayer:/DungeonShopLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DungeonShopListLayer:/DungeonShopListLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FantasyTowerPreviewLayer:/FantasyTowerPreviewLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FloatingIslandsDamageLayer:/FloatingIslandsDamageLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `FloatingIslandsRewardLayer:/FloatingIslandsRewardLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `PlaneWarMissionLayer:/PlaneWarMissionLayer/node_mission/spr_mission_bg` |
| P3B1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `PlaneWarRankLayer:/PlaneWarRankLayer/spr_bg` |
| P3B1 | `win-bg_win-bg-12.png` | [20, 20, 15, 18] | [21, 21, 21, 21] | `FloatingIslandsBossLayer:/FloatingIslandsBossLayer/node_center/CCNode_1/spr_bg2` |
| P3B1 | `hero-info_spr-hero-image-3.png` | [60, 20, 20, 20] | [80, 50, 20, 20] | `DungeonHeroSelectLayer:/DungeonHeroSelectLayer/spr_hero_bg` |
| P3B1 | `super-stage_block-3.png` | [15, 15, 15, 15] | [12, 12, 12, 12] | `FloatingIslandsRewardLayer:/FloatingIslandsRewardLayer/spr_rank_title_bg` |
| P3B2 | `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `STMagicTowerRankRewardCell:/STMagicTowerRankRewardCell/CCScale9Sprite_1` |
| P3B2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [7, 7, 7, 7] | `RainbowHistoryCell:/RainbowHistoryCell/node_item/item_bg` |
| P3B2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `RainbowHistoryLayer:/RainbowHistoryLayer/CCNode_1/spr_scroll_bg` |
| P3B2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [19, 19, 19, 19] | `STMagicTowerMissionRewardCell:/STMagicTowerMissionRewardCell/spr_cell_bg` |
| P3B2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [19, 19, 19, 19] | `STMagicTowerRankLayer:/STMagicTowerRankLayer/node_rank/spr_rank_scroll_view_bg` |
| P3B2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [19, 19, 19, 19] | `STMagicTowerRankRewardLayer:/STMagicTowerRankRewardLayer/spr_reward_scroll_view_bg` |
| P3B2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `TrialInfoLayer:/TrialInfoLayer/node_pannel/spr_pannel_bg` |
| P3B2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `UnderworldPagodaBossLayer:/UnderworldPagodaBossLayer/node_bottom/node_bg` |
| P3B2 | `win-bg_line-2.png` | [0, 0, 9, 9] | [0, 0, 2, 2] | `RainbowChallengeLayer:/RainbowChallengeLayer/CCNode_2/CCScale9Sprite_2` |
| P3B2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RainbowChallengeLayer:/RainbowChallengeLayer/CCScale9Sprite_1` |
| P3B2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `RainbowHistoryLayer:/RainbowHistoryLayer/spr_bg` |
| P3B2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `STMagicTowerRankLayer:/STMagicTowerRankLayer/node_rank/spr__rank_bg` |
| P3B2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [74, 74, 74, 74] | `STMagicTowerRankRewardLayer:/STMagicTowerRankRewardLayer/CCScale9Sprite_1` |
| P3B2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TrialHelpLayer:/TrialHelpLayer/spr_bg` |
| P3B2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TrialInfoLayer:/TrialInfoLayer/spr_bg` |
| P3B2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `UnderworldPagodaRankLayer:/UnderworldPagodaRankLayer/spr_bg` |
| P3B2 | `map-bg-result-1.png` | [150, 150, 10, 10] | [130, 130, 0, 0] | `STMagicTowerBattleEndLayer:/STMagicTowerBattleEndLayer/spr_bg` |
| P3B2 | `map-bg-result-1.png` | [150, 150, 10, 10] | [130, 130, 0, 0] | `STMagicTowerJumpLayer:/STMagicTowerJumpLayer/spr_bg` |
| P3C | `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `PvpRankCell:/PvpRankCell/CCScale9Sprite_1` |
| P3C | `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `PvpRewardCell:/PvpRewardCell/CCScale9Sprite_1` |
| P3C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `BetLayer:/BetLayer/spr_scroll_bg` |
| P3C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `BetListLayer:/BetListLayer/spr_panel_bg` |
| P3C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `LadderChallengeLayer:/LadderChallengeLayer/CCNode_2/spr_bg_battle` |
| P3C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `LadderHistoryLayer:/LadderHistoryLayer/spr_scroll_bg` |
| P3C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `LadderRewardLayer:/LadderRewardLayer/spr_my_bg` |
| P3C | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `PvpLayer:/PvpLayer/layer_rank/spr_my_bg` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `BetListLayer:/BetListLayer/spr_bg` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `LadderChallengeLayer:/LadderChallengeLayer/CCScale9Sprite_1` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `LadderHeroTempleLayer:/LadderHeroTempleLayer/spr_bg` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `LadderHistoryLayer:/LadderHistoryLayer/spr_bg` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `LadderRewardLayer:/LadderRewardLayer/spr_bg` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `PvpHistoryLayer:/PvpHistoryLayer/spr_bg` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `PvpLayer:/PvpLayer/spr_bg` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `VideoStudioLayer:/VideoStudioLayer/CCScale9Sprite_1` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `VideoStudioRecordLayer:/VideoStudioRecordLayer/CCScale9Sprite_1` |
| P3C | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `VideoStudioSaveLayer:/VideoStudioSaveLayer/CCScale9Sprite_1` |
| P3C | `map-bg-result-1.png` | [150, 150, 10, 10] | [100, 100, 0, 0] | `PvpEndLayer:/PvpEndLayer/spr_bg` |
| P3C | `fantasy-land_spr-cell-bg.png` | [10, 10, 10, 10] | [0, 0, 10, 10] | `LadderHistoryHighCell:/LadderHistoryHighCell/spr_cell_bg` |
| P3D1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageAccountLayer:/SuperStageAccountLayer/spr_bg` |
| P3D1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageHistoryLayer:/SuperStageHistoryLayer/CCScale9Sprite_1` |
| P3D1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageHistoryVideoLayer:/SuperStageHistoryVideoLayer/CCScale9Sprite_1` |
| P3D1 | `map-bg-result-1.png` | [150, 150, 10, 10] | [130, 130, 0, 0] | `SuperStageBattleEndLayer:/SuperStageBattleEndLayer/CCScale9Sprite_1` |
| P3D2 | `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `SuperStageRewardCell:/SuperStageRewardCell/CCScale9Sprite_1` |
| P3D2 | `rank_spr-cell-bg-1.png` | [30, 30, 30, 30] | [40, 40, 40, 40] | `SuperStageTokenCell:/SuperStageTokenCell/CCScale9Sprite_1` |
| P3D2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `SuperStageTop2HistoryLayer:/SuperStageTop2HistoryLayer/spr_panel_bg` |
| P3D2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `SuperStageTopChallengeLayer:/SuperStageTopChallengeLayer/CCNode_2/spr_bg_battle` |
| P3D2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageRankLayer:/SuperStageRankLayer/spr_bg` |
| P3D2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageRewardLayer:/SuperStageRewardLayer/spr_bg` |
| P3D2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTop2HistoryLayer:/SuperStageTop2HistoryLayer/spr_bg` |
| P3D2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTopChallengeLayer:/SuperStageTopChallengeLayer/CCScale9Sprite_1` |
| P3D2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTopHistoryLayer:/SuperStageTopHistoryLayer/CCScale9Sprite_1` |
| P3D2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTopLegendLayer:/SuperStageTopLegendLayer/spr_bg` |
| P3D2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `SuperStageTopRankLayer:/SuperStageTopRankLayer/spr_bg` |
| P3D2 | `fantasy-land_spr-cell-bg.png` | [10, 10, 10, 10] | [0, 0, 10, 10] | `SuperStageTopHistoryHighCell:/SuperStageTopHistoryHighCell/spr_cell_bg` |
| P3E1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionBetLayer:/ChampionBetLayer/spr_scroll_bg` |
| P3E1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionCrossBetLayer:/ChampionCrossBetLayer/spr_scroll_bg` |
| P3E1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionCrossListLayer:/ChampionCrossListLayer/spr_panel_bg` |
| P3E1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionCrossRankLayer:/ChampionCrossRankLayer/node_bottom/CCScale9Sprite_1` |
| P3E1 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionCrossRankLayer:/ChampionCrossRankLayer/node_top/spr_rank_bg` |
| P3E1 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChampionCrossListLayer:/ChampionCrossListLayer/spr_bg` |
| P3E2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionListLayer:/ChampionListLayer/spr_panel_bg` |
| P3E2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionRankLayer:/ChampionRankLayer/node_bottom/CCScale9Sprite_1` |
| P3E2 | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ChampionRankLayer:/ChampionRankLayer/node_top/spr_rank_bg` |
| P3E2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChampionListLayer:/ChampionListLayer/spr_bg` |
| P3E2 | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ChampionShopLayer:/ChampionShopLayer/CCScale9Sprite_1` |
| P3F | `win-bg_block-bg-10.png` | [9, 9, 9, 9] | [39, 9, 9, 9] | `TeamArenaBattleLogCell:/TeamArenaBattleLogCell/node/CCScale9Sprite_1` |
| P3F | `win-bg_block-bg-10.png` | [9, 9, 9, 9] | [39, 11, 11, 11] | `TeamArenaLineupCell:/TeamArenaLineupCell/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaBattleLayer:/TeamArenaBattleLayer/panel/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaBattleLogLayer:/TeamArenaBattleLogLayer/CCScale9Sprite_1` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaLayer:/TeamArenaLayer/panel/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaLineupLayer:/TeamArenaLineupLayer/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaNewTeam:/TeamArenaNewTeam/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaRewardLayer:/TeamArenaRewardLayer/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaTeamAddMainLayer:/TeamArenaTeamAddMainLayer/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaTeamMainLayer:/TeamArenaTeamMainLayer/spr_bg` |
| P3F | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `TeamArenaVideoLayer:/TeamArenaVideoLayer/CCScale9Sprite_1` |
| P3F | `map-bg-result-1.png` | [150, 150, 10, 10] | [150, 150, 0, 0] | `TeamArenaEndLayer:/TeamArenaEndLayer/spr_bg` |
| P3G | `win-bg_block-bg-10.png` | [9, 9, 9, 9] | [49, 9, 9, 9] | `GRMissionStarRewardCell:/GRMissionStarRewardCell/CCScale9Sprite_1` |
| P3G | `win-bg_block-bg-40.png` | [12, 12, 12, 12] | [9, 9, 9, 9] | `GRMissionCastleCell:/GRMissionCastleCell/spr_chapter_bg` |
| P3G | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamFirstLayer:/DreamFirstLayer/show/item_bg` |
| P3G | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamRankLayer:/DreamRankLayer/rank/rank_scroll_bg` |
| P3G | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamRankLayer:/DreamRankLayer/rank/spr_self_bg` |
| P3G | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamRankLayer:/DreamRankLayer/reward/reward_scroll_bg` |
| P3G | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamRewardLayer:/DreamRewardLayer/spr_scroll_bg` |
| P3G | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `DreamSelectLayer:/DreamSelectLayer/buff_list` |
| P3G | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `GRMissionStarRewardLayer:/GRMissionStarRewardLayer/spr_bg` |
| P3G | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamFriendLayer:/DreamFriendLayer/spr_bg` |
| P3G | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamLayer:/DreamLayer/message/spr_bg` |
| P3G | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamRankLayer:/DreamRankLayer/spr_bg` |
| P3G | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamRewardLayer:/DreamRewardLayer/spr_bg` |
| P3G | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `DreamSelectLayer:/DreamSelectLayer/spr_bg` |
| P3G | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `GRMissionStarRewardLayer:/GRMissionStarRewardLayer/spr_bg` |
| P3H | `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `ExoticAdventureBackpackInfoLayer:/ExoticAdventureBackpackInfoLayer/spr_bg` |
| P3H | `win-bg_block-bg-24.png` | [12, 12, 12, 12] | [14, 14, 14, 14] | `ExoticAdventureUpgradeLayer:/ExoticAdventureUpgradeLayer/spr_bg` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureBackpackLayer:/ExoticAdventureBackpackLayer/spr_box` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureGetItemsLayer:/ExoticAdventureGetItemsLayer/spr_box` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureIllustratedBooksLayer:/ExoticAdventureIllustratedBooksLayer/spr_box` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureReportLayer:/ExoticAdventureReportLayer/CCNode_2/CCScale9Sprite_1` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureReportLayer:/ExoticAdventureReportLayer/CCNode_2/CCScale9Sprite_2` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureShioInfoCtr:/ExoticAdventureShioInfoCtr/node_title/spr_content` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureShioInfoLayer:/ExoticAdventureShioInfoLayer/node_bg/spr_content` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureTeamLayer:/ExoticAdventureTeamLayer/spr_box` |
| P3H | `win-bg_block-bg-5.png` | [11, 11, 11, 11] | [9, 9, 9, 9] | `ExoticAdventureTeamLayer:/ExoticAdventureTeamLayer/spr_box` |
| P3H | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ExoticAdventureBackpackLayer:/ExoticAdventureBackpackLayer/spr_bg` |
| P3H | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ExoticAdventureIllustratedBooksLayer:/ExoticAdventureIllustratedBooksLayer/spr_bg` |
| P3H | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ExoticAdventureReportLayer:/ExoticAdventureReportLayer/spr_bg` |
| P3H | `win-bg_win-bg-11.png` | [59, 59, 59, 59] | [79, 79, 79, 79] | `ExoticAdventureShioInfoCtr:/ExoticAdventureShioInfoCtr/spr_bg` |
| P3H | `map-bg-result-1.png` | [150, 150, 10, 10] | [50, 50, 50, 50] | `ExoticAdventureRandomEventsLayer:/ExoticAdventureRandomEventsLayer/spr_bg` |

## 功能偏差（英雄 / 背包 / 挂机）

这一节不是九宫格边距。旧 Lua 不在仓库里。下面是对照 ccbi、`client/assets/resources/config/` 和现有壳之后，仍和旧版不一样、或只能猜的地方。

| 项 | 现在怎么做 | 依据 / 还差什么 |
|---|---|---|
| 英雄列表、背包滚动 | 运行时加竖向 ScrollView。壳上没有这个节点。空位只补满最后一行，并且至少 4 行，不是 300 个空格 | `hero_space_initial` 只用于「空间 n/300」这行字 |
| 出阵列表 | 用已有 `scroll_view_backpack` 的 content，筛选后的英雄都放进去。上阵仍最多 8 | 以前只画前 8 个 |
| 挂机三格 | `chapterreward.idx` 对当前关，`reward_base` 里 900001 / 900101 / 900003 的 `item_num` 写成「N/m」 | 和底栏三个图标一致。没有 Lua 逐行对过。表没绑上时底栏退回 `goldPerMin` |
| Mock 领取 | 金币、角色经验、英雄经验走 `chapterreward.reward_base`，当前关 = 已通关 + 1。封顶用 `system.idle_max_time`（21600 秒）。挂机壳宝箱和 Mock 挂机页都走这一套 | 强化石仍是旧节奏：未通关每 30 秒 1 个，每通关缩短 1 秒，最短 10 秒，不在 `reward_base` 里。表没绑上时金币退回每分钟 6、每关 +4，封顶 8 小时。角色经验 900003、英雄经验 900101 作为背包道具发放。VIP 加成仍不加 |
| 怒气条 | 挂机战斗条上的蓝条按当前回合 / 15 填充 | 战报没有怒气字段，只标位置 |
| 暴击飘字 | 战报 `crit` 为真时用更大的金字，前缀「暴击」。Mock 简化战报没有 crit，回合行里有「溃败」时敌方伤害按暴击画 | 不是表里的暴击率 |
| 结算星 | 胜利在 `show_hero` 下画 3 颗 `hero-info_spr-star-1`，失败不画 | `chapterreward` 没有星级列 |
| 结算奖励 | 胜利读这一关 `chapterreward.first_reward`，画在 `show_rich`，最多 6 个图标 | 失败不发这列。确定钮写成「回挂机」，不发 3002 |
| 下一关 | 胜利时把已有 `btn_report` 改成「下一关」。Mock 再进当前关，真服先回挂机再走原来的 3001 | 不新开协议。失败不显示这颗钮 |
| 快速战斗 | `QuickBattleLayer` 用 `idle_speed_up`（7200 秒）预览两小时 `reward_base`，并读已有 3012 | 不发 3013，不发奖励。说明和跳转只改提示字 |
| 我要变强 | 打开已有 `HeroSuggestLayer`。四个页签只切换 `node_strong` / `resource` / `hero` / `lineup` | 不发协议。名字最多写名册前三名 |
| VIP | 挂机条写「VIP未同步」。`vipIdleLine(level)` 能按 `vip` 表写出金币 / 英雄经验 / 角色经验百分比和 `extra_idle_time`。三格和封顶仍是 `reward_base` + `idle_max_time`，不乘某一档 | s2c 2001 已核对的字段没有 `vip_level`。字段 15 按旧说明不读。没有等级就不把表里的 10% 或 0% 当成这名角色的加成 |
| 随机掉落 | 掉落堆下面画当前关 `drop_group` 的物品图标，最多 6 个。点开写表内 min/max 和「每 60 秒」。不写进三格，不掷随机数 | `chapterreward.drop_group` → `droptrigger` → `dropgroup`。`idle_drop_frequency` = 60 |
| 时钟 | 超过 1 小时写成 `hh:mm:ss`。读到 `idle_max_time` 就停在 06:00:00 | 没读到表时不封顶 |
| 头像 | `ui/hero/hero-icon_<item_id>`。`item_id` 为 0 时用 `item.idx` = 英雄类型号上的 `hero-icon/` 路径 | 雷顿、赫卡忒·幽魂、撒旦·赫莱、深渊终结者的图是 `hero-icon_20701001` / `20701003` / `20701004` / `20701006` |
| 图鉴顺序 | `herotype` 表的顺序。同类型多只英雄打开名册里的第一只 | 旧排序没对上 |
| 元素名 | 1 火、2 水、3 木、4 光、5 暗 | 对 language 2101–2105。不是 Lua 实证 |
| 星UP | 详情页按 `herostar` 画等级上限、攻击 / 生命展示、技能槽等级（`skill1`…`skill4`）和 `upstar_cost` / `need_item` 图标，再加上 `to_N_star`。升星钮只记日志 | 不发升级协议。满星写「已满星」。表上没有速度展示列，这一行不写速度 |
| 宝石 / 神装 | 按部位筛，图标 `backpack_<id>`，持有数是背包里 `itemType` 或 `itemId` 等于这条 idx 的数量。0 就灰掉加锁 | `StoreHero` 没有已穿装备。这是图鉴，不是「这名英雄身上穿着什么」 |
| 稀有框 | 只有 2 / 3 / 4 用 `backpack_spr-rare-*` | 没有 `spr-rare-1` 或 `spr-rare-5`，其余用 `backpack_item-frame-1` |
| 圣龙立绘 | 四个名字仍按 `dragonlevel` 第一次出现：斯摩格、迪斯莱尔、雷博尔、英菲尼迪。格子用同一张 `dragon_btn-illustration`，写「图鉴」，不再把 `dragon_identify-1`…`4` 安到这四条上。标题在 s2c 59001 有 `attr_level` 时写「圣龙等级 N」 | `dragon_identify-0`…`11` 是鉴定光效，不是物种立绘。表上没有立绘列。不发 59007 升等级 |
| 圣物 | 每种 `kind` 用 1 星那条的名字、图标和特性。任一星的 id 在背包里就算持有 | 不发升星 |
| 说明卡 | 按 BackpackInfoLayer 的 390×300 在运行时拼。不挂那个 prefab，也不发使用 / 出售 / 来源 | 关闭只关这张卡 |
| 空名册 / 空背包 | 4001 还没到：英雄页写「真服英雄未同步」，格子改画 `herotype` 图鉴（灰、锁），不造英雄。4001 是空数组：写「空名册」，同样改画图鉴。有英雄仍只画名册。背包没到写「真服未同步」，空表写「空背包」，格子仍是空框。出阵没有英雄写「空名册，没有可上阵的英雄」。收到后续 s2c 会重画 | 图鉴不是角色进度。不把配置表行写进 `GameStore` |

## 启动加载 / 热更

清单和 `docs/mxzg-prefab-1to1-inventory.md` 里没有 Loading、Update、logo 的 ccbi。logo 和主城原先是代码搭的。`LoadingLayer` / `UpdateLayer` 因此按资源裁切摆在 720×1280 上，不是 ccbi 坐标换算。两套 Prefab 节点相同，只引用 `resources` 的 sprite-frame（`@f9941`）。生成脚本是 `client/tools/gen_loading_prefab.py`。

| 项 | 现在怎么做 | 依据 / 还差什么 |
|---|---|---|
| logo 图 | `resources/ui/login/logo-scene_spr-logo.png`，原始尺寸显示 | 文件 69 字节，IHDR 3×3，是失败的图集抽出。仍用这张 |
| logo 时间 | 淡入 1 秒、停 1 秒、淡出 0.5 秒。点一下跳过停留和淡出 | 旧 lua 不在仓库。常量在 `logoSplash.ts` |
| logo 音乐 | `resources/audio/bgm-logo.mp3` 从淡入循环到进 Main | |
| 背景 | `ui/login/bg-loading.jpg` 768×1300。cover 到 720×1280：scale = max(720/768, 1280/1300) ≈ 0.9846，画出 756×1280 | 左右被裁一点，不留黑边 |
| 进度框 | `loading_spr-bg-2` 用裁切 617×37（原图 638×37，offsetX -1.5），y = -500 | 没有 ccbi 的条位置 |
| 进度槽 / 填充 | 槽 532×32，填充 524×24，都在 y = -500 | 静态图垫在 spine 下面 |
| 进度头 | `loading_spr-progress-1` 裁切 18×27，从 x = -262 跟着填充走 | |
| spine | `spine/jindutiao` 动画 `stand`。原生宽 275，scaleX = 524/275 ≈ 1.9055，放在遮罩里。遮罩锚点在左，宽度从 0 长到 524 | Spine 3.7.94，播放前走 `runtimeSpineData`。播不了时仍能看见底下的填充图 |
| 百分比 | `loading_text-bg` 84×84，字在 y = -448，格式 `N%` | |
| 提示 | y = -580，宽 660。`loadingtips` 3701–3705 对 language，去掉 font 标签，约 3.5 秒随机换，不重复上一条 | 字色 `#ffeeb2` |
| 阶段字 | y = -390。检查版本 / 更新资源 / 加载资源 / 读取配置 / 登录 / 同步角色 | |
| 重试 | 默认隐藏，y = -280。图是 `button_btn-orange-big-1`，按下 `orange-big-2`，九宫边距沿用 meta（左 64、右 59） | 热更确认时把字改成「下载」 |
| 热更层 | 和加载层同一棵节点。H5 只走界面和进度。其它平台下载 `version.manifest`，不改搜索路径 | 没有热更 ccbi，也没有 AssetsManager |
