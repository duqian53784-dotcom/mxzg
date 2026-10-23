/**
 * Boot 启动流（B1）。
 *
 * 阶段：version → hot-update 占位 → 读表 → 登录门（或跳过）→ Main。
 * 登录是本组件在 Canvas 上生成的面板，不另建 Login 场景。
 * 默认 USE_P1_LOGIN_PREFAB 挂 1:1 的 UserLoginLayer（选服、公告、语言、错误壳）。
 * 改成 false 仍走 USE_LOGIN_PREFAB / buildLoginPanel。创角仍是 USE_CREATE_ROLE_PREFAB。
 * 这两套关掉后仍走 buildLoginPanel / buildCreateRolePanel，代码 UI 不删。
 * 账号走 Proto.login / Proto.roleEnter；没有角色或点「创角」时再 Proto.roleCreate。
 * 默认仍是 NetClient → MockTransport，不需要服务器。
 * 预览地址加 ?transport=ws 才连本机桥 ws://127.0.0.1:13111/game（转到 TCP 9902）。
 * 打开后发心跳 1004，点登录再发 1001。s2c 1001 有角色就进同一套主城壳。
 * 空回包仍走创角 1002，再发一次 1001。金币钻石不从 Mock 填。
 * 连不上会提示检查 start-local-all.bat（或分拆的启服 / 桥脚本），并可改走 Mock。
 *
 * Creator 里怎么挂（仓库不改 .scene，避免脚本 uuid 对不上）：
 * 1. 用 Creator 3.8.8 打开 client 工程
 * 2. 打开 assets/scenes/Boot.scene
 * 3. 层级管理器选中 Canvas（不要挂到 Camera）
 * 4. 属性检查器 → 添加组件 → 自定义脚本 → Boot
 * 5. 保存场景。项目启动场景保持 Boot，再点预览
 * 6. 控制台应出现 [Boot] stage=version / hot-update / config / login
 * 7. 选服后点「进入游戏」：Mock 登录成功后 director.loadScene("Main")
 *    地址带 ?transport=ws 时连本机桥 13111/game，发心跳 1004，点登录发 1001。有角色则进主城
 *    账号不是 mock、或点「创角」时先出创角面板（Proto.roleCreate）
 *    Main 场景可以是空的。若 Canvas 上没有 MainApp，这里会补挂
 * 8. 勾选 skipLogin 可跳过面板，仍用检查器里的账号进 Main
 *
 * 只预览 Main 时：给 Main 的 Canvas 手动挂 MainApp。
 * 安全区：启动和窗口变化时，登录面板挂在 SafeFrame 上，按可见区域缩进。不改场景。
 */
import { _decorator, Component, director, Node, sys, UITransform } from "cc";
import { ConfigDb, ConfigLoader } from "../config/ConfigLoader";
import { listOpenEntries } from "../config/gates";
import { NetClient } from "../net/NetClient";
import { WireSession } from "../net/WireSession";
import { WsTransport } from "../net/WsTransport";
import { WIRE_HEARTBEAT_MS } from "../net/protocol/frame";
import {
  LoginReplySummary,
  summarizeCreateReply,
  summarizeLoginReply,
  uidFromAccount,
  wireBody,
  wireRoleReady,
} from "../net/protocol/wireLogin";
import { NetState } from "../net/NetTypes";
import {
  explainWireTimeout,
  readPreviewTransport,
  TransportChoice,
  WS_CLOSE_STATUS,
  WS_DOWN_LOG,
  WS_DOWN_STATUS,
  WS_MOCK_STATUS,
  WS_OPEN_STATUS,
  WS_OPEN_TOAST,
} from "../net/transportSelect";
import { Proto } from "../net/protocol";
import { RoleEnterResp } from "../net/protocol/types";
import { buildCreateRolePanel, CreateRolePanelView, mountCreateRolePrefab } from "../ui/CreateRolePanel";
import { buildLoginPanel, LoginPanelView, mountLoginPrefab } from "../ui/LoginPanel";
import { mountP1LoginPrefab, USER_LOGIN_PREFAB_PATH } from "../ui/p1Login";
import { CREATE_ROLE_PREFAB_PATH, LOGIN_PREFAB_PATH } from "../ui/prefabLoad";
import { MainApp } from "../ui/MainApp";
import { bindSafeArea, SafeAreaBinding } from "../ui/SafeArea";
import { Toast } from "../ui/Toast";
import { createLabel, place, setText, uiNode } from "../ui/UiKit";
import { ErrorCode, errorText, GameError, messageOf } from "./errors";
import { GameLog } from "./GameLog";
import { browserPrefStore, loadLoginPrefs, PrefStore, resolveAccount, saveLoginPrefs } from "./LoginPrefs";
import { Session } from "./Session";

