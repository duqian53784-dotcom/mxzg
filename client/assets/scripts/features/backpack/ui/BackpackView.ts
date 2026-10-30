import { _decorator, Button, director, Director, Label, Layers, Node, Prefab, UITransform } from "cc";
import { ConfigDb } from "../../../config/ConfigLoader";
import { BagTabKind } from "../../../config/gameCatalog";
import { messageOf } from "../../../core/errors";
import { GameLog } from "../../../core/GameLog";
import { GameStore, StoreBagItem } from "../../../core/GameStore";
import {
  BAG_TABS,
  bagShopGreeting,
  bagSlotCount,
  describeBagItem,
  rowsForBagTab,
  sameBagItem,
} from "../../../module/bag/bagBoard";
import { emptyBagToast } from "../../../module/bag/items";
import { WIRE_BAG_UNSYNCED_TOAST } from "../../../net/protocol/wireBag";
import { WireSession } from "../../../net/WireSession";
import { spawnPrefab } from "../../../ui/prefabLoad";
import { mountNamedSpine } from "../../../ui/battleSpine";
import { SuperScroll } from "../../../framework/ui/SuperScroll";
import { BackpackItemCellView } from "./BackpackItemCellView";
import { BackpackTabButtonView } from "./BackpackTabButtonView";
import { BaseView } from "../../../framework/ui/BaseView";
import { mountBackpackPage, openBagInfo } from "./BackpackMount";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { view } from "../../../framework/ui/UIRegistry";
import type { InventorySource, InventoryView } from "../InventoryController";

const { ccclass, property } = _decorator;

const BAG_PORTRAIT = "shangcheng";

export interface BagOpenArgs {
  tab?: BagTabKind;
}

/** Backpack data, selection and tabs. SuperContent owns the item list layout. */
@view({
  id: "bag",
  prefab: "prefabs/ui/backpack/BackpackLayer",
  layer: UILayer.Page,
  cache: false,
  allowMultiple: false,
  mount: mountBackpackPage,
})
@ccclass("BackpackView")
export class BackpackView extends BaseView<BagOpenArgs> implements InventoryView {
  @property(Node)
  sprBox: Node | null = null;

  @property(SuperScroll)
  bagScroll: SuperScroll | null = null;

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
  private resetScroll = true;
  private offSync: (() => void) | null = null;
  private infoSheet: Node | null = null;
  private shownWatch: (() => void) | null = null;
  private inventory: InventorySource | null = null;
  private closed = false;

  useInventory(source: InventorySource): void {
    if (this.opened) throw new Error("背包数据源必须在开页前注入");
    this.inventory = source;
  }
  refreshInventory(): void { if (!this.closed) this.refreshGrid(); }

  onOpen(args?: BagOpenArgs): void {
    this.closed = false;
    this.args = args;
    if (args && args.tab) this.tab = args.tab;
    if (this.opened) {
      this.refreshGrid();
      return;
    }
    this.opened = true;
    this.beginOpen();
    void this.initialize();
  }

  onClose(): void {
    this.closed = true;
    this.failOpen(new Error("页面已关"));
    this.dismissInfo();
    this.clearShownWatch();
    if (this.offSync) {
      this.offSync();
      this.offSync = null;
    }
  }

  private async initialize(): Promise<void> {
    try {
      this.validateBindings();
      this.bindClose();
      this.dressPortrait();
      if (!this.inventory) this.offSync = WireSession.onSync(() => this.refreshGrid());
      if (this.closed || !this.node || !this.node.isValid) {
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

  /** Layout runs after mounting; no reparenting, mask creation or size repair. */
  private refreshGrid(): void {
    if (this.closed) return;
    if (!this.node || !this.node.isValid || !this.bagScroll || !this.tabPrefab) return;
    if (!this.node.activeInHierarchy) {
      this.watchShown();
      return;
    }
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

  private validateBindings(): void {
    const path = "assets/prefabs/ui/backpack/BackpackLayer.prefab / BackpackView: ";
    for (const [field, value] of Object.entries({bagScroll:this.bagScroll,tabContent:this.tabContent,
      tabPrefab:this.tabPrefab,infoPrefab:this.infoPrefab,dimPrefab:this.dimPrefab})) {
      if (!value) throw new Error(path + "缺失绑定 " + field);
    }
    this.bagScroll!.validateBindings();
    const cell = this.bagScroll!.list.cellPrefab!.data as Node;
    const component = cell.getComponent(BackpackItemCellView);
    if (!component) throw new Error(path + "bagScroll.Content.SuperContent.cellPrefab [" + cell.name + "] 缺少 BackpackItemCellView");
    component.validateBindings();
  }

  private bindClose(): void {
    if (!this.btnClose) return;
    this.btnClose.node.on(Button.EventType.CLICK, () => this.close());
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
    if (this.inventory) { this.talk.string = this.inventory.message(); return; }
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
        if (this.tab !== spec.id) this.resetScroll = true;
        this.tab = spec.id;
        if (this.inventory?.failed()) this.inventory.retry();
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
    const list = this.bagScroll!.list;
    const bag = this.inventory ? this.inventory.rows(this.tab) : GameStore.bag();
    const rows = this.inventory ? bag || [] : bag === null ? [] : rowsForBagTab(bag, this.tab) || [];
    if (bag === null || (this.picked && !rows.some((row) => sameBagItem(row, this.picked as StoreBagItem)))) {
      this.picked = null;
      this.dismissInfo();
    }
    // Empty-slot padding belongs to the bag, never to the generic list component.
    const entries = Array.from({ length: bagSlotCount(rows.length) }, (_, index) => rows[index] || null);
    list.setData(entries, (node, item) => {
      const cell = node.getComponent(BackpackItemCellView)!;
      const selected = item !== null && this.picked !== null && sameBagItem(item, this.picked);
      const onTap = item
        ? () => { this.picked = item; this.showInfo(item); this.refreshGrid(); }
        : rows.length === 0
          ? () => { if (this.inventory) this.inventory.retry(); else this.toast(bag === null ? WIRE_BAG_UNSYNCED_TOAST : emptyBagToast()); }
          : null;
      cell.show(item, selected, onTap, item && this.inventory ? this.inventory.face(item) : undefined);
    });
    if (this.resetScroll) { this.bagScroll!.toStart(); this.resetScroll = false; }
  }

  private showInfo(item: StoreBagItem): void {
    if (!this.infoPrefab || !this.dimPrefab) {
      GameLog.shared.warn("Bag", "背包详情预制没有绑定");
      return;
    }
    this.infoSheet = openBagInfo(this.node, this.dimPrefab, this.infoPrefab, this.inventory ? this.inventory.face(item) : describeBagItem(item), (text) => this.toast(text), !!this.inventory);
  }

  private dismissInfo(): void {
    if (this.infoSheet && this.infoSheet.isValid) this.infoSheet.destroy();
    this.infoSheet = null;
  }

  private toast(text: string): void {
    GameLog.shared.info("Bag", text);
    UIManager.instance.toast(text);
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
