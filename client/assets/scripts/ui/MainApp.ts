/**
 * 主城壳（C2）。Canvas 下用代码生成顶栏、底栏和面板，不需要美术。
 * 顶栏底栏默认 USE_CITY_CHROME_PREFAB。false 时仍 mountCityChrome，代码顶底栏不删。
 * 本文件不改这个开关，也不改 Boot。
 * 从 Boot 进来时，若场景上没挂本组件，Boot 会 addComponent。
 * 单独预览 Main：把 MainApp 挂到 Main 场景的 Canvas 上。开关为 true 时看到 Prefab 壳。
 * 顶栏和底栏在 UIShell 的 chrome 层，不进页面栈。系统面板走 PanelNav。
 * 主城页中间默认 USE_CITY_HUB_PREFAB：CityHub Prefab 的地图和建筑。
 * false 或加载失败时仍 mountCityMap，代码地图不删。底栏是国服七项。
 * 已有页面默认再盖 USE_PAGE_PREFAB_SHELL 的 1:1 Prefab。关掉后仍是原来的页面。
 * 不改 Boot 的主城开关，不改战斗特效。主线「战斗」仍走原来的挑战。
 * 主屏不再画红「活动」、蓝「更多」矩形，也不再铺调试按钮矩阵。
 * 这两颗入口在 CityChrome Prefab 上。主线从 CityHub 的 BtnMainline 进。
 */
import { _decorator, BlockInputEvents, Color, Component, Node, resources, Sprite, SpriteFrame, UITransform } from "cc";
import { ConfigDb, ConfigLoader } from "../config/ConfigLoader";
import { listOpenEntries } from "../config/gates";
import {
  CITY_BAR,
  CITY_TAB,
  entryAccess,
  entryLockLevel,
  findNavEntry,
  NavEntry,
  PLAY_ENTRIES,
  tabLabel,
} from "../config/nav";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { chapterPlaceLabel } from "../config/gameCatalog";
import { GameStore } from "../core/GameStore";
import {
  formatDiamondLine,
  formatGoldLine,
  formatLevelBadge,
  formatNameLine,
  formatServerLabel,
  formatSubLine,
  Session,
} from "../core/Session";
import { NetClient } from "../net/NetClient";
import { wireDebugEnabled } from "../net/transportSelect";
import { NetState } from "../net/NetTypes";
import { WireSession } from "../net/WireSession";
import { Proto } from "../net/protocol";
import { BagPage, buildBagPage } from "./BagPage";
import { CityChrome, mountCityChrome, mountCityChromePrefab, TabState } from "./CityChrome";
import { formatAvatarIcon, formatCombatPower } from "./hangHud";
import { CITY_CHROME_PREFAB_PATH } from "./prefabLoad";
import { attachPagePrefabShell, mountHangBattleShell, USE_PAGE_PREFAB_SHELL } from "./pagePrefabShell";
import { buildHeroDetail, buildHeroList, HeroDetailPage, HeroListPage, mountHeroDetailPrefab, mountHeroListPrefab, USE_HERO_PREFAB } from "./HeroPage";
import { buildSummonPage, mountSummonPrefab, SummonPage, USE_SUMMON_PREFAB } from "./SummonPage";
import { buildWireSummonPage, WireSummonPage } from "./WireSummonPage";
import { buildWireProphetPage, WireProphetPage } from "./WireProphetPage";
import { buildWireJewelPage, WireJewelPage } from "./WireJewelPage";
import { buildWireIllustratPage, WireIllustratPage } from "./WireIllustratPage";
import { buildWirePetPage, WirePetPage } from "./WirePetPage";
import { buildWireWorldPage, WireWorldPage } from "./WireWorldPage";
import { buildWirePromotionPage, WirePromotionPage } from "./WirePromotionPage";
import { buildWireFirstRechargePage, WireFirstRechargePage } from "./WireFirstRechargePage";
import { buildWireReikiPage, WireReikiPage } from "./WireReikiPage";
import { buildWireIslandsPage, WireIslandsPage } from "./WireFloatingIslandsPage";
import { buildWireTotemsPage, WireTotemsPage } from "./WireTotemsPage";
import { buildWireAstrolabePage, WireAstrolabePage } from "./WireAstrolabePage";
import { buildWireTweakCubePage, WireTweakCubePage } from "./WireTweakCubePage";
import { buildWireDragonPage, WireDragonPage } from "./WireDragonPage";
import { buildWireDragonCollectionPage, WireDragonCollectionPage } from "./WireDragonCollectionPage";
import { buildWireTitlePage, WireTitlePage } from "./WireTitlePage";
import { buildWireHeadPortraitPage, WireHeadPortraitPage } from "./WireHeadPortraitPage";
import { buildWireBorderPage, WireBorderPage } from "./WireBorderPage";
import { buildWireFashionPage, WireFashionPage } from "./WireFashionPage";
import { buildWireWornFashionPage, WireWornFashionPage } from "./WireWornFashionPage";
import { buildWireHeroPrayerPage, WireHeroPrayerPage } from "./WireHeroPrayerPage";
import { buildWirePetIllustratePage, WirePetIllustratePage } from "./WirePetIllustratePage";
import { buildWireFetterPage, WireFetterPage } from "./WireFetterPage";
import { buildWireFetterFashionPage, WireFetterFashionPage } from "./WireFetterFashionPage";
import { buildWireShenBinPage, WireShenBinPage } from "./WireShenBinPage";
import { buildWireOccupationPage, WireOccupationPage } from "./WireOccupationPage";
import { buildWireRoleShenBinPage, WireRoleShenBinPage } from "./WireRoleShenBinPage";
import { buildWireFetterContractPage, WireFetterContractPage } from "./WireFetterContractPage";
import { buildWireFormationPage, WireFormationPage } from "./WireFormationPage";
import { buildWireLineUpPage, WireLineUpPage } from "./WireLineUpPage";
import { buildWireRunningPromotionPage, WireRunningPromotionPage } from "./WireRunningPromotionPage";
import { buildWireTowerRewardPage, WireTowerRewardPage } from "./WireTowerRewardPage";
import { buildWireHeroLevelResetTimesPage, WireHeroLevelResetTimesPage } from "./WireHeroLevelResetTimesPage";
import { buildWireSignInListPage, WireSignInListPage } from "./WireSignInListPage";
import { buildWireDailyTaskListPage, WireDailyTaskListPage } from "./WireDailyTaskListPage";
import { buildWireDailyWelfareListPage, WireDailyWelfareListPage } from "./WireDailyWelfareListPage";
import { buildWireMouthWelfareListPage, WireMouthWelfareListPage } from "./WireMouthWelfareListPage";
import { buildWireWeekendGiftPage, WireWeekendGiftPage } from "./WireWeekendGiftPage";
import { buildWireGodRelicPage, WireGodRelicPage } from "./WireGodRelicPage";
import { buildWireHeroPalacePage, WireHeroPalacePage } from "./WireHeroPalacePage";
import { buildWireRechargeDaysBPage, WireRechargeDaysBPage } from "./WireRechargeDaysBPage";
import { buildWireTimeTowerPage, WireTimeTowerPage } from "./WireTimeTowerPage";
import { buildWireSpaceTimeAdventurePage, WireSpaceTimeAdventurePage } from "./WireSpaceTimeAdventurePage";
import { buildWireMagicTowerRoadPage, WireMagicTowerRoadPage } from "./WireMagicTowerRoadPage";
import { buildWireQiShenQiPage, WireQiShenQiPage } from "./WireQiShenQiPage";
import { buildWireZhuShenJiTanPage, WireZhuShenJiTanPage } from "./WireZhuShenJiTanPage";
import { buildWireMidFoodPage, WireMidFoodPage } from "./WireMidFoodPage";
import { buildWireQiuShangMingYuePage, WireQiuShangMingYuePage } from "./WireQiuShangMingYuePage";
import { buildWireWanShengLotteryPage, WireWanShengLotteryPage } from "./WireWanShengLotteryPage";
import { buildWireHeiWuMissionPage, WireHeiWuMissionPage } from "./WireHeiWuMissionPage";
import { buildWireChristmasGiftPage, WireChristmasGiftPage } from "./WireChristmasGiftPage";
import { buildWireSpringOutingPage, WireSpringOutingPage } from "./WireSpringOutingPage";
import { buildWireChristmasMissionPage, WireChristmasMissionPage } from "./WireChristmasMissionPage";
import { buildWireMagicTowerLevelRankPage, WireMagicTowerLevelRankPage } from "./WireMagicTowerLevelRankPage";
import { buildWireSpringOutingGridPage, WireSpringOutingGridPage } from "./WireSpringOutingGridPage";
import { WIRE_ILLUSTRAT_UNSYNCED_TOAST } from "../net/protocol/wireIllustrat";
import { WIRE_PET_UNSYNCED_TOAST } from "../net/protocol/wirePet";
import { WIRE_WORLD_UNSYNCED_TOAST } from "../net/protocol/wireWorld";
import { WIRE_PROMOTION_UNSYNCED_TOAST } from "../net/protocol/wirePromotion";
import { WIRE_FIRST_UNSYNCED_TOAST } from "../net/protocol/wireFirstRecharge";
import { WIRE_REIKI_UNSYNCED_TOAST } from "../net/protocol/wireReiki";
import { WIRE_ISLANDS_UNSYNCED_TOAST } from "../net/protocol/wireFloatingIslands";
import { WIRE_TOTEMS_UNSYNCED_TOAST } from "../net/protocol/wireTotems";
import { WIRE_ASTROLABE_UNSYNCED_TOAST } from "../net/protocol/wireAstrolabe";
import { WIRE_CUBE_UNSYNCED_TOAST } from "../net/protocol/wireTweakCube";
import { WIRE_DRAGON_UNSYNCED_TOAST } from "../net/protocol/wireDragon";
import { WIRE_DRAGON_COLLECTION_UNSYNCED_TOAST } from "../net/protocol/wireDragonCollection";
import { WIRE_TITLE_UNSYNCED_TOAST } from "../net/protocol/wireTitle";
import { WIRE_HEAD_PORTRAIT_UNSYNCED_TOAST } from "../net/protocol/wireHeadPortrait";
import { WIRE_BORDER_UNSYNCED_TOAST } from "../net/protocol/wireBorder";
import { WIRE_FASHION_UNSYNCED_TOAST } from "../net/protocol/wireFashion";
import { WIRE_WORN_FASHION_UNSYNCED_TOAST } from "../net/protocol/wireWornFashion";
import { WIRE_HERO_PRAYER_UNSYNCED_TOAST } from "../net/protocol/wireHeroPrayer";
import { WIRE_PET_ILLUSTRATE_UNSYNCED_TOAST } from "../net/protocol/wirePetIllustrate";
import { WIRE_FETTER_UNSYNCED_TOAST } from "../net/protocol/wireFetter";
import { WIRE_FETTER_FASHION_UNSYNCED_TOAST } from "../net/protocol/wireFetterFashion";
import { WIRE_SHENBIN_UNSYNCED_TOAST } from "../net/protocol/wireShenBin";
import { WIRE_OCCUPATION_UNSYNCED_TOAST } from "../net/protocol/wireOccupation";
import { WIRE_ROLE_SHENBIN_UNSYNCED_TOAST } from "../net/protocol/wireRoleShenBin";
import { WIRE_FETTER_CONTRACT_UNSYNCED_TOAST } from "../net/protocol/wireFetterContract";
import { WIRE_FORMATION_UNSYNCED_TOAST } from "../net/protocol/wireFormation";
import { WIRE_LINEUP_UNSYNCED_TOAST } from "../net/protocol/wireLineUp";
import { WIRE_RUNNING_PROMOTION_UNSYNCED_TOAST } from "../net/protocol/wireRunningPromotion";
import { WIRE_TOWER_REWARD_UNSYNCED_TOAST } from "../net/protocol/wireTowerReward";
import { WIRE_HERO_LEVEL_RESET_TIMES_UNSYNCED_TOAST } from "../net/protocol/wireHeroLevelResetTimes";
import { WIRE_SIGN_IN_LIST_UNSYNCED_TOAST } from "../net/protocol/wireSignInList";
import { WIRE_DAILY_TASK_LIST_UNSYNCED_TOAST } from "../net/protocol/wireDailyTaskList";
import { WIRE_DAILY_WELFARE_LIST_UNSYNCED_TOAST } from "../net/protocol/wireDailyWelfareList";
import { WIRE_MOUTH_WELFARE_LIST_UNSYNCED_TOAST } from "../net/protocol/wireMouthWelfareList";
import { WIRE_WEEKEND_GIFT_UNSYNCED_TOAST } from "../net/protocol/wireWeekendGift";
import { WIRE_GOD_RELIC_UNSYNCED_TOAST } from "../net/protocol/wireGodRelic";
import { WIRE_HERO_PALACE_UNSYNCED_TOAST } from "../net/protocol/wireHeroPalace";
import { WIRE_RECHARGE_DAYS_B_UNSYNCED_TOAST } from "../net/protocol/wireRechargeDaysB";
import { WIRE_TIME_TOWER_UNSYNCED_TOAST } from "../net/protocol/wireTimeTower";
import { WIRE_SPACE_TIME_ADVENTURE_UNSYNCED_TOAST } from "../net/protocol/wireSpaceTimeAdventure";
import { WIRE_MAGIC_TOWER_ROAD_UNSYNCED_TOAST } from "../net/protocol/wireMagicTowerRoad";
import { WIRE_QI_SHEN_QI_UNSYNCED_TOAST } from "../net/protocol/wireQiShenQi";
import { WIRE_ZHU_SHEN_JI_TAN_UNSYNCED_TOAST } from "../net/protocol/wireZhuShenJiTan";
import { WIRE_MID_FOOD_UNSYNCED_TOAST } from "../net/protocol/wireMidFood";
import { WIRE_QIU_SHANG_MING_YUE_UNSYNCED_TOAST } from "../net/protocol/wireQiuShangMingYue";
import { WIRE_WAN_SHENG_LOTTERY_UNSYNCED_TOAST } from "../net/protocol/wireWanShengLottery";
import { WIRE_HEI_WU_MISSION_UNSYNCED_TOAST } from "../net/protocol/wireHeiWuMission";
import { WIRE_CHRISTMAS_GIFT_UNSYNCED_TOAST } from "../net/protocol/wireChristmasGift";
import { WIRE_SPRING_OUTING_UNSYNCED_TOAST } from "../net/protocol/wireSpringOuting";
import { WIRE_CHRISTMAS_MISSION_UNSYNCED_TOAST } from "../net/protocol/wireChristmasMission";
import { WIRE_MAGIC_TOWER_LEVEL_RANK_UNSYNCED_TOAST } from "../net/protocol/wireMagicTowerLevelRank";
import { WIRE_SPRING_OUTING_GRID_UNSYNCED_TOAST } from "../net/protocol/wireSpringOutingGrid";
import { buildMailPage, MailPage } from "./MailPage";
import { buildSmithPage, SmithPage } from "./SmithPage";
import { ArenaPage, buildArenaPage } from "./ArenaPage";
import { buildWirePvpPage, WirePvpPage } from "./WirePvpPage";
import { buildTowerPage, TowerPage } from "./TowerPage";
import { buildDailyGoldPage, DailyGoldPage } from "./DailyGoldPage";
import { buildLogin7Page, Login7Page } from "./Login7Page";
import { buildWireSevenDayPage, WireSevenDayPage } from "./WireSevenDayPage";
import { buildWireAchievementPage, WireAchievementPage } from "./WireAchievementPage";
import { buildWireActivityPage, WireActivityPage } from "./WireActivityPage";
import { buildGoal7Page, Goal7Page } from "./Goal7Page";
import { buildWireGoal7Page, WireGoal7Page } from "./WireGoal7Page";
import { buildShopPage, ShopPage } from "./ShopPage";
import { buildWishPage, WishPage } from "./WishPage";
import { buildWireWishPage, WireWishPage } from "./WireWishPage";
import { buildCafePage, CafePage } from "./CafePage";
import { buildGiftPage, GiftPage } from "./GiftPage";
import { buildLimitedPage, LimitedPage } from "./LimitedPage";
import { goal7BadJumpToast } from "../module/goal7/tasks";
import { buildIdlePage, IdlePage } from "./IdlePage";
import { buildWireIdlePage, WireIdlePage } from "./WireIdlePage";
import { buildWireBagPage, WireBagPage } from "./WireBagPage";
import { buildWireMailPage, WireMailPage } from "./WireMailPage";
import { buildWireHeroPage, WireHeroPage } from "./WireHeroPage";
import { WIRE_BATTLE_UNSYNCED_TOAST } from "../net/protocol/wireBattle";
import { buildWireMainlinePage, WireMainlinePage } from "./WireMainlinePage";
import { WIRE_BAG_UNSYNCED_TOAST } from "../net/protocol/wireBag";
import { WIRE_HERO_UNSYNCED_TOAST } from "../net/protocol/wireHero";
import { WIRE_MAIL_UNSYNCED_TOAST } from "../net/protocol/wireMail";
import { WIRE_ACHIEVEMENT_UNSYNCED_TOAST } from "../net/protocol/wireAchievement";
import { WIRE_ACTIVITY_UNSYNCED_TOAST } from "../net/protocol/wireActivity";
import { WIRE_PVP_UNSYNCED_TOAST } from "../net/protocol/wirePvp";
import { WIRE_SEVEN_UNSYNCED_TOAST } from "../net/protocol/wireSevenDay";
import { WIRE_GOAL7_UNSYNCED_TOAST } from "../net/protocol/wireGoal7";
import { WIRE_WISH_UNSYNCED_TOAST } from "../net/protocol/wireWish";
import { WIRE_SUMMON_UNSYNCED_TOAST } from "../net/protocol/wireSummon";
import { WIRE_PROPHET_UNSYNCED_TOAST } from "../net/protocol/wireProphet";
import { WIRE_JEWEL_UNSYNCED_TOAST } from "../net/protocol/wireJewel";
import { buildMainlinePage, MainlinePage } from "./MainlinePage";
import { PanelNav } from "./PanelNav";
import { UIShell } from "./UIShell";
import { CityMapHandle, mountCityMap } from "./CityMap";
import { mountCityHubPrefab } from "./CityHub";
import { cityAtomRoute } from "./cityMapLayout";
import {
  CITY_DRAG_HINT,
  CITY_HUB_ACTIVITY_ID,
  CITY_HUB_BACK_Y,
  CITY_HUB_BUTTON_H,
  CITY_HUB_BUTTON_W,
  CITY_HUB_MORE_ID,
  CityHubEntry,
  CityHubSlot,
  cityHubEntries,
  cityHubSpots,
} from "./cityHubEntries";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

/** 默认挂 CityChrome Prefab。false 时仍走 mountCityChrome，和接 Prefab 之前一样。不改 Boot。 */
export const USE_CITY_CHROME_PREFAB = true;

/**
 * 主城中间默认挂 CityHub Prefab（map-bg-city 和建筑按钮）。
 * false 时仍走 mountCityMap。加载失败也退回 mountCityMap。不改 Boot。
 */
export const USE_CITY_HUB_PREFAB = true;

const { ccclass } = _decorator;

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE_COLOR = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const GATE_COLOR = new Color(170, 190, 170, 255);
const LOCKED_FILL = new Color(78, 84, 98, 255);
const OPEN_FILL = new Color(46, 110, 190, 255);
const IDLE_FILL = new Color(168, 116, 42, 255);
const BAG_FILL = new Color(36, 128, 96, 255);
const MAIL_FILL = new Color(110, 78, 168, 255);
const LOGIN7_FILL = new Color(156, 52, 78, 255);
const GOAL7_FILL = new Color(184, 122, 36, 255);
const SHOP_FILL = new Color(42, 108, 132, 255);
const GIFT_FILL = new Color(140, 52, 108, 255);
const LIMITED_FILL = new Color(168, 72, 48, 255);
const ACHIEVE_FILL = new Color(72, 96, 160, 255);
const BUYGOLD_FILL = new Color(176, 144, 48, 255);
const PROPHET_FILL = new Color(92, 64, 148, 255);
const JEWEL_FILL = new Color(32, 122, 118, 255);
const ILLUSTRAT_FILL = new Color(148, 92, 48, 255);
const PET_FILL = new Color(88, 132, 64, 255);
const WORLD_FILL = new Color(48, 96, 132, 255);
const PROMOTION_FILL = new Color(156, 92, 48, 255);
const FIRST_FILL = new Color(168, 56, 72, 255);
const REIKI_FILL = new Color(36, 120, 112, 255);
const ISLANDS_FILL = new Color(48, 112, 156, 255);
const TOTEMS_FILL = new Color(132, 84, 56, 255);
const ASTROLABE_FILL = new Color(88, 72, 148, 255);
const CUBE_FILL = new Color(36, 108, 128, 255);
const DRAGON_FILL = new Color(92, 64, 140, 255);
const DRAGON_COLLECTION_FILL = new Color(120, 84, 48, 255);
const TITLE_LIST_FILL = new Color(176, 132, 64, 255);
const HEAD_PORTRAIT_FILL = new Color(168, 96, 112, 255);
const BORDER_FILL = new Color(64, 96, 136, 255);
const FASHION_FILL = new Color(148, 72, 96, 255);
const WORN_FASHION_FILL = new Color(112, 84, 148, 255);
const HERO_PRAYER_FILL = new Color(176, 120, 48, 255);
const PET_ILLUSTRATE_FILL = new Color(72, 148, 88, 255);
const FETTER_FILL = new Color(148, 72, 132, 255);
const FETTER_FASHION_FILL = new Color(176, 112, 72, 255);
const SHENBIN_FILL = new Color(148, 96, 168, 255);
const OCCUPATION_FILL = new Color(72, 120, 156, 255);
const ROLE_SHENBIN_FILL = new Color(156, 108, 64, 255);
const FETTER_CONTRACT_FILL = new Color(112, 84, 148, 255);
const FORMATION_FILL = new Color(64, 108, 132, 255);
const LINEUP_FILL = new Color(48, 132, 108, 255);
const RUNNING_PROMOTION_FILL = new Color(168, 92, 48, 255);
const TOWER_REWARD_FILL = new Color(96, 72, 156, 255);
const HERO_LEVEL_RESET_TIMES_FILL = new Color(120, 64, 88, 255);
const SIGN_IN_LIST_FILL = new Color(48, 112, 72, 255);
const DAILY_TASK_LIST_FILL = new Color(88, 72, 140, 255);
const DAILY_WELFARE_LIST_FILL = new Color(140, 84, 48, 255);
const MOUTH_WELFARE_LIST_FILL = new Color(96, 64, 128, 255);
const WEEKEND_GIFT_FILL = new Color(128, 72, 48, 255);
const GOD_RELIC_FILL = new Color(72, 96, 140, 255);
const HERO_PALACE_FILL = new Color(96, 72, 120, 255);
const RECHARGE_DAYS_B_FILL = new Color(168, 96, 56, 255);
const TIME_TOWER_FILL = new Color(88, 72, 148, 255);
const SPACE_TIME_ADVENTURE_FILL = new Color(72, 120, 148, 255);
const MAGIC_TOWER_ROAD_FILL = new Color(120, 72, 96, 255);
const QI_SHEN_QI_FILL = new Color(148, 108, 48, 255);
const ZHU_SHEN_JI_TAN_FILL = new Color(104, 56, 152, 255);
const MID_FOOD_FILL = new Color(168, 96, 72, 255);
const QIU_SHANG_MING_YUE_FILL = new Color(176, 132, 88, 255);
const WAN_SHENG_LOTTERY_FILL = new Color(196, 92, 40, 255);
const HEI_WU_MISSION_FILL = new Color(120, 48, 72, 255);
const CHRISTMAS_GIFT_FILL = new Color(168, 42, 48, 255);
const SPRING_OUTING_FILL = new Color(46, 138, 86, 255);
const CHRISTMAS_MISSION_FILL = new Color(176, 42, 58, 255);
const MAGIC_TOWER_LEVEL_RANK_FILL = new Color(64, 112, 168, 255);
const SPRING_OUTING_GRID_FILL = new Color(186, 112, 64, 255);