const { ccclass, property } = _decorator;

const CLIENT_VERSION = "0.1.0-mock";

/**
 * 默认挂 1:1 UserLoginLayer / ChooseServerLayer。
 * false 时仍走 USE_LOGIN_PREFAB，再不行才是 buildLoginPanel。
 */
export const USE_P1_LOGIN_PREFAB = true;

/** 默认挂 Login Prefab。false 时仍走 buildLoginPanel，和接 Prefab 之前一样。 */
export const USE_LOGIN_PREFAB = true;

/** 默认挂 CreateRole Prefab。false 时仍走 buildCreateRolePanel。 */
export const USE_CREATE_ROLE_PREFAB = true;

@ccclass("Boot")
export class Boot extends Component {
  @property
  account = "mock";

  /** 勾选后不显示登录面板，仍走 Mock 登录再进 Main。 */
  @property
  skipLogin = false;

  private started = false;
  private entering = false;
  private canvas: Node | null = null;
  private safeFrame: Node | null = null;
  private safeBinding: SafeAreaBinding | null = null;
  private bootToast: Toast | null = null;
  private toastLayer: Node | null = null;
  private authBusy = false;
  private loginPanel: LoginPanelView | null = null;
  private createPanel: CreateRolePanelView | null = null;
  /** destroyAuthPanels 递增。过期的 Prefab 加载不再挂到画面上。 */
  private authEpoch = 0;
  private alive = true;
  private useWs = false;
  private wsChoice: TransportChoice = readPreviewTransport();
  private wsEpoch = 0;
  private wsLive = false;
  private wsNet: NetClient | null = null;
  private wsStateOff: (() => void) | null = null;
  /** 最近一次点登录时的账号。创角 1002 之后再发 1001 用它，不猜平台 uid。 */
  private wsAccount = "";

  start() {
    if (this.started) return;
    this.started = true;
    void this.runBoot();
  }

  onDestroy() {
    this.alive = false;
    this.wsEpoch += 1;
    if (this.wsStateOff) {
      this.wsStateOff();
      this.wsStateOff = null;
    }
    const net = this.wsNet;
    this.wsNet = null;
    // 进主城时连接交给 WireSession，切场景不能把真服套接字关掉。
    if (net && WireSession.net !== net) net.close();
    if (this.safeBinding) {
      this.safeBinding.dispose();
      this.safeBinding = null;
    }
  }

  private async runBoot(): Promise<void> {
    this.wsChoice = readPreviewTransport();
    this.useWs = this.wsChoice.kind === "ws";
    GameLog.shared.info(
      "Boot",
      this.useWs
        ? "transport=ws " + this.wsChoice.wsUrl + " 真服预览。去掉 ?transport=ws 仍是 Mock"
        : "transport=mock 默认 Mock。真服预览加 ?transport=ws ，桥 ws://127.0.0.1:13111/game"
    );
    const canvas = this.resolveCanvas();
    this.canvas = canvas;
    const frame = this.mountSafeFrame(canvas);
    const status = createLabel("启动中…", 28);
    place(status, frame, 0, 40);

    this.runVersionCheck();
    setText(status, "检查版本…");
    this.runHotUpdatePlaceholder();
    setText(status, "热更占位，已跳过");
    setText(status, "读取配置…");
    await this.loadConfig();
    if (!this.isValid) return;

    if (this.skipLogin && !this.useWs) {
      setText(status, "跳过登录，Mock 进入…");
      try {
        await this.skipIntoMain();
        if (!this.isValid) return;
        status.destroy();
        this.enterMain();
      } catch (err) {
        const text = messageOf(err);
        GameLog.shared.error("Boot", "mock login " + text);
        setText(status, text);
        this.showBootToast(text);
      }
      return;
    }

    status.destroy();
    if (!this.isValid) return;
    this.showLogin(frame);
  }

  private runVersionCheck(): void {
    GameLog.shared.info("Boot", "stage=version " + CLIENT_VERSION);
  }

  /** H5 预览不做远程包。热更留到阶段 F。 */
  private runHotUpdatePlaceholder(): void {
    GameLog.shared.info("Boot", "stage=hot-update skip");
  }

  private async loadConfig(): Promise<void> {
    GameLog.shared.info("Boot", "stage=config");
    try {
      const db = ConfigDb.current ?? (await ConfigLoader.loadAll());
      const open = listOpenEntries(db.opencondition, 1, 1).map((row) => row.id);
      const shown = open.slice(0, 12);
      const more = open.length > shown.length ? " +" + (open.length - shown.length) : "";
      GameLog.shared.info(
        "Boot",
        "config tables=" +
          db.tableCount +
          " rows=" +
          db.rowCount +
          " open@Lv1/D1 " +
          shown.join(",") +
          more
      );
    } catch (err) {
      GameLog.shared.error("Boot", "config load failed " + messageOf(err));
    }
  }

