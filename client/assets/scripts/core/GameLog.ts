/** 级别从低到高。低于 minLevel 的行不进缓冲，也不镜像到控制台。 */
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogLine {
  level: LogLevel;
  tag: string;
  message: string;
  time: number;
}

const RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * 进程内日志。环形缓冲留最近若干条，给主城「日志」看。
 * mirrorConsole 为 true 时同步打到 console，前缀 [mxzg]。
 * 浏览器预览用 CSS %c 给级别和标签上色。环形缓冲和 format() 仍是纯文本。
 * 场景切换不新建；Boot 的行进了 Main 还能看见。
 */
export class GameLog {
  static shared = new GameLog();

  capacity: number;
  mirrorConsole = true;
  minLevel: LogLevel = "debug";

  private buffer: LogLine[] = [];
  private listeners = new Set<(line: LogLine) => void>();

  constructor(capacity = 80) {
    this.capacity = capacity > 0 ? capacity : 1;
  }

  debug(tag: string, message: string): void {
    this.write("debug", tag, message);
  }

  info(tag: string, message: string): void {
    this.write("info", tag, message);
  }

  warn(tag: string, message: string): void {
    this.write("warn", tag, message);
  }

  error(tag: string, message: string): void {
    this.write("error", tag, message);
  }

  recent(limit?: number): LogLine[] {
    const n = limit === undefined ? this.buffer.length : Math.max(0, limit);
    if (n >= this.buffer.length) return this.buffer.slice();
    return this.buffer.slice(this.buffer.length - n);
  }

  subscribe(handler: (line: LogLine) => void): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  clear(): void {
    this.buffer.length = 0;
  }

  /** 控制台和日志面板用同一行格式。 */
  format(line: LogLine): string {
    return "[mxzg][" + line.level + "][" + line.tag + "] " + clock(line.time) + " " + line.message;
  }

  /**
   * 正式界面打开。Prefab 壳和以后的 UIManager.open 都走这里。
   * className 是视图类或预制根节点名，prefabName 是预制文件名。
   */
  openView(className: string, prefabName: string, prefabPath = ""): void {
    const cls = className || "(none)";
    const name = prefabName || "(none)";
    let message = "open class=" + cls + " prefab=" + name;
    if (prefabPath && prefabPath !== name) message += " path=" + prefabPath;
    this.info("UI", message);
  }

  private write(level: LogLevel, tag: string, message: string): void {
    if (RANK[level] < RANK[this.minLevel]) return;
    const line: LogLine = { level, tag, message, time: Date.now() };
    this.buffer.push(line);
    if (this.buffer.length > this.capacity) {
      this.buffer.splice(0, this.buffer.length - this.capacity);
    }
    if (this.mirrorConsole) mirror(this, line);
    for (const handler of [...this.listeners]) {
      try {
        handler(line);
      } catch (err) {
        console.error("[mxzg][error][GameLog] listener", err);
      }
    }
  }
}

const LEVEL_CSS: Record<LogLevel, string> = {
  debug: "color:#8ab4f8",
  info: "color:#81c995",
  warn: "color:#fdd663",
  error: "color:#f28b82;font-weight:bold",
};

const TAG_CSS = "color:#8ab4ff;font-weight:bold";

/** 有 window 或 document 时控制台吃 %c。Node 检查进程保持纯文本。 */
export function consoleUsesCss(host: object = globalThis): boolean {
  const box = host as { window?: unknown; document?: unknown };
  return box.window !== undefined || box.document !== undefined;
}

/** 浏览器控制台的一行。没有 CSS 环境时返回 null，调用方打 format()。 */
export function consoleParts(line: LogLine, host: object = globalThis): { text: string; css: string[] } | null {
  if (!consoleUsesCss(host)) return null;
  return {
    text: "%c[mxzg]%c[" + line.level + "]%c[" + line.tag + "]%c " + clock(line.time) + " " + line.message,
    css: ["color:#9aa0a6", LEVEL_CSS[line.level], TAG_CSS, "color:inherit"],
  };
}

function mirror(log: GameLog, line: LogLine): void {
  const fn = line.level === "error" ? console.error : line.level === "warn" ? console.warn : console.log;
  const parts = consoleParts(line);
  if (!parts) {
    fn(log.format(line));
    return;
  }
  fn(parts.text, parts.css[0], parts.css[1], parts.css[2], parts.css[3]);
}

function clock(time: number): string {
  const date = new Date(time);
  const pad = (n: number) => (n < 10 ? "0" : "") + n;
  return pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
}
