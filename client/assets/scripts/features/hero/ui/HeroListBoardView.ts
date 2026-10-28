import { _decorator, Button, Component, director, Director, Graphics, Label, Mask, Node, ScrollView, UITransform } from "cc";
import { GameLog } from "../../../core/GameLog";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
import { assignContentSize, positiveUiSize } from "../../../ui/visibleFit";

const { ccclass, property } = _decorator;

const ELEM_SPRITE = "ui/hero/hero-icon_elem-";
/** 四行格子。原点 -52，行距 112，第四行底边约在 440。再留一点，避免切到星。 */
const PORT_MIN_H = 448;

/**
 * HeroListHeroLayer。羊皮纸、滚动、元素筛选和空间字绑在这一层上。
 * 不从根往下搜。格子由 HeroListView 填进 content。
 */
@ccclass("HeroListBoardView")
export class HeroListBoardView extends Component {
  @property(Node)
  sprBox: Node | null = null;

  @property(Node)
  heroScroll: Node | null = null;

  @property(Node)
  heroPort: Node | null = null;

  @property(Node)
  heroContent: Node | null = null;

  @property(Label)
  emptyLabel: Label | null = null;

  @property(Label)
  capacityLabel: Label | null = null;

  @property([Button])
  elemButtons: Button[] = [];

  @property(Node)
  elemRow: Node | null = null;

  @property(Node)
  hitMenu: Node | null = null;

  @property(Node)
  skin: Node | null = null;

  @property(Node)
  evolve: Node | null = null;

  private elemBound = false;

  get content(): Node | null {
    return this.heroContent;
  }

  /**
   * 进场景前卸掉宿主遮罩。onLoad 会装一块空模板，格子会被裁到看不见。
   * content 仍等进了场景再收进 view。
   */
  dropHostMask(): void {
    const scroll = this.heroScroll;
    if (!scroll) return;
    const hostMask = scroll.getComponent(Mask);
    if (hostMask) scroll.removeComponent(hostMask);
  }

  prepare(): boolean {
    const scroll = this.heroScroll;
    const port = this.heroPort;
    const content = this.heroContent;
    if (!scroll || !port || !content) {
      GameLog.shared.warn("Hero", "HeroListHeroLayer 的 spr_box 下没有 HeroScroll");
      return false;
    }
    if (!this.node.activeInHierarchy) return false;
    this.dropHostMask();
    this.fitFourRows();
    if (content.parent !== port) content.parent = port;
    content.setPosition(0, 0, 0);
    const scrollUi = scroll.getComponent(UITransform);
    const scrollSize = positiveUiSize(scrollUi);
    const width = scrollSize && scrollSize.width > 0 ? scrollSize.width : 540;
    const height = scrollSize && scrollSize.height > 0 ? scrollSize.height : 320;
    assignContentSize(scrollUi, width, height);
    const viewUi = port.getComponent(UITransform);
    const viewSize = positiveUiSize(viewUi);
    assignContentSize(viewUi, viewSize && viewSize.width > 0 ? viewSize.width : width, height);
    this.armMask(port);
    const scroller = scroll.getComponent(ScrollView);
    if (!scroller) GameLog.shared.warn("Hero", "HeroScroll 没有 ScrollView");
    else if (scroller.content !== content) scroller.content = content;
    this.silenceHit();
    return true;
  }

  bindElem(pick: (id: number) => void): void {
    if (this.elemBound) return;
    this.elemBound = true;
    if (this.elemRow && this.elemRow.parent) {
      this.elemRow.active = true;
      this.elemRow.setSiblingIndex(this.elemRow.parent.children.length - 1);
    } else {
      GameLog.shared.warn("Hero", "HeroListHeroLayer 没有 node_elem");
    }
    if (this.elemButtons.length < 6) {
      GameLog.shared.warn("Hero", "HeroListHeroLayer 的元素钮没有绑全");
    }
    for (let i = 0; i < this.elemButtons.length; i++) {
      const button = this.elemButtons[i];
      if (!button || !button.node) continue;
      const id = i;
      button.node.active = true;
      button.transition = Button.Transition.NONE;
      button.interactable = true;
      paintSpritePaths(button.node, [ELEM_SPRITE + id]);
      button.node.on(Button.EventType.CLICK, () => pick(id));
    }
  }

