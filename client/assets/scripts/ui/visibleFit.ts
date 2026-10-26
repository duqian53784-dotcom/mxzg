/**
 * 把主城顶底栏和地图视口拉到 view.getVisibleSize()。
 * 设计分辨率保持 720×1280，只 Fit Height。不要再勾 Fit Width（两个一起是 SHOW_ALL）。
 * 安全区仍可能把整层缩小。这里把主城根抵消那一层缩放，让本地像素等于屏幕像素。
 */
import { Graphics, Node, Sprite, UITransform, view, Widget } from "cc";
import { horizontalFillMargins, visibleBox, VisibleBox, widthSqueeze } from "./visibleChrome";

type WorldPoint = { x: number; y: number; z?: number };
type SpaceTransform = UITransform & {
  convertToWorldSpaceAR?: (point: WorldPoint) => WorldPoint;
  convertToNodeSpaceAR?: (point: WorldPoint) => WorldPoint;
};

interface DesignPlace {
  x: number;
  y: number;
  sx: number;
  sy: number;
}

export function readVisibleBox(): VisibleBox {
  try {
    const size = view.getVisibleSize();
    const width = size && typeof size.width === "number" ? size.width : 0;
    const height = size && typeof size.height === "number" ? size.height : 0;
    return visibleBox(width, height);
  } catch (_err) {
    return visibleBox(0, 0);
  }
}

/** 不含自身。主城根要用它把父层的安全区缩放抵消掉。 */
export function ancestorScale(node: Node): number {
  let scale = 1;
  let cur = node.parent;
  while (cur) {
    const raw = cur.scale && typeof cur.scale.x === "number" ? cur.scale.x : 1;
    scale *= raw > 0 ? raw : 1;
    cur = cur.parent;
  }
  return scale > 0 ? scale : 1;
}

/** 根节点铺满当前可见区域，并抵消祖先缩放，使本地坐标等于屏幕坐标。 */
export function fitVisibleRoot(node: Node, box?: VisibleBox): VisibleBox {
  const size = box || readVisibleBox();
  const ui = (node.getComponent(UITransform) || node.addComponent(UITransform)) as UITransform;
  ui.setAnchorPoint(0.5, 0.5);
  ui.setContentSize(size.width, size.height);
  const parentScale = ancestorScale(node);
  node.setScale(1 / parentScale, 1 / parentScale, 1);
  centerOnCanvas(node);
  return size;
}

/**
 * 地图挂在 CityMapHost 上。Host 铺满可见区域，地图根再用 Widget 四边贴住 Host。
 * 页面上的 bg 一并拉到同样的宽，避免宽屏两侧露出清屏色。
 */
export function fitCityViewport(root: Node): VisibleBox {
  const parent = root.parent;
  const host = parent && parent.name === "CityMapHost" ? parent : root;
  const box = fitVisibleRoot(host);
  if (host !== root) {
    const ui = (root.getComponent(UITransform) || root.addComponent(UITransform)) as UITransform;
    ui.setAnchorPoint(0.5, 0.5);
    ui.setContentSize(box.width, box.height);
    root.setScale(1, 1, 1);
    root.setPosition(0, 0, 0);
    stretchToParent(root);
  }
  const page = host.parent;
  const bg = page ? page.getChildByName("bg") : null;
  if (bg) {
    const bgUi = bg.getComponent(UITransform) as UITransform | null;
    if (bgUi) bgUi.setContentSize(box.width, box.height);
    redrawGraphics(bg, box.width, bgUi ? bgUi.contentSize.height : box.height);
  }
  return box;
}

/** 左右拉满父节点。不改垂直对齐，调用方自己钉顶或钉底。 */
export function stretchHorizontal(node: Node, visibleW: number): void {
  const ui = node.getComponent(UITransform) as UITransform | null;
  if (!ui) return;
  const parentUi = node.parent ? (node.parent.getComponent(UITransform) as UITransform | null) : null;
  const parentW = parentUi && parentUi.contentSize.width > 0 ? parentUi.contentSize.width : visibleW;
  const margins = horizontalFillMargins(parentW, visibleW);
  const widget = (node.getComponent(Widget) || node.addComponent(Widget)) as Widget;
  widget.isAlignHorizontalCenter = false;
  widget.isAlignVerticalCenter = false;
  widget.isAlignTop = false;
  widget.isAlignBottom = false;
  widget.isAlignLeft = true;
  widget.isAlignRight = true;
  widget.left = margins.left;
  widget.right = margins.right;
  widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
  const y = node.position && typeof node.position.y === "number" ? node.position.y : 0;
  const z = node.position && typeof node.position.z === "number" ? node.position.z : 0;
  ui.setContentSize(margins.width, ui.contentSize.height);
  const sprite = node.getComponent(Sprite) as Sprite | null;
  if (sprite) sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  if (typeof widget.updateAlignment === "function") widget.updateAlignment();
  node.setPosition(0, y, z);
  redrawGraphics(node, margins.width, ui.contentSize.height);
}

