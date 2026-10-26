/**
 * 英雄列表、背包、挂机底栏、出阵，把已有贴图填进 P4 壳。
 * 格子是运行时拼的：HeroListLayer / BackpackLayer 本身没有网格。
 * 不造假英雄、不造假道具、不发新协议。
 */
import { BlockInputEvents, Button, Color, HorizontalTextAlignment, Label, Mask, Node, Overflow, resources, ScrollView, Sprite, SpriteFrame, UITransform } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameStore, StoreBagItem, StoreHero } from "../core/GameStore";
import { GameLog } from "../core/GameLog";
import { Session } from "../core/Session";
import { NetClient } from "../net/NetClient";
import { Proto } from "../net/protocol/Proto";
import { WireSession } from "../net/WireSession";
import { applyIdleClaim, claimToast, IDLE_HERO_EXP_ID, IDLE_ITEM_ID, IDLE_ROLE_EXP_ID } from "../module/idle/rewards";
import { chapterPlaceLabel, heroBaseStats, heroProfile, HeroProfile, itemBagTab, itemIconResource, itemIsWallet, itemProfile, listHeroProfiles } from "../config/gameCatalog";
import { chapterDrops, chapterIdleMinute, DropFace, heroLevelNeed, heroSpaceCap, heroStarNeeds, heroStarStep, idleCapMs, listDragons, listGodGears, listJewels, listRelics, RelicFace, SacrificeNeed, StarStep, vipIdleBonus, vipIdleLine } from "../config/rosterCatalog";
import { IDLE_UNIX_FLOOR, wireIdleCapMs, wireIdleElapsedMs } from "../net/protocol/wireIdle";
import { formationFaceSlot, WIRE_LINEUP_SAVE_POSITIONS } from "../net/protocol/wireLineUpSave";
import { mainFormationHeroes } from "../net/protocol/starterLineup";
import { formatHangClock, goldPerMin, itemEveryMs } from "../module/idle/rewards";
import { hangSpineStem } from "./idleHangRoster";
import { paintIdleLoot, playIdleHarvest, seatHangTimer } from "./idleHangView";
import { mountBattleSpine, mountNamedSpine } from "./battleSpine";
import { deployedHeroIds, localLineupIds, setLocalLineup } from "./localLineup";
import { mockRuntimeEnabled } from "../net/transportSelect";
import { emptyBagToast } from "../module/bag/items";
import { formatStoreBagLine } from "../module/bag/bagView";
import { WIRE_BAG_UNSYNCED_TOAST } from "../net/protocol/wireBag";
import { loadPrefab, spawnPrefab } from "./prefabLoad";
import { createLabel, createRect, place, setText, uiNode } from "./UiKit";

const INK = new Color(122, 71, 45, 255);
const CREAM = new Color(255, 236, 190, 255);
const COUNT = new Color(255, 248, 220, 255);
const SHORT = new Color(196, 64, 48, 255);
const COST_OK = new Color(254, 255, 255, 255);

const HERO_LIST_BOARD = "prefabs/ui/hero/HeroListHeroLayer";
const HERO_LEVEL_BOARD = "prefabs/ui/hero/HeroInfoUpLevelLayer";
const HERO_STAR_BOARD = "prefabs/ui/hero/HeroInfoUpStarLayer";
const BAG_INFO_BOARD = "prefabs/ui/backpack/BackpackInfoLayer";
const HERO_EXP_ITEM = 900101;
const CHECK = new Color(70, 210, 90, 255);
const NAME_GREEN = new Color(134, 236, 149, 255);
const DESC = new Color(255, 249, 197, 255);

const COLS = 4;
const CELL = 96;
const HERO_PITCH_X = 108;
const HERO_PITCH_Y = 112;
const BAG_PITCH_X = 112;
const BAG_PITCH_Y = 104;
/** language 2101–2105。elem 0 是筛选里的全部。 */
const ELEM_NAME = ["", "火", "水", "木", "光", "暗"];
const GEM_PLACES = [
  { id: 1, title: "攻击" },
  { id: 2, title: "生命" },
  { id: 3, title: "速度" },
];
const GEAR_PLACES = [
  { id: 1, title: "戒指" },
  { id: 2, title: "耳环" },
  { id: 3, title: "披风" },
  { id: 4, title: "腰带" },
];

type BagTab = "equip" | "item" | "shard" | "spirit";

const BAG_TABS: { id: BagTab; title: string }[] = [
  { id: "equip", title: "装备" },
  { id: "item", title: "道具" },
  { id: "shard", title: "碎片" },
  { id: "spirit", title: "精灵" },
];

/** 阵法 1 只编码 2/3/5/6/7/8/9。前排 4、后排 4 里多出来的一格留空。 */
const FORM_MAX = WIRE_LINEUP_SAVE_POSITIONS.length;

export function fillPageShell(id: string, view: Node, openHero: (hero: StoreHero) => void): void {
  if (!view.isValid) return;
  if (id === "hero") fillHero(view, openHero);
  else if (id === "bag") fillBag(view);
}

/** 藏掉地图球和空蓝金匾。四条收益用进度填充，三钮文案改成战力UP / 战斗 / 高速战斗。 */
export function dressHangPanel(view: Node): void {
  const mark = view as Node & { mxzgHang?: boolean };
  if (mark.mxzgHang) return;
  mark.mxzgHang = true;
  const plate = view.getChildByName("CCSprite_1");
  hideNamed(view, "spr_world");
  hideNamed(view, "lbl_map");
  hideNamed(view, "spr_world_icon");
  hideNamed(view, "lbl_mission_name");
  if (plate) {
    const frame = plate.getChildByName("CCSprite_1");
    if (frame) frame.active = false;
  }
  fitButton(findNamed(view, "btn_lineup"), "战力UP", 22);
  fitButton(findNamed(view, "btn_battle"), "战斗", 22);
  fitButton(findNamed(view, "btn_speed_battle"), "高速战斗", 20);
  pinSprites(view);
  let claimNote = "";
  let seenReward = GameStore.idle().rewardTime;
  let seenClaim = WireSession.claimSerial;
  const tick = () => {
    if (!view.isValid) return;
    const idle = GameStore.idle();
    const clock = hangClockText(idle);
    const rates = hangRates();
    writeBar(view, "lbl_progress_time", clock === "未同步" ? "未同步" : clock);
    writeBar(view, "lbl_gold", rates.gold);
    writeBar(view, "lbl_souls", rates.souls);
    writeBar(view, "lbl_exp", rates.exp);
    setBarFill(view, "spr_progress_AFK_bg", "ui/city/main-scene_progress-AFK", clock === "未同步" ? 0 : timeFill(idle));
    setBarFill(view, "CCSprite_4", "ui/city/main-scene_progress-hangs", rates.goldOn ? 1 : 0);
    setBarFill(view, "CCSprite_3", "ui/city/main-scene_progress-exp", rates.soulsOn ? 1 : 0);
    setBarFill(view, "CCSprite_2", "ui/city/main-scene_progress-role-exp", rates.expOn ? 1 : 0);
    syncVip(view, plate);
    const hang = view.parent ? view.parent.getChildByName("IdleHang") : null;
    if (hang) paintIdleLoot(hang, hangLootIcons(rates));
    const bubble = findNamed(view, "node_bubble") || (hang ? hang.getChildByName("node_bubble") : null);
    if (bubble) {
      const clockNode = bubble.getChildByName("lbl_progress_time2");
      if (clockNode) setText(clockNode, claimNote || clock);
      if (hang) seatHangTimer(hang, bubble);
    }
  };
  const onIdleSync = () => {
    const idle = GameStore.idle();
    if (WireSession.claimSerial !== seenClaim) {
      seenClaim = WireSession.claimSerial;
      const noteText = WireSession.claimNote;
      claimNote = noteText.indexOf("解不开") >= 0 || noteText.indexOf("没有 reward_time") >= 0 ? "领取未生效" : "";
    }
    if (idle.rewardTime !== seenReward) {
      seenReward = idle.rewardTime;
      if (idle.fromStore) claimNote = "";
    }
    tick();
  };
  tick();
  const timer = setInterval(tick, 1000);
  const offIdle = WireSession.onSync(onIdleSync);
  view.once(Node.EventType.NODE_DESTROYED, () => {
    clearInterval(timer);
    offIdle();
  });
  bindHangClaim(view, (text, resetClock) => {
    claimNote = text;
    if (resetClock) dressClock.t = Date.now();
    tick();
  });
}

const COIN_ICON = "ui/common/res-icon_res-1";
const GEM_ICON = "ui/common/res-icon_res-2";
const CHEST_ICON = "ui/city/main-scene_spr-box-2";
const MOON_ICON = "ui/bag/backpack_900101";
const ROLE_ICON = "ui/bag/backpack_900003";

interface HangRates {
  gold: string;
  souls: string;
  exp: string;
  goldOn: boolean;
  soulsOn: boolean;
  expOn: boolean;
  hasTable: boolean;
}

/** 三格来自当前关 reward_base。表没绑上时真服写 —/m，Mock 仍退回旧节奏。 */
function hangRates(): HangRates {
  const minute = chapterIdleMinute(currentStageIdx());
  if (minute) {
    return {
      gold: minute.gold + "/m",
      souls: minute.heroExp + "/m",
      exp: minute.roleExp + "/m",
      goldOn: minute.gold > 0,
      soulsOn: minute.heroExp > 0,
      expOn: minute.roleExp > 0,
      hasTable: true,
    };
  }
  if (Session.source === "wire") {
    return { gold: "—/m", souls: "—/m", exp: "—/m", goldOn: false, soulsOn: false, expOn: false, hasTable: false };
  }
  const cleared = clearedCount();
  const gold = goldPerMin(cleared);
  const every = itemEveryMs(cleared);
  const perMin = every > 0 ? Math.max(1, Math.round(60000 / every)) : 0;
  const sec = Math.max(1, Math.round(every / 1000));
  return {
    gold: gold + "/m",
    souls: perMin + "/m",
    exp: "每" + sec + "s",
    goldOn: gold > 0,
    soulsOn: perMin > 0,
    expOn: sec > 0,
    hasTable: false,
  };
}

/** 有每分钟或 drop_group 才叠图标。没有数据就返回空，场地不留空框。 */
function hangLootIcons(rates: HangRates): string[] {
  const drops = chapterDrops(currentStageIdx());
  if (!rates.hasTable && drops.length === 0 && Session.source === "wire") return [];
  if (!rates.hasTable && drops.length === 0 && !rates.goldOn && !rates.soulsOn) return [];
  const icons: string[] = [];
  if (rates.goldOn || rates.hasTable) icons.push(COIN_ICON, COIN_ICON, COIN_ICON, COIN_ICON);
  if (rates.soulsOn || rates.hasTable) icons.push(MOON_ICON, MOON_ICON);
  if (rates.expOn || rates.hasTable) icons.push(ROLE_ICON);
  icons.push(GEM_ICON, GEM_ICON, CHEST_ICON);
  for (let i = 0; i < drops.length && icons.length < 8; i++) {
    const face = drops[i];
    icons.push(itemIconResource(face.itemType, null) || "ui/bag/backpack_" + face.itemType);
  }
  if (icons.length === 0) return [];
  const pile: string[] = [];
  for (let i = 0; i < 14; i++) pile.push(icons[i % icons.length]);
  return pile;
}

/**
 * 没有角色 VIP 等级时不写字。s2c 2001 没有 vip_level，不把「未同步」画在战斗钮下面。
 * 有等级时才用 vip 表的那一行。三格仍不乘百分比。
 */