  private showLogin(parent: Node): void {
    this.authBusy = false;
    this.destroyAuthPanels();
    const epoch = this.authEpoch;
    GameLog.shared.info("Boot", "stage=login");
    const stored = loadLoginPrefs(this.prefStore());
    const account = resolveAccount(stored?.account, this.account);
    const serverId = stored?.serverId ?? Session.serverId;
    const options = {
      account,
      serverId,
      mode: this.useWs ? ("ws" as const) : ("mock" as const),
      wsUrl: this.wsChoice.wsUrl,
    };
    const slot: { panel: LoginPanelView | null } = { panel: null };
    const handlers = {
      onEnter: () => {
        const panel = slot.panel;
        if (panel) void this.onLoginClicked(panel, false);
      },
      onCreate: () => {
        const panel = slot.panel;
        if (panel) void this.onLoginClicked(panel, true);
      },
      onMock: () => {
        const panel = slot.panel;
        if (panel) this.onUseMock(panel);
      },
    };
    if (USE_P1_LOGIN_PREFAB) {
      void this.mountP1Login(parent, handlers, options, epoch, slot, account);
      return;
    }
    if (!USE_LOGIN_PREFAB) {
      this.finishLogin(buildLoginPanel(parent, handlers, options), slot, account);
      return;
    }
    void this.mountLoginFromPrefab(parent, handlers, options, epoch, slot, account);
  }

  private async mountP1Login(
    parent: Node,
    handlers: { onEnter: () => void; onCreate: () => void; onMock?: () => void },
    options: { account: string; serverId: number; mode: "mock" | "ws"; wsUrl?: string },
    epoch: number,
    slot: { panel: LoginPanelView | null },
    account: string
  ): Promise<void> {
    const loading = createLabel("加载登录界面…", 28);
    place(loading, parent, 0, 40);
    let panel: LoginPanelView | null = null;
    try {
      panel = await mountP1LoginPrefab(parent, handlers, options);
      if (!this.isValid || epoch !== this.authEpoch) {
        panel.root.destroy();
        return;
      }
      GameLog.shared.info("Boot", "login prefab p1 " + USER_LOGIN_PREFAB_PATH);
    } catch (err) {
      if (!this.isValid || epoch !== this.authEpoch) return;
      GameLog.shared.error("Boot", "login prefab p1 " + messageOf(err) + "，改用原来的登录");
      panel = await this.fallbackLogin(parent, handlers, options);
    } finally {
      if (loading.isValid) loading.destroy();
    }
    if (!panel || !this.isValid || epoch !== this.authEpoch) {
      if (panel) panel.root.destroy();
      return;
    }
    this.finishLogin(panel, slot, account);
  }

  /** P1 壳加载失败时，回到原来的 LoginPanel 或代码登录。 */
  private async fallbackLogin(
    parent: Node,
    handlers: { onEnter: () => void; onCreate: () => void; onMock?: () => void },
    options: { account: string; serverId: number; mode: "mock" | "ws"; wsUrl?: string }
  ): Promise<LoginPanelView> {
    if (!USE_LOGIN_PREFAB) return buildLoginPanel(parent, handlers, options);
    try {
      const panel = await mountLoginPrefab(parent, handlers, options);
      GameLog.shared.info("Boot", "login prefab " + LOGIN_PREFAB_PATH);
      return panel;
    } catch (err) {
      GameLog.shared.error("Boot", "login prefab " + messageOf(err) + "，改用代码 UI");
      return buildLoginPanel(parent, handlers, options);
    }
  }

  private finishLogin(
    panel: LoginPanelView,
    slot: { panel: LoginPanelView | null },
    account: string
  ): void {
    slot.panel = panel;
    this.loginPanel = panel;
    if (this.useWs) {
      panel.setStatus("正在连接 " + this.wsChoice.wsUrl);
      panel.setDetail("打开后发心跳 1004");
      void this.probeLocalWs();
      return;
    }
    panel.setStatus("账号 " + account);
  }

