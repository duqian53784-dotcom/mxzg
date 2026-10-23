/**
 * 在已经打开的页面上盖一层 1:1 Prefab，方便看新界面。
 * 关闭壳只是藏起来，下面的代码页 / 旧 Prefab / 协议探针还在。
 * 加载失败留原来的页面，不留空画面。
 */
import { BlockInputEvents, Button, Color, Label, Node, Overflow, Sprite, UITransform } from "cc";
import { labelCenterInParent, sliceAnchorShift } from "./ccbiPlace";
import { CITY_BAR_BOTTOM, CITY_VIEW_H } from "./cityMapLayout";
import { messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import { formatWireQuickBattle } from "../net/protocol/wireQuickBattle";
import { mountIdleHang } from "./idleHangView";
import { PAGE_SHELL_FIGHT, pagePrefabShell, USE_PAGE_PREFAB_SHELL } from "./prefabShellMap";
import { loadPrefab, spawnPrefab } from "./prefabLoad";
import { createButton, createRect, place, setText, uiNode } from "./UiKit";

/** 挂机底栏「快速战斗」。已有壳。3013 开战硬禁，只读 3012 次数。 */
export const HANG_QUICK_PREFAB = "prefabs/ui/quick-battle/QuickBattleLayer";
/** 挂机底栏「我要变强」。已有壳，标题是英雄变强。不新发协议。 */
export const HANG_GROW_PREFAB = "prefabs/ui/hero/HeroSuggestLayer";

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
    ui.setAnchorPoint(0.5, 0.5);
    root.addComponent(BlockInputEvents);
    if (spec.fight) mountIdleHang(root);
    else place(createRect("dim", 720, 1280, new Color(8, 16, 32, 255)), root, 0, 0);
    const view = spawnPrefab(prefab, root);
    mountCcbiView(view);
    if (spec.fight) {
      const battle = findDescendant(view, "btn_battle");
      if (battle) {
        liftNode(battle, view);
        bindTap(battle, () => {
          if (page.isValid) page.emit(PAGE_SHELL_FIGHT);
        });
      }
      bindHangSheets(view, root);
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

/**
 * 把 ccbi 根放进 720×1280 父节点中心，并修正九宫格底左角和按钮上的字。
 * 根锚点是 (0,0)。不要用 Widget 的水平/垂直居中，那会把底左角钉在画面中心。
 * 底板已经铺在 0..宽 里的壳，Prefab 根位置写成同一个偏移，编辑器里打开就在设计框中间。
 * 底板中心本来就在根锚点上的壳不要写这个偏移。
 */
export function mountCcbiView(node: Node): void {
  repairCcbiView(node);
  centerInParent(node);
  seatAboveChrome(node);
}

/** 九宫格按底左角归位，小按钮上的字回到盒子中心并缩进按钮。 */
export function repairCcbiView(root: Node): void {
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as Node;
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
    repairSlice(node);
    repairLabel(node);
  }
}

function repairSlice(node: Node): void {
  const sprite = node.getComponent(Sprite);
  if (!sprite || sprite.type !== Sprite.Type.SLICED) return;
  const ui = node.getComponent(UITransform);
  if (!ui) return;
  const host = sizedAncestor(node);
  if (!host) return;
  const pos = anchorIn(node, host.node);
  const shift = sliceAnchorShift(
    {
      x: pos.x,
      y: pos.y,
      ax: ui.anchorX,
      ay: ui.anchorY,
      w: ui.contentSize.width,
      h: ui.contentSize.height,
      sx: node.scale.x,
      sy: node.scale.y,
    },
    {
      ax: host.ui.anchorX,
      ay: host.ui.anchorY,
      w: host.ui.contentSize.width,
      h: host.ui.contentSize.height,
    }
  );
  if (!shift) return;
  node.setPosition(node.position.x + shift.x, node.position.y + shift.y, node.position.z);
}

function repairLabel(node: Node): void {
  const label = node.getComponent(Label);
  const parent = node.parent;
  if (!label || !parent) return;
  const parentUi = parent.getComponent(UITransform);
  if (!parentUi) return;
  const width = parentUi.contentSize.width;
  const height = parentUi.contentSize.height;
  const center = labelCenterInParent(parentUi.anchorX, parentUi.anchorY, width, height, node.position.x, node.position.y);
  if (center) node.setPosition(center.x, center.y, node.position.z);
  if (Math.abs(node.scale.x - 1) > 0.05 || Math.abs(node.scale.y - 1) > 0.05) return;
  if (width < 8 || height < 8 || width > 400) return;
  const text = label.string || "";
  const wide = label.fontSize * Math.max(1, text.length) * 0.55 > width;
  const tall = label.fontSize > height * 0.85;
  if (!wide && !tall) return;
  const ui = node.getComponent(UITransform);
  if (ui) ui.setContentSize(Math.max(8, width - 8), Math.max(8, height - 4));
  label.overflow = Overflow.SHRINK;
}

function sizedAncestor(node: Node): { node: Node; ui: UITransform } | null {
  let cur = node.parent;
  while (cur) {
    const ui = cur.getComponent(UITransform);
    if (ui && ui.contentSize.width > 1 && ui.contentSize.height > 1) return { node: cur, ui };
    cur = cur.parent;
  }
  return null;
}

function anchorIn(node: Node, ancestor: Node): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let cur: Node | null = node;
  while (cur && cur !== ancestor) {
    x += cur.position.x;
    y += cur.position.y;
    cur = cur.parent;
  }
  return { x, y };
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

/**
 * 底栏两侧。快速战斗打开已有 QuickBattleLayer，并读 3012。不发 3013。
 * 我要变强打开已有 HeroSuggestLayer（英雄变强）。关掉回到挂机。
 */
function bindHangSheets(view: Node, host: Node): void {
  const quick = findDescendant(view, "btn_speed_battle");
  if (quick) {
    liftNode(quick, view);
    bindTap(quick, () => {
      void openHangSheet(host, HANG_QUICK_PREFAB, (sheet) => bindQuickSheet(sheet));
    });
  }
  const grow = findDescendant(view, "btn_lineup");
  if (grow) {
    liftNode(grow, view);
    bindTap(grow, () => {
      void openHangSheet(host, HANG_GROW_PREFAB);
    });
  }
}

function bindQuickSheet(sheet: Node): void {
  const write = () => {
    const line = formatWireQuickBattle(WireSession.quickBattle);
    const tip = findDescendant(sheet, "lbl_tip_2");
    if (tip && tip.isValid) setText(tip, line + " · 不发 3013");
    return line;
  };
  write();
  if (!WireSession.hasQuickBattle()) WireSession.pullQuickBattleCount();
  let off = () => {};
  off = WireSession.onSync(() => {
    if (!sheet.isValid) {
      off();
      return;
    }
    write();
  });
  sheet.once(Node.EventType.NODE_DESTROYED, () => off());
  const go = findDescendant(sheet, "btn_quick");
  if (!go) return;
  liftNode(go, sheet);
  bindTap(go, () => {
    const line = write();
    GameLog.shared.info("Mainline", "快速战斗只读 " + line + "，不发 3013");
  });
}

async function openHangSheet(host: Node, path: string, onReady?: (view: Node) => void): Promise<void> {
  if (!host.isValid) return;
  const old = host.getChildByName("BattleSheet");
  if (old) old.destroy();
  try {
    const prefab = await loadPrefab(path);
    if (!host.isValid) return;
    const sheet = uiNode("BattleSheet");
    const ui = sheet.addComponent(UITransform);
    ui.setContentSize(720, 1280);
    sheet.addComponent(BlockInputEvents);
    place(createRect("dim", 720, 1280, new Color(8, 16, 32, 170)), sheet, 0, 0);
    const view = spawnPrefab(prefab, sheet);
    mountCcbiView(view);
    const close = () => {
      if (sheet.isValid) sheet.destroy();
    };
    const button = findDescendant(view, "btn_close");
    if (button) {
      liftNode(button, view);
      bindTap(button, close);
    } else {
      const back = createButton("关闭", close, 160, 44);
      back.name = "BtnSheetClose";
      place(back, sheet, 0, -460);
    }
    if (onReady) onReady(view);
    sheet.parent = host;
    sheet.setSiblingIndex(Math.max(0, host.children.length - 1));
    GameLog.shared.info("Mainline", "hang sheet " + path);
  } catch (err) {
    GameLog.shared.warn("Mainline", "hang sheet " + path + " " + messageOf(err));
  }
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
