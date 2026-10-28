import { _decorator, Button, Label, Node, Overflow, Prefab, UITransform } from "cc";
import { messageOf } from "../../../core/errors";
import { GameLog } from "../../../core/GameLog";
import { BaseView } from "../../../framework/ui/BaseView";
import { UILayer } from "../../../framework/ui/UILayer";
import { UIManager } from "../../../framework/ui/UIManager";
import { view } from "../../../framework/ui/UIRegistry";
import { WireSession } from "../../../net/WireSession";
import { loadPrefab, spawnPrefab } from "../../../ui/prefabLoad";
import { startShellFight } from "../../../ui/pagePrefabShell";
import { assignContentSize } from "../../../ui/visibleFit";
import { hangFace } from "../model/hangFace";
import { HangMissionChipView } from "./HangMissionChipView";
import { mountBattleHang, seatHangChip } from "./battleMount";

const { ccclass, property } = _decorator;

const CHIP_PREFAB = "prefabs/ui/battle/HangMissionChip";
const LATER_MAP = "章节地图仍走旧挂机";
const LATER_GROW = "战力UP仍走旧挂机";
const LATER_QUICK = "高速战斗仍走旧挂机";

/**
 * 挂机战斗主面板。底栏三钮、收益和计时绑在 BattlePanelLayer 上。
 * 关卡字在 HangMissionChip。数据来自 GameStore 和 chapterreward，这里不解协议。
 * 点「战斗」仍进已经接上的挂机战报。结算、章节地图、快速战斗和战力UP留在旧壳。
 */
@view({
  id: "mainline",
  prefab: "prefabs/ui/battle/BattlePanelLayer",
  layer: UILayer.Page,
  cache: false,
  allowMultiple: false,
  mount: mountBattleHang,
})
@ccclass("BattleHangView")
export class BattleHangView extends BaseView {
  @property(Button)
  btnBattle: Button | null = null;

  @property(Button)
  btnLineup: Button | null = null;

  @property(Button)
  btnSpeed: Button | null = null;

  @property(Label)
  battleTitle: Label | null = null;

  @property(Label)
  lineupTitle: Label | null = null;

  @property(Label)
  speedTitle: Label | null = null;

  @property(Label)
  clockLabel: Label | null = null;

  @property(Label)
  goldLabel: Label | null = null;

  @property(Label)
  soulsLabel: Label | null = null;

  @property(Label)
  expLabel: Label | null = null;

  @property(Label)
  bubbleLabel: Label | null = null;

  @property(Node)
  worldMap: Node | null = null;

  @property(Node)
  mapLabel: Node | null = null;

  @property(Node)
  worldIcon: Node | null = null;

  @property(Node)
  missionName: Node | null = null;

  @property(Node)
  hitMenu: Node | null = null;

  @property(Prefab)
  chipPrefab: Prefab | null = null;

  private opened = false;
  private clicksBound = false;
  private chip: HangMissionChipView | null = null;
  private openedAt = 0;
  private offSync: (() => void) | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  onOpen(): void {
    if (this.opened) {
      this.refresh();
      return;
    }
    this.opened = true;
    this.openedAt = Date.now();
    this.beginOpen();
    void this.start();
  }

  onClose(): void {
    this.clearTimer();
    if (this.offSync) {
      this.offSync();
      this.offSync = null;
    }
  }

  private async start(): Promise<void> {
    try {
      this.hidePlaceholders();
      this.silenceMenu();
      this.seatTitles();
      this.bindClicks();
      await this.ensureChip();
      if (!this.node || !this.node.isValid) {
        this.failOpen(new Error("页面已关"));
        return;
      }
      this.chip = this.spawnChip();
      if (!this.chip) {
        this.failOpen(new Error("HangMissionChip 没有挂上"));
        return;
      }
      this.offSync = WireSession.onSync(() => this.refresh());
      this.refresh();
      this.timer = setInterval(() => this.refresh(), 1000);
      const handle = this.timer as { unref?: () => void };
      if (typeof handle.unref === "function") handle.unref();
      this.node.once(Node.EventType.NODE_DESTROYED, () => this.clearTimer());
      this.finishOpen();
    } catch (err) {
      GameLog.shared.warn("Mainline", "挂机面板没有挂上 " + messageOf(err));
      this.failOpen(err instanceof Error ? err : new Error(messageOf(err)));
    }
  }