  private async mountLoginFromPrefab(
    parent: Node,
    handlers: { onEnter: () => void; onCreate: () => void; onMock?: () => void },
    options: { account: string; serverId: number; mode: "mock" | "ws"; wsUrl?: string },
    epoch: number,
    slot: { panel: LoginPanelView | null },
    account: string
  ): Promise<void> {
    const loading = createLabel("加载登录界面…", 28);
    place(loading, parent, 0, 40);
    let panel: LoginPanelView | null = null;
    try {
      panel = await mountLoginPrefab(parent, handlers, options);
      if (!this.isValid || epoch !== this.authEpoch) {
        panel.root.destroy();
        return;
      }
      GameLog.shared.info("Boot", "login prefab " + LOGIN_PREFAB_PATH);
    } catch (err) {
      if (!this.isValid || epoch !== this.authEpoch) return;
      GameLog.shared.error("Boot", "login prefab " + messageOf(err) + "，改用代码 UI");
      panel = buildLoginPanel(parent, handlers, options);
    } finally {
      if (loading.isValid) loading.destroy();
    }
    if (!panel || !this.isValid || epoch !== this.authEpoch) {
      if (panel) panel.root.destroy();
      return;
    }
    this.finishLogin(panel, slot, account);
  }

  private async onLoginClicked(panel: LoginPanelView, create: boolean): Promise<void> {
    if (this.useWs) {
      await this.onWsAuth(panel, create);
      return;
    }
    await this.onMockLoginClicked(panel, create);
  }

  /** 关掉桥上的套接字，再用原来的 Mock 登录进主城。失败不把预览打崩。 */
  private onUseMock(panel: LoginPanelView): void {
    if (!this.alive || this.entering || this.authBusy) return;
    this.useWs = false;
    this.dropWs();
    GameLog.shared.info("Boot", WS_MOCK_STATUS);
    this.showBootToast(WS_MOCK_STATUS);
    panel.setStatus(WS_MOCK_STATUS);
    panel.setDetail("");
    void this.onMockLoginClicked(panel, false);
  }

  private async probeLocalWs(): Promise<void> {
    if (!this.alive || this.entering || this.authBusy) return;
    this.authBusy = true;
    const panel = this.loginPanel;
    if (panel) panel.setBusy(true);
    const epoch = this.wsEpoch;
    const opened = await this.openWs(epoch);
    if (!this.alive || epoch !== this.wsEpoch || !this.useWs) return;
    if (!opened) return;
    if (this.loginPanel) {
      this.loginPanel.setStatus(WS_OPEN_STATUS);
      this.loginPanel.setDetail("点进入游戏发登录 1001。登录前可以没有 s2c 1004。有角色就进主城。");
      this.loginPanel.setBusy(false);
    }
    this.authBusy = false;
    this.showBootToast(WS_OPEN_TOAST);
  }

  /** 连上后 NetClient 会立刻发一拍心跳 1004，之后每 25 秒一拍。这里不发登录。 */
  private async openWs(epoch: number): Promise<boolean> {
    const url = this.wsChoice.wsUrl;
    const net = this.ensureWsNet();
    const already = net.state === "connected" && net.url === url;
    if (this.loginPanel && !already) {
      this.loginPanel.setStatus("正在连接 " + url);
      this.loginPanel.setDetail("请稍候");
    }
    try {
      if (!already) await net.connect(url);
    } catch (err) {
      if (!this.alive || epoch !== this.wsEpoch) return false;
      GameLog.shared.error("Boot", "WebSocket 连接失败 " + messageOf(err) + "。" + WS_DOWN_LOG);
      if (this.loginPanel) {
        this.loginPanel.setStatus(WS_DOWN_STATUS);
        this.loginPanel.setDetail("可改走 Mock 继续预览");
        this.loginPanel.setBusy(false);
      }
      this.authBusy = false;
      this.showBootToast(WS_DOWN_STATUS);
      return false;
    }
    if (!this.alive || epoch !== this.wsEpoch) return false;
    this.wsLive = true;
    // 登录回包可能和 2001、3007 粘在同一条消息里。先听着，进主城再写。
    WireSession.watch(net);
    return true;
  }