function syncVip(view: Node, plate: Node | null): void {
  const host = plate || view;
  const bonus = vipIdleBonus(null);
  let vip = host.getChildByName("HangVip");
  if (!bonus) {
    if (vip) vip.active = false;
    return;
  }
  if (!vip) {
    vip = createLabel(vipIdleLine(bonus.level), 14, { color: INK, width: 280, height: 36 });
    vip.name = "HangVip";
    place(vip, host, 0, plate ? -78 : 120);
  }
  vip.active = true;
  setText(vip, vipIdleLine(bonus.level));
}

/** 条上的字原来是 0×0 再 SHRINK，看起来像空槽。右对齐铺进槽里。 */
function writeBar(view: Node, name: string, text: string): void {
  const node = findNamed(view, name);
  if (!node) return;
  node.setScale(1, 1, 1);
  const label = node.getComponent(Label);
  if (label) {
    label.string = text;
    label.fontSize = 16;
    label.lineHeight = 20;
    label.overflow = Overflow.SHRINK;
    label.horizontalAlign = HorizontalTextAlignment.RIGHT;
  }
  const ui = node.getComponent(UITransform);
  if (ui) {
    ui.setAnchorPoint(1, 0.5);
    ui.setContentSize(118, 24);
  }
}

function setBarFill(view: Node, barName: string, art: string, ratio: number): void {
  const bar = findNamed(view, barName);
  if (!bar) return;
  let fill = bar.getChildByName("HangFill");
  if (!fill) {
    fill = sprite("HangFill", 150, 18, art);
    const image = fill.getComponent(Sprite);
    if (image) {
      image.type = Sprite.Type.FILLED;
      image.fillType = Sprite.FillType.HORIZONTAL;
      image.fillStart = 0;
    }
    place(fill, bar, 0, 0);
  }
  const span = ratio <= 0 ? 0 : Math.min(1, ratio);
  const image = fill.getComponent(Sprite);
  if (image) image.fillRange = span;
  fill.active = span > 0;
  if (barName === "spr_progress_AFK_bg") seatHangProgressSpine(bar, span);
}

/** jindutiao 铺在宝箱条上，遮罩跟着已挂机比例拉开。底下的填充图仍在。 */
function seatHangProgressSpine(bar: Node, ratio: number): void {
  const ui = bar.getComponent(UITransform);
  const width = ui && ui.contentSize && ui.contentSize.width > 0 ? ui.contentSize.width : 166;
  const height = ui && ui.contentSize && ui.contentSize.height > 0 ? ui.contentSize.height : 36;
  let mask = bar.getChildByName("HangSpineMask");
  if (!mask) {
    mask = uiNode("HangSpineMask");
    const maskUi = mask.addComponent(UITransform);
    maskUi.setAnchorPoint(0, 0.5);
    maskUi.setContentSize(0, height);
    const maskComp = mask.addComponent(Mask);
    maskComp.type = Mask.Type.GRAPHICS_RECT;
    mask.setPosition(-width * 0.5, 0, 0);
    mask.parent = bar;
    const spine = uiNode("Spine");
    spine.addComponent(UITransform).setContentSize(275, 39);
    const scaleX = width / 275;
    const scaleY = height / 39;
    spine.setScale(scaleX, scaleY, 1);
    spine.setPosition(width * 0.5, 0, 0);
    spine.parent = mask;
    mountNamedSpine(spine, "jindutiao", "stand");
  }
  const maskUi = mask.getComponent(UITransform);
  if (maskUi) maskUi.setContentSize(Math.max(0, Math.round(width * ratio)), height);
  mask.active = ratio > 0;
}

/** 底栏宝箱。Mock 走 idle.claim，真服只发已有的空 3005。 */
function bindHangClaim(view: Node, note: (text: string, resetClock: boolean) => void): void {
  const buttons = [findNamed(view, "btn_icon"), findNamed(view, "spr_box")];
  let busy = false;
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    if (!button) continue;
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => {
      if (busy) return;
      busy = true;
      const hang = view.parent ? view.parent.getChildByName("IdleHang") : null;
      if (hang) playIdleHarvest(hang);
      void claimHang(view, note).then(() => {
        busy = false;
      });
    });
  }
}

async function claimHang(view: Node, note: (text: string, resetClock: boolean) => void): Promise<void> {
  if (Session.source === "wire") {
    if (!WireSession.claimIdle()) {
      note("真服未连接", false);
      return;
    }
    note("已发领取", false);
    return;
  }
  try {
    const resp = await Proto.idleClaim({}, NetClient.shared);
    if (!view.isValid) return;
    if (!resp.ok) {
      note(errorText(resp.code ?? ErrorCode.IDLE_EMPTY), false);
      return;
    }
    applyIdleClaim(resp);
    note(claimToast(countReward(resp, 1), countReward(resp, IDLE_ITEM_ID), countReward(resp, IDLE_ROLE_EXP_ID), countReward(resp, IDLE_HERO_EXP_ID)), true);
  } catch (err) {
    note(messageOf(err), false);
  }
}

function countReward(resp: { rewards?: { id: number; count: number }[] }, id: number): number {
  const rewards = resp.rewards;
  if (!rewards) return 0;
  let total = 0;
  for (let i = 0; i < rewards.length; i++) {
    if (rewards[i].id !== id) continue;
    const count = rewards[i].count;
    if (typeof count === "number" && isFinite(count) && count > 0) total += Math.floor(count);
  }
  return total;
}

/** 英雄出阵。真服发 3100（formation_id 字段 5），空包后再进战斗。Mock 只在 ?dev=mock 时记本局。 */
export function bindFormationSheet(view: Node, onConfirm: () => void): void {
  silenceBigMenus(view);
  writeNamed(view, "lbl_title", "英雄出阵");
  const title = findNamed(view, "lbl_title");
  if (title) {
    const label = title.getComponent(Label);
    if (label && label.fontSize > 32) label.fontSize = 28;
  }
  fitButton(findNamed(view, "btn_confirm"), "出阵", 26);
  for (let n = 1; n <= 9; n++) {
    const lock = findNamed(view, "spr_lock_" + n);
    if (lock) lock.active = n === 9;
  }
  let elem = 0;
  let selected = formationIds();
  const paint = () => {
    if (!view.isValid) return;
    paintFormationGrid(view, elem, selected, (heroId) => {
      selected = toggleId(selected, heroId);
      paint();
    });
    paintFormationSlots(view, selected, (heroId) => {
      selected = toggleId(selected, heroId);
      paint();
    });
    const owned = GameStore.heroes();
    const roster = rosterOf(elem);
    if (!owned) writeNamed(view, "lbl_tip", "真服英雄未同步");
    else if (owned.length === 0) writeNamed(view, "lbl_tip", "空名册，没有可上阵的英雄");
    else if (roster.length === 0) writeNamed(view, "lbl_tip", "这个元素没有");
    else writeNamed(view, "lbl_tip", selected.length >= FORM_MAX ? "上阵 " + FORM_MAX + "/" + FORM_MAX : "已选 " + selected.length + "/" + FORM_MAX);
  };
  for (let i = 0; i <= 5; i++) {
    const button = findNamed(view, "btn_elem" + i);
    const pick = i;
    if (!button) continue;
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => {
      elem = pick;
      const markNode = findNamed(view, "spr_select");
      if (markNode && button.parent) {
        if (markNode.parent !== button.parent) markNode.parent = button.parent;
        markNode.setPosition(button.position.x, button.position.y, 0);
      }
      paint();
    });
  }
  const confirm = findNamed(view, "btn_confirm");
  if (confirm) {
    confirm.setSiblingIndex(Math.max(0, (confirm.parent ? confirm.parent.children.length : 1) - 1));
    if (!confirm.getComponent(Button)) confirm.addComponent(Button);
    let saving = false;
    confirm.on(Button.EventType.CLICK, () => {
      if (saving) return;
      if (selected.length === 0) {
        GameLog.shared.info("Mainline", "出阵没有英雄，仍留在挂机");
        return;
      }
      if (Session.source === "wire") {
        const beforeSave = WireSession.lineUpSaveSerial;
        const beforeLine = WireSession.lineUpSerial;
        if (!WireSession.saveMainFormation(selected)) {
          GameLog.shared.info("Mainline", "出阵未发出 3100，服未连接");
          writeNamed(view, "lbl_tip", "服未连接，没有发出 3100");
          return;
        }
        saving = true;
        GameLog.shared.info("Mainline", "出阵已发 3100，formation_id=1，等待空包后再等 3101");
        writeNamed(view, "lbl_tip", "已发 3100，等待 3101");
        let off = (): void => {};
        const timer = setTimeout(() => {
          saving = false;
          off();
          if (view.isValid) writeNamed(view, "lbl_tip", "3100 或 3101 无回包，不出战");
          GameLog.shared.info("Mainline", "3100 或 3101 无回包，不出战");
        }, 8000);
        const stop = () => {
          clearTimeout(timer);
          off();
        };
        off = WireSession.onSync(() => {
          if (!view.isValid) {
            stop();
            return;
          }
          if (WireSession.lineUpSaveSerial === beforeSave) return;
          if (WireSession.lineUpSerial === beforeLine) return;
          stop();
          onConfirm();
        });
        view.once(Node.EventType.NODE_DESTROYED, stop);
        return;
      }
      if (!mockRuntimeEnabled()) {
        GameLog.shared.info("Mainline", "未开 ?dev=mock，不记本地出阵");
        return;
      }
      setLocalLineup(selected);
      onConfirm();
    });
  }
  paint();
  const offForm = WireSession.onSync(() => paint());
  view.once(Node.EventType.NODE_DESTROYED, () => offForm());
}

