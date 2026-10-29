import { AccountModel } from "./AccountModel";
import { readSession } from "./AccountApi";
import type { AccountGateway, AccountSession, LoginResult } from "./AccountApi";
import { HttpFailure } from "../../platform/http/JsonClient";

export interface SessionStore {
  read(): AccountSession | null;
  write(session: AccountSession): void;
  clear(): void;
}

export class AccountService {
  private operation = 0;
  private session: AccountSession | null = null;
  constructor(private readonly model: AccountModel, private readonly api: AccountGateway,
    private readonly store: SessionStore, private readonly now: () => number = Date.now) {}

  async login(account: string): Promise<boolean> {
    const normalized = account.trim().toLowerCase();
    const operation = ++this.operation;
    // A new identity attempt must not restore a previous account after a failure.
    this.session = null;
    this.safely(() => this.store.clear());
    if (!/^[a-z0-9_-]{3,32}$/.test(normalized)) {
      this.model.replace({ busy: false, role: null, error: "账号需为 3–32 位英文、数字、下划线或连字符" });
      return false;
    }
    this.model.replace({ busy: true, role: null, error: "" });
    try {
      const result = await this.api.developmentLogin(normalized);
      if (operation !== this.operation) return false;
      this.accept(result);
      return true;
    } catch (error) { return this.fail(operation, error); }
  }

  async restore(): Promise<boolean> {
    const operation = ++this.operation;
    let session = this.session;
    try { session = session || this.store.read(); if (session) session = readSession(session); }
    catch { this.safely(() => this.store.clear()); session = null; }
    if (!session || Date.parse(session.expiresAt) <= this.now()) { this.logout(); return false; }
    this.model.replace({ busy: true, role: null, error: "" });
    try {
      const role = await this.api.currentRole(session.accessToken);
      if (operation !== this.operation) return false;
      this.accept({ session, role });
      return true;
    } catch (error) {
      if (operation !== this.operation) return false;
      if (error instanceof HttpFailure && error.status === 401) {
        this.session = null;
        this.safely(() => this.store.clear());
      }
      return this.fail(operation, error);
    }
  }

  logout(): void {
    this.operation++;
    this.session = null;
    this.safely(() => this.store.clear());
    this.model.replace({ busy: false, role: null, error: "" });
  }

  private accept(result: LoginResult): void {
    this.session = result.session;
    this.safely(() => this.store.write(result.session));
    this.model.replace({ busy: false, role: result.role, error: "" });
  }
  private fail(operation: number, error: unknown): false {
    if (operation === this.operation) this.model.replace({ busy: false, role: null,
      error: error instanceof Error ? error.message : "登录失败，请重试" });
    return false;
  }
  private safely(action: () => void): void { try { action(); } catch { /* Storage denial must not discard a valid live session. */ } }
}
