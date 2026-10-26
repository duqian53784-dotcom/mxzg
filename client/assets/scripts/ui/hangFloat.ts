/**
 * 挂机战报和挂机演武共用的飘字。红字伤害，绿字治疗，暴击是更大的金字。
 * 字由调用方写好。这里不造 0。
 */
import { Color, Label, Node, Overflow } from "cc";
import { createLabel, place } from "./UiKit";

export interface HangFloat {
  text: string;
  x: number;
  y: number;
  heal: boolean;
  crit?: boolean;
}

const DMG = new Color(255, 70, 54, 255);
const HEAL = new Color(90, 230, 120, 255);
const CRIT = new Color(255, 214, 72, 255);

/** 清掉宿主上的旧字，最多画 6 条。 */
export function placeHangFloats(host: Node, floats: HangFloat[]): void {
  if (!host.isValid) return;
  const old = host.children.slice();
  for (let i = 0; i < old.length; i++) old[i].destroy();
  for (let i = 0; i < floats.length && i < 6; i++) {
    const row = floats[i];
    const crit = row.crit === true && !row.heal;
    const color = crit ? CRIT : row.heal ? HEAL : DMG;
    const size = crit ? 40 : row.heal ? 30 : 34;
    const text = crit ? "暴击 " + row.text : row.text;
    const node = createLabel(text, size, { color, width: crit ? 180 : 140, height: 44 });
    const labelNode = node.getComponent(Label);
    if (labelNode) {
      labelNode.isBold = true;
      labelNode.overflow = Overflow.SHRINK;
    }
    place(node, host, row.x, row.y + (crit ? 18 : 0));
  }
}
