/**
 * 在已经打开的页面上盖一层 1:1 Prefab，方便看新界面。
 * 关闭壳只是藏起来，下面的代码页 / 旧 Prefab / 协议探针还在。
 * 加载失败留原来的页面，不留空画面。
 */
import { BlockInputEvents, Button, Color, Node, UITransform } from "cc";
import { CITY_BAR_BOTTOM, CITY_VIEW_H } from "./cityMapLayout";
import { messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { PAGE_SHELL_FIGHT, pagePrefabShell, USE_PAGE_PREFAB_SHELL } from "./prefabShellMap";
import { loadPrefab, spawnPrefab } from "./prefabLoad";
import { createButton, createRect, place, uiNode } from "./UiKit";

export { PAGE_SHELL_FIGHT, USE_PAGE_PREFAB_SHELL };

interface ShellHold {
  want: boolean;
  root: Node | null;
}

const holds = new Map<Node, ShellHold>();

export function setPagePrefabShellVisible(page: Node, visible: boolean): void {
  let hold = holds.get(page);
  if (!hold) {
    hold = { want: visible, root: null };
    holds.set(page, hold);
  } else {
    hold.want = visible;
  }
  if (hold.root && hold.root.isValid) hold.root.active = visible;
}

/** 盖上对照表里的 Prefab。没有对照就什么都不做。 */
export async function attachPagePrefabShell(page: Node, id: string): Promise<void> {
  if (!USE_PAGE_PREFAB_SHELL) return;
  const spec = pagePrefabShell(id);
  if (!spec || !page.isValid) return;
  let hold = holds.get(page);
  if (hold && hold.root) return;
  if (!hold) {
    hold = { want: true, root: null };
    holds.set(page, hold);
  }
  try {
    const prefab = await loadPrefab(spec.path);
    if (!page.isValid) return;
    const root = uiNode("PagePrefabShell");
    const ui = root.addComponent(UITransform);
    ui.setContentSize(720, 1280);
    root.addComponent(BlockInputEvents);
    place(createRect("dim", 720, 1280, new Color(8, 16, 32, 255)), root, 0, 0);
    const view = spawnPrefab(prefab, root);
    centerInParent(view);
    seatAboveChrome(view);
    if (spec.fight) {
      const battle = findDescendant(view, "btn_battle");
      if (battle) {
        liftNode(battle, view);
        bindTap(battle, () => {
          if (page.isValid) page.emit(PAGE_SHELL_FIGHT);
        });
      }
    }
    const close = findDescendant(view, "btn_close");
    if (close) {
      liftNode(close, view);
      bindTap(close, () => setPagePrefabShellVisible(page, false));
    }
    const probe = createButton("功能页", () => setPagePrefabShellVisible(page, false), 96, 32);
    probe.name = "BtnShellProbe";
    place(probe, root, -300, 600);
    const raise = () => {
      if (root.isValid && root.parent === page) root.setSiblingIndex(Math.max(0, page.children.length - 1));
    };
    page.on(Node.EventType.CHILD_ADDED, raise);
    root.parent = page;
    root.active = hold.want;
    hold.root = root;
    raise();
    page.once(Node.EventType.NODE_DESTROYED, () => {
      holds.delete(page);
    });
    GameLog.shared.info("MainApp", "page prefab shell " + id + " " + spec.path);
  } catch (err) {
    GameLog.shared.error("MainApp", "page prefab shell " + id + " " + messageOf(err) + "，仍用原来的页面");
  }
}

export function centerInParent(node: Node): void {
  const ui = node.getComponent(UITransform);
  if (!ui) {
    node.setPosition(0, 0, 0);
    return;
  }
  const width = ui.contentSize.width;
  const height = ui.contentSize.height;
  node.setPosition(-(0.5 - ui.anchorX) * width, -(0.5 - ui.anchorY) * height, 0);
}

/** 底边落到 720×1280 底栏下面时，整页上移。短弹窗本来就在安全区里则不动。 */
export function seatAboveChrome(node: Node): void {
  const ui = node.getComponent(UITransform);
  if (!ui || !ui.contentSize) return;
  const height = ui.contentSize.height;
  const anchorY = typeof ui.anchorY === "number" ? ui.anchorY : 0.5;
  const bottom = node.position.y - height * anchorY;
  const limit = -CITY_VIEW_H / 2 + CITY_BAR_BOTTOM;
  if (bottom >= limit) return;
  node.setPosition(node.position.x, node.position.y + (limit - bottom), node.position.z || 0);
}

export function findDescendant(root: Node, name: string): Node | null {
  if (root.name === name) return root;
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) {
    const found = findDescendant(kids[i], name);
    if (found) return found;
  }
  return null;
}

export function bindTap(node: Node, fn: () => void): void {
  if (!node.getComponent(Button)) node.addComponent(Button);
  node.on(Button.EventType.CLICK, fn);
}

/** 全屏 CCMenu 会挡住兄弟节点。把按钮抬到宿主最上层，世界位置不变。 */
export function liftNode(node: Node, host: Node): void {
  const from = node.parent;
  if (!from || from === host) return;
  const fromUi = from.getComponent(UITransform);
  const hostUi = host.getComponent(UITransform);
  const pos = { x: node.position.x, y: node.position.y, z: node.position.z };
  const fromConv = fromUi as UITransform & {
    convertToWorldSpaceAR?: (p: { x: number; y: number; z?: number }) => { x: number; y: number; z?: number };
  };
  const hostConv = hostUi as UITransform & {
    convertToNodeSpaceAR?: (p: { x: number; y: number; z?: number }) => { x: number; y: number; z?: number };
  };
  if (!fromConv || !fromConv.convertToWorldSpaceAR || !hostConv || !hostConv.convertToNodeSpaceAR) {
    node.setSiblingIndex(Math.max(0, from.children.length - 1));
    return;
  }
  const world = fromConv.convertToWorldSpaceAR(pos);
  node.parent = host;
  const local = hostConv.convertToNodeSpaceAR(world);
  node.setPosition(local.x, local.y, local.z || 0);
}
