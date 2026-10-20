/**
 * Boot 启动流（B1）。
 *
 * 阶段：version → hot-update 占位 → 读表 → 登录门（或跳过）→ Main。
 * 登录是本组件在 Canvas 上生成的面板，不另建 Login 场景。
 * 账号走 Proto.login / Proto.roleEnter → NetClient → MockTransport，不需要服务器。
 *
 * Creator 里怎么挂（仓库不改 .scene，避免脚本 uuid 对不上）：
 * 1. 用 Creator 3.8.8 打开 client 工程
 * 2. 打开 assets/scenes/Boot.scene
 * 3. 层级管理器选中 Canvas（不要挂到 Camera）
 * 4. 属性检查器 → 添加组件 → 自定义脚本 → Boot
 * 5. 保存场景。项目启动场景保持 Boot，再点预览
 * 6. 控制台应出现 [Boot] stage=version / hot-update / config / login
 * 7. 点「进入游戏」：Mock 登录成功后 director.loadScene("Main")
 *    Main 场景可以是空的。若 Canvas 上没有 MainApp，这里会补挂
 * 8. 勾选 skipLogin 可跳过面板，仍用 Mock 账号进 Main
 *
 * 只预览 Main 时：给 Main 的 Canvas 手动挂 MainApp。
 */
import { _decorator, Component, director, Node, UITransform } from "cc";
import { ConfigDb, ConfigLoader } from "../config/ConfigLoader";
import { listOpenEntries } from "../config/gates";
import { NetClient } from "../net/NetClient";
import { Proto } from "../net/protocol";
import { buildLoginPanel, LoginPanelView } from "../ui/LoginPanel";
import { MainApp } from "../ui/MainApp";
import { Toast } from "../ui/Toast";
import { createLabel, place, setText, uiNode } from "../ui/UiKit";
import { ErrorCode, GameError, messageOf } from "./errors";
import { GameLog } from "./GameLog";
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
  private bootToast: Toast | null = null;

  start() {
    if (this.started) return;
    this.started = true;
    void this.runBoot();
  }

  private async runBoot(): Promise<void> {
    const canvas = this.resolveCanvas();
    this.canvas = canvas;
    const status = createLabel("启动中…", 28);
    place(status, canvas, 0, 40);

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
        await this.mockLogin(this.account || "mock");
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
    this.showLogin(canvas);
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

  private showLogin(canvas: Node): void {
    GameLog.shared.info("Boot", "stage=login");
    const panel = buildLoginPanel(canvas, () => {
      void this.onEnterClicked(panel);
    });
    panel.setStatus("账号 " + (this.account || "mock"));
  }

  private async onEnterClicked(panel: LoginPanelView): Promise<void> {
    if (this.entering) return;
    panel.setBusy(true);
    panel.setStatus("连接 Mock…");
    try {
      await this.mockLogin(this.account || "mock");
      if (!this.isValid) return;
      panel.setStatus("进入主城…");
      this.enterMain();
    } catch (err) {
      const text = messageOf(err);
      GameLog.shared.error("Boot", "mock login " + text);
      panel.setStatus(text);
      panel.setBusy(false);
      this.showBootToast(text);
    }
  }

  private async mockLogin(account: string): Promise<void> {
    GameLog.shared.info("Boot", "stage=login account=" + account);
    const net = NetClient.shared;
    if (net.state !== "connected") {
      await net.connect("mock://local");
    }
    const login = await Proto.login({ account }, net);
    if (!login.ok) throw new GameError(login.code ?? ErrorCode.LOGIN_FAILED, "login");
    Session.account = account;
    Session.token = login.token;
    const role = await Proto.roleEnter({ account }, net);
    if (!role.ok || !role.hasRole) throw new GameError(role.code ?? ErrorCode.ROLE_ENTER_FAILED, "role.enter");
    Session.role = {
      roleId: role.roleId,
      name: role.name,
      level: role.level,
    };
    Session.openDay = typeof role.openDay === "number" && role.openDay >= 1 ? role.openDay : 1;
    Session.stageId = typeof role.stageId === "number" && role.stageId >= 1 ? role.stageId : 1;
    GameLog.shared.info("Boot", "mock login ok " + Session.account + " " + Session.role.name + " stage " + Session.stageId);
  }

  private showBootToast(text: string): void {
    const canvas = this.canvas;
    if (!canvas || !this.isValid) return;
    if (!this.bootToast) {
      const layer = uiNode("BootToast");
      const ui = layer.addComponent(UITransform);
      ui.setContentSize(2000, 2000);
      layer.parent = canvas;
      this.bootToast = new Toast(layer);
    }
    this.bootToast.show(text, 2200);
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
