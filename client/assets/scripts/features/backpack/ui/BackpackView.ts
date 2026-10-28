import { _decorator, Button, director, Director, Graphics, Label, Layers, Mask, Node, Prefab, ScrollView, UITransform } from "cc";
import { ConfigDb } from "../../../config/ConfigLoader";
import { BagTabKind } from "../../../config/gameCatalog";
import { messageOf } from "../../../core/errors";
import { GameLog } from "../../../core/GameLog";
import { GameStore, StoreBagItem } from "../../../core/GameStore";
import {
  BAG_MIN_ROWS,
  BAG_PITCH_Y,
  BAG_TABS,
  bagContentHeight,
  bagShopGreeting,
  bagSlotCount,
  bagSlotPosition,
  describeBagItem,
  rowsForBagTab,
  sameBagItem,
} from "../../../module/bag/bagBoard";
import { emptyBagToast } from "../../../module/bag/items";
import { WIRE_BAG_UNSYNCED_TOAST } from "../../../net/protocol/wireBag";
import { WireSession } from "../../../net/WireSession";
import { loadPrefab, spawnPrefab } from "../../../ui/prefabLoad";
import { mountNamedSpine } from "../../../ui/battleSpine";
import { assignContentSize, positiveUiSize } from "../../../ui/visibleFit";
import { BackpackItemCellView } from "./BackpackItemCellView";
import { BackpackTabButtonView } from "./BackpackTabButtonView";
import { BaseView } from "../../../framework/ui/BaseView";
import { mountBackpackPage, openBagInfo } from "./BackpackMount";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { view } from "../../../framework/ui/UIRegistry";

const { ccclass, property } = _decorator;

const BAG_CELL = "prefabs/ui/backpack/BackpackItemCell";
const BAG_TAB = "prefabs/ui/backpack/BackpackTabButton";
const BAG_INFO = "prefabs/ui/backpack/BackpackInfoLayer";
const BAG_DIM = "prefabs/ui/common/DimSheet";
const BAG_PORTRAIT = "shangcheng";

export interface BagOpenArgs {
  tab?: BagTabKind;
}

/**
 * 背包页。格子、页签、滚动和店员都绑在 BackpackLayer 上。
 * 数据只读 GameStore。同步信号用来重画，不在这里解协议。
 * 格子要等页面进了场景再挂。提前改父节点会把世界坐标留在视口外面，羊皮纸中间只剩米色。
 */
@view({
  id: "bag",
  prefab: "prefabs/ui/backpack/BackpackLayer",
  layer: UILayer.Page,
  cache: false,
  allowMultiple: false,
  mount: mountBackpackPage,
})
@ccclass("BackpackView")
export class BackpackView extends BaseView<BagOpenArgs> {
  @property(Node)
  sprBox: Node | null = null;

  @property(Node)
  bagScroll: Node | null = null;

  @property(Node)
  bagPort: Node | null = null;

  @property(Node)
  bagContent: Node | null = null;

  @property(Node)
  tabContent: Node | null = null;

  @property(Node)
  bubble: Node | null = null;

  @property(Label)
  talk: Label | null = null;

  @property(Node)
  portrait: Node | null = null;

  @property(Node)
  hitMenu: Node | null = null;

  @property(Button)
  btnClose: Button | null = null;

  @property(Prefab)
  cellPrefab: Prefab | null = null;

  @property(Prefab)
  tabPrefab: Prefab | null = null;

  @property(Prefab)
  infoPrefab: Prefab | null = null;

  @property(Prefab)
  dimPrefab: Prefab | null = null;

  private tab: BagTabKind = "item";
  private picked: StoreBagItem | null = null;
  private tabs: BackpackTabButtonView[] = [];
  private tabsBuilt = false;
  private opened = false;
  private portraitOn = false;
  private scrollReady = false;
  private offSync: (() => void) | null = null;
  private infoSheet: Node | null = null;
  private shownWatch: (() => void) | null = null;

  onOpen(args?: BagOpenArgs): void {
    this.args = args;
    if (args && args.tab) this.tab = args.tab;
    if (this.opened) {
      this.refreshGrid();
      return;
    }
    this.opened = true;
    this.beginOpen();
    void this.start();
  }

  onClose(): void {
    this.clearShownWatch();
    if (this.offSync) {
      this.offSync();
      this.offSync = null;
    }
  }

  private async start(): Promise<void> {
    try {
      this.dropHostMask();
      this.silenceMenu();
      this.bindClose();
      this.dressPortrait();
      this.offSync = WireSession.onSync(() => this.refreshGrid());
      await this.ensurePrefabs();
      if (!this.node || !this.node.isValid) {
        this.failOpen(new Error("页面已关"));
        return;
      }
      this.refreshGrid();
      this.finishOpen();
    } catch (err) {
      GameLog.shared.warn("Bag", "背包没有挂上 " + messageOf(err));
      this.failOpen(err instanceof Error ? err : new Error(messageOf(err)));
    }
  }

