/**
 * 战斗叠在挂机壳上。底栏三钮和收益留在下面。
 * 数字只来自这一拍真正的血量差或战报 hurt。没有就不写 0。
 */
import { Button, Color, Label, Node, Overflow, UITransform } from "cc";
import { BattleRound, BattleUnit } from "../module/mainline/battle";
import { createLabel, place, setText, uiNode } from "./UiKit";

export interface HangFloat {
  text: string;
  x: number;
  y: number;
  heal: boolean;
}

interface HangHold {
  left: string;
  right: string;
  speed: number;
  seq: number;
  allies: BattleUnit[] | null;
  enemies: BattleUnit[] | null;
}

const holds = new Map<Node, HangHold>();
const speedFns = new Map<Node, () => void>();

const INK = new Color(255, 236, 190, 255);
const DMG = new Color(255, 70, 54, 255);
const HEAL = new Color(90, 230, 120, 255);

export function bindHangSpeed(page: Node, fn: () => void): void {
  speedFns.set(page, fn);
  page.once(Node.EventType.NODE_DESTROYED, () => speedFns.delete(page));
}

export function setHangSpeed(page: Node, speed: number): void {
  const hold = holds.get(page);
  if (hold) hold.speed = speed;
  const layer = layerOf(page);
  if (!layer) return;
  const node = layer.getChildByName("HangSpeed");
  if (node) setText(node, "×" + String(speed));
}

/** 出阵之后、战报还没到时，先把中间按钮改成战斗中，并闪一下开战。 */
export function beginHangBattle(page: Node, left: string, right: string): void {
  const hold = ensureHold(page);
  hold.seq += 1;
  hold.left = left || "我方";
  hold.right = right || "敌方";
  hold.allies = null;
  hold.enemies = null;
  const layer = ensureLayer(page);
  setCaption(page, "战斗中");
  const flash = layer.getChildByName("HangFlash");
  if (flash) {
    flash.active = true;
    setText(flash, "战斗开始");
  }
  paintVs(layer, hold);
  const round = layer.getChildByName("HangRound");
  if (round) setText(round, "第1/15回合");
}

export function showMockRound(page: Node, round: BattleRound, stageId: number): void {
  const hold = ensureHold(page);
  if (!hold.right) hold.right = "第" + stageId + "关";
  const floats: HangFloat[] = [];
  pushSide(floats, hold.allies, round.allies, 140);
  pushSide(floats, hold.enemies, round.enemies, -150);
  hold.allies = round.allies.map(copyUnit);
  hold.enemies = round.enemies.map(copyUnit);
  const skill = skillFromLine(round.line);
  showHangStrike(page, round.round, 15, skill, floats);
}

export function showHangStrike(page: Node, round: number, total: number, skill: string | null, floats: HangFloat[]): void {
  const hold = ensureHold(page);
  const layer = ensureLayer(page);
  const flash = layer.getChildByName("HangFlash");
  if (flash) flash.active = round <= 1 && floats.length === 0;
  const cap = total >= 1 ? total : 15;
  const now = round >= 1 ? round : 1;
  const label = layer.getChildByName("HangRound");
  if (label) setText(label, "第" + now + "/" + cap + "回合");
  paintVs(layer, hold);
  const banner = layer.getChildByName("HangSkill");
  if (banner) {
    banner.active = !!skill;
    if (skill) setText(banner, skill);
  }
  const host = layer.getChildByName("HangFloats");
  if (!host) return;
  const old = host.children.slice();
  for (let i = 0; i < old.length; i++) old[i].destroy();
  for (let i = 0; i < floats.length && i < 6; i++) {
    const row = floats[i];
    const color = row.heal ? HEAL : DMG;
    const node = createLabel(row.text, 32, { color, width: 140, height: 40 });
    const text = node.getComponent(Label);
    if (text) {
      text.isBold = true;
      text.overflow = Overflow.SHRINK;
    }
    place(node, host, row.x, row.y);
  }
}

export function finishHangBattle(page: Node, win: boolean | null): void {
  const hold = holds.get(page);
  const seq = hold ? hold.seq : -1;
  const layer = layerOf(page);
  if (layer) {
    const banner = layer.getChildByName("HangSkill");
    if (banner) {
      banner.active = win !== null;
      if (win === true) setText(banner, "胜利");
      else if (win === false) setText(banner, "失败");
    }
    const flash = layer.getChildByName("HangFlash");
    if (flash) flash.active = false;
  }
  const timer = setTimeout(() => {
    const live = holds.get(page);
    if (!page.isValid || !live || live.seq !== seq) return;
    stopHangBattle(page);
  }, 1200);
  const maybe = timer as { unref?: () => void };
  if (typeof maybe.unref === "function") maybe.unref();
}

