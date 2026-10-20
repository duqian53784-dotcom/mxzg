/**
 * 七日登录（C13）。七天奖励格子，领取当前角色登录天。
 * 不改 .scene。主城按钮和玩法列表都能打开。返回走页面栈。
 * 「下一天（调试）」只把 Mock 的角色登录天 +1，方便看第 2–7 天。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applyLogin7Claim,
  login7AdvanceButton,
  login7AdvanceToast,
  login7ClaimButton,
  login7ClaimToast,
  login7FailToast,
  login7HeadLine,
  login7MaxToast,
  login7OpenDayLine,
  login7RowText,
  login7TodayClaimed,
  login7WaitToast,
  login7WalletLine,
} from "../module/login7/rewards";
import { Login7AdvanceResp, Login7ClaimResp, Login7Day, Login7ViewResp } from "../net/protocol/types";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(36, 14, 24, 255);
const TITLE = new Color(255, 214, 150, 255);
const MUTED = new Color(214, 186, 186, 255);
const STAT = new Color(255, 228, 170, 255);
const READY_FILL = new Color(168, 92, 48, 255);
const TODAY_FILL = new Color(186, 64, 72, 255);
const CLAIMED_FILL = new Color(48, 96, 78, 255);
const LOCKED_FILL = new Color(78, 84, 98, 255);
const CLAIM_FILL = new Color(176, 96, 36, 255);
const DEBUG_FILL = new Color(72, 64, 112, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface Login7Host {
  showToast(text: string): void;
  alive(): boolean;
  view(): Promise<Login7ViewResp>;
  claim(day: number): Promise<Login7ClaimResp>;
  advance(): Promise<Login7AdvanceResp>;
  onProgress(): void;
  close(): void;
}

export interface Login7Page {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildLogin7Page(host: Login7Host): Login7Page {
  return new Login7Controller(host);
}

class Login7Controller implements Login7Page {
  readonly node: Node;
  private readonly body: Node;
  private readonly rowsHost: Node;
  private disposed = false;
  private busy = false;
  private ticket = 0;
  private toldError = false;
  private loginDay = 0;
  private days: Login7Day[] = [];
  private headLabel: Node | null = null;
  private openDayLabel: Node | null = null;
  private walletLabel: Node | null = null;
  private claimButton: Node | null = null;

  constructor(private readonly host: Login7Host) {
    this.node = uiNode("Login7Page");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    place(createLabel("七日登录", 40, { color: TITLE }), this.body, 0, 500);
    place(
      createLabel("按角色登录天领取。点一行领那一天", 18, { color: MUTED, width: 640 }),
      this.body,
      0,
      452
    );
    this.headLabel = place(createLabel("读取中…", 26, { color: STAT, width: 640 }), this.body, 0, 408);
    this.openDayLabel = place(createLabel("", 18, { color: MUTED, width: 640 }), this.body, 0, 372);
    this.walletLabel = place(createLabel("", 20, { color: STAT, width: 640 }), this.body, 0, 340);
    this.rowsHost = place(uiNode("rows-host"), this.body, 0, 0);
    this.claimButton = place(
      createButton("领取", () => void this.claimToday(), 420, 52, CLAIM_FILL, 22),
      this.body,
      0,
      -168
    );
    place(
      createButton(login7AdvanceButton(), () => void this.advance(), 280, 46, DEBUG_FILL, 20),
      this.body,
      -150,
      -240
    );
    place(createButton("返回", () => this.host.close(), 200, 46, BACK_FILL, 22), this.body, 180, -240);
    GameLog.shared.info("Login7", "open");
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

  private render(view: Login7ViewResp): void {
    const days = view.days || [];
    this.days = days;
    this.loginDay = view.loginDay;
    const todayClaimed = login7TodayClaimed(days, view.loginDay);
    this.write(this.headLabel, login7HeadLine(view.loginDay));
    this.write(this.openDayLabel, login7OpenDayLine(view.openDay));
    this.write(this.walletLabel, login7WalletLine(view.gold, view.diamond));
    this.write(
      this.claimButton ? this.claimButton.getChildByName("Label") : null,
      login7ClaimButton(view.loginDay, todayClaimed)
    );
    const old = this.rowsHost.getChildByName("rows");
    if (old) {
      old.parent = null;
      if (old.isValid) old.destroy();
    }
    const rows = uiNode("rows");
    rows.parent = this.rowsHost;
    const top = 250;
    const step = 52;
    for (let i = 0; i < days.length; i++) {
      const row = days[i];
      const button = createButton(
        login7RowText(row, view.loginDay),
        () => void this.claimDay(row.day),
        640,
        46,
        fillFor(row, view.loginDay),
        18
      );
      place(button, rows, 0, top - i * step);
    }
  }

  private async claimToday(): Promise<void> {
    if (this.loginDay < 1) {
      this.host.showToast(login7WaitToast());
      return;
    }
    await this.claimDay(this.loginDay);
  }

  private async claimDay(day: number): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Login7", "claim " + day);
    try {
      const resp = await this.host.claim(day);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = login7FailToast(resp);
        GameLog.shared.warn("Login7", text);
        this.host.showToast(text);
        void this.refresh();
        return;
      }
      applyLogin7Claim(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = login7ClaimToast(resp.day, resp.rewards || []);
      GameLog.shared.info("Login7", text + " gold " + resp.gold + " diamond " + resp.diamond);
      this.host.showToast(text);
      void this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Login7", text);
      this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  private async advance(): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Login7", "advance");
    try {
      const resp = await this.host.advance();
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok || !resp.advanced) {
        const text = resp.ok ? login7MaxToast() : login7FailToast(resp);
        GameLog.shared.warn("Login7", text);
        this.host.showToast(text);
        void this.refresh();
        return;
      }
      const text = login7AdvanceToast(resp.loginDay);
      GameLog.shared.info("Login7", text + " openDay " + resp.openDay);
      this.host.showToast(text);
      void this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Login7", text);
      this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Login7", text);
    this.host.showToast(text);
    this.write(this.headLabel, "暂时无法打开七日登录");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

function fillFor(day: Login7Day, loginDay: number): Color {
  if (day.state === "claimed") return CLAIMED_FILL;
  if (day.state === "locked") return LOCKED_FILL;
  if (day.day === loginDay) return TODAY_FILL;
  return READY_FILL;
}