  /**
   * UIManager 在页面进栈之前就 onOpen。这时壳还不在场景里。
   * 进场景前收 content、摆格子，世界坐标会错，遮罩把格子裁没，只剩 spr_box 的米色。
   * 已经在场景里就当场铺。否则等下一帧进了场景再铺。whenReady 不等这一步，避免和进栈互相等。
   */
  private refreshGrid(): void {
    if (!this.node || !this.node.isValid || !this.cellPrefab || !this.tabPrefab) return;
    if (!this.node.activeInHierarchy) {
      this.watchShown();
      return;
    }
    if (!this.scrollReady) this.scrollReady = this.prepareScroll();
    if (!this.scrollReady) return;
    this.buildTabs();
    this.paint();
  }

  private watchShown(): void {
    if (this.shownWatch) return;
    const retry = () => {
      if (!this.node || !this.node.isValid) {
        this.clearShownWatch();
        return;
      }
      if (!this.node.activeInHierarchy) return;
      this.clearShownWatch();
      this.refreshGrid();
    };
    this.shownWatch = retry;
    director.on(Director.EVENT_AFTER_UPDATE, retry);
    this.node.once(Node.EventType.NODE_DESTROYED, () => this.clearShownWatch());
  }

  private clearShownWatch(): void {
    if (!this.shownWatch) return;
    director.off(Director.EVENT_AFTER_UPDATE, this.shownWatch);
    this.shownWatch = null;
  }

  private async ensurePrefabs(): Promise<void> {
    if (!this.cellPrefab) {
      GameLog.shared.warn("Bag", "cellPrefab 未绑定，改走路径加载");
      this.cellPrefab = await loadPrefab(BAG_CELL);
    }
    if (!this.tabPrefab) {
      GameLog.shared.warn("Bag", "tabPrefab 未绑定，改走路径加载");
      this.tabPrefab = await loadPrefab(BAG_TAB);
    }
    if (!this.infoPrefab) {
      GameLog.shared.warn("Bag", "infoPrefab 未绑定，改走路径加载");
      this.infoPrefab = await loadPrefab(BAG_INFO);
    }
    if (!this.dimPrefab) {
      GameLog.shared.warn("Bag", "dimPrefab 未绑定，改走路径加载");
      this.dimPrefab = await loadPrefab(BAG_DIM);
    }
  }

  private bindClose(): void {
    if (!this.btnClose) return;
    this.btnClose.node.on(Button.EventType.CLICK, () => this.close());
  }

  /** 宿主遮罩在进场景前就卸掉。进场景后 onLoad 会装一块空模板，把格子全部裁掉。 */
  private dropHostMask(): void {
    const scroll = this.bagScroll;
    if (!scroll) return;
    const hostMask = scroll.getComponent(Mask);
    if (hostMask) scroll.removeComponent(hostMask);
  }

  private prepareScroll(): boolean {
    const scroll = this.bagScroll;
    const port = this.bagPort;
    const content = this.bagContent;
    if (!scroll || !port || !content) {
      GameLog.shared.warn("Bag", "BackpackLayer 的 spr_box 下没有 BagScroll");
      return false;
    }
    this.dropHostMask();
    if (content.parent !== port) content.parent = port;
    content.setPosition(0, 0, 0);
    const scrollUi = scroll.getComponent(UITransform);
    const scrollSize = positiveUiSize(scrollUi);
    const height = this.portHeight();
    const width = scrollSize && scrollSize.width > 0 ? scrollSize.width : 520;
    assignContentSize(scrollUi, width, height);
    const viewUi = port.getComponent(UITransform);
    const viewSize = positiveUiSize(viewUi);
    assignContentSize(viewUi, viewSize && viewSize.width > 0 ? viewSize.width : width, height);
    this.armMask(port);
    const scroller = scroll.getComponent(ScrollView);
    if (!scroller) GameLog.shared.warn("Bag", "BagScroll 没有 ScrollView");
    else if (scroller.content !== content) scroller.content = content;
    return true;
  }

  /** 视口高度跟 spr_box。羊皮纸保持设计缩放，不再额外拉高。 */
  private portHeight(): number {
    const boxUi = this.sprBox ? this.sprBox.getComponent(UITransform) : null;
    const boxSize = positiveUiSize(boxUi);
    const topInset = this.bagScroll && this.bagScroll.position.y < 0 ? -this.bagScroll.position.y : 0;
    const room = boxSize ? boxSize.height - topInset - topInset : 0;
    const rows = BAG_MIN_ROWS * BAG_PITCH_Y + 24;
    const want = Math.max(400, rows);
    if (room > 80) return Math.min(want, room);
    return want;
  }

  /**
   * 矩形遮罩要等节点进了场景再描。提前加组件时模板经常是空的。
   * 跟原来的背包滚动一样：进场景后仍没有 Graphics，就把遮罩关掉，格子才看得见。
   */
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

