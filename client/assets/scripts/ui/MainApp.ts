/**
 * 主城壳（C2）。Canvas 下用代码生成顶栏、底栏和面板，不需要美术。
 * 从 Boot 进来时，若场景上没挂本组件，Boot 会 addComponent。
 * 单独预览 Main：把 MainApp 挂到 Main 场景的 Canvas 上。
 * 顶栏和底栏在 UIShell 的 chrome 层，不进页面栈。系统面板走 PanelNav。
 */
import { _decorator, BlockInputEvents, Color, Component, Node, UITransform } from "cc";
import { ConfigDb, ConfigLoader } from "../config/ConfigLoader";
import { listOpenEntries } from "../config/gates";
import {
  BOTTOM_TABS,
  CITY_TAB,
  entryAccess,
  findNavEntry,
  NavEntry,
  PLAY_ENTRIES,
  tabLabel,
} from "../config/nav";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  formatDiamondLine,
  formatGoldLine,
  formatNameLine,
  formatSubLine,
  Session,
} from "../core/Session";
import { NetClient } from "../net/NetClient";
import { NetState } from "../net/NetTypes";
import { Proto } from "../net/protocol";
import { CityChrome, mountCityChrome, TabState } from "./CityChrome";
import { buildHeroDetail, buildHeroList, HeroDetailPage, HeroListPage } from "./HeroPage";
import { buildSummonPage, SummonPage } from "./SummonPage";
import { buildIdlePage, IdlePage } from "./IdlePage";
import { buildMainlinePage, MainlinePage } from "./MainlinePage";
import { PanelNav } from "./PanelNav";
import { UIShell } from "./UIShell";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const { ccclass } = _decorator;

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE_COLOR = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const GATE_COLOR = new Color(170, 190, 170, 255);
const LOCKED_FILL = new Color(78, 84, 98, 255);
const OPEN_FILL = new Color(46, 110, 190, 255);
const IDLE_FILL = new Color(168, 116, 42, 255);

@ccclass("MainApp")
export class MainApp extends Component {
  private shell: UIShell | null = null;
  private panels: PanelNav<Node> | null = null;
  private chrome: CityChrome | null = null;
  private built = false;
  private mainline: MainlinePage | null = null;
  private idle: IdlePage | null = null;
  private heroList: HeroListPage | null = null;
  private heroDetail: HeroDetailPage | null = null;
  private summon: SummonPage | null = null;
  private selectedHeroId = 0;
  private gateNode: Node | null = null;
  private mainButton: Node | null = null;
  private logLabel: Node | null = null;
  private offLog: (() => void) | null = null;
  private netState: NetState = NetClient.shared.state;

  start() {
    if (this.built) return;
    this.built = true;
    void this.build();
  }

  onDestroy() {
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
    this.chrome = mountCityChrome(shell.chromeLayer, (id) => this.onTab(id));
    this.panels = new PanelNav<Node>(
      shell,
      (id) => this.buildPage(id),
      (id) => this.noteClose(id)
    );
    this.panels.start(this.buildCity());
    this.refreshChrome();
    GameLog.shared.info(
      "MainApp",
      "city ready account=" +
        (Session.account || "(none)") +
        " role=" +
        (Session.role?.name || "(none)") +
        " server=" +
        (Session.serverName || "(none)") +
        " gold=" +
        Session.gold +
        " diamond=" +
        Session.diamond
    );
  }

  private onTab(id: string): void {
    GameLog.shared.info("MainApp", "tab " + id);
    if (!this.allow(id)) return;
    if ((id === "hero" || id === "summon") && !this.ensureNet()) return;
    this.panels?.openRoot(id);
    this.refreshChrome();
  }

  private openChild(id: string): void {
    GameLog.shared.info("MainApp", "open " + id);
    if (!this.allow(id)) return;
    this.panels?.openChild(id);
    this.refreshChrome();
  }

