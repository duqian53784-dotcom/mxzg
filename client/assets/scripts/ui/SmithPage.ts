/**
 * 铁匠铺（C9）。只强化英雄的新手短剑，消耗金币和强化石。
 * 不改 .scene。底栏「铁匠铺」在主线 Lv5 打开本页。返回走页面栈。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applySmithStrengthen,
  emptySmithToast,
  smithCostLine,
  smithFailToast,
  smithHeroLine,
  smithRowText,
  smithWalletLine,
  strengthenButtonText,
  strengthenToast,
} from "../module/smith/forge";
import { SmithGear, SmithStrengthenResp, SmithViewResp } from "../net/protocol/types";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const STAT = new Color(255, 214, 120, 255);
const ROW_FILL = new Color(48, 64, 96, 255);
const SELECTED_FILL = new Color(168, 96, 42, 255);
const FORGE_FILL = new Color(176, 104, 48, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface SmithHost {
  showToast(text: string): void;
  alive(): boolean;
  view(): Promise<SmithViewResp>;
  strengthen(heroId: number): Promise<SmithStrengthenResp>;
  onProgress(): void;
  close(): void;
}

export interface SmithPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildSmithPage(host: SmithHost): SmithPage {
  return new SmithController(host);
}

class SmithController implements SmithPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly rowsHost: Node;
  private disposed = false;
  private busy = false;
  private ticket = 0;
  private toldError = false;
  private selectedId = 0;
  private gear: SmithGear | null = null;
  private walletLabel: Node | null = null;
  private detailLabel: Node | null = null;
  private costLabel: Node | null = null;
  private forgeButton: Node | null = null;

  constructor(private readonly host: SmithHost) {
    this.node = uiNode("SmithPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    place(createLabel("铁匠铺", 40, { color: TITLE }), this.body, 0, 470);
    place(
      createLabel("强化新手短剑。强化石来自挂机或邮件", 18, { color: MUTED, width: 640 }),
      this.body,
      0,
      420
    );
    this.walletLabel = place(createLabel("读取中…", 22, { color: MUTED, width: 640 }), this.body, 0, 370);
    this.detailLabel = place(createLabel("", 24, { color: STAT, width: 640 }), this.body, 0, 320);
    this.costLabel = place(createLabel("", 18, { color: MUTED, width: 640, height: 48 }), this.body, 0, 270);
    this.rowsHost = place(uiNode("rows-host"), this.body, 0, 0);
    this.forgeButton = place(
      createButton("强化", () => void this.forge(), 520, 64, FORGE_FILL),
      this.body,
      0,
      -400
    );
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -480);
    GameLog.shared.info("Smith", "open");
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

  private render(view: SmithViewResp): void {
    const gears = view.gears || [];
    if (this.selectedId === 0 || !findGear(gears, this.selectedId)) {
      this.selectedId = view.leadId || (gears.length > 0 ? gears[0].heroId : 0);
    }
    const gear = findGear(gears, this.selectedId);
    this.gear = gear;
    this.write(this.walletLabel, smithWalletLine(view.gold, view.stoneOwned));
    this.write(this.detailLabel, gear ? smithHeroLine(gear) : emptySmithToast());
    this.write(this.costLabel, gear ? smithCostLine(gear) : "");
    this.write(this.forgeButton ? this.forgeButton.getChildByName("Label") : null, strengthenButtonText(gear));
    const old = this.rowsHost.getChildByName("rows");
    if (old) {
      old.parent = null;
      if (old.isValid) old.destroy();
    }
    const rows = uiNode("rows");
    rows.parent = this.rowsHost;
    const top = 190;
    const step = 52;
    for (let i = 0; i < gears.length; i++) {
      const row = gears[i];
      const selected = row.heroId === this.selectedId;
      const button = createButton(
        (selected ? "已选 " : "") + smithRowText(row.heroName, row.weaponLevel),
        () => this.select(row.heroId),
        600,
        48,
        selected ? SELECTED_FILL : ROW_FILL,
        20
      );
      place(button, rows, 0, top - i * step);
    }
  }

  private select(heroId: number): void {
    if (this.disposed || this.selectedId === heroId) return;
    this.selectedId = heroId;
    GameLog.shared.info("Smith", "select " + heroId);
    void this.refresh();
  }

  private async forge(): Promise<void> {
    if (this.busy || this.disposed) return;
    const gear = this.gear;
    if (!gear) {
      this.host.showToast(emptySmithToast());
      return;
    }
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Smith", "strengthen " + gear.heroId);
    try {
      const resp = await this.host.strengthen(gear.heroId);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok || !resp.gear) {
        const text = smithFailToast(resp);
        GameLog.shared.warn("Smith", text);
        this.host.showToast(text);
        this.selectedId = gear.heroId;
        void this.refresh();
        return;
      }
      applySmithStrengthen(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = strengthenToast(
        resp.gear.heroName,
        resp.gear.weaponName,
        resp.gear.weaponLevel,
        resp.goldCost,
        resp.stoneCost
      );
      GameLog.shared.info("Smith", text + " gold " + resp.gold + " stone " + resp.stoneOwned);
      this.host.showToast(text);
      this.selectedId = resp.heroId;
      void this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Smith", text);
      this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Smith", text);
    this.host.showToast(text);
    this.write(this.walletLabel, "暂时无法打开铁匠铺");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

function findGear(gears: SmithGear[], heroId: number): SmithGear | null {
  for (let i = 0; i < gears.length; i++) {
    if (gears[i].heroId === heroId) return gears[i];
  }
  return null;
}
