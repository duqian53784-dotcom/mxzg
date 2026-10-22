# 战斗表现 Prefab

主线战斗的表现壳，和一份更薄的真服接线占位。两页没有共用的根。

| Prefab | 路径（相对 assets） | 状态 |
|--------|---------------------|------|
| BattlePage | `prefabs/ui/battle/BattlePage` | **已接** 真服进战 |
| WireBattlePage | `prefabs/ui/battle/WireBattlePage` | **未接** |

- **路径**：`client/assets/prefabs/ui/battle/BattlePage.prefab`、`client/assets/prefabs/ui/battle/WireBattlePage.prefab`
- **开关**：`client/assets/scripts/ui/BattlePage.ts` 的 `USE_BATTLE_PREFAB`，默认 `true`，和登录、主城壳一样。改成 `false` 再预览，真服进战回到 `WireMainlinePage` 里原来的代码 UI。代码 UI 不删。不改 `Boot.ts`，不改 `USE_CITY_CHROME_PREFAB`，不改 CityChrome / 通用 Prefab 的 `__type__`。
- **怎么打开**：预览加 `?transport=ws` 进真服主城，打开「更多」里的主线。页内仍用已经接好的按钮发 **3001**（挑战）、**3030**（切磋）或 **3102**（请求战报）。有 report 才进战斗表现，这时挂 BattlePage。**3006** 挂机战报本来就走同一套回放，所以也会看到这张壳。不新开 c2s。3103、3101、3099 仍不进这页。Mock 关卡页（`MainlinePage.ts`）仍是代码色块，不挂这张壳。
- **吃哪些已有数据**：`planWireSpineReplay` 的 slots / beats，外加同一份 report 上已经解开的命中和英雄。站位进 `Slot_E0`–`E2`、`Slot_A0`–`A2`（后排 `E3`–`E5`、`A3`–`A5` 留着壳上的占位）。血量写 `EnemyHp_*` / `AllyHp_*` 的 `Label`，两边都有数时才改 `Fill` 宽度；缺一边不写成 0，空着的三格血条保持 Prefab 里的 `120/120`、`100/100`。回合行写 `TopBar/RoundLabel`，同一行再写 `Log`。技能特效挂 `LayerVfx/VfxSkill`，受击挂 `LayerVfx/VfxHit`，无锚点时就停在文档里的 (0, 180) / (0, 120)。`VfxScreen` 保持空挂点，现有拍没有全屏角色。技能条 `Label` 在有技能拍时写成 batch2 的 stem；填充保持 Prefab 占位，因为 3001 / 3030 / 3102 不带技能槽能量。战剑、战旗没有对应槽，挂在 `LayerField` 上，坐标仍是原来的代码回放。飘字写 `LayerFloat/FloatDamageRoot/FloatDmg_0`–`FloatDmg_3`，暴击写 `LayerFloat/FloatCrit`，技能名写 `SkillNameBanner/SkillNameLabel`，前排头顶写 `HeadAnchor/LevelLabel` 和 `HeadAnchor/BuffRow`。`hurt` 缺失不画，不写成 0。`crit`、`level`、`buffs` 只有报告上已经带了才显示；没有就藏起，不写成 0，也不把 `marks` 里的号猜成暴击、等级或 buff。不另建同名代码节点。
- **按钮**：`BtnSkip` 跳过本地回放。`BtnRetreat` 同样只结束本地回放，不发 3002 / 3005 / 3020 / 3100 / 3098。`BtnClose` 关掉主线页，不发新帧。
- **WireBattlePage**：没有站位和特效挂点。探针按钮仍在原来的真服主线页上，所以这张占位不挂。
- **状态**：不改协议脚本，不删代码 UI。加载失败时 Toast「战斗 Prefab 未加载，改用代码 UI」，同一页继续播。
- 设计基准 **720×1280**，坐标相对父节点中心。`LayerField`、`LayerVfx`、`LayerHud`、`LayerFloat`、`EnemySlots`、`AllySlots`、`HpBars`、`SkillBars` 都是铺满页面的 (0, 0) 容器，所以它们的直接子节点就是页面坐标。`TopBar` 例外，它自己在页面上，子节点是它的本地坐标。`SkillNameBanner`、`FloatDamageRoot`、`HeadAnchor`、`BuffRow` 也不是铺满容器，子节点用它们自己的本地坐标。
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
| `BannerBg` | 同上 `win-bg_msg-bg.png` | 简单，`(28, 16, 48, 210)` |
| `FloatCrit` 底、`Buff_*` | 同上站位 `win-bg_block-bg-5.png` | 简单。暴击底 `(196, 78, 24, 230)`。buff 绿 `(88, 214, 120, 230)`、紫 `(176, 104, 255, 230)`、金 `(255, 196, 72, 230)` |
| `BtnSkip` / `BtnBack` | `ui/common/button_btn-blue-big-1.png`（按下 `button_btn-blue-big-2`） | 九宫格，不染色 |
| `BtnRetreat` | `ui/common/button_btn-orange-big-1.png`（按下 `button_btn-orange-big-2`） | 九宫格，不染色 |
| `BtnClose` | `ui/common/button_btn-close-1.png` | 简单，裁切 **53×56**，不染色。没有按下图，缩放过渡，没有 Label |
| 字 | `font/FZCSJW-GB1-0.ttf` | 与其他页相同 |