@ccclass("MainApp")
export class MainApp extends Component {
  private shell: UIShell | null = null;
  private panels: PanelNav<Node> | null = null;
  private chrome: CityChrome | null = null;
  private built = false;
  private mainline: MainlinePage | WireMainlinePage | null = null;
  private idle: IdlePage | WireIdlePage | null = null;
  private heroList: HeroListPage | WireHeroPage | null = null;
  private heroDetail: HeroDetailPage | null = null;
  private summon: SummonPage | WireSummonPage | null = null;
  private prophet: WireProphetPage | null = null;
  private jewel: WireJewelPage | null = null;
  private illustrat: WireIllustratPage | null = null;
  private pet: WirePetPage | null = null;
  private world: WireWorldPage | null = null;
  private promotion: WirePromotionPage | null = null;
  private firstRecharge: WireFirstRechargePage | null = null;
  private reiki: WireReikiPage | null = null;
  private islands: WireIslandsPage | null = null;
  private totems: WireTotemsPage | null = null;
  private astrolabe: WireAstrolabePage | null = null;
  private tweakCube: WireTweakCubePage | null = null;
  private dragon: WireDragonPage | null = null;
  private dragonCollection: WireDragonCollectionPage | null = null;
  private titleList: WireTitlePage | null = null;
  private headPortrait: WireHeadPortraitPage | null = null;
  private borderData: WireBorderPage | null = null;
  private fashionList: WireFashionPage | null = null;
  private wornFashion: WireWornFashionPage | null = null;
  private heroPrayer: WireHeroPrayerPage | null = null;
  private petIllustrate: WirePetIllustratePage | null = null;
  private fetterData: WireFetterPage | null = null;
  private fetterFashion: WireFetterFashionPage | null = null;
  private shenBin: WireShenBinPage | null = null;
  private occupation: WireOccupationPage | null = null;
  private roleShenBin: WireRoleShenBinPage | null = null;
  private fetterContract: WireFetterContractPage | null = null;
  private formation: WireFormationPage | null = null;
  private lineUp: WireLineUpPage | null = null;
  private runningPromotion: WireRunningPromotionPage | null = null;
  private towerReward: WireTowerRewardPage | null = null;
  private heroLevelResetTimes: WireHeroLevelResetTimesPage | null = null;
  private signInList: WireSignInListPage | null = null;
  private dailyTaskList: WireDailyTaskListPage | null = null;
  private dailyWelfareList: WireDailyWelfareListPage | null = null;
  private mouthWelfareList: WireMouthWelfareListPage | null = null;
  private weekendGift: WireWeekendGiftPage | null = null;
  private godRelic: WireGodRelicPage | null = null;
  private heroPalace: WireHeroPalacePage | null = null;
  private rechargeDaysB: WireRechargeDaysBPage | null = null;
  private timeTower: WireTimeTowerPage | null = null;
  private spaceTimeAdventure: WireSpaceTimeAdventurePage | null = null;
  private magicTowerRoad: WireMagicTowerRoadPage | null = null;
  private qiShenQi: WireQiShenQiPage | null = null;
  private zhuShenJiTan: WireZhuShenJiTanPage | null = null;
  private midFood: WireMidFoodPage | null = null;
  private qiuShangMingYue: WireQiuShangMingYuePage | null = null;
  private wanShengLottery: WireWanShengLotteryPage | null = null;
  private heiWuMission: WireHeiWuMissionPage | null = null;
  private christmasGift: WireChristmasGiftPage | null = null;
  private springOuting: WireSpringOutingPage | null = null;
  private christmasMission: WireChristmasMissionPage | null = null;
  private magicTowerLevelRank: WireMagicTowerLevelRankPage | null = null;
  private springOutingGrid: WireSpringOutingGridPage | null = null;
  private bag: BagPage | WireBagPage | null = null;
  private mail: MailPage | WireMailPage | null = null;
  private smith: SmithPage | null = null;
  private arena: ArenaPage | WirePvpPage | null = null;
  private tower: TowerPage | null = null;
  private daily: DailyGoldPage | null = null;
  private login7: Login7Page | WireSevenDayPage | null = null;
  private goal7: Goal7Page | WireGoal7Page | null = null;
  private buyGold: WireActivityPage | null = null;
  private achieve: WireAchievementPage | null = null;
  private shop: ShopPage | null = null;
  private wish: WishPage | WireWishPage | null = null;
  private cafe: CafePage | null = null;
  private gift: GiftPage | null = null;
  private limited: LimitedPage | null = null;
  private selectedHeroId = 0;
  private heroListTicket = 0;
  private heroDetailTicket = 0;
  private summonTicket = 0;
  private gateNode: Node | null = null;
  private mainButton: Node | null = null;
  private cityMap: CityMapHandle | null = null;
  private logLabel: Node | null = null;
  private offLog: (() => void) | null = null;
  private offWire: (() => void) | null = null;
  private netState: NetState = NetClient.shared.state;

  start() {
    if (this.built) return;
    this.built = true;
    void this.build();
  }

  onDestroy() {
    if (this.cityMap) {
      this.cityMap.dispose();
      this.cityMap = null;
    }
    this.detachWire();
    this.detachLog();
    this.mainline?.dispose();
    this.mainline = null;
    this.idle?.dispose();
    this.idle = null;
    this.heroList?.dispose();
    this.heroList = null;
    this.heroDetail?.dispose();
    this.heroDetail = null;
    this.summon?.dispose();
    this.summon = null;
    this.prophet?.dispose();
    this.prophet = null;
    this.jewel?.dispose();
    this.jewel = null;
    this.illustrat?.dispose();
    this.illustrat = null;
    this.pet?.dispose();
    this.pet = null;
    this.world?.dispose();
    this.world = null;
    this.promotion?.dispose();
    this.promotion = null;
    this.firstRecharge?.dispose();
    this.firstRecharge = null;
    this.reiki?.dispose();
    this.reiki = null;
    this.islands?.dispose();
    this.islands = null;
    this.totems?.dispose();
    this.totems = null;
    this.astrolabe?.dispose();
    this.astrolabe = null;
    this.tweakCube?.dispose();
    this.tweakCube = null;
    this.dragon?.dispose();
    this.dragon = null;
    this.dragonCollection?.dispose();
    this.dragonCollection = null;
    this.titleList?.dispose();
    this.titleList = null;
    this.headPortrait?.dispose();
    this.headPortrait = null;
    this.borderData?.dispose();
    this.borderData = null;
    this.fashionList?.dispose();
    this.fashionList = null;
    this.wornFashion?.dispose();
    this.wornFashion = null;
    this.heroPrayer?.dispose();
    this.heroPrayer = null;
    this.petIllustrate?.dispose();
    this.petIllustrate = null;
    this.fetterData?.dispose();
    this.fetterData = null;
    this.fetterFashion?.dispose();
    this.fetterFashion = null;
    this.shenBin?.dispose();
    this.shenBin = null;
    this.occupation?.dispose();
    this.occupation = null;
    this.roleShenBin?.dispose();
    this.roleShenBin = null;
    this.fetterContract?.dispose();
    this.fetterContract = null;
    this.formation?.dispose();
    this.formation = null;
    this.lineUp?.dispose();
    this.lineUp = null;
    this.runningPromotion?.dispose();
    this.runningPromotion = null;
    this.towerReward?.dispose();
    this.towerReward = null;
    this.heroLevelResetTimes?.dispose();
    this.heroLevelResetTimes = null;
    this.signInList?.dispose();
    this.signInList = null;
    this.dailyTaskList?.dispose();
    this.dailyTaskList = null;
    this.dailyWelfareList?.dispose();
    this.dailyWelfareList = null;
    this.mouthWelfareList?.dispose();
    this.mouthWelfareList = null;
    this.weekendGift?.dispose();
    this.weekendGift = null;
    this.godRelic?.dispose();
    this.godRelic = null;
    this.heroPalace?.dispose();
    this.heroPalace = null;
    this.rechargeDaysB?.dispose();
    this.rechargeDaysB = null;
    this.timeTower?.dispose();
    this.timeTower = null;
    this.spaceTimeAdventure?.dispose();
    this.spaceTimeAdventure = null;
    this.magicTowerRoad?.dispose();
    this.magicTowerRoad = null;
    this.qiShenQi?.dispose();
    this.qiShenQi = null;
    this.zhuShenJiTan?.dispose();
    this.zhuShenJiTan = null;
    this.midFood?.dispose();
    this.midFood = null;
    this.qiuShangMingYue?.dispose();
    this.qiuShangMingYue = null;
    this.wanShengLottery?.dispose();
    this.wanShengLottery = null;
    this.heiWuMission?.dispose();
    this.heiWuMission = null;
    this.christmasGift?.dispose();
    this.christmasGift = null;
    this.springOuting?.dispose();
    this.springOuting = null;
    this.christmasMission?.dispose();
    this.christmasMission = null;
    this.magicTowerLevelRank?.dispose();
    this.magicTowerLevelRank = null;
    this.springOutingGrid?.dispose();
    this.springOutingGrid = null;
    this.bag?.dispose();
    this.bag = null;
    this.mail?.dispose();
    this.mail = null;
    this.smith?.dispose();
    this.smith = null;
    this.arena?.dispose();
    this.arena = null;
    this.tower?.dispose();
    this.tower = null;
    this.daily?.dispose();
    this.daily = null;
    this.login7?.dispose();
    this.login7 = null;
    this.buyGold?.dispose();
    this.buyGold = null;
    this.achieve?.dispose();
    this.achieve = null;
    this.goal7?.dispose();
    this.goal7 = null;
    this.shop?.dispose();
    this.shop = null;
    this.wish?.dispose();
    this.wish = null;
    this.cafe?.dispose();
    this.cafe = null;
    this.gift?.dispose();
    this.gift = null;
    this.limited?.dispose();
    this.limited = null;
    this.shell?.dispose();
  }

  private async build(): Promise<void> {
    const canvas = this.resolveCanvas();
    this.shell = UIShell.mount(canvas);
    if (!ConfigDb.current) {
      try {
        await ConfigLoader.loadAll();
      } catch (err) {
        GameLog.shared.error("MainApp", "config load failed " + messageOf(err));
      }
    }
    if (!this.isValid || !this.shell) return;
    const shell = this.shell;
    const onTab = (id: string) => this.onTab(id);
    if (!USE_CITY_CHROME_PREFAB) {
      this.chrome = mountCityChrome(shell.chromeLayer, onTab);
    } else {
      try {
        this.chrome = await mountCityChromePrefab(shell.chromeLayer, onTab, {
          openActivity: () => this.openChild(CITY_HUB_ACTIVITY_ID),
          openMore: () => this.openChild(CITY_HUB_MORE_ID),
          openMail: () => this.openMail(),
        });
        if (!this.isValid || !this.shell) {
          if (this.chrome) this.chrome.root.destroy();
          this.chrome = null;
          return;
        }
        GameLog.shared.info("MainApp", "city chrome prefab " + CITY_CHROME_PREFAB_PATH);
      } catch (err) {
        if (!this.isValid || !this.shell) return;
        GameLog.shared.error("MainApp", "city chrome prefab " + messageOf(err) + "，改用代码 UI");
        this.chrome = mountCityChrome(shell.chromeLayer, onTab);
      }
    }
    this.panels = new PanelNav<Node>(
      shell,
      (id) => this.presentPage(id),
      (id) => this.noteClose(id)
    );
    this.panels.start(this.buildCity());
    this.detachWire();
    this.offWire = WireSession.onSync(() => {
      if (!this.isValid) return;
      this.refreshHub();
    });
    this.refreshHub();
    const goldText = Session.source === "wire" && !Session.wireSync.gold ? "未同步" : String(Session.gold);
    const diamondText = Session.source === "wire" && !Session.wireSync.diamond ? "未同步" : String(Session.diamond);
    GameLog.shared.info(
      "MainApp",
      "city ready account=" +
        (Session.account || "(none)") +
        " role=" +
        (Session.role?.name || "(none)") +
        " server=" +
        formatServerLabel() +
        " gold=" +
        goldText +
        " diamond=" +
        diamondText +
        " source=" +
        Session.source
    );
  }

  private onTab(id: string): void {
    if (id === "battle") {
      this.openMainline();
      return;
    }
    if (id === "dungeon") {
      if (!this.allow("daily")) return;
      this.openChild("daily");
      return;
    }
    if (id === "clan" || id === "fetter") {
      if (!this.allow(id)) return;
      this.openChild(id);
      return;
    }
    if (id === "bag") {
      this.openChild(id);
      return;
    }
    GameLog.shared.info("MainApp", "tab " + id);
    if (this.blockWirePage(id)) return;
    if (!this.allow(id)) return;
    if ((id === "hero" || id === "summon") && Session.source === "wire") {
      // 英雄名册在本地快照里。未同步由 blockWirePage 拦。打开不看 net.state。
      if (id === "summon") {
        const net = this.cityNet();
        if (net.state !== "connected") {
          this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
          return;
        }
      }
    } else if ((id === "hero" || id === "summon" || id === "smith") && !this.ensureNet()) return;
    this.panels?.openRoot(id);
    this.refreshChrome();
  }

  private openChild(id: string): void {
    GameLog.shared.info("MainApp", "open " + id);
    if (this.blockWirePage(id)) return;
    if (!(Session.source === "wire" && (id === "arena" || id === "wish")) && !this.allow(id)) return;
    if (Session.source === "wire" && (id === "mail" || id === "buygold" || id === "achieve" || id === "prophet" || id === "jewel" || id === "illustrat" || id === "pet" || id === "world" || id === "promotion" || id === "firstRecharge" || id === "reiki" || id === "islands" || id === "totems" || id === "astrolabe" || id === "tweakCube" || id === "dragon" || id === "dragonCollection" || id === "titleList" || id === "headPortrait" || id === "borderData" || id === "fashionList" || id === "wornFashion" || id === "heroPrayer" || id === "petIllustrate" || id === "fetterData" || id === "fetterFashion" || id === "shenBin" || id === "occupation" || id === "roleShenBin" || id === "fetterContract" || id === "formation" || id === "lineUp" || id === "runningPromotion" || id === "towerReward" || id === "heroLevelResetTimes" || id === "signInList" || id === "dailyTaskList" || id === "dailyWelfareList" || id === "mouthWelfareList" || id === "weekendGift" || id === "godRelic" || id === "heroPalace" || id === "rechargeDaysB" || id === "timeTower" || id === "spaceTimeAdventure" || id === "magicTowerRoad" || id === "qiShenQi" || id === "zhuShenJiTan" || id === "midFood" || id === "qiuShangMingYue" || id === "wanShengLottery" || id === "heiWuMission" || id === "christmasGift" || id === "springOuting" || id === "christmasMission" || id === "magicTowerLevelRank" || id === "springOutingGrid" || id === "arena" || id === "login7" || id === "goal7" || id === "wish")) {
      const net = this.cityNet();
      if (net.state !== "connected") {
        this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
        return;
      }
    }
    if (
      Session.source !== "wire" &&
      (id === "arena" || id === "tower" || id === "daily" || id === "login7" || id === "goal7" || id === "wish" || id === "cafe" || id === "gift" || id === "limited") &&
      !this.ensureNet()
    ) {
      return;
    }
    this.panels?.openChild(id);
    this.refreshChrome();
  }

  private back(): void {
    const closed = this.panels?.back() === true;
    if (!closed) return;
    GameLog.shared.info("MainApp", "back to " + (this.panels?.current || ""));
    if (this.panels?.current === "goal7") this.goal7?.reload();
    if (this.panels?.current === "wish") this.wish?.reload();
    this.refreshChrome();
  }

  /** 未开启只 Toast，不压页面。没有登记的页面（日志）直接放行。 */
  private allow(id: string): boolean {
    const entry = findNavEntry(id);
    if (!entry) return true;
    const access = entryAccess(entry, this.level(), this.day(), ConfigDb.current);
    if (access.open) return true;
    GameLog.shared.info("MainApp", "locked " + id);
    this.shell?.showToast(access.hint, 2200);
    return false;
  }

  /**
   * 原来的页面仍由 buildPage 做。壳加载失败时页面不动。主城不盖壳。
   * 底栏「战斗」自己铺挂机站场，不先画探针，也不等 BattlePanelLayer 才盖住探针。
   * ?dev=wire 才留着探针，并且不再盖挂机壳。
   */
  private presentPage(id: string): Node {
    const page = this.buildPage(id);
    if (id === "mainline") {
      if (!this.battleTabIsProbe()) void mountHangBattleShell(page);
      return page;
    }
    if (USE_PAGE_PREFAB_SHELL && id !== CITY_TAB) void attachPagePrefabShell(page, id);
    return page;
  }

  /** 真服且地址带 ?dev=wire。不改连接，Mock 仍只认 ?dev=mock。 */
  private battleTabIsProbe(): boolean {
    return Session.source === "wire" && wireDebugEnabled();
  }

  private buildPage(id: string): Node {
    if (id === "mainline") return this.mountMainline();
    if (id === "idle") return this.mountIdle();
    if (id === "hero") return this.mountHeroList();
    if (id === "hero-detail") return this.mountHeroDetail();
    if (id === "summon") return this.mountSummon();
    if (id === "prophet") return this.mountProphet();
    if (id === "jewel") return this.mountJewel();
    if (id === "illustrat") return this.mountIllustrat();
    if (id === "pet") return this.mountPet();
    if (id === "world") return this.mountWorld();
    if (id === "promotion") return this.mountPromotion();
    if (id === "firstRecharge") return this.mountFirstRecharge();
    if (id === "reiki") return this.mountReiki();
    if (id === "islands") return this.mountIslands();
    if (id === "totems") return this.mountTotems();
    if (id === "astrolabe") return this.mountAstrolabe();
    if (id === "tweakCube") return this.mountTweakCube();
    if (id === "dragon") return this.mountDragon();
    if (id === "dragonCollection") return this.mountDragonCollection();
    if (id === "titleList") return this.mountTitleList();
    if (id === "headPortrait") return this.mountHeadPortrait();
    if (id === "borderData") return this.mountBorder();
    if (id === "fashionList") return this.mountFashion();
    if (id === "wornFashion") return this.mountWornFashion();
    if (id === "heroPrayer") return this.mountHeroPrayer();
    if (id === "petIllustrate") return this.mountPetIllustrate();
    if (id === "fetterData") return this.mountFetter();
    if (id === "fetterFashion") return this.mountFetterFashion();
    if (id === "shenBin") return this.mountShenBin();
    if (id === "occupation") return this.mountOccupation();
    if (id === "roleShenBin") return this.mountRoleShenBin();
    if (id === "fetterContract") return this.mountFetterContract();
    if (id === "formation") return this.mountFormation();
    if (id === "lineUp") return this.mountLineUp();
    if (id === "runningPromotion") return this.mountRunningPromotion();
    if (id === "towerReward") return this.mountTowerReward();
    if (id === "heroLevelResetTimes") return this.mountHeroLevelResetTimes();
    if (id === "signInList") return this.mountSignInList();
    if (id === "dailyTaskList") return this.mountDailyTaskList();
    if (id === "dailyWelfareList") return this.mountDailyWelfareList();
    if (id === "mouthWelfareList") return this.mountMouthWelfareList();
    if (id === "weekendGift") return this.mountWeekendGift();
    if (id === "godRelic") return this.mountGodRelic();
    if (id === "heroPalace") return this.mountHeroPalace();
    if (id === "rechargeDaysB") return this.mountRechargeDaysB();
    if (id === "timeTower") return this.mountTimeTower();
    if (id === "spaceTimeAdventure") return this.mountSpaceTimeAdventure();
    if (id === "magicTowerRoad") return this.mountMagicTowerRoad();
    if (id === "qiShenQi") return this.mountQiShenQi();
    if (id === "zhuShenJiTan") return this.mountZhuShenJiTan();
    if (id === "midFood") return this.mountMidFood();
    if (id === "qiuShangMingYue") return this.mountQiuShangMingYue();
    if (id === "wanShengLottery") return this.mountWanShengLottery();
    if (id === "heiWuMission") return this.mountHeiWuMission();
    if (id === "christmasGift") return this.mountChristmasGift();
    if (id === "springOuting") return this.mountSpringOuting();
    if (id === "christmasMission") return this.mountChristmasMission();
    if (id === "magicTowerLevelRank") return this.mountMagicTowerLevelRank();
    if (id === "springOutingGrid") return this.mountSpringOutingGrid();
    if (id === "bag") return this.mountBag();
    if (id === "mail") return this.mountMail();
    if (id === "smith") return this.mountSmith();
    if (id === "arena") return this.mountArena();
    if (id === "tower") return this.mountTower();
    if (id === "daily") return this.mountDaily();
    if (id === "login7") return this.mountLogin7();
    if (id === "goal7") return this.mountGoal7();
    if (id === "buygold") return this.mountBuyGold();
    if (id === "achieve") return this.mountAchievement();
    if (id === "shop") return this.mountShop();
    if (id === "wish") return this.mountWish();
    if (id === "cafe") return this.mountCafe();
    if (id === "gift") return this.mountGift();
    if (id === "limited") return this.mountLimited();
    if (id === CITY_HUB_ACTIVITY_ID) return this.buildCityHub("activity");
    if (id === CITY_HUB_MORE_ID) return this.buildCityHub("more");
    if (id === "plays") return this.buildPlays();
    if (id === "log") return this.buildLog();
    const entry = findNavEntry(id);
    return this.buildPlaceholder(entry, id);
  }

