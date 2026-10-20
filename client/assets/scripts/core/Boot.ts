/**
 * Boot 启动流（B1）。
 *
 * 阶段：version → hot-update 占位 → 读表 → 登录门（或跳过）→ Main。
 * 登录是本组件在 Canvas 上生成的面板，不另建 Login 场景。
 * 账号走 Proto.login / Proto.roleEnter；没有角色或点「创角」时再 Proto.roleCreate。
 * 仍是 NetClient → MockTransport，不需要服务器。
 *
 * Creator 里怎么挂（仓库不改 .scene，避免脚本 uuid 对不上）：
 * 1. 用 Creator 3.8.8 打开 client 工程
 * 2. 打开 assets/scenes/Boot.scene
 * 3. 层级管理器选中 Canvas（不要挂到 Camera）
 * 4. 属性检查器 → 添加组件 → 自定义脚本 → Boot
 * 5. 保存场景。项目启动场景保持 Boot，再点预览
 * 6. 控制台应出现 [Boot] stage=version / hot-update / config / login
 * 7. 选服后点「进入游戏」：Mock 登录成功后 director.loadScene("Main")
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

  start() {
    if (this.started) return;
    this.started = true;
    void this.runBoot();
  }

  onDestroy() {
    if (this.safeBinding) {
      this.safeBinding.dispose();
      this.safeBinding = null;
    }
  }

  private async runBoot(): Promise<void> {
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

    if (this.skipLogin) {
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
      },
      { account, serverId }
    );
    this.loginPanel = panel;
    panel.setStatus("账号 " + account);
  }

  private async onLoginClicked(panel: LoginPanelView, create: boolean): Promise<void> {
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

  private showCreate(parent: Node, account: string, hadRole: boolean): void {
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
      { account, serverName: Session.serverName, hadRole }
    );
    this.createPanel = panel;
  }

  private async onCreateConfirmed(panel: CreateRolePanelView): Promise<void> {
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