没有 `BtnSpeed`：加速图不在仓里，不拿别的钮冒充。`map-bg-super-stage` 和 `map-bg-dungeon-1` 都在，但主线 `map-bg-mission-1` 更靠前，所以没用它们。这不是「待换真底」的色块；等 `ui/battle/battle-scene_spr-bg-1` 入库后，再生脚本会改选那张战斗场景底。

按钮是 `cc.Sprite` + `cc.Button`（缩放，`zoomScale` 1.05，`clickEvents` 为空）。文案在子节点 `Label`。`BtnClose` 没有 `Label`。

## BattlePage

根 `BattlePage`。绘制顺序：`Bg`、`LayerField`、`LayerVfx`、`SkillNameBanner`、`LayerHud`、`LayerFloat`。HUD 盖在战场和技能名上面，飘字层再盖在 HUD 上面。飘字和技能名都在场中，不压顶栏和底栏。

前排三个站位对齐当前代码战斗的 `slotXY`：敌方 y=300、我方 y=20，x 为 -200 / 0 / 200（三人横排）。后排是多出来的 3 个挂点，给以后六人阵用。`VfxSkill` / `VfxHit` 的默认点对齐 `anchorXY` 在没有锚点时的回退：技能 (0, 180)，受击 (0, 120)。代码里的跳过钮在 y=-280，那一档会压住这张壳的下半场，所以 `BtnSkip` / `BtnRetreat` 放在底栏。接线时由客户端决定要不要挪。

血条预览数字跟 Mock 战报的敌 120、我 100 一致，只是编辑器里能看见的占位。

### 战场

| 节点 | 位置 (x, y) | 尺寸 | 说明 |
|------|-------------|------|------|
| `Bg` | (0, 0) | 720×1280 | 主线 `map-bg-mission-1` |
| `LayerField` | (0, 0) | 720×1280 | 容器 |
| `EnemySlots` | (0, 0) | 720×1280 | 容器 |
| `Slot_E0` `Slot_E1` `Slot_E2` | (-200 / 0 / 200, 300) | 108×120 | 敌前排。子节点 `Placeholder`、`Label`（`E0`…）、`HeadAnchor` |
| `Slot_E3` `Slot_E4` `Slot_E5` | (-200 / 0 / 200, 448) | 108×120 | 敌后排 |
| `AllySlots` | (0, 0) | 720×1280 | 容器 |
| `Slot_A0` `Slot_A1` `Slot_A2` | (-200 / 0 / 200, 20) | 108×120 | 我前排。`Label` 为 `A0`…，另有 `HeadAnchor` |
| `Slot_A3` `Slot_A4` `Slot_A5` | (-200 / 0 / 200, -180) | 108×120 | 我后排 |

`Placeholder` 和 `Label` 都在槽的 (0, 0)。`Label` 96×36，字号 22，白字描边。前排 `Slot_E0`–`E2`、`Slot_A0`–`A2` 在这两个子节点后面再挂 `HeadAnchor`。后排没有。

### 特效挂点

都在 `LayerVfx` 下，空节点，没有子节点，也没有 Sprite。

| 节点 | 位置 (x, y) | 尺寸 |
|------|-------------|------|
| `VfxSkill` | (0, 180) | 48×48 |
| `VfxHit` | (0, 120) | 48×48 |
| `VfxScreen` | (0, 0) | 720×1280 |

`VfxScreen` 铺满是为了全屏特效有一个页面大小的父节点。它不挡按钮：节点上没有点击组件。

### 场内表现挂点

进战回放写这些节点，不改坐标，也不另建同名代码节点。缺字段就藏起，清掉编辑器占位（`-12345`、`圣光打击`、`Lv.1`、三色 buff），不写成 0。站位没有重排：敌前排仍在 y=300，我前排仍在 y=20。

`SkillNameBanner` 是根的直接子节点，水平居中，底边离敌前排槽底（y=240）8px。它和空的 `VfxSkill` 在竖直方向交一点；那个锚点没有图。`LayerFloat` 的四条伤害可以互相叠，不和槽、血条、技能名、暴击标抢 8px 空隙。`FloatCrit` 在飘字左侧。

```
BattlePage
  SkillNameBanner
    BannerBg
    SkillNameLabel
  LayerFloat
    FloatDamageRoot
      FloatDmg_0 … FloatDmg_3
    FloatCrit
Slot_E0–E2 / Slot_A0–A2
  HeadAnchor
    LevelLabel
    BuffRow
      Buff_0  Buff_1  Buff_2
```

