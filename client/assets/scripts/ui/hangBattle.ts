/**
 * 战斗叠在挂机壳上。底栏三钮和收益留在下面。
 * 回合写成 n/15。加速用 battle-scene 的速度图，跳过停在这一局的最后一拍。
 * 血条跟站位。战报没有怒气字段时，怒气条按当前回合 / 15 填充，只标位置。
 * 伤害红字，治疗绿字，暴击用更大的金字。数字只来自这一拍真正的血量差或战报 hurt。没有就不写 0。
 */
import { Button, Color, Label, Node, Overflow, Sprite, UITransform } from "cc";
import { BattleRound, BattleUnit } from "../module/mainline/battle";
import { paintSpeedIcon } from "./BattlePage";
import { placeHangFloats, type HangFloat } from "./hangFloat";
import { pauseIdleSkirmishes, resumeIdleSkirmishes } from "./idleHangSkirmish";
import { IDLE_SKIRMISH_SPOTS } from "./idleHangSkirmishPlan";
import { IDLE_HANG_SPOTS } from "./idleHangView";
import { createLabel, createRect, place, setText, uiNode } from "./UiKit";

export type { HangFloat };

export interface HangBar {
  x: number;
  y: number;
  hpRatio: number;
  rageRatio: number;
  ally: boolean;
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
const skipFns = new Map<Node, () => void>();

const INK = new Color(255, 236, 190, 255);
const BAR_W = 78;

/** 敌方站在殿堂后侧，和挂机演武同一组三格。 */

export function bindHangSpeed(page: Node, fn: () => void): void {
  speedFns.set(page, fn);
  page.once(Node.EventType.NODE_DESTROYED, () => speedFns.delete(page));
}

export function bindHangSkip(page: Node, fn: () => void): void {
  skipFns.set(page, fn);
  page.once(Node.EventType.NODE_DESTROYED, () => skipFns.delete(page));
}

export function setHangSpeed(page: Node, speed: number): void {
  const hold = holds.get(page);
  const next = speed === 2 || speed === 3 ? speed : 1;
  if (hold) hold.speed = next;
  const layer = layerOf(page);
  if (!layer) return;
  const node = layer.getChildByName("HangSpeed");
  if (node) paintSpeedIcon(node, next);
}

/** 前排三格用挂机站位，敌方用后侧三格。多出来的人不画条。 */
export function barsFromSides(
  allies: { hp: number; maxHp: number }[],
  enemies: { hp: number; maxHp: number }[],
  rageRatio: number
): HangBar[] {
  const out: HangBar[] = [];
  pushBars(out, allies, IDLE_HANG_SPOTS, true, rageRatio);
  pushBars(out, enemies, IDLE_SKIRMISH_SPOTS, false, rageRatio);
  return out;
}

/** 出阵之后、战报还没到时，先把中间按钮改成战斗中，并闪一下开战。 */
export function beginHangBattle(page: Node, left: string, right: string): void {
  const hold = ensureHold(page);
  hold.seq += 1;
  hold.left = left || "我方";
  hold.right = right || "敌方";
  hold.allies = null;
  hold.enemies = null;
  pauseIdleSkirmishes();
  const layer = ensureLayer(page);
  setCaption(page, "战斗中");
  const flash = layer.getChildByName("HangFlash");
  if (flash) {
    flash.active = true;
    setText(flash, "战斗开始");
  }
  paintVs(layer, hold);
  const round = layer.getChildByName("HangRound");
  if (round) setText(round, "1/15");
  setTalk(page, false);
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
  const critRound = round.line.indexOf("溃败") >= 0;
  for (let i = 0; i < floats.length; i++) {
    if (critRound && !floats[i].heal && floats[i].x < 0) floats[i].crit = true;
  }
  const rage = round.round >= 1 ? Math.min(1, round.round / 15) : 0;
  showHangStrike(page, round.round, 15, skill, floats, barsFromSides(round.allies, round.enemies, rage));
}

export function showHangStrike(
  page: Node,
  round: number,
  total: number,
  skill: string | null,
  floats: HangFloat[],
  bars?: HangBar[]
): void {
  const hold = ensureHold(page);
  const layer = ensureLayer(page);
  const flash = layer.getChildByName("HangFlash");
  if (flash) flash.active = round <= 1 && floats.length === 0;
  const cap = total >= 1 ? total : 15;
  const now = round >= 1 ? round : 1;
  const label = layer.getChildByName("HangRound");
  if (label) setText(label, now + "/" + cap);
  paintVs(layer, hold);
  const banner = layer.getChildByName("HangSkill");
  if (banner) setBanner(banner, skill);
  paintBars(layer, bars || []);
  const host = layer.getChildByName("HangFloats");
  if (!host) return;
  placeHangFloats(host, floats);
}

export function finishHangBattle(page: Node, win: boolean | null): void {
  const hold = holds.get(page);
  const seq = hold ? hold.seq : -1;
  const layer = layerOf(page);
  if (layer) {
    const banner = layer.getChildByName("HangSkill");
    if (banner) {
      if (win === true) setBanner(banner, "胜利");
      else if (win === false) setBanner(banner, "失败");
      else setBanner(banner, null);
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
  setTalk(page, true);
  setCaption(page, "战斗");
  resumeIdleSkirmishes();
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

  const roundBg = createRect("HangRoundBg", 120, 36, new Color(16, 18, 28, 180));
  place(roundBg, layer, 0, 560);
  const round = createLabel("1/15", 26, { color: INK, width: 110, height: 32 });
  round.name = "HangRound";
  place(round, layer, 0, 560);

  const vs = createLabel("我方  VS  敌方", 20, { color: INK, width: 520, height: 32 });
  vs.name = "HangVs";
  place(vs, layer, 0, 188);

  const skillBg = createRect("HangSkillBg", 280, 40, new Color(28, 16, 48, 200));
  skillBg.name = "HangSkill";
  skillBg.active = false;
  place(skillBg, layer, 0, 150);
  const skill = createLabel("", 26, { color: INK, width: 260, height: 36 });
  place(skill, skillBg, 0, 0);

  const bars = uiNode("HangBars");
  place(bars, layer, 0, 0);
  const floats = uiNode("HangFloats");
  place(floats, layer, 0, 0);

  const speed = uiNode("HangSpeed");
  const speedUi = speed.addComponent(UITransform);
  speedUi.setContentSize(73, 78);
  const speedSprite = speed.addComponent(Sprite);
  speedSprite.sizeMode = Sprite.SizeMode.CUSTOM;
  place(speed, layer, -300, 540);
  paintSpeedIcon(speed, 1);
  if (!speed.getComponent(Button)) speed.addComponent(Button);
  speed.on(Button.EventType.CLICK, () => tapSpeed(page, speed));

  const skip = createLabel("跳过", 22, { color: INK, width: 88, height: 40 });
  skip.name = "HangSkip";
  const skipBg = createRect("HangSkipBg", 96, 44, new Color(46, 110, 190, 230));
  place(skipBg, layer, 300, 540);
  place(skip, skipBg, 0, 0);
  if (!skipBg.getComponent(Button)) skipBg.addComponent(Button);
  skipBg.on(Button.EventType.CLICK, () => tapSkip(page));
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
  paintSpeedIcon(node, hold.speed);
}

function tapSkip(page: Node): void {
  const fn = skipFns.get(page);
  if (fn) fn();
}

function setBanner(banner: Node, text: string | null): void {
  banner.active = !!text;
  const kids = banner.children;
  for (let i = 0; i < kids.length; i++) {
    if (text) setText(kids[i], text);
  }
}

function paintBars(layer: Node, bars: HangBar[]): void {
  const host = layer.getChildByName("HangBars");
  if (!host) return;
  const old = host.children.slice();
  for (let i = 0; i < old.length; i++) old[i].destroy();
  for (let i = 0; i < bars.length && i < 6; i++) {
    const row = bars[i];
    const root = uiNode("HangBar");
    place(root, host, row.x, row.y);
    place(createRect("hpBg", BAR_W, 8, new Color(20, 16, 16, 220)), root, 0, 8);
    const hp = Math.min(1, Math.max(0, row.hpRatio));
    if (hp > 0) {
      const width = BAR_W * hp;
      place(
        createRect("hp", width, 8, row.ally ? new Color(72, 210, 96, 255) : new Color(220, 64, 56, 255)),
        root,
        -BAR_W / 2 + width / 2,
        8
      );
    }
    place(createRect("rageBg", BAR_W, 6, new Color(16, 20, 36, 220)), root, 0, -2);
    const rage = Math.min(1, Math.max(0, row.rageRatio));
    if (rage > 0) {
      const width = BAR_W * rage;
      place(createRect("rage", width, 6, new Color(72, 156, 255, 255)), root, -BAR_W / 2 + width / 2, -2);
    }
  }
}

function pushBars(
  out: HangBar[],
  units: { hp: number; maxHp: number }[],
  spots: ReadonlyArray<{ x: number; y: number }>,
  ally: boolean,
  rageRatio: number
): void {
  const n = units.length < spots.length ? units.length : spots.length;
  for (let i = 0; i < n; i++) {
    const max = units[i].maxHp;
    const hp = units[i].hp;
    if (typeof max !== "number" || !isFinite(max) || max <= 0) continue;
    if (typeof hp !== "number" || !isFinite(hp)) continue;
    out.push({
      x: spots[i].x,
      y: spots[i].y + 108,
      hpRatio: hp <= 0 ? 0 : hp >= max ? 1 : hp / max,
      rageRatio,
      ally,
    });
  }
}

function setTalk(page: Node, visible: boolean): void {
  const host = battleHost(page);
  const hang = host.getChildByName("IdleHang");
  if (!hang) return;
  const kids = hang.children;
  for (let i = 0; i < kids.length; i++) {
    if (kids[i].name === "IdleTalk") kids[i].active = visible;
  }
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
