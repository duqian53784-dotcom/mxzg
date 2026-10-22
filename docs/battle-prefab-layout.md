# 战斗表现 Prefab

主线战斗的表现壳，和一份更薄的真服接线占位。两页没有共用的根。给以后的 Client 换 Prefab 用，这一刀只落节点和贴图引用。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| BattlePage | `prefabs/ui/battle/BattlePage` | **未接** |
| WireBattlePage | `prefabs/ui/battle/WireBattlePage` | **未接** |

- **路径**：`client/assets/prefabs/ui/battle/BattlePage.prefab`、`client/assets/prefabs/ui/battle/WireBattlePage.prefab`
- **状态**：**未接** Boot、`MainApp`、`MainlinePage.ts`、`WireMainlinePage.ts`，以及任何 `USE_*_PREFAB`。不改协议脚本，不删代码 UI。运行时仍走代码搭的战斗页。验收通过后再由客户端加加载开关。
- 设计基准 **720×1280**，坐标相对父节点中心。`LayerField`、`LayerVfx`、`LayerHud`、`EnemySlots`、`AllySlots`、`HpBars`、`SkillBars` 都是铺满页面的 (0, 0) 容器，所以它们的直接子节点就是页面坐标。`TopBar` 例外，它自己在页面上，子节点是它的本地坐标。
- 不挂脚本组件。Prefab 里的 `__type__` 只有 `cc.*`。现有通用壳的脚本 id 仍是 23 位 packer（保留头 5）。这一刀没有新的类 id，生成器会拒绝非 `cc.*` 组件，也会拒绝 22 位脚本 id，避免退回 `compressUuid(uuid, true)`。
- 不嵌 Spine。`VfxSkill` / `VfxHit` / `VfxScreen` 只有 `cc.UITransform`。Spine 仍在 `client/assets/resources/spine/`。不迁 PVR 的 skill / skill-effect / hero-beattack。
- 素材只引用 `client/assets/resources/` 的 spriteFrame `@f9941`。`prefabs/ui/battle/` 下没有 PNG。
- 再生：`python3 client/tools/gen_battle_prefab.py`。从现有 `.meta` 读 uuid，再跑一次会覆写同一份 Prefab，并保留已有 `.meta` uuid。

## 用了哪些图

`client/assets/resources/ui/battle/` 在 main 上不存在，所以没有 `battle-scene_spr-bg-1`、`battle-scene_prog-*`、`battle-scene_btn-speed-*`、`battle-scene_btn-close-1`。

按存在性选底，命中的是主线关卡真底，不是色块：

| 用途 | 资源 | 模式 |
|------|------|------|
| 页面 `Bg` | `ui/mainline/map-bg-mission-1.jpg` | 简单，白色，拉到 720×1280。spriteFrame `2de46307-6f48-4be7-ae7f-d6f629aef140@f9941`。原图 648×1152 |
| 站位色块 | `ui/common/win-bg_block-bg-5.png` | 简单。敌 `(96, 40, 44, 168)`，我 `(28, 58, 96, 168)` |
| 血条 / 技能条 | `ui/common/win-bg_num-bg.png` | 简单。底 `(16, 20, 28)`，敌填充 `(220, 96, 96)`，我填充 `(88, 196, 120)`，技能框 `(16, 28, 48, 230)`，技能填充 `(255, 214, 120)` |
| 战报底 | `ui/common/win-bg_msg-bg.png` | 简单，`(10, 18, 32, 230)` |
| `BtnSkip` / `BtnBack` | `ui/common/button_btn-blue-big-1.png`（按下 `button_btn-blue-big-2`） | 九宫格，不染色 |
| `BtnRetreat` | `ui/common/button_btn-orange-big-1.png`（按下 `button_btn-orange-big-2`） | 九宫格，不染色 |
| `BtnClose` | `ui/common/button_btn-close-1.png` | 简单，裁切 **53×56**，不染色。没有按下图，缩放过渡，没有 Label |
| 字 | `font/FZCSJW-GB1-0.ttf` | 与其他页相同 |

没有 `BtnSpeed`：加速图不在仓里，不拿别的钮冒充。`map-bg-super-stage` 和 `map-bg-dungeon-1` 都在，但主线 `map-bg-mission-1` 更靠前，所以没用它们。这不是「待换真底」的色块；等 `ui/battle/battle-scene_spr-bg-1` 入库后，再生脚本会改选那张战斗场景底。

按钮是 `cc.Sprite` + `cc.Button`（缩放，`zoomScale` 1.05，`clickEvents` 为空）。文案在子节点 `Label`。`BtnClose` 没有 `Label`。

## BattlePage