后排 `Slot_E3`–`E5`、`Slot_A3`–`A5` 没有 `HeadAnchor`。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `SkillNameBanner` | (0, 214) | 248×36 | 容器 |
| `SkillNameBanner/BannerBg` | (0, 0) | 248×36 | 无字。`win-bg_msg-bg` 紫灰染色 |
| `SkillNameBanner/SkillNameLabel` | (0, 0) | 224×30 | `圣光打击`，字号 20，浅金描边 |
| `LayerFloat` | (0, 0) | 720×1280 | 容器，只有 `cc.UITransform` |
| `LayerFloat/FloatDamageRoot` | (0, 140) | 260×110 | 容器，只有 `cc.UITransform` |
| `FloatDmg_0` | (0, 28) | 220×36 | `-12345`，字号 34，橙，框不够时缩小字号 |
| `FloatDmg_1` | (16, -8) | 220×40 | `-439057`，字号 32，青 |
| `FloatDmg_2` | (-12, -32) | 180×32 | `-40604`，字号 26，青 |
| `FloatDmg_3` | (6, 0) | 190×34 | `-41418`，字号 26，青 |
| `LayerFloat/FloatCrit` | (-176, 170) | 84×36 | `暴击`，字号 20。节点自己带染色底和 Label |

`FloatDmg_*` 的坐标相对 `FloatDamageRoot`。`FloatCrit` 的父节点铺满页面，所以那一行是页面坐标。四条飘字的页面 y 分别是 168、132、108、140。

前排头顶。`HeadAnchor` 是槽的本地坐标，六个前排槽各一份，后排不挂。槽高 120，本地顶在 y=60，挂点中心 y=48、高 22，还在槽盒子里，贴着上沿。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `HeadAnchor` | (0, 48) | 104×22 | 容器 |
| `HeadAnchor/LevelLabel` | (-30, 0) | 40×18 | `Lv.1`，字号 12，浅金描边 |
| `HeadAnchor/BuffRow` | (22, 0) | 48×14 | 容器 |
| `Buff_0` `Buff_1` `Buff_2` | (-16 / 0 / 16, 0) | 12×12 | 无字。`block-bg-5` 染成绿、紫、金 |

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

场内挂点怎么填，仍走 **3001 / 3030 / 3102 / 3006** 的 `planWireSpineReplay`，不新开 c2s。

- **大数字**：行动拍上每条命中的 `hurt`，按顺序写 `FloatDmg_0`–`FloatDmg_3`。`hurt` 缺失不占一条，不写成 0。出现的 0 仍写 `0`。超过四条不另建节点。不用到的格子藏起，并清掉 `-12345` 这类占位。
- **「暴击」**：这四条里有一条命中的 `crit` 为 true 或非 0 数字时，打开 `FloatCrit`，文案保持 `暴击`。没有这个字段不打开，也不把 `marks` 的某个号猜成暴击。`crit` 为 0 或 false 同样不打开。
- **技能名**：这一拍 `skill_id` 有值才打开 `SkillNameBanner`。名字用 `wireSpineSkillStem` 的现成 stem。表对不上就写 `技能 ` 加 id，不编造技能名，也不留 `圣光打击`。没有 `skill_id` 就关掉条。底栏 `SkillBar_*` 仍是原来的能量占位。
- **头顶等级 / buff**：只写前排、而且是报告里真正带上的英雄（每人最多前三个，不含补位）。`level` 缺失就藏起 `LevelLabel` 并清掉 `Lv.1`，不写 0。出现的 0 仍写 `Lv.0`。`buffs` 缺失或为空就藏起 `BuffRow`，不把三颗染色块当成 buff。有 id 时按顺序亮 `Buff_0`–`Buff_2`，多出来的不另建，不编 buff 名。后排没有 `HeadAnchor`，不补。

## WireBattlePage

根 `WireBattlePage`。没有站位，没有 VFX。`#159` 已经把 c2s 3101 阵容探针合进 main，所以状态句不再写「等 Client 3101」。这页仍然不接线。

| 节点 | 位置 (x, y) | 尺寸 | 默认文案 |
|------|-------------|------|----------|
| `Bg` | (0, 0) | 720×1280 | 与 BattlePage 同一张主线底 |
| `Title` | (0, 260) | 680×52 | `战斗（真服接线占位）`，字号 36 |
| `Status` | (0, 170) | 640×38 | `未同步 · 等切 Prefab`，字号 22 |
| `FieldHint` | (0, 40) | 640×112 | 站位与特效挂点见 BattlePage，并带一句 `LayerFloat`、`SkillNameBanner`、`HeadAnchor`。顶对齐，可换行，字号 20 |
| `BtnBack` | (0, -160) | 240×48 | `返回` |
