# 场景

Boot / Main / Battle 已在 Creator 里建好。启动场景应为 Boot。

脚本不会写进 `.scene`。预览前把 **Boot** 挂到 Boot 场景的 **Canvas** 上，步骤见 `assets/scripts/README.md`。

Canvas 上已有四边对齐的 Widget。安全区由代码处理，不要再挂引擎自带的 SafeArea 组件。见 `docs/safe-area.md`。

构建发布前，场景列表包含 Boot 与 Main（Battle 可先不进包）。Web Mobile 构建仍可后补。