/** 英雄详情：装备圈、属性、技能、育成页签。不发升级协议。 */
export function dressHeroDetail(view: Node, hero: StoreHero): void {
  silenceBigMenus(view);
  const evolve = findNamed(view, "node_evolve");
  if (evolve) evolve.active = false;
  const profile = heroProfile(hero.heroType);
  const name = hero.name || (profile ? profile.name : "英雄");
  writeNamed(view, "lbl_hero_name", name);
  const elem = profile && profile.elem !== null ? profile.elem : 0;
  const badge = findNamed(view, "icon_elem");
  if (badge) paintSprite(badge, "ui/hero/hero-icon_elem-" + clamp(elem, 0, 5));
  const stars = findNamed(view, "node_star");
  if (stars) {
    clearChildren(stars);
    const count = hero.star ?? (profile && profile.star) ?? 0;
    const shown = count > 5 ? 5 : clamp(count, 0, 5);
    for (let i = 0; i < shown; i++) {
      const star = sprite("star", 22, 22, "ui/hero/hero-info_spr-star-1");
      place(star, stars, (i - (shown - 1) / 2) * 24, 0);
    }
    if (count > 5) {
      place(createLabel(String(count), 16, { color: CREAM, width: 36, height: 22 }), stars, shown * 14, 0);
    }
  }
  const bat = findNamed(view, "bat_node");
  if (bat && !bat.getChildByName("FightValue")) {
    const power = createLabel(hero.fighting === null ? "—" : String(hero.fighting), 22, { color: CREAM, width: 160, height: 28 });
    power.name = "FightValue";
    place(power, bat, 40, 0);
  }
  if (hero.heroId) {
    const spot = place(uiNode("DetailSpine"), view, 320, 620);
    mountBattleSpine(spot, hangSpineStem(hero.heroId, hero.heroType), () => {
      if (spot.isValid) spot.active = false;
    });
  }
  const stats = heroBaseStats(hero.heroType, hero.star ?? (profile ? profile.star : 1));
  const tabBar = findNamed(view, "scroll_view_tab") || view;
  const panel = findNamed(view, "node_panel") || view;
  const body = uiNode("DetailBody");
  place(body, panel, 0, 180);
  const tabs = ["育成", "星UP", "宝石", "神装"];
  const tabNodes: Node[] = [];
  let tab = 0;
  let gemPlace = 1;
  let gearPlace = 1;
  let grow: Node | null = null;
  let starBoard: Node | null = null;
  const paint = () => {
    if (!view.isValid) return;
    for (let i = 0; i < tabNodes.length; i++) paintTab(tabNodes[i], i === tab);
    if (grow) grow.active = tab === 0;
    if (starBoard) starBoard.active = tab === 1;
    clearChildren(body);
    if (tab === 0) {
      if (grow) fillGrowBoard(grow, hero, profile, stats);
      else paintGrow(body, hero, profile, stats);
    } else if (tab === 1) {
      if (starBoard) fillStarBoard(starBoard, hero, profile);
      else paintStarUp(body, hero, profile);
    } else if (tab === 2) {
      paintGems(view, body, gemPlace, (placeId) => {
        gemPlace = placeId;
        paint();
      });
    } else {
      paintGears(view, body, gearPlace, (placeId) => {
        gearPlace = placeId;
        paint();
      });
    }
  };
  for (let i = 0; i < tabs.length; i++) {
    const index = i;
    const button = sprite(tabs[i], 100, 36, "ui/common/button_btn-tab-23");
    place(button, tabBar, -165 + i * 110, 36);
    tabNodes.push(button);
    place(createLabel(tabs[i], 16, { color: INK, width: 90, height: 28 }), button, 0, 0);
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => {
      tab = index;
      paint();
    });
  }
  holdUpgrade(findNamed(view, "btn_evolution"), "升级");
  void mountNested(view, HERO_LEVEL_BOARD, "GrowBoard").then((node) => {
    if (!node || !view.isValid) return;
    grow = node;
    seatOnPanel(node, panel, 150);
    silenceBigMenus(node);
    const grade = findNamed(node, "btn_up_grade");
    if (grade) grade.active = false;
    holdUpgrade(findNamed(node, "btn_up_level"), "升级");
    for (let i = 1; i <= 6; i++) {
      const mark = findNamed(node, "sp_grade" + i);
      if (mark) mark.active = false;
    }
    paint();
  });
  void mountNested(view, HERO_STAR_BOARD, "StarBoard").then((node) => {
    if (!node || !view.isValid) return;
    starBoard = node;
    seatOnPanel(node, panel, 112.5);
    silenceBigMenus(node);
    const button = findNamed(node, "btn_up_star");
    setGray(button, true);
    if (button) {
      if (!button.getComponent(Button)) button.addComponent(Button);
      button.on(Button.EventType.CLICK, () => {
        GameLog.shared.info("Hero", "升星没有服端写协议，不改星级");
        flashToast(view, "不发升星协议");
      });
    }
    paint();
  });
  paint();
}

function fillHero(view: Node, openHero: (hero: StoreHero) => void): void {
  silenceBigMenus(view);
  fitButton(findNamed(view, "btn_hero"), "英雄", 20);
  fitButton(findNamed(view, "btn_illustrat"), "图鉴", 20);
  fitButton(findNamed(view, "btn_dragon"), "圣龙", 20);
  const cap = findNamed(view, "node_capacity");
  if (cap) cap.active = true;
  let tab: "hero" | "book" | "dragon" = "hero";
  let elem = 0;
  let board: Node | null = null;
  const host = uiNode("HeroFill");
  place(host, view, 0, 0);
  let content = gridScroll(host, "HeroScroll", 270, 560, 520, 400);
  const paint = () => {
    if (!content.isValid) return;
    clearChildren(content);
    markHeroTabs(view, tab);
    markElem(board, elem);
    const elemRow = board ? findNamed(board, "node_elem") : null;
    if (elemRow) elemRow.active = tab !== "dragon";
    const all = GameStore.heroes();
    const space = heroSpaceLine(all);
    writeNamed(view, "lbl_capacity", space);
    if (board) writeNamed(board, "lbl_capacity", space);
    if (tab === "dragon") {
      writeNamed(view, "lbl_go", dragonHeadLine());
      paintDragonBoard(view, content);
      return;
    }
    const deployed = deployedSet();
    if (tab === "hero") {
      const roster = rosterOf(elem);
      if (all && all.length > 0) {
        writeNamed(view, "lbl_go", roster.length > 0 ? "点头像看详情" : "这个元素没有");
        const shown = paddedSlots(roster.length);
        for (let i = 0; i < shown; i++) {
          const hero = i < roster.length ? roster[i] : null;
          const cell = heroCell(hero, hero ? deployed.has(hero.heroId || 0) : false, hero ? () => openHero(hero) : null, false);
          place(cell, content, gridX(i, -162, HERO_PITCH_X), gridY(i, -52, HERO_PITCH_Y));
        }
        sizeScroll(content, slotRows(shown) * HERO_PITCH_Y + 20, 360);
        return;
      }
      writeNamed(view, "lbl_go", all === null ? "真服英雄未同步，灰的是图鉴" : "空名册，灰的是图鉴");
      paintHeroBook(view, content, elem, deployed, openHero);
      return;
    }
    writeNamed(view, "lbl_go", "灰头像是还没有");
    paintHeroBook(view, content, elem, deployed, openHero);
  };
  const pickElem = (id: number) => {
    elem = id;
    if (tab === "dragon") tab = "hero";
    paint();
  };
  for (let i = 0; i <= 5; i++) {
    const button = sprite("elem" + i, 48, 48, "ui/hero/hero-icon_elem-" + i);
    place(button, host, -210 + i * 84, 590);
  }
  bindElemRow(host, pickElem);
  bindTab(view, "btn_hero", () => {
    tab = "hero";
    paint();
  });
  bindTab(view, "btn_illustrat", () => {
    tab = "book";
    paint();
  });
  bindTab(view, "btn_dragon", () => {
    tab = "dragon";
    paint();
  });
  void mountNested(view, HERO_LIST_BOARD, "HeroBoard").then((node) => {
    if (!node || !view.isValid) return;
    board = node;
    const menu = findNamed(view, "UIMenu_1");
    if (menu && menu.parent === view) node.setSiblingIndex(menu.getSiblingIndex());
    const box = findNamed(node, "spr_box");
    if (box) {
      const old = host.getChildByName("HeroScroll");
      if (old) old.destroy();
      // 元素钮在盒子顶上，格子从钮下沿再往下排。
      content = gridScroll(box, "HeroScroll", 0, -108, 540, 320);
    }
    if (cap) cap.active = false;
    const big = findNamed(node, "node_capacity");
    const menuHit = big ? big.getChildByName("UIMenu_1") : null;
    const menuUi = menuHit ? menuHit.getComponent(UITransform) : null;
    if (menuUi) menuUi.setContentSize(0, 0);
    clearChildren(host);
    bindElemRow(node, pickElem);
    paint();
  });
  paint();
  const offHero = WireSession.onSync(() => paint());
  view.once(Node.EventType.NODE_DESTROYED, () => offHero());
}

function fillBag(view: Node): void {
  silenceBigMenus(view);
  let tab: BagTab = "item";
  let picked: StoreBagItem | null = null;
  const host = uiNode("BagFill");
  place(host, view, 0, 0);
  const box = findNamed(view, "spr_box");
  const content = box ? gridScroll(box, "BagScroll", 0, -12, 520, 400) : gridScroll(host, "BagScroll", 313, 540, 460, 400);
  const tabHost = bagTabHost(view) || host;
  const tabs: Node[] = [];
  const paint = () => {
    if (!content.isValid) return;
    clearChildren(content);
    for (let i = 0; i < tabs.length; i++) paintTab(tabs[i], BAG_TABS[i].id === tab);
    const all = GameStore.bag();
    if (all === null) writeNamed(view, "lbl_title", "背包 · 真服未同步");
    else if (countBag(all) === 0) writeNamed(view, "lbl_title", "背包 · 空背包");
    else writeNamed(view, "lbl_title", "背包");
    const rows = bagRows(tab);
    if (picked && !rows.some((row) => sameBag(row, picked as StoreBagItem))) picked = null;
    const shown = paddedSlots(rows.length);
    for (let i = 0; i < shown; i++) {
      const item = i < rows.length ? rows[i] : null;
      const cell = item
        ? bagCell(item, picked !== null && sameBag(item, picked), () => {
            picked = item;
            showBagInfo(view, item);
            paint();
          })
        : emptyBag(rows.length === 0 ? () => flashToast(view, all === null ? WIRE_BAG_UNSYNCED_TOAST : emptyBagToast()) : null);
      place(cell, content, gridX(i, -168, BAG_PITCH_X), gridY(i, -56, BAG_PITCH_Y));
    }
    sizeScroll(content, slotRows(shown) * BAG_PITCH_Y + 24, 400);
  };
  for (let i = 0; i < BAG_TABS.length; i++) {
    const spec = BAG_TABS[i];
    const button = sprite(spec.title, 108, 40, "ui/common/button_btn-tab-23");
    place(button, tabHost, tabHost === host ? 125 + i * 118 : 64 + i * 120, tabHost === host ? 590 : -24);
    place(createLabel(spec.title, 18, { color: INK, width: 96, height: 28 }), button, 0, 0);
    tabs.push(button);
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => {
      tab = spec.id;
      paint();
    });
  }
  const bubble = findNamed(view, "spr_bubble_bg");
  if (bubble && bubble.parent && !findNamed(bubble.parent, "BagTip")) {
    const tip = createLabel("点格子看说明", 16, { color: INK, width: 200, height: 48 });
    tip.name = "BagTip";
    place(tip, bubble.parent, 150, 90);
  }
  paint();
  const offBag = WireSession.onSync(() => paint());
  view.once(Node.EventType.NODE_DESTROYED, () => offBag());
}