  private async onWsAuth(panel: LoginPanelView, create: boolean): Promise<void> {
    if (!this.alive || this.entering || this.authBusy) return;
    this.authBusy = true;
    panel.setBusy(true);
    const epoch = this.wsEpoch;
    const opened = await this.openWs(epoch);
    if (!this.alive || epoch !== this.wsEpoch || !this.useWs) return;
    if (!opened) return;
    const account = resolveAccount(panel.account(), this.account);
    const serverId = panel.serverId();
    this.wsAccount = account;
    this.remember(account, serverId);
    const uid = uidFromAccount(account);
    if (uid === null) {
      GameLog.shared.warn(
        "Ws",
        "账号「" + account + "」不是平台 uid，1001 不写字段2。日志两例是 111 和 960011。没有接平台登录。"
      );
    }
    GameLog.shared.info("Ws", "选服 " + serverId + " 不写入登录包。两例 1001 的字段1都是 7、字段3都是 2。");
    panel.setStatus("正在发送登录 1001");
    panel.setDetail(uid === null ? "字段2未写，看回包" : "uid " + uid);
    const nowSec = Math.floor(Date.now() / 1000);
    let body: Uint8Array;
    try {
      const msg = await this.ensureWsNet().request("login", { account, nowSec }, 5000);
      body = wireBody(msg.data);
    } catch (err) {
      if (!this.alive || epoch !== this.wsEpoch || !this.useWs) return;
      const kind = wireTimeoutKind(err);
      const text = kind ? kind + " 请求超时" : messageOf(err);
      if (kind) {
        const detail = this.noteWsTimeout(kind);
        if (this.loginPanel) {
          this.loginPanel.setStatus(text);
          this.loginPanel.setDetail(detail);
          this.loginPanel.setBusy(false);
        }
      } else {
        GameLog.shared.error("Boot", "登录 1001 " + text);
        if (this.loginPanel) {
          this.loginPanel.setStatus(text);
          this.loginPanel.setDetail("可再点一次，或改走 Mock");
          this.loginPanel.setBusy(false);
        }
      }
      this.authBusy = false;
      this.showBootToast(text);
      return;
    }
    if (!this.alive || epoch !== this.wsEpoch || !this.useWs) return;
    const summary = summarizeLoginReply(body);
    GameLog.shared.info("Boot", summary.status + " " + summary.detail);
    if (wireRoleReady(summary) && summary.roleId !== null) {
      if (create) GameLog.shared.info("Boot", "已有角色，未发创角 1002");
      this.enterWireCity(account, serverId, summary.roleId, null, summary);
      return;
    }
    if (create && summary.empty) {
      const parent = panel.root.parent;
      setTimeout(() => {
        if (!this.alive || epoch !== this.wsEpoch || !this.useWs) return;
        this.destroyAuthPanels();
        if (parent && parent.isValid) this.showCreate(parent, account, false, true);
        else this.authBusy = false;
      }, 0);
      return;
    }
    if (this.loginPanel) {
      const extra = create && !summary.empty ? "已有回包，未发创角 1002。" : "";
      this.loginPanel.setStatus(summary.status);
      this.loginPanel.setDetail(extra + summary.detail);
      this.loginPanel.setBusy(false);
    }
    this.authBusy = false;
    this.showBootToast(summary.status);
  }

  private ensureWsNet(): NetClient {
    if (this.wsNet) return this.wsNet;
    const transport = new WsTransport({ connectTimeoutMs: 5000 });
    const net = new NetClient(transport, {
      heartbeatMs: WIRE_HEARTBEAT_MS,
      reconnectDelayMs: 800,
      maxReconnect: 0,
      requestTimeoutMs: 5000,
    });
    this.wsStateOff = net.onState((state) => this.onWsState(state));
    this.wsNet = net;
    return net;
  }

  private onWsState(state: NetState): void {
    if (!this.alive || !this.useWs) return;
    const panel = this.loginPanel;
    if (state === "connecting") {
      if (panel) panel.setStatus("正在连接 " + this.wsChoice.wsUrl);
      return;
    }
    if (state === "reconnecting") {
      GameLog.shared.info("Ws", "正在重连");
      if (panel) panel.setStatus("正在重连…");
      this.showBootToast("正在重连");
      return;
    }
    if (state === "closed" && this.wsLive) {
      this.wsLive = false;
      GameLog.shared.warn("Boot", WS_CLOSE_STATUS);
      if (panel) {
        panel.setStatus(WS_CLOSE_STATUS);
        panel.setDetail("可点进入游戏重试，或改走 Mock");
        panel.setBusy(false);
      }
      this.authBusy = false;
      this.showBootToast(WS_CLOSE_STATUS);
    }
  }

  private async onMockLoginClicked(panel: LoginPanelView, create: boolean): Promise<void> {
    if (this.entering || this.authBusy) return;
    this.authBusy = true;
    panel.setBusy(true);
    panel.setStatus("连接 Mock…");
    const account = resolveAccount(panel.account(), this.account);
    const serverId = panel.serverId();
    try {
      const role = await this.loginAccount(account, serverId);
      if (!this.isValid) return;
      this.remember(account, serverId);
      if (create || !role.hasRole) {
        const parent = panel.root.parent;
        const hadRole = role.hasRole;
        // 等这次点击结束再拆掉面板，避免销毁当前按钮。
        setTimeout(() => {
          if (!this.isValid) return;
          this.destroyAuthPanels();
          if (parent && parent.isValid) this.showCreate(parent, account, hadRole);
          else this.authBusy = false;
        }, 0);
        return;
      }
      this.applyEntered(role);
      panel.setStatus("进入主城…");
      this.logEntered("mock login ok");
      this.enterMain();
    } catch (err) {
      const text = messageOf(err);
      GameLog.shared.error("Boot", "mock login " + text);
      if (!this.isValid) return;
      panel.setStatus(text);
      panel.setBusy(false);
      this.authBusy = false;
      this.showBootToast(text);
    }
  }

