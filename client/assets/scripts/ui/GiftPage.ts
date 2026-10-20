/**
 * 礼包骨架。升级有礼、每日礼包、首充、累充在同一页用页签切换。
 * 不改 .scene。主城「礼包」和玩法列表都能进。不设等级锁。
 * 「模拟充值」不走真实支付。返回走页面栈。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applyGiftWallet,
  giftAccButton,
  giftAccClaimToast,
  giftAccFailToast,
  giftAccHint,
  giftAccLine,
  giftDailyButton,
  giftDailyBuyToast,
  giftDailyFailToast,
  giftDailyLine,
  giftFirstButton,
  giftFirstLine,
  giftFirstRewardLine,
  giftFirstToast,
  giftHeadLine,
  giftLevelButton,
  giftLevelClaimToast,
  giftLevelFailToast,
  giftLevelLine,
  giftMeterLine,
  giftRechargeButton,
  giftRechargeFailToast,
  giftRechargeToast,
  giftWalletLine,
  GIFT_ACC_TIERS,
  GIFT_DAILY_PRICE,
  GIFT_FIRST_AMOUNT,
  GIFT_RECHARGE_DIAMOND,
  GIFT_RECHARGE_STEP,
} from "../module/gift/packs";
import {
  GiftAccRow,
  GiftClaimAccResp,
  GiftClaimLevelResp,
  GiftBuyDailyResp,
  GiftLevelRow,
  GiftRechargeKind,
  GiftRechargeResp,
  GiftViewResp,
} from "../net/protocol/types";
import { createButton, createLabel, createRect, paintRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(22, 16, 28, 255);
const TITLE = new Color(255, 214, 160, 255);
const MUTED = new Color(214, 196, 184, 255);
const STAT = new Color(255, 228, 186, 255);
const TAB_ON = new Color(168, 112, 36, 255);
const TAB_OFF = new Color(52, 72, 108, 255);
const CLAIM_FILL = new Color(36, 128, 96, 255);
const LOCK_FILL = new Color(78, 84, 98, 255);
const BUY_FILL = new Color(168, 112, 36, 255);
const RECHARGE_FILL = new Color(140, 52, 108, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

type GiftTab = "level" | "daily" | "first" | "acc";

const TABS: { id: GiftTab; title: string }[] = [
  { id: "level", title: "升级有礼" },
  { id: "daily", title: "每日礼包" },
  { id: "first", title: "首充" },
  { id: "acc", title: "累充" },
];

export interface GiftHost {
  showToast(text: string): void;
  alive(): boolean;
  view(): Promise<GiftViewResp>;
  claimLevel(level: number): Promise<GiftClaimLevelResp>;
  buyDaily(): Promise<GiftBuyDailyResp>;
  recharge(kind: GiftRechargeKind): Promise<GiftRechargeResp>;
  claimAcc(amount: number): Promise<GiftClaimAccResp>;
  onProgress(): void;
  close(): void;
}

export interface GiftPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildGiftPage(host: GiftHost): GiftPage {
  return new GiftController(host);
}

class GiftController implements GiftPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly section: Node;
  private readonly tabs: { id: GiftTab; button: Node }[] = [];
  private disposed = false;
  private busy = false;
  private ticket = 0;
  private toldError = false;
  private tab: GiftTab = "level";
  private snapshot: GiftViewResp | null = null;
  private headLabel: Node | null = null;
  private walletLabel: Node | null = null;
  private resultLabel: Node | null = null;
  private lastReport = "选一个页签。已领取、等级不够或钻石不足都会提示";

  constructor(private readonly host: GiftHost) {
    this.node = uiNode("GiftPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    place(createLabel("礼包", 40, { color: TITLE }), this.body, 0, 500);
    place(
      createLabel("升级有礼、每日礼包、首充、累充。模拟充值，不接真实支付", 18, { color: MUTED, width: 660 }),
      this.body,
      0,
      448
    );
    const width = 156;
    const gap = 8;
    const span = TABS.length * width + (TABS.length - 1) * gap;
    const origin = -span / 2 + width / 2;
    for (let i = 0; i < TABS.length; i++) {
      const spec = TABS[i];
      const button = createButton(spec.title, () => this.pick(spec.id), width, 48, TAB_OFF, 18);
      place(button, this.body, origin + i * (width + gap), 384);
      this.tabs.push({ id: spec.id, button });
    }
    this.headLabel = place(createLabel("读取中…", 22, { color: STAT, width: 660 }), this.body, 0, 320);
    this.walletLabel = place(createLabel("", 20, { color: MUTED, width: 660 }), this.body, 0, 278);
    this.section = place(uiNode("section"), this.body, 0, 0);
    this.resultLabel = place(
      createLabel(this.lastReport, 18, { color: MUTED, width: 640, height: 56 }),
      this.body,
      0,
      -360
    );
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -430);
    this.paintTabs();
    GameLog.shared.info("Gift", "open");
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

  private pick(tab: GiftTab): void {
    if (this.disposed || this.tab === tab) return;
    this.tab = tab;
    this.paintTabs();
    this.renderSection();
  }

  private paintTabs(): void {
    for (let i = 0; i < this.tabs.length; i++) {
      const row = this.tabs[i];
      const bg = row.button.getChildByName("bg");
      if (bg) paintRect(bg, row.id === this.tab ? TAB_ON : TAB_OFF);
    }
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
      this.snapshot = view;
      this.render(view);
    } catch (err) {
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      this.noteError(messageOf(err));
    }
  }

  private render(view: GiftViewResp): void {
    this.write(this.headLabel, giftHeadLine(view.level, view.openDay));
    this.write(this.walletLabel, giftWalletLine(view.gold, view.diamond));
    this.write(this.resultLabel, this.lastReport);
    this.renderSection();
  }

  private renderSection(): void {
    const old = this.section.children.slice();
    for (let i = 0; i < old.length; i++) {
      old[i].parent = null;
      if (old[i].isValid) old[i].destroy();
    }
    const view = this.snapshot;
    if (!view) return;
    if (this.tab === "level") this.renderLevels(view.levels || []);
    else if (this.tab === "daily") this.renderDaily(view);
    else if (this.tab === "first") this.renderFirst(view);
    else this.renderAcc(view);
  }

  private renderLevels(rows: GiftLevelRow[]): void {
    if (rows.length === 0) {
      place(createLabel("暂时没有升级奖励", 22, { color: MUTED, width: 640 }), this.section, 0, 160);
      return;
    }
    const top = 200;
    const step = 130;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const y = top - i * step;
      place(createLabel(giftLevelLine(row), 20, { color: STAT, width: 640 }), this.section, 0, y);
      const ready = row.state === "claimable";
      place(
        createButton(
          giftLevelButton(row.state),
          () => void this.claimLevel(row.level),
          280,
          48,
          ready ? CLAIM_FILL : LOCK_FILL,
          22
        ),
        this.section,
        0,
        y - 52
      );
    }
  }

  private renderDaily(view: GiftViewResp): void {
    const bought = view.dailyBought === true;
    place(createLabel(giftDailyLine(view.dailyPrice || GIFT_DAILY_PRICE, bought), 20, { color: STAT, width: 640, height: 72 }), this.section, 0, 180);
    place(
      createLabel("一天一次。开服天变化后可以再买，已经进背包的留下", 18, { color: MUTED, width: 640, height: 48 }),
      this.section,
      0,
      110
    );
    place(
      createButton(giftDailyButton(bought), () => void this.buyDaily(), 280, 48, bought ? LOCK_FILL : BUY_FILL, 22),
      this.section,
      0,
      40
    );
  }

  private renderFirst(view: GiftViewResp): void {
    const done = view.firstChargeDone === true;
    place(createLabel(giftFirstLine(done, view.firstAmount || GIFT_FIRST_AMOUNT), 22, { color: STAT, width: 640 }), this.section, 0, 190);
    place(createLabel(giftFirstRewardLine(), 20, { color: MUTED, width: 640 }), this.section, 0, 140);
    place(
      createLabel("点下面的按钮即可，不会拉起支付", 18, { color: MUTED, width: 640 }),
      this.section,
      0,
      90
    );
    place(
      createButton(giftFirstButton(done), () => void this.recharge("first"), 280, 48, done ? LOCK_FILL : RECHARGE_FILL, 22),
      this.section,
      0,
      20
    );
  }

  private renderAcc(view: GiftViewResp): void {
    const cap = accCap(view.tiers);
    place(createLabel(giftMeterLine(view.totalRecharge, cap), 22, { color: STAT, width: 640 }), this.section, 0, 210);
    place(
      createLabel(giftAccHint(view.rechargeStep || GIFT_RECHARGE_STEP, view.rechargeDiamond || GIFT_RECHARGE_DIAMOND), 18, {
        color: MUTED,
        width: 640,
      }),
      this.section,
      0,
      168
    );
    place(
      createButton(giftRechargeButton(), () => void this.recharge("acc"), 280, 48, RECHARGE_FILL, 22),
      this.section,
      0,
      112
    );
    const tiers = view.tiers || [];
    const top = 40;
    const step = 108;
    for (let i = 0; i < tiers.length; i++) {
      const row = tiers[i];
      const y = top - i * step;
      place(createLabel(giftAccLine(row), 18, { color: STAT, width: 640 }), this.section, 0, y);
      const ready = row.state === "claimable";
      place(
        createButton(
          giftAccButton(row.state),
          () => void this.claimAcc(row.amount),
          240,
          44,
          ready ? CLAIM_FILL : LOCK_FILL,
          20
        ),
        this.section,
        0,
        y - 46
      );
    }
  }

  private async claimLevel(level: number): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Gift", "claim level " + level);
    try {
      const resp = await this.host.claimLevel(level);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        this.fail(giftLevelFailToast(resp));
        return;
      }
      applyGiftWallet(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = giftLevelClaimToast(resp.level, resp.goldGain, resp.diamondGain, resp.itemName, resp.itemGain);
      this.succeed(text);
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      this.fail(messageOf(err));
    } finally {
      this.busy = false;
    }
  }

  private async buyDaily(): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Gift", "buy daily");
    try {
      const resp = await this.host.buyDaily();
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        this.fail(giftDailyFailToast(resp));
        return;
      }
      applyGiftWallet(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = giftDailyBuyToast(resp.price, resp.goldGain, resp.itemName, resp.itemGain);
      this.succeed(text);
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      this.fail(messageOf(err));
    } finally {
      this.busy = false;
    }
  }

  private async recharge(kind: GiftRechargeKind): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Gift", "recharge " + kind);
    try {
      const resp = await this.host.recharge(kind);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        this.fail(giftRechargeFailToast(resp));
        return;
      }
      applyGiftWallet(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = resp.firstGranted
        ? giftFirstToast(resp.added, resp.diamondGain, resp.itemName, resp.itemGain)
        : giftRechargeToast(resp.added, resp.diamondGain);
      this.succeed(text);
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      this.fail(messageOf(err));
    } finally {
      this.busy = false;
    }
  }

  private async claimAcc(amount: number): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Gift", "claim acc " + amount);
    try {
      const resp = await this.host.claimAcc(amount);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        this.fail(giftAccFailToast(resp));
        return;
      }
      applyGiftWallet(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = giftAccClaimToast(resp.amount, resp.goldGain, resp.diamondGain, resp.itemName, resp.itemGain);
      this.succeed(text);
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      this.fail(messageOf(err));
    } finally {
      this.busy = false;
    }
  }

  private succeed(text: string): void {
    this.lastReport = text;
    GameLog.shared.info("Gift", text);
    this.host.showToast(text);
    void this.refresh();
  }

  private fail(text: string): void {
    this.lastReport = text;
    GameLog.shared.warn("Gift", text);
    this.host.showToast(text);
    void this.refresh();
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Gift", text);
    this.host.showToast(text);
    this.write(this.headLabel, "暂时无法打开礼包");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

function accCap(tiers: GiftAccRow[] | undefined): number {
  if (!tiers || tiers.length === 0) return GIFT_ACC_TIERS[GIFT_ACC_TIERS.length - 1].level;
  let cap = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (tiers[i].amount > cap) cap = tiers[i].amount;
  }
  return cap;
}
