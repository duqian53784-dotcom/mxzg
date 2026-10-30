import { _decorator, Button, Component, Label, Node, Sprite } from "cc";
import { StoreBagItem } from "../../../core/GameStore";
import { itemIconResource, itemProfile } from "../../../config/gameCatalog";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
import type { BagFace } from "../../../module/bag/bagBoard";

const { ccclass, property } = _decorator;

/**
 * BackpackItemCell 上的格子。框、图标、数量、选中都是预制里绑好的。
 */
@ccclass("BackpackItemCellView")
export class BackpackItemCellView extends Component {
  @property(Button)
  button: Button | null = null;
  @property(Node)
  frame: Node | null = null;

  @property(Node)
  icon: Node | null = null;

  @property(Label)
  count: Label | null = null;

  @property(Node)
  selectMark: Node | null = null;

  private tap: (() => void) | null = null;
  private revision = 0;

  validateBindings(): void {
    for (const [field, value] of Object.entries({button:this.button,frame:this.frame,icon:this.icon,count:this.count,selectMark:this.selectMark})) {
      if (!value) throw new Error("BackpackItemCell.prefab [" + this.node.name + "]: 缺失绑定 " + field);
    }
    if (!this.frame!.getComponent(Sprite) || !this.icon!.getComponent(Sprite))
      throw new Error("BackpackItemCell.prefab [" + this.node.name + "]: frame/icon 缺少 Sprite");
  }

  show(item: StoreBagItem | null, selected: boolean, onTap: (() => void) | null, face?: BagFace): void {
    this.validateBindings();
    const revision = ++this.revision;
    const current = () => this.isValid && this.revision === revision;
    if (this.tap) this.node.off(Button.EventType.CLICK, this.tap);
    this.tap = onTap;
    this.button!.interactable = !!onTap;
    if (onTap) this.node.on(Button.EventType.CLICK, onTap);
    if (this.selectMark) this.selectMark.active = selected;
    if (!item) {
      if (this.frame) {
        this.frame.active = true;
        paintSpritePaths(this.frame, [SLOT_PLATE], current);
      }
      if (this.icon) this.icon.active = false;
      if (this.count) {
        this.count.node.active = false;
        this.count.string = "";
      }
    } else {
      const profile = face ? null : itemProfile(item.itemType, item.itemId);
      if (this.frame) paintSpritePaths(this.frame, [face?.frame || rareFrame(profile ? profile.rare : 0)], current);
      if (this.icon) {
        this.icon.active = true;
        this.icon.getComponent(Sprite)!.spriteFrame = null;
        const path = face?.icon || itemIconResource(item.itemType, item.itemId);
        if (path) paintSpritePaths(this.icon, [path, "ui/bag/backpack_spr-default"], current);
        else if (item.itemId) paintSpritePaths(this.icon, ["ui/bag/backpack_" + item.itemId, "ui/bag/backpack_spr-default"], current);
        else paintSpritePaths(this.icon, ["ui/bag/backpack_spr-default"], current);
      }
      if (this.count) {
        const text = item.num === null ? "" : String(item.num);
        this.count.string = text;
        this.count.node.active = text.length > 0;
      }
    }
  }

  onDestroy(): void {
    this.revision++;
    if (this.tap) this.node.off(Button.EventType.CLICK, this.tap);
    this.tap = null;
  }
}

/** 空槽和 0 稀有都用 common 的底图。稀有文字图和细金框不是格子底。 */
const SLOT_PLATE = "ui/common/other_rare-0";

function rareFrame(rare: number): string {
  let level = Math.floor(rare);
  if (level > 6) level = 6;
  if (level < 1) level = 0;
  return "ui/common/other_rare-" + level;
}