/** 顶栏或底栏：左右铺满可见宽，并贴住根节点的顶边或底边。Bg / BgPad 跟着拉宽。 */
export function stretchBar(node: Node, visibleW: number, edge: "top" | "bottom"): void {
  stretchHorizontal(node, visibleW);
  const ui = node.getComponent(UITransform) as UITransform | null;
  const parentUi = node.parent ? (node.parent.getComponent(UITransform) as UITransform | null) : null;
  if (ui && parentUi && parentUi.contentSize.height > 0) {
    const barH = ui.contentSize.height;
    const y = edge === "top" ? parentUi.contentSize.height * 0.5 - barH * 0.5 : -parentUi.contentSize.height * 0.5 + barH * 0.5;
    node.setPosition(0, y, 0);
  }
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) {
    const child = kids[i];
    if (child.name !== "Bg" && child.name !== "BgPad") continue;
    const childY = child.position && typeof child.position.y === "number" ? child.position.y : 0;
    stretchHorizontal(child, visibleW);
    child.setPosition(0, childY, 0);
  }
}

/** 地图根贴住 CityMapHost 的四边。Host 已经是可见尺寸。 */
export function stretchToParent(node: Node): void {
  const widget = (node.getComponent(Widget) || node.addComponent(Widget)) as Widget;
  widget.isAlignHorizontalCenter = false;
  widget.isAlignVerticalCenter = false;
  widget.isAlignLeft = true;
  widget.isAlignRight = true;
  widget.isAlignTop = true;
  widget.isAlignBottom = true;
  widget.left = 0;
  widget.right = 0;
  widget.top = 0;
  widget.bottom = 0;
  widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
  if (typeof widget.updateAlignment === "function") widget.updateAlignment();
}

/**
 * 窄屏把 720 上的按钮和挂机顶栏内容往中间收，避免裁出屏幕。
 * 宽屏不把它们拉开，只拉背景。
 */
export function squeezeWideNode(node: Node, visibleW: number): void {
  const mark = node as Node & { mxzgDesign?: DesignPlace };
  if (!mark.mxzgDesign) {
    const pos = node.position;
    const sc = node.scale;
    mark.mxzgDesign = {
      x: pos && typeof pos.x === "number" ? pos.x : 0,
      y: pos && typeof pos.y === "number" ? pos.y : 0,
      sx: sc && typeof sc.x === "number" && sc.x !== 0 ? sc.x : 1,
      sy: sc && typeof sc.y === "number" && sc.y !== 0 ? sc.y : 1,
    };
  }
  const design = mark.mxzgDesign;
  const squeeze = widthSqueeze(visibleW);
  const z = node.position && typeof node.position.z === "number" ? node.position.z : 0;
  node.setPosition(design.x * squeeze, design.y, z);
  node.setScale(design.sx * squeeze, design.sy * squeeze, 1);
}

/** 窗口变化后再铺一次。安全区会在稍后的 tick 里改缩放，所以多补两帧。 */
export function bindVisibleRefresh(owner: Node, apply: () => void): void {
  apply();
  const host = view as { on?: (type: string, cb: () => void) => void; off?: (type: string, cb: () => void) => void };
  if (host.on) host.on("canvas-resize", apply);
  const timers = [setTimeout(apply, 0), setTimeout(apply, 80)];
  owner.once(Node.EventType.NODE_DESTROYED, () => {
    if (host.off) host.off("canvas-resize", apply);
    for (let i = 0; i < timers.length; i++) clearTimeout(timers[i]);
  });
}

function centerOnCanvas(node: Node): void {
  const canvas = findCanvas(node);
  const parent = node.parent;
  if (!canvas || !parent) {
    node.setPosition(0, 0, 0);
    return;
  }
  const canvasUi = canvas.getComponent(UITransform) as SpaceTransform | null;
  const parentUi = parent.getComponent(UITransform) as SpaceTransform | null;
  if (!canvasUi || !parentUi || !canvasUi.convertToWorldSpaceAR || !parentUi.convertToNodeSpaceAR) {
    node.setPosition(0, 0, 0);
    return;
  }
  const world = canvasUi.convertToWorldSpaceAR({ x: 0, y: 0, z: 0 });
  const local = parentUi.convertToNodeSpaceAR(world);
  node.setPosition(local && typeof local.x === "number" ? local.x : 0, local && typeof local.y === "number" ? local.y : 0, 0);
}

function findCanvas(node: Node): Node | null {
  let cur: Node | null = node;
  while (cur) {
    if (cur.name === "Canvas") return cur;
    cur = cur.parent;
  }
  return null;
}

function redrawGraphics(node: Node, width: number, height: number): void {
  const graphics = node.getComponent(Graphics) as Graphics | null;
  if (!graphics || width <= 0 || height <= 0) return;
  if (typeof graphics.clear !== "function" || typeof graphics.rect !== "function" || typeof graphics.fill !== "function") return;
  graphics.clear();
  graphics.rect(-width / 2, -height / 2, width, height);
  graphics.fill();
}
