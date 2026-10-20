# 场景

Boot / Main / Battle 已在 Creator 里建好。启动场景应为 Boot。

脚本不会写进 `.scene`。Canvas 上已经挂了 **Boot**，拉代码后直接预览，不用再挂组件。说明见 `assets/scripts/README.md`。

Canvas 上已有四边对齐的 Widget。安全区由代码处理，不要再挂引擎自带的 SafeArea 组件。见 `docs/safe-area.md`。

构建发布前，场景列表包含 Boot 与 Main（Battle 可先不进包）。Web Mobile 构建仍可后补。

C3 的战斗画面在主城页面里用代码生成，预览不用打开 Battle.scene，也不用把 Battle 挂进场景列表。

C4 的挂机页同样是代码生成的。预览不用新挂组件，也不用改场景。