/**
 * 挂机战斗主面板竖切的检查。不启动 Creator。
 * 核对开关、预制绑定、关卡收益，以及经 UIManager 打开和关掉。
 *
 * npx --yes esbuild client/tools/battle-view-check.ts --bundle --platform=node --format=cjs --tsconfig=client/tools/tsconfig.check.json --outfile=/tmp/mxzg-battle-view-check.js && node /tmp/mxzg-battle-view-check.js
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { assetManager, Button, Label, Node, Prefab, Sprite, UITransform } from "cc";
import { ConfigDb, ConfigTableFile } from "../assets/scripts/config/ConfigLoader";
import { bindGameCatalog } from "../assets/scripts/config/gameCatalog";
import { GameLog } from "../assets/scripts/core/GameLog";
import { GameStore } from "../assets/scripts/core/GameStore";
import { Session } from "../assets/scripts/core/Session";
import { battleViewFromSearch, setUseBattleView, useBattleView } from "../assets/scripts/features/battle/config/BattleFeatureFlag";
import { hangFace } from "../assets/scripts/features/battle/model/hangFace";
import { BattleHangView } from "../assets/scripts/features/battle/ui/BattleHangView";
import { HangMissionChipView } from "../assets/scripts/features/battle/ui/HangMissionChipView";
import { isOpenCancelled, UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UILayer } from "../assets/scripts/framework/ui/UILayer";
import { viewCtorById, viewSpecOf } from "../assets/scripts/framework/ui/UIRegistry";
import { clearPrefabCache } from "../assets/scripts/ui/prefabLoad";
import { barIndex, barSlideDir, pageContentReady, selectedBarId } from "../assets/scripts/ui/barSlide";

const root = process.cwd();

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function classId(uuid: string): string {
  const hex = uuid.replace(/-/g, "").toLowerCase();
  let out = hex.slice(0, 5);
  for (let i = 5; i < hex.length; i += 3) {
    const h1 = parseInt(hex[i], 16);
    const h2 = parseInt(hex[i + 1], 16);
    const h3 = parseInt(hex[i + 2], 16);
    out += BASE64[(h1 << 2) | (h2 >> 2)];
    out += BASE64[((h2 & 3) << 4) | h3];
  }
  return out;
}

function metaUuid(path: string): string {
  const meta = JSON.parse(read(path)) as { uuid?: string };
  if (!meta.uuid) throw new Error("缺少 uuid " + path);
  return meta.uuid;
}

interface PrefabObj {
  __type__?: string;
  _name?: string;
  _components?: { __id__?: number }[];
  [key: string]: unknown;
}

function loadPrefab(path: string): PrefabObj[] {
  return JSON.parse(read(path)) as PrefabObj[];
}

function component(data: PrefabObj[], typeId: string): { index: number; comp: PrefabObj } {
  for (let i = 0; i < data.length; i++) {
    if (data[i].__type__ === typeId) return { index: i, comp: data[i] };
  }
  throw new Error("预制上没有组件 " + typeId);
}

function idOf(value: unknown): number {
  const ref = value as { __id__?: number } | null;
  if (!ref || typeof ref.__id__ !== "number") return -1;
  return ref.__id__;
}

function assertNode(data: PrefabObj[], comp: PrefabObj, field: string, nodeId: number, nodeName: string): void {
  const id = idOf(comp[field]);
  assert(id === nodeId, field + " 应指向 " + nodeName + " #" + nodeId + "，实际 " + id);
  const node = data[nodeId];
  assert(node && node.__type__ === "cc.Node" && node._name === nodeName, field + " 指向的不是 " + nodeName);
}

function assertComp(data: PrefabObj[], comp: PrefabObj, field: string, compId: number, typeName: string): void {
  const id = idOf(comp[field]);
  assert(id === compId, field + " 应指向 " + typeName + " #" + compId + "，实际 " + id);
  const target = data[compId];
  assert(target && target.__type__ === typeName, field + " 指向的不是 " + typeName);
}

function checkFlag(): void {
  assert(battleViewFromSearch("") === true, "没有参数走新战斗页");
  assert(battleViewFromSearch("?battle=old") === false, "?battle=old 走旧挂机壳");
  assert(battleViewFromSearch("?battle=0") === false, "battle=0 走旧挂机壳");
  assert(battleViewFromSearch("?battle=false") === false, "battle=false 走旧挂机壳");
  assert(battleViewFromSearch("?battle=new") === true, "battle=new 仍走新战斗页");
  assert(battleViewFromSearch("?hero=old") === true, "英雄开关不关战斗");
  assert(battleViewFromSearch("?dev=wire&battle=old") === false, "battle=old 夹在别的参数里也生效");
  setUseBattleView(false);
  assert(useBattleView() === false, "关掉开关应回到旧挂机壳");
  setUseBattleView(true);
  assert(useBattleView() === true, "打开开关走新战斗页");
}

function checkSources(): void {
  const views = [
    "client/assets/scripts/features/battle/ui/BattleHangView.ts",
    "client/assets/scripts/features/battle/ui/HangMissionChipView.ts",
  ];
  for (let i = 0; i < views.length; i++) {
    const text = read(views[i]);
    assert(text.indexOf("getChildByName") < 0, views[i] + " 不应 getChildByName");
    assert(text.indexOf("findNamed") < 0, views[i] + " 不应 findNamed");
    assert(text.indexOf("findNode") < 0, views[i] + " 不应 findNode");
    assert(text.indexOf("findDescendant") < 0, views[i] + " 不应 findDescendant");
    assert(text.indexOf("decodeWire") < 0, views[i] + " 不应解协议");
  }
  const face = read("client/assets/scripts/features/battle/model/hangFace.ts");
  assert(face.indexOf("GameStore.idle") >= 0, "计时读 GameStore");
  assert(face.indexOf("chapterIdleMinute") >= 0, "三格读 chapterreward");
  assert(face.indexOf("decodeWire") < 0, "面板数据不解字节");
  assert(face.indexOf("主线未同步") >= 0, "没同步不编关卡名");
  const mount = read("client/assets/scripts/features/battle/ui/battleMount.ts");
  assert(mount.indexOf("mountIdleHang") >= 0, "新壳仍铺殿堂");
  assert(mount.indexOf("findDescendant") < 0, "挂载不递归搜树");
  const fill = read("client/assets/scripts/ui/screenFill.ts");
  assert(fill.indexOf("export function dressHangPanel") >= 0, "旧 dressHangPanel 还在");
  const shell = read("client/assets/scripts/ui/pagePrefabShell.ts");
  assert(shell.indexOf("export async function mountHangBattleShell") >= 0, "旧挂机壳还在");
  assert(shell.indexOf("beginHangBattle") >= 0, "旧战斗入口还在");
  assert(shell.indexOf("export function bindHangProbe") >= 0, "空地长按仍能打开探针");
  const main = read("client/assets/scripts/ui/MainApp.ts");
  assert(main.indexOf("useBattleView") >= 0, "MainApp 有战斗开关");
  assert(main.indexOf("UIManager.instance.open(BattleHangView)") >= 0, "开关打开时走 BattleHangView");
  assert(main.indexOf("mountHangBattleShell") >= 0, "旧壳路径还在");
  assert(main.indexOf("dropWaitingBarSlide(\"mainline\")") >= 0, "战斗打开失败丢掉未开始的过场");
  assert(main.indexOf("holdBarSlide") >= 0, "预制加载期间留着过场");
  assert(main.indexOf("USE_BATTLE_PREFAB") < 0, "MainApp 不另长一个战斗预制开关");
  assert(main.indexOf('Session.source === "wire" && wireDebugEnabled()') >= 0, "探针条件还在");
  const openAt = main.indexOf("private openMainline");
  const branch = main.slice(openAt, openAt + 700);
  assert(branch.indexOf("this.openChild(\"mainline\")") >= 0, "旧开关仍 openChild");
  assert(branch.indexOf("BattleHangView") >= 0, "新开关打开战斗视图");
  assert(branch.indexOf("useBattleView") >= 0, "打开挂机看开关");
  const manager = read("client/assets/scripts/framework/ui/UIManager.ts");
  assert(manager.indexOf("BattleHang") < 0 && manager.indexOf("mountBattle") < 0, "UIManager 不写死战斗");
  assert(!existsSync(join(root, "client/assets/prefabs/ui/battle/WireBattlePage.prefab")), "不恢复 WireBattlePage");
  assert(existsSync(join(root, "client/assets/prefabs/ui/battle/BattlePage.prefab")), "BattlePage 还在");
  assert(existsSync(join(root, "client/assets/prefabs/ui/battle/BattleEndLayer.prefab")), "BattleEndLayer 还在");
  assert(selectedBarId("mainline", "city") === "battle", "当前是挂机时只亮战斗");
  assert(selectedBarId("hero", "mainline") === "hero", "英雄不跟战斗一起亮");
  assert(barSlideDir(barIndex("city"), barIndex("battle")) === 1, "主城到战斗从右进");
  assert(barSlideDir(barIndex("bag"), barIndex("battle")) === 1, "背包到战斗从右进");
  assert(barSlideDir(barIndex("dungeon"), barIndex("battle")) === -1, "副本到战斗从左进");
  assert(pageContentReady(["PagePrefabShell"]) === true, "挂机壳挂上就能滑");
  assert(pageContentReady(["IdleHang"]) === true, "殿堂挂上就能滑");
}

function checkPrefab(): void {
  const viewType = classId(metaUuid("client/assets/scripts/features/battle/ui/BattleHangView.ts.meta"));
  const chipType = classId(metaUuid("client/assets/scripts/features/battle/ui/HangMissionChipView.ts.meta"));
  const layer = loadPrefab("client/assets/prefabs/ui/battle/BattlePanelLayer.prefab");
  const view = component(layer, viewType);
  assert((layer[1]._components || []).some((row) => row.__id__ === view.index), "BattlePanelLayer 根上有 BattleHangView");
  assertComp(layer, view.comp, "btnBattle", 46, "cc.Button");
  assertComp(layer, view.comp, "btnLineup", 60, "cc.Button");
  assertComp(layer, view.comp, "btnSpeed", 74, "cc.Button");
  assertComp(layer, view.comp, "battleTitle", 52, "cc.Label");
  assertComp(layer, view.comp, "lineupTitle", 66, "cc.Label");
  assertComp(layer, view.comp, "speedTitle", 80, "cc.Label");
  assertComp(layer, view.comp, "clockLabel", 156, "cc.Label");
  assertComp(layer, view.comp, "goldLabel", 162, "cc.Label");
  assertComp(layer, view.comp, "soulsLabel", 168, "cc.Label");
  assertComp(layer, view.comp, "expLabel", 174, "cc.Label");
  assertComp(layer, view.comp, "bubbleLabel", 190, "cc.Label");
  assertNode(layer, view.comp, "worldMap", 11, "spr_world");
  assertNode(layer, view.comp, "mapLabel", 23, "lbl_map");
  assertNode(layer, view.comp, "worldIcon", 29, "spr_world_icon");
  assertNode(layer, view.comp, "missionName", 97, "lbl_mission_name");
  assertNode(layer, view.comp, "hitMenu", 35, "menu");
  const chipPrefab = view.comp.chipPrefab as { __uuid__?: string };
  assert(chipPrefab.__uuid__ === "4d270a16-c38e-45b9-f277-80e134c3b2a6", "chipPrefab 是 HangMissionChip");

  const chipData = loadPrefab("client/assets/prefabs/ui/battle/HangMissionChip.prefab");
  const chip = component(chipData, chipType);
  assert((chipData[1]._components || []).some((row) => row.__id__ === chip.index), "HangMissionChip 根上有 HangMissionChipView");
  assertComp(chipData, chip.comp, "caption", 17, "cc.Label");
  assertNode(chipData, chip.comp, "icon", 7, "icon");
}

function checkRegistry(): void {
  const spec = viewSpecOf(BattleHangView);
  assert(spec !== null, "BattleHangView 未注册");
  assert(spec.id === "mainline", "页面 id 应是 mainline");
  assert(spec.prefab === "prefabs/ui/battle/BattlePanelLayer", "预制路径");
  assert(spec.layer === UILayer.Page, "层应是 Page");
  assert(spec.cache === false, "挂机主面板不缓存");
  assert(spec.allowMultiple === false, "挂机主面板不叠两份");
  assert(typeof spec.mount === "function", "挂载在 ViewSpec 上");
  assert(viewCtorById("mainline") === BattleHangView, "id mainline 应对回 BattleHangView");
  assert(UIManager.instance.createPageHost("mainline") === null, "没 open 时 presentPage 继续走旧壳");
}

function labelOn(node: Node, text: string): Label {
  const label = node.addComponent(Label);
  label.string = text;
  return label;
}

function buttonOn(name: string): Button {
  const node = new Node(name);
  node.addComponent(Sprite);
  return node.addComponent(Button);
}

function fakePrefab(build: (node: Node) => void): Prefab {
  const prefab = new Prefab() as Prefab & { _instantiate: () => Node };
  prefab._instantiate = () => {
    const node = new Node("inst");
    build(node);
    return node;
  };
  return prefab;
}

function makeChip(node: Node): HangMissionChipView {
  node.name = "HangMissionChip";
  node.addComponent(Button);
  const chip = node.addComponent(HangMissionChipView);
  chip.icon = new Node("icon");
  chip.icon.addComponent(Sprite);
  chip.icon.parent = node;
  const caption = new Node("HangMissionLabel");
  chip.caption = labelOn(caption, "999");
  caption.parent = node;
  return chip;
}

function makeView(): BattleHangView {
  const scene = new Node("scene");
  const host = new Node("BattlePanelLayer");
  host.parent = scene;
  host.addComponent(UITransform).setContentSize(640, 1280);
  const view = host.addComponent(BattleHangView);
  view.btnBattle = buttonOn("btn_battle");
  view.btnLineup = buttonOn("btn_lineup");
  view.btnSpeed = buttonOn("btn_speed_battle");
  if (view.btnBattle.node) view.btnBattle.node.parent = host;
  if (view.btnLineup.node) view.btnLineup.node.parent = host;
  if (view.btnSpeed.node) view.btnSpeed.node.parent = host;
  view.battleTitle = labelOn(new Node("battleTitle"), "");
  view.lineupTitle = labelOn(new Node("lineupTitle"), "");
  view.speedTitle = labelOn(new Node("speedTitle"), "");
  view.clockLabel = labelOn(new Node("lbl_progress_time"), "999");
  view.goldLabel = labelOn(new Node("lbl_gold"), "999");
  view.soulsLabel = labelOn(new Node("lbl_souls"), "999");
  view.expLabel = labelOn(new Node("lbl_exp"), "999");
  view.bubbleLabel = labelOn(new Node("lbl_progress_time2"), "999");
  view.worldMap = new Node("spr_world");
  view.worldMap.parent = host;
  view.mapLabel = new Node("lbl_map");
  view.mapLabel.parent = host;
  view.worldIcon = new Node("spr_world_icon");
  view.worldIcon.parent = host;
  view.missionName = new Node("lbl_mission_name");
  labelOn(view.missionName, "999");
  view.missionName.parent = host;
  view.hitMenu = new Node("menu");
  view.hitMenu.addComponent(UITransform).setContentSize(640, 960);
  view.hitMenu.parent = host;
  view.chipPrefab = fakePrefab((node) => {
    makeChip(node);
  });
  return view;
}

function missionLabel(view: BattleHangView): Label {
  const node = view.missionName;
  const label = node ? (node.getComponent(Label) as Label | null) : null;
  if (!label) throw new Error("lbl_mission_name 上没有 Label");
  return label;
}

function chipOf(view: BattleHangView): HangMissionChipView {
  const shell = view.node.parent;
  const host = shell || view.node;
  const kids = host.children;
  for (let i = 0; i < kids.length; i++) {
    const chip = kids[i].getComponent(HangMissionChipView) as HangMissionChipView | null;
    if (chip) return chip;
  }
  throw new Error("没有挂上 HangMissionChip");
}

function noteChapter(nowIdx: number | null, rewardTime: number | null): void {
  GameStore.noteWire({
    enabled: true,
    account: "battle-check",
    serverId: 1,
    roleId: 1,
    name: "battle-check",
    nameSynced: true,
    level: 1,
    gold: null,
    diamond: null,
    nowIdx,
    maxIdx: nowIdx,
    heroes: null,
    bag: null,
    lineUp: null,
    unlockIds: null,
    rewardTime,
    maxRewardTime: null,
    battle: null,
  });
}

function bindChapter(): void {
  const chapterreward: ConfigTableFile<Record<string, unknown>> = {
    table: "chapterreward",
    rows: [
      {
        idx: 1,
        reward_base: "[{\"item_type\":900001,\"item_num\":200},{\"item_type\":900003,\"item_num\":10},{\"item_type\":900101,\"item_num\":25}]",
      },
    ],
  };
  const tables = new Map<string, ConfigTableFile<Record<string, unknown>>>();
  tables.set("chapterreward", chapterreward);
  const db = new ConfigDb();
  db.tables = tables;
  ConfigDb.current = db;
  bindGameCatalog(tables);
}

function clearChapter(): void {
  ConfigDb.current = null;
  bindGameCatalog(new Map());
}

const toasts: string[] = [];

function installNav(): { current: { id: string | null }; backs: { n: number } } {
  const current = { id: "city" as string | null };
  const backs = { n: 0 };
  UIManager.instance.install(
    {
      get current() {
        return current.id;
      },
      openChild(id: string) {
        current.id = id;
      },
      back() {
        if (!current.id || current.id === "city") return false;
        current.id = "city";
        backs.n += 1;
        return true;
      },
    },
    {
      showToast(text: string) {
        toasts.push(text);
      },
    }
  );
  return { current, backs };
}

async function openView(): Promise<BattleHangView> {
  const view = makeView();
  view.onOpen();
  await view.whenReady();
  return view;
}

function checkData(): void {
  const previous = Session.source;
  try {
    GameStore.reset();
    clearChapter();
    Session.source = "wire";
    const missing = hangFace(1_700_000_000_000, 1_700_000_000_000);
    assert(missing.synced === false && missing.caption === "主线未同步", "未同步不编关卡名");
    assert(missing.gold === "—/m" && missing.souls === "—/m" && missing.exp === "—/m", "真服没表写破折号");
    assert(missing.clock !== "999", "计时不留预制占位");

    Session.source = "mock";
    const mock = hangFace(1_700_000_000_000, 1_700_000_000_000);
    assert(mock.caption === "主线未同步", "Mock 没关卡也不编名字");
    assert(mock.gold === "6/m" && mock.souls === "2/m" && mock.exp === "每30s", "Mock 没表才退回旧节奏");
    assert(mock.clock === "00:00", "刚打开的 Mock 计时从 0 起");

    bindChapter();
    Session.source = "wire";
    noteChapter(null, null);
    const bare = hangFace(1_700_000_000_000, 1_700_000_000_000);
    assert(bare.synced === false && bare.caption === "主线未同步", "空关卡号仍写未同步");
    assert(bare.clock === "未同步", "reward_time 没有就写未同步");
    assert(bare.gold === "200/m" && bare.souls === "25/m" && bare.exp === "10/m", "没关卡号时三格仍按旧规则用第 1 关的表");

    const now = 1_700_000_090_000;
    noteChapter(1, 1_700_000_000);
    const live = hangFace(now, now);
    assert(live.synced === true && live.caption === "第1关", "关卡字来自 nowIdx");
    assert(live.gold === "200/m" && live.souls === "25/m" && live.exp === "10/m", "三格来自这一关 reward_base");
    assert(live.clock === "01:30", "计时是 reward_time 到现在的 90 秒");
  } finally {
    Session.source = previous;
    GameStore.reset();
    clearChapter();
  }
}

async function checkPaint(): Promise<void> {
  const previous = Session.source;
  try {
    bindChapter();
    Session.source = "wire";
    noteChapter(1, Math.floor(Date.now() / 1000) - 90);
    const nav = installNav();
    const view = await openView();
    const before = hangFace(Date.now(), 0).clock;
    const shown = view.clockLabel ? view.clockLabel.string : "";
    const after = hangFace(Date.now(), 0).clock;
    assert(shown === before || shown === after, "面板计时跟 reward_time，实际 " + shown);
    assert(shown.indexOf("999") < 0, "不留 999");
    assert(view.goldLabel !== null && view.goldLabel.string === "200/m", "金币是表里的每分钟");
    assert(view.soulsLabel !== null && view.soulsLabel.string === "25/m", "英雄经验是表里的每分钟");
    assert(view.expLabel !== null && view.expLabel.string === "10/m", "角色经验是表里的每分钟");
    assert(view.bubbleLabel !== null && view.bubbleLabel.string === shown, "泡上的计时和条上一样");
    const chip = chipOf(view);
    assert(chip.caption !== null && chip.caption.string === "", "关卡名不留在左侧小标上");
    assert(view.worldMap !== null && view.worldMap.active === false, "缩略图收起");
    assert(view.mapLabel !== null && view.mapLabel.active === false, "地图字收起");
    const mission = missionLabel(view);
    assert(view.missionName !== null && view.missionName.active === true, "关卡名留在预制 lbl_mission_name");
    assert(mission.string === "第1关", "关卡字来自当前关");
    assert(mission.fontSize === 45, "关卡字号按 CCBI 45");
    assert(view.missionName.scale.x === 0.8 && view.missionName.scale.y === 0.8, "关卡字缩放按 CCBI 0.8");
    assert(mission.color.r === 254 && mission.color.g === 255 && mission.color.b === 255, "关卡字颜色按 CCBI 白");
    assert(view.battleTitle !== null && view.battleTitle.string === "战斗", "中间钮写战斗");
    assert(view.lineupTitle !== null && view.lineupTitle.string === "战力UP", "左侧钮写战力UP");
    assert(view.speedTitle !== null && view.speedTitle.string === "高速战斗", "右侧钮写高速战斗");
    const menu = view.hitMenu ? view.hitMenu.getComponent(UITransform) : null;
    assert(menu !== null && menu.contentSize.width === 0 && menu.contentSize.height === 0, "全屏 menu 收成 0");
    const toastAt = toasts.length;
    if (view.btnSpeed && view.btnSpeed.node) view.btnSpeed.node.emit(Button.EventType.CLICK);
    if (view.btnLineup && view.btnLineup.node) view.btnLineup.node.emit(Button.EventType.CLICK);
    chip.node.emit(Button.EventType.CLICK);
    assert(toasts[toastAt] === "高速战斗仍走旧挂机", "快速战斗不在这一刀");
    assert(toasts[toastAt + 1] === "战力UP仍走旧挂机", "战力UP不在这一刀");
    assert(toasts[toastAt + 2] === "章节地图仍走旧挂机", "章节地图不在这一刀");
    const page = new Node("LiveShell");
    const shell = new Node("PagePrefabShell");
    shell.parent = page;
    view.node.parent = shell;
    if (view.btnBattle && view.btnBattle.node) view.btnBattle.node.emit(Button.EventType.CLICK);
    assert(page.getChildByName("PagePrefabShell") !== null, "战斗钮留在挂机壳上");

    nav.current.id = "city";
    view.close();
    assert(nav.backs.n === 0, "不在挂机页时关闭不拆栈");
    nav.current.id = "mainline";
    view.close();
    assert(nav.backs.n === 1 && nav.current.id === "city", "在挂机页时关闭走页面栈返回");
    view.node.destroy();

    GameStore.reset();
    clearChapter();
    Session.source = "wire";
    const unsynced = await openView();
    assert(missionLabel(unsynced).string === "主线未同步", "未同步关卡名不编名字");
    assert(chipOf(unsynced).caption !== null && chipOf(unsynced).caption!.string === "", "未同步也不把关卡名写到左侧小标");
    assert(unsynced.clockLabel !== null && unsynced.clockLabel.string !== "999", "未同步也不留 999");
    assert(unsynced.goldLabel !== null && unsynced.goldLabel.string === "—/m", "未同步且没进 Store 时三格是破折号");
    unsynced.node.destroy();
  } finally {
    Session.source = previous;
    GameStore.reset();
    clearChapter();
  }
}

async function checkManager(): Promise<void> {
  const previous = Session.source;
  try {
    bindChapter();
    Session.source = "wire";
    noteChapter(1, Math.floor(Date.now() / 1000) - 90);
    const stack: string[] = ["city"];
    const rootNode = new Node("pageLayer");
    let opens = 0;
    const highlights: string[] = [];
    UIManager.instance.install(
      {
        get current() {
          return stack[stack.length - 1] || null;
        },
        openChild(id: string) {
          opens += 1;
          const host = UIManager.instance.createPageHost(id);
          assert(host !== null && host.isValid && host.name === "LiveShell", "进栈的是已经装好的壳");
          assert(host.getChildByName("PagePrefabShell") !== null, "挂机先铺 PagePrefabShell");
          const shell = host.getChildByName("PagePrefabShell");
          assert(shell !== null && shell.getChildByName("IdleHang") !== null, "殿堂在面板下面");
          assert(shell !== null && shell.getChildByName("BattlePanelLayer") !== null, "底栏是 BattlePanelLayer");
          const names: string[] = [];
          for (let i = 0; i < host.children.length; i++) names.push(host.children[i].name);
          assert(pageContentReady(names) === true, "壳挂上之后过场可以播");
          host.parent = rootNode;
          stack.push(id);
        },
        back() {
          if (stack.length <= 1) return false;
          const id = stack.pop() || "";
          const host = rootNode.getChildByName("LiveShell");
          if (host) host.destroy();
          if (id) UIManager.instance.noteClosed(id);
          return true;
        },
      },
      {
        showToast(text: string) {
          toasts.push(text);
        },
        onPageOpened(id: string) {
          highlights.push(id);
        },
      }
    );
    clearPrefabCache();
    assetManager.loadBundle = (_name: string, cb: (err: Error | null, bundle: object | null) => void) => {
      cb(null, {
        load(inner: string, _type: unknown, done: (err: Error | null, asset: Prefab | null) => void) {
          const prefab = new Prefab() as Prefab & { _instantiate: () => Node };
          prefab._instantiate = () => {
            if (inner.indexOf("BattlePanelLayer") >= 0) {
              const view = makeView();
              view.node.name = "BattlePanelLayer";
              view.node.removeFromParent();
              return view.node;
            }
            if (inner.indexOf("HangMissionChip") >= 0) {
              const node = new Node("HangMissionChip");
              makeChip(node);
              return node;
            }
            if (inner.indexOf("PagePrefabShell") >= 0) {
              const node = new Node("PagePrefabShell");
              const spot = new Node("HangProbeHotspot");
              spot.parent = node;
              return node;
            }
            return new Node(inner.split("/").pop() || "prefab");
          };
          done(null, prefab);
        },
      });
    };
    const opened = await UIManager.instance.open(BattleHangView);
    assert(opens === 1, "打开只压一层");
    assert(highlights[0] === "mainline", "打开之后才通知底栏");
    assert(stack[stack.length - 1] === "mainline", "栈顶是挂机");
    assert(opened.goldLabel !== null && opened.goldLabel.string === "200/m", "UIManager 打开后写出收益");
    assert(missionLabel(opened).string === "第1关", "UIManager 打开后写出关卡");
    assert(UIManager.instance.close(opened) === true, "装好的挂机页可以关");
    assert(stack[stack.length - 1] === "city", "关掉回到主城");
    assert(UIManager.instance.createPageHost("mainline") === null, "关掉之后不再交出旧壳");

    clearPrefabCache();
    assetManager.loadBundle = (_name: string, cb: (err: Error | null, bundle: null) => void) => {
      cb(new Error("bundle down"), null);
    };
    assetManager.loadAny = (_request: unknown, cb: (err: Error | null, asset: null) => void) => {
      cb(new Error("uuid down"), null);
    };
    const toastAt = toasts.length;
    const opensBefore = opens;
    let failed = false;
    try {
      await UIManager.instance.open(BattleHangView);
    } catch (err) {
      failed = !isOpenCancelled(err);
    }
    assert(failed, "预制加载失败要拒绝打开");
    assert(opens === opensBefore, "失败不能压栈");
    assert(toasts[toastAt] === "页面没有打开", "失败要有可见提示");
    assert(UIManager.instance.createPageHost("mainline") === null, "失败后不能再交出空壳");
  } finally {
    Session.source = previous;
    GameStore.reset();
    clearChapter();
  }
}

async function main(): Promise<void> {
  GameLog.shared.mirrorConsole = false;
  checkFlag();
  checkSources();
  checkPrefab();
  checkRegistry();
  checkData();
  await checkPaint();
  await checkManager();
  GameStore.reset();
  clearChapter();
  setUseBattleView(true);
  console.log("battle-view-check ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