function paintFormationGrid(view: Node, elem: number, selected: number[], toggle: (id: number) => void): void {
  const scroll = findNamed(view, "scroll_view_backpack");
  const content = scroll ? scroll.getChildByName("content") : null;
  const host = content || scroll || view;
  const old = host.getChildByName("FormGrid");
  if (old) old.destroy();
  const grid = uiNode("FormGrid");
  place(grid, host, 0, content ? 0 : scroll ? 180 : 640);
  const roster = rosterOf(elem);
  for (let i = 0; i < roster.length; i++) {
    const hero = roster[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const on = hero.heroId !== null && selected.indexOf(hero.heroId) >= 0;
    const cell = heroCell(hero, false, () => {
      if (hero.heroId) toggle(hero.heroId);
    }, false);
    if (on) {
      const mark = createLabel("✓", 22, { color: CHECK, width: 28, height: 28 });
      place(mark, cell, 30, 36);
    }
    const x = content ? 70 + col * 130 : -180 + col * 110;
    const y = content ? -56 - row * HERO_PITCH_Y : -row * 100;
    place(cell, grid, x, y);
  }
  if (content) {
    const rows = roster.length === 0 ? 1 : Math.ceil(roster.length / COLS);
    sizeScroll(content, rows * HERO_PITCH_Y + 24, 250);
  }
}

function paintFormationSlots(view: Node, selected: number[], onRemove: (heroId: number) => void): void {
  const roster = GameStore.heroes() || [];
  const placed: { [slot: number]: number } = {};
  for (let i = 0; i < selected.length; i++) {
    const slotNo = formationFaceSlot(i);
    if (slotNo === null) continue;
    placed[slotNo] = selected[i];
  }
  let power = 0;
  let known = false;
  for (let slotNo = 1; slotNo <= 9; slotNo++) {
    const slot = findNamed(view, "node_icon_" + slotNo);
    if (!slot) continue;
    const box = slot.getComponent(UITransform);
    if (box && (box.contentSize.width < 8 || box.contentSize.height < 8)) box.setContentSize(80, 80);
    const old = slot.getChildByName("SlotFace");
    if (old) old.destroy();
    const heroId = placed[slotNo];
    const hero = heroId ? heroById(roster, heroId) : null;
    const label = findNamed(slot, "lbl_attr_add_" + slotNo);
    const front = slotNo <= 4;
    if (!hero || !hero.heroType) {
      if (label) {
        label.active = true;
        setText(label, front ? "前" : "后");
      }
      continue;
    }
    const face = sprite("SlotFace", 64, 64, heroFace(hero), "ui/hero/hero-icon_spr-default");
    place(face, slot, 0, 0);
    face.setSiblingIndex(Math.max(0, slot.children.length - 1));
    if (hero.heroId !== null) {
      const picked = hero.heroId;
      if (!face.getComponent(Button)) face.addComponent(Button);
      face.on(Button.EventType.CLICK, () => onRemove(picked));
    }
    if (hero.fighting !== null) {
      power += hero.fighting;
      known = true;
    }
    if (slotNo === 9) {
      const lock = findNamed(view, "spr_lock_9");
      if (lock && slot.parent && lock.parent === slot.parent && lock.getSiblingIndex() > slot.getSiblingIndex()) {
        lock.setSiblingIndex(slot.getSiblingIndex());
      }
    }
    if (label) {
      const stats = heroBaseStats(hero.heroType, hero.star);
      label.active = true;
      setText(label, stats ? (front ? "前 " : "后 ") + stats.atk : front ? "前" : "后");
    }
  }
  writeNamed(view, "lbl_battle_count", known ? String(power) : "—");
}

/** 挂机左上角的关卡字。没同步不写第 0 章。 */
export function hangMissionCaption(): string {
  const mock = GameStore.mockStageId();
  const chapter = GameStore.chapter();
  const synced = (mock !== null && mock >= 1) || chapter.nowIdx !== null || chapter.maxIdx !== null;
  if (!synced) return "主线未同步";
  const idx = currentStageIdx();
  const place = chapterPlaceLabel(idx);
  if (place) return place;
  if (idx >= 1) return "第" + idx + "关";
  return "主线未同步";
}

/** 已有 ChapterPreviewLayer。产出用当前关 reward_base，掉落用 drop_group。出战不新发协议。 */
export function dressChapterPreview(view: Node, onFight: () => void): void {
  const caption = hangMissionCaption();
  writeKeep(view, "lbl_name", caption);
  const synced = caption !== "主线未同步";
  const idx = currentStageIdx();
  const minute = synced ? chapterIdleMinute(idx) : null;
  if (!minute) {
    if (synced) GameLog.shared.info("Mainline", "关卡预览没有 chapterreward，产出写 —");
    writeKeep(view, "lbl_res1", "—");
    writeKeep(view, "lbl_res2", "—");
    writeKeep(view, "lbl_res3", "—");
  } else {
    writeKeep(view, "lbl_res1", minute.gold + "/m");
    writeKeep(view, "lbl_res2", minute.heroExp + "/m");
    writeKeep(view, "lbl_res3", minute.roleExp + "/m");
  }
  paintPreviewDrops(view, synced ? chapterDrops(idx) : []);
  fitButton(findNamed(view, "btn_confirm"), "出战", 28);
  const confirm = findNamed(view, "btn_confirm");
  if (!confirm) {
    GameLog.shared.warn("Mainline", "关卡预览没有 btn_confirm，不能出战");
    return;
  }
  if (!confirm.getComponent(Button)) confirm.addComponent(Button);
  confirm.on(Button.EventType.CLICK, () => onFight());
}

function paintPreviewDrops(view: Node, drops: DropFace[]): void {
  const scroll = findNamed(view, "scroll_view");
  const host = scroll ? scroll.getChildByName("content") || scroll : view;
  const old = host.getChildByName("PreviewDrops");
  if (old) old.destroy();
  const row = uiNode("PreviewDrops");
  place(row, host, scroll ? 280 : 0, scroll ? -40 : 0);
  if (drops.length === 0) {
    place(createLabel("这一关没有掉落表", 18, { color: CREAM, width: 420, height: 36 }), row, 0, 0);
    return;
  }
  const n = drops.length < 6 ? drops.length : 6;
  for (let i = 0; i < n; i++) {
    const face = drops[i];
    const path = itemIconResource(face.itemType, null) || "ui/bag/backpack_" + face.itemType;
    const icon = sprite("drop", 64, 64, path, "ui/bag/backpack_item-frame-1");
    place(icon, row, (i - (n - 1) / 2) * 78, 0);
  }
}

function heroCell(hero: StoreHero | null, deployed: boolean, onTap: (() => void) | null, locked: boolean): Node {
  const root = uiNode(hero ? "HeroCell" : "HeroEmpty");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(CELL, CELL + 8);
  place(sprite("bg", 84, 84, "ui/hero/hero-icon_icon-bg-2"), root, 0, 6);
  place(sprite("frame", 88, 88, "ui/hero/hero-icon_icon-frame-1"), root, 0, 6);
  if (!hero) return root;
  const profile = heroProfile(hero.heroType);
  if (hero.heroType) {
    const face = sprite("face", 72, 72, heroFace(hero), "ui/hero/hero-icon_spr-default");
    place(face, root, 0, 6);
    if (locked) {
      const image = face.getComponent(Sprite);
      if (image) image.grayscale = true;
    }
  } else {
    place(createLabel(shortName(hero.name), 14, { color: CREAM, width: 72, height: 36 }), root, 0, 6);
  }
  const elem = profile && profile.elem !== null ? profile.elem : null;
  if (elem !== null && elem >= 0 && elem <= 5) {
    place(sprite("elem", 26, 26, "ui/hero/hero-icon_elem-" + elem), root, -28, 32);
  }
  const stars = hero.star ?? (profile && profile.star) ?? 0;
  const n = clamp(stars, 0, 5);
  for (let i = 0; i < n; i++) {
    place(sprite("star", 14, 14, "ui/hero/hero-info_spr-star-1"), root, (i - (n - 1) / 2) * 15, -40);
  }
  if (hero.level !== null) {
    place(createLabel(String(hero.level), 14, { color: COUNT, width: 36, height: 18 }), root, 22, -22);
  }
  if (locked) place(sprite("lock", 28, 28, "ui/hero/hero-icon_spr-lock"), root, 28, 32);
  else if (deployed) place(sprite("battle", 28, 28, "ui/hero/hero-icon_spr-battle"), root, 30, 32);
  if (onTap) {
    if (!root.getComponent(Button)) root.addComponent(Button);
    root.on(Button.EventType.CLICK, onTap);
  }
  return root;
}

function bagCell(item: StoreBagItem, selected: boolean, onTap: (() => void) | null): Node {
  const root = uiNode("BagCell");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(96, 96);
  const profile = itemProfile(item.itemType, item.itemId);
  place(sprite("frame", 88, 88, rareFrame(profile ? profile.rare : 0)), root, 0, 0);
  if (selected) place(sprite("select", 96, 96, "ui/bag/backpack_spr-select"), root, 0, 0);
  const icon = itemIconResource(item.itemType, item.itemId);
  const face = sprite("icon", 72, 72, icon || "ui/bag/backpack_spr-default", "ui/bag/backpack_spr-default");
  place(face, root, 0, 6);
  if (!icon && item.itemId) paintFirst(face, ["ui/bag/backpack_" + item.itemId, "ui/bag/backpack_spr-default"]);
  const count = item.num === null ? "" : String(item.num);
  if (count) {
    const label = createLabel(count, 16, { color: COUNT, width: 72, height: 22 });
    place(label, root, 18, -30);
  }
  if (onTap) {
    if (!root.getComponent(Button)) root.addComponent(Button);
    root.on(Button.EventType.CLICK, onTap);
  }
  return root;
}

function emptyBag(onTap: (() => void) | null): Node {
  const root = uiNode("BagEmpty");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(96, 96);
  place(sprite("frame", 88, 88, "ui/common/other_spr-null"), root, 0, 0);
  if (onTap) {
    if (!root.getComponent(Button)) root.addComponent(Button);
    root.on(Button.EventType.CLICK, onTap);
  }
  return root;
}

function paintGrow(
  body: Node,
  hero: StoreHero,
  profile: HeroProfile | null,
  stats: { atk: number; hp: number; def: number; spd: number } | null
): void {
  const level = hero.level === null ? "—" : String(hero.level);
  place(createLabel("等级 " + level, 18, { color: INK, width: 200, height: 28 }), body, -120, 78);
  const power = hero.fighting === null ? "—" : String(hero.fighting);
  place(createLabel("战力 " + power, 18, { color: INK, width: 200, height: 28 }), body, 120, 78);
  const atk = stats ? String(stats.atk) : "—";
  const hp = stats ? String(stats.hp) : "—";
  const def = stats ? String(stats.def) : "—";
  const spd = stats ? String(stats.spd) : "—";
  place(createLabel("攻击 " + atk, 18, { color: INK, width: 180, height: 28 }), body, -120, 40);
  place(createLabel("HP " + hp, 18, { color: INK, width: 180, height: 28 }), body, 120, 40);
  place(createLabel("防御 " + def, 18, { color: INK, width: 180, height: 28 }), body, -120, 8);
  place(createLabel("速度 " + spd, 18, { color: INK, width: 180, height: 28 }), body, 120, 8);
  const skills = profile ? profile.skills : [];
  const names: string[] = [];
  for (let i = 0; i < skills.length && i < 4; i++) names.push(skills[i].name);
  place(createLabel(names.length > 0 ? names.join("  ") : "无技能", 16, { color: INK, width: 460, height: 36 }), body, 0, -36);
}

function paintStarUp(body: Node, hero: StoreHero, profile: HeroProfile | null): void {
  const star = hero.star ?? ((profile && profile.star) || 1);
  const cur = heroStarStep(star);
  const nxt = heroStarStep(star + 1);
  if (!cur && !nxt) {
    place(createLabel("这一页还没有配置", 18, { color: INK, width: 360, height: 40 }), body, 0, 20);
    return;
  }
  const maxed = star >= 14 || !nxt;
  place(createLabel(star + "星" + (maxed ? "  已满星" : "  →  " + (star + 1) + "星"), 18, { color: INK, width: 280, height: 28 }), body, 0, 92);
  const limitNow = cur ? String(cur.levelLimit) : "—";
  const limitNext = nxt ? String(nxt.levelLimit) : "—";
  place(createLabel("等级上限  " + limitNow + (maxed ? "" : "  →  " + limitNext), 16, { color: INK, width: 420, height: 24 }), body, 0, 64);
  const atkNow = cur ? String(cur.attackShow) : "—";
  const hpNow = cur ? String(cur.hpShow) : "—";
  const atkNext = nxt ? String(nxt.attackShow) : "—";
  const hpNext = nxt ? String(nxt.hpShow) : "—";
  place(
    createLabel(
      "攻击 " + atkNow + (maxed ? "" : " → " + atkNext) + "    生命 " + hpNow + (maxed ? "" : " → " + hpNext),
      16,
      { color: INK, width: 440, height: 24 }
    ),
    body,
    0,
    38
  );
  paintStarSkills(body, profile, cur, nxt, maxed);
  if (!maxed && nxt) paintStarCosts(body, hero, nxt);
  const button = sprite("UpStar", 120, 36, "ui/common/button_btn-tab-24");
  place(button, body, -40, -112);
  place(createLabel(maxed ? "已满星" : "升星", 16, { color: INK, width: 100, height: 24 }), button, 0, 0);
  if (!button.getComponent(Button)) button.addComponent(Button);
  button.on(Button.EventType.CLICK, () => {
    GameLog.shared.info("Hero", "升星没有服端写协议，不改星级");
  });
  place(createLabel("不发升星协议", 12, { color: INK, width: 160, height: 18 }), body, 140, -112);
}

function paintStarSkills(body: Node, profile: HeroProfile | null, cur: StarStep | null, nxt: StarStep | null, maxed: boolean): void {
  const skills = profile ? profile.skills : [];
  const n = skills.length < 4 ? skills.length : 4;
  if (n === 0) {
    place(createLabel("无技能", 14, { color: INK, width: 200, height: 22 }), body, 0, 8);
    return;
  }
  for (let i = 0; i < n; i++) {
    const skill = skills[i];
    const x = (i - (n - 1) / 2) * 108;
    const icon = sprite("skill" + i, 36, 36, "ui/hero/skill-icon_" + skill.id, "ui/hero/hero-icon_spr-default");
    place(icon, body, x, 4);
    const from = cur && cur.skillLevels.length > i ? cur.skillLevels[i] : null;
    const to = nxt && nxt.skillLevels.length > i ? nxt.skillLevels[i] : null;
    const line = "Lv" + (from === null ? "—" : from) + (maxed ? "" : "→" + (to === null ? "—" : to));
    place(createLabel(shortName(skill.name), 12, { color: INK, width: 96, height: 16 }), body, x, -22);
    place(createLabel(line, 12, { color: INK, width: 96, height: 16 }), body, x, -38);
  }
}

function paintStarCosts(body: Node, hero: StoreHero, nxt: StarStep): void {
  const stacks = nxt.cost.concat(nxt.needItem);
  const needs = heroStarNeeds(hero.heroType, nxt.star);
  if (stacks.length === 0 && needs.length === 0) {
    place(createLabel("升星材料 无", 14, { color: INK, width: 240, height: 22 }), body, 0, -62);
    return;
  }
  const icons = stacks.length < 4 ? stacks.length : 4;
  for (let i = 0; i < icons; i++) {
    const stack = stacks[i];
    const face = itemProfile(stack.itemType, null);
    const icon = face && face.icon ? face.icon : "ui/bag/backpack_" + stack.itemType;
    const cell = sprite("cost" + i, 32, 32, icon, "ui/bag/backpack_spr-default");
    place(cell, body, -120 + i * 44, -58);
    place(createLabel("×" + stack.num, 11, { color: INK, width: 40, height: 14 }), body, -120 + i * 44, -80);
  }
  if (needs.length > 0) {
    const bits: string[] = [];
    for (let i = 0; i < needs.length && bits.length < 2; i++) bits.push(sacrificeLine(needs[i]));
    place(createLabel(bits.join("  "), 12, { color: INK, width: 220, height: 32 }), body, 120, -62);
  }
}

function paintGems(view: Node, body: Node, placeId: number, onPick: (id: number) => void): void {
  paintPlaces(body, GEM_PLACES, placeId, onPick);
  const rows = listJewels(placeId);
  if (rows.length === 0) {
    place(createLabel("这一页还没有配置", 18, { color: INK, width: 360, height: 40 }), body, 0, 20);
    return;
  }
  const content = gridScroll(body, "DetailScroll", 0, 36, 460, 160);
  for (let i = 0; i < rows.length; i++) {
    const jewel = rows[i];
    const owned = bagCount(jewel.id);
    const face = itemProfile(jewel.id, null);
    const icon = face && face.icon ? face.icon : "ui/bag/backpack_" + jewel.id;
    const cell = catalogCell(icon, jewel.rare, owned, () => showInfoCard(view, jewelCard(jewel.id, placeId, jewel.rare, jewel.star, owned)));
    place(cell, content, gridX(i, -162, HERO_PITCH_X), gridY(i, -52, HERO_PITCH_Y));
  }
  sizeScroll(content, slotRows(rows.length) * HERO_PITCH_Y + 20, 160);
}

function paintGears(view: Node, body: Node, placeId: number, onPick: (id: number) => void): void {
  paintPlaces(body, GEAR_PLACES, placeId, onPick);
  const rows = listGodGears(placeId);
  if (rows.length === 0) {
    place(createLabel("这一页还没有配置", 18, { color: INK, width: 360, height: 40 }), body, 0, 20);
    return;
  }
  const content = gridScroll(body, "DetailScroll", 0, 36, 460, 160);
  for (let i = 0; i < rows.length; i++) {
    const gear = rows[i];
    const owned = bagCount(gear.id);
    const face = itemProfile(gear.id, null);
    const icon = face && face.icon ? face.icon : "ui/bag/backpack_" + gear.id;
    const cell = catalogCell(icon, gear.rare, owned, () => showInfoCard(view, gearCard(gear.id, gear.name, placeId, gear.rare, gear.star, owned)));
    place(cell, content, gridX(i, -162, HERO_PITCH_X), gridY(i, -52, HERO_PITCH_Y));
  }
  sizeScroll(content, slotRows(rows.length) * HERO_PITCH_Y + 20, 160);
}

function paintPlaces(body: Node, places: { id: number; title: string }[], current: number, onPick: (id: number) => void): void {
  for (let i = 0; i < places.length; i++) {
    const spec = places[i];
    const button = sprite(spec.title, 72, 32, spec.id === current ? "ui/common/button_btn-tab-24" : "ui/common/button_btn-tab-23");
    place(button, body, -150 + i * 86, 64);
    place(createLabel(spec.title, 14, { color: INK, width: 68, height: 24 }), button, 0, 0);
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => onPick(spec.id));
  }
}

