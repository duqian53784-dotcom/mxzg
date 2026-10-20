import { GameLog } from "./GameLog";

/**
 * Mock / 网络已经会返回的失败。
 * 数值是客户端自己的，不是旧服错误码。阶段 D 再对照。
 *
 * 未登记的业务 cmd 仍按 B4 echo（自检 bag.list）。空 cmd 才回 UNKNOWN_CMD。
 * ok:false 但没带 code 时，展示也按未知指令。
 */
export const ErrorCode = {
  OK: 0,
  ROLE_NAME_EMPTY: 1001,
  STAGE_ID_INVALID: 1002,
  LOGIN_FAILED: 1003,
  ROLE_ENTER_FAILED: 1004,
  NET_NOT_CONNECTED: 2001,
  NET_CLOSED: 2002,
  NET_TIMEOUT: 2003,
  UNKNOWN_CMD: 3001,
  REPLAY_ENDED: 3002,
  REPLAY_MISMATCH: 3003,
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

const TEXT: Record<number, string> = {
  [ErrorCode.OK]: "成功",
  [ErrorCode.ROLE_NAME_EMPTY]: "角色名不能为空",
  [ErrorCode.STAGE_ID_INVALID]: "关卡编号无效",
  [ErrorCode.LOGIN_FAILED]: "登录失败",
  [ErrorCode.ROLE_ENTER_FAILED]: "进入角色失败",
  [ErrorCode.NET_NOT_CONNECTED]: "网络未连接",
  [ErrorCode.NET_CLOSED]: "网络已断开",
  [ErrorCode.NET_TIMEOUT]: "请求超时",
  [ErrorCode.UNKNOWN_CMD]: "未知指令",
  [ErrorCode.REPLAY_ENDED]: "回放已结束",
  [ErrorCode.REPLAY_MISMATCH]: "回放指令不匹配",
};

export function errorText(code: number | undefined | null): string {
  if (typeof code === "number" && Object.prototype.hasOwnProperty.call(TEXT, code)) {
    return TEXT[code];
  }
  if (typeof code === "number") return "未知错误（" + code + "）";
  return "未知错误";
}

/** ok:false 时取出 code；没有 code 则当成未知指令。成功或非对象返回 null。 */
export function failureCode(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const body = data as { ok?: unknown; code?: unknown };
  if (body.ok !== false) return null;
  if (typeof body.code === "number" && isFinite(body.code)) return body.code;
  return ErrorCode.UNKNOWN_CMD;
}

export class GameError extends Error {
  code: number;
  detail: string;

  constructor(code: number, detail?: string) {
    super(errorText(code));
    this.name = "GameError";
    this.code = code;
    this.detail = detail ?? "";
  }
}

/** Toast 用的中文。GameError 走错误码表，其它 Error 保留原文。 */
export function messageOf(err: unknown): string {
  if (err instanceof GameError) return errorText(err.code);
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "number" && Object.prototype.hasOwnProperty.call(TEXT, code)) return errorText(code);
  }
  if (err instanceof Error && err.message) return err.message;
  return "未知错误";
}

/** 记一条失败。返回给玩家看的中文，不含 detail。 */
export function logErrorCode(tag: string, code: number, detail?: string): string {
  const text = errorText(code);
  const line = detail ? text + " (" + detail + ")" : text;
  if (code === ErrorCode.NET_CLOSED || code === ErrorCode.LOGIN_FAILED || code === ErrorCode.ROLE_ENTER_FAILED) {
    GameLog.shared.error(tag, line);
  } else {
    GameLog.shared.warn(tag, line);
  }
  return text;
}
