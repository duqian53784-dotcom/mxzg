/**
 * 幻境之塔（C11）。当前层和挑战按钮，一键结算，不播战报。
 * 不改 .scene。玩法列表「幻境之塔」在主线 Lv16 打开本页。返回走页面栈。
 * 这是幻境之塔，不是开服第 30 天的幻魔塔。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applyTowerChallenge,
  towerChallengeButton,
  towerDailyLine,
  towerFailToast,
  towerFloorLine,
  towerPowerLine,
  towerReportLine,
  towerResultToast,
} from "../module/tower/climb";
import { TowerChallengeResp, TowerViewResp } from "../net/protocol/types";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(12, 10, 28, 255);
const TITLE = new Color(220, 196, 255, 255);
const MUTED = new Color(190, 205, 225, 255);
const STAT = new Color(255, 214, 120, 255);
const FIGHT_FILL = new Color(110, 72, 168, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface TowerHost {
  showToast(text: string): void;
  alive(): boolean;
  view(): Promise<TowerViewResp>;
  challenge(): Promise<TowerChallengeResp>;
  onProgress(): void;
  close(): void;
}

export interface TowerPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildTowerPage(host: TowerHost): TowerPage {
  return new TowerController(host);
}

class TowerController implements TowerPage {
  readonly node: Node;
  private readonly body: Node;
  private disposed = false;
  private busy = false;
  private ticket = 0;
  private toldError = false;
  private floorLabel: Node | null = null;
  private powerLabel: Node | null = null;
  private dailyLabel: Node | null = null;
  private resultLabel: Node | null = null;
  private fightButton: Node | null = null;
  private lastReport = "点挑战。战力不低于守关则胜利，失败层数不变";

  constructor(private readonly host: TowerHost) {
    this.node = uiNode("TowerPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    place(createLabel("幻境之塔", 40, { color: TITLE }), this.body, 0, 460);
    place(
      createLabel("当前层一键结算，不播战报。失败则层数不变", 18, { color: MUTED, width: 640 }),
      this.body,
      0,
      400
    );
    this.floorLabel = place(createLabel("读取中…", 26, { color: STAT, width: 640 }), this.body, 0, 300);
    this.powerLabel = place(createLabel("", 22, { color: MUTED, width: 640 }), this.body, 0, 250);
    this.dailyLabel = place(createLabel("", 20, { color: MUTED, width: 640 }), this.body, 0, 200);
    this.resultLabel = place(
      createLabel(this.lastReport, 18, { color: MUTED, width: 640, height: 72 }),
      this.body,
      0,
      80
    );
    this.fightButton = place(
      createButton("挑战", () => void this.fight(), 560, 64, FIGHT_FILL, 22),
      this.body,
      0,
      -40
    );
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -140);
    GameLog.shared.info("Tower", "open");
    void this.refresh();
  }

  reload(): void {
    if (this.disposed) return;
    void this.refresh();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.ticket += 1;
  }

  private async refresh(): Promise<void> {
    if (this.disposed) return;
    const ticket = ++this.ticket;
    try {
      const view = await this.host.view();
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      if (!view.ok) {
        this.noteError(errorText(view.code ?? ErrorCode.UNKNOWN_CMD));
        return;
      }
      this.toldError = false;
      this.render(view);
    } catch (err) {
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      this.noteError(messageOf(err));
    }
  }

  private render(view: TowerViewResp): void {
    this.write(this.floorLabel, towerFloorLine(view.floor, view.maxFloor, view.name, view.floorPower, view.cleared));
    this.write(this.powerLabel, towerPowerLine(view.playerPower, view.floorPower, view.cleared));
    this.write(this.dailyLabel, towerDailyLine(view.used, view.limit, view.gold, view.stoneOwned));
    this.write(this.resultLabel, this.lastReport);
    this.write(
      this.fightButton ? this.fightButton.getChildByName("Label") : null,
      towerChallengeButton(view.floor, view.used, view.limit, view.cleared)
    );
  }

  private async fight(): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Tower", "challenge");
    try {
      const resp = await this.host.challenge();
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = towerFailToast(resp);
        GameLog.shared.warn("Tower", text);
        this.host.showToast(text);
        void this.refresh();
        return;
      }
      applyTowerChallenge(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = towerResultToast(resp.floor, resp.nextFloor, resp.win, resp.goldGain, resp.itemName, resp.itemGain);
      this.lastReport = towerReportLine(resp.playerPower, resp.floorPower, resp.floor, resp.win) + " · " + text;
      GameLog.shared.info("Tower", text + " floor " + resp.nextFloor + " gold " + resp.gold);
      this.host.showToast(text);
      void this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Tower", text);
      this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Tower", text);
    this.host.showToast(text);
    this.write(this.floorLabel, "暂时无法打开幻境之塔");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}