  private back(): void {
    const closed = this.panels?.back() === true;
    if (!closed) return;
    GameLog.shared.info("MainApp", "back to " + (this.panels?.current || ""));
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

  private buildPage(id: string): Node {
    if (id === "mainline") return this.mountMainline();
    if (id === "idle") return this.mountIdle();
    if (id === "hero") return this.mountHeroList();
    if (id === "hero-detail") return this.mountHeroDetail();
    if (id === "summon") return this.mountSummon();
    if (id === "plays") return this.buildPlays();
    if (id === "log") return this.buildLog();
    const entry = findNavEntry(id);
    if (entry && entry.id === "bag") return this.buildBag(entry);
    return this.buildPlaceholder(entry, id);
  }

  private buildCity(): Node {
    const page = this.pageRoot("CityPage");
    place(createLabel("主城", 48, { color: TITLE_COLOR }), page, 0, 400);
    this.mainButton = place(
      createButton(this.stageButtonText(), () => this.openMainline(), 420, 76),
      page,
      0,
      280
    );
    place(createButton("挂机", () => this.openIdle(), 420, 64, IDLE_FILL), page, 0, 185);
    place(createButton("日志", () => this.openChild("log"), 140, 48), page, -180, 95);
    place(
      createButton("公告", () => {
        GameLog.shared.info("MainApp", "click notice");
        this.shell?.enqueuePopup("notice", this.buildPopup("公告", "弹窗队列 1/2"));
        this.shell?.enqueuePopup("notice-next", this.buildPopup("后续", "关闭上一张后出现"));
        this.shell?.showToast("公告已入队");
      }, 140, 48),
      page,
      0,
      95
    );
    place(
      createButton("模拟断线", () => {
        GameLog.shared.info("MainApp", "click net-drop");
        NetClient.shared.simulateDrop();
        this.shell?.showToast("已模拟断线");
      }, 160, 48),
      page,
      190,
      95
    );
    place(createLabel("主城场景占位", 26, { color: MUTED }), page, 0, -20);
    place(createLabel("系统从底栏进入。带「锁」的点开会提示条件", 18, { color: MUTED, width: 640 }), page, 0, -70);

    this.gateNode = place(
      createLabel(this.gateText(), 20, { color: GATE_COLOR, width: 680, height: 72 }),
      page,
      0,
      -300
    );
    const netNode = createLabel("网络 " + NetClient.shared.state, 20, {
      color: new Color(160, 180, 210, 255),
      width: 680,
    });
    place(netNode, page, 0, -390);
    NetClient.shared.onState((state) => {
      if (!this.isValid) return;
      if (netNode.isValid) setText(netNode, "网络 " + state);
      // 放弃重连时会先经过 reconnecting，再进 connecting，最后 closed。
      // 主城「断开提示」是从 connected 直接到 closed，Toast 由按钮自己发。
      if (state === "closed" && (this.netState === "reconnecting" || this.netState === "connecting")) {
        this.shell?.showToast(errorText(ErrorCode.NET_CLOSED), 2200);
      }
      this.netState = state;
    });
    return page;
  }

  private buildPlays(): Node {
    const page = this.pageRoot("PlaysPage");
    place(createLabel("玩法", 40, { color: TITLE_COLOR }), page, 0, 460);
    place(createLabel("未开启的仍列在这里", 18, { color: MUTED }), page, 0, 410);
    const top = 340;
    const step = 52;
    for (let i = 0; i < PLAY_ENTRIES.length; i++) {
      const entry = PLAY_ENTRIES[i];
      const access = entryAccess(entry, this.level(), this.day(), ConfigDb.current);
      const button = createButton(
        tabLabel(entry.title, access.open),
        () => this.openChild(entry.id),
        520,
        44,
        access.open ? OPEN_FILL : LOCKED_FILL,
        22
      );
      place(button, page, 0, top - i * step);
    }
    place(createButton("返回", () => this.back(), 220, 48), page, 0, -220);
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

  private buildBag(entry: NavEntry): Node {
    const page = this.pageRoot("BagPage");
    place(createLabel("背包（占位）", 40, { color: TITLE_COLOR }), page, 0, 80);
    place(createLabel(entry.blurb, 22, { color: MUTED }), page, 0, 20);
    place(createButton("返回", () => this.back(), 220, 52), page, 0, -60);
    return page;
  }

  private refreshChrome(): void {
    const chrome = this.chrome;
    if (!chrome) return;
    chrome.setIdentity(formatNameLine(), formatSubLine());
    chrome.setCurrencies(formatGoldLine(), formatDiamondLine());
    const root = this.panels?.rootTab || CITY_TAB;
    const tabs: TabState[] = [];
    for (let i = 0; i < BOTTOM_TABS.length; i++) {
      const tab = BOTTOM_TABS[i];
      const access = entryAccess(tab, this.level(), this.day(), ConfigDb.current);
      const state = !access.open ? "locked" : tab.id === root ? "selected" : "open";
      tabs.push({ id: tab.id, text: tabLabel(tab.title, access.open), state });
    }
    chrome.setTabs(tabs);
  }

  private refreshHub(): void {
    if (this.gateNode && this.gateNode.isValid) setText(this.gateNode, this.gateText());
    this.setMainButton(this.stageButtonText());
    this.refreshChrome();
  }

  /** 打开关卡列表。战斗和结算在 MainlinePage 里，不改场景。 */
  private openMainline(): void {
    GameLog.shared.info("MainApp", "click mainline");
    const net = NetClient.shared;
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.openChild("mainline");
  }

  /** 底栏「英雄」「召唤」没连上时不进页面。详情和召唤结果走页面栈。 */
  private ensureNet(): boolean {
    if (NetClient.shared.state === "connected") return true;
    this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
    return false;
  }

  private mountHeroList(): Node {
    this.heroList?.dispose();
    const page = buildHeroList({
      showToast: (text) => this.shell?.showToast(text, 2200),
      alive: () => this.isValid,
      list: () => Proto.heroList({}, NetClient.shared),
      openHero: (heroId) => {
        this.selectedHeroId = heroId;
        this.openChild("hero-detail");
      },
      close: () => this.back(),
    });
    this.heroList = page;
    return page.node;
  }

  private mountHeroDetail(): Node {
    this.heroDetail?.dispose();
    const page = buildHeroDetail({
      heroId: () => this.selectedHeroId,
      showToast: (text) => this.shell?.showToast(text, 2200),
      alive: () => this.isValid,
      list: () => Proto.heroList({}, NetClient.shared),
      upgrade: (heroId) => Proto.heroUpgrade({ heroId }, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
        this.heroList?.reload();
      },
      close: () => this.back(),
    });
    this.heroDetail = page;
    return page.node;
  }

  private mountSummon(): Node {
    this.summon?.dispose();
    const page = buildSummonPage({
      diamond: () => Session.diamond,
      showToast: (text) => this.shell?.showToast(text, 2200),
      alive: () => this.isValid,
      pull: (count) => Proto.summonPull({ count }, NetClient.shared),
      onProgress: () => {
        if (!this.isValid) return;
        this.refreshChrome();
      },
      close: () => this.back(),
    });
    this.summon = page;
    return page.node;
  }

  /** 挂机随时可进。时长和领取在 IdlePage 里，不改场景。 */
  private openIdle(): void {
    GameLog.shared.info("MainApp", "click idle");
    const net = NetClient.shared;
    if (net.state !== "connected") {
      this.shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.openChild("idle");
  }

  private mountIdle(): Node {
    this.idle?.dispose();
    const page = buildIdlePage({
      stageId: () => (Session.stageId >= 1 ? Session.stageId : 1),
      showToast: (text) => this.shell?.showToast(text, 2400),
      alive: () => this.isValid,
      query: () => Proto.idleQuery({}, NetClient.shared),
      claim: () => Proto.idleClaim({}, NetClient.shared),
      enter: (stageId) => Proto.stageEnter({ stageId }, NetClient.shared),
      settle: (req) => Proto.stageResult(req, NetClient.shared),
      onProgress: () => {
        if (this.isValid) this.refreshHub();
      },
      close: () => this.back(),
    });
    this.idle = page;
    return page.node;
  }

  private mountMainline(): Node {
    this.mainline?.dispose();
    const page = buildMainlinePage({
      level: () => this.level(),
      roleName: () => Session.role?.name || "勇者",
      stageId: () => (Session.stageId >= 1 ? Session.stageId : 1),
      showToast: (text) => this.shell?.showToast(text, 2200),
      alive: () => this.isValid,
      enter: (stageId) => Proto.stageEnter({ stageId }, NetClient.shared),
      settle: (req) => Proto.stageResult(req, NetClient.shared),
      onProgress: () => {
        if (this.isValid) this.refreshHub();
      },
      close: () => this.back(),
    });
    this.mainline = page;
    return page.node;
  }

  private stageButtonText(): string {
    const stageId = Session.stageId >= 1 ? Session.stageId : 1;
    return "主线 · 第" + stageId + "关";
  }

  private setMainButton(text: string): void {
    const label = this.mainButton?.getChildByName("Label");
    if (label) setText(label, text);
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
    NetClient.shared.close();
    const text = errorText(ErrorCode.NET_CLOSED);
    GameLog.shared.error("MainApp", text);
    this.shell?.showToast(text, 2200);
  }

  private gateText(): string {
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
