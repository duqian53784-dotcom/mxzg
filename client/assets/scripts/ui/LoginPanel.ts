import { BlockInputEvents, Button, Color, Node, UITransform } from "cc";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

export interface LoginPanelView {
  root: Node;
  setStatus(text: string): void;
  setBusy(busy: boolean): void;
}

/**
 * Boot 场景上的登录面板（不另建 Login 场景）。
 * 点「进入游戏」由调用方走 Mock 登录再切 Main。
 */
export function buildLoginPanel(parent: Node, onEnter: () => void): LoginPanelView {
  const root = uiNode("LoginPanel");
  const rootUi = root.addComponent(UITransform);
  rootUi.setContentSize(2000, 2000);
  root.addComponent(BlockInputEvents);
  root.parent = parent;

  const card = createRect("card", 520, 360, new Color(16, 28, 52, 245));
  place(card, root, 0, 0);

  place(createLabel("mxzg", 52, { color: new Color(255, 228, 170, 255), width: 480 }), root, 0, 110);
  place(createLabel("Mock 登录，不连服务器", 22, { color: new Color(180, 196, 220, 255), width: 480 }), root, 0, 52);

  const status = createLabel("准备登录", 22, { color: new Color(240, 240, 240, 255), width: 480 });
  place(status, root, 0, 0);

  const buttonNode = createButton("进入游戏", onEnter, 280, 60);
  place(buttonNode, root, 0, -100);
  const button = buttonNode.getComponent(Button);

  return {
    root,
    setStatus(text: string) {
      setText(status, text);
    },
    setBusy(busy: boolean) {
      if (button) button.interactable = !busy;
    },
  };
}
