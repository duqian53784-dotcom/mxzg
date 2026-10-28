/**
 * 英雄列表走 HeroListView。
 * 关掉之后，底栏「英雄」仍由 screenFill.fillHero 填 HeroListLayer。
 * 已经打开的那一页不会中途换实现，下次再开才看这个开关。
 * 预览地址 ?hero=old 从旧实现开。不写这个参数时走新视图。
 */
let enabled = heroViewFromSearch(currentSearch());

export function useHeroView(): boolean {
  return enabled;
}

export function setUseHeroView(on: boolean): void {
  enabled = on;
}

/** 地址里 hero=old / 0 / false 才关。别的值，包括空串，都开着。 */
export function heroViewFromSearch(search: string): boolean {
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
    if (key !== "hero") continue;
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
