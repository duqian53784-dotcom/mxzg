import { _decorator, Button, director, Director, Label, Layers, Node, Overflow, Prefab, UITransform } from "cc";
import { messageOf } from "../../../core/errors";
import { GameLog } from "../../../core/GameLog";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { view } from "../../../framework/ui/UIRegistry";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
import { buildHeroList, heroCellLine, heroCellSeat, heroContentHeight, HeroListTab } from "../../../module/hero/heroList";
import { WireSession } from "../../../net/WireSession";
import { loadPrefab, spawnPrefab } from "../../../ui/prefabLoad";
import { assignContentSize, positiveUiSize } from "../../../ui/visibleFit";
import { HeroIconCellView } from "./HeroIconCellView";
import { HeroListBoardView } from "./HeroListBoardView";
import { mountHeroListPage } from "./heroMount";

const { ccclass, property } = _decorator;

const TAB_ON = "ui/common/button_btn-tab-24";
const TAB_OFF = "ui/common/button_btn-tab-23";
const BOARD_PREFAB = "prefabs/ui/hero/HeroListHeroLayer";
const CELL_PREFAB = "prefabs/ui/hero/HeroIconCell";
const DRAGON_LATER = "圣龙仍走旧英雄页";

/**
 * 英雄列表。页签、羊皮纸和筛选都绑在 HeroListLayer / HeroListHeroLayer 上。
 * 格子数据来自 GameStore 和 herotype。这里不解协议。
 * 详情和圣龙不在这一刀。圣龙钮只提示仍走旧页。
 */
@view({
  id: "hero",
  prefab: "prefabs/ui/hero/HeroListLayer",
  layer: UILayer.Page,
  cache: false,
  allowMultiple: false,
  mount: mountHeroListPage,
})
@ccclass("HeroListView")
export class HeroListView extends BaseView {
  @property(Button)
  btnHero: Button | null = null;

  @property(Button)
  btnBook: Button | null = null;

  @property(Button)
  btnDragon: Button | null = null;

  @property(Label)
  heroTitle: Label | null = null;

  @property(Label)
  bookTitle: Label | null = null;

  @property(Label)
  dragonTitle: Label | null = null;

  @property(Node)
  tabMenu: Node | null = null;

  @property(Node)
  hitLineup: Node | null = null;

  @property(Node)
  hitBubbleMenu: Node | null = null;

  @property(Node)
  bubble: Node | null = null;

  @property(Node)
  layerCapacity: Node | null = null;

  @property(Prefab)
  boardPrefab: Prefab | null = null;

  @property(Prefab)
  cellPrefab: Prefab | null = null;

  private tab: HeroListTab = "hero";
  private elem = 0;
  private board: HeroListBoardView | null = null;
  private opened = false;
  private scrollReady = false;
  private tabsBound = false;
  private offSync: (() => void) | null = null;
  private shownWatch: (() => void) | null = null;

  onOpen(): void {
    if (this.opened) {
      this.refresh();
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
      this.silenceHits();
      this.hideBubble();
      this.fitTitles();
      this.bindTabs();
      await this.ensurePrefabs();
      if (!this.node || !this.node.isValid) {
        this.failOpen(new Error("页面已关"));
        return;
      }
      this.board = this.spawnBoard();
      if (!this.board) {
        this.failOpen(new Error("HeroListHeroLayer 没有挂上"));
        return;
      }
      this.board.bindElem((id) => this.pickElem(id));
      this.offSync = WireSession.onSync(() => this.refresh());
      this.refresh();
      if (!this.scrollReady && this.node.activeInHierarchy) {
        this.failOpen(new Error("HeroListHeroLayer 的 spr_box 下没有 HeroScroll"));
        return;
      }
      this.finishOpen();
    } catch (err) {
      GameLog.shared.warn("Hero", "英雄列表没有挂上 " + messageOf(err));
      this.failOpen(err instanceof Error ? err : new Error(messageOf(err)));
    }
  }

  private async ensurePrefabs(): Promise<void> {
    if (!this.boardPrefab) {
      GameLog.shared.warn("Hero", "boardPrefab 未绑定，改走路径加载");
      this.boardPrefab = await loadPrefab(BOARD_PREFAB);
    }
    if (!this.cellPrefab) {
      GameLog.shared.warn("Hero", "cellPrefab 未绑定，改走路径加载");
      this.cellPrefab = await loadPrefab(CELL_PREFAB);
    }
  }

  private spawnBoard(): HeroListBoardView | null {
    if (!this.boardPrefab || !this.node || !this.node.isValid) return null;
    const node = spawnPrefab(this.boardPrefab, this.node);
    const board = node.getComponent(HeroListBoardView);
    if (!board) {
      GameLog.shared.warn("Hero", "HeroListHeroLayer 上没有 HeroListBoardView");
      return null;
    }
    if (this.tabMenu && this.tabMenu.parent === this.node) node.setSiblingIndex(this.tabMenu.getSiblingIndex());
    if (this.layerCapacity) this.layerCapacity.active = false;
    return board;
  }

