/**
 * 邮件（C8）。列表看未读和附件，点开看正文。领取写入 Mock 会话。
 * 不改 .scene。主城「邮件」和玩法列表都能打开。返回走页面栈。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applyMailClaim,
  attachmentText,
  claimAllButtonText,
  claimButtonText,
  deletedToast,
  emptyMailToast,
  isClaimable,
  mailClaimToast,
  mailFailToast,
  mailRowText,
  mailSummaryText,
  pickMailToast,
} from "../module/mail/inbox";
import {
  MailClaimAllResp,
  MailClaimResp,
  MailDeleteResp,
  MailEntry,
  MailListResp,
  MailReadResp,
} from "../net/protocol/types";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const BODY = new Color(214, 224, 236, 255);
const ROW_FILL = new Color(36, 72, 120, 255);
const SELECT_FILL = new Color(168, 116, 42, 255);
const CLAIM_FILL = new Color(36, 128, 96, 255);
const LOCKED_FILL = new Color(78, 84, 98, 255);
const DELETE_FILL = new Color(140, 64, 64, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface MailHost {
  showToast(text: string): void;
  alive(): boolean;
  list(): Promise<MailListResp>;
  read(id: number): Promise<MailReadResp>;
  claim(id: number): Promise<MailClaimResp>;
  claimAll(): Promise<MailClaimAllResp>;
  remove(id: number): Promise<MailDeleteResp>;
  onProgress(): void;
  close(): void;
}

export interface MailPage {
  node: Node;
  dispose(): void;
}

export function buildMailPage(host: MailHost): MailPage {
  return new MailController(host);
}

class MailController implements MailPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly rowsHost: Node;
  private readonly detailHost: Node;
  private disposed = false;
  private busy = false;
  private ticket = 0;
  private toldError = false;
  private mails: MailEntry[] = [];
  private selectedId = 0;
  private summaryLabel: Node | null = null;

  constructor(private readonly host: MailHost) {
    this.node = uiNode("MailPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    place(createLabel("邮件", 40, { color: TITLE }), this.body, 0, 470);
    this.summaryLabel = place(
      createLabel("读取邮件…", 20, { color: MUTED, width: 640 }),
      this.body,
      0,
      418
    );
    this.rowsHost = place(uiNode("rows-host"), this.body, 0, 0);
    this.detailHost = place(uiNode("detail-host"), this.body, 0, 0);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -430);
    GameLog.shared.info("Mail", "open");
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
      const view = await this.host.list();
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      if (!view.ok) {
        this.noteError(errorText(view.code ?? ErrorCode.UNKNOWN_CMD));
        return;
      }
      this.toldError = false;
      this.mails = view.mails || [];
      this.keepSelection();
      this.render();
    } catch (err) {
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      this.noteError(messageOf(err));
    }
  }

  private render(): void {
    const unread = this.mails.filter((mail) => mail.unread).length;
    const claimable = this.mails.filter((mail) => isClaimable(mail)).length;
    this.write(this.summaryLabel, mailSummaryText(this.mails.length, unread, claimable));
    this.renderRows();
    this.renderDetail(claimable);
  }

  private renderRows(): void {
    this.replace(this.rowsHost, "rows", (rows) => {
      const top = 350;
      const step = 52;
      for (let i = 0; i < this.mails.length; i++) {
        const mail = this.mails[i];
        const selected = mail.id === this.selectedId;
        const button = createButton(
          (selected ? "已选 " : "") + mailRowText(mail),
          () => this.select(mail.id),
          640,
          46,
          selected ? SELECT_FILL : ROW_FILL,
          20
        );
        place(button, rows, 0, top - i * step);
      }
    });
  }

  private renderDetail(claimable: number): void {
    const anchor = this.detailAnchor();
    this.replace(this.detailHost, "detail", (detail) => {
      const mail = this.selectedMail();
      if (!mail) {
        const hint = this.mails.length === 0 ? emptyMailToast() : "点一封邮件查看正文和附件";
        place(createLabel(hint, 22, { color: MUTED, width: 640 }), detail, 0, anchor);
      } else {
        place(createRect("card", 640, 168, new Color(16, 28, 48, 255)), detail, 0, anchor - 16);
        place(
          createLabel(mail.from + " · " + mail.title, 22, { color: TITLE, width: 600 }),
          detail,
          0,
          anchor + 36
        );
        place(
          createLabel(mail.body, 18, { color: BODY, width: 600, height: 64, align: "left" }),
          detail,
          0,
          anchor - 8
        );
        place(
          createLabel(attachmentText(mail), 18, { color: MUTED, width: 600, height: 40 }),
          detail,
          0,
          anchor - 70
        );
      }
      const canClaim = mail ? isClaimable(mail) : false;
      place(
        createButton(
          claimButtonText(mail),
          () => void this.claimSelected(),
          280,
          52,
          canClaim ? CLAIM_FILL : LOCKED_FILL
        ),
        detail,
        -160,
        anchor - 168
      );
      place(
        createButton(
          claimAllButtonText(claimable),
          () => void this.claimEvery(),
          280,
          52,
          claimable > 0 ? CLAIM_FILL : LOCKED_FILL
        ),
        detail,
        160,
        anchor - 168
      );
      const canDelete = mail ? !isClaimable(mail) : false;
      place(
        createButton("删除", () => void this.removeSelected(), 280, 48, canDelete ? DELETE_FILL : LOCKED_FILL),
        detail,
        -160,
        anchor - 232
      );
    });
  }

  private select(id: number): void {
    if (this.disposed || this.busy) return;
    const mail = this.find(id);
    if (!mail) return;
    if (this.selectedId === id && !mail.unread) return;
    GameLog.shared.info("Mail", "select " + id);
    this.selectedId = id;
    if (mail.unread) {
      void this.markRead(id);
      return;
    }
    this.render();
  }

  private async markRead(id: number): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    GameLog.shared.info("Mail", "read " + id);
    try {
      const resp = await this.host.read(id);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = mailFailToast(resp);
        GameLog.shared.warn("Mail", text);
        this.host.showToast(text);
      }
      await this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      this.host.showToast(messageOf(err));
    } finally {
      this.busy = false;
    }
  }

  private async claimSelected(): Promise<void> {
    if (this.busy || this.disposed) return;
    if (this.mails.length === 0) {
      this.host.showToast(emptyMailToast());
      return;
    }
    const mail = this.selectedMail();
    if (!mail) {
      this.host.showToast(pickMailToast());
      return;
    }
    this.busy = true;
    GameLog.shared.info("Mail", "claim " + mail.id);
    try {
      const resp = await this.host.claim(mail.id);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = mailFailToast(resp);
        GameLog.shared.warn("Mail", text);
        this.host.showToast(text);
        await this.refresh();
        return;
      }
      applyMailClaim(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = mailClaimToast(resp);
      GameLog.shared.info("Mail", text + " gold " + resp.gold);
      this.host.showToast(text);
      this.selectedId = mail.id;
      await this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Mail", text);
      this.host.showToast(text.length > 0 ? text : errorText(ErrorCode.UNKNOWN_CMD));
    } finally {
      this.busy = false;
    }
  }

  private async claimEvery(): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    GameLog.shared.info("Mail", "claim all");
    try {
      const resp = await this.host.claimAll();
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = mailFailToast(resp);
        GameLog.shared.warn("Mail", text);
        this.host.showToast(text);
        await this.refresh();
        return;
      }
      applyMailClaim(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = mailClaimToast(resp);
      GameLog.shared.info("Mail", text + " gold " + resp.gold);
      this.host.showToast(text);
      await this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Mail", text);
      this.host.showToast(text.length > 0 ? text : errorText(ErrorCode.UNKNOWN_CMD));
    } finally {
      this.busy = false;
    }
  }

  private async removeSelected(): Promise<void> {
    if (this.busy || this.disposed) return;
    if (this.mails.length === 0) {
      this.host.showToast(emptyMailToast());
      return;
    }
    const mail = this.selectedMail();
    if (!mail) {
      this.host.showToast(pickMailToast());
      return;
    }
    this.busy = true;
    GameLog.shared.info("Mail", "delete " + mail.id);
    try {
      const resp = await this.host.remove(mail.id);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = mailFailToast(resp);
        GameLog.shared.warn("Mail", text);
        this.host.showToast(text);
        await this.refresh();
        return;
      }
      const text = deletedToast(resp.title || mail.title);
      GameLog.shared.info("Mail", text);
      this.host.showToast(text);
      this.selectedId = 0;
      await this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Mail", text);
      this.host.showToast(text.length > 0 ? text : errorText(ErrorCode.UNKNOWN_CMD));
    } finally {
      this.busy = false;
    }
  }

  private selectedMail(): MailEntry | null {
    return this.find(this.selectedId);
  }

  private find(id: number): MailEntry | null {
    for (let i = 0; i < this.mails.length; i++) {
      if (this.mails[i].id === id) return this.mails[i];
    }
    return null;
  }

  /** 删掉的信不再选中。不自动点开下一封，避免把未读标成已读。 */
  private keepSelection(): void {
    if (this.selectedMail()) return;
    this.selectedId = 0;
  }

  /** 详情紧跟最后一行。封数多时停住，给下面的领取和返回留位置。 */
  private detailAnchor(): number {
    const step = 52;
    const top = 350;
    const last = this.mails.length <= 0 ? top : top - (this.mails.length - 1) * step;
    const below = last - 120;
    return below < -140 ? -140 : below;
  }

  private replace(host: Node, name: string, fill: (node: Node) => void): void {
    const old = host.getChildByName(name);
    if (old) {
      old.parent = null;
      if (old.isValid) old.destroy();
    }
    const node = uiNode(name);
    node.parent = host;
    fill(node);
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Mail", text);
    this.host.showToast(text);
    this.write(this.summaryLabel, "暂时无法读取邮件");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}