  /** 不显示面板。检查器账号优先；没有角色时用账号名自动创角，避免预览停在创角。 */
  private async skipIntoMain(): Promise<void> {
    const stored = loadLoginPrefs(this.prefStore());
    const account = resolveAccount(this.account, stored?.account);
    const serverId = stored?.serverId ?? Session.serverId;
    const role = await this.loginAccount(account, serverId);
    this.remember(account, serverId);
    if (role.hasRole) {
      this.applyEntered(role);
      this.logEntered("mock login ok");
      return;
    }
    GameLog.shared.info("Boot", "skipLogin create " + account);
    const net = NetClient.shared;
    const created = await Proto.roleCreate({ account, name: account }, net);
    if (!created.ok) throw new GameError(created.code ?? ErrorCode.ROLE_NAME_EMPTY, "role.create");
    const again = await Proto.roleEnter({ account }, net);
    if (!again.ok || !again.hasRole) throw new GameError(again.code ?? ErrorCode.ROLE_ENTER_FAILED, "role.enter");
    this.applyEntered(again);
    this.logEntered("mock login ok");
  }

  private showCreate(parent: Node, account: string, hadRole: boolean, wire = false): void {
    this.authBusy = false;
    const epoch = this.authEpoch;
    GameLog.shared.info("Boot", "stage=create account=" + account + " server=" + Session.serverName);
    const options = {
      account,
      serverName: Session.serverName,
      hadRole,
      hint: wire ? "登录 1001 回包是空的。确认后发创角 1002，再发一次 1001。有角色才进主城。" : undefined,
    };
    const slot: { panel: CreateRolePanelView | null } = { panel: null };
    const handlers = {
      onConfirm: () => {
        const panel = slot.panel;
        if (panel) void this.onCreateConfirmed(panel);
      },
      onBack: () => {
        if (this.authBusy) return;
        this.authBusy = true;
        setTimeout(() => {
          if (!this.isValid) return;
          this.showLogin(parent);
        }, 0);
      },
    };
    if (!USE_CREATE_ROLE_PREFAB) {
      const panel = buildCreateRolePanel(parent, handlers, options);
      slot.panel = panel;
      this.createPanel = panel;
      return;
    }
    void this.mountCreateFromPrefab(parent, handlers, options, epoch, slot);
  }

  private async mountCreateFromPrefab(
    parent: Node,
    handlers: { onConfirm: () => void; onBack: () => void },
    options: { account: string; serverName: string; hadRole: boolean; hint?: string },
    epoch: number,
    slot: { panel: CreateRolePanelView | null }
  ): Promise<void> {
    const loading = createLabel("加载创角界面…", 28);
    place(loading, parent, 0, 40);
    let panel: CreateRolePanelView | null = null;
    try {
      panel = await mountCreateRolePrefab(parent, handlers, options);
      if (!this.isValid || epoch !== this.authEpoch) {
        panel.root.destroy();
        return;
      }
      GameLog.shared.info("Boot", "create prefab " + CREATE_ROLE_PREFAB_PATH);
    } catch (err) {
      if (!this.isValid || epoch !== this.authEpoch) return;
      GameLog.shared.error("Boot", "create prefab " + messageOf(err) + "，改用代码 UI");
      panel = buildCreateRolePanel(parent, handlers, options);
    } finally {
      if (loading.isValid) loading.destroy();
    }
    if (!panel || !this.isValid || epoch !== this.authEpoch) {
      if (panel) panel.root.destroy();
      return;
    }
    slot.panel = panel;
    this.createPanel = panel;
  }

  private async onCreateConfirmed(panel: CreateRolePanelView): Promise<void> {
    if (this.useWs) {
      await this.onWsCreateConfirmed(panel);
      return;
    }
    if (this.entering || this.authBusy) return;
    this.authBusy = true;
    panel.setBusy(true);
    panel.setStatus("创建角色…");
    try {
      const net = NetClient.shared;
      const resp = await Proto.roleCreate({ account: Session.account, name: panel.name() }, net);
      if (!this.isValid) return;
      if (!resp.ok) {
        const text = errorText(resp.code ?? ErrorCode.ROLE_NAME_EMPTY);
        panel.setStatus(text);
        panel.setBusy(false);
        this.authBusy = false;
        this.showBootToast(text);
        return;
      }
      const role = await Proto.roleEnter({ account: Session.account }, net);
      if (!role.ok || !role.hasRole) throw new GameError(role.code ?? ErrorCode.ROLE_ENTER_FAILED, "role.enter");
      this.applyEntered(role);
      panel.setStatus("进入主城…");
      this.logEntered("create ok");
      this.enterMain();
    } catch (err) {
      const text = messageOf(err);
      GameLog.shared.error("Boot", "create " + text);
      if (!this.isValid) return;
      panel.setStatus(text);
      panel.setBusy(false);
      this.authBusy = false;
      this.showBootToast(text);
    }
  }

