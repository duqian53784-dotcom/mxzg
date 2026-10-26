/**
 * Fit Height 下的可见宽度。
 * 设计分辨率仍是 720×1280。宽屏可见宽可以大于 720，瘦屏可以小于 720。
 * 这里只算边距，不改项目里的 Fit Width / Fit Height。
 */
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "./safeAreaLayout";

export interface VisibleBox {
  width: number;
  height: number;
}

export interface HorizontalFill {
  left: number;
  right: number;
  width: number;
}

/** 非正数退回设计分辨率，避免把栏宽收成 0。 */
export function visibleBox(width: number, height: number): VisibleBox {
  return {
    width: positive(width, DESIGN_WIDTH),
    height: positive(height, DESIGN_HEIGHT),
  };
}

/**
 * 窄屏把按 720 摆的按钮往中间收。宽屏保持设计位置，多出来的宽度只拉背景。
 * 返回值不超过 1。
 */
export function widthSqueeze(visibleW: number, designW?: number): number {
  const design = positive(designW === undefined ? 0 : designW, DESIGN_WIDTH);
  const visible = positive(visibleW, design);
  if (visible >= design) return 1;
  return visible / design;
}

/**
 * Widget 左 + 右对齐后的边距。父节点居中放在可见区域上。
 * 父节点比可见区域窄时边距为负，栏会伸出父节点，铺满屏幕。
 */
export function horizontalFillMargins(parentW: number, visibleW: number): HorizontalFill {
  const parent = positive(parentW, DESIGN_WIDTH);
  const visible = positive(visibleW, parent);
  const inset = (parent - visible) / 2;
  return { left: inset, right: inset, width: visible };
}

function positive(value: number, fallback: number): number {
  return typeof value === "number" && isFinite(value) && value > 0 ? value : fallback;
}
