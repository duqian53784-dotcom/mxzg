/**
 * Boot 启动流（B1）。
 *
 * 阶段：version → hot-update 占位 → 读表 → 登录门（或跳过）→ Main。
 * 登录是本组件在 Canvas 上生成的面板，不另建 Login 场景。
 * 账号走 Proto.login / Proto.roleEnter；没有角色或点「创角」时再 Proto.roleCreate。
 * 默认仍是 NetClient → MockTransport，不需要服务器。
 * 预览地址加 ?transport=ws 才连 ws://127.0.0.1:13101。打开后发心跳 1004，点登录再发 1001。不进真实主城。
 * 连不上会提示检查 scripts/start-local-server.bat，并可改走 Mock。
 *
 * Creator 里怎么挂（仓库不改 .scene，避免脚本 uuid 对不上）：
 * 1. 用 Creator 3.8.8 打开 client 工程
 * 2. 打开 assets/scenes/Boot.scene
 * 3. 层级管理器选中 Canvas（不要挂到 Camera）
 * 4. 属性检查器 → 添加组件 → 自定义脚本 → Boot
 * 5. 保存场景。项目启动场景保持 Boot，再点预览
 * 6. 控制台应出现 [Boot] stage=version / hot-update / config / login
 * 7. 选服后点「进入游戏」：Mock 登录成功后 director.loadScene("Main")
 *    地址带 ?transport=ws 时连本机 13101，发心跳 1004，点登录发 1001。成功也不进真实主城
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
import { WsTransport } from "../net/WsTransport";
import { WIRE_HEARTBEAT_MS } from "../net/protocol/frame";
import { summarizeCreateReply, summarizeLoginReply, uidFromAccount, wireBody } from "../net/protocol/wireLogin";
import { NetState } from "../net/NetTypes";
import {
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
import { buildCreateRolePanel, CreateRolePanelView } from "../ui/CreateRolePanel";
import { buildLoginPanel, LoginPanelView } from "../ui/LoginPanel";
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
    if (this.wsNet) {
      this.wsNet.close();
      this.wsNet = null;
    }
    if (this.safeBinding) {
      this.safeBinding.dispose();
      this.safeBinding = null;
    }
  }

  private async runBoot(): Promise<void> {
    this.wsChoice = readPreviewTransport();
    this.useWs = this.wsChoice.kind === "ws";
    GameLog.shared.info("Boot", this.useWs ? "transport=ws " + this.wsChoice.wsUrl : "transport=mock");
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
      GameLog.shared.info("Boot", "config open@Lv1/D1 " + open.join(","));
    } catch (err) {
      GameLog.shared.error("Boot", "config load failed " + messageOf(err));
    }
  }

  private showLogin(parent: Node): void {
    this.authBusy = false;
    this.destroyAuthPanels();
    GameLog.shared.info("Boot", "stage=login");
    const stored = loadLoginPrefs(this.prefStore());
    const account = resolveAccount(stored?.account, this.account);
    const serverId = stored?.serverId ?? Session.serverId;
    const panel = buildLoginPanel(
      parent,
      {
        onEnter: () => {
          void this.onLoginClicked(panel, false);
        },
        onCreate: () => {
          void this.onLoginClicked(panel, true);
        },
        onMock: () => {
          this.onUseMock(panel);
        },
      },
      { account, serverId, mode: this.useWs ? "ws" : "mock", wsUrl: this.wsChoice.wsUrl }
    );
    this.loginPanel = panel;
    if (this.useWs) {
      panel.setStatus("正在连接 " + this.wsChoice.wsUrl);
      panel.setDetail("打开后发心跳 1004");
      void this.probeLocalWs();
      return;
    }
    panel.setStatus("账号 " + account);
  }

  private async onLoginClicked(panel: LoginPanelView, create: boolean): Promise<void> {
    if (this.useWs) {
      await this.onWsAuth(panel, create);
      return;
    }
    await this.onMockLoginClicked(panel, create);
  }

  /** 关掉 13101 上的套接字，再用原来的 Mock 登录进主城。失败不把预览打崩。 */
  private onUseMock(panel: LoginPanelView): void {
    if (!this.alive || this.entering || this.authBusy) return;
    this.useWs = false;
    this.wsEpoch += 1;
    this.wsLive = false;
    if (this.wsNet) this.wsNet.close();
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
      this.loginPanel.setDetail("点进入游戏发登录 1001。账号填数字 uid。不进主城。");
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
      const text = messageOf(err);
      GameLog.shared.error("Boot", "登录 1001 " + text);
      if (this.loginPanel) {
        this.loginPanel.setStatus(text);
        this.loginPanel.setDetail("可再点一次，或改走 Mock");
        this.loginPanel.setBusy(false);
      }
      this.authBusy = false;
      this.showBootToast(text);
      return;
    }
    if (!this.alive || epoch !== this.wsEpoch || !this.useWs) return;
    const summary = summarizeLoginReply(body);
    GameLog.shared.info("Boot", summary.status + " " + summary.detail);
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
    GameLog.shared.info("Boot", "stage=create account=" + account + " server=" + Session.serverName);
    const panel = buildCreateRolePanel(
      parent,
      {
        onConfirm: () => {
          void this.onCreateConfirmed(panel);
        },
        onBack: () => {
          if (this.authBusy) return;
          this.authBusy = true;
          setTimeout(() => {
            if (!this.isValid) return;
            this.showLogin(parent);
          }, 0);
        },
      },
      {
        account,
        serverName: Session.serverName,
        hadRole,
        hint: wire ? "登录 1001 回包是空的。确认后只发创角 1002，不进主城。" : undefined,
      }
    );
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
      const status = again.roleId !== null ? "角色 " + again.roleId + " 已在服务器" : again.status;
      panel.setStatus(status);
      panel.setBusy(false);
      this.authBusy = false;
      this.showBootToast("不进主城");
    } catch (err) {
      if (!this.alive || epoch !== this.wsEpoch || !this.useWs) return;
      const text = messageOf(err);
      GameLog.shared.error("Boot", "创角 1002 " + text);
      panel.setStatus(text);
      panel.setBusy(false);
      this.authBusy = false;
      this.showBootToast(text);
    }
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