  private async onWsCreateConfirmed(panel: CreateRolePanelView): Promise<void> {
    if (!this.alive || this.entering || this.authBusy) return;
    const name = panel.name().trim();
    if (!name) {
      panel.setStatus("角色名不能为空");
      this.showBootToast("角色名不能为空");
      return;
    }
    const net = this.ensureWsNet();
    if (net.state !== "connected") {
      panel.setStatus(WS_CLOSE_STATUS);
      this.showBootToast(WS_CLOSE_STATUS);
      return;
    }
    this.authBusy = true;
    panel.setBusy(true);
    const epoch = this.wsEpoch;
    panel.setStatus("正在发送创角 1002");
    try {
      const createdMsg = await net.request("role.create", { name }, 5000);
      if (!this.alive || epoch !== this.wsEpoch || !this.useWs) return;
      const created = summarizeCreateReply(wireBody(createdMsg.data));
      GameLog.shared.info("Boot", created.status);
      const againMsg = await net.request("login", { account: this.wsAccount, nowSec: Math.floor(Date.now() / 1000) }, 5000);
      if (!this.alive || epoch !== this.wsEpoch || !this.useWs) return;
      const again = summarizeLoginReply(wireBody(againMsg.data));
      GameLog.shared.info("Boot", "创角后 " + again.status + " " + again.detail);
      if (wireRoleReady(again) && again.roleId !== null) {
        this.enterWireCity(this.wsAccount, Session.serverId, again.roleId, name, again);
        return;
      }
      panel.setStatus(again.status);
      panel.setBusy(false);
      this.authBusy = false;
      this.showBootToast(again.status);
    } catch (err) {
      if (!this.alive || epoch !== this.wsEpoch || !this.useWs) return;
      const kind = wireTimeoutKind(err);
      const text = kind ? kind + " 请求超时" : messageOf(err);
      if (kind) {
        panel.setStatus(text);
        this.noteWsTimeout(kind);
      } else {
        GameLog.shared.error("Boot", "创角 1002 " + text);
        panel.setStatus(text);
      }
      panel.setBusy(false);
      this.authBusy = false;
      this.showBootToast(text);
    }
  }

  /** 超时把最近的 Ws 行写进 GameLog，面板只留一行标志。返回这行标志。 */
  private noteWsTimeout(kind: string): string {
    const messages: string[] = [];
    const recent = GameLog.shared.recent();
    for (let i = 0; i < recent.length; i++) {
      if (recent[i].tag === "Ws") messages.push(recent[i].message);
    }
    const report = explainWireTimeout(messages);
    GameLog.shared.error("Boot", kind + " 请求超时。" + report.summary);
    for (let i = 0; i < report.tail.length; i++) {
      GameLog.shared.warn("Boot", "超时前 " + report.tail[i]);
    }
    return report.detail;
  }

  private async loginAccount(account: string, serverId: number): Promise<RoleEnterResp> {
    GameLog.shared.info("Boot", "stage=login account=" + account + " server=" + serverId);
    const net = NetClient.shared;
    if (net.state !== "connected") {
      await net.connect("mock://local");
    }
    Session.setServer(serverId);
    const login = await Proto.login({ account, serverId: Session.serverId }, net);
    if (!login.ok) throw new GameError(login.code ?? ErrorCode.LOGIN_FAILED, "login");
    Session.account = account;
    Session.token = login.token;
    if (typeof login.serverId === "number") Session.setServer(login.serverId);
    const role = await Proto.roleEnter({ account }, net);
    if (!role.ok) throw new GameError(role.code ?? ErrorCode.ROLE_ENTER_FAILED, "role.enter");
    return role;
  }

  private applyEntered(role: RoleEnterResp): void {
    Session.applyEnter(role);
  }