  markElem(elem: number): void {
    for (let i = 0; i < this.elemButtons.length; i++) {
      const button = this.elemButtons[i];
      if (!button || !button.node) continue;
      button.transition = Button.Transition.NONE;
      const scale = i === elem ? 1 : 0.8;
      button.node.setScale(scale, scale, 1);
    }
  }

  /** 英雄页露出永久皮肤。图鉴露出进化。两颗不叠在一起。 */
  setCorner(tab: "hero" | "book"): void {
    if (this.skin) this.skin.active = tab === "hero";
    if (this.evolve) this.evolve.active = tab === "book";
    if (this.elemRow) this.elemRow.active = true;
  }

  setCapacity(text: string): void {
    if (!this.capacityLabel) return;
    this.capacityLabel.node.active = true;
    this.capacityLabel.string = text;
  }

  setEmpty(text: string): void {
    if (!this.emptyLabel) return;
    const show = text.length > 0;
    this.emptyLabel.node.active = show;
    this.emptyLabel.string = show ? text : "";
  }

  /**
   * 日服羊皮纸里至少露出 4 行，多的再滚。
   * CCBI 视口高 320，大约只剩 3 行。这里把视口抬到 448，羊皮纸向下长出同样的高度。
   * 锚点在顶上，上沿和元素钮不动。空间字和进化钮跟着下沿走，避免被纸盖住。
   */
  private fitFourRows(): void {
    const scroll = this.heroScroll;
    const scrollUi = scroll ? scroll.getComponent(UITransform) : null;
    const scrollSize = positiveUiSize(scrollUi);
    const height = scrollSize && scrollSize.height > 0 ? scrollSize.height : 0;
    if (!scrollUi || height >= PORT_MIN_H - 1) return;
    const extra = PORT_MIN_H - height;
    const width = scrollSize && scrollSize.width > 0 ? scrollSize.width : 540;
    assignContentSize(scrollUi, width, PORT_MIN_H);
    const portUi = this.heroPort ? this.heroPort.getComponent(UITransform) : null;
    assignContentSize(portUi, width, PORT_MIN_H);
    const boxUi = this.sprBox ? this.sprBox.getComponent(UITransform) : null;
    const boxSize = positiveUiSize(boxUi);
    if (boxUi && boxSize) assignContentSize(boxUi, boxSize.width, boxSize.height + extra);
    const capHost = this.capacityLabel && this.capacityLabel.node ? this.capacityLabel.node.parent : null;
    if (capHost && capHost !== this.node) this.nudgeDown(capHost, extra);
    const evolveHost = this.evolve ? this.evolve.parent : null;
    if (evolveHost && evolveHost !== this.node) this.nudgeDown(evolveHost, extra);
  }

  private nudgeDown(node: Node | null, extra: number): void {
    if (!node || extra === 0) return;
    node.setPosition(node.position.x, node.position.y - extra, node.position.z);
  }

  private silenceHit(): void {
    const menu = this.hitMenu;
    if (!menu) return;
    const ui = menu.getComponent(UITransform);
    const size = positiveUiSize(ui);
    if (!ui || !size || size.width < 500 || size.height < 500) return;
    ui.setContentSize(0, 0);
  }

  private armMask(node: Node): void {
    const draw = () => {
      if (!node.isValid) return false;
      let mask = node.getComponent(Mask);
      if (!mask) mask = node.addComponent(Mask);
      if (!node.activeInHierarchy) return false;
      const ui = node.getComponent(UITransform);
      const size = positiveUiSize(ui);
      if (!ui || !size) {
        mask.enabled = false;
        return false;
      }
      mask.enabled = true;
      if (mask.type !== Mask.Type.GRAPHICS_RECT) mask.type = Mask.Type.GRAPHICS_RECT;
      assignContentSize(ui, size.width, size.height);
      return !!node.getComponent(Graphics);
    };
    if (draw()) return;
    let frames = 0;
    const retry = () => {
      if (!node.isValid) {
        director.off(Director.EVENT_AFTER_UPDATE, retry);
        return;
      }
      frames += 1;
      const drawn = draw();
      if (drawn || frames > 45) {
        if (!drawn && node.isValid && !node.getComponent(Graphics)) {
          const mask = node.getComponent(Mask);
          if (mask) mask.enabled = false;
        }
        director.off(Director.EVENT_AFTER_UPDATE, retry);
      }
    };
    director.on(Director.EVENT_AFTER_UPDATE, retry);
    node.once(Node.EventType.NODE_DESTROYED, () => {
      director.off(Director.EVENT_AFTER_UPDATE, retry);
    });
  }
}