  private buildCity(): Node {
    const page = this.pageRoot("CityPage");
    const pageUi = page.getComponent(UITransform) || page.addComponent(UITransform);
    pageUi.setContentSize(720, 1280);
    pageUi.setAnchorPoint(0.5, 0.5);
    const mapHost = uiNode("CityMapHost");
    const hostUi = mapHost.addComponent(UITransform);
    hostUi.setContentSize(720, 1280);
    hostUi.setAnchorPoint(0.5, 0.5);
    mapHost.setPosition(0, 0, 0);
    mapHost.parent = page;
    if (!USE_CITY_HUB_PREFAB) {
      void this.mountCityMap(mapHost);
    } else {
      void this.mountCityHub(mapHost);
    }

    place(createLabel(CITY_DRAG_HINT, 16, { color: MUTED, width: 420 }), page, -120, 360);
    this.gateNode = place(
      createLabel(this.gateText(), 16, { color: GATE_COLOR, width: 680, height: 28 }),
      page,
      0,
      328
    );

    // 活动 / 更多入口在 CityChrome Prefab（ActGroup、UtilityRow/BtnMore）。这里不再画红蓝矩形。

    const net = this.cityNet();
    this.netState = net.state;
    const netNode = createLabel("网络 " + net.state, 16, {
      color: new Color(160, 180, 210, 255),
      width: 220,
    });
    place(netNode, page, 230, 360);
    net.onState((state) => {
      if (!this.isValid) return;
      if (netNode.isValid) setText(netNode, "网络 " + state);
      // 放弃重连时会先经过 reconnecting，再进 connecting，最后 closed。
      // 主城「断开提示」是从 connected 直接到 closed，Toast 由按钮自己发。
      if (state === "closed" && (this.netState === "reconnecting" || this.netState === "connecting")) {
        this.shell?.showToast(errorText(ErrorCode.NET_CLOSED), 2200);
      }
      this.netState = state;
    });
    mapHost.setSiblingIndex(Math.max(0, page.children.length - 1));
    return page;
  }

