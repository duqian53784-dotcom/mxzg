import { BlockInputEvents, Button, Color, Label, Node, Overflow, UITransform } from "cc";
import { findServer, GameServer, MOCK_SERVERS } from "../core/servers";
import {
  bindClick,
  loadPrefab,
  LOGIN_PREFAB_PATH,
  readEditBox,
  requireNode,
  setInteractable,
  spawnPrefab,
  tintSprite,
  writeEditBox,
} from "./prefabLoad";
import { createButton, createField, createLabel, createRect, paintRect, place, setText, TextField, uiNode } from "./UiKit";

export interface LoginHandlers {
  onEnter: () => void;
  onCreate: () => void;
  onMock?: () => void;
  /** Mock 登录页上的「连本机服」。Prefab 没有这颗钮，代码 UI 和 P1 壳才放。 */
  onLive?: () => void;
}

export interface LoginPanelView {
  root: Node;
  setStatus(text: string): void;
  setDetail(text: string): void;
  setBusy(busy: boolean): void;
  account(): string;
  password(): string;
  serverId(): number;
  /** P1 平台ID。代码登录面板没有这一栏，返回空串。 */
  platformId(): string;
  /** P1 CHANNEL_ID。空串表示仍用 mxzg-web-1001。 */
  channelId(): string;
  /** P1 PF_ID。空串表示仍用 localdev。 */
  pfId(): string;
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
 * mode 为 ws 时这两颗按钮由 Boot 发登录 1001 或创角 1002，这里仍不自己组包。
 * USE_LOGIN_PREFAB 为 false，或 Prefab 加载失败时，Boot 仍调用这里。
 */
export function buildLoginPanel(
  parent: Node,
  handlers: LoginHandlers,
  options?: LoginPanelOptions
): LoginPanelView {
  const ws = options?.mode === "ws";
  const root = uiNode("LoginPanel");
  const rootUi = root.addComponent(UITransform);
  rootUi.setContentSize(2000, 2000);
  root.addComponent(BlockInputEvents);
  root.parent = parent;

  const live = !ws && !!handlers.onLive;
  const card = createRect("card", 560, ws || live ? 780 : 700, new Color(16, 28, 52, 245));
  place(card, root, 0, ws || live ? 0 : 10);

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

  const choices = loginServers(ws);
  let selected = pickedServer(ws, options?.serverId);
  const buttons: Array<{ server: GameServer; node: Node }> = [];
  const rowY = -52;
  const gap = 168;
  const startX = -((choices.length - 1) * gap) / 2;
  for (let i = 0; i < choices.length; i++) {
    const server = choices[i];
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

  const status = createLabel("", 20, { color: new Color(240, 240, 240, 255), width: 520 });
  place(status, root, 0, ws ? -148 : -156);
  const detail = place(
    createLabel("", 18, { color: new Color(180, 196, 220, 255), width: 520 }),
    root,
    0,
    -186
  );

  const enterNode = createButton("进入游戏", handlers.onEnter, 280, 56);
  place(enterNode, root, 0, ws ? -232 : -220);
  const createNode = createButton("创角", handlers.onCreate, 280, 52, new Color(62, 96, 78, 255));
  place(createNode, root, 0, ws ? -292 : -286);
  let mockButton: Button | null = null;
  let liveButton: Button | null = null;
  if (ws && handlers.onMock) {
    const mockNode = createButton("改走 Mock", handlers.onMock, 280, 48, new Color(72, 78, 96, 255), 22);
    place(mockNode, root, 0, -352);
    mockButton = mockNode.getComponent(Button);
  } else if (live && handlers.onLive) {
    const liveNode = createButton("连本机服", handlers.onLive, 280, 48, new Color(72, 78, 96, 255), 22);
    place(liveNode, root, 0, -352);
    liveButton = liveNode.getComponent(Button);
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
      if (liveButton) liveButton.interactable = !busy;
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
    platformId(): string {
      return "";
    },
    channelId(): string {
      return "";
    },
    pfId(): string {
      return "";
    },
  };
}

function readField(field: TextField): string {
  return field.getValue();
}

/** 真桥登录只显示本机桥。Mock 仍是三台占位服。id 1 在表里仍叫本地Mock，这里不改那张表。 */
function loginServers(ws: boolean): GameServer[] {
  if (ws) return [{ id: 1, name: "本机桥" }];
  return MOCK_SERVERS;
}

function pickedServer(ws: boolean, serverId?: number): GameServer {
  if (ws) return { id: 1, name: "本机桥" };
  return findServer(serverId ?? MOCK_SERVERS[0].id);
}

const PREFAB_SELECTED = new Color(255, 214, 150, 255);
const PREFAB_IDLE = new Color(255, 255, 255, 255);

/**
 * 绑定 LoginPanel.prefab。节点名对齐 Prefab，对外仍是 LoginPanelView。
 * 路径相对 assets：prefabs/ui/login/LoginPanel。不走 resources.load。
 */
export async function mountLoginPrefab(
  parent: Node,
  handlers: LoginHandlers,
  options?: LoginPanelOptions
): Promise<LoginPanelView> {
  const prefab = await loadPrefab(LOGIN_PREFAB_PATH);
  const root = spawnPrefab(prefab, parent);
  try {
    return bindLoginPrefab(root, handlers, options);
  } catch (err) {
    root.destroy();
    throw err;
  }
}

/** 标题格子只有 60 高。48 号会顶出盒子，收成大约 0.55 倍高度。 */
function fitCardTitle(root: Node): void {
  const title = requireNode(root, "Card/Title");
  const label = title.getComponent(Label);
  const ui = title.getComponent(UITransform);
  if (!label || !ui) return;
  const height = ui.contentSize.height;
  if (!(height > 8) || !(label.fontSize > height * 0.7)) return;
  const font = Math.max(12, Math.floor(height * 0.55));
  label.fontSize = font;
  label.lineHeight = font + 4;
  label.overflow = Overflow.SHRINK;
}

function bindLoginPrefab(
  root: Node,
  handlers: LoginHandlers,
  options?: LoginPanelOptions
): LoginPanelView {
  const ws = options?.mode === "ws";
  const subtitle = ws ? "本机 WebSocket " + (options?.wsUrl || "") : "Mock 登录，不连服务器";
  fitCardTitle(root);
  setText(requireNode(root, "Card/Subtitle"), subtitle);

  const accountField = requireNode(root, "Card/AccountField");
  const passwordField = requireNode(root, "Card/PasswordField");
  writeEditBox(accountField, options?.account ?? "");

  const picked = requireNode(root, "Card/Picked");
  const status = requireNode(root, "Card/Status");
  const detail = requireNode(root, "Card/Detail");
  setText(status, "");
  setText(detail, "");

  const choices = loginServers(ws);
  let selected = pickedServer(ws, options?.serverId);
  const buttons: Array<{ server: GameServer; node: Node }> = [];
  for (let i = 0; i < MOCK_SERVERS.length; i++) {
    const slot = MOCK_SERVERS[i];
    const node = requireNode(root, "Card/ServerRow/Btn_" + slot.id);
    let server: GameServer | null = null;
    for (let j = 0; j < choices.length; j++) {
      if (choices[j].id === slot.id) server = choices[j];
    }
    if (!server) {
      node.active = false;
      continue;
    }
    node.active = true;
    const label = node.getChildByName("Label");
    if (label) setText(label, server.name);
    bindClick(node, () => {
      selected = server;
      paintServers();
      setText(picked, "已选 " + server.name);
    });
    buttons.push({ server, node });
  }

  function paintServers(): void {
    for (let i = 0; i < buttons.length; i++) {
      const row = buttons[i];
      tintSprite(row.node, row.server.id === selected.id ? PREFAB_SELECTED : PREFAB_IDLE);
    }
  }
  paintServers();
  setText(picked, "已选 " + selected.name);

  const enterNode = requireNode(root, "Card/BtnEnter");
  const createNode = requireNode(root, "Card/BtnCreate");
  const mockNode = requireNode(root, "Card/BtnMock");
  bindClick(enterNode, handlers.onEnter);
  bindClick(createNode, handlers.onCreate);
  const showMock = ws && !!handlers.onMock;
  mockNode.active = showMock;
  if (showMock && handlers.onMock) bindClick(mockNode, handlers.onMock);

  return {
    root,
    setStatus(text: string) {
      setText(status, text);
    },
    setDetail(text: string) {
      setText(detail, text);
    },
    setBusy(busy: boolean) {
      setInteractable(enterNode, !busy);
      setInteractable(createNode, !busy);
      setInteractable(mockNode, !busy);
    },
    account(): string {
      return readEditBox(accountField);
    },
    password(): string {
      return readEditBox(passwordField);
    },
    serverId(): number {
      return selected.id;
    },
    platformId(): string {
      return "";
    },
    channelId(): string {
      return "";
    },
    pfId(): string {
      return "";
    },
  };
}
