/**
 * 主城壳（B2）。Canvas 下用代码生成标题和按钮，不需要美术。
 * 从 Boot 进来时，若场景上没挂本组件，Boot 会 addComponent。
 * 单独预览 Main：把 MainApp 挂到 Main 场景的 Canvas 上。
 * UIShell.mount 会按安全区摆 Page / Toast，窗口变化时再算一次。
 */
import { _decorator, BlockInputEvents, Color, Component, Node, UITransform } from "cc";
import { ConfigDb, ConfigLoader } from "../config/ConfigLoader";
import { listOpenEntries } from "../config/gates";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { formatHubIdentity, Session } from "../core/Session";
import { NetClient } from "../net/NetClient";
import { NetState } from "../net/NetTypes";
import { Proto } from "../net/protocol";
import { UIShell } from "./UIShell";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const { ccclass } = _decorator;

@ccclass("MainApp")
export class MainApp extends Component {
  private shell: UIShell | null = null;
  private built = false;
  private stageBusy = false;
  private accountNode: Node | null = null;
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
    if (this.offLog) {
      this.offLog();
      this.offLog = null;
    }
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
    this.shell.openPage("hub", this.buildHub());
    GameLog.shared.info(
      "MainApp",
      "hub ready account=" +
        (Session.account || "(none)") +
        " role=" +
        (Session.role?.name || "(none)") +
        " server=" +
        (Session.serverName || "(none)")
    );
  }

  private buildHub(): Node {
    const shell = this.shell;
    const page = uiNode("HubPage");
    place(createLabel("主城", 48, { color: new Color(255, 228, 170, 255) }), page, 0, 230);
    this.accountNode = place(
      createLabel(this.accountText(), 22, { color: new Color(190, 205, 225, 255) }),
      page,
      0,
      180
    );

    this.mainButton = this.hubButton(page, this.stageButtonText(), "main_battle", 120, () => {
      void this.playMainStage();
    });
    this.hubButton(page, "召唤", "main_summon", 56, () => shell?.showToast("召唤（占位）"));
    this.hubButton(page, "英雄", "main_hero", -8, () => shell?.showToast("英雄（占位）"));
    this.hubButton(page, "背包", "bag", -72, () => {
      shell?.openPage("bag", this.buildBag());
      shell?.showToast("打开背包");
    });
    this.hubButton(page, "公告", "notice", -136, () => {
      shell?.enqueuePopup("notice", this.buildPopup("公告", "弹窗队列 1/2"));
      shell?.enqueuePopup("notice-next", this.buildPopup("后续", "关闭上一张后出现"));
      shell?.showToast("公告已入队");
    });
    this.hubButton(page, "模拟断线", "net-drop", -200, () => {
      NetClient.shared.simulateDrop();
      shell?.showToast("已模拟断线");
    });
    const logBtn = createButton("日志", () => {
      GameLog.shared.info("MainApp", "click log");
      shell?.openPage("log", this.buildLog());
    }, 120, 44);
    place(logBtn, page, 270, 230);

    this.gateNode = place(
      createLabel(this.gateText(), 20, { color: new Color(170, 190, 170, 255), width: 700 }),
      page,
      0,
      -258
    );

    const netNode = createLabel("网络 " + NetClient.shared.state, 20, {
      color: new Color(160, 180, 210, 255),
      width: 700,
    });
    place(netNode, page, 0, -292);
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

  private hubButton(page: Node, title: string, id: string, y: number, onClick: () => void): Node {
    const button = createButton(title, () => {
      GameLog.shared.info("MainApp", "click " + id);
      onClick();
    }, 300, 52);
    place(button, page, 0, y);
    return button;
  }

  /** 无战斗场景：进关后立刻按胜利结算，进度记在 Mock 会话里。 */
  private async playMainStage(): Promise<void> {
    if (this.stageBusy) return;
    const shell = this.shell;
    const net = NetClient.shared;
    if (net.state !== "connected") {
      shell?.showToast(errorText(ErrorCode.NET_NOT_CONNECTED), 2200);
      return;
    }
    this.stageBusy = true;
    const stageId = Session.stageId >= 1 ? Session.stageId : 1;
    this.setMainButton("主线 · 结算中");
    try {
      const entered = await Proto.stageEnter({ stageId }, net);
      if (!this.isValid) return;
      if (!entered.ok) {
        shell?.showToast(errorText(entered.code ?? ErrorCode.STAGE_ID_INVALID), 2200);
        return;
      }
      GameLog.shared.info("MainApp", "stage enter " + entered.stageId + " " + entered.battleId);
      const result = await Proto.stageResult(
        { stageId: entered.stageId, battleId: entered.battleId, win: true },
        net
      );
      if (!this.isValid) return;
      if (!result.ok) {
        shell?.showToast(errorText(result.code ?? ErrorCode.STAGE_ID_INVALID), 2200);
        return;
      }
      Session.stageId = result.nextStageId >= 1 ? result.nextStageId : stageId + 1;
      if (Session.role && typeof result.level === "number") Session.role.level = result.level;
      if (typeof result.openDay === "number" && result.openDay >= 1) Session.openDay = result.openDay;
      const reward = result.rewards.length > 0 ? result.rewards[0] : null;
      const rewardText = reward ? "奖励 " + reward.count : "无奖励";
      shell?.showToast(
        "第" + result.stageId + "关胜利，下一关 " + Session.stageId + "，" + rewardText,
        2200
      );
      GameLog.shared.info(
        "MainApp",
        "stage result " +
          result.stageId +
          " next " +
          Session.stageId +
          " lv " +
          (Session.role?.level ?? "") +
          " day " +
          Session.openDay
      );
      this.refreshHub();
    } catch (err) {
      const text = messageOf(err);
      GameLog.shared.error("MainApp", "stage " + text);
      if (this.isValid) shell?.showToast(text, 2200);
    } finally {
      this.stageBusy = false;
      if (this.isValid) this.setMainButton(this.stageButtonText());
    }
  }

  private refreshHub(): void {
    if (this.accountNode && this.accountNode.isValid) setText(this.accountNode, this.accountText());
    if (this.gateNode && this.gateNode.isValid) setText(this.gateNode, this.gateText());
    this.setMainButton(this.stageButtonText());
  }

  private accountText(): string {
    return formatHubIdentity();
  }

  private stageButtonText(): string {
    const stageId = Session.stageId >= 1 ? Session.stageId : 1;
    return "主线 · 第" + stageId + "关";
  }

  private setMainButton(text: string): void {
    const label = this.mainButton?.getChildByName("Label");
    if (label) setText(label, text);
  }

  private buildBag(): Node {
    const page = uiNode("BagPage");
    place(createLabel("背包（占位）", 40, { color: new Color(255, 228, 170, 255) }), page, 0, 80);
    place(createLabel("道具列表留到 C7", 22), page, 0, 20);
    const back = createButton("返回", () => {
      GameLog.shared.info("MainApp", "click bag-back");
      this.shell?.closePage();
      this.shell?.showToast("已关闭背包");
    }, 220, 52);
    place(back, page, 0, -60);
    return page;
  }

  private buildPopup(title: string, body: string): Node {
    const root = uiNode("Popup");
    const ui = root.addComponent(UITransform);
    ui.setContentSize(2000, 2000);
    root.addComponent(BlockInputEvents);

    const dim = createRect("dim", 2000, 2000, new Color(0, 0, 0, 140));
    dim.parent = root;
    place(createRect("card", 480, 280, new Color(22, 36, 64, 255)), root, 0, 10);
    place(createLabel(title, 32, { color: new Color(255, 228, 170, 255), width: 440 }), root, 0, 80);
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
    const page = uiNode("LogPage");
    place(createLabel("日志", 40, { color: new Color(255, 228, 170, 255) }), page, 0, 250);
    place(createLabel("最近 10 条，新的在上", 18, { color: new Color(170, 186, 206, 255) }), page, 0, 200);
    place(createRect("log-bg", 700, 320, new Color(10, 18, 32, 230)), page, 0, 20);
    this.logLabel = place(
      createLabel(this.logText(), 16, {
        color: new Color(214, 224, 236, 255),
        width: 680,
        height: 300,
        align: "left",
      }),
      page,
      0,
      20
    );
    if (this.offLog) this.offLog();
    this.offLog = GameLog.shared.subscribe(() => {
      if (this.logLabel && this.logLabel.isValid) setText(this.logLabel, this.logText());
    });
    place(createButton("空名创角", () => void this.tryEmptyCreate(), 200, 48), page, -160, -190);
    place(createButton("断开提示", () => this.toastClosed(), 200, 48), page, 160, -190);
    place(
      createButton("返回", () => {
        GameLog.shared.info("MainApp", "click log-back");
        this.closeLog();
      }, 200, 48),
      page,
      0,
      -260
    );
    return page;
  }

  private logText(): string {
    const lines = GameLog.shared.recent(10);
    if (lines.length === 0) return "（暂无日志）";
    const newestFirst = lines.slice().reverse();
    return newestFirst.map((line) => GameLog.shared.format(line)).join("\n");
  }

  private closeLog(): void {
    if (this.offLog) {
      this.offLog();
      this.offLog = null;
    }
    this.logLabel = null;
    this.shell?.closePage();
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
    const level = Session.role?.level ?? 1;
    const day = Session.openDay >= 1 ? Session.openDay : 1;
    if (!db) return "配置未加载";
    const open = listOpenEntries(db.opencondition, level, day);
    if (open.length === 0) return "Lv" + level + " / 开服D" + day + " 无入口";
    return "Lv" + level + " / 开服D" + day + " 已开：" + open.map((row) => row.name).join("、");
  }

  private resolveCanvas(): Node {
    const named = this.node.getChildByName("Canvas");
    if (named) return named;
    if (this.node.name === "Canvas") return this.node;
    const fromScene = this.node.scene?.getChildByName("Canvas");
    return fromScene ?? this.node;
  }
}
