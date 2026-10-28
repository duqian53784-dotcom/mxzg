/**
 * 和 UIShell 的页面层对齐。
 * Chrome 不进视图注册，顶栏底栏仍由主城壳挂着。
 */
export enum UILayer {
  Page = "page",
  Popup = "popup",
  Toast = "toast",
}