  private refresh(): void {
    if (!this.node || !this.node.isValid || !this.board || !this.cellPrefab) return;
    if (!this.node.activeInHierarchy) {
      this.watchShown();
      return;
    }
    if (!this.scrollReady) this.scrollReady = this.board.prepare();
    if (!this.scrollReady) return;
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
      this.refresh();
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

  private paint(): void {
    const board = this.board;
    const content = board ? board.content : null;
    if (!board || !content || !content.isValid || !this.cellPrefab) return;
    this.paintTabs();
    board.setCorner(this.tab);
    board.markElem(this.elem);
    const model = buildHeroList(this.tab, this.elem);
    board.setCapacity(model.capacityLine);
    board.setEmpty(model.emptyText);
    this.clear(content);
    const layer = content.layer || Layers.Enum.UI_2D;
    for (let i = 0; i < model.cells.length; i++) {
      const face = model.cells[i];
      const node = spawnPrefab(this.cellPrefab, content);
      const cell = node.getComponent(HeroIconCellView);
      if (!cell) {
        GameLog.shared.warn("Hero", "HeroIconCell 上没有 HeroIconCellView");
        continue;
      }
      this.adoptLayer(node, layer);
      const line = heroCellLine(face);
      cell.show(face, line ? () => this.toast(line) : null);
      const seat = heroCellSeat(i);
      node.setPosition(seat.x, seat.y, 0);
    }
    const ui = content.getComponent(UITransform);
    const size = positiveUiSize(ui);
    const width = size && size.width > 0 ? size.width : 540;
    assignContentSize(ui, width, heroContentHeight(model.cells.length, model.contentFloor));
    content.setPosition(0, 0, 0);
  }

  private pickElem(id: number): void {
    if (id === this.elem) return;
    this.elem = id;
    this.refresh();
  }

  private showTab(next: HeroListTab): void {
    this.tab = next;
    this.refresh();
  }

  private bindTabs(): void {
    if (this.tabsBound) return;
    this.tabsBound = true;
    if (this.tabMenu && this.tabMenu.parent) {
      this.tabMenu.active = true;
      this.tabMenu.setSiblingIndex(this.tabMenu.parent.children.length - 1);
    } else {
      GameLog.shared.warn("Hero", "HeroListLayer 没有 UIMenu_1");
    }
    this.listenTab(this.btnHero, () => this.showTab("hero"));
    this.listenTab(this.btnBook, () => this.showTab("book"));
    this.listenTab(this.btnDragon, () => this.toast(DRAGON_LATER));
  }

  private listenTab(button: Button | null, pick: () => void): void {
    if (!button || !button.node) {
      GameLog.shared.warn("Hero", "HeroListLayer 页签没有绑上");
      return;
    }
    button.node.active = true;
    button.transition = Button.Transition.NONE;
    button.interactable = true;
    button.node.on(Button.EventType.CLICK, pick);
  }

  private paintTabs(): void {
    this.paintTab(this.btnHero, this.tab === "hero");
    this.paintTab(this.btnBook, this.tab === "book");
    this.paintTab(this.btnDragon, false);
  }

  private paintTab(button: Button | null, on: boolean): void {
    if (!button || !button.node) return;
    button.transition = Button.Transition.NONE;
    paintSpritePaths(button.node, [on ? TAB_ON : TAB_OFF]);
  }

  private fitTitles(): void {
    this.fitTitle(this.heroTitle);
    this.fitTitle(this.bookTitle);
    this.fitTitle(this.dragonTitle);
  }

  private fitTitle(label: Label | null): void {
    if (!label) return;
    label.fontSize = 20;
    label.lineHeight = 24;
    label.overflow = Overflow.SHRINK;
  }

  private hideBubble(): void {
    if (this.bubble) this.bubble.active = false;
  }

  /** 全屏 menu 会盖住格子。页签那排留着，其余大 menu 收成 0。 */
  private silenceHits(): void {
    this.zeroIfHuge(this.hitLineup);
    this.zeroIfHuge(this.hitBubbleMenu);
  }

  private zeroIfHuge(node: Node | null): void {
    if (!node) return;
    const ui = node.getComponent(UITransform);
    const size = positiveUiSize(ui);
    if (!ui || !size || size.width < 500 || size.height < 500) return;
    ui.setContentSize(0, 0);
  }

  private toast(text: string): void {
    GameLog.shared.info("Hero", text);
    UIManager.instance.toast(text);
  }

  private clear(node: Node): void {
    const old = node.children.slice();
    for (let i = 0; i < old.length; i++) old[i].destroy();
  }

  private adoptLayer(node: Node, layer: number): void {
    node.layer = layer;
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) this.adoptLayer(kids[i], layer);
  }
}
