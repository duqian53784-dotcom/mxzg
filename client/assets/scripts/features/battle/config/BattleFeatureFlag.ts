/**
 * 挂机战斗主面板走 BattleHangView。
 * 关掉之后，底栏「战斗」仍由 mountHangBattleShell 铺 BattlePanelLayer。
 * 已经打开的那一页不会中途换实现，下次再开才看这个开关。
 * 预览地址 ?battle=old 从旧实现开。不写这个参数时走新视图。
 */
let enabled = battleViewFromSearch(currentSearch());

export function useBattleView(): boolean {
  return enabled;
}

export function setUseBattleView(on: boolean): void {
  enabled = on;
}

/** 地址里 battle=old / 0 / false 才关。别的值，包括空串，都开着。 */
export function battleViewFromSearch(search: string): boolean {
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
    if (key !== "battle") continue;
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
