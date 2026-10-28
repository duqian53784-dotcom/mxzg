import { Layers, Node, UITransform } from "cc";
import { GameLog } from "../core/GameLog";
import { PageStack } from "./PageStack";
import { PopupQueue } from "./PopupQueue";
import { bindSafeArea, SafeAreaBinding } from "./SafeArea";
import { StackView } from "./StackView";
import { Toast } from "./Toast";
import { uiNode } from "./UiKit";
import { markPageShown } from "./uiOpenLog";

/**
 * 挂在同一个 Canvas 上的四层：Page / Chrome / Popup / Toast。
 * 场景里不用摆节点，MainApp 调 mount 即可。
 * Page / Chrome / Toast 会按安全区平移并在必要时缩小；弹窗层只平移，遮罩仍盖住画面。
 * Chrome 不进页面栈，顶栏和底栏在打开面板时仍留在上面。
 */
export class UIShell {
  readonly pages = new PageStack();
  readonly popups = new PopupQueue();
  readonly pageLayer: Node;
  readonly chromeLayer: Node;
  readonly popupLayer: Node;
  readonly toastLayer: Node;
  readonly toast: Toast;

  private safeBinding: SafeAreaBinding | null = null;

  private constructor(canvas: Node) {
    this.pageLayer = this.makeLayer(canvas, "LayerPage");
    this.chromeLayer = this.makeLayer(canvas, "LayerChrome");
    this.popupLayer = this.makeLayer(canvas, "LayerPopup");
    this.toastLayer = this.makeLayer(canvas, "LayerToast");
    this.toast = new Toast(this.toastLayer);
    this.safeBinding = bindSafeArea({
      canvas,
      targets: [
        { node: this.pageLayer },
        { node: this.chromeLayer },
        { node: this.popupLayer, scale: false },
        { node: this.toastLayer },
      ],
    });
  }

  static mount(canvas: Node): UIShell {
    return new UIShell(canvas);
  }

  openPage(name: string, node: Node): void {
    this.attach(this.pageLayer, node);
    this.pages.open(name, toView(node));
    markPageShown(name);
  }

  closePage(): string | null {
    const name = this.pages.close();
    if (name) GameLog.shared.info("UIShell", "关闭界面 " + name);
    return name;
  }

  enqueuePopup(name: string, node: Node): void {
    this.attach(this.popupLayer, node);
    this.popups.enqueue(name, toView(node));
    GameLog.shared.info("UIShell", "打开弹窗 " + name + " pending=" + this.popups.pending);
  }

  closePopup(): string | null {
    const name = this.popups.closeCurrent();
    if (name) GameLog.shared.info("UIShell", "关闭弹窗 " + name);
    return name;
  }

  showToast(text: string, durationMs?: number): void {
    this.toast.show(text, durationMs);
  }

  dispose(): void {
    if (!this.safeBinding) return;
    this.safeBinding.dispose();
    this.safeBinding = null;
  }

  private makeLayer(canvas: Node, name: string): Node {
    const node = uiNode(name);
    const ui = node.addComponent(UITransform);
    ui.setContentSize(2000, 2000);
    node.parent = canvas;
    return node;
  }

  private attach(layer: Node, node: Node): void {
    node.layer = Layers.Enum.UI_2D;
    node.active = false;
    node.parent = layer;
  }
}

function toView(node: Node): StackView {
  return {
    setVisible(visible: boolean) {
      node.active = visible;
    },
    dispose() {
      if (node.isValid) node.destroy();
    },
  };
}
