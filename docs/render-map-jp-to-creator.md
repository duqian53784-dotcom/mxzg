# 日服 H5 → Creator 渲染映射（背包 / 羊皮纸列表）

状态：**待复验**。本文只记录根因和改法，不宣告 ACC-BAG-001～003 或 ACC-COM-001 通过。

对照：日服 H5 `https://mxzg-test.funsgamex.com/jp/`（只读，本分支不改日服仓）。  
被测：本仓 Cocos Creator 3.8.8，设计分辨率 **720×1280、Fit Height**。

## 设计宽

| | 日服 H5 | Creator |
| --- | --- | --- |
| 设计分辨率 | 640×1280，`FIXED_HEIGHT` | 720×1280，`fitHeight` |
| 整屏缩放 | `ex.s.global_scale = winW / 640` | 由分辨率策略承担，节点上不再乘这一层 |
| 背包 / 英雄 ccbi | 640×960，锚点左下，**窗本身不再乘** `(720-36)/640` | 同左。全屏店景、岩洞由 `PagePrefabShell` 底图单独铺满 |
| 羊皮纸九宫 | 按 ccbi 尺寸，不把整页拉到顶栏和底栏之间 | 同左。`listWindowSpread` 的 `scale` 固定为 1，`extraTop` / `extraBottom` 为 0 |

`LIST_WINDOW_TOP = 470`、`LIST_WINDOW_BOTTOM = -480`、`LIST_WINDOW_SIDE = 18` 只保留为顶栏 / 底栏设计带的记录。铺窗不再用它们改缩放或拉高九宫。

以前的公式 `scale = (720 - 18×2) / 640 = 1.06875` 就是 Inspector 里 `BackpackLayer`（以及同一条路径上的 `HeroListLayer`）的 **Scale 1.069**，位置约 `(-342, -513)`。日服背包只把全屏底图拉到 `winSize`，不把 640×960 的 ccbi 窗再整页放大。放大之后再把 `spr_bg` / `spr_box` 拉高约 200+75，羊皮纸中心被撑成大块空壳，店员节点也被顶上去。

改完后根节点应为 **scale 1**，底左角锚点落在 **(-320, -480)**（640×960 在 720×1280 壳里居中）。左右各约 40 设计像素露出店景或岩洞。

## 背包格子

空账号没有道具是预期，不是缺陷。空槽仍要画出来。

格子预制是 `BackpackItemCell`。空槽把 `spr_frame` 换成 `ui/common/other_spr-null`（深色菱格），不造第二套滚动壳。滚动节点仍是预制里的 `spr_box/BagScroll`。

预制原来把 `content` 和空的 `view` 并列，遮罩挂在 `BagScroll` 上。Creator 3.8 的 ScrollView 用 **content 的父节点** 当视口；宿主上的矩形遮罩在模板没画出来时会把子节点全部裁掉。运行时把 `content` 放进已有的 `view`，遮罩改画在 `view` 上，再按 `spr_box` 的高度留出 4 行空槽。不 `uiNode` 新的 `BagScroll`。

## 已知限制（不是本分支用代码补的画）

- 上半区店员是预制 `node_portrait` 上的 spine `shangcheng`，对白是 `lbl_talk`（language 5788）。立绘缺了要在 Creator 里补资源或预制，不在代码里画人。
- 外框是预制九宫 `win-bg_win-bg-11`，内底是 `spr_box` 的 `win-bg_block-bg-5`。`ParchmentPlate` 是铺在 `spr_bg` 后面的奶油色垫，九宫画出来就盖住它。九宫角花若和日服仍不一致，是预制美术，要在 Creator 里改，不用代码画框。
- 底栏最右 VIP / 羁绊（ACC-COM-002）本分支不动。

## 复验

Creator 预览真桥进背包（不要用 mock）。看 `BackpackLayer` 的 Scale 是否为 1，中央是否有 4 列空槽菱格，外框是否还是被拉高的空壳。英雄列表走同一条 `fitParchmentWindow`，Scale 也应为 1，羊皮纸不再被拉高。本环境没有 Creator，不能代替这次复验。