  /** 真服有角色：只记角色 id（创角时加上刚填的名字），然后走和 Mock 一样的进主城。 */
  private enterWireCity(
    account: string,
    serverId: number,
    roleId: number,
    name: string | null,
    summary: LoginReplySummary
  ): void {
    Session.applyWireRole({ account, serverId, roleId, name });
    if (this.wsNet) {
      WireSession.hold(this.wsNet);
      WireSession.prepareCity();
      WireSession.flush();
      WireSession.pullRoleProfile();
      WireSession.pullChapter();
      WireSession.pullIdle();
    }
    if (this.loginPanel) {
      this.loginPanel.setStatus("进入主城…");
      this.loginPanel.setDetail(summary.detail);
      this.loginPanel.setBusy(false);
    }
    if (this.createPanel) {
      this.createPanel.setStatus("进入主城…");
      this.createPanel.setBusy(false);
    }
    this.showBootToast(summary.status);
    this.logEntered("wire login ok");
    this.authBusy = false;
    this.enterMain();
  }

  /** 改走 Mock 时关掉桥。进主城后的连接在 WireSession 里，这里也放下。 */
  private dropWs(): void {
    this.wsEpoch += 1;
    this.wsLive = false;
    const net = this.wsNet;
    this.wsNet = null;
    WireSession.release(net);
    if (net) net.close();
    else WireSession.close();
  }

  private logEntered(prefix: string): void {
    const name = Session.role ? Session.role.name : "";
    GameLog.shared.info(
      "Boot",
      prefix + " " + Session.account + " " + name + " " + Session.serverName + " stage " + Session.stageId
    );
  }

  private remember(account: string, serverId: number): void {
    saveLoginPrefs({ account, serverId }, this.prefStore());
  }

  private prefStore(): PrefStore | null {
    try {
      const local = sys.localStorage as PrefStore | null | undefined;
      if (local && typeof local.getItem === "function" && typeof local.setItem === "function") return local;
    } catch (_err) {
      // 再用浏览器 localStorage。
    }
    return browserPrefStore();
  }

  private destroyAuthPanels(): void {
    this.authEpoch += 1;
    if (this.loginPanel) {
      this.loginPanel.root.destroy();
      this.loginPanel = null;
    }
    if (this.createPanel) {
      this.createPanel.root.destroy();
      this.createPanel = null;
    }
  }

  private showBootToast(text: string): void {
    const parent = this.toastParent();
    if (!parent || !this.isValid) return;
    if (!this.bootToast || !this.toastLayer || !this.toastLayer.isValid) {
      const layer = uiNode("BootToast");
      const ui = layer.addComponent(UITransform);
      ui.setContentSize(2000, 2000);
      layer.parent = parent;
      this.toastLayer = layer;
      this.bootToast = new Toast(layer);
    }
    if (this.toastLayer.parent === parent) {
      this.toastLayer.setSiblingIndex(Math.max(0, parent.children.length - 1));
    }
    this.bootToast.show(text, 2200);
  }

  private mountSafeFrame(canvas: Node): Node {
    const frame = uiNode("SafeFrame");
    const ui = frame.addComponent(UITransform);
    ui.setContentSize(2000, 2000);
    frame.parent = canvas;
    this.safeFrame = frame;
    this.safeBinding = bindSafeArea({
      canvas,
      targets: [{ node: frame }],
    });
    return frame;
  }

  private toastParent(): Node | null {
    if (this.safeFrame && this.safeFrame.isValid) return this.safeFrame;
    if (this.canvas && this.canvas.isValid) return this.canvas;
    return null;
  }

  private enterMain(): void {
    if (this.entering) return;
    this.entering = true;
    GameLog.shared.info("Boot", "stage=enter-main");
    director.loadScene("Main", (err, scene) => {
      if (err || !scene) {
        GameLog.shared.error("Boot", "loadScene Main failed " + messageOf(err));
        this.entering = false;
        return;
      }
      const canvas = scene.getChildByName("Canvas");
      if (!canvas) {
        GameLog.shared.error("Boot", "Main scene has no Canvas");
        return;
      }
      if (!canvas.getComponent(MainApp)) {
        canvas.addComponent(MainApp);
      }
      GameLog.shared.info("Boot", "Main ready");
    });
  }

  private resolveCanvas(): Node {
    if (this.node.name === "Canvas") return this.node;
    const child = this.node.getChildByName("Canvas");
    if (child) return child;
    const fromScene = this.node.scene?.getChildByName("Canvas");
    if (fromScene) return fromScene;
    GameLog.shared.warn("Boot", "Canvas not found, parent UI on " + this.node.name);
    return this.node;
  }
}

/** NetClient 把 cmd 放在 GameError.detail。只有超时才换成长说明。 */
function wireTimeoutKind(err: unknown): string | null {
  if (!(err instanceof GameError) || err.code !== ErrorCode.NET_TIMEOUT) return null;
  if (err.detail === "role.create") return "创角 1002";
  if (err.detail === "login") return "登录 1001";
  return "请求";
}