function paintDragonBoard(view: Node, content: Node): void {
  const dragons = listDragons();
  const relics = listRelics();
  if (dragons.length === 0 && relics.length === 0) {
    place(createLabel("这一页还没有配置", 18, { color: INK, width: 360, height: 36 }), content, 0, -40);
    sizeScroll(content, 400, 400);
    return;
  }
  for (let i = 0; i < dragons.length; i++) {
    const face = dragons[i];
    const card = dragonCard(face, () => showInfoCard(view, {
      icon: face.portrait,
      title: face.name,
      typeLine: "圣龙图鉴",
      body: dragonBlurb(),
      fallback: "ui/dragon/dragon_btn-illustration",
    }));
    place(card, content, gridX(i, -162, HERO_PITCH_X), gridY(i, -70, 140));
  }
  const dRows = dragons.length === 0 ? 0 : Math.ceil(dragons.length / COLS);
  let y = dragons.length === 0 ? -24 : -70 - dRows * 140 - 16;
  place(createLabel("圣物", 18, { color: INK, width: 120, height: 28 }), content, 0, y);
  y -= 56;
  for (let i = 0; i < relics.length; i++) {
    const relic = relics[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const owned = relicOwned(relic);
    const cell = catalogCell(relic.icon, relic.rare, owned, () => showInfoCard(view, relicCard(relic, owned)));
    place(cell, content, -162 + col * HERO_PITCH_X, y - row * HERO_PITCH_Y);
  }
  const rRows = relics.length === 0 ? 1 : Math.ceil(relics.length / COLS);
  const height = Math.abs(y) + rRows * HERO_PITCH_Y + 40;
  sizeScroll(content, height, 400);
}

function dragonCard(face: { name: string; portrait: string }, onTap: () => void): Node {
  const root = uiNode("DragonCard");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(100, 130);
  const portrait = sprite("face", 64, 64, face.portrait, "ui/dragon/dragon_btn-illustration");
  place(portrait, root, 0, 18);
  place(sprite("lock", 32, 32, "ui/dragon/dragon_spr-lock"), root, 26, 42);
  place(createLabel(face.name, 14, { color: INK, width: 96, height: 22 }), root, 0, -36);
  place(createLabel("图鉴", 12, { color: INK, width: 80, height: 18 }), root, 0, -54);
  if (!root.getComponent(Button)) root.addComponent(Button);
  root.on(Button.EventType.CLICK, onTap);
  return root;
}

function catalogCell(icon: string, rare: number, owned: number, onTap: () => void): Node {
  const root = uiNode("CatalogCell");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(96, 96);
  place(sprite("frame", 88, 88, rareFrame(rare)), root, 0, 0);
  const face = sprite("icon", 72, 72, icon, "ui/bag/backpack_spr-default");
  place(face, root, 0, 4);
  if (owned <= 0) {
    const image = face.getComponent(Sprite);
    if (image) image.grayscale = true;
    place(sprite("lock", 28, 28, "ui/hero/hero-icon_spr-lock"), root, 28, 28);
  } else {
    place(createLabel(String(owned), 16, { color: COUNT, width: 72, height: 22 }), root, 18, -30);
  }
  if (!root.getComponent(Button)) root.addComponent(Button);
  root.on(Button.EventType.CLICK, onTap);
  return root;
}

function rosterOf(elem: number): StoreHero[] {
  const all = GameStore.heroes();
  if (!all) return [];
  if (elem === 0) return all;
  const rows: StoreHero[] = [];
  for (let i = 0; i < all.length; i++) {
    const profile = heroProfile(all[i].heroType);
    if (profile && profile.elem === elem) rows.push(all[i]);
  }
  return rows;
}

function paintHeroBook(
  view: Node,
  content: Node,
  elem: number,
  deployed: Set<number>,
  openHero: (hero: StoreHero) => void
): void {
  const book = bookOf(elem);
  if (book.length === 0) {
    place(createLabel("这一页还没有配置", 18, { color: INK, width: 360, height: 36 }), content, 0, -40);
    sizeScroll(content, 400, 400);
    return;
  }
  const shown = paddedSlots(book.length);
  for (let i = 0; i < shown; i++) {
    const profile = i < book.length ? book[i] : null;
    if (!profile) {
      place(heroCell(null, false, null, false), content, gridX(i, -162, HERO_PITCH_X), gridY(i, -52, HERO_PITCH_Y));
      continue;
    }
    const owned = heroByType(profile.type);
    const cell = heroCell(
      owned || { heroId: null, heroType: profile.type, name: profile.name, level: null, star: profile.star, fighting: null },
      owned ? deployed.has(owned.heroId || 0) : false,
      () => {
        if (owned) openHero(owned);
        else showInfoCard(view, profileCard(profile));
      },
      !owned
    );
    place(cell, content, gridX(i, -162, HERO_PITCH_X), gridY(i, -52, HERO_PITCH_Y));
  }
  sizeScroll(content, slotRows(shown) * HERO_PITCH_Y + 20, 400);
}

function countBag(all: StoreBagItem[]): number {
  let n = 0;
  for (let i = 0; i < all.length; i++) {
    const item = all[i];
    if (item.num !== null && item.num <= 0) continue;
    if (itemIsWallet(item.itemType, item.itemId)) continue;
    n += 1;
  }
  return n;
}

function dragonHeadLine(): string {
  const snap = WireSession.dragon;
  if (!snap) return "圣龙图鉴";
  if (snap.attrLevel !== null) return "圣龙等级 " + snap.attrLevel;
  return "圣龙已同步";
}

function dragonBlurb(): string {
  const snap = WireSession.dragon;
  const bits = ["图鉴。没有单独的物种立绘。"];
  if (snap && snap.attrLevel !== null) bits.push("服务器圣龙等级 " + snap.attrLevel);
  else if (!snap) bits.push("圣龙数据未同步");
  else bits.push("等级未带");
  return bits.join("\n");
}

function bagRows(tab: BagTab): StoreBagItem[] {
  const all = GameStore.bag();
  if (!all) return [];
  const rows: StoreBagItem[] = [];
  for (let i = 0; i < all.length; i++) {
    const item = all[i];
    if (item.num !== null && item.num <= 0) continue;
    if (itemIsWallet(item.itemType, item.itemId)) continue;
    if (itemBagTab(item.itemType, item.itemId) !== tab) continue;
    rows.push(item);
  }
  return rows;
}

function deployedSet(): Set<number> {
  const set = new Set<number>();
  const ids = deployedHeroIds();
  for (let i = 0; i < ids.length; i++) set.add(ids[i]);
  return set;
}

function bookOf(elem: number): HeroProfile[] {
  const all = listHeroProfiles();
  if (elem === 0) return all;
  const rows: HeroProfile[] = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i].elem === elem) rows.push(all[i]);
  }
  return rows;
}

