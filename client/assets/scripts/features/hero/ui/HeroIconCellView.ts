import { _decorator, Button, Component, Label, Node, Sprite } from "cc";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
import { HERO_FACE_FALLBACK, HeroCellModel } from "../../../module/hero/heroList";

const { ccclass, property } = _decorator;

const ELEM_SPRITE = "ui/hero/hero-icon_elem-";

/**
 * HeroIconCell 上的一格。脸、名字、元素、星、等级、锁和出战标都绑在预制上。
 */
@ccclass("HeroIconCellView")
export class HeroIconCellView extends Component {
  @property(Node)
  face: Node | null = null;

  @property(Label)
  nameLabel: Label | null = null;

  @property(Node)
  elem: Node | null = null;

  @property([Node])
  stars: Node[] = [];

  @property(Label)
  levelLabel: Label | null = null;

  @property(Node)
  lock: Node | null = null;

  @property(Node)
  battle: Node | null = null;

  @property(Label)
  mark: Label | null = null;

  private tapped = false;

  show(cell: HeroCellModel, onTap: (() => void) | null): void {
    const empty = cell.kind === "empty";
    this.paintFace(cell, empty);
    this.paintName(cell, empty);
    this.paintElem(cell, empty);
    this.paintStars(empty ? 0 : cell.stars);
    this.paintLevel(empty ? null : cell.level);
    if (this.lock) this.lock.active = !empty && cell.locked;
    if (this.battle) this.battle.active = !empty && cell.deployed && !cell.locked;
    if (this.mark) this.mark.node.active = false;
    if (!onTap || empty || this.tapped) return;
    this.tapped = true;
    if (!this.node.getComponent(Button)) this.node.addComponent(Button);
    this.node.on(Button.EventType.CLICK, onTap);
  }

  private paintFace(cell: HeroCellModel, empty: boolean): void {
    if (!this.face) return;
    const image = this.face.getComponent(Sprite);
    if (image) image.grayscale = !empty && cell.locked;
    if (empty || !cell.face) {
      this.face.active = false;
      return;
    }
    this.face.active = true;
    paintSpritePaths(this.face, [cell.face, HERO_FACE_FALLBACK]);
  }

  private paintName(cell: HeroCellModel, empty: boolean): void {
    if (!this.nameLabel) return;
    const show = !empty && cell.showName && cell.name.length > 0;
    this.nameLabel.node.active = show;
    this.nameLabel.string = show ? cell.name : "";
  }

  private paintElem(cell: HeroCellModel, empty: boolean): void {
    if (!this.elem) return;
    const show = !empty && cell.elem !== null;
    this.elem.active = show;
    if (show && cell.elem !== null) paintSpritePaths(this.elem, [ELEM_SPRITE + cell.elem]);
  }

  private paintStars(count: number): void {
    const n = count > 5 ? 5 : count < 0 ? 0 : count;
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      if (!star) continue;
      star.active = i < n;
      if (i < n) star.setPosition((i - (n - 1) / 2) * 15, -40, 0);
    }
  }

  private paintLevel(level: number | null): void {
    if (!this.levelLabel) return;
    const show = level !== null;
    this.levelLabel.node.active = show;
    this.levelLabel.string = show ? String(level) : "";
  }
}
