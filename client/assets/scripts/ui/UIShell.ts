import { Layers, Node, UITransform } from "cc";
import { PageStack } from "./PageStack";
import { PopupQueue } from "./PopupQueue";
import { StackView } from "./StackView";
import { Toast } from "./Toast";
import { uiNode } from "./UiKit";

/**
 * 挂在同一个 Canvas 上的三层：Page / Popup / Toast。
 * 场景里不用摆节点，MainApp 调 mount 即可。
 */
export class UIShell {
  readonly pages = new PageStack();
  readonly popups = new PopupQueue();
  readonly pageLayer: Node;
  readonly popupLayer: Node;
  readonly toastLayer: Node;
  readonly toast: Toast;

  private constructor(canvas: Node) {
    this.pageLayer = this.makeLayer(canvas, "LayerPage");
    this.popupLayer = this.makeLayer(canvas, "LayerPopup");
    this.toastLayer = this.makeLayer(canvas, "LayerToast");
    this.toast = new Toast(this.toastLayer);
  }

  static mount(canvas: Node): UIShell {
    return new UIShell(canvas);
  }

  openPage(name: string, node: Node): void {
    this.attach(this.pageLayer, node);
    console.log("[UI] open page=" + name);
    this.pages.open(name, toView(node));
  }

  closePage(): string | null {
    const name = this.pages.close();
    if (name) console.log("[UI] close page=" + name);
    return name;
  }

  enqueuePopup(name: string, node: Node): void {
    this.attach(this.popupLayer, node);
    this.popups.enqueue(name, toView(node));
    console.log("[UI] enqueue popup=" + name + " pending=" + this.popups.pending);
  }

  closePopup(): string | null {
    const name = this.popups.closeCurrent();
    if (name) console.log("[UI] close popup=" + name);
    return name;
  }

  showToast(text: string, durationMs?: number): void {
    this.toast.show(text, durationMs);
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
