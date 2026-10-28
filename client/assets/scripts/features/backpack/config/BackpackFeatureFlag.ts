/**
 * 背包页走 BackpackView。
 * 关掉之后，底栏「背包」仍由 screenFill.fillBag 填 BackpackLayer。
 * 已经打开的那一页不会中途换实现，下次再开才看这个开关。
 * 预览地址 ?bag=old 从旧实现开。不写这个参数时走新视图。
 */
let enabled = bagViewFromSearch(currentSearch());

export function useBackpackView(): boolean {
  return enabled;
}

export function setUseBackpackView(on: boolean): void {
  enabled = on;
}

/** 地址里 bag=old / 0 / false 才关。别的值，包括空串，都开着。 */
export function bagViewFromSearch(search: string): boolean {
  const query = search.charAt(0) === "?" ? search.slice(1) : search;
  if (!query) return true;
  const parts = query.split("&");
  for (let i = 0; i < parts.length; i++) {
    const pair = parts[i].split("=");
    let key = "";
    let value = "";
    try {
      key = decodeURIComponent(pair[0] || "");
      value = decodeURIComponent(pair[1] || "");
    } catch (_err) {
      continue;
    }
    if (key !== "bag") continue;
    if (value === "old" || value === "0" || value === "false") return false;
  }
  return true;
}

function currentSearch(): string {
  try {
    const loc = (globalThis as { location?: { search?: string } }).location;
    return loc && typeof loc.search === "string" ? loc.search : "";
  } catch (_err) {
    return "";
  }
}