  /**
   * 「活动」或「更多」。按钮来自 cityHubEntries，不在主屏铺开。
   * 点进去仍走原来的 open*，真服 Toast 和门槛不变。
   */
  private buildCityHub(slot: CityHubSlot): Node {
    const page = this.pageRoot(slot === "activity" ? "CityActivityPage" : "CityMorePage");
    const title = slot === "activity" ? "活动" : "更多";
    place(createLabel(title, 36, { color: TITLE_COLOR }), page, 0, 470);
    place(
      createLabel(
        slot === "activity"
          ? "活动只读入口。新的只读活动挂这里，不铺主屏。"
          : "系统和数据入口。拿不准的只读钮挂这里，不铺主屏。",
        16,
        { color: MUTED, width: 640 }
      ),
      page,
      0,
      428
    );
    const entries = cityHubEntries(slot);
    const spots = cityHubSpots(entries.length);
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const spot = spots[i];
      const text = entry.dynamic === "mainline" ? this.stageButtonText() : entry.title;
      const button = createButton(
        text,
        () => this.openCityHubEntry(entry),
        CITY_HUB_BUTTON_W,
        CITY_HUB_BUTTON_H,
        this.hubFill(entry.id),
        14
      );
      button.name = "hub-" + entry.id;
      place(button, page, spot.x, spot.y);
      if (entry.dynamic === "mainline") this.mainButton = button;
    }
    place(createButton("返回", () => this.back(), 220, 48), page, 0, CITY_HUB_BACK_Y);
    return page;
  }

  /** 面板里的入口。已有 open* 的走原来的；以后新登记的 id 默认 openChild。 */
  private openCityHubEntry(entry: CityHubEntry): void {
    if (entry.action === "notice") {
      GameLog.shared.info("MainApp", "click notice");
      this.shell?.enqueuePopup("notice", this.buildPopup("公告", "弹窗队列 1/2"));
      this.shell?.enqueuePopup("notice-next", this.buildPopup("后续", "关闭上一张后出现"));
      this.shell?.showToast("公告已入队");
      return;
    }
    if (entry.action === "simulateDrop") {
      GameLog.shared.info("MainApp", "click net-drop");
      if (Session.source === "wire") {
        this.shell?.showToast("真服连接留着。这颗按钮只模拟 Mock 断线", 2200);
        return;
      }
      this.cityNet().simulateDrop();
      this.shell?.showToast("已模拟断线");
      return;
    }
    const id = entry.id;
    if (id === "mainline") {
      this.openMainline();
      return;
    }
    if (id === "idle") {
      this.openIdle();
      return;
    }
    if (id === "bag") {
      this.openBag();
      return;
    }
    if (id === "mail") {
      this.openMail();
      return;
    }
    if (id === "log") {
      this.openChild("log");
      return;
    }
    if (id === "login7") {
      this.openLogin7();
      return;
    }
    if (id === "goal7") {
      this.openGoal7();
      return;
    }
    if (id === "shop") {
      this.openShop();
      return;
    }
    if (id === "gift") {
      this.openGift();
      return;
    }
    if (id === "limited") {
      this.openLimited();
      return;
    }
    if (id === "achieve") {
      this.openAchievement();
      return;
    }
    if (id === "buygold") {
      this.openBuyGold();
      return;
    }
    if (id === "prophet") {
      this.openProphet();
      return;
    }
    if (id === "jewel") {
      this.openJewel();
      return;
    }
    if (id === "illustrat") {
      this.openIllustrat();
      return;
    }
    if (id === "pet") {
      this.openPet();
      return;
    }
    if (id === "world") {
      this.openWorld();
      return;
    }
    if (id === "promotion") {
      this.openPromotion();
      return;
    }
    if (id === "firstRecharge") {
      this.openFirstRecharge();
      return;
    }
    if (id === "reiki") {
      this.openReiki();
      return;
    }
    if (id === "islands") {
      this.openIslands();
      return;
    }
    if (id === "totems") {
      this.openTotems();
      return;
    }
    if (id === "astrolabe") {
      this.openAstrolabe();
      return;
    }
    if (id === "tweakCube") {
      this.openTweakCube();
      return;
    }
    if (id === "dragon") {
      this.openDragon();
      return;
    }
    if (id === "dragonCollection") {
      this.openDragonCollection();
      return;
    }
    if (id === "titleList") {
      this.openTitleList();
      return;
    }
    if (id === "headPortrait") {
      this.openHeadPortrait();
      return;
    }
    if (id === "borderData") {
      this.openBorder();
      return;
    }
    if (id === "fashionList") {
      this.openFashion();
      return;
    }
    if (id === "wornFashion") {
      this.openWornFashion();
      return;
    }
    if (id === "heroPrayer") {
      this.openHeroPrayer();
      return;
    }
    if (id === "petIllustrate") {
      this.openPetIllustrate();
      return;
    }
    if (id === "fetterData") {
      this.openFetter();
      return;
    }
    if (id === "fetterFashion") {
      this.openFetterFashion();
      return;
    }
    if (id === "shenBin") {
      this.openShenBin();
      return;
    }
    if (id === "occupation") {
      this.openOccupation();
      return;
    }
    if (id === "roleShenBin") {
      this.openRoleShenBin();
      return;
    }
    if (id === "fetterContract") {
      this.openFetterContract();
      return;
    }
    if (id === "formation") {
      this.openFormation();
      return;
    }
    if (id === "lineUp") {
      this.openLineUp();
      return;
    }
    if (id === "runningPromotion") {
      this.openRunningPromotion();
      return;
    }
    if (id === "towerReward") {
      this.openTowerReward();
      return;
    }
    if (id === "heroLevelResetTimes") {
      this.openHeroLevelResetTimes();
      return;
    }
    if (id === "signInList") {
      this.openSignInList();
      return;
    }
    if (id === "dailyTaskList") {
      this.openDailyTaskList();
      return;
    }
    if (id === "dailyWelfareList") {
      this.openDailyWelfareList();
      return;
    }
    if (id === "mouthWelfareList") {
      this.openMouthWelfareList();
      return;
    }
    if (id === "weekendGift") {
      this.openWeekendGift();
      return;
    }
    if (id === "godRelic") {
      this.openGodRelic();
      return;
    }
    if (id === "heroPalace") {
      this.openHeroPalace();
      return;
    }
    if (id === "rechargeDaysB") {
      this.openRechargeDaysB();
      return;
    }
    if (id === "timeTower") {
      this.openTimeTower();
      return;
    }
    if (id === "spaceTimeAdventure") {
      this.openSpaceTimeAdventure();
      return;
    }
    if (id === "magicTowerRoad") {
      this.openMagicTowerRoad();
      return;
    }
    if (id === "qiShenQi") {
      this.openQiShenQi();
      return;
    }
    if (id === "zhuShenJiTan") {
      this.openZhuShenJiTan();
      return;
    }
    if (id === "midFood") {
      this.openMidFood();
      return;
    }
    if (id === "qiuShangMingYue") {
      this.openQiuShangMingYue();
      return;
    }
    if (id === "wanShengLottery") {
      this.openWanShengLottery();
      return;
    }
    if (id === "heiWuMission") {
      this.openHeiWuMission();
      return;
    }
    if (id === "christmasGift") {
      this.openChristmasGift();
      return;
    }
    if (id === "springOuting") {
      this.openSpringOuting();
      return;
    }
    if (id === "christmasMission") {
      this.openChristmasMission();
      return;
    }
    if (id === "magicTowerLevelRank") {
      this.openMagicTowerLevelRank();
      return;
    }
    if (id === "springOutingGrid") {
      this.openSpringOutingGrid();
      return;
    }
    this.openChild(id);
  }

  /** 面板按钮沿用原来的底色。没登记的用蓝色。 */
  private hubFill(id: string): Color {
    if (id === "mainline") return OPEN_FILL;
    if (id === "idle") return IDLE_FILL;
    if (id === "bag") return BAG_FILL;
    if (id === "mail") return MAIL_FILL;
    if (id === "login7") return LOGIN7_FILL;
    if (id === "goal7") return GOAL7_FILL;
    if (id === "shop") return SHOP_FILL;
    if (id === "gift") return GIFT_FILL;
    if (id === "limited") return LIMITED_FILL;
    if (id === "achieve") return ACHIEVE_FILL;
    if (id === "buygold") return BUYGOLD_FILL;
    if (id === "prophet") return PROPHET_FILL;
    if (id === "jewel") return JEWEL_FILL;
    if (id === "illustrat") return ILLUSTRAT_FILL;
    if (id === "pet") return PET_FILL;
    if (id === "world") return WORLD_FILL;
    if (id === "promotion") return PROMOTION_FILL;
    if (id === "firstRecharge") return FIRST_FILL;
    if (id === "reiki") return REIKI_FILL;
    if (id === "islands") return ISLANDS_FILL;
    if (id === "totems") return TOTEMS_FILL;
    if (id === "astrolabe") return ASTROLABE_FILL;
    if (id === "tweakCube") return CUBE_FILL;
    if (id === "dragon") return DRAGON_FILL;
    if (id === "dragonCollection") return DRAGON_COLLECTION_FILL;
    if (id === "titleList") return TITLE_LIST_FILL;
    if (id === "headPortrait") return HEAD_PORTRAIT_FILL;
    if (id === "borderData") return BORDER_FILL;
    if (id === "fashionList") return FASHION_FILL;
    if (id === "wornFashion") return WORN_FASHION_FILL;
    if (id === "heroPrayer") return HERO_PRAYER_FILL;
    if (id === "petIllustrate") return PET_ILLUSTRATE_FILL;
    if (id === "fetterData") return FETTER_FILL;
    if (id === "fetterFashion") return FETTER_FASHION_FILL;
    if (id === "shenBin") return SHENBIN_FILL;
    if (id === "occupation") return OCCUPATION_FILL;
    if (id === "roleShenBin") return ROLE_SHENBIN_FILL;
    if (id === "fetterContract") return FETTER_CONTRACT_FILL;
    if (id === "formation") return FORMATION_FILL;
    if (id === "lineUp") return LINEUP_FILL;
    if (id === "runningPromotion") return RUNNING_PROMOTION_FILL;
    if (id === "towerReward") return TOWER_REWARD_FILL;
    if (id === "heroLevelResetTimes") return HERO_LEVEL_RESET_TIMES_FILL;
    if (id === "signInList") return SIGN_IN_LIST_FILL;
    if (id === "dailyTaskList") return DAILY_TASK_LIST_FILL;
    if (id === "dailyWelfareList") return DAILY_WELFARE_LIST_FILL;
    if (id === "mouthWelfareList") return MOUTH_WELFARE_LIST_FILL;
    if (id === "weekendGift") return WEEKEND_GIFT_FILL;
    if (id === "godRelic") return GOD_RELIC_FILL;
    if (id === "heroPalace") return HERO_PALACE_FILL;
    if (id === "rechargeDaysB") return RECHARGE_DAYS_B_FILL;
    if (id === "timeTower") return TIME_TOWER_FILL;
    if (id === "spaceTimeAdventure") return SPACE_TIME_ADVENTURE_FILL;
    if (id === "magicTowerRoad") return MAGIC_TOWER_ROAD_FILL;
    if (id === "qiShenQi") return QI_SHEN_QI_FILL;
    if (id === "zhuShenJiTan") return ZHU_SHEN_JI_TAN_FILL;
    if (id === "midFood") return MID_FOOD_FILL;
    if (id === "qiuShangMingYue") return QIU_SHANG_MING_YUE_FILL;
    if (id === "wanShengLottery") return WAN_SHENG_LOTTERY_FILL;
    if (id === "heiWuMission") return HEI_WU_MISSION_FILL;
    if (id === "christmasGift") return CHRISTMAS_GIFT_FILL;
    if (id === "springOuting") return SPRING_OUTING_FILL;
    if (id === "christmasMission") return CHRISTMAS_MISSION_FILL;
    if (id === "magicTowerLevelRank") return MAGIC_TOWER_LEVEL_RANK_FILL;
    if (id === "springOutingGrid") return SPRING_OUTING_GRID_FILL;
    return OPEN_FILL;
  }

  /**
   * CityHub Prefab 铺满主城中间。失败时退回代码地图，不留空画面。
   * BtnMainline 走原来的 openMainline，挑战仍进已经接上的主线页。
   */
  private async mountCityHub(host: Node): Promise<void> {
    try {
      const handle = await mountCityHubPrefab(
        host,
        (atom) => this.onCityAtom(atom),
        () => this.openMainline(),
        {
          level: () => this.level(),
          openDay: () => this.day(),
          db: () => ConfigDb.current,
        }
      );
      if (!this.isValid || !host.isValid) {
        handle.dispose();
        handle.root.destroy();
        return;
      }
      this.cityMap = handle;
      if (handle.mainButton) this.mainButton = handle.mainButton;
      this.setMainButton(this.stageButtonText());
      if (host.isValid && host.parent) host.setSiblingIndex(Math.max(0, host.parent.children.length - 1));
    } catch (err) {
      GameLog.shared.error("MainApp", "city hub prefab " + messageOf(err) + "，改用代码 UI");
      if (!this.isValid || !host.isValid) return;
      await this.mountCityMap(host);
    }
  }

  /** 地图加载失败时主城按钮还在，不挡住进页面。 */
  private async mountCityMap(host: Node): Promise<void> {
    try {
      const handle = await mountCityMap(host, (atom) => this.onCityAtom(atom), {
        level: () => this.level(),
        openDay: () => this.day(),
        db: () => ConfigDb.current,
      });
      if (!this.isValid || !host.isValid) {
        handle.dispose();
        handle.root.destroy();
        return;
      }
      this.cityMap = handle;
      if (host.isValid && host.parent) host.setSiblingIndex(Math.max(0, host.parent.children.length - 1));
    } catch (err) {
      GameLog.shared.error("MainApp", "city map " + messageOf(err));
    }
  }

  /**
   * 建筑和活动图标。能对上的走原来的 onTab / open*，这样真服 Toast 和门槛还在。
   * 对不上的压进 PanelNav，Mock 出占位页，真服仍是「还没接」。
   */
  private onCityAtom(atom: string): void {
    GameLog.shared.info("MainApp", "city " + atom);
    const route = cityAtomRoute(atom);
    if (!route) {
      this.openChild(atom);
      return;
    }
    if (route.via === "tab") {
      this.onTab(route.panel);
      return;
    }
    if (route.panel === "shop") {
      this.openShop();
      return;
    }
    if (route.panel === "prophet") {
      this.openProphet();
      return;
    }
    if (route.panel === "login7") {
      this.openLogin7();
      return;
    }
    if (route.panel === "goal7") {
      this.openGoal7();
      return;
    }
    if (route.panel === "gift") {
      this.openGift();
      return;
    }
    if (route.panel === "limited") {
      this.openLimited();
      return;
    }
    this.openChild(route.panel);
  }

  private buildPlays(): Node {
    const page = this.pageRoot("PlaysPage");
    place(createLabel("玩法", 40, { color: TITLE_COLOR }), page, 0, 460);
    place(createLabel("未开启的仍列在这里", 18, { color: MUTED }), page, 0, 410);
    const top = 330;
    const step = 40;
    for (let i = 0; i < PLAY_ENTRIES.length; i++) {
      const entry = PLAY_ENTRIES[i];
      const access =
        Session.source === "wire" && (entry.id === "arena" || entry.id === "wish")
          ? { open: true, hint: "" }
          : entryAccess(entry, this.level(), this.day(), ConfigDb.current);
      const button = createButton(
        tabLabel(entry.title, access.open),
        () => this.openChild(entry.id),
        520,
        40,
        access.open ? OPEN_FILL : LOCKED_FILL,
        20
      );
      place(button, page, 0, top - i * step);
    }
    place(createButton("返回", () => this.back(), 220, 48), page, 0, -340);
    return page;
  }

  private buildPlaceholder(entry: NavEntry | null, id: string): Node {
    const title = entry ? entry.title : id;
    const blurb = entry ? entry.blurb : "占位";
    const page = this.pageRoot("Panel-" + id);
    place(createLabel(title, 40, { color: TITLE_COLOR }), page, 0, 80);
    place(createLabel(blurb, 22, { color: MUTED, width: 560 }), page, 0, 16);
    place(createButton("返回", () => this.back(), 220, 52), page, 0, -70);
    return page;
  }

  /** 国服底栏高亮。战斗看主线页，副本看日常副本，不跟导航根的五项混。 */
  private barSelected(id: string, current: string, root: string): boolean {
    if (id === "city") return current === CITY_TAB;
    if (id === "hero") return current === "hero" || current === "hero-detail" || root === "hero";
    if (id === "bag") return current === "bag";
    if (id === "battle") return current === "mainline";
    if (id === "dungeon") return current === "daily";
    if (id === "clan") return current === "clan";
    if (id === "fetter") return current === "fetter" || current === "fetterData" || current === "fetterFashion";
    return false;
  }

  private refreshChrome(): void {
    const chrome = this.chrome;
    if (!chrome) return;
    chrome.setIdentity(formatNameLine(), formatSubLine());
    chrome.setCurrencies(formatGoldLine(), formatDiamondLine());
    chrome.setPower(formatCombatPower());
    chrome.setLevelBadge(formatLevelBadge());
    chrome.setAvatar(formatAvatarIcon());
    const current = this.panels?.current || "";
    const root = this.panels?.rootTab || CITY_TAB;
    const tabs: TabState[] = [];
    for (let i = 0; i < CITY_BAR.length; i++) {
      const tab = CITY_BAR[i];
      const access = entryAccess(tab, this.level(), this.day(), ConfigDb.current);
      const state = !access.open ? "locked" : this.barSelected(tab.id, current, root) ? "selected" : "open";
      const lockLevel = access.open ? 0 : entryLockLevel(tab, ConfigDb.current);
      tabs.push({ id: tab.id, text: tab.title, state, lockLevel });
    }
    chrome.setTabs(tabs);
    chrome.setCityExtras(this.panels?.current === CITY_TAB);
  }

  private refreshHub(): void {
    if (this.gateNode && this.gateNode.isValid) setText(this.gateNode, this.gateText());
    this.setMainButton(this.stageButtonText());
    if (this.cityMap) this.cityMap.refreshLocks();
    this.refreshChrome();
  }

  /** 打开挂机站场。Mock 的挑战在 MainlinePage。真服点中间「战斗」发 3001。?dev=wire 才是探针页。 */
  private openMainline(): void {
    GameLog.shared.info("MainApp", "click mainline");
    if (Session.source === "wire") {
      this.openWireMainline();
      return;
    }
    if (this.blockWirePage("mainline")) return;
    const net = NetClient.shared;
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.openChild("mainline");
  }

  /** 两个 idx 都没有就 Toast。有任意一个则压入只读页，不走 Mock 的 stage.enter。打开不看 net.state。 */
  private openWireMainline(): void {
    if (this.blockWirePage("mainline")) return;
    this.panels?.openChild("mainline");
    this.refreshChrome();
  }

  /** 真服主城只显示壳。玩法仍是 Mock，打开会把金币写成假进度。日志可以看。挂机另走 3004。主线有 idx 时另走只读页。背包收到 5001 时另走只读页。邮件收到 15000 时另走只读页。英雄收到 4001 时另走只读页。召唤收到 4004 时另走只读页，不发 4002。先知召唤收到 13044 时另走只读页，不发 13041。英雄宝石收到 4101 时另走只读页，不发 4102。英雄图鉴收到 4013 时另走只读页，不发 4014。宠物信息收到 74100 时另走只读页，不发 74101、74102、74103。世界等级收到 51001 时另走只读页，不做 20101。基金列表收到 20001 时另走只读页，不发 20018，不发 20004、20010，不做 3007。超值首充收到 20012 时另走只读页，不发 20013，不做 13260。灵器数据收到 70001 时另走只读页，不发 70002、70003、70004、70005、70006，70007、70008 不当拉包请求，不做 20011。浮空岛时间收到 73001 时另走只读页，不发 73002、73003、73004，不做 20011。图腾信息收到 74300 时另走只读页，不发 74301、74302、74303。74304 是推送，勿发、勿当拉包。不做 20011。星盘数据收到 68001 时另走只读页，不发 68002、68003、68004、68006。68005 是更新星数常量，勿当拉包。不做 20011。魔方数据收到 75501 时另走只读页，不发 75502、75503、75504、75505。75506 是等级推送，勿当拉包。不做 34001。不做 20011。圣龙数据收到 59001 时另走只读页，不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。59010 是另只读，单独在 59001 之后拉包，勿与 59001 合并成一个请求，勿当写号。不做 34001。不做 20011。圣物图鉴收到 59010 时另走只读页，不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。勿与 59001 合并成一个请求。不做 34001。不做 20011。称号列表收到 55001 时另走只读页。Title.proto 仅 55001 读写对，同模块无写号。轻懒建，TitleService.getTitle → dao.add。无扣费，无领奖，无日刷。34001 是另只读，单独在 55001 之后拉包，勿与 55001 合并。头像列表收到 34001 时另走只读页。不发 34002 更换头像。34003 是解锁推送，勿发、勿当拉包。32001 另只读接在其后。不做 20011。轻懒建，RoleHeadPortraitService.select 无记录则 dao.add 默认解锁头。无扣费，无领奖，不改当前头像。头像框数据收到 32001 时另走只读页。不发 32002 道具激活。不发 32003 使用/切换边框。32003 是服侧推送，勿当拉包。4402 另只读接在其后。29001 有 page，硬禁。不做 20011。轻懒建免费框可接受。激活皮肤列表收到 4402 时另走只读页。不发 4403 激活、4404 替换/使用、4405 皮肤升级。4406 无实现，勿发。4401 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。过期限时皮剔除，并可能把英雄 fashionId 置 0。只读展示。无扣费，无领奖。穿戴皮肤英雄列表收到 4401 时另走只读页。不发 4403 激活、4404 替换/使用、4405 皮肤升级。4406 无实现，勿发。与 4402 分刀，勿合并。本刀不重复拉 4402。4201 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。过期限时皮清理，并可能卸英雄 fashionId。只读展示。无扣费，无领奖，无邮件。英雄祈愿数据收到 4201 时另走只读页。不发 4202。74104 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。轻懒建 hero_prayer。特权过期清字段。只读展示。无扣费，无领奖。无祈愿写入口。挂在 4401 之后，与已合刀分开发，勿合并。本刀不重复拉 4401。宠物图鉴收到 74104 时另走只读页。不发 74101 升级、74102 携带、74103 卸下。74105、74106 是背包增减推送，勿当拉包。28100 羁绊数据另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。轻懒建空 PetIllustrate。无扣费，无发奖。只读展示已解锁宠物类型。无升级、携带、卸下入口。挂在 4201 之后，与 74100、4201 分开发，勿合并。本刀不重复拉 74100，也不重复拉 4201。点金收到 17000 时另走只读页。成就收到 12010 时另走只读页。竞技场收到 18001 时另走只读页。七日登录收到 22000 时另走只读页，不绑 17000。七日目标收到 21010 时另走只读页，不绑 22000，也不绑 17000。许愿池收到 27001 时另走只读页，不看 Mock 的主线 Lv10。羁绊皮肤收到 28200 时另走只读页。不发 28201 熔炼、28202 激活、28204 领任务奖、28205 使用皮肤。28203 任务列表虽只读，本刀勿夹发。不发 28101–28109、28002、28003。75601 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。轻懒建 goddess_fashion。无扣费，无发奖，不改皮肤。只读展示。挂在 28100 之后，与 28100 分开发，勿合并。本刀不重复拉 28100。 */
  private blockWirePage(id: string): boolean {
    if (id === "achieve") return this.blockWireAchievement();
    if (id === "buygold") return this.blockWireBuyGold();
    if (id === "arena") return this.blockWireArena();
    if (id === "login7") return this.blockWireSevenDay();
    if (id === "goal7") return this.blockWireGoal7();
    if (id === "wish") return this.blockWireWish();
    if (id === "summon") return this.blockWireSummon();
    if (id === "prophet") return this.blockWireProphet();
    if (id === "jewel") return this.blockWireJewel();
    if (id === "illustrat") return this.blockWireIllustrat();
    if (id === "pet") return this.blockWirePet();
    if (id === "world") return this.blockWireWorld();
    if (id === "promotion") return this.blockWirePromotion();
    if (id === "firstRecharge") return this.blockWireFirstRecharge();
    if (id === "reiki") return this.blockWireReiki();
    if (id === "islands") return this.blockWireIslands();
    if (id === "totems") return this.blockWireTotems();
    if (id === "astrolabe") return this.blockWireAstrolabe();
    if (id === "tweakCube") return this.blockWireTweakCube();
    if (id === "dragon") return this.blockWireDragon();
    if (id === "dragonCollection") return this.blockWireDragonCollection();
    if (id === "titleList") return this.blockWireTitleList();
    if (id === "headPortrait") return this.blockWireHeadPortrait();
    if (id === "borderData") return this.blockWireBorder();
    if (id === "fashionList") return this.blockWireFashion();
    if (id === "wornFashion") return this.blockWireWornFashion();
    if (id === "heroPrayer") return this.blockWireHeroPrayer();
    if (id === "petIllustrate") return this.blockWirePetIllustrate();
    if (id === "fetterData") return this.blockWireFetter();
    if (id === "fetterFashion") return this.blockWireFetterFashion();
    if (id === "shenBin") return this.blockWireShenBin();
    if (id === "occupation") return this.blockWireOccupation();
    if (id === "roleShenBin") return this.blockWireRoleShenBin();
    if (id === "fetterContract") return this.blockWireFetterContract();
    if (id === "formation") return this.blockWireFormation();
    if (id === "lineUp") return this.blockWireLineUp();
    if (id === "runningPromotion") return this.blockWireRunningPromotion();
    if (id === "towerReward") return this.blockWireTowerReward();
    if (id === "heroLevelResetTimes") return this.blockWireHeroLevelResetTimes();
    if (id === "signInList") return this.blockWireSignInList();
    if (id === "dailyTaskList") return this.blockWireDailyTaskList();
    if (id === "dailyWelfareList") return this.blockWireDailyWelfareList();
    if (id === "mouthWelfareList") return this.blockWireMouthWelfareList();
    if (id === "weekendGift") return this.blockWireWeekendGift();
    if (id === "godRelic") return this.blockWireGodRelic();
    if (id === "heroPalace") return this.blockWireHeroPalace();
    if (id === "rechargeDaysB") return this.blockWireRechargeDaysB();
    if (id === "timeTower") return this.blockWireTimeTower();
    if (id === "spaceTimeAdventure") return this.blockWireSpaceTimeAdventure();
    if (id === "magicTowerRoad") return this.blockWireMagicTowerRoad();
    if (id === "qiShenQi") return this.blockWireQiShenQi();
    if (id === "zhuShenJiTan") return this.blockWireZhuShenJiTan();
    if (id === "midFood") return this.blockWireMidFood();
    if (id === "qiuShangMingYue") return this.blockWireQiuShangMingYue();
    if (id === "wanShengLottery") return this.blockWireWanShengLottery();
    if (id === "heiWuMission") return this.blockWireHeiWuMission();
    if (id === "christmasGift") return this.blockWireChristmasGift();
    if (id === "springOuting") return this.blockWireSpringOuting();
    if (id === "christmasMission") return this.blockWireChristmasMission();
    if (id === "magicTowerLevelRank") return this.blockWireMagicTowerLevelRank();
    if (id === "springOutingGrid") return this.blockWireSpringOutingGrid();
    if (Session.source !== "wire") return false;
    if (id === "city" || id === "log" || id === CITY_HUB_ACTIVITY_ID || id === CITY_HUB_MORE_ID) return false;
    if (id === "idle") return this.blockWireIdle();
    if (id === "mainline") return this.blockWireMainline();
    if (id === "bag") return this.blockWireBag();
    if (id === "mail") return this.blockWireMail();
    if (id === "hero") return this.blockWireHero();
    if (id === "hero-detail") return this.blockWireHeroDetail();
    GameLog.shared.info("MainApp", "wire skip " + id);
    this.shell?.showToast("真服这一页还没接，不会打开 Mock 页面", 2200);
    return true;
  }

  /** 没收到过 s2c 5001 就停在主城。空列表也算同步，放行后页面写「空背包」。 */
  private blockWireBag(): boolean {
    if (WireSession.hasBag()) return false;
    GameLog.shared.info("MainApp", "wire bag unsynced");
    this.shell?.showToast(WIRE_BAG_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 15000 就停在主城。空列表也算同步，放行后页面写「空邮箱」。 */
  private blockWireMail(): boolean {
    if (WireSession.hasMail()) return false;
    GameLog.shared.info("MainApp", "wire mail unsynced");
    this.shell?.showToast(WIRE_MAIL_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4001 就停在主城。空名册也算同步，放行后页面写「空名册」。 */
  private blockWireHero(): boolean {
    if (WireSession.hasHero()) return false;
    GameLog.shared.info("MainApp", "wire hero unsynced");
    this.shell?.showToast(WIRE_HERO_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 17000 就停在主城。空表也算同步，放行后页面写「已同步空表」。Mock 也不进别的页。 */
  private blockWireBuyGold(): boolean {
    if (Session.source === "wire" && WireSession.hasActivity()) return false;
    GameLog.shared.info("MainApp", "wire buygold unsynced");
    this.shell?.showToast(WIRE_ACTIVITY_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 22000 就停在主城或玩法。空表也算同步。Mock 仍走原来的领取页。 */
  private blockWireSevenDay(): boolean {
    if (Session.source !== "wire") return false;
    if (WireSession.hasSevenDay()) return false;
    GameLog.shared.info("MainApp", "wire login7 unsynced");
    this.shell?.showToast(WIRE_SEVEN_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 21010 就停在主城或玩法。空表也算同步。不打开 Mock 七日目标，也不进 22000 / 17000。 */
  private blockWireGoal7(): boolean {
    if (Session.source !== "wire") return false;
    if (WireSession.hasGoal7()) return false;
    GameLog.shared.info("MainApp", "wire goal7 unsynced");
    this.shell?.showToast(WIRE_GOAL7_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 13044 就停在主城。空表也算同步。不打开 Mock 召唤，也不抽、置换、确认置换。Mock 主城这颗按钮同样只 Toast。 */
  private blockWireProphet(): boolean {
    if (Session.source === "wire" && WireSession.hasProphet()) return false;
    GameLog.shared.info("MainApp", "wire prophet unsynced");
    this.shell?.showToast(WIRE_PROPHET_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4101 就停在主城。空表也算同步。不替换，不卸下，不合成。Mock 主城这颗按钮同样只 Toast，不改原来的英雄页。 */
  private blockWireJewel(): boolean {
    if (Session.source === "wire" && WireSession.hasJewel()) return false;
    GameLog.shared.info("MainApp", "wire jewel unsynced");
    this.shell?.showToast(WIRE_JEWEL_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4013 就停在主城。空表也算同步。不领奖，不发 4014。Mock 主城这颗按钮同样只 Toast，不改原来的英雄页。 */
  private blockWireIllustrat(): boolean {
    if (Session.source === "wire" && WireSession.hasIllustrat()) return false;
    GameLog.shared.info("MainApp", "wire illustrat unsynced");
    this.shell?.showToast(WIRE_ILLUSTRAT_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 74100 就停在主城。空表也算同步。不升级，不携带，不卸下。不主动发 74105、74106。Mock 主城这颗按钮同样只 Toast。 */
  private blockWirePet(): boolean {
    if (Session.source === "wire" && WireSession.hasPet()) return false;
    GameLog.shared.info("MainApp", "wire pet unsynced");
    this.shell?.showToast(WIRE_PET_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 51001 就停在主城。空包体也算同步。不做 20101。Mock 主城这颗按钮同样只 Toast。 */
  private blockWireWorld(): boolean {
    if (Session.source === "wire" && WireSession.hasWorld()) return false;
    GameLog.shared.info("MainApp", "wire world unsynced");
    this.shell?.showToast(WIRE_WORLD_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 20001 就停在主城。空包体也算同步。不发 20018。不发 20004、20010。不做 3007。Mock 主城这颗按钮同样只 Toast。 */
  private blockWirePromotion(): boolean {
    if (Session.source === "wire" && WireSession.hasPromotion()) return false;
    GameLog.shared.info("MainApp", "wire promotion unsynced");
    this.shell?.showToast(WIRE_PROMOTION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 20012 就停在主城。空包体也算同步。不发 20013。不做 13260。Mock 主城这颗按钮同样只 Toast。 */
  private blockWireFirstRecharge(): boolean {
    if (Session.source === "wire" && WireSession.hasFirstRecharge()) return false;
    GameLog.shared.info("MainApp", "wire first recharge unsynced");
    this.shell?.showToast(WIRE_FIRST_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 70001 就停在主城。空包体也算同步。不发 70002、70003、70004、70005、70006。70007、70008 不当拉包请求。不做 20011。Mock 主城这颗按钮同样只 Toast。 */
  private blockWireReiki(): boolean {
    if (Session.source === "wire" && WireSession.hasReiki()) return false;
    GameLog.shared.info("MainApp", "wire reiki unsynced");
    this.shell?.showToast(WIRE_REIKI_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 73001 就停在主城。空包体也算同步。不发 73002、73003、73004。不做 20011。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireIslands(): boolean {
    if (Session.source === "wire" && WireSession.hasIslands()) return false;
    GameLog.shared.info("MainApp", "wire islands unsynced");
    this.shell?.showToast(WIRE_ISLANDS_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 74300 就停在主城。空表也算同步。不发 74301、74302、74303。74304 不当拉包。不做 20011。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireTotems(): boolean {
    if (Session.source === "wire" && WireSession.hasTotems()) return false;
    GameLog.shared.info("MainApp", "wire totems unsynced");
    this.shell?.showToast(WIRE_TOTEMS_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 68001 就停在主城。空包体也算同步。不发 68002、68003、68004、68006。68005 不当拉包。不做 20011。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireAstrolabe(): boolean {
    if (Session.source === "wire" && WireSession.hasAstrolabe()) return false;
    GameLog.shared.info("MainApp", "wire astrolabe unsynced");
    this.shell?.showToast(WIRE_ASTROLABE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75501 就停在主城。空包体也算同步。不发 75502、75503、75504、75505。75506 不当拉包。不做 34001。不做 20011。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireTweakCube(): boolean {
    if (Session.source === "wire" && WireSession.hasTweakCube()) return false;
    GameLog.shared.info("MainApp", "wire tweak cube unsynced");
    this.shell?.showToast(WIRE_CUBE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 59001 就停在主城。空包体也算同步。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。59010 单独在其后拉包，勿与本请求合并，勿当写号。不做 34001。不做 20011。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireDragon(): boolean {
    if (Session.source === "wire" && WireSession.hasDragon()) return false;
    GameLog.shared.info("MainApp", "wire dragon unsynced");
    this.shell?.showToast(WIRE_DRAGON_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 59010 就停在主城。空包体也算同步。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。勿与 59001 合并。59001 单独到不算。不做 34001。不做 20011。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireDragonCollection(): boolean {
    if (Session.source === "wire" && WireSession.hasDragonCollection()) return false;
    GameLog.shared.info("MainApp", "wire dragon collection unsynced");
    this.shell?.showToast(WIRE_DRAGON_COLLECTION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 55001 就停在主城。空包体也算同步。Title.proto 仅 55001 读写对，同模块无写号。59010 单独到不算。34001 另只读接在其后。不做 20011。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireTitleList(): boolean {
    if (Session.source === "wire" && WireSession.hasTitleList()) return false;
    GameLog.shared.info("MainApp", "wire title list unsynced");
    this.shell?.showToast(WIRE_TITLE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 34001 就停在主城。空包体也算同步。不发 34002。34003 不当拉包。32001 另只读接在其后。不做 20011。55001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireHeadPortrait(): boolean {
    if (Session.source === "wire" && WireSession.hasHeadPortrait()) return false;
    GameLog.shared.info("MainApp", "wire head portrait unsynced");
    this.shell?.showToast(WIRE_HEAD_PORTRAIT_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 32001 就停在主城。空包体也算同步。不发 32002。不发 32003。32003 不当拉包。4402 另只读接在其后。29001 有 page，硬禁。不做 20011。34001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireBorder(): boolean {
    if (Session.source === "wire" && WireSession.hasBorder()) return false;
    GameLog.shared.info("MainApp", "wire border unsynced");
    this.shell?.showToast(WIRE_BORDER_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4402 就停在主城。空包体也算同步。不发 4403、4404、4405。4406 无实现，勿发。4401 另只读接在其后，勿合并。29001 有 page，硬禁。不做 20011。32001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireFashion(): boolean {
    if (Session.source === "wire" && WireSession.hasFashion()) return false;
    GameLog.shared.info("MainApp", "wire fashion unsynced");
    this.shell?.showToast(WIRE_FASHION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4401 就停在主城。空包体也算同步。不发 4403、4404、4405。4406 无实现，勿发。与 4402 分刀，勿合并。4402 单独到不算。4201 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireWornFashion(): boolean {
    if (Session.source === "wire" && WireSession.hasWornFashion()) return false;
    GameLog.shared.info("MainApp", "wire worn fashion unsynced");
    this.shell?.showToast(WIRE_WORN_FASHION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4201 就停在主城。空包体也算同步。不发 4202。74104 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。4401 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireHeroPrayer(): boolean {
    if (Session.source === "wire" && WireSession.hasHeroPrayer()) return false;
    GameLog.shared.info("MainApp", "wire hero prayer unsynced");
    this.shell?.showToast(WIRE_HERO_PRAYER_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 74104 就停在主城。空包体也算同步。不发 74101、74102、74103。74105、74106 不当拉包。28100 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。74100、4201 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWirePetIllustrate(): boolean {
    if (Session.source === "wire" && WireSession.hasPetIllustrate()) return false;
    GameLog.shared.info("MainApp", "wire pet illustrate unsynced");
    this.shell?.showToast(WIRE_PET_ILLUSTRATE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 28100 就停在主城。空包体也算同步。不发 28101、28102、28104、28105、28106、28108、28109。不发 28002、28003。28200 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。74104、4201 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireFetter(): boolean {
    if (Session.source === "wire" && WireSession.hasFetter()) return false;
    GameLog.shared.info("MainApp", "wire fetter unsynced");
    this.shell?.showToast(WIRE_FETTER_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 28200 就停在主城。空包体也算同步。不发 28201、28202、28203、28204、28205。28203 虽只读，本刀勿夹发。不发 28101–28109、28002、28003。75601 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。28100、74104 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireFetterFashion(): boolean {
    if (Session.source === "wire" && WireSession.hasFetterFashion()) return false;
    GameLog.shared.info("MainApp", "wire fetter fashion unsynced");
    this.shell?.showToast(WIRE_FETTER_FASHION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75601 就停在主城。空包体也算同步。不发 75602、75603、75604、75605。不发 75619、75609。75606 职级信息另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。28200、28100 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireShenBin(): boolean {
    if (Session.source === "wire" && WireSession.hasShenBin()) return false;
    GameLog.shared.info("MainApp", "wire shen bin unsynced");
    this.shell?.showToast(WIRE_SHENBIN_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75606 就停在主城。空包体也算同步。不发 75607、75609。75608 为服推，勿当 c2s。不发 75602、75603、75604、75605、75619。75615 神兵道具另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。75601、28200 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireOccupation(): boolean {
    if (Session.source === "wire" && WireSession.hasOccupation()) return false;
    GameLog.shared.info("MainApp", "wire occupation unsynced");
    this.shell?.showToast(WIRE_OCCUPATION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75615 就停在主城。空包体也算同步。不发 75602、75603、75604、75605、75619。不发 75607、75609。75608 为服推，勿当 c2s。28107 查看契约另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。75606、75601 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireRoleShenBin(): boolean {
    if (Session.source === "wire" && WireSession.hasRoleShenBin()) return false;
    GameLog.shared.info("MainApp", "wire role shen bin unsynced");
    this.shell?.showToast(WIRE_ROLE_SHENBIN_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 28107 就停在主城。空包体也算同步。不发 28101、28102、28104、28105、28106、28108、28109。不发 28002、28003、28004。不发 28201–28205。3099 查询阵法另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。75615、75606 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireFetterContract(): boolean {
    if (Session.source === "wire" && WireSession.hasFetterContract()) return false;
    GameLog.shared.info("MainApp", "wire fetter contract unsynced");
    this.shell?.showToast(WIRE_FETTER_CONTRACT_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 3099 就停在主城。空包体也算同步。不发 3097、3098、3100。不发 3102、3030。3101 副本队列另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。28107、75615 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireFormation(): boolean {
    if (Session.source === "wire" && WireSession.hasFormation()) return false;
    GameLog.shared.info("MainApp", "wire formation unsynced");
    this.shell?.showToast(WIRE_FORMATION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 3101 就停在主城。空包体也算同步。不发 3100、3098、3097、3030、3102、3103。3099 勿再发。不做备选 5001。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。3099 单独到不算。20101 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireLineUp(): boolean {
    if (Session.source === "wire" && WireSession.hasLineUp()) return false;
    GameLog.shared.info("MainApp", "wire lineup unsynced");
    this.shell?.showToast(WIRE_LINEUP_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 20101 就停在主城。空包体也算同步。同文件 20102 非空体勿挂。不发各活动领奖写号。不做 20011。51001、5001 已有，勿重复。3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。3101 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireRunningPromotion(): boolean {
    if (Session.source === "wire" && WireSession.hasRunningPromotion()) return false;
    GameLog.shared.info("MainApp", "wire running promotion unsynced");
    this.shell?.showToast(WIRE_RUNNING_PROMOTION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 3203 就停在主城。空包体也算同步。不发 3202、3204、3205、3206、3220。3200 本轮勿挂。4044 英雄等级重生次数另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3099、3101、20101 勿再发。不做 3012、3010、19001。12020 每日任务列表另只读接在 13010 之后。4601 有 page，硬禁。29001 有 page，硬禁。20101 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireTowerReward(): boolean {
    if (Session.source === "wire" && WireSession.hasTowerReward()) return false;
    GameLog.shared.info("MainApp", "wire tower reward unsynced");
    this.shell?.showToast(WIRE_TOWER_REWARD_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4044 就停在主城。空包体也算同步。不发 4043。13010 签到列表另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。3203 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireHeroLevelResetTimes(): boolean {
    if (Session.source === "wire" && WireSession.hasHeroLevelResetTimes()) return false;
    GameLog.shared.info("MainApp", "wire hero level reset times unsynced");
    this.shell?.showToast(WIRE_HERO_LEVEL_RESET_TIMES_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 13010 就停在主城。空包体也算同步。不发 13011。12020 每日任务列表另只读接在其后，勿合并。不做 20011。不是启动链 12010。5001、51001 已有，勿重复。4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。4044 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireSignInList(): boolean {
    if (Session.source === "wire" && WireSession.hasSignInList()) return false;
    GameLog.shared.info("MainApp", "wire sign in list unsynced");
    this.shell?.showToast(WIRE_SIGN_IN_LIST_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 12020 就停在主城。空包体也算同步。不发 12021。不发 12022。26002 每日福利列表另只读接在其后，勿合并。26001 每月福利列表另只读接在 26002 之后，勿合并。不做 20011。不是启动链 12010。5001、51001 已有，勿重复。13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。13010 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireDailyTaskList(): boolean {
    if (Session.source === "wire" && WireSession.hasDailyTaskList()) return false;
    GameLog.shared.info("MainApp", "wire daily task list unsynced");
    this.shell?.showToast(WIRE_DAILY_TASK_LIST_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 26002 就停在主城。空包体也算同步。26001 每月福利列表另只读接在其后，勿合并。不发明领奖写号。不发 12021。不发 12022。不做 20011。不是启动链 12010。不是每日任务列表 12020。5001、51001 已有，勿重复。12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。12020 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireDailyWelfareList(): boolean {
    if (Session.source === "wire" && WireSession.hasDailyWelfareList()) return false;
    GameLog.shared.info("MainApp", "wire daily welfare list unsynced");
    this.shell?.showToast(WIRE_DAILY_WELFARE_LIST_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 26001 就停在主城。空包体也算同步。不重复拉 26002。不发明领奖写号。不发 12021。不发 12022。61001 周末礼包另只读接在其后，勿合并。不做 20011。不是启动链 12010。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。26002 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireMouthWelfareList(): boolean {
    if (Session.source === "wire" && WireSession.hasMouthWelfareList()) return false;
    GameLog.shared.info("MainApp", "wire mouth welfare list unsynced");
    this.shell?.showToast(WIRE_MOUTH_WELFARE_LIST_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 61001 就停在主城。空包体也算同步。不重复拉 26001。不发 61002。不做 62001。不做 63001。不发明领奖写号。不发 12021。不发 12022。不做 20011。不是启动链 12010。不是每月福利列表 26001。不是每日福利列表 26002。5001、51001 已有，勿重复。26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。26001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireWeekendGift(): boolean {
    if (Session.source === "wire" && WireSession.hasWeekendGift()) return false;
    GameLog.shared.info("MainApp", "wire weekend gift unsynced");
    this.shell?.showToast(WIRE_WEEKEND_GIFT_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 62001 就停在主城。空包体也算同步。不重复拉 61001。不发 62002。不发 62003。不发 62004。不发 62005。不做 63001。不做 20011。不是周末礼包 61001。不是每月福利列表 26001。5001、51001 已有，勿重复。61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。61001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireGodRelic(): boolean {
    if (Session.source === "wire" && WireSession.hasGodRelic()) return false;
    GameLog.shared.info("MainApp", "wire god relic unsynced");
    this.shell?.showToast(WIRE_GOD_RELIC_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 63001 就停在主城。空包体也算同步。不重复拉 62001。不发 63002。不发 63003。69001 积天豪礼2另帧，勿合并。不发 69002。不做 71001。不做 20011。不是神迹遗物 62001。不是周末礼包 61001。5001、51001 已有，勿重复。62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。62001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireHeroPalace(): boolean {
    if (Session.source === "wire" && WireSession.hasHeroPalace()) return false;
    GameLog.shared.info("MainApp", "wire hero palace unsynced");
    this.shell?.showToast(WIRE_HERO_PALACE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 69001 就停在主城。空包体也算同步。不重复拉 63001。不发 69002。不做 71001。不做 20011。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。5001、51001、68001、70001 已有，勿重复。63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。63001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireRechargeDaysB(): boolean {
    if (Session.source === "wire" && WireSession.hasRechargeDaysB()) return false;
    GameLog.shared.info("MainApp", "wire recharge days b unsynced");
    this.shell?.showToast(WIRE_RECHARGE_DAYS_B_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 74001 就停在主城。空包体也算同步。不重复拉 69001。不发 74002。不发 74003。不做 73002。不做 71001。不做 20011。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。5001、51001、68001、70001 已有，勿重复。69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。69001 单独到不算。74120 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireTimeTower(): boolean {
    if (Session.source === "wire" && WireSession.hasTimeTower()) return false;
    GameLog.shared.info("MainApp", "wire time tower unsynced");
    this.shell?.showToast(WIRE_TIME_TOWER_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 74120 就停在主城。空包体也算同步。不重复拉 74001。不发 74123。不发 74124。不发 74125。不发 74126。不发 74127。不发 74128。不发 74129。不发 74131。不发 74142。不发 74147。不发 74148。不发 74149。不夹发 74121。不夹发 74122。不做 76501。不做 73002。不做 71001。不做 20011。不是时空魔塔 74001。不是积天豪礼2 69001。5001、51001、68001、70001 已有，勿重复。74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。74001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireSpaceTimeAdventure(): boolean {
    if (Session.source === "wire" && WireSession.hasSpaceTimeAdventure()) return false;
    GameLog.shared.info("MainApp", "wire space time adventure unsynced");
    this.shell?.showToast(WIRE_SPACE_TIME_ADVENTURE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 76542 就停在主城。空包体也算同步。不重复拉 74120。不发 76543。不发 76544。不发 76502。不发 76503。不发 76504。不发 76505。不发 76506。不发 76541。不发 76501。不夹发 74121。不夹发 74122。不做 75001。不做 73002。不做 71001。不做 20011。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。74120 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireMagicTowerRoad(): boolean {
    if (Session.source === "wire" && WireSession.hasMagicTowerRoad()) return false;
    GameLog.shared.info("MainApp", "wire magic tower road unsynced");
    this.shell?.showToast(WIRE_MAGIC_TOWER_ROAD_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75101 就停在主城。空包体也算同步。不重复拉 76542。不发 75102。75102 是购买推送 s2c，勿当 c2s。本模块无独立购写号。75121 诸神祭坛另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。76542 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireQiShenQi(): boolean {
    if (Session.source === "wire" && WireSession.hasQiShenQi()) return false;
    GameLog.shared.info("MainApp", "wire qi shen qi unsynced");
    this.shell?.showToast(WIRE_QI_SHEN_QI_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75121 就停在主城。空包体也算同步。不重复拉 75101。不发 75122。75122 是抽奖，不编码、不发送。75131 赏月佳肴另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。75101 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireZhuShenJiTan(): boolean {
    if (Session.source === "wire" && WireSession.hasZhuShenJiTan()) return false;
    GameLog.shared.info("MainApp", "wire zhu shen ji tan unsynced");
    this.shell?.showToast(WIRE_ZHU_SHEN_JI_TAN_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75131 就停在主城。空包体也算同步。不重复拉 75121。不发 75132。75132 是购买推送 s2c，勿当 c2s。不夹 75122。不夹 75102。75801 秋赏明月另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。75121 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireMidFood(): boolean {
    if (Session.source === "wire" && WireSession.hasMidFood()) return false;
    GameLog.shared.info("MainApp", "wire mid food unsynced");
    this.shell?.showToast(WIRE_MID_FOOD_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75801 就停在主城。空包体也算同步。不重复拉 75131。不发 75802。不发 75803。不发 75804。75901 万圣抽奖另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。5001、51001、68001、70001 已有，勿重复。75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。75131 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireQiuShangMingYue(): boolean {
    if (Session.source === "wire" && WireSession.hasQiuShangMingYue()) return false;
    GameLog.shared.info("MainApp", "wire qiu shang ming yue unsynced");
    this.shell?.showToast(WIRE_QIU_SHANG_MING_YUE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 75901 就停在主城。空包体也算同步。不重复拉 75801。不发 75902。不发 75903。不发 75904。不夹发 75931、75932。不夹发 75941–75944。76001 黑五活动另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是秋赏明月 75801。不是赏月佳肴 75131。5001、51001、68001、70001 已有，勿重复。75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。75801 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireWanShengLottery(): boolean {
    if (Session.source === "wire" && WireSession.hasWanShengLottery()) return false;
    GameLog.shared.info("MainApp", "wire wan sheng lottery unsynced");
    this.shell?.showToast(WIRE_WAN_SHENG_LOTTERY_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 76001 就停在主城。空包体也算同步。不重复拉 75901。不发 76002。不发 76003。不发 76004。不发 76005。不夹发 76021、76022。76101 约惠圣诞另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是万圣抽奖 75901。不是秋赏明月 75801。5001、51001、68001、70001 已有，勿重复。75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。75901 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireHeiWuMission(): boolean {
    if (Session.source === "wire" && WireSession.hasHeiWuMission()) return false;
    GameLog.shared.info("MainApp", "wire hei wu mission unsynced");
    this.shell?.showToast(WIRE_HEI_WU_MISSION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 76101 就停在主城。空包体也算同步。不重复拉 76001。不发 76102。旁支勿夹 76082–76084、76121–76122、76141–76143、76161–76163。76301 出游寻春另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是黑五活动 76001。不是万圣抽奖 75901。5001、51001、68001、70001 已有，勿重复。76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。76001 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireChristmasGift(): boolean {
    if (Session.source === "wire" && WireSession.hasChristmasGift()) return false;
    GameLog.shared.info("MainApp", "wire christmas gift unsynced");
    this.shell?.showToast(WIRE_CHRISTMAS_GIFT_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 76301 就停在主城。空包体也算同步。不重复拉 76101。不发 76302。不发 76303。不发 76304。勿夹 76305、76306、76307、76308。76081 圣诞连线另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是约惠圣诞 76101。不是黑五活动 76001。5001、51001、68001、70001 已有，勿重复。76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。76101 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireSpringOuting(): boolean {
    if (Session.source === "wire" && WireSession.hasSpringOuting()) return false;
    GameLog.shared.info("MainApp", "wire spring outing unsynced");
    this.shell?.showToast(WIRE_SPRING_OUTING_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 76081 就停在主城。空包体也算同步。不重复拉 76301。不发 76082。不发 76083。不发 76084。旁支勿夹 76121、76122、76141、76143、76161、76163。76520 关卡榜另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是出游寻春 76301。不是约惠圣诞 76101。5001、51001、68001、70001 已有，勿重复。76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。76301 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireChristmasMission(): boolean {
    if (Session.source === "wire" && WireSession.hasChristmasMission()) return false;
    GameLog.shared.info("MainApp", "wire christmas mission unsynced");
    this.shell?.showToast(WIRE_CHRISTMAS_MISSION_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 76520 就停在主城。空包体也算同步。不重复拉 76081。不发 76501–76506。不发 76543。不发 76544。76251 春日踏青另帧，挂在其后，勿合并。不重复拉 76542。不做 75001。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是圣诞连线 76081。不是出游寻春 76301。5001、51001、68001、70001 已有，勿重复。76081、76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。76081 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireMagicTowerLevelRank(): boolean {
    if (Session.source === "wire" && WireSession.hasMagicTowerLevelRank()) return false;
    GameLog.shared.info("MainApp", "wire magic tower level rank unsynced");
    this.shell?.showToast(WIRE_MAGIC_TOWER_LEVEL_RANK_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 76251 就停在主城。空包体也算同步。不重复拉 76520。不发 76252。不发 76253。备选 76271 本轮不做。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是关卡榜 76520。5001、51001、68001、70001 已有，勿重复。4601 有 page，硬禁。29001 有 page，硬禁。76520 单独到不算。Mock 主城这颗按钮同样只 Toast，不回落 Mock。 */
  private blockWireSpringOutingGrid(): boolean {
    if (Session.source === "wire" && WireSession.hasSpringOutingGrid()) return false;
    GameLog.shared.info("MainApp", "wire spring outing grid unsynced");
    this.shell?.showToast(WIRE_SPRING_OUTING_GRID_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 4004 就停在底栏。空次数也算同步。不打开 Mock 召唤，也不召唤、领奖。 */
  private blockWireSummon(): boolean {
    if (Session.source !== "wire") return false;
    if (WireSession.hasSummon()) return false;
    GameLog.shared.info("MainApp", "wire summon unsynced");
    this.shell?.showToast(WIRE_SUMMON_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 27001 就停在玩法。空表也算同步。不打开 Mock 许愿池，也不刷新、抽奖、领奖。 */
  private blockWireWish(): boolean {
    if (Session.source !== "wire") return false;
    if (WireSession.hasWish()) return false;
    GameLog.shared.info("MainApp", "wire wish unsynced");
    this.shell?.showToast(WIRE_WISH_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 18001 就停在玩法。空对手表也算同步。Mock 仍走原来的挑战页。 */
  private blockWireArena(): boolean {
    if (Session.source !== "wire") return false;
    if (WireSession.hasPvp()) return false;
    GameLog.shared.info("MainApp", "wire arena unsynced");
    this.shell?.showToast(WIRE_PVP_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没收到过 s2c 12010 就停在主城。空成就表也算同步。Mock 不回落。 */
  private blockWireAchievement(): boolean {
    if (Session.source === "wire" && WireSession.hasAchievement()) return false;
    GameLog.shared.info("MainApp", "wire achievement unsynced");
    this.shell?.showToast(WIRE_ACHIEVEMENT_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 详情在只读页里。不另开 Mock 升级页。未同步时和列表同一句 Toast。 */
  private blockWireHeroDetail(): boolean {
    if (!WireSession.hasHero()) return this.blockWireHero();
    GameLog.shared.info("MainApp", "wire hero detail stays on the readonly page");
    return true;
  }

  /** 两个 idx 都没有就 Toast「真服未同步」，不打开 Mock。有任意一个（含 max_idx=0）则放行。 */
  private blockWireMainline(): boolean {
    if (WireSession.hasChapter()) return false;
    GameLog.shared.info("MainApp", "wire mainline unsynced");
    this.shell?.showToast(WIRE_BATTLE_UNSYNCED_TOAST, 2200);
    return true;
  }

  /** 没有 3004 的时间就停在主城。有数据则放行，页面用 WireIdlePage，不进 Mock 挂机。 */
  private blockWireIdle(): boolean {
    if (WireSession.hasIdle()) return false;
    GameLog.shared.info("MainApp", "wire idle unsynced");
    this.shell?.showToast("真服挂机未同步", 2200);
    return true;
  }

  /** 顶栏网络字样。真服看留着的那条连接，Mock 仍看共享客户端。 */
  private cityNet(): NetClient {
    if (Session.source === "wire" && WireSession.net) return WireSession.net;
    return NetClient.shared;
  }

  /** 底栏「英雄」「召唤」「铁匠铺」没连上时不进页面。详情走页面栈。 */
  private ensureNet(): boolean {
    if (NetClient.shared.state === "connected") return true;
    this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
    return false;
  }

  private mountHeroList(): Node {
    if (Session.source === "wire") return this.mountWireHero();
    this.heroList?.dispose();
    const hostCallbacks = {
      showToast: (text: string) => this.shell?.showToast(text, 2200),
      alive: () => this.isValid,
      list: () => Proto.heroList({}, NetClient.shared),
      openHero: (heroId: number) => {
        this.selectedHeroId = heroId;
        this.openChild("hero-detail");
      },
      close: () => this.back(),
    };
    if (!USE_HERO_PREFAB) {
      const page = buildHeroList(hostCallbacks);
      this.heroList = page;
      return page.node;
    }
    const host = uiNode("HeroListHost");
    const ticket = ++this.heroListTicket;
    void this.attachHeroList(host, ticket, hostCallbacks);
    return host;
  }

  private async attachHeroList(
    host: Node,
    ticket: number,
    hostCallbacks: {
      showToast: (text: string) => void;
      alive: () => boolean;
      list: () => ReturnType<typeof Proto.heroList>;
      openHero: (heroId: number) => void;
      close: () => void;
    }
  ): Promise<void> {
    try {
      const page = await mountHeroListPrefab(host, hostCallbacks);
      if (!this.isValid || ticket !== this.heroListTicket || !host.isValid) {
        page.dispose();
        return;
      }
      this.heroList = page;
    } catch (err) {
      if (!this.isValid || ticket !== this.heroListTicket || !host.isValid) return;
      GameLog.shared.error("MainApp", "hero prefab " + messageOf(err) + "，改用代码 UI");
      const page = buildHeroList(hostCallbacks);
      page.node.parent = host;
      this.heroList = page;
    }
  }

  private mountWireHero(): Node {
    this.heroList?.dispose();
    this.heroDetail?.dispose();
    this.heroDetail = null;
    const page = buildWireHeroPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.heroList = page;
    return page.node;
  }

  private mountHeroDetail(): Node {
    this.heroDetail?.dispose();
    const hostCallbacks = {
      heroId: () => this.selectedHeroId,
      showToast: (text: string) => this.shell?.showToast(text, 2200),
      alive: () => this.isValid,
      list: () => Proto.heroList({}, NetClient.shared),
      upgrade: (heroId: number) => Proto.heroUpgrade({ heroId }, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
        this.heroList?.reload();
        this.smith?.reload();
      },
      close: () => this.back(),
    };
    if (Session.source === "wire" || !USE_HERO_PREFAB) {
      const page = buildHeroDetail(hostCallbacks);
      this.heroDetail = page;
      return page.node;
    }
    const host = uiNode("HeroDetailHost");
    const ticket = ++this.heroDetailTicket;
    void this.attachHeroDetail(host, ticket, hostCallbacks);
    return host;
  }

  private async attachHeroDetail(
    host: Node,
    ticket: number,
    hostCallbacks: {
      heroId: () => number;
      showToast: (text: string) => void;
      alive: () => boolean;
      list: () => ReturnType<typeof Proto.heroList>;
      upgrade: (heroId: number) => ReturnType<typeof Proto.heroUpgrade>;
      onProgress: () => void;
      close: () => void;
    }
  ): Promise<void> {
    try {
      const page = await mountHeroDetailPrefab(host, hostCallbacks);
      if (!this.isValid || ticket !== this.heroDetailTicket || !host.isValid) {
        page.dispose();
        return;
      }
      this.heroDetail = page;
    } catch (err) {
      if (!this.isValid || ticket !== this.heroDetailTicket || !host.isValid) return;
      GameLog.shared.error("MainApp", "hero detail prefab " + messageOf(err) + "，改用代码 UI");
      const page = buildHeroDetail(hostCallbacks);
      page.node.parent = host;
      this.heroDetail = page;
    }
  }

  /** 玩法「竞技场」。真服收到 18001 后走只读页，不挑战。Mock 仍受主线 Lv8。 */
  private mountArena(): Node {
    if (Session.source === "wire") return this.mountWireArena();
    this.arena?.dispose();
    const page = buildArenaPage({
      showToast: (text) => this.shell?.showToast(text, 2400),
      alive: () => this.isValid,
      view: () => Proto.arenaView({}, NetClient.shared),
      challenge: (opponentId) => Proto.arenaChallenge({ opponentId }, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
      },
      close: () => this.back(),
    });
    this.arena = page;
    return page.node;
  }

  private mountWireArena(): Node {
    this.arena?.dispose();
    const page = buildWirePvpPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.arena = page;
    return page.node;
  }

  /**
   * 主城和玩法都能进。Mock 新号第 1 天可领，不看主线等级和开服天。
   * 真服收到 22000 后走只读页，不领奖。没连上时不压页面。
   */
  private openLogin7(): void {
    GameLog.shared.info("MainApp", "click login7");
    if (this.blockWirePage("login7")) return;
    if (Session.source === "wire") {
      const net = this.cityNet();
      if (net.state !== "connected") {
        this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
        return;
      }
      this.panels?.openChild("login7");
      this.refreshChrome();
      return;
    }
    if (!this.allow("login7")) return;
    if (!this.ensureNet()) return;
    this.panels?.openChild("login7");
    this.refreshChrome();
  }

  private mountLogin7(): Node {
    if (Session.source === "wire") return this.mountWireSevenDay();
    this.login7?.dispose();
    const page = buildLogin7Page({
      showToast: (text) => this.shell?.showToast(text, 2400),
      alive: () => this.isValid,
      view: () => Proto.login7View({}, NetClient.shared),
      claim: (day) => Proto.login7Claim({ day }, NetClient.shared),
      advance: () => Proto.login7Advance({}, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
        this.bag?.reload();
      },
      close: () => this.back(),
    });
    this.login7 = page;
    return page.node;
  }

  private mountWireSevenDay(): Node {
    this.login7?.dispose();
    const page = buildWireSevenDayPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.login7 = page;
    return page.node;
  }

  /** 真服先知召唤。未同步 Toast。已同步压入只读页，不抽，不置换，不写金币。不走底栏召唤。 */
  private openProphet(): void {
    GameLog.shared.info("MainApp", "click prophet");
    if (this.blockWirePage("prophet")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("prophet");
    this.refreshChrome();
  }

  private mountProphet(): Node {
    this.prophet?.dispose();
    const page = buildWireProphetPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.prophet = page;
    return page.node;
  }

  /** 真服英雄宝石。未同步 Toast。已同步压入只读页，不替换，不卸下，不合成，不写金币。不走底栏英雄。 */
  private openJewel(): void {
    GameLog.shared.info("MainApp", "click jewel");
    if (this.blockWirePage("jewel")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("jewel");
    this.refreshChrome();
  }

  private mountJewel(): Node {
    this.jewel?.dispose();
    const page = buildWireJewelPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.jewel = page;
    return page.node;
  }

  /** 真服英雄图鉴。未同步 Toast。已同步压入只读页，不领奖，不发 4014，不写金币。不走底栏英雄。 */
  private openIllustrat(): void {
    GameLog.shared.info("MainApp", "click illustrat");
    if (this.blockWirePage("illustrat")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("illustrat");
    this.refreshChrome();
  }

  private mountIllustrat(): Node {
    this.illustrat?.dispose();
    const page = buildWireIllustratPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.illustrat = page;
    return page.node;
  }

  /** 真服宠物信息。未同步 Toast。已同步压入只读页，不升级，不携带，不卸下，不写金币。不走底栏英雄。 */
  private openPet(): void {
    GameLog.shared.info("MainApp", "click pet");
    if (this.blockWirePage("pet")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("pet");
    this.refreshChrome();
  }

  private mountPet(): Node {
    this.pet?.dispose();
    const page = buildWirePetPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.pet = page;
    return page.node;
  }

  /** 真服世界等级。未同步 Toast。已同步压入只读页，不写金币。不做 20101。 */
  private openWorld(): void {
    GameLog.shared.info("MainApp", "click world");
    if (this.blockWirePage("world")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("world");
    this.refreshChrome();
  }

  private mountWorld(): Node {
    this.world?.dispose();
    const page = buildWireWorldPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.world = page;
    return page.node;
  }

  /** 真服基金列表。未同步 Toast。已同步压入只读页，不领奖，不写金币。不发 20018。不发 20004、20010。不做 3007。 */
  private openPromotion(): void {
    GameLog.shared.info("MainApp", "click promotion");
    if (this.blockWirePage("promotion")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("promotion");
    this.refreshChrome();
  }

  private mountPromotion(): Node {
    this.promotion?.dispose();
    const page = buildWirePromotionPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.promotion = page;
    return page.node;
  }

  /** 真服超值首充。未同步 Toast。已同步压入只读页，不领奖，不写金币。不发 20013。不做 13260。 */
  private openFirstRecharge(): void {
    GameLog.shared.info("MainApp", "click first-recharge");
    if (this.blockWirePage("firstRecharge")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("firstRecharge");
    this.refreshChrome();
  }

  private mountFirstRecharge(): Node {
    this.firstRecharge?.dispose();
    const page = buildWireFirstRechargePage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.firstRecharge = page;
    return page.node;
  }

  /** 真服灵器数据。未同步 Toast。已同步压入只读页，不激活，不穿，不卸，不转换，不合成。不发 70002–70006。不做 20011。 */
  private openReiki(): void {
    GameLog.shared.info("MainApp", "click reiki");
    if (this.blockWirePage("reiki")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("reiki");
    this.refreshChrome();
  }

  private mountReiki(): Node {
    this.reiki?.dispose();
    const page = buildWireReikiPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.reiki = page;
    return page.node;
  }

  /** 真服浮空岛时间。未同步 Toast。已同步压入只读页，不挑战，不买次数。不发 73002、73003、73004。不做 20011。 */
  private openIslands(): void {
    GameLog.shared.info("MainApp", "click islands");
    if (this.blockWirePage("islands")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("islands");
    this.refreshChrome();
  }

  private mountIslands(): Node {
    this.islands?.dispose();
    const page = buildWireIslandsPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.islands = page;
    return page.node;
  }

  /** 真服图腾信息。未同步 Toast。已同步压入只读页，不升级，不升阶，不装备，不卸下，不更换，不重置。不发 74301、74302、74303。74304 勿当拉包。不做 20011。 */
  private openTotems(): void {
    GameLog.shared.info("MainApp", "click totems");
    if (this.blockWirePage("totems")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("totems");
    this.refreshChrome();
  }

  private mountTotems(): Node {
    this.totems?.dispose();
    const page = buildWireTotemsPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.totems = page;
    return page.node;
  }

  /** 真服星盘数据。未同步 Toast。已同步压入只读页，不激活元素，不点亮，不重置，不激活星盘。不发 68002、68003、68004、68006。68005 勿当拉包。不做 20011。 */
  private openAstrolabe(): void {
    GameLog.shared.info("MainApp", "click astrolabe");
    if (this.blockWirePage("astrolabe")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("astrolabe");
    this.refreshChrome();
  }

  private mountAstrolabe(): Node {
    this.astrolabe?.dispose();
    const page = buildWireAstrolabePage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.astrolabe = page;
    return page.node;
  }

  /** 真服魔方数据。未同步 Toast。已同步压入只读页，不添加，不卸下，不开格子，不清 cd。不发 75502、75503、75504、75505。75506 勿当拉包。不做 34001。不做 20011。 */
  private openTweakCube(): void {
    GameLog.shared.info("MainApp", "click tweak cube");
    if (this.blockWirePage("tweakCube")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("tweakCube");
    this.refreshChrome();
  }

  private mountTweakCube(): Node {
    this.tweakCube?.dispose();
    const page = buildWireTweakCubePage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.tweakCube = page;
    return page.node;
  }

  /** 真服圣龙数据。未同步 Toast。已同步压入只读页，不放源石，不提升鉴定，不加速，不领奖，不升等级，不替换，不调顺序，不升星，不分解。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。59010 单独拉包，勿与本请求合并，勿当写号。不做 34001。不做 20011。 */
  private openDragon(): void {
    GameLog.shared.info("MainApp", "click dragon");
    if (this.blockWirePage("dragon")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("dragon");
    this.refreshChrome();
  }

  private mountDragon(): Node {
    this.dragon?.dispose();
    const page = buildWireDragonPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.dragon = page;
    return page.node;
  }

  /** 真服圣物图鉴。未同步 Toast。已同步压入只读页，不放源石，不提升鉴定，不加速，不领奖，不升等级，不替换，不调顺序，不升星，不分解。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。勿与 59001 合并成一个请求。不做 34001。不做 20011。 */
  private openDragonCollection(): void {
    GameLog.shared.info("MainApp", "click dragon collection");
    if (this.blockWirePage("dragonCollection")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("dragonCollection");
    this.refreshChrome();
  }

  private mountDragonCollection(): Node {
    this.dragonCollection?.dispose();
    const page = buildWireDragonCollectionPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.dragonCollection = page;
    return page.node;
  }

  /** 真服称号列表。未同步 Toast。已同步压入只读页。end_time：-1 永久，0 未激活，时间戳为到期。无扣费，无领奖，无日刷。Title.proto 仅 55001 读写对，同模块无写号。34001 另只读接在其后。不做 20011。 */
  private openTitleList(): void {
    GameLog.shared.info("MainApp", "click title list");
    if (this.blockWirePage("titleList")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("titleList");
    this.refreshChrome();
  }

  private mountTitleList(): Node {
    this.titleList?.dispose();
    const page = buildWireTitlePage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.titleList = page;
    return page.node;
  }

  /** 真服头像列表。未同步 Toast。已同步压入只读页。idx_list 是已解锁头像 id。无更换入口。不发 34002。34003 不当拉包。32001 另只读接在其后。不做 20011。 */
  private openHeadPortrait(): void {
    GameLog.shared.info("MainApp", "click head portrait");
    if (this.blockWirePage("headPortrait")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("headPortrait");
    this.refreshChrome();
  }

  private mountHeadPortrait(): Node {
    this.headPortrait?.dispose();
    const page = buildWireHeadPortraitPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.headPortrait = page;
    return page.node;
  }

  /** 真服头像框数据。未同步 Toast。已同步压入只读页。units 是 id、active_state。无激活、切换入口。不发 32002。不发 32003。32003 不当拉包。4402 另只读接在其后。29001 有 page，硬禁。不做 20011。 */
  private openBorder(): void {
    GameLog.shared.info("MainApp", "click border data");
    if (this.blockWirePage("borderData")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("borderData");
    this.refreshChrome();
  }

  private mountBorder(): Node {
    this.borderData?.dispose();
    const page = buildWireBorderPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.borderData = page;
    return page.node;
  }

  /** 真服激活皮肤列表。未同步 Toast。已同步压入只读页。list 是 hero_type、fashion_id、level、status、end_time。status：0 永久，1 限时。无激活、替换、升级入口。不发 4403、4404、4405。4406 无实现，勿发。4401 另只读接在其后，勿合并。29001 有 page，硬禁。不做 20011。 */
  private openFashion(): void {
    GameLog.shared.info("MainApp", "click fashion list");
    if (this.blockWirePage("fashionList")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("fashionList");
    this.refreshChrome();
  }

  private mountFashion(): Node {
    this.fashionList?.dispose();
    const page = buildWireFashionPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.fashionList = page;
    return page.node;
  }

  /** 真服穿戴皮肤英雄列表。未同步 Toast。已同步压入只读页。list 是 hero_id、fashion_id。无激活、替换、升级入口。不发 4403、4404、4405。4406 无实现，勿发。与 4402 分刀，勿合并。本刀不重复拉 4402。4201 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。 */
  private openWornFashion(): void {
    GameLog.shared.info("MainApp", "click worn fashion");
    if (this.blockWirePage("wornFashion")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("wornFashion");
    this.refreshChrome();
  }

  private mountWornFashion(): Node {
    this.wornFashion?.dispose();
    const page = buildWireWornFashionPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.wornFashion = page;
    return page.node;
  }

  /** 真服英雄祈愿数据。未同步 Toast。已同步压入只读页。privilege、end_time。privilege：0/1。end_time 未开为 0。无祈愿写入口。不发 4202。74104 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 4401 分刀，勿合并。本刀不重复拉 4401。 */
  private openHeroPrayer(): void {
    GameLog.shared.info("MainApp", "click hero prayer");
    if (this.blockWirePage("heroPrayer")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("heroPrayer");
    this.refreshChrome();
  }

  private mountHeroPrayer(): Node {
    this.heroPrayer?.dispose();
    const page = buildWireHeroPrayerPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.heroPrayer = page;
    return page.node;
  }

  /** 真服宠物图鉴。未同步 Toast。已同步压入只读页，列出已解锁宠物类型。无升级、携带、卸下入口。不发 74101、74102、74103。74105、74106 是背包增减推送，勿当拉包。28100 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74100、4201 分开发，勿合并。本刀不重复拉 74100，也不重复拉 4201。 */
  private openPetIllustrate(): void {
    GameLog.shared.info("MainApp", "click pet illustrate");
    if (this.blockWirePage("petIllustrate")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("petIllustrate");
    this.refreshChrome();
  }

  private mountPetIllustrate(): Node {
    this.petIllustrate?.dispose();
    const page = buildWirePetIllustratePage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.petIllustrate = page;
    return page.node;
  }

  /** 真服羁绊数据。未同步 Toast。已同步压入只读页，列出 reset_count 和 goddess。无升级、升技、突破、重置、铸魂、契约、洗炼、领奖、精炼入口。不发 28101、28102、28104、28105、28106、28108、28109、28002、28003。28200 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74104、4201 分开发，勿合并。本刀不重复拉 74104，也不重复拉 4201。 */
  private openFetter(): void {
    GameLog.shared.info("MainApp", "click fetter");
    if (this.blockWirePage("fetterData")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("fetterData");
    this.refreshChrome();
  }

  private mountFetter(): Node {
    this.fetterData?.dispose();
    const page = buildWireFetterPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.fetterData = page;
    return page.node;
  }

  /** 真服羁绊皮肤。未同步 Toast。已同步压入只读页，列出 active_type 和 use_type。无熔炼、激活、领任务奖、使用皮肤入口。不发 28201、28202、28203、28204、28205。28203 任务列表虽只读，本刀勿夹发。不发 28101–28109、28002、28003。75601 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28100、74104 分开发，勿合并。本刀不重复拉 28100，也不重复拉 74104。 */
  private openFetterFashion(): void {
    GameLog.shared.info("MainApp", "click fetter fashion");
    if (this.blockWirePage("fetterFashion")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("fetterFashion");
    this.refreshChrome();
  }

  private mountFetterFashion(): Node {
    this.fetterFashion?.dispose();
    const page = buildWireFetterFashionPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.fetterFashion = page;
    return page.node;
  }

  /** 真服神兵数据。未同步 Toast。已同步压入只读页，列出 job、coreLv、equipData、fighting。无合成、装备、核心升级、分解入口。不发 75602、75603、75604、75605。不发 75619、75609。75606 职级信息另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28200、28100 分开发，勿合并。本刀不重复拉 28200，也不重复拉 28100。 */
  private openShenBin(): void {
    GameLog.shared.info("MainApp", "click shen bin");
    if (this.blockWirePage("shenBin")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("shenBin");
    this.refreshChrome();
  }

  private mountShenBin(): Node {
    this.shenBin?.dispose();
    const page = buildWireShenBinPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.shenBin = page;
    return page.node;
  }

  /** 真服职级信息。未同步 Toast。已同步压入只读页，列出 oc_id 和 taskInfos。无晋升、手动完成任务入口。不发 75607、75609。75608 为服推，勿当 c2s。不发 75602、75603、75604、75605、75619。75615 神兵道具另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75601、28200 分开发，勿合并。本刀不重复拉 75601，也不重复拉 28200。 */
  private openOccupation(): void {
    GameLog.shared.info("MainApp", "click occupation");
    if (this.blockWirePage("occupation")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("occupation");
    this.refreshChrome();
  }

  private mountOccupation(): Node {
    this.occupation?.dispose();
    const page = buildWireOccupationPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.occupation = page;
    return page.node;
  }

  /** 真服神兵道具。未同步 Toast。已同步压入只读页，列出 item_type 和 itemNum。902048 标精华。无合成、装备、分解、晋升入口。不发 75602、75603、75604、75605、75619。不发 75607、75609。75608 为服推，勿当 c2s。28107 查看契约另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75606、75601 分开发，勿合并。本刀不重复拉 75606，也不重复拉 75601。 */
  private openRoleShenBin(): void {
    GameLog.shared.info("MainApp", "click role shen bin");
    if (this.blockWirePage("roleShenBin")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("roleShenBin");
    this.refreshChrome();
  }

  private mountRoleShenBin(): Node {
    this.roleShenBin?.dispose();
    const page = buildWireRoleShenBinPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.roleShenBin = page;
    return page.node;
  }

  /** 真服契约。未同步 Toast。已同步压入只读页，列出已激活 contracts。不保证顺序。无解锁契约、升级、升技、突破、重置、铸魂、洗炼入口。不发 28101、28102、28104、28105、28106、28108、28109。不发 28002、28003、28004。不发 28201–28205。3099 查询阵法另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75615、75606 分开发，勿合并。本刀不重复拉 75615，也不重复拉 75606。 */
  private openFetterContract(): void {
    GameLog.shared.info("MainApp", "click fetter contract");
    if (this.blockWirePage("fetterContract")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("fetterContract");
    this.refreshChrome();
  }

  private mountFetterContract(): Node {
    this.fetterContract?.dispose();
    const page = buildWireFetterContractPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.fetterContract = page;
    return page.node;
  }

  /** 真服阵法。未同步 Toast。已同步压入只读页，列出已解锁 unlockIds。不保证顺序。无解锁阵法、保存战斗队列入口。不发 3097、3098、3100。不发 3102、3030。3101 副本队列另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28107、75615 分开发，勿合并。本刀不重复拉 28107，也不重复拉 75615。 */
  private openFormation(): void {
    GameLog.shared.info("MainApp", "click formation");
    if (this.blockWirePage("formation")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("formation");
    this.refreshChrome();
  }

  private mountFormation(): Node {
    this.formation?.dispose();
    const page = buildWireFormationPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.formation = page;
    return page.node;
  }

  /** 真服副本队列。未同步 Toast。已同步压入只读页，列出 list 与 assistance_unlock。无保存队列、解锁阵法入口。不发 3100、3098、3097、3030、3102、3103。3099 勿再发。不做备选 5001。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 3099 分开发，勿合并。本刀不重复拉 3099。 */
  private openLineUp(): void {
    GameLog.shared.info("MainApp", "click lineup");
    if (this.blockWirePage("lineUp")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("lineUp");
    this.refreshChrome();
  }

  private mountLineUp(): Node {
    this.lineUp?.dispose();
    const page = buildWireLineUpPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.lineUp = page;
    return page.node;
  }

  /** 真服进行中活动。未同步 Toast。已同步压入只读页，列出 promotions。无领奖入口。同文件 20102 非空体勿挂。不发各活动领奖写号。不做 20011。51001、5001 已有，勿重复。3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3101 分开发，勿合并。本刀不重复拉 3101，也不重复拉 3099。 */
  private openRunningPromotion(): void {
    GameLog.shared.info("MainApp", "click running promotion");
    if (this.blockWirePage("runningPromotion")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("runningPromotion");
    this.refreshChrome();
  }

  private mountRunningPromotion(): Node {
    this.runningPromotion?.dispose();
    const page = buildWireRunningPromotionPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.runningPromotion = page;
    return page.node;
  }

  /** 真服爬塔首通已领。未同步 Toast。已同步压入只读页，列出已领 idx。无买票、领首通、扫荡入口。不发 3202、3204、3205、3206、3220。3200 本轮勿挂。4044 英雄等级重生次数另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3099、3101、20101 勿再发。不做 3012、3010、19001。12020 每日任务列表另只读接在 13010 之后。4601 有 page，硬禁。29001 有 page，硬禁。与 20101 分开发，勿合并。本刀不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openTowerReward(): void {
    GameLog.shared.info("MainApp", "click tower reward");
    if (this.blockWirePage("towerReward")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("towerReward");
    this.refreshChrome();
  }

  private mountTowerReward(): Node {
    this.towerReward?.dispose();
    const page = buildWireTowerRewardPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.towerReward = page;
    return page.node;
  }

  /** 真服英雄等级重生次数。未同步 Toast。已同步压入只读页，写出 times。无重生、扣费、清符文、降级、返还入口。不发 4043。13010 签到列表另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3203 分开发，勿合并。本刀不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openHeroLevelResetTimes(): void {
    GameLog.shared.info("MainApp", "click hero level reset times");
    if (this.blockWirePage("heroLevelResetTimes")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("heroLevelResetTimes");
    this.refreshChrome();
  }

  private mountHeroLevelResetTimes(): Node {
    this.heroLevelResetTimes?.dispose();
    const page = buildWireHeroLevelResetTimesPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.heroLevelResetTimes = page;
    return page.node;
  }

  /** 真服签到列表。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 days、isSignIn、month、charged、newServer。无领奖入口。不发 13011。12020 每日任务列表另只读接在其后，勿合并。不做 20011。不是启动链 12010。5001、51001 已有，勿重复。4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 4044 分开发，勿合并。本刀不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openSignInList(): void {
    GameLog.shared.info("MainApp", "click sign in list");
    if (this.blockWirePage("signInList")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("signInList");
    this.refreshChrome();
  }

  private mountSignInList(): Node {
    this.signInList?.dispose();
    const page = buildWireSignInListPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.signInList = page;
    return page.node;
  }

  /** 真服每日任务列表。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 Task、RewardBoxIdx、DailyValue。无领奖入口。不发 12021。不发 12022。26002 每日福利列表另只读接在其后，勿合并。26001 每月福利列表另只读接在 26002 之后，勿合并。不做 20011。不是启动链 12010。5001、51001 已有，勿重复。13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 13010 分开发，勿合并。本刀不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openDailyTaskList(): void {
    GameLog.shared.info("MainApp", "click daily task list");
    if (this.blockWirePage("dailyTaskList")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("dailyTaskList");
    this.refreshChrome();
  }

  private mountDailyTaskList(): Node {
    this.dailyTaskList?.dispose();
    const page = buildWireDailyTaskListPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.dailyTaskList = page;
    return page.node;
  }

  /** 真服每日福利列表。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 list（giftPackId、num）。无领奖入口。26001 每月福利列表另只读接在其后，勿合并。不发明领奖写号。不发 12021。不发 12022。不做 20011。不是启动链 12010。不是每日任务列表 12020。5001、51001 已有，勿重复。12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 12020 分开发，勿合并。本刀不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openDailyWelfareList(): void {
    GameLog.shared.info("MainApp", "click daily welfare list");
    if (this.blockWirePage("dailyWelfareList")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("dailyWelfareList");
    this.refreshChrome();
  }

  private mountDailyWelfareList(): Node {
    this.dailyWelfareList?.dispose();
    const page = buildWireDailyWelfareListPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.dailyWelfareList = page;
    return page.node;
  }

  /** 真服每月福利列表。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 list（giftPackId、num）。无领奖入口。不重复拉 26002。不发明领奖写号。不发 12021。不发 12022。61001 周末礼包另只读接在其后，勿合并。不做 20011。不是启动链 12010。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 26002 分开发，勿合并。本刀不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openMouthWelfareList(): void {
    GameLog.shared.info("MainApp", "click mouth welfare list");
    if (this.blockWirePage("mouthWelfareList")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("mouthWelfareList");
    this.refreshChrome();
  }

  private mountMouthWelfareList(): Node {
    this.mouthWelfareList?.dispose();
    const page = buildWireMouthWelfareListPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.mouthWelfareList = page;
    return page.node;
  }

  /** 真服周末礼包。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 start_time、end_time、reward_status。无领奖入口。不重复拉 26001。不发 61002。不做 62001。不做 63001。不发明领奖写号。不发 12021。不发 12022。不做 20011。不是启动链 12010。不是每月福利列表 26001。不是每日福利列表 26002。5001、51001 已有，勿重复。26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 26001 分开发，勿合并。本刀不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openWeekendGift(): void {
    GameLog.shared.info("MainApp", "click weekend gift");
    if (this.blockWirePage("weekendGift")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("weekendGift");
    this.refreshChrome();
  }

  private mountWeekendGift(): Node {
    this.weekendGift?.dispose();
    const page = buildWireWeekendGiftPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.weekendGift = page;
    return page.node;
  }

  /** 真服神迹遗物。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 buyCount、canChallengeCount、starMap、starRewardRecord。无挑战、买次数、领星级奖、扫荡入口。不重复拉 61001。不发 62002。不发 62003。不发 62004。不发 62005。不做 63001。不做 20011。不是周末礼包 61001。不是每月福利列表 26001。5001、51001 已有，勿重复。61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 61001 分开发，勿合并。本刀不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openGodRelic(): void {
    GameLog.shared.info("MainApp", "click god relic");
    if (this.blockWirePage("godRelic")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("godRelic");
    this.refreshChrome();
  }

  private mountGodRelic(): Node {
    this.godRelic?.dispose();
    const page = buildWireGodRelicPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.godRelic = page;
    return page.node;
  }

  /** 真服英雄殿堂。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 type、rankRole、isReward、isWorship、serverRankRole。无膜拜、领排名奖入口。不重复拉 62001。不发 63002。不发 63003。69001 积天豪礼2另帧，勿合并。不发 69002。不做 71001。不做 20011。不是神迹遗物 62001。不是周末礼包 61001。5001、51001 已有，勿重复。62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 62001 分开发，勿合并。本刀不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openHeroPalace(): void {
    GameLog.shared.info("MainApp", "click hero palace");
    if (this.blockWirePage("heroPalace")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("heroPalace");
    this.refreshChrome();
  }

  private mountHeroPalace(): Node {
    this.heroPalace?.dispose();
    const page = buildWireHeroPalacePage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.heroPalace = page;
    return page.node;
  }

  /** 真服积天豪礼2。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 day、money、hasReward。无领奖入口。不重复拉 63001。不发 69002。不做 71001。不做 20011。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。5001、51001、68001、70001 已有，勿重复。63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 63001 分开发，勿合并。本刀不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openRechargeDaysB(): void {
    GameLog.shared.info("MainApp", "click recharge days b");
    if (this.blockWirePage("rechargeDaysB")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("rechargeDaysB");
    this.refreshChrome();
  }

  private mountRechargeDaysB(): Node {
    this.rechargeDaysB?.dispose();
    const page = buildWireRechargeDaysBPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.rechargeDaysB = page;
    return page.node;
  }

  /** 真服时空魔塔。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 mission_id、accumulate_pass、max_pass、heart、mission_mark、starttime、endtime。无挑战、无排行入口。不重复拉 69001。不发 74002。不发 74003。不做 73002。不做 71001。不做 20011。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。5001、51001、68001、70001 已有，勿重复。69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 69001 分开发，勿合并。本刀不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openTimeTower(): void {
    GameLog.shared.info("MainApp", "click time tower");
    if (this.blockWirePage("timeTower")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("timeTower");
    this.refreshChrome();
  }

  private mountTimeTower(): Node {
    this.timeTower?.dispose();
    const page = buildWireTimeTowerPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.timeTower = page;
    return page.node;
  }

  /** 真服时空冒险。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 unlock_route、not_route、energy、not_progress、end_time、shop_end_time、shop_list、status、product_end_time、product_id、product_buy、speed_buff。无选择航线、加点、修理、购买、改名、探索、放弃、执行、结算、礼包、疾风之力入口。不重复拉 74001。不发 74123。不发 74124。不发 74125。不发 74126。不发 74127。不发 74128。不发 74129。不发 74131。不发 74142。不发 74147。不发 74148。不发 74149。不夹发 74121。不夹发 74122。不做 76501。不做 73002。不做 71001。不做 20011。不是时空魔塔 74001。不是积天豪礼2 69001。5001、51001、68001、70001 已有，勿重复。74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 74001 分开发，勿合并。本刀不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openSpaceTimeAdventure(): void {
    GameLog.shared.info("MainApp", "click space time adventure");
    if (this.blockWirePage("spaceTimeAdventure")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("spaceTimeAdventure");
    this.refreshChrome();
  }

  private mountSpaceTimeAdventure(): Node {
    this.spaceTimeAdventure?.dispose();
    const page = buildWireSpaceTimeAdventurePage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.spaceTimeAdventure = page;
    return page.node;
  }

  /** 真服斩魔之路。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 normal_list、king_list、state。无领奖、无王者购买入口。不重复拉 74120。不发 76543。不发 76544。不发 76502。不发 76503。不发 76504。不发 76505。不发 76506。不发 76541。不发 76501。不夹发 74121。不夹发 74122。不做 75001。不做 73002。不做 71001。不做 20011。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 74120 分开发，勿合并。本刀不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openMagicTowerRoad(): void {
    GameLog.shared.info("MainApp", "click magic tower road");
    if (this.blockWirePage("magicTowerRoad")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("magicTowerRoad");
    this.refreshChrome();
  }

  private mountMagicTowerRoad(): Node {
    this.magicTowerRoad?.dispose();
    const page = buildWireMagicTowerRoadPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.magicTowerRoad = page;
    return page.node;
  }

  /** 真服七神器。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 buy。无购买入口。不重复拉 76542。不发 75102。75102 是购买推送 s2c，勿当 c2s。本模块无独立购写号。75121 诸神祭坛另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76542 分开发，勿合并。不并入 76542。本刀不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openQiShenQi(): void {
    GameLog.shared.info("MainApp", "click qi shen qi");
    if (this.blockWirePage("qiShenQi")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("qiShenQi");
    this.refreshChrome();
  }

  private mountQiShenQi(): Node {
    this.qiShenQi?.dispose();
    const page = buildWireQiShenQiPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.qiShenQi = page;
    return page.node;
  }

  /** 真服诸神祭坛。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 info.floor 与 moneyDrawNum。无抽奖入口。不重复拉 75101。不发 75122。75122 是抽奖，不编码、不发送。75131 赏月佳肴另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75101 分开发，勿合并。不并入 75101。本刀不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openZhuShenJiTan(): void {
    GameLog.shared.info("MainApp", "click zhu shen ji tan");
    if (this.blockWirePage("zhuShenJiTan")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("zhuShenJiTan");
    this.refreshChrome();
  }

  private mountZhuShenJiTan(): Node {
    this.zhuShenJiTan?.dispose();
    const page = buildWireZhuShenJiTanPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.zhuShenJiTan = page;
    return page.node;
  }

  /** 真服赏月佳肴。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 buy。无购买入口。不重复拉 75121。不发 75132。75132 是购买推送 s2c，勿当 c2s。不夹 75122。不夹 75102。75801 秋赏明月另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75121 分开发，勿合并。不并入 75121。本刀不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openMidFood(): void {
    GameLog.shared.info("MainApp", "click mid food");
    if (this.blockWirePage("midFood")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("midFood");
    this.refreshChrome();
  }

  private mountMidFood(): Node {
    this.midFood?.dispose();
    const page = buildWireMidFoodPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.midFood = page;
    return page.node;
  }

  /** 真服秋赏明月。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 select_info、lottery_reward、lottery_count、lottery_best_remaining_count。无选档、无抽奖、无领次数奖入口。不重复拉 75131。不发 75802。不发 75803。不发 75804。75901 万圣抽奖另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75131 分开发，勿合并。不并入 75131。本刀不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openQiuShangMingYue(): void {
    GameLog.shared.info("MainApp", "click qiu shang ming yue");
    if (this.blockWirePage("qiuShangMingYue")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("qiuShangMingYue");
    this.refreshChrome();
  }

  private mountQiuShangMingYue(): Node {
    this.qiuShangMingYue?.dispose();
    const page = buildWireQiuShangMingYuePage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.qiuShangMingYue = page;
    return page.node;
  }

  /** 真服万圣抽奖。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 select_info、lottery_reward、lottery_count、lottery_best_remaining_count、last_lottery_id。无选档、无抽奖、无领次数奖入口。不重复拉 75801。不发 75902。不发 75903。不发 75904。不夹发 75931、75932。不夹发 75941–75944。76001 黑五活动另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是秋赏明月 75801。不是赏月佳肴 75131。5001、51001、68001、70001 已有，勿重复。75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75801 分开发，勿合并。不并入 75801。本刀不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openWanShengLottery(): void {
    GameLog.shared.info("MainApp", "click wan sheng lottery");
    if (this.blockWirePage("wanShengLottery")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("wanShengLottery");
    this.refreshChrome();
  }

  private mountWanShengLottery(): Node {
    this.wanShengLottery?.dispose();
    const page = buildWireWanShengLotteryPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.wanShengLottery = page;
    return page.node;
  }

  /** 真服黑五活动。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 mission、mission_box_reward_record、mission_reward_count、buy。无领任务奖、无进度写、无领任务箱、无购礼包入口。不重复拉 75901。不发 76002。不发 76003。不发 76004。不发 76005。不夹发 76021、76022。76101 约惠圣诞另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是万圣抽奖 75901。不是秋赏明月 75801。5001、51001、68001、70001 已有，勿重复。75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75901 分开发，勿合并。不并入 75901。本刀不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openHeiWuMission(): void {
    GameLog.shared.info("MainApp", "click hei wu mission");
    if (this.blockWirePage("heiWuMission")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("heiWuMission");
    this.refreshChrome();
  }

  private mountHeiWuMission(): Node {
    this.heiWuMission?.dispose();
    const page = buildWireHeiWuMissionPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.heiWuMission = page;
    return page.node;
  }

  /** 真服约惠圣诞礼包。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 buy。buy 是 repeated PSMapData，key 是礼包 idx，value 是已购次数。缺字段不写成 0。无购买入口。不重复拉 76001。不发 76102。旁支勿夹 76082–76084、76121–76122、76141–76143、76161–76163。76301 出游寻春另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是黑五活动 76001。不是万圣抽奖 75901。5001、51001、68001、70001 已有，勿重复。76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76001 分开发，勿合并。不并入 76001。本刀不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openChristmasGift(): void {
    GameLog.shared.info("MainApp", "click christmas gift");
    if (this.blockWirePage("christmasGift")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("christmasGift");
    this.refreshChrome();
  }

  private mountChristmasGift(): Node {
    this.christmasGift?.dispose();
    const page = buildWireChristmasGiftPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.christmasGift = page;
    return page.node;
  }

  /** 真服出游寻春。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 mission、mission_box_reward_record、open_day。缺字段不写成 0。无领任务奖、无进度写、无领宝箱入口。不重复拉 76101。不发 76302。不发 76303。不发 76304。勿夹 76305、76306、76307、76308。76081 圣诞连线另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是约惠圣诞 76101。不是黑五活动 76001。5001、51001、68001、70001 已有，勿重复。76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76101 分开发，勿合并。不并入 76101。本刀不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openSpringOuting(): void {
    GameLog.shared.info("MainApp", "click spring outing");
    if (this.blockWirePage("springOuting")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("springOuting");
    this.refreshChrome();
  }

  private mountSpringOuting(): Node {
    this.springOuting?.dispose();
    const page = buildWireSpringOutingPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.springOuting = page;
    return page.node;
  }

  /** 真服圣诞连线。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 mission、mission_box_reward_record、open_day。缺字段不写成 0。无领任务奖、无进度写、无领任务箱入口。不重复拉 76301。不发 76082。不发 76083。不发 76084。旁支勿夹 76121、76122、76141、76143、76161、76163。76520 关卡榜另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是出游寻春 76301。不是约惠圣诞 76101。5001、51001、68001、70001 已有，勿重复。76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76301 分开发，勿合并。不并入 76301。本刀不重复拉 76301，也不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。 */
  private openChristmasMission(): void {
    GameLog.shared.info("MainApp", "click christmas mission");
    if (this.blockWirePage("christmasMission")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("christmasMission");
    this.refreshChrome();
  }

  private mountChristmasMission(): Node {
    this.christmasMission?.dispose();
    const page = buildWireChristmasMissionPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.christmasMission = page;
    return page.node;
  }

  /** 真服关卡榜。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 self、list 以及行内 rid、server_id、name、border_id、head_id、pass_level、pass_time、rank。缺字段不写成 0。有则含 0/-1 原样。不重复拉 76081。不发 76501–76506。不发 76543。不发 76544。76251 春日踏青另帧，挂在其后，勿合并。不重复拉 76542。不做 75001。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是圣诞连线 76081。不是出游寻春 76301。5001、51001、68001、70001 已有，勿重复。76081、76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76081 分开发，勿合并。不并入 76081。 */
  private openMagicTowerLevelRank(): void {
    GameLog.shared.info("MainApp", "click magic tower level rank");
    if (this.blockWirePage("magicTowerLevelRank")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("magicTowerLevelRank");
    this.refreshChrome();
  }

  private mountMagicTowerLevelRank(): Node {
    this.magicTowerLevelRank?.dispose();
    const page = buildWireMagicTowerLevelRankPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.magicTowerLevelRank = page;
    return page.node;
  }

  /** 真服春日踏青。未同步 Toast「真服未同步」。已同步压入只读页，只写实际出现的 curr_idx、scenic_record、scenic_count。缺字段不写成 0。有则含 0/-1 原样。不重复拉 76520。不发 76252。不发 76253。备选 76271 本轮不做。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是关卡榜 76520。不是出游寻春 76301。5001、51001、68001、70001 已有，勿重复。与 76520 分开发，勿合并。不并入 76520。 */
  private openSpringOutingGrid(): void {
    GameLog.shared.info("MainApp", "click spring outing grid");
    if (this.blockWirePage("springOutingGrid")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("springOutingGrid");
    this.refreshChrome();
  }

  private mountSpringOutingGrid(): Node {
    this.springOutingGrid?.dispose();
    const page = buildWireSpringOutingGridPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.springOutingGrid = page;
    return page.node;
  }

  /** 真服点金。未同步 Toast。已同步压入只读页，不点金，不写金币。不走七日登录。 */
  private openBuyGold(): void {
    GameLog.shared.info("MainApp", "click buygold");
    if (this.blockWirePage("buygold")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("buygold");
    this.refreshChrome();
  }

  private mountBuyGold(): Node {
    this.buyGold?.dispose();
    const page = buildWireActivityPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.buyGold = page;
    return page.node;
  }

  /** 真服成就记录。未同步 Toast。已同步（含空成就表）压入只读页，不领奖。 */
  private openAchievement(): void {
    GameLog.shared.info("MainApp", "click achieve");
    if (this.blockWirePage("achieve")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("achieve");
    this.refreshChrome();
  }

  private mountAchievement(): Node {
    this.achieve?.dispose();
    const page = buildWireAchievementPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.achieve = page;
    return page.node;
  }

  /**
   * 主城和玩法都能进。不看主线等级和开服天。
   * Mock 没连上时不压页面。前往再压一层已有界面，返回回到本页。
   * 真服收到 21010 后走只读页，不领奖。没同步时 Toast，不回落 Mock。不从七日登录或点金进入。
   */
  private openGoal7(): void {
    GameLog.shared.info("MainApp", "click goal7");
    if (this.blockWirePage("goal7")) return;
    if (Session.source === "wire") {
      const net = this.cityNet();
      if (net.state !== "connected") {
        this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
        return;
      }
      this.panels?.openChild("goal7");
      this.refreshChrome();
      return;
    }
    if (!this.allow("goal7")) return;
    if (!this.ensureNet()) return;
    this.panels?.openChild("goal7");
    this.refreshChrome();
  }

  private mountGoal7(): Node {
    if (Session.source === "wire") return this.mountWireGoal7();
    this.goal7?.dispose();
    const page = buildGoal7Page({
      showToast: (text) => this.shell?.showToast(text, 2400),
      alive: () => this.isValid,
      view: () => Proto.goal7View({}, NetClient.shared),
      claim: (id) => Proto.goal7Claim({ id }, NetClient.shared),
      go: (jump) => this.jumpFromGoal(jump),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
        this.bag?.reload();
      },
      close: () => this.back(),
    });
    this.goal7 = page;
    return page.node;
  }

  private mountWireGoal7(): Node {
    this.goal7?.dispose();
    const page = buildWireGoal7Page({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.goal7 = page;
    return page.node;
  }

  /**
   * 主城和玩法都能进。样例 opencondition 没有商店，新号即可进。
   * 没连上时不压页面。
   */
  private openShop(): void {
    GameLog.shared.info("MainApp", "click shop");
    if (this.blockWirePage("shop")) return;
    if (!this.allow("shop")) return;
    if (!this.ensureNet()) return;
    this.panels?.openChild("shop");
    this.refreshChrome();
  }

  private mountShop(): Node {
    this.shop?.dispose();
    const page = buildShopPage({
      showToast: (text) => this.shell?.showToast(text, 2400),
      alive: () => this.isValid,
      view: () => Proto.shopView({}, NetClient.shared),
      buy: (id) => Proto.shopBuy({ id }, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
        this.bag?.reload();
      },
      close: () => this.back(),
    });
    this.shop = page;
    return page.node;
  }

  /**
   * 玩法「许愿池」。Mock 未到主线 Lv10 时 allow 已经 Toast，不会进到这里。只做低级。
   * 真服收到 27001 后走只读页，不看这把锁。没同步时 Toast，不回落 Mock。
   */
  private mountWish(): Node {
    if (Session.source === "wire") return this.mountWireWish();
    this.wish?.dispose();
    const page = buildWishPage({
      showToast: (text) => this.shell?.showToast(text, 2400),
      alive: () => this.isValid,
      view: () => Proto.wishView({}, NetClient.shared),
      draw: (pay) => Proto.wishDraw({ pay }, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
        this.bag?.reload();
      },
      close: () => this.back(),
    });
    this.wish = page;
    return page.node;
  }

  private mountWireWish(): Node {
    this.wish?.dispose();
    const page = buildWireWishPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.wish = page;
    return page.node;
  }

  /** 玩法「咖啡馆」。未到主线 Lv12 时 allow 已经 Toast，不会进到这里。 */
  private mountCafe(): Node {
    this.cafe?.dispose();
    const page = buildCafePage({
      showToast: (text) => this.shell?.showToast(text, 2400),
      alive: () => this.isValid,
      view: () => Proto.cafeView({}, NetClient.shared),
      send: (heroIds) => Proto.cafeSend({ heroIds }, NetClient.shared),
      claim: () => Proto.cafeClaim({}, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
        this.bag?.reload();
      },
      close: () => this.back(),
    });
    this.cafe = page;
    return page.node;
  }

  /**
   * 主城和玩法都能进。不看主线等级和开服天。
   * 没连上时不压页面。页内再分升级有礼、每日礼包、首充和累充。
   */
  private openGift(): void {
    GameLog.shared.info("MainApp", "click gift");
    if (this.blockWirePage("gift")) return;
    if (!this.allow("gift")) return;
    if (!this.ensureNet()) return;
    this.panels?.openChild("gift");
    this.refreshChrome();
  }

  private mountGift(): Node {
    this.gift?.dispose();
    const page = buildGiftPage({
      showToast: (text) => this.shell?.showToast(text, 2400),
      alive: () => this.isValid,
      view: () => Proto.giftView({}, NetClient.shared),
      claimLevel: (level) => Proto.giftClaimLevel({ level }, NetClient.shared),
      buyDaily: () => Proto.giftBuyDaily({}, NetClient.shared),
      recharge: (kind) => Proto.giftRecharge({ kind }, NetClient.shared),
      claimAcc: (amount) => Proto.giftClaimAcc({ amount }, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
        this.bag?.reload();
      },
      close: () => this.back(),
    });
    this.gift = page;
    return page.node;
  }

  /**
   * 主城和玩法都能进。不看主线等级和开服天。
   * 没连上时不压页面。页内再分限时兑换、点石成金和限时礼包。
   */
  private openLimited(): void {
    GameLog.shared.info("MainApp", "click limited");
    if (this.blockWirePage("limited")) return;
    if (!this.allow("limited")) return;
    if (!this.ensureNet()) return;
    this.panels?.openChild("limited");
    this.refreshChrome();
  }

  private mountLimited(): Node {
    this.limited?.dispose();
    const page = buildLimitedPage({
      showToast: (text) => this.shell?.showToast(text, 2400),
      alive: () => this.isValid,
      view: () => Proto.limitedView({}, NetClient.shared),
      exchange: (id) => Proto.limitedExchange({ id }, NetClient.shared),
      alchemy: () => Proto.limitedAlchemy({}, NetClient.shared),
      buy: (id) => Proto.limitedBuy({ id }, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
        this.bag?.reload();
      },
      close: () => this.back(),
    });
    this.limited = page;
    return page.node;
  }

  /** 七日目标的「前往」。压在当前页上面，返回仍回到目标列表。 */
  private jumpFromGoal(jump: string): void {
    GameLog.shared.info("MainApp", "goal7 jump " + jump);
    if (this.blockWirePage(jump || "goal")) return;
    if (jump === "mainline") {
      this.openMainline();
      return;
    }
    if (jump === "idle") {
      this.openIdle();
      return;
    }
    if (jump === "hero" && Session.source === "wire") {
      if (!this.allow("hero")) return;
      this.panels?.openChild("hero");
      this.refreshChrome();
      return;
    }
    if (jump === "summon" && Session.source === "wire") {
      if (!this.allow("summon")) return;
      const net = this.cityNet();
      if (net.state !== "connected") {
        this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
        return;
      }
      this.panels?.openChild("summon");
      this.refreshChrome();
      return;
    }
    if (jump === "hero" || jump === "summon") {
      if (!this.allow(jump)) return;
      if (!this.ensureNet()) return;
      this.panels?.openChild(jump);
      this.refreshChrome();
      return;
    }
    this.shell?.showToast(goal7BadJumpToast(), 2200);
  }

  /** 玩法「日常副本」。未到主线 Lv15 时 allow 已经 Toast，不会进到这里。本页只做金币。 */
  private mountDaily(): Node {
    this.daily?.dispose();
    const page = buildDailyGoldPage({
      showToast: (text) => this.shell?.showToast(text, 2400),
      alive: () => this.isValid,
      view: () => Proto.dailyView({}, NetClient.shared),
      challenge: (tierId) => Proto.dailyChallenge({ tierId }, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
        this.bag?.reload();
      },
      close: () => this.back(),
    });
    this.daily = page;
    return page.node;
  }

  /** 玩法「幻境之塔」。未到主线 Lv16 时 allow 已经 Toast，不会进到这里。不是幻魔塔。 */
  private mountTower(): Node {
    this.tower?.dispose();
    const page = buildTowerPage({
      showToast: (text) => this.shell?.showToast(text, 2400),
      alive: () => this.isValid,
      view: () => Proto.towerView({}, NetClient.shared),
      challenge: () => Proto.towerChallenge({}, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
        this.bag?.reload();
      },
      close: () => this.back(),
    });
    this.tower = page;
    return page.node;
  }

  /** 底栏「铁匠铺」。未到主线 Lv5 时 allow 已经 Toast，不会进到这里。 */
  private mountSmith(): Node {
    this.smith?.dispose();
    const page = buildSmithPage({
      showToast: (text) => this.shell?.showToast(text, 2400),
      alive: () => this.isValid,
      view: () => Proto.smithView({}, NetClient.shared),
      strengthen: (heroId) => Proto.smithStrengthen({ heroId }, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
        this.bag?.reload();
        this.heroList?.reload();
        this.heroDetail?.reload();
      },
      close: () => this.back(),
    });
    this.smith = page;
    return page.node;
  }

  /**
   * 底栏「召唤」。Mock 仍单抽和十连。
   * 真服收到 4004 后走只读页。没同步时 Toast，不回落 Mock。不发 4002、4005。
   */
  private mountSummon(): Node {
    if (Session.source === "wire") return this.mountWireSummon();
    this.summon?.dispose();
    const hostCallbacks = {
      diamond: () => Session.diamond,
      showToast: (text: string) => this.shell?.showToast(text, 2200),
      alive: () => this.isValid,
      pull: (count: number) => Proto.summonPull({ count }, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
      },
      close: () => this.back(),
    };
    if (!USE_SUMMON_PREFAB) {
      const page = buildSummonPage(hostCallbacks);
      this.summon = page;
      return page.node;
    }
    const host = uiNode("SummonHost");
    const ticket = ++this.summonTicket;
    void this.attachSummon(host, ticket, hostCallbacks);
    return host;
  }

  private async attachSummon(
    host: Node,
    ticket: number,
    hostCallbacks: {
      diamond: () => number;
      showToast: (text: string) => void;
      alive: () => boolean;
      pull: (count: number) => ReturnType<typeof Proto.summonPull>;
      onProgress: () => void;
      close: () => void;
    }
  ): Promise<void> {
    try {
      const page = await mountSummonPrefab(host, hostCallbacks);
      if (!this.isValid || ticket !== this.summonTicket || !host.isValid) {
        page.dispose();
        return;
      }
      this.summon = page;
    } catch (err) {
      if (!this.isValid || ticket !== this.summonTicket || !host.isValid) return;
      GameLog.shared.error("MainApp", "summon prefab " + messageOf(err) + "，改用代码 UI");
      const page = buildSummonPage(hostCallbacks);
      page.node.parent = host;
      this.summon = page;
    }
  }

  private mountWireSummon(): Node {
    this.summon?.dispose();
    const page = buildWireSummonPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.summon = page;
    return page.node;
  }

  /**
   * 主城和玩法都能进。opencondition 未开时只 Toast，和底栏锁一样。
   * 真服按 5001 是否到过，打开只读页或 Toast，不进 Mock 背包。已同步时不看 net.state。
   */
  private openBag(): void {
    GameLog.shared.info("MainApp", "click bag");
    if (Session.source === "wire") {
      this.openWireBag();
      return;
    }
    if (this.blockWirePage("bag")) return;
    if (!this.allow("bag")) return;
    if (!this.ensureNet()) return;
    this.panels?.openChild("bag");
    this.refreshChrome();
  }

  /** 未同步 Toast。已同步（含空背包）压入只读页，不走 bag.list，也不看 net.state。 */
  private openWireBag(): void {
    if (this.blockWirePage("bag")) return;
    this.panels?.openChild("bag");
    this.refreshChrome();
  }

  private mountBag(): Node {
    if (Session.source === "wire") return this.mountWireBag();
    this.bag?.dispose();
    const page = buildBagPage({
      showToast: (text) => this.shell?.showToast(text, 2200),
      alive: () => this.isValid,
      list: () => Proto.bagList({}, NetClient.shared),
      use: (id, count) => Proto.bagUse({ id, count }, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
        this.heroList?.reload();
        this.smith?.reload();
      },
      close: () => this.back(),
    });
    this.bag = page;
    return page.node;
  }

  private mountWireBag(): Node {
    this.bag?.dispose();
    const page = buildWireBagPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.bag = page;
    return page.node;
  }

  /**
   * 主城和玩法都能进。opencondition 未开时只 Toast，和背包一样。
   * 没连上时不压页面。真服按 15000 是否到过，打开只读页或 Toast，不进 Mock 邮件。
   */
  private openMail(): void {
    GameLog.shared.info("MainApp", "click mail");
    if (Session.source === "wire") {
      this.openWireMail();
      return;
    }
    if (this.blockWirePage("mail")) return;
    if (!this.allow("mail")) return;
    if (!this.ensureNet()) return;
    this.panels?.openChild("mail");
    this.refreshChrome();
  }

  /** 未同步 Toast。已同步（含空邮箱）压入只读页，不走 mail.list，不领取。 */
  private openWireMail(): void {
    if (this.blockWirePage("mail")) return;
    const net = this.cityNet();
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.panels?.openChild("mail");
    this.refreshChrome();
  }

  private mountMail(): Node {
    if (Session.source === "wire") return this.mountWireMail();
    this.mail?.dispose();
    const page = buildMailPage({
      showToast: (text) => this.shell?.showToast(text, 2200),
      alive: () => this.isValid,
      list: () => Proto.mailList({}, NetClient.shared),
      read: (id) => Proto.mailRead({ id }, NetClient.shared),
      claim: (id) => Proto.mailClaim({ id }, NetClient.shared),
      claimAll: () => Proto.mailClaimAll({}, NetClient.shared),
      remove: (id) => Proto.mailDelete({ id }, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
        this.bag?.reload();
        this.smith?.reload();
      },
      close: () => this.back(),
    });
    this.mail = page;
    return page.node;
  }

  private mountWireMail(): Node {
    this.mail?.dispose();
    const page = buildWireMailPage({
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.mail = page;
    return page.node;
  }

  /** 挂机随时可进。Mock 的时长和领取在 IdlePage 里。真服走 3004，不改场景。 */
  private openIdle(): void {
    GameLog.shared.info("MainApp", "click idle");
    if (Session.source === "wire") {
      if (this.blockWirePage("idle")) return;
      this.panels?.openChild("idle");
      this.refreshChrome();
      return;
    }
    if (this.blockWirePage("idle")) return;
    const net = NetClient.shared;
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.openChild("idle");
  }

  private mountIdle(): Node {
    if (Session.source === "wire") return this.mountWireIdle();
    this.idle?.dispose();
    const page = buildIdlePage({
      stageId: () => this.mockStageId(),
      showToast: (text) => this.shell?.showToast(text, 2400),
      alive: () => this.isValid,
      query: () => Proto.idleQuery({}, NetClient.shared),
      claim: () => Proto.idleClaim({}, NetClient.shared),
      enter: (stageId) => Proto.stageEnter({ stageId }, NetClient.shared),
      settle: (req) => Proto.stageResult(req, NetClient.shared),
      push: (target) => Proto.stagePush({ target }, NetClient.shared),
      onProgress: () => {
        if (this.isValid) this.refreshHub();
      },
      close: () => this.back(),
    });
    this.idle = page;
    return page.node;
  }

  private mountWireIdle(): Node {
    this.idle?.dispose();
    const page = buildWireIdlePage({
      showToast: (text) => this.shell?.showToast(text, 2400),
      alive: () => this.isValid,
      close: () => this.back(),
    });
    this.idle = page;
    return page.node;
  }

  private mountMainline(): Node {
    if (Session.source === "wire") return this.mountWireMainline();
    this.mainline?.dispose();
    const page = buildMainlinePage({
      level: () => this.level(),
      roleName: () => Session.role?.name || "勇者",
      stageId: () => this.mockStageId(),
      showToast: (text) => this.shell?.showToast(text, 2200),
      alive: () => this.isValid,
      enter: (stageId) => Proto.stageEnter({ stageId }, NetClient.shared),
      settle: (req) => Proto.stageResult(req, NetClient.shared),
      push: (target) => Proto.stagePush({ target }, NetClient.shared),
      onProgress: () => {
        if (this.isValid) this.refreshHub();
      },
      close: () => this.back(),
    });
    this.mainline = page;
    return page.node;
  }

  private mountWireMainline(): Node {
    this.mainline?.dispose();
    const page = buildWireMainlinePage({
      alive: () => this.isValid,
      close: () => this.back(),
      showToast: (text) => this.shell?.showToast(text, 2200),
      roleName: () => Session.role?.name || "勇者",
      roleId: () => {
        const role = Session.role;
        if (!role || typeof role.roleId !== "number" || !isFinite(role.roleId)) return null;
        return role.roleId;
      },
      connected: () => this.cityNet().state === "connected",
      level: () => this.level(),
      probe: wireDebugEnabled(),
    });
    this.mainline = page;
    return page.node;
  }

  private mockStageId(): number {
    const stored = GameStore.mockStageId();
    if (stored !== null) return stored;
    return Session.stageId >= 1 ? Session.stageId : 1;
  }

  private stageButtonText(): string {
    let text: string;
    let idx: number | null = null;
    if (Session.source === "wire") {
      text = GameStore.source === "wire" ? GameStore.mainlineLabel() : WireSession.mainlineLabel();
      const chapter = GameStore.chapter();
      if (chapter.fromStore) idx = chapter.nowIdx !== null ? chapter.nowIdx : chapter.maxIdx;
    } else if (GameStore.source === "mock") {
      text = GameStore.mainlineLabel();
      idx = GameStore.mockStageId();
    } else {
      const stageId = Session.stageId >= 1 ? Session.stageId : 1;
      text = "主线 · 第" + stageId + "关";
      idx = stageId;
    }
    const place = chapterPlaceLabel(idx);
    return place ? text + " · " + place : text;
  }

  private setMainButton(text: string): void {
    const button = this.mainButton;
    if (!button || !button.isValid) return;
    const label = button.getChildByName("Label");
    if (label) {
      setText(label, text);
      label.active = false;
    }
    this.paintHeroRecommend(button);
  }

  /** 左下角用已有的英雄推荐图。点击仍是原来的主线，不另发协议。 */
  private paintHeroRecommend(button: Node): void {
    const mark = button as Node & { mxzgRecommend?: boolean };
    if (mark.mxzgRecommend) return;
    const sprite = button.getComponent(Sprite);
    if (!sprite) return;
    mark.mxzgRecommend = true;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    const path = "ui/city/main-city_btn-hero-recommend-1/spriteFrame";
    resources.load(path, SpriteFrame, (err, frame) => {
      if (err || !frame || !button.isValid || !sprite.isValid) return;
      sprite.spriteFrame = frame;
    });
  }

  private buildPopup(title: string, body: string): Node {
    const root = uiNode("Popup");
    const ui = root.addComponent(UITransform);
    ui.setContentSize(2000, 2000);
    root.addComponent(BlockInputEvents);

    const dim = createRect("dim", 2000, 2000, new Color(0, 0, 0, 140));
    dim.parent = root;
    place(createRect("card", 480, 280, new Color(22, 36, 64, 255)), root, 0, 10);
    place(createLabel(title, 32, { color: TITLE_COLOR, width: 440 }), root, 0, 80);
    place(createLabel(body, 22, { width: 440 }), root, 0, 20);
    place(
      createButton("关闭", () => {
        GameLog.shared.info("MainApp", "click popup-close");
        this.shell?.closePopup();
      }, 200, 52),
      root,
      0,
      -70
    );
    return root;
  }

  private buildLog(): Node {
    const page = this.pageRoot("LogPage");
    place(createLabel("日志", 40, { color: TITLE_COLOR }), page, 0, 430);
    place(createLabel("最近 10 条，新的在上", 18, { color: MUTED }), page, 0, 380);
    place(createRect("log-bg", 660, 280, new Color(10, 18, 32, 230)), page, 0, 200);
    this.logLabel = place(
      createLabel(this.logText(), 16, {
        color: new Color(214, 224, 236, 255),
        width: 640,
        height: 260,
        align: "left",
      }),
      page,
      0,
      200
    );
    this.detachLog();
    this.offLog = GameLog.shared.subscribe(() => {
      if (this.logLabel && this.logLabel.isValid) setText(this.logLabel, this.logText());
    });
    place(createButton("空名创角", () => void this.tryEmptyCreate(), 180, 48), page, -220, -20);
    place(createButton("断开提示", () => this.toastClosed(), 180, 48), page, 0, -20);
    place(createButton("开服D30", () => this.previewOpenDay(), 180, 48), page, 220, -20);
    place(createButton("返回", () => this.back(), 220, 48), page, 0, -100);
    return page;
  }

  /** 只改本界面的开服天，方便看幻魔塔解锁。下一关结算会按 Mock 进度覆盖。 */
  private previewOpenDay(): void {
    if (Session.source === "wire") {
      this.shell?.showToast("真服开服天还没同步，这里不改", 2200);
      return;
    }
    Session.openDay = 30;
    GameLog.shared.info("MainApp", "preview open day 30");
    this.refreshHub();
    this.shell?.showToast("开服天已设为 30。下一关结算会按 Mock 进度覆盖", 2200);
  }

  private logText(): string {
    const lines = GameLog.shared.recent(10);
    if (lines.length === 0) return "（暂无日志）";
    const newestFirst = lines.slice().reverse();
    return newestFirst.map((line) => GameLog.shared.format(line)).join("\n");
  }

  private noteClose(id: string): void {
    if (id === CITY_HUB_MORE_ID) this.mainButton = null;
    if (id === "log") this.detachLog();
    if (id === "mainline") {
      this.mainline?.dispose();
      this.mainline = null;
    }
    if (id === "idle") {
      this.idle?.dispose();
      this.idle = null;
    }
    if (id === "hero-detail") {
      this.heroDetail?.dispose();
      this.heroDetail = null;
      this.heroList?.reload();
    }
    if (id === "hero") {
      this.heroList?.dispose();
      this.heroList = null;
    }
    if (id === "summon") {
      this.summon?.dispose();
      this.summon = null;
    }
    if (id === "prophet") {
      this.prophet?.dispose();
      this.prophet = null;
    }
    if (id === "jewel") {
      this.jewel?.dispose();
      this.jewel = null;
    }
    if (id === "illustrat") {
      this.illustrat?.dispose();
      this.illustrat = null;
    }
    if (id === "pet") {
      this.pet?.dispose();
      this.pet = null;
    }
    if (id === "world") {
      this.world?.dispose();
      this.world = null;
    }
    if (id === "promotion") {
      this.promotion?.dispose();
      this.promotion = null;
    }
    if (id === "firstRecharge") {
      this.firstRecharge?.dispose();
      this.firstRecharge = null;
    }
    if (id === "reiki") {
      this.reiki?.dispose();
      this.reiki = null;
    }
    if (id === "islands") {
      this.islands?.dispose();
      this.islands = null;
    }
    if (id === "totems") {
      this.totems?.dispose();
      this.totems = null;
    }
    if (id === "astrolabe") {
      this.astrolabe?.dispose();
      this.astrolabe = null;
    }
    if (id === "tweakCube") {
      this.tweakCube?.dispose();
      this.tweakCube = null;
    }
    if (id === "dragon") {
      this.dragon?.dispose();
      this.dragon = null;
    }
    if (id === "dragonCollection") {
      this.dragonCollection?.dispose();
      this.dragonCollection = null;
    }
    if (id === "titleList") {
      this.titleList?.dispose();
      this.titleList = null;
    }
    if (id === "headPortrait") {
      this.headPortrait?.dispose();
      this.headPortrait = null;
    }
    if (id === "borderData") {
      this.borderData?.dispose();
      this.borderData = null;
    }
    if (id === "fashionList") {
      this.fashionList?.dispose();
      this.fashionList = null;
    }
    if (id === "wornFashion") {
      this.wornFashion?.dispose();
      this.wornFashion = null;
    }
    if (id === "heroPrayer") {
      this.heroPrayer?.dispose();
      this.heroPrayer = null;
    }
    if (id === "petIllustrate") {
      this.petIllustrate?.dispose();
      this.petIllustrate = null;
    }
    if (id === "fetterData") {
      this.fetterData?.dispose();
      this.fetterData = null;
    }
    if (id === "fetterFashion") {
      this.fetterFashion?.dispose();
      this.fetterFashion = null;
    }
    if (id === "shenBin") {
      this.shenBin?.dispose();
      this.shenBin = null;
    }
    if (id === "occupation") {
      this.occupation?.dispose();
      this.occupation = null;
    }
    if (id === "roleShenBin") {
      this.roleShenBin?.dispose();
      this.roleShenBin = null;
    }
    if (id === "fetterContract") {
      this.fetterContract?.dispose();
      this.fetterContract = null;
    }
    if (id === "formation") {
      this.formation?.dispose();
      this.formation = null;
    }
    if (id === "lineUp") {
      this.lineUp?.dispose();
      this.lineUp = null;
    }
    if (id === "runningPromotion") {
      this.runningPromotion?.dispose();
      this.runningPromotion = null;
    }
    if (id === "towerReward") {
      this.towerReward?.dispose();
      this.towerReward = null;
    }
    if (id === "heroLevelResetTimes") {
      this.heroLevelResetTimes?.dispose();
      this.heroLevelResetTimes = null;
    }
    if (id === "signInList") {
      this.signInList?.dispose();
      this.signInList = null;
    }
    if (id === "dailyTaskList") {
      this.dailyTaskList?.dispose();
      this.dailyTaskList = null;
    }
    if (id === "dailyWelfareList") {
      this.dailyWelfareList?.dispose();
      this.dailyWelfareList = null;
    }
    if (id === "mouthWelfareList") {
      this.mouthWelfareList?.dispose();
      this.mouthWelfareList = null;
    }
    if (id === "weekendGift") {
      this.weekendGift?.dispose();
      this.weekendGift = null;
    }
    if (id === "godRelic") {
      this.godRelic?.dispose();
      this.godRelic = null;
    }
    if (id === "heroPalace") {
      this.heroPalace?.dispose();
      this.heroPalace = null;
    }
    if (id === "rechargeDaysB") {
      this.rechargeDaysB?.dispose();
      this.rechargeDaysB = null;
    }
    if (id === "timeTower") {
      this.timeTower?.dispose();
      this.timeTower = null;
    }
    if (id === "spaceTimeAdventure") {
      this.spaceTimeAdventure?.dispose();
      this.spaceTimeAdventure = null;
    }
    if (id === "magicTowerRoad") {
      this.magicTowerRoad?.dispose();
      this.magicTowerRoad = null;
    }
    if (id === "qiShenQi") {
      this.qiShenQi?.dispose();
      this.qiShenQi = null;
    }
    if (id === "zhuShenJiTan") {
      this.zhuShenJiTan?.dispose();
      this.zhuShenJiTan = null;
    }
    if (id === "midFood") {
      this.midFood?.dispose();
      this.midFood = null;
    }
    if (id === "qiuShangMingYue") {
      this.qiuShangMingYue?.dispose();
      this.qiuShangMingYue = null;
    }
    if (id === "wanShengLottery") {
      this.wanShengLottery?.dispose();
      this.wanShengLottery = null;
    }
    if (id === "heiWuMission") {
      this.heiWuMission?.dispose();
      this.heiWuMission = null;
    }
    if (id === "christmasGift") {
      this.christmasGift?.dispose();
      this.christmasGift = null;
    }
    if (id === "springOuting") {
      this.springOuting?.dispose();
      this.springOuting = null;
    }
    if (id === "christmasMission") {
      this.christmasMission?.dispose();
      this.christmasMission = null;
    }
    if (id === "magicTowerLevelRank") {
      this.magicTowerLevelRank?.dispose();
      this.magicTowerLevelRank = null;
    }
    if (id === "springOutingGrid") {
      this.springOutingGrid?.dispose();
      this.springOutingGrid = null;
    }
    if (id === "bag") {
      this.bag?.dispose();
      this.bag = null;
    }
    if (id === "mail") {
      this.mail?.dispose();
      this.mail = null;
    }
    if (id === "smith") {
      this.smith?.dispose();
      this.smith = null;
    }
    if (id === "arena") {
      this.arena?.dispose();
      this.arena = null;
    }
    if (id === "tower") {
      this.tower?.dispose();
      this.tower = null;
    }
    if (id === "daily") {
      this.daily?.dispose();
      this.daily = null;
    }
    if (id === "login7") {
      this.login7?.dispose();
      this.login7 = null;
    }
    if (id === "buygold") {
      this.buyGold?.dispose();
      this.buyGold = null;
    }
    if (id === "achieve") {
      this.achieve?.dispose();
      this.achieve = null;
    }
    if (id === "goal7") {
      this.goal7?.dispose();
      this.goal7 = null;
    }
    if (id === "shop") {
      this.shop?.dispose();
      this.shop = null;
    }
    if (id === "wish") {
      this.wish?.dispose();
      this.wish = null;
    }
    if (id === "cafe") {
      this.cafe?.dispose();
      this.cafe = null;
    }
    if (id === "gift") {
      this.gift?.dispose();
      this.gift = null;
    }
    if (id === "limited") {
      this.limited?.dispose();
      this.limited = null;
    }
  }

  private detachWire(): void {
    if (this.offWire) {
      this.offWire();
      this.offWire = null;
    }
  }

  private detachLog(): void {
    if (this.offLog) {
      this.offLog();
      this.offLog = null;
    }
    this.logLabel = null;
  }

  /** 触发 Mock 已有的空名字失败，Toast 应是「角色名不能为空」。 */
  private async tryEmptyCreate(): Promise<void> {
    const shell = this.shell;
    const net = NetClient.shared;
    GameLog.shared.info("MainApp", "click empty-create");
    if (Session.source === "wire") {
      shell?.showToast("真服创角不从这里发，也不会改 Mock 钱包", 2200);
      return;
    }
    if (net.state !== "connected") {
      shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    try {
      const resp = await Proto.roleCreate({ name: "  " }, net);
      if (!this.isValid) return;
      if (!resp.ok) {
        shell?.showToast(errorText(resp.code ?? ErrorCode.ROLE_NAME_EMPTY), 2200);
        return;
      }
      shell?.showToast("创角成功");
    } catch (err) {
      const text = messageOf(err);
      GameLog.shared.error("MainApp", "empty create " + text);
      if (this.isValid) shell?.showToast(text, 2200);
    }
  }

  /** 主动关掉连接并 Toast「网络已断开」。模拟断线仍会重连，不走这里。 */
  private toastClosed(): void {
    GameLog.shared.info("MainApp", "click force-close");
    if (Session.source === "wire") {
      this.shell?.showToast("这颗按钮只测 Mock 断开。真服连接留着", 2200);
      return;
    }
    NetClient.shared.close();
    const text = errorText(ErrorCode.NET_CLOSED);
    GameLog.shared.error("MainApp", text);
    this.shell?.showToast(text, 2200);
  }

  private gateText(): string {
    if (Session.source === "wire") {
      const name = Session.wireSync.name ? "角色名已同步。" : "角色名还没有从 s2c 2001 读到。";
      const missing: string[] = [];
      if (!Session.wireSync.level) missing.push("等级");
      missing.push("开服天");
      if (!Session.wireSync.gold) missing.push("金币");
      if (!Session.wireSync.diamond) missing.push("钻石");
      return "真服已登录。" + name + missing.join("、") + "仍是未同步";
    }
    const db = ConfigDb.current;
    const level = this.level();
    const day = this.day();
    if (!db) return "配置未加载";
    const open = listOpenEntries(db.opencondition, level, day);
    if (open.length === 0) return "Lv" + level + " / 开服D" + day + " 无入口";
    return "Lv" + level + " / 开服D" + day + " 已开：" + open.map((row) => row.name).join("、");
  }

  private level(): number {
    return Session.role?.level ?? 1;
  }

  private day(): number {
    return Session.openDay >= 1 ? Session.openDay : 1;
  }

  private pageRoot(name: string): Node {
    const page = uiNode(name);
    place(createRect("bg", 720, 1280, PAGE_BG), page, 0, 0);
    return page;
  }

  private resolveCanvas(): Node {
    const named = this.node.getChildByName("Canvas");
    if (named) return named;
    if (this.node.name === "Canvas") return this.node;
    const fromScene = this.node.scene?.getChildByName("Canvas");
    return fromScene ?? this.node;
  }
}