function heroByType(type: number): StoreHero | null {
  const all = GameStore.heroes();
  if (!all) return null;
  for (let i = 0; i < all.length; i++) {
    if (all[i].heroType === type) return all[i];
  }
  return null;
}

function heroById(roster: StoreHero[], id: number): StoreHero | null {
  for (let i = 0; i < roster.length; i++) {
    if (roster[i].heroId === id) return roster[i];
  }
  return null;
}

function toggleId(selected: number[], id: number): number[] {
  const next = selected.slice();
  const index = next.indexOf(id);
  if (index >= 0) {
    next.splice(index, 1);
    return next;
  }
  if (next.length >= FORM_MAX) return next;
  next.push(id);
  return next;
}

/** 打开出阵时按站位排。Mock 本局记录仍按点选顺序，最多 FORM_MAX。 */
function formationIds(): number[] {
  if (mockRuntimeEnabled()) {
    const local = localLineupIds();
    if (local.length > 0) return local.slice(0, FORM_MAX);
  }
  const line = GameStore.formation() || (Session.source === "wire" ? WireSession.lineUp : null);
  const ranked = mainFormationHeroes(line).slice().sort(byFormationPosition);
  const ids: number[] = [];
  for (let i = 0; i < ranked.length; i++) {
    const id = ranked[i].heroId;
    if (ids.indexOf(id) >= 0) continue;
    ids.push(id);
    if (ids.length >= FORM_MAX) break;
  }
  return ids;
}

function byFormationPosition(a: { position: number | null }, b: { position: number | null }): number {
  const ar = formationRank(a.position);
  const br = formationRank(b.position);
  if (ar !== br) return ar - br;
  return 0;
}

function formationRank(position: number | null): number {
  if (position === null) return 1000;
  for (let i = 0; i < WIRE_LINEUP_SAVE_POSITIONS.length; i++) {
    if (WIRE_LINEUP_SAVE_POSITIONS[i] === position) return i;
  }
  return 500 + position;
}

function heroSpaceShown(): number {
  if (Session.source === "wire" && WireSession.heroCapacity !== null && WireSession.heroCapacity >= 0) {
    return WireSession.heroCapacity;
  }
  return heroSpaceCap();
}

function bindTab(view: Node, name: string, fn: () => void): void {
  const node = findNamed(view, name);
  if (!node) return;
  if (!node.getComponent(Button)) node.addComponent(Button);
  node.on(Button.EventType.CLICK, fn);
}

function fitButton(node: Node | null, text: string, size: number): void {
  if (!node) return;
  const spriteComp = node.getComponent(Sprite);
  if (spriteComp) spriteComp.sizeMode = Sprite.SizeMode.CUSTOM;
  eachLabel(node, (label, host) => {
    label.string = text;
    label.fontSize = size;
    label.lineHeight = size + 4;
    label.overflow = Overflow.SHRINK;
    const ui = host.getComponent(UITransform);
    const parent = host.parent ? host.parent.getComponent(UITransform) : null;
    if (ui && parent && parent.contentSize.width > 8) {
      ui.setContentSize(Math.max(8, parent.contentSize.width - 8), Math.max(8, parent.contentSize.height - 4));
    }
  });
}

function writeNamed(root: Node, name: string, text: string): void {
  const node = findNamed(root, name);
  if (!node) return;
  setText(node, text);
  const label = node.getComponent(Label);
  if (!label) return;
  const scaled = Math.abs(node.scale.x - 1) > 0.05 || Math.abs(node.scale.y - 1) > 0.05;
  if (scaled) {
    label.overflow = Overflow.SHRINK;
    const ui = node.getComponent(UITransform);
    if (ui && ui.contentSize.width < 40) ui.setContentSize(360, 64);
    return;
  }
  if (label.fontSize > 28) {
    label.fontSize = 18;
    label.overflow = Overflow.SHRINK;
  }
}

function writeKeep(root: Node, name: string, text: string): void {
  const node = findNamed(root, name);
  if (node) setText(node, text);
}

function tintNamed(root: Node, name: string, color: Color): void {
  const node = findNamed(root, name);
  const label = node ? node.getComponent(Label) : null;
  if (label) label.color = color;
}

function holdUpgrade(node: Node | null, title: string): void {
  if (!node) return;
  fitButton(node, title, 22);
  setGray(node, true);
  if (!node.getComponent(Button)) node.addComponent(Button);
  node.on(Button.EventType.CLICK, () => {
    GameLog.shared.info("Hero", "英雄升级没有服端写协议，按钮停用，不改等级");
    const host = node.parent;
    flashToast(host && host.parent ? host.parent : node, "不发升级协议");
  });
}

function fillGrowBoard(
  board: Node,
  hero: StoreHero,
  profile: HeroProfile | null,
  stats: { atk: number; hp: number; def: number; spd: number } | null
): void {
  const star = hero.star ?? ((profile && profile.star) || null);
  const step = heroStarStep(star);
  const limit = step ? step.levelLimit : null;
  const level = hero.level;
  const capped = level !== null && limit !== null && level >= limit;
  writeKeep(board, "lbl_level", level === null ? "—" : limit === null ? String(level) : level + "/" + limit);
  writeKeep(board, "lbl_profession", "职业: —");
  const job = findNamed(board, "icon_occupat");
  if (job) job.active = false;
  writeKeep(board, "lbl_attack", "攻击：" + (stats ? String(stats.atk) : "—"));
  writeKeep(board, "lbl_hp", "血量：" + (stats ? String(stats.hp) : "—"));
  writeKeep(board, "lbl_defense", "防御：" + (stats ? String(stats.def) : "—"));
  writeKeep(board, "lbl_speed", "速度：" + (stats ? String(stats.spd) : "—"));
  const need = level === null || capped ? null : heroLevelNeed(level);
  const gold = knownGold();
  const exp = knownBagCount(HERO_EXP_ITEM);
  writeKeep(board, "lbl_gold_need", need ? String(need.gold) : "—");
  writeKeep(board, "lbl_exp_need", need ? String(need.exp) : "—");
  tintNamed(board, "lbl_gold_need", need && gold !== null && gold < need.gold ? SHORT : COST_OK);
  tintNamed(board, "lbl_exp_need", need && exp !== null && exp < need.exp ? SHORT : COST_OK);
  const maxed = findNamed(board, "lbl_max_tips");
  if (maxed) {
    maxed.active = capped || (level !== null && !need && !heroLevelNeed(level));
    if (maxed.active) setText(maxed, capped ? "已达星级上限" : "已达最大等级");
  }
  const note = board.getChildByName("UpgradeHold");
  if (!note) {
    const line = createLabel("不发升级协议", 14, { color: INK, width: 180, height: 22 });
    line.name = "UpgradeHold";
    const host = findNamed(board, "node_all") || board;
    place(line, host, 40, 250);
  }
  const menu = findNamed(board, "skill_menu");
  if (menu) {
    const old = menu.children.slice();
    for (let i = 0; i < old.length; i++) {
      if (old[i].name.indexOf("skill") === 0) old[i].destroy();
    }
    const skills = profile ? profile.skills : [];
    const n = skills.length < 4 ? skills.length : 4;
    for (let i = 0; i < n; i++) {
      const icon = sprite("skill" + i, 48, 48, "ui/hero/skill-icon_" + skills[i].id, "ui/hero/hero-icon_spr-default");
      place(icon, menu, -150 + i * 70, 0);
    }
    const box = menu.getComponent(UITransform);
    if (box) box.setContentSize(0, 0);
  }
}

function fillStarBoard(board: Node, hero: StoreHero, profile: HeroProfile | null): void {
  const star = hero.star ?? ((profile && profile.star) || 1);
  const cur = heroStarStep(star);
  const nxt = heroStarStep(star + 1);
  const maxed = star >= 14 || !nxt;
  writeKeep(board, "lbl_now_max_level", cur ? String(cur.levelLimit) : "—");
  writeKeep(board, "lbl_now_next_level", maxed ? "—" : nxt ? String(nxt.levelLimit) : "—");
  paintStarMarks(findNamed(board, "node_cur_star"), star);
  const nextStars = findNamed(board, "node_next_star");
  if (maxed) {
    paintStarMarks(nextStars, 0);
    if (nextStars && !nextStars.getChildByName("MaxStar")) {
      const line = createLabel("已满星", 14, { color: INK, width: 80, height: 22 });
      line.name = "MaxStar";
      place(line, nextStars, 0, 0);
    }
  } else {
    const oldMax = nextStars ? nextStars.getChildByName("MaxStar") : null;
    if (oldMax) oldMax.destroy();
    paintStarMarks(nextStars, star + 1);
  }
  const speed = findNamed(board, "lbl_upgrade_speed");
  if (speed) speed.active = false;
  const show = nxt || cur;
  writeKeep(
    board,
    "lbl_upgrade_attack",
    show ? show.attackShow + "%/" + show.hpShow + "%" : "—"
  );
  const from = cur && cur.skillLevels.length > 0 ? cur.skillLevels[0] : null;
  const to = nxt && nxt.skillLevels.length > 0 ? nxt.skillLevels[0] : null;
  writeKeep(board, "lbl_upgrade_skill_all_1", from === null ? "—" : from + "级");
  writeKeep(board, "lbl_upgrade_skill_all_2", maxed || to === null ? "—" : to + "级");
  const skills = profile ? profile.skills : [];
  const icon1 = findNamed(board, "spr_skill_icon_1");
  const icon2 = findNamed(board, "spr_skill_icon_2");
  if (icon1 && skills.length > 0) paintFirst(icon1, ["ui/hero/skill-icon_" + skills[0].id, "ui/hero/hero-icon_spr-default"]);
  if (icon2 && skills.length > 1) paintFirst(icon2, ["ui/hero/skill-icon_" + skills[1].id, "ui/hero/hero-icon_spr-default"]);
  writeKeep(board, "lbl_skill_level_1", from === null ? "—" : String(from));
  writeKeep(board, "lbl_skill_level_2", to === null ? "—" : String(to));
  writeKeep(board, "lbl_jump", "不发升星协议");
  const button = findNamed(board, "btn_up_star");
  fitButton(button, maxed ? "已满星" : "升星", 22);
  setGray(button, true);
  paintStarCostRow(board, hero, maxed ? null : nxt);
  const goldCost = nxt ? costNum(nxt.cost.concat(nxt.needItem), 900001) : null;
  writeKeep(board, "lbl_gold_need", goldCost === null ? "—" : String(goldCost));
  const gold = knownGold();
  tintNamed(board, "lbl_gold_need", goldCost !== null && gold !== null && gold < goldCost ? SHORT : COST_OK);
}

