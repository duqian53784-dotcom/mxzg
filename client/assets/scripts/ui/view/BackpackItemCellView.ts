import { _decorator, Button, Component, Label, Node } from "cc";
import { StoreBagItem } from "../../core/GameStore";
import { itemIconResource, itemProfile } from "../../config/gameCatalog";
import { paintSpritePaths } from "./spritePaint";

const { ccclass, property } = _decorator;

/**
 * BackpackItemCell 上的格子。框、图标、数量、选中都是预制里绑好的。
 */
@ccclass("BackpackItemCellView")
export class BackpackItemCellView extends Component {
  @property(Node)
  frame: Node | null = null;

  @property(Node)
  icon: Node | null = null;

  @property(Label)
  count: Label | null = null;

  @property(Node)
  selectMark: Node | null = null;

  show(item: StoreBagItem | null, selected: boolean, onTap: (() => void) | null): void {
    if (this.selectMark) this.selectMark.active = selected;
    if (!item) {
      if (this.frame) {
        this.frame.active = true;
        paintSpritePaths(this.frame, ["ui/common/other_spr-null"]);
      }
      if (this.icon) this.icon.active = false;
      if (this.count) {
        this.count.node.active = false;
        this.count.string = "";
      }
    } else {
      const profile = itemProfile(item.itemType, item.itemId);
      if (this.frame) paintSpritePaths(this.frame, [rareFrame(profile ? profile.rare : 0)]);
      if (this.icon) {
        this.icon.active = true;
        const path = itemIconResource(item.itemType, item.itemId);
        if (path) paintSpritePaths(this.icon, [path, "ui/bag/backpack_spr-default"]);
        else if (item.itemId) paintSpritePaths(this.icon, ["ui/bag/backpack_" + item.itemId, "ui/bag/backpack_spr-default"]);
        else paintSpritePaths(this.icon, ["ui/bag/backpack_spr-default"]);
      }
      if (this.count) {
        const text = item.num === null ? "" : String(item.num);
        this.count.string = text;
        this.count.node.active = text.length > 0;
      }
    }
    if (!onTap) return;
    if (!this.node.getComponent(Button)) this.node.addComponent(Button);
    this.node.on(Button.EventType.CLICK, onTap);
  }
}

function rareFrame(rare: number): string {
  if (rare === 2 || rare === 3 || rare === 4) return "ui/bag/backpack_spr-rare-" + rare;
  return "ui/bag/backpack_item-frame-1";
}