  private async ensureChip(): Promise<void> {
    if (this.chipPrefab) return;
    GameLog.shared.warn("Mainline", "chipPrefab 未绑定，改走路径加载");
    this.chipPrefab = await loadPrefab(CHIP_PREFAB);
  }

  private spawnChip(): HangMissionChipView | null {
    if (!this.chipPrefab || !this.node || !this.node.isValid) return null;
    const parent = this.node.parent && this.node.parent.isValid ? this.node.parent : this.node;
    const node = spawnPrefab(this.chipPrefab, parent);
    node.name = "HangMissionChip";
    const chip = node.getComponent(HangMissionChipView);
    if (!chip) {
      GameLog.shared.warn("Mainline", "HangMissionChip 上没有 HangMissionChipView");
      return null;
    }
    seatHangChip(node);
    node.on(Button.EventType.CLICK, () => UIManager.instance.toast(LATER_MAP));
    return chip;
  }

  private hidePlaceholders(): void {
    const hidden = [this.worldMap, this.mapLabel, this.worldIcon, this.missionName];
    for (let i = 0; i < hidden.length; i++) {
      const node = hidden[i];
      if (node) node.active = false;
    }
  }

  private silenceMenu(): void {
    const menu = this.hitMenu;
    if (!menu) return;
    assignContentSize(menu.getComponent(UITransform), 0, 0);
  }

  private seatTitles(): void {
    this.writeTitle(this.battleTitle, "战斗");
    this.writeTitle(this.lineupTitle, "战力UP");
    this.writeTitle(this.speedTitle, "高速战斗");
  }

  private writeTitle(label: Label | null, text: string): void {
    if (!label) return;
    label.string = text;
  }

  private bindClicks(): void {
    if (this.clicksBound) return;
    this.clicksBound = true;
    this.bindButton(this.btnBattle, () => this.fight());
    this.bindButton(this.btnLineup, () => UIManager.instance.toast(LATER_GROW));
    this.bindButton(this.btnSpeed, () => UIManager.instance.toast(LATER_QUICK));
  }

  private bindButton(button: Button | null, fn: () => void): void {
    if (!button || !button.node) return;
    button.node.on(Button.EventType.CLICK, fn);
  }

  private fight(): void {
    const shell = this.node.parent;
    const page = shell && shell.parent ? shell.parent : null;
    if (!shell || !shell.isValid || !page || !page.isValid) {
      UIManager.instance.toast("挂机壳还没挂上");
      return;
    }
    startShellFight(shell, page);
  }

  private refresh(): void {
    if (!this.node || !this.node.isValid) return;
    const face = hangFace(Date.now(), this.openedAt);
    this.writeRate(this.goldLabel, face.gold);
    this.writeRate(this.soulsLabel, face.souls);
    this.writeRate(this.expLabel, face.exp);
    this.writeClock(this.clockLabel, face.clock);
    this.writeClock(this.bubbleLabel, face.clock);
    if (this.chip) this.chip.show(face.caption);
  }

  private writeRate(label: Label | null, text: string): void {
    if (!label || !label.node || !label.node.isValid) return;
    label.node.setScale(1, 1, 1);
    const ui = label.node.getComponent(UITransform);
    if (ui) {
      ui.setAnchorPoint(1, 0.5);
      assignContentSize(ui, 118, 24);
    }
    try {
      label.string = text;
      label.fontSize = 16;
      label.lineHeight = 20;
      label.overflow = Overflow.SHRINK;
    } catch (_err) {
      label.string = text;
    }
  }

  private writeClock(label: Label | null, text: string): void {
    if (!label) return;
    label.string = text;
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}