function paintStarCostRow(board: Node, hero: StoreHero, nxt: StarStep | null): void {
  const scroll = findNamed(board, "scroll_view");
  if (!scroll) return;
  const old = scroll.getChildByName("CostRow");
  if (old) old.destroy();
  const row = uiNode("CostRow");
  place(row, scroll, 24, 70);
  if (!nxt) {
    place(createLabel("已满星", 14, { color: INK, width: 120, height: 22 }), row, 40, 0);
    return;
  }
  const stacks = nxt.cost.concat(nxt.needItem);
  const icons = stacks.length < 4 ? stacks.length : 4;
  for (let i = 0; i < icons; i++) {
    const stack = stacks[i];
    const face = itemProfile(stack.itemType, null);
    const icon = face && face.icon ? face.icon : "ui/bag/backpack_" + stack.itemType;
    const owned = knownBagCount(stack.itemType);
    const cell = sprite("cost" + i, 48, 48, rareFrame(face ? face.rare : 0));
    place(cell, row, i * 64, 10);
    const image = sprite("icon", 40, 40, icon, "ui/bag/backpack_spr-default");
    place(image, cell, 0, 0);
    if (owned !== null && owned < stack.num) {
      const gray = image.getComponent(Sprite);
      if (gray) gray.grayscale = true;
    }
    place(createLabel("×" + stack.num, 12, { color: owned !== null && owned < stack.num ? SHORT : INK, width: 48, height: 16 }), row, i * 64, -28);
  }
  const needs = heroStarNeeds(hero.heroType, nxt.star);
  if (needs.length > 0) {
    const bits: string[] = [];
    for (let i = 0; i < needs.length && bits.length < 2; i++) bits.push(sacrificeLine(needs[i]));
    place(createLabel(bits.join("  "), 12, { color: INK, width: 160, height: 36 }), row, 250, 0);
  }
}

function costNum(stacks: { itemType: number; num: number }[], itemType: number): number | null {
  for (let i = 0; i < stacks.length; i++) {
    if (stacks[i].itemType === itemType) return stacks[i].num;
  }
  return null;
}

function knownGold(): number | null {
  if (Session.source === "wire" && !Session.wireSync.gold) return null;
  if (typeof Session.gold !== "number" || !isFinite(Session.gold)) return null;
  return Session.gold;
}

function knownBagCount(id: number): number | null {
  if (GameStore.bag() === null) return null;
  return bagCount(id);
}

function heroSpaceLine(all: StoreHero[] | null): string {
  const cap = heroSpaceShown();
  return "空间 " + (all ? all.length : "—") + "/" + cap;
}

function markHeroTabs(view: Node, tab: "hero" | "book" | "dragon"): void {
  paintTab(findNamed(view, "btn_hero"), tab === "hero");
  paintTab(findNamed(view, "btn_illustrat"), tab === "book");
  paintTab(findNamed(view, "btn_dragon"), tab === "dragon");
}

function markElem(board: Node | null, elem: number): void {
  if (!board) return;
  for (let i = 0; i <= 5; i++) {
    const button = findNamed(board, "btn_elem" + i);
    if (!button) continue;
    const scale = i === elem ? 1 : 0.8;
    button.setScale(scale, scale, 1);
  }
}

function bindElemRow(root: Node, pick: (id: number) => void): void {
  for (let i = 0; i <= 5; i++) {
    const id = i;
    const button = findNamed(root, "btn_elem" + id) || root.getChildByName("elem" + id);
    if (!button || (button as Node & { mxzgElem?: boolean }).mxzgElem) continue;
    (button as Node & { mxzgElem?: boolean }).mxzgElem = true;
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => pick(id));
  }
}

function bagTabHost(view: Node): Node | null {
  const scroll = findNamed(view, "btn_scroll_view");
  if (!scroll) return null;
  return scroll.getChildByName("content");
}

function sameBag(a: StoreBagItem, b: StoreBagItem): boolean {
  return a.itemId === b.itemId && a.itemType === b.itemType;
}

function paintTab(node: Node | null, on: boolean): void {
  if (!node) return;
  const button = node.getComponent(Button);
  if (button) button.transition = Button.Transition.NONE;
  paintSprite(node, on ? "ui/common/button_btn-tab-24" : "ui/common/button_btn-tab-23");
}

function setGray(node: Node | null, on: boolean): void {
  if (!node) return;
  const image = node.getComponent(Sprite);
  if (image) image.grayscale = on;
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) setGray(kids[i], on);
}

function flashToast(view: Node, text: string): void {
  GameLog.shared.info("UI", text);
  let host: Node | null = view;
  while (host && host.name !== "PagePrefabShell" && host.parent) host = host.parent;
  const layer = host && host.isValid ? host : view;
  const old = layer.getChildByName("ReadToast");
  if (old) old.destroy();
  const node = createLabel(text, 22, { color: CREAM, width: 520, height: 40 });
  node.name = "ReadToast";
  place(node, layer, 0, 180);
  const timer = setTimeout(() => {
    if (node.isValid) node.destroy();
  }, 1600);
  const maybe = timer as { unref?: () => void };
  if (typeof maybe.unref === "function") maybe.unref();
}

function mountNested(parent: Node, path: string, name: string): Promise<Node | null> {
  return loadPrefab(path).then(
    (prefab) => {
      if (!parent.isValid) return null;
      const node = spawnPrefab(prefab, parent);
      node.name = name;
      node.setPosition(0, 0, 0);
      return node;
    },
    (err) => {
      GameLog.shared.warn("UI", path + " " + messageOf(err));
      return null;
    }
  );
}

function showBagInfo(view: Node, item: StoreBagItem): void {
  const spec = bagCard(item);
  void mountNested(view, BAG_INFO_BOARD, "BagInfoHold").then((card) => {
    if (!view.isValid) return;
    const old = view.getChildByName("InfoCard");
    if (old) old.destroy();
    if (!card || !card.isValid) {
      showInfoCard(view, spec);
      return;
    }
    card.removeFromParent();
    const root = uiNode("InfoCard");
    place(root, view, 0, 0);
    root.setSiblingIndex(Math.max(0, view.children.length - 1));
    const dim = createRect("dim", 720, 1100, new Color(0, 0, 0, 140));
    place(dim, root, 320, 480);
    if (!dim.getComponent(Button)) dim.addComponent(Button);
    const close = () => {
      if (root.isValid) root.destroy();
    };
    dim.on(Button.EventType.CLICK, close);
    card.parent = root;
    card.setPosition(125, 330, 0);
    card.addComponent(BlockInputEvents);
    silenceBigMenus(card);
    const bg = findNamed(card, "spr_bg");
    if (bg) bg.setPosition(195, 148, 0);
    writeKeep(card, "lbl_prop_name", spec.title);
    writeKeep(card, "lbl_prop_type", spec.typeLine);
    const desc = findNamed(card, "lbl_desc");
    if (desc) {
      desc.active = true;
      setText(desc, spec.body || " ");
    }
    const icon = findNamed(card, "spr_icon");
    if (icon) {
      paintFirst(icon, [spec.icon, spec.fallback || "ui/bag/backpack_spr-default"]);
      if (icon.parent && spec.frame) {
        const frame = sprite("RareFrame", 108, 108, spec.frame);
        place(frame, icon.parent, icon.position.x, icon.position.y);
        frame.setSiblingIndex(icon.getSiblingIndex());
      }
    }
    const use = findNamed(card, "btn_enter");
    if (use) {
      use.active = true;
      setGray(use, true);
      fitButton(use, "使用", 22);
      if (!use.getComponent(Button)) use.addComponent(Button);
      use.on(Button.EventType.CLICK, () => {
        GameLog.shared.info("Bag", "背包使用停用，不发 5004–5009");
        flashToast(view, "不发使用协议");
      });
    }
    const detail = findNamed(card, "btn_detail");
    if (detail) detail.active = false;
    const decompose = findNamed(card, "btn_decompose");
    if (decompose) decompose.active = false;
    const src = findNamed(card, "btn_src");
    if (src) {
      setGray(src, true);
      if (!src.getComponent(Button)) src.addComponent(Button);
      src.on(Button.EventType.CLICK, () => flashToast(view, "来源只读，不跳转"));
    }
    const shut = findNamed(card, "btn_close");
    if (shut) {
      if (!shut.getComponent(Button)) shut.addComponent(Button);
      shut.on(Button.EventType.CLICK, close);
    }
  });
}

function hideNamed(root: Node, name: string): void {
  const node = findNamed(root, name);
  if (node) node.active = false;
}

function sprite(name: string, width: number, height: number, path: string, fallback?: string): Node {
  const node = uiNode(name);
  const ui = node.addComponent(UITransform);
  ui.setContentSize(width, height);
  const image = node.addComponent(Sprite);
  image.sizeMode = Sprite.SizeMode.CUSTOM;
  image.type = Sprite.Type.SIMPLE;
  if (fallback && fallback !== path) paintFirst(node, [path, fallback]);
  else paintSprite(node, path);
  return node;
}

function paintSprite(node: Node, path: string): void {
  paintFirst(node, [path]);
}

function paintFirst(node: Node, paths: string[]): void {
  const image = node.getComponent(Sprite);
  if (!image) return;
  const loadAt = (index: number) => {
    if (!node.isValid || index >= paths.length) return;
    try {
      resources.load(paths[index] + "/spriteFrame", SpriteFrame, (err, asset) => {
        if (!node.isValid) return;
        if (err || !asset) {
          loadAt(index + 1);
          return;
        }
        image.spriteFrame = asset;
      });
    } catch (_err) {
      return;
    }
  };
  loadAt(0);
}

function pinSprites(node: Node): void {
  const image = node.getComponent(Sprite);
  if (image) image.sizeMode = Sprite.SizeMode.CUSTOM;
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) pinSprites(kids[i]);
}

/** 全屏 menu 会吃掉格子和页签。收成 0 以后，点击落到子按钮上。 */
function silenceBigMenus(root: Node): void {
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as Node;
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
    if (node.name.toLowerCase().indexOf("menu") < 0) continue;
    const ui = node.getComponent(UITransform);
    if (!ui || ui.contentSize.width < 500 || ui.contentSize.height < 500) continue;
    ui.setContentSize(0, 0);
  }
}

/** 育成 / 星UP 的内容块对齐详情底栏，避免盖住页签。 */
function seatOnPanel(board: Node, panel: Node, contentY: number): void {
  board.setPosition(0, panel.position.y - contentY, 0);
}

function paintStarMarks(host: Node | null, count: number): void {
  if (!host) return;
  const old = host.children.slice();
  for (let i = 0; i < old.length; i++) {
    if (old[i].name !== "MaxStar") old[i].destroy();
  }
  const n = count > 5 ? 5 : count < 0 ? 0 : Math.floor(count);
  for (let i = 0; i < n; i++) {
    const star = sprite("star", 22, 22, "ui/hero/hero-info_spr-star-1");
    place(star, host, (i - (n - 1) / 2) * 24, 0);
  }
}

function findNamed(root: Node, name: string): Node | null {
  if (root.name === name) return root;
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) {
    const found = findNamed(kids[i], name);
    if (found) return found;
  }
  return null;
}

function eachLabel(node: Node, fn: (label: Label, host: Node) => void): void {
  const label = node.getComponent(Label);
  if (label) fn(label, node);
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) eachLabel(kids[i], fn);
}

function shortName(name: string): string {
  if (!name) return "";
  return name.length > 4 ? name.slice(0, 4) : name;
}