根 `BattlePage`。绘制顺序：`Bg`、`LayerField`、`LayerVfx`、`LayerHud`。HUD 盖在挂点上面。

前排三个站位对齐当前代码战斗的 `slotXY`：敌方 y=300、我方 y=20，x 为 -200 / 0 / 200（三人横排）。后排是多出来的 3 个挂点，给以后六人阵用。`VfxSkill` / `VfxHit` 的默认点对齐 `anchorXY` 在没有锚点时的回退：技能 (0, 180)，受击 (0, 120)。代码里的跳过钮在 y=-280，那一档会压住这张壳的下半场，所以 `BtnSkip` / `BtnRetreat` 放在底栏。接线时由客户端决定要不要挪。

血条预览数字跟 Mock 战报的敌 120、我 100 一致，只是编辑器里能看见的占位。

### 战场

| 节点 | 位置 (x, y) | 尺寸 | 说明 |
|------|-------------|------|------|
| `Bg` | (0, 0) | 720×1280 | 主线 `map-bg-mission-1` |
| `LayerField` | (0, 0) | 720×1280 | 容器 |
| `EnemySlots` | (0, 0) | 720×1280 | 容器 |
| `Slot_E0` `Slot_E1` `Slot_E2` | (-200 / 0 / 200, 300) | 108×120 | 敌前排。子节点 `Placeholder`、`Label`（`E0`…） |
| `Slot_E3` `Slot_E4` `Slot_E5` | (-200 / 0 / 200, 448) | 108×120 | 敌后排 |
| `AllySlots` | (0, 0) | 720×1280 | 容器 |
| `Slot_A0` `Slot_A1` `Slot_A2` | (-200 / 0 / 200, 20) | 108×120 | 我前排。`Label` 为 `A0`… |
| `Slot_A3` `Slot_A4` `Slot_A5` | (-200 / 0 / 200, -180) | 108×120 | 我后排 |

`Placeholder` 和 `Label` 都在槽的 (0, 0)。`Label` 96×36，字号 22，白字描边。

### 特效挂点

都在 `LayerVfx` 下，空节点，没有子节点，也没有 Sprite。

| 节点 | 位置 (x, y) | 尺寸 |
|------|-------------|------|
| `VfxSkill` | (0, 180) | 48×48 |
| `VfxHit` | (0, 120) | 48×48 |
| `VfxScreen` | (0, 0) | 720×1280 |

`VfxScreen` 铺满是为了全屏特效有一个页面大小的父节点。它不挡按钮：节点上没有点击组件。

### HUD

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `TopBar` | (0, 592) | 720×64 | 容器 |
| `TopBar/RoundLabel` | (0, 0) | 400×40 | `第1回合`，字号 28 |
| `TopBar/BtnClose` | (308, 0) | 53×56 | 无文案 |
| `HpBars` | (0, 0) | 720×1280 | 容器 |
| `EnemyHp_0`…`EnemyHp_2` | (-200 / 0 / 200, 532) | 160×24 | `120/120` |
| `AllyHp_0`…`AllyHp_2` | (-200 / 0 / 200, -290) | 160×24 | `100/100` |
| `SkillBars` | (0, 0) | 720×1280 | 容器 |
| `SkillBar_0`…`SkillBar_2` | (-220 / 0 / 220, -360) | 180×36 | `Label` 为空字符串 |
| `LogBg` | (0, -456) | 660×64 | — |
| `Log` | (0, -456) | 620×48 | `第1回合 · 我方突进`，左对齐，字号 18 |
| `BtnSkip` | (-140, -568) | 200×52 | `跳过` |
| `BtnRetreat` | (140, -568) | 200×52 | `撤退` |

血条和技能条的 `Fill` 是左对齐的窄条（锚点仍在中心，所以 x 为负）：血条填充 112×14，本地 x=-24；技能填充 72×16，本地 x=-54。只有三格血条和三格技能条，对应现在代码里的三人横排。后排三个站位没有条。

## WireBattlePage

根 `WireBattlePage`。没有站位，没有 VFX。`#159` 已经把 c2s 3101 阵容探针合进 main，所以状态句不再写「等 Client 3101」。这页仍然不接线。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | 与 BattlePage 同一张主线底 |
| `Title` | (0, 260) | 680×52 | `战斗（真服接线占位）`，字号 36 |
| `Status` | (0, 170) | 640×38 | `未同步 · 等切 Prefab`，字号 22 |
| `FieldHint` | (0, 40) | 640×112 | 站位与特效挂点见 BattlePage。顶对齐，可换行，字号 20 |
| `BtnBack` | (0, -160) | 240×48 | `返回` |
