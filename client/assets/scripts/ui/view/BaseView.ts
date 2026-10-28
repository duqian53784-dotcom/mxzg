import { _decorator, Component } from "cc";
import { requestViewClose } from "./viewClose";

const { ccclass } = _decorator;

/**
 * 正式界面的基类。节点引用用子类上的 @property，不在这里搜整棵树。
 * 打开和关闭走 UIManager，好跟现有页面栈接在一起。
 */
@ccclass("BaseView")
export class BaseView<TArgs = unknown> extends Component {
  protected args: TArgs | undefined;
  private ready: Promise<void> | null = null;
  private resolveReady: (() => void) | null = null;

  /** UIManager 在 Prefab 挂进层之后调用。子类开始刷数据。 */
  onOpen(args?: TArgs): void {
    this.args = args;
  }

  /** 页面被关掉时调用。退订放这里，重复调用要安全。 */
  onClose(): void {}

  /** 关掉自己这一页。不是最上面一层时 UIManager 不会拆下面的页。 */
  close(): void {
    requestViewClose(this);
  }

  whenReady(): Promise<void> {
    return this.ready || Promise.resolve();
  }

  /** 第一次异步开页之前调用，让 open() 能等到格子挂上。 */
  protected beginOpen(): void {
    if (this.ready) return;
    this.ready = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
  }

  protected finishOpen(): void {
    const resolve = this.resolveReady;
    this.resolveReady = null;
    if (resolve) resolve();
  }
}
