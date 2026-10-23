/**
 * ccbi 1:1 Prefab 的挂载修正。不改 Prefab 文件。
 *
 * 九宫格的位置经常是底左角，锚点却是中心。Creator 把这个位置当成锚点，
 * 底板就会偏到父框左下。只在「按底左角理解之后，更完整地落进父框」时平移。
 * 登录条、已经对准的底板、负缩放气泡不会动。
 *
 * 按钮锚点不在中心时，子 Label 写在 (0,0) 会贴在锚点上，字漂出按钮。
 */

export interface CcbiBox {
  x: number;
  y: number;
  ax: number;
  ay: number;
  w: number;
  h: number;
  sx: number;
  sy: number;
}

export interface CcbiFrame {
  ax: number;
  ay: number;
  w: number;
  h: number;
}

/** 返回要加到节点位置上的偏移。不该动时返回 null。 */
export function sliceAnchorShift(box: CcbiBox, frame: CcbiFrame): { x: number; y: number } | null {
  if (box.w < 1 || box.h < 1) return null;
  if (box.ax < 0.01 && box.ay < 0.01) return null;
  const current = insideRatio(box, frame);
  if (current >= 0.9) return null;
  const alt = insideRatio(
    {
      x: box.x + box.ax * box.w,
      y: box.y + box.ay * box.h,
      ax: box.ax,
      ay: box.ay,
      w: box.w,
      h: box.h,
      sx: box.sx,
      sy: box.sy,
    },
    frame
  );
  if (alt < 0.8 || alt < current + 0.2) return null;
  return { x: box.ax * box.w, y: box.ay * box.h };
}

/** 小按钮里贴在锚点上的字，挪到按钮盒子中心。大面板上的标题不动。 */
export function labelCenterInParent(
  parentAx: number,
  parentAy: number,
  parentW: number,
  parentH: number,
  childX: number,
  childY: number
): { x: number; y: number } | null {
  if (parentW < 8 || parentH < 8 || parentW > 400) return null;
  if (Math.abs(childX) > 2 || Math.abs(childY) > 2) return null;
  const x = (0.5 - parentAx) * parentW;
  const y = (0.5 - parentAy) * parentH;
  if (Math.abs(x) < 1 && Math.abs(y) < 1) return null;
  return { x, y };
}

function insideRatio(box: CcbiBox, frame: CcbiFrame): number {
  const corners = visualCorners(box);
  let minX = corners[0].x;
  let maxX = corners[0].x;
  let minY = corners[0].y;
  let maxY = corners[0].y;
  for (let i = 1; i < corners.length; i++) {
    if (corners[i].x < minX) minX = corners[i].x;
    if (corners[i].x > maxX) maxX = corners[i].x;
    if (corners[i].y < minY) minY = corners[i].y;
    if (corners[i].y > maxY) maxY = corners[i].y;
  }
  const left = -frame.ax * frame.w;
  const bottom = -frame.ay * frame.h;
  const right = left + frame.w;
  const top = bottom + frame.h;
  const overlapW = Math.max(0, Math.min(maxX, right) - Math.max(minX, left));
  const overlapH = Math.max(0, Math.min(maxY, top) - Math.max(minY, bottom));
  const area = Math.abs((maxX - minX) * (maxY - minY));
  if (area < 1) return 1;
  return (overlapW * overlapH) / area;
}

function visualCorners(box: CcbiBox): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const locals = [
    [0, 0],
    [box.w, 0],
    [0, box.h],
    [box.w, box.h],
  ];
  for (let i = 0; i < locals.length; i++) {
    out.push({
      x: box.x + (locals[i][0] - box.ax * box.w) * box.sx,
      y: box.y + (locals[i][1] - box.ay * box.h) * box.sy,
    });
  }
  return out;
}
