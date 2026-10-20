import { findServer } from "./servers";

/** 上次账号 / 上次服务器。H5 用 localStorage，Creator 里优先 sys.localStorage。 */
export interface PrefStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LoginPrefs {
  account: string;
  serverId: number;
}

const ACCOUNT_KEY = "mxzg.account";
const SERVER_KEY = "mxzg.serverId";

export function loadLoginPrefs(store: PrefStore | null): LoginPrefs | null {
  if (!store) return null;
  let account = "";
  let serverRaw: string | null = null;
  try {
    account = (store.getItem(ACCOUNT_KEY) ?? "").trim();
    serverRaw = store.getItem(SERVER_KEY);
  } catch (_err) {
    return null;
  }
  const hasServer = serverRaw !== null && serverRaw !== "";
  if (!account && !hasServer) return null;
  return { account, serverId: findServer(parseServerId(serverRaw)).id };
}

export function saveLoginPrefs(prefs: LoginPrefs, store: PrefStore | null): void {
  if (!store) return;
  const account = prefs.account.trim();
  const serverId = findServer(prefs.serverId).id;
  try {
    if (account) store.setItem(ACCOUNT_KEY, account);
    store.setItem(SERVER_KEY, String(serverId));
  } catch (_err) {
    // 隐私模式或配额满时下次仍可手输。
  }
}

/** 浏览器预览。Creator 组件里先试 sys.localStorage，没有再落到这里。 */
export function browserPrefStore(): PrefStore | null {
  try {
    const store = (globalThis as { localStorage?: PrefStore }).localStorage;
    if (!store || typeof store.getItem !== "function" || typeof store.setItem !== "function") return null;
    return store;
  } catch (_err) {
    return null;
  }
}

/** 输入框优先，空则用检查器账号，再空则 mock。 */
export function resolveAccount(primary: string | undefined, fallback: string | undefined): string {
  const first = (primary ?? "").trim();
  if (first) return first;
  const second = (fallback ?? "").trim();
  if (second) return second;
  return "mock";
}

function parseServerId(raw: string | null): number {
  if (!raw) return 1;
  const value = parseInt(raw, 10);
  if (!isFinite(value)) return 1;
  return value;
}
