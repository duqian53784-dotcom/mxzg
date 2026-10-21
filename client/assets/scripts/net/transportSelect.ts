/**
 * 预览选传输。默认 Mock，不加参数时 Creator 预览照旧可玩。
 * 要连本机游戏服：http://127.0.0.1:7456/?transport=ws
 * 默认地址是本机桥 ws://127.0.0.1:13111/game ，由 scripts/start-ws-bridge.bat 转到 TCP 9902。
 * 游戏服自带的 13101 能完成握手，但不回这套帧。不要把它当默认地址。
 * 查询和安全区的 ?safe= 可以同时放在地址上。
 */

export type TransportKind = "mock" | "ws";

export interface TransportChoice {
  kind: TransportKind;
  wsUrl: string;
}

/** 本机桥。先双击 start-ws-bridge.bat。不是游戏服自带的 13101。 */
export const DEFAULT_WS_URL = "ws://127.0.0.1:13111/game";

/** 安全默认是 mock。只有预览地址写了 transport=ws，或把这里改成 ws，才会去连套接字。 */
export const TransportConfig = {
  defaultKind: "mock" as TransportKind,
  wsUrl: DEFAULT_WS_URL,
};

/** 登录页状态一行放得下。长说明写在 GameLog。 */
export const WS_DOWN_STATUS = "服未启动，请检查启动 bat";
export const WS_DOWN_LOG =
  "服或桥没接上。请先双击 scripts/start-local-server.bat，确认 TCP 9902 在听，再双击 scripts/start-ws-bridge.bat，确认 ws://127.0.0.1:13111/game 在听。不要直连 13101。可改走 Mock。";
export const WS_OPEN_STATUS = "已打开，心跳 1004 已发送";
export const WS_OPEN_TOAST = "心跳 1004 已发送";
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

export interface WireTimeoutReport {
  /** 面板一行：有没有任意 s2c、心跳 1004 回包、登录 1001 回包。 */
  detail: string;
  /** 写进 GameLog 的整句。 */
  summary: string;
  /** 最近几条 Ws 原文。调用方逐条再记一行，避免和面板挤在一起。 */
  tail: string[];
}

const WIRE_TIMEOUT_TAIL = 6;

/**
 * 登录或创角在 5 秒内没有对上的回包时用。
 * 只看已经写进 GameLog 的 Ws 行，不自己去猜服务器。
 * 登录前单独的心跳经常没有 s2c 1004，这句会写明，不把它当成桥已经坏了的唯一证据。
 */
export function explainWireTimeout(wsMessages: string[] | null | undefined): WireTimeoutReport {
  const messages = wsMessages && wsMessages.length ? wsMessages : [];
  let any = false;
  let beat = false;
  let login = false;
  let sentBeat = false;
  let sentLogin = false;
  for (let i = 0; i < messages.length; i++) {
    const text = messages[i] || "";
    if (text.indexOf("收到 s2c ") >= 0) any = true;
    if (text.indexOf("收到 s2c 1004 ") >= 0) beat = true;
    if (text.indexOf("收到 s2c 1001 ") >= 0) login = true;
    if (text.indexOf("发送 c2s 1004 ") >= 0) sentBeat = true;
    if (text.indexOf("发送 c2s 1001 ") >= 0) sentLogin = true;
  }
  const start = messages.length > WIRE_TIMEOUT_TAIL ? messages.length - WIRE_TIMEOUT_TAIL : 0;
  const tail: string[] = [];
  for (let i = start; i < messages.length; i++) tail.push(messages[i]);
  const detail =
    "s2c=" + (any ? "有" : "无") + " 心跳1004回包=" + (beat ? "有" : "无") + " 登录1001回包=" + (login ? "有" : "无");
  let hint: string;
  if (!sentLogin) {
    hint = "这次等待前没有发出登录 1001。";
  } else if (!any) {
    hint = sentBeat
      ? "登录已发出，没有任何 s2c。登录前的心跳 1004 经常没有回包。请确认 start-ws-bridge.bat 在听 13111，TCP 9902 在听。不要直连 13101。"
      : "没有发出心跳，也没有任何 s2c。请确认 start-ws-bridge.bat 在听 13111。";
  } else if (!login && beat) {
    hint = "心跳 1004 有回包，登录 1001 没有回包。";
  } else if (!login) {
    hint = "有别的 s2c，没有登录 1001，心跳 1004 也没有回包。";
  } else if (!beat) {
    hint = "登录 1001 有回包。心跳 1004 没有回包。";
  } else {
    hint = "心跳 1004 和登录 1001 都有过回包，这次仍超时。";
  }
  return { detail, summary: detail + "。" + hint, tail };
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
