/**
 * 客户端版本来自 config/version，不再写死 0.1.0-mock。
 * 远程版本从平台地址和下载地址上的 version.json / version.manifest 里取整数版本号，和表里的 version 比大小。
 */
import { sys } from "cc";
import { ConfigLoader } from "../config/ConfigLoader";

export interface ClientVersion {
  version: number;
  platformUrl: string;
  downloadUrl: string;
}

export function isH5Client(): boolean {
  if (sys.isBrowser) return true;
  const platform = sys.platform;
  return platform === sys.Platform.MOBILE_BROWSER || platform === sys.Platform.DESKTOP_BROWSER;
}

export function parseVersionPayload(text: string): number | null {
  const trimmed = text.trim();
  if (/^\d{5,}$/.test(trimmed)) return Number(trimmed);
  let data: unknown = null;
  try {
    data = JSON.parse(trimmed);
  } catch (_err) {
    return null;
  }
  return versionFromJson(data);
}

export function versionNeedsUpdate(local: number, remote: number): boolean {
  return remote > local;
}

export function versionUrls(version: ClientVersion): string[] {
  const roots = [version.platformUrl, version.downloadUrl];
  const out: string[] = [];
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i];
    if (!root) continue;
    const base = root.charAt(root.length - 1) === "/" ? root : root + "/";
    out.push(base + "version.json");
    out.push(base + "version.manifest");
    out.push(base + "version");
    out.push(base);
  }
  return out;
}

export function hotUpdateUrl(version: ClientVersion): string {
  const root = version.downloadUrl || version.platformUrl;
  if (!root) return "";
  const base = root.charAt(root.length - 1) === "/" ? root : root + "/";
  return base + "version.manifest";
}

export async function readClientVersion(): Promise<ClientVersion> {
  const file = await ConfigLoader.loadJson<{ rows?: unknown }>("config/version");
  const rows = Array.isArray(file.rows) ? file.rows : [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || typeof row !== "object") continue;
    const rec = row as { version?: unknown; platform_urls?: unknown; download_urls?: unknown };
    const version = numericVersion(rec.version);
    if (version === null) continue;
    return {
      version,
      platformUrl: typeof rec.platform_urls === "string" ? rec.platform_urls : "",
      downloadUrl: typeof rec.download_urls === "string" ? rec.download_urls : "",
    };
  }
  throw new Error("版本表没有可用的 version");
}

export async function fetchRemoteVersion(version: ClientVersion, timeoutMs = 4000): Promise<number> {
  const urls = versionUrls(version);
  if (urls.length === 0) throw new Error("版本表没有平台地址");
  const found = await Promise.all(
    urls.map((url) =>
      fetchText(url, timeoutMs).then(
        (text) => parseVersionPayload(text),
        () => null
      )
    )
  );
  for (let i = 0; i < found.length; i++) {
    if (found[i] !== null) return found[i] as number;
  }
  throw new Error("校验版本失败");
}

export function downloadWithProgress(
  url: string,
  onRatio: (ratio: number) => void,
  timeoutMs = 20000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timer = setTimeout(() => {
      xhr.abort();
      reject(new Error("下载超时"));
    }, timeoutMs);
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) onRatio(ev.loaded / ev.total);
    };
    xhr.onload = () => {
      clearTimeout(timer);
      if (xhr.status >= 200 && xhr.status < 300) {
        onRatio(1);
        resolve();
        return;
      }
      reject(new Error("HTTP " + xhr.status));
    };
    xhr.onerror = () => {
      clearTimeout(timer);
      reject(new Error("下载失败"));
    };
    xhr.send();
  });
}

function versionFromJson(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const rec = data as { [key: string]: unknown };
  const direct =
    numericVersion(rec.version) ?? numericVersion(rec.remoteVersion) ?? numericVersion(rec.clientVersion);
  if (direct !== null) return direct;
  if (Array.isArray(rec.rows) && rec.rows.length > 0) {
    const row = rec.rows[0];
    if (row && typeof row === "object") return numericVersion((row as { version?: unknown }).version);
  }
  return null;
}

function numericVersion(value: unknown): number | null {
  if (typeof value === "number" && isFinite(value) && value >= 10000) return Math.floor(value);
  if (typeof value === "string" && /^\d{5,}$/.test(value.trim())) return Number(value.trim());
  return null;
}

function fetchText(url: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timer = setTimeout(() => {
      xhr.abort();
      reject(new Error("超时"));
    }, timeoutMs);
    xhr.open("GET", url, true);
    xhr.responseType = "text";
    xhr.onload = () => {
      clearTimeout(timer);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(typeof xhr.response === "string" ? xhr.response : "");
        return;
      }
      reject(new Error("HTTP " + xhr.status));
    };
    xhr.onerror = () => {
      clearTimeout(timer);
      reject(new Error("网络错误"));
    };
    xhr.send();
  });
}
