/**
 * 预览选传输。默认 Mock，不加参数时 Creator 预览照旧可玩。
 * 要连本机游戏服：http://127.0.0.1:7456/?transport=ws
 * 地址可用 ?ws=ws://127.0.0.1:13101 或 wss。不写则用 TransportConfig.wsUrl。
 * 查询和安全区的 ?safe= 可以同时放在地址上。
 */

export type TransportKind = "mock" | "ws";

export interface TransportChoice {
  kind: TransportKind;
  wsUrl: string;
}

export const DEFAULT_WS_URL = "ws://127.0.0.1:13101";

/** 安全默认是 mock。只有预览地址写了 transport=ws，或把这里改成 ws，才会去连套接字。 */
export const TransportConfig = {
  defaultKind: "mock" as TransportKind,
  wsUrl: DEFAULT_WS_URL,
};

/** 登录页状态一行放得下。长说明写在 GameLog。 */
export const WS_DOWN_STATUS = "服未启动，请检查启动 bat";
export const WS_DOWN_LOG =
  "服未启动。请先双击 scripts/start-local-server.bat，确认 13101 在听，再打开 http://127.0.0.1:7456/?transport=ws 。可改走 Mock。";
export const WS_OPEN_STATUS = "已打开，尚未发登录包";
export const WS_OPEN_TOAST = "WebSocket 已打开";
export const WS_CLOSE_STATUS = "连接已关闭";
export const WS_MOCK_STATUS = "已改走 Mock";

export function parseTransportSearch(search: string, config: { defaultKind: TransportKind; wsUrl: string } = TransportConfig): TransportChoice {
  const kindRaw = queryParam(search, "transport");
  const wsRaw = queryParam(search, "ws");
  let kind = config.defaultKind;
  if (kindRaw === "ws" || kindRaw === "websocket" || kindRaw === "wss") kind = "ws";
  else if (kindRaw === "mock") kind = "mock";
  let wsUrl = config.wsUrl;
  if (wsRaw) {
    const scheme = wsRaw.toLowerCase();
    if (scheme.indexOf("ws://") === 0 || scheme.indexOf("wss://") === 0) wsUrl = wsRaw;
  }
  return { kind, wsUrl };
}

/** 先看本页查询，再看父页面。Creator 预览若把参数放在外层地址上，这里也能读到。 */
export function readPreviewTransport(): TransportChoice {
  return parseTransportSearch(readPreviewSearch());
}

export function readPreviewSearch(): string {
  const parts: string[] = [];
  pushSearch(parts, readSearchOf(globalThis as LocationHost));
  try {
    const parent = (globalThis as { parent?: LocationHost }).parent;
    if (parent && parent !== (globalThis as unknown)) pushSearch(parts, readSearchOf(parent));
  } catch (_err) {
    // 父页面跨域时读不到，只用本页查询。
  }
  return parts.join("&");
}

interface LocationHost {
  location?: { search?: string };
  search?: string;
}

function pushSearch(parts: string[], search: string): void {
  if (!search) return;
  parts.push(search);
}

function readSearchOf(host: LocationHost | null | undefined): string {
  if (!host) return "";
  const fromLoc = host.location && typeof host.location.search === "string" ? host.location.search : "";
  const direct = typeof host.search === "string" ? host.search : "";
  const raw = fromLoc || direct;
  if (!raw || raw === "?") return "";
  return raw.charAt(0) === "?" ? raw.slice(1) : raw;
}

function queryParam(search: string, key: string): string | null {
  if (!search) return null;
  const query = search.charAt(0) === "?" ? search.slice(1) : search;
  const parts = query.split("&");
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    const eq = part.indexOf("=");
    const rawKey = eq >= 0 ? part.slice(0, eq) : part;
    const rawVal = eq >= 0 ? part.slice(eq + 1) : "";
    let name = rawKey;
    let value = rawVal;
    try {
      name = decodeURIComponent(rawKey);
      value = decodeURIComponent(rawVal.replace(/\+/g, " "));
    } catch (_err) {
      name = rawKey;
      value = rawVal;
    }
    if (name !== key) continue;
    const trimmed = value.trim().toLowerCase();
    if (key === "ws") return value.trim();
    return trimmed;
  }
  return null;
}
