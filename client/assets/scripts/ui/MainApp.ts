/**
 * 主城壳（B2）。Canvas 下用代码生成标题和按钮，不需要美术。
 * 从 Boot 进来时，若场景上没挂本组件，Boot 会 addComponent。
 * 单独预览 Main：把 MainApp 挂到 Main 场景的 Canvas 上。
 */
import { _decorator, BlockInputEvents, Color, Component, Node, UITransform } from "cc";
import { ConfigDb, ConfigLoader } from "../config/ConfigLoader";
import { listOpenEntries } from "../config/gates";
import { Session } from "../core/Session";
import { NetClient } from "../net/NetClient";
import { UIShell } from "./UIShell";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const { ccclass } = _decorator;

@ccclass("MainApp")
export class MainApp extends Component {
  private shell: UIShell | null = null;
  private built = false;

  start() {
    if (this.built) return;
    this.built = true;
    void this.build();
  }

  private async build(): Promise<void> {
    const canvas = this.resolveCanvas();
    this.shell = UIShell.mount(canvas);
    if (!ConfigDb.current) {
      try {
        await ConfigLoader.loadAll();
      } catch (err) {
        console.error("[MainApp] config load failed", err);
      }
    }
    if (!this.isValid || !this.shell) return;
    this.shell.openPage("hub", this.buildHub());
    console.log("[MainApp] hub ready account=" + (Session.account || "(none)"));
  }

  private buildHub(): Node {
    const shell = this.shell;
    const page = uiNode("HubPage");
    const level = Session.role?.level ?? 1;
    const account = Session.account
      ? Session.account + " · " + (Session.role?.name ?? "") + " Lv" + level
      : "未登录（请从 Boot 进入）";

    place(createLabel("主城", 48, { color: new Color(255, 228, 170, 255) }), page, 0, 230);
    place(createLabel(account, 22, { color: new Color(190, 205, 225, 255) }), page, 0, 180);

    this.hubButton(page, "主线", "main_battle", 120, () => shell?.showToast("主线（占位）"));
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

    place(createLabel(this.gateText(level), 20, { color: new Color(170, 190, 170, 255), width: 700 }), page, 0, -258);

    const netNode = createLabel("网络 " + NetClient.shared.state, 20, {
      color: new Color(160, 180, 210, 255),
      width: 700,
    });
    place(netNode, page, 0, -292);
    NetClient.shared.onState((state) => {
      if (netNode.isValid) setText(netNode, "网络 " + state);
    });
    return page;
  }

  private hubButton(page: Node, title: string, id: string, y: number, onClick: () => void): void {
    const button = createButton(title, () => {
      console.log("[MainApp] click " + id);
      onClick();
    }, 300, 52);
    place(button, page, 0, y);
  }

  private buildBag(): Node {
    const page = uiNode("BagPage");
    place(createLabel("背包（占位）", 40, { color: new Color(255, 228, 170, 255) }), page, 0, 80);
    place(createLabel("道具列表留到 C7", 22), page, 0, 20);
    const back = createButton("返回", () => {
      console.log("[MainApp] click bag-back");
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
        console.log("[MainApp] click popup-close");
        this.shell?.closePopup();
      }, 200, 52),
      root,
      0,
      -70
    );
    return root;
  }

  private gateText(level: number): string {
    const db = ConfigDb.current;
    const day = 1;
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
