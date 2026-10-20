# 多分辨率与安全区（B8）

设计分辨率是 **720×1280**（竖屏），已经写在 `client/settings/v2/packages/project.json`，Boot / Main / Battle 的 Canvas 也是这个尺寸。代码不把它改成横屏，也不调用 `view.setDesignResolutionSize`。

项目设置里的适配宽度 / 适配高度（Fit Width / Fit Height）继续由 Creator 决定。`scripts/ui/SafeArea.ts` 只读引擎算完的可见区域和 `sys.getSafeAreaRect()`，再把 UI 放进安全区：

- 边距不对称时，内容中心移到安全区中心，避免刘海和底部横条压住按钮、Toast。
- 安全区比 720×1280 小时，Boot 的 `SafeFrame`、主城 Page / Toast **只缩小、不放大**。可见区域更大时保持设计尺寸，多出来的是空白。
- 弹窗层只平移，不缩放，遮罩仍盖住画面。

竖屏 H5 建议在项目设置里勾选适配宽度、不勾适配高度。若已经勾了别的，不用为了这段代码改回来。

## 倩不用改场景

Canvas 上已经有四边对齐的 Widget。不要再挂引擎自带的 SafeArea 组件，会和这里抢边距。Boot、MainApp 会在 `start` 时自己适配，并监听窗口变化。

## 桌面上看刘海

浏览器预览通常四边都是 0。控制台执行：

```js
localStorage.setItem("mxzg.safe", "88,0,34,0")
```

顺序是上、右、下、左，单位是设计分辨率像素。然后拖一下窗口（或刷新）。左上角在 `GameLog` 的 `minLevel` 为 `debug`（默认）时会显示一行，例如 `720x1280 L0 T88 R0 B34 x0.90`。控制台 `[mxzg][debug][SafeArea]` 会多写设计分辨率，例如 `visible 720x1280 design 720x1280 L0 R0 T88 B34 scale 0.90`。

去掉预览边距：`localStorage.removeItem("mxzg.safe")`。预览地址加 `?safe=88,0,34,0` 同样有效，并且优先于 localStorage。把 `GameLog.shared.minLevel` 调到 `"info"` 会关掉左上角那一行，适配仍在。

真机刘海要页面带 `viewport-fit=cover`。Creator 3.8 的 Web Mobile 模板一般已经写了。若真机边距一直是 0，再查构建模板的 viewport。
