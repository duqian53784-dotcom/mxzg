/**
 * 1:1 Prefab 壳的页面对照。纯数据，不加载资源。
 * 商店、祈福、先知、黑市、远征、国战没有 P1–P4 Prefab（那些在 P5，本轮不做）。
 */

export const USE_PAGE_PREFAB_SHELL = true;

/** 主线壳上的「战斗」交给已经写好的挑战，不另发协议。 */
export const PAGE_SHELL_FIGHT = "mxzg-shell-fight";

export interface PagePrefabShellSpec {
  /** 相对 assets，无扩展名。 */
  path: string;
  /** true：btn_battle 触发 PAGE_SHELL_FIGHT。 */
  fight: boolean;
}

function shell(path: string, fight = false): PagePrefabShellSpec {
  return { path, fight };
}

/**
 * 键是 PanelNav / 建筑 atom 的页面 id。
 * 没有路由的建筑仍走原来的占位页，壳盖在占位页上。
 */
export const PAGE_PREFAB_SHELLS: { [id: string]: PagePrefabShellSpec } = {
  mainline: shell("prefabs/ui/battle/BattlePanelLayer", true),
  hero: shell("prefabs/ui/hero/HeroListLayer"),
  "hero-detail": shell("prefabs/ui/hero/HeroInfoLayer"),
  heroPalace: shell("prefabs/ui/hero/HeroPalaceLayer"),
  summon: shell("prefabs/ui/summon/SummonLayer"),
  smith: shell("prefabs/ui/smith/SmithLayer"),
  bag: shell("prefabs/ui/backpack/BackpackLayer"),
  mail: shell("prefabs/ui/mail/MailLayer"),
  arena: shell("prefabs/ui/pvp/PvpLayer"),
  tower: shell("prefabs/ui/fantasy-tower/FantasyTowerLayer"),
  idle: shell("prefabs/ui/quick-battle/QuickBattleLayer"),
  achieve: shell("prefabs/ui/achievement/AchievementLayer"),
  world: shell("prefabs/ui/role/WorldLevelLayer"),
  pet: shell("prefabs/ui/pet/PetInfoLayer"),
  cafe: shell("prefabs/ui/main-task/MainTaskLayer"),
  main_ancient: shell("prefabs/ui/ancient/AncientLayer"),
  main_hero_make: shell("prefabs/ui/hero-creat/HeroCreatLayer"),
  main_pub_task: shell("prefabs/ui/main-task/MainTaskLayer"),
  main_altar: shell("prefabs/ui/altar/AltarLayer"),
  main_fantasy_land: shell("prefabs/ui/fantasy-land/FantasyLandMainLayer"),
  main_hero_pernute: shell("prefabs/ui/hero/HeroPernuteLayer"),
  main_exotic_adventure: shell("prefabs/ui/exotic-adventure/ExoticAdventureLayer"),
  main_magic_cube: shell("prefabs/ui/magic-cube/MagicCubeLayer"),
};

export function pagePrefabShell(id: string): PagePrefabShellSpec | null {
  return PAGE_PREFAB_SHELLS[id] || null;
}

/** 这些状态留在登录壳上，不弹出 ErrorLayer。 */
const P1_PROGRESS_PREFIXES = [
  "账号",
  "正在",
  "打开后",
  "进入主城",
  "连接 Mock",
  "准备",
  "已打开",
  "已改走",
  "加载",
  "点进入",
  "请稍候",
  "登录回包",
  "创角回包",
];

export function isP1ProgressStatus(text: string): boolean {
  if (!text) return true;
  for (let i = 0; i < P1_PROGRESS_PREFIXES.length; i++) {
    if (text.indexOf(P1_PROGRESS_PREFIXES[i]) === 0) return true;
  }
  return false;
}
