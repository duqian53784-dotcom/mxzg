import { _decorator, Component, Node, UITransform, view } from "cc";

const { ccclass, property } = _decorator;

/** Only viewport adaptation; artwork, hierarchy and design placement live in the Prefab. */
@ccclass("LoginArtwork")
export class LoginArtwork extends Component {
  @property(UITransform) backdrop: UITransform | null = null;
  @property(Node) cast: Node | null = null;
  @property(Node) controls: Node | null = null;
  @property(Node) developerTools: Node | null = null;

  onEnable(): void {
    view.on("canvas-resize", this.fit, this);
    this.fit();
  }
  onDisable(): void { view.off("canvas-resize", this.fit, this); }

  private fit(): void {
    const { width, height } = view.getVisibleSize();
    if (!(width > 0 && height > 0)) return;
    // Same cover rule and width-based character scale as the Japanese LogoScene.
    const cover = Math.max(width / 768, height / 1300);
    this.backdrop?.setContentSize(768 * cover, 1300 * cover);
    this.cast?.setScale(width / 770, width / 770, 1);
    this.cast?.setPosition(0, height * 0.05, 0);
    const scale = Math.min(1, width / 640);
    this.controls?.setScale(scale, scale, 1);
    this.controls?.setPosition(0, -height / 2, 0);
    this.developerTools?.setScale(scale, scale, 1);
    this.developerTools?.setPosition(0, height / 2 - 36 * scale, 0);
  }
}
