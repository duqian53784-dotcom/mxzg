import type { RoleProfile } from "./AccountModel";
import { JsonClient } from "../../platform/http/JsonClient";

export interface AccountSession { accessToken: string; expiresAt: string; }
export interface LoginResult { session: AccountSession; role: RoleProfile; }
export interface AccountGateway {
  developmentLogin(account: string): Promise<LoginResult>;
  currentRole(token: string): Promise<RoleProfile>;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") throw new Error("服务器返回的数据结构无效");
  return value as Record<string, unknown>;
}

export function readSession(value: unknown): AccountSession {
  const row = record(value);
  if (typeof row.accessToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(row.accessToken) ||
      typeof row.expiresAt !== "string" || !Number.isFinite(Date.parse(row.expiresAt))) throw new Error("会话数据无效");
  return { accessToken: row.accessToken, expiresAt: row.expiresAt };
}

export function readRole(value: unknown): RoleProfile {
  const row = record(value);
  if (typeof row.id !== "string" || !row.id || typeof row.nickname !== "string" ||
      !Number.isSafeInteger(row.level) || Number(row.level) < 1 ||
      !Number.isSafeInteger(row.gold) || Number(row.gold) < 0 ||
      !Number.isSafeInteger(row.diamonds) || Number(row.diamonds) < 0) throw new Error("角色资料无效");
  return { id: row.id, nickname: row.nickname, level: Number(row.level), gold: Number(row.gold), diamonds: Number(row.diamonds) };
}

/** Boundary for the first two backend endpoints, independent of legacy wire opcodes. */
export class AccountApi implements AccountGateway {
  constructor(private readonly http: JsonClient) {}
  async developmentLogin(account: string): Promise<LoginResult> {
    const data = record(await this.http.request("/api/v1/development/login", { account }));
    return { session: readSession(data.session), role: readRole(data.role) };
  }
  async currentRole(token: string): Promise<RoleProfile> {
    return readRole(await this.http.request("/api/v1/roles/me", undefined, token));
  }
}