  private silenceMenu(): void {
    if (!this.hitMenu) return;
    const ui = this.hitMenu.getComponent(UITransform);
    const size = positiveUiSize(ui);
    if (!ui || !size || size.width < 500 || size.height < 500) return;
    ui.setContentSize(0, 0);
  }

  private dressPortrait(): void {
    if (!this.portrait) {
      GameLog.shared.warn("Bag", "BackpackLayer 没有 node_portrait");
      return;
    }
    if (this.portraitOn) return;
    this.portraitOn = true;
    this.portrait.active = true;
    mountNamedSpine(this.portrait, BAG_PORTRAIT, "act");
  }

  private writeTalk(): void {
    if (this.bubble) this.bubble.active = true;
    if (!this.talk) return;
    this.talk.node.active = true;
    const bag = GameStore.bag();
    this.talk.string = bag === null ? WIRE_BAG_UNSYNCED_TOAST : bagShopGreeting(languageRows());
  }

  private buildTabs(): void {
    if (this.tabsBuilt || !this.tabContent || !this.tabPrefab) return;
    this.tabsBuilt = true;
    for (let i = 0; i < BAG_TABS.length; i++) {
      const spec = BAG_TABS[i];
      const node = spawnPrefab(this.tabPrefab, this.tabContent);
      const tab = node.getComponent(BackpackTabButtonView);
      if (!tab) {
        GameLog.shared.warn("Bag", "BackpackTabButton 上没有 BackpackTabButtonView");
        continue;
      }
      node.setPosition(64 + i * 120, -24, 0);
      this.adoptLayer(node, this.tabContent.layer || Layers.Enum.UI_2D);
      tab.setTab(spec.title, spec.id === this.tab, () => {
        this.tab = spec.id;
        this.refreshGrid();
      });
      this.tabs.push(tab);
    }
  }

  private paint(): void {
    this.writeTalk();
    for (let i = 0; i < this.tabs.length; i++) {
      this.tabs[i].setSelected(BAG_TABS[i].id === this.tab);
    }
    const content = this.bagContent;
    if (!content || !content.isValid || !this.cellPrefab) return;
    this.clear(content);
    const bag = GameStore.bag();
    const rows = bag === null ? [] : rowsForBagTab(bag, this.tab) || [];
    if (bag === null || (this.picked && !rows.some((row) => sameBagItem(row, this.picked as StoreBagItem)))) {
      this.picked = null;
      this.dismissInfo();
    }
    const shown = bagSlotCount(rows.length);
    const layer = content.layer || Layers.Enum.UI_2D;
    for (let i = 0; i < shown; i++) {
      const item = i < rows.length ? rows[i] : null;
      const node = spawnPrefab(this.cellPrefab, content);
      const cell = node.getComponent(BackpackItemCellView);
      if (!cell) {
        GameLog.shared.warn("Bag", "BackpackItemCell 上没有 BackpackItemCellView");
        continue;
      }
      const selected = item !== null && this.picked !== null && sameBagItem(item, this.picked);
      const onTap = item
        ? () => {
            this.picked = item;
            this.showInfo(item);
            this.refreshGrid();
          }
        : rows.length === 0
          ? () => this.toast(bag === null ? WIRE_BAG_UNSYNCED_TOAST : emptyBagToast())
          : null;
      this.adoptLayer(node, layer);
      cell.show(item, selected, onTap);
      const seat = bagSlotPosition(i);
      node.setPosition(seat.x, seat.y, 0);
    }
    const ui = content.getComponent(UITransform);
    const size = positiveUiSize(ui);
    const width = size && size.width > 0 ? size.width : 448;
    assignContentSize(ui, width, bagContentHeight(shown));
    content.setPosition(0, 0, 0);
  }

  private showInfo(item: StoreBagItem): void {
    if (!this.infoPrefab || !this.dimPrefab) {
      GameLog.shared.warn("Bag", "背包详情预制没有绑定");
      return;
    }
    this.infoSheet = openBagInfo(this.node, this.dimPrefab, this.infoPrefab, describeBagItem(item), (text) => this.toast(text));
  }

  private dismissInfo(): void {
    if (this.infoSheet && this.infoSheet.isValid) this.infoSheet.destroy();
    this.infoSheet = null;
  }

  private toast(text: string): void {
    GameLog.shared.info("Bag", text);
    UIManager.instance.toast(text);
  }

  private clear(node: Node): void {
    const old = node.children.slice();
    for (let i = 0; i < old.length; i++) old[i].destroy();
  }

  /** 格子和页签的子节点也要留在 UI 层，只改根节点时图标不会画出来。 */
  private adoptLayer(node: Node, layer: number): void {
    node.layer = layer;
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) this.adoptLayer(kids[i], layer);
  }
}

function languageRows(): { key?: unknown; value?: unknown }[] {
  const db = ConfigDb.current;
  const file = db ? db.tables.get("language") : null;
  if (!file || !Array.isArray(file.rows)) return [];
  return file.rows as { key?: unknown; value?: unknown }[];
}
