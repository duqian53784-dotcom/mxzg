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

  private write(level: LogLevel, tag: string, message: string): void {
    if (RANK[level] < RANK[this.minLevel]) return;
    const line: LogLine = { level, tag, message, time: Date.now() };
    this.buffer.push(line);
    if (this.buffer.length > this.capacity) {
      this.buffer.splice(0, this.buffer.length - this.capacity);
    }
    if (this.mirrorConsole) mirror(level, this.format(line));
    for (const handler of [...this.listeners]) {
      try {
        handler(line);
      } catch (err) {
        console.error("[mxzg][error][GameLog] listener", err);
      }
    }
  }
}

function mirror(level: LogLevel, text: string): void {
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

function clock(time: number): string {
  const date = new Date(time);
  const pad = (n: number) => (n < 10 ? "0" : "") + n;
  return pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
}