export function stopHangBattle(page: Node): void {
  holds.delete(page);
  const layer = layerOf(page);
  if (layer) layer.destroy();
  setCaption(page, "战斗");
}

function ensureHold(page: Node): HangHold {
  let hold = holds.get(page);
  if (!hold) {
    hold = { left: "我方", right: "敌方", speed: 1, seq: 0, allies: null, enemies: null };
    holds.set(page, hold);
    page.once(Node.EventType.NODE_DESTROYED, () => holds.delete(page));
  }
  return hold;
}

function layerOf(page: Node): Node | null {
  const host = battleHost(page);
  const layer = host.getChildByName("HangBattle");
  return layer && layer.isValid ? layer : null;
}

function battleHost(page: Node): Node {
  const shell = page.getChildByName("PagePrefabShell");
  if (shell && shell.isValid && shell.active) return shell;
  return page;
}

function ensureLayer(page: Node): Node {
  const host = battleHost(page);
  let layer = host.getChildByName("HangBattle");
  if (layer && layer.isValid) {
    layer.setSiblingIndex(Math.max(0, host.children.length - 1));
    return layer;
  }
  layer = uiNode("HangBattle");
  const ui = layer.addComponent(UITransform);
  ui.setContentSize(720, 1280);
  place(layer, host, 0, 0);
  layer.setSiblingIndex(Math.max(0, host.children.length - 1));

  const flash = createLabel("战斗开始", 42, { color: INK, width: 420, height: 64 });
  flash.name = "HangFlash";
  place(flash, layer, 0, 250);

  const round = createLabel("第1/15回合", 22, { color: INK, width: 280, height: 36 });
  round.name = "HangRound";
  place(round, layer, 0, 320);

  const vs = createLabel("我方  VS  敌方", 20, { color: INK, width: 520, height: 32 });
  vs.name = "HangVs";
  place(vs, layer, 0, 188);

  const skill = createLabel("", 28, { color: INK, width: 360, height: 44 });
  skill.name = "HangSkill";
  skill.active = false;
  place(skill, layer, 0, 130);

  const floats = uiNode("HangFloats");
  place(floats, layer, 0, 0);

  const speed = createLabel("×1", 22, { color: INK, width: 72, height: 36 });
  speed.name = "HangSpeed";
  place(speed, layer, 250, 300);
  if (!speed.getComponent(Button)) speed.addComponent(Button);
  speed.on(Button.EventType.CLICK, () => tapSpeed(page, speed));
  return layer;
}

function tapSpeed(page: Node, node: Node): void {
  const fn = speedFns.get(page);
  if (fn) {
    fn();
    return;
  }
  const hold = ensureHold(page);
  hold.speed = hold.speed === 1 ? 2 : hold.speed === 2 ? 3 : 1;
  setText(node, "×" + String(hold.speed));
}

function paintVs(layer: Node, hold: HangHold): void {
  const vs = layer.getChildByName("HangVs");
  if (vs) setText(vs, hold.left + "  VS  " + hold.right);
}

function setCaption(page: Node, text: string): void {
  const shell = page.getChildByName("PagePrefabShell");
  const root = shell && shell.isValid ? shell : page;
  const button = findNamed(root, "btn_battle");
  if (!button) return;
  eachLabel(button, (label) => {
    label.string = text;
    if (label.fontSize > 28) label.fontSize = 22;
    label.overflow = Overflow.SHRINK;
  });
}

function pushSide(out: HangFloat[], prev: BattleUnit[] | null, next: BattleUnit[], x: number): void {
  if (!prev) return;
  const n = prev.length < next.length ? prev.length : next.length;
  for (let i = 0; i < n && i < 3; i++) {
    const delta = prev[i].hp - next[i].hp;
    if (!isFinite(delta) || delta === 0) continue;
    const heal = delta < 0;
    const amount = heal ? -delta : delta;
    out.push({
      text: (heal ? "+" : "-") + String(amount),
      x: x + (i - 1) * 36,
      y: 70 - i * 42,
      heal,
    });
  }
}

function copyUnit(unit: BattleUnit): BattleUnit {
  return { name: unit.name, hp: unit.hp, maxHp: unit.maxHp };
}

function skillFromLine(line: string): string | null {
  const parts = line.split("·");
  if (parts.length < 2) return line.indexOf("攻击") >= 0 ? "攻击" : null;
  const name = parts[parts.length - 1].trim();
  return name || null;
}

function findNamed(root: Node, name: string): Node | null {
  if (root.name === name) return root;
  const kids = root.children;
  for (let i = 0; i < kids.length; i++) {
    const found = findNamed(kids[i], name);
    if (found) return found;
  }
  return null;
}

function eachLabel(node: Node, fn: (label: Label) => void): void {
  const label = node.getComponent(Label);
  if (label) fn(label);
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) eachLabel(kids[i], fn);
}