function clamp(value: number, min: number, max: number): number {
  if (!isFinite(value)) return min;
  const n = Math.floor(value);
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function clearedCount(): number {
  const stage = GameStore.mockStageId();
  if (stage !== null) return Math.max(0, stage - 1);
  const chapter = GameStore.chapter();
  if (chapter.fromStore && chapter.nowIdx !== null && chapter.nowIdx > 1) return chapter.nowIdx - 1;
  return 0;
}

function hangClockText(idle: { fromStore: boolean; rewardTime: number | null; maxRewardTime: number | null }): string {
  if (idle.fromStore && (idle.rewardTime === null || !isFinite(idle.rewardTime) || idle.rewardTime < IDLE_UNIX_FLOOR)) {
    return "未同步";
  }
  let elapsed = idle.fromStore ? wireIdleElapsedMs(idle.rewardTime, Date.now()) : Math.max(0, Date.now() - dressClock.t);
  const cap = idle.fromStore ? wireIdleCapMs(idle.maxRewardTime, idleCapMs()) : idleCapMs();
  if (cap !== null && elapsed > cap) elapsed = cap;
  return formatHangClock(elapsed);
}

function timeFill(idle: { fromStore: boolean; rewardTime: number | null; maxRewardTime: number | null }): number {
  if (idle.fromStore && (idle.rewardTime === null || !isFinite(idle.rewardTime) || idle.rewardTime < IDLE_UNIX_FLOOR)) {
    return 0;
  }
  let elapsed = idle.fromStore ? wireIdleElapsedMs(idle.rewardTime, Date.now()) : Math.max(0, Date.now() - dressClock.t);
  const cap = idle.fromStore ? wireIdleCapMs(idle.maxRewardTime, idleCapMs()) : idleCapMs();
  if (cap === null || cap <= 0) return elapsed > 0 ? 1 : 0;
  if (elapsed > cap) elapsed = cap;
  return elapsed / cap;
}

const dressClock = { t: Date.now() };

interface InfoCard {
  icon: string;
  title: string;
  typeLine: string;
  body: string;
  frame?: string;
  fallback?: string;
}

function gridScroll(parent: Node, name: string, x: number, y: number, width: number, height: number): Node {
  let view = parent.getChildByName(name);
  if (!view) {
    view = uiNode(name);
    const ui = view.addComponent(UITransform);
    ui.setContentSize(width, height);
    ui.setAnchorPoint(0.5, 1);
    const mask = view.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;
    const scroll = view.addComponent(ScrollView);
    scroll.vertical = true;
    scroll.horizontal = false;
    scroll.inertia = true;
    scroll.elastic = true;
    scroll.cancelInnerEvents = true;
    const content = uiNode("content");
    const box = content.addComponent(UITransform);
    box.setAnchorPoint(0.5, 1);
    box.setContentSize(width, height);
    place(content, view, 0, 0);
    scroll.content = content;
    place(view, parent, x, y);
  }
  const content = view.getChildByName("content");
  return content || view;
}

function sizeScroll(content: Node, height: number, minHeight: number): void {
  const ui = content.getComponent(UITransform);
  const width = ui && ui.contentSize.width > 0 ? ui.contentSize.width : 448;
  if (ui) ui.setContentSize(width, Math.max(minHeight, height));
}

function clearChildren(node: Node): void {
  const old = node.children.slice();
  for (let i = 0; i < old.length; i++) old[i].destroy();
}

function paddedSlots(count: number): number {
  return slotRows(Math.max(count, COLS * 4)) * COLS;
}

function slotRows(count: number): number {
  if (count <= 0) return 4;
  return Math.max(4, Math.ceil(count / COLS));
}

function gridX(index: number, origin: number, pitch: number): number {
  return origin + (index % COLS) * pitch;
}

function gridY(index: number, origin: number, pitch: number): number {
  return origin - Math.floor(index / COLS) * pitch;
}

function heroFace(hero: StoreHero): string {
  const profile = heroProfile(hero.heroType);
  if (profile && profile.icon) return profile.icon;
  return "ui/hero/hero-icon_spr-default";
}

function rareFrame(rare: number): string {
  if (rare === 2 || rare === 3 || rare === 4) return "ui/bag/backpack_spr-rare-" + rare;
  return "ui/bag/backpack_item-frame-1";
}

function elemLabel(elem: number | null): string {
  if (elem === null || elem < 1 || elem > 5) return "元素";
  return ELEM_NAME[elem];
}

function placeTitle(id: number, places: { id: number; title: string }[]): string {
  for (let i = 0; i < places.length; i++) {
    if (places[i].id === id) return places[i].title;
  }
  return "";
}

function bagCount(id: number): number {
  const all = GameStore.bag();
  if (!all) return 0;
  let n = 0;
  for (let i = 0; i < all.length; i++) {
    const item = all[i];
    if (item.num !== null && item.num <= 0) continue;
    if (item.itemType !== id && item.itemId !== id) continue;
    n += item.num === null ? 1 : item.num;
  }
  return n;
}

function relicOwned(relic: RelicFace): number {
  let n = 0;
  for (let i = 0; i < relic.stages.length; i++) n += bagCount(relic.stages[i].id);
  return n;
}

function sacrificeLine(need: SacrificeNeed): string {
  if (need.type > 0) {
    const profile = heroProfile(need.type);
    const name = profile ? profile.name : "英雄" + need.type;
    return name + " " + need.star + "星 ×" + need.num;
  }
  if (need.elem > 0) return elemLabel(need.elem) + need.star + "星 ×" + need.num;
  return "任意" + need.star + "星 ×" + need.num;
}

function profileCard(profile: HeroProfile): InfoCard {
  const stats = heroBaseStats(profile.type, profile.star);
  const names: string[] = [];
  for (let i = 0; i < profile.skills.length && i < 4; i++) names.push(profile.skills[i].name);
  const statLine = stats
    ? "攻击 " + stats.atk + "  HP " + stats.hp + "  防御 " + stats.def + "  速度 " + stats.spd
    : "";
  return {
    icon: profile.icon || "ui/hero/hero-icon_spr-default",
    fallback: "ui/hero/hero-icon_spr-default",
    title: profile.name,
    typeLine: elemLabel(profile.elem) + "  " + (profile.star === null ? "—" : profile.star + "星"),
    body: (names.length > 0 ? names.join("  ") : "无技能") + (statLine ? "\n" + statLine : "") + "\n未获得",
  };
}

function dropCard(face: DropFace, every: number | null): InfoCard {
  const profile = itemProfile(face.itemType, null);
  const count = face.min === face.max ? "表内数量 " + face.min : "表内 " + face.min + "–" + face.max;
  const freq = every === null ? "" : "每 " + every + " 秒判定一次。";
  return {
    icon: (profile && profile.icon) || "ui/bag/backpack_" + face.itemType,
    fallback: "ui/bag/backpack_spr-default",
    frame: rareFrame(profile ? profile.rare : 0),
    title: profile && profile.name ? profile.name : "掉落 " + face.itemType,
    typeLine: "可能掉落",
    body: freq + count + "。不在这里掷随机数，也不写进每分钟三格。",
  };
}

function bagCard(item: StoreBagItem): InfoCard {
  const profile = itemProfile(item.itemType, item.itemId);
  const raw = formatStoreBagLine(item);
  const tab = itemBagTab(item.itemType, item.itemId);
  if (!profile) {
    return {
      icon: item.itemId ? "ui/bag/backpack_" + item.itemId : "ui/bag/backpack_spr-default",
      fallback: "ui/bag/backpack_spr-default",
      frame: "ui/bag/backpack_item-frame-1",
      title: "道具",
      typeLine: raw,
      body: "对不上表。缺的数不写成 0。",
    };
  }
  const count = item.num === null ? "数量 无" : "数量 " + item.num;
  const rare = profile.rare > 0 ? "  稀有 " + profile.rare : "";
  return {
    icon: profile.icon || itemIconResource(item.itemType, item.itemId) || "ui/bag/backpack_spr-default",
    fallback: "ui/bag/backpack_spr-default",
    frame: rareFrame(profile.rare),
    title: profile.name || "道具",
    typeLine: "类型：" + bagTabTitle(tab) + "  " + count + rare,
    body: profile.blurb || " ",
  };
}

function jewelCard(id: number, placeId: number, rare: number, star: number, owned: number): InfoCard {
  const face = itemProfile(id, null);
  return {
    icon: face && face.icon ? face.icon : "ui/bag/backpack_" + id,
    fallback: "ui/bag/backpack_spr-default",
    frame: rareFrame(rare),
    title: face && face.name ? face.name : "宝石 " + id,
    typeLine: placeTitle(placeId, GEM_PLACES) + "  " + star + "星  稀有 " + rare,
    body: owned > 0 ? "持有 " + owned : "未获得",
  };
}

function gearCard(id: number, note: string, placeId: number, rare: number, star: number, owned: number): InfoCard {
  const face = itemProfile(id, null);
  const name = face && face.name ? face.name : note || "神装 " + id;
  return {
    icon: face && face.icon ? face.icon : "ui/bag/backpack_" + id,
    fallback: "ui/bag/backpack_spr-default",
    frame: rareFrame(rare),
    title: name,
    typeLine: placeTitle(placeId, GEAR_PLACES) + "  " + star + "星  稀有 " + rare,
    body: (face && face.blurb ? face.blurb + "\n" : "") + (owned > 0 ? "持有 " + owned : "未获得"),
  };
}

function relicCard(relic: RelicFace, owned: number): InfoCard {
  return {
    icon: relic.icon,
    fallback: "ui/bag/backpack_spr-default",
    frame: rareFrame(relic.rare),
    title: relic.name,
    typeLine: "圣物  稀有 " + relic.rare,
    body: (relic.feature || " ") + "\n" + (owned > 0 ? "持有 " + owned : "未获得"),
  };
}

function bagTabTitle(tab: BagTab): string {
  if (tab === "equip") return "装备";
  if (tab === "shard") return "碎片";
  if (tab === "spirit") return "精灵";
  return "道具";
}

function showInfoCard(view: Node, spec: InfoCard): void {
  const old = view.getChildByName("InfoCard");
  if (old) old.destroy();
  const root = uiNode("InfoCard");
  place(root, view, 0, 0);
  root.setSiblingIndex(Math.max(0, view.children.length - 1));
  const dim = createRect("dim", 640, 960, new Color(0, 0, 0, 140));
  place(dim, root, 320, 480);
  if (!dim.getComponent(Button)) dim.addComponent(Button);
  dim.on(Button.EventType.CLICK, () => {
    if (root.isValid) root.destroy();
  });
  const card = uiNode("card");
  const ui = card.addComponent(UITransform);
  ui.setContentSize(390, 300);
  card.addComponent(BlockInputEvents);
  const bg = sprite("bg", 390, 300, "ui/common/win-bg_block-bg-24");
  const bgImage = bg.getComponent(Sprite);
  if (bgImage) bgImage.type = Sprite.Type.SLICED;
  place(bg, card, 0, 0);
  place(card, root, 320, 500);
  place(sprite("frame", 88, 88, spec.frame || "ui/bag/backpack_item-frame-1"), card, -120, 70);
  place(sprite("icon", 72, 72, spec.icon, spec.fallback), card, -120, 74);
  place(createLabel(spec.title, 22, { color: NAME_GREEN, width: 220, height: 36, align: "left" }), card, 30, 96);
  place(createLabel(spec.typeLine, 16, { color: CREAM, width: 220, height: 48, align: "left" }), card, 30, 52);
  place(createLabel(spec.body || " ", 16, { color: DESC, width: 340, height: 140, align: "left" }), card, 0, -46);
  const close = sprite("close", 44, 44, "ui/common/button_btn-close-1");
  place(close, card, 165, 128);
  if (!close.getComponent(Button)) close.addComponent(Button);
  close.on(Button.EventType.CLICK, () => {
    if (root.isValid) root.destroy();
  });
}

function currentStageIdx(): number {
  const mock = GameStore.mockStageId();
  if (mock !== null && mock >= 1) return Math.floor(mock);
  const chapter = GameStore.chapter();
  if (chapter.nowIdx !== null && chapter.nowIdx >= 1) return Math.floor(chapter.nowIdx);
  if (chapter.maxIdx !== null && chapter.maxIdx >= 1) return Math.floor(chapter.maxIdx);
  return 1;
}
