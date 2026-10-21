import { BlockInputEvents, Button, Color, Node, UITransform } from "cc";
import { findServer, GameServer, MOCK_SERVERS } from "../core/servers";
import { createButton, createField, createLabel, createRect, paintRect, place, setText, TextField, uiNode } from "./UiKit";

export interface LoginPanelView {
  root: Node;
  setStatus(text: string): void;
  setDetail(text: string): void;
  setBusy(busy: boolean): void;
  account(): string;
  password(): string;
  serverId(): number;
}

export interface LoginPanelOptions {
  account?: string;
  serverId?: number;
  /** ws 时多一行地址和「改走 Mock」。默认 mock，版面与原来一致。 */
  mode?: "mock" | "ws";
  wsUrl?: string;
}

const SELECTED = new Color(186, 122, 42, 255);
const IDLE = new Color(46, 110, 190, 255);

/**
 * Boot 场景上的登录面板（不另建 Login 场景）。
 * 账号、密码、选服都在这里。密码 Mock 不校验、也不下发。
 * Mock 下「进入游戏」/「创角」由调用方走 Proto.login。
 * mode 为 ws 时这两颗按钮只测套接字，协议仍由 Boot 决定，这里不发。
 */
export function buildLoginPanel(
  parent: Node,
  handlers: { onEnter: () => void; onCreate: () => void; onMock?: () => void },
  options?: LoginPanelOptions
): LoginPanelView {
  const ws = options?.mode === "ws";
  const root = uiNode("LoginPanel");
  const rootUi = root.addComponent(UITransform);
  rootUi.setContentSize(2000, 2000);
  root.addComponent(BlockInputEvents);
  root.parent = parent;

  const card = createRect("card", 560, ws ? 780 : 700, new Color(16, 28, 52, 245));
  place(card, root, 0, ws ? 0 : 10);

  place(createLabel("mxzg", 48, { color: new Color(255, 228, 170, 255), width: 500 }), root, 0, 280);
  const subtitle = ws ? "本机 WebSocket " + (options?.wsUrl || "") : "Mock 登录，不连服务器";
  place(createLabel(subtitle, 20, { color: new Color(180, 196, 220, 255), width: 520 }), root, 0, 230);

  place(createLabel("账号", 20, { color: new Color(180, 196, 220, 255), width: 460 }), root, 0, 180);
  const accountField = createField("请输入账号", 460, 48, { text: options?.account ?? "", maxLength: 16 });
  place(accountField.node, root, 0, 140);

  place(createLabel("密码（可留空）", 20, { color: new Color(180, 196, 220, 255), width: 460 }), root, 0, 88);
  const passwordField = createField("Mock 不校验", 460, 48, { password: true, maxLength: 16 });
  place(passwordField.node, root, 0, 48);

  place(createLabel("选服", 20, { color: new Color(180, 196, 220, 255), width: 460 }), root, 0, -4);

  let selected = findServer(options?.serverId ?? MOCK_SERVERS[0].id);
  const buttons: Array<{ server: GameServer; node: Node }> = [];
  const rowY = -52;
  const gap = 168;
  const startX = -((MOCK_SERVERS.length - 1) * gap) / 2;
  for (let i = 0; i < MOCK_SERVERS.length; i++) {
    const server = MOCK_SERVERS[i];
    const node = createButton(server.name, () => {
      selected = server;
      paintServers();
      setText(picked, "已选 " + server.name);
    }, 156, 48, server.id === selected.id ? SELECTED : IDLE);
    place(node, root, startX + i * gap, rowY);
    buttons.push({ server, node });
  }

  const picked = createLabel("已选 " + selected.name, 20, { color: new Color(255, 220, 160, 255), width: 480 });
  place(picked, root, 0, -108);

  const status = createLabel("准备登录", 20, { color: new Color(240, 240, 240, 255), width: 520 });
  place(status, root, 0, ws ? -148 : -156);
  const detail = ws
    ? place(createLabel("进入游戏只测连通", 18, { color: new Color(180, 196, 220, 255), width: 520 }), root, 0, -186)
    : null;

  const enterNode = createButton("进入游戏", handlers.onEnter, 280, 56);
  place(enterNode, root, 0, ws ? -232 : -220);
  const createNode = createButton("创角", handlers.onCreate, 280, 52, new Color(62, 96, 78, 255));
  place(createNode, root, 0, ws ? -292 : -286);
  let mockButton: Button | null = null;
  if (ws && handlers.onMock) {
    const mockNode = createButton("改走 Mock", handlers.onMock, 280, 48, new Color(72, 78, 96, 255), 22);
    place(mockNode, root, 0, -352);
    mockButton = mockNode.getComponent(Button);
  }

  const enterButton = enterNode.getComponent(Button);
  const createButtonNode = createNode.getComponent(Button);

  function paintServers(): void {
    for (let i = 0; i < buttons.length; i++) {
      const row = buttons[i];
      const bg = row.node.getChildByName("bg");
      if (bg) paintRect(bg, row.server.id === selected.id ? SELECTED : IDLE);
    }
  }

  return {
    root,
    setStatus(text: string) {
      setText(status, text);
    },
    setDetail(text: string) {
      if (detail) setText(detail, text);
    },
    setBusy(busy: boolean) {
      if (enterButton) enterButton.interactable = !busy;
      if (createButtonNode) createButtonNode.interactable = !busy;
      if (mockButton) mockButton.interactable = !busy;
    },
    account(): string {
      return readField(accountField);
    },
    password(): string {
      return readField(passwordField);
    },
    serverId(): number {
      return selected.id;
    },
  };
}

function readField(field: TextField): string {
  return field.getValue();
}
