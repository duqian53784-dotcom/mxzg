/**
 * 战斗叠在挂机壳上。底栏三钮和收益留在下面。
 * 回合写成 n/15。加速用 battle-scene 的速度图，跳过停在这一局的最后一拍。
 * 血条跟站位。战报没有怒气字段时，怒气条按当前回合 / 15 填充，只标位置。
 * 飘字数字走 yellow-73 / green-73 / red-73。字库没挂上时退回红、绿、金系统字。
 * 技能名用 font/FZCSJW-GB1-0，和战斗壳 SkillNameLabel 同一套字。没挂上仍是系统字。
 * 开战标题用 spine/ZDKS（图里已经有「战斗开始」）。套没挂上才写系统字，不叠两层。
 * 出场光只打在有模型的一侧，中心对齐那一侧的人。没有模型的一侧不播。
 * 数字只来自这一拍真正的血量差或战报 hurt。没有就不写 0。
 */
import { Button, Color, Label, Node, Overflow, resources, Sprite, SpriteFrame, TTFFont, UITransform } from "cc";
import { chapterStageEnemies } from "../config/gameCatalog";
import { messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { GameStore } from "../core/GameStore";
import { Session } from "../core/Session";
import { BattleRound, BattleUnit } from "../module/mainline/battle";
import { wireSpineHasClip } from "../net/protocol/wireBattle";
import { paintSpeedIcon } from "./BattlePage";
import { battleAppearFramePaths } from "./battleAppear";
import { battleFrameStep, mountFrameReel } from "./battleFramePlay";
import { mountBattleSpine, mountNamedSpine } from "./battleSpine";
import { placeHangFloats, type HangFloat } from "./hangFloat";
import { pauseIdleSkirmishes, resumeIdleSkirmishes } from "./idleHangSkirmish";
import { hangAppearAnchor, hangFightStageId, hangStandPoint, IDLE_HANG_SPOTS, IDLE_SKIRMISH_SPOTS, planHangFightLine } from "./idleHangSkirmishPlan";
import { hangSpineStem } from "./idleHangRoster";
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

/** 出阵之后先把中间按钮改成战斗中，并闪一下开战。右侧怪从战报守方或 chapter 表摆上。 */
export function beginHangBattle(page: Node, left: string, right: string): void {
  const hold = ensureHold(page);
  hold.seq += 1;
  hold.left = left || "我方";
  hold.right = right || "敌方";
  hold.allies = null;
  hold.enemies = null;
  pauseIdleSkirmishes();
  const layer = ensureLayer(page);
  const foes = seatHangEnemies(layer);
  setCaption(page, "战斗中");
  playOpenVfx(layer);
  playHangAppear(layer, hold.speed, allyModelPoints(page), foes);
  paintVs(layer, hold);
  const round = layer.getChildByName("HangRound");
  if (round) setText(round, "1/15");
  setTalk(page, false);
}

export function showMockRound(page: Node, round: BattleRound, stageId: number): void {
  const hold = ensureHold(page);
  if (!hold.right) hold.right = "第" + stageId + "关";
  const floats: HangFloat[] = [];
  pushSide(floats, hold.allies, round.allies, "ally", false);
  pushSide(floats, hold.enemies, round.enemies, "enemy", round.line.indexOf("溃败") >= 0);
  hold.allies = round.allies.map(copyUnit);
  hold.enemies = round.enemies.map(copyUnit);
  const skill = skillFromLine(round.line);
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
  if (flash && (titleOnSpine || round > 1 || floats.length > 0)) flash.active = false;
  if (!flash || !flash.active) stopHangAppear(layer);
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
  if (layer) stopHangAppear(layer);
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
  dropHangReplay(page);
  setTalk(page, true);
  setCaption(page, "战斗");
  resumeIdleSkirmishes();
}

/**
 * 把战报的站场和特效抬到挂机壳上，大理石留在下面。
 * 不抬整页 BattlePage，它的森林底会盖住殿堂。也不抬飘字层，挂机条已经在画飘字。
 * 演武英雄先藏起来，避免和战报站位叠两套人。
 */
export function liftHangReplay(page: Node, field: Node | null, vfx: Node | null): void {
  const host = shellOf(page) || page;
  if (!host.isValid) return;
  setIdleCast(host, false);
  const hang = host.getChildByName("IdleHang");
  seatLifted(host, field, hang);
  if (field) seatHangField(field);
  seatLifted(host, vfx, field && field.parent === host ? field : hang);
  const hud = host.getChildByName("HangBattle");
  if (hud && hud.isValid) hud.setSiblingIndex(Math.max(0, host.children.length - 1));
}

/** 拆掉抬上来的站场和特效。战斗 HUD 还在时不把演武英雄放回来。 */
export function dropHangReplay(page: Node): void {
  const host = shellOf(page) || page;
  if (!host.isValid) return;
  const kids = host.children.slice();
  for (let i = 0; i < kids.length; i++) {
    const kid = kids[i] as Node & { mxzgLifted?: boolean };
    if (kid.mxzgLifted && kid.isValid) kid.destroy();
  }
  const fighting = holds.has(page) || !!host.getChildByName("HangBattle");
  if (!fighting) setIdleCast(host, true);
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
  const shell = shellOf(page);
  if (shell && shell.active) return shell;
  return page;
}

function shellOf(page: Node): Node | null {
  const shell = page.getChildByName("PagePrefabShell");
  return shell && shell.isValid ? shell : null;
}

function seatLifted(host: Node, node: Node | null, after: Node | null): void {
  if (!node || !node.isValid) return;
  const lifted = node as Node & { mxzgLifted?: boolean };
  lifted.mxzgLifted = true;
  if (node.parent !== host) node.parent = host;
  const at = after && after.isValid && after.parent === host ? after.getSiblingIndex() + 1 : 0;
  node.setSiblingIndex(Math.min(at, Math.max(0, host.children.length - 1)));
}

/** 战报格子从森林左右排挪到挂机地砖。和演武同一组点。 */
export function seatHangField(field: Node): void {
  for (let i = 0; i < IDLE_HANG_SPOTS.length; i++) {
    const ally = findNamed(field, "Slot_A" + i);
    const enemy = findNamed(field, "Slot_E" + i);
    const allySpot = hangStandPoint("ally", i);
    const enemySpot = hangStandPoint("enemy", i);
    if (ally) ally.setPosition(allySpot.x, allySpot.y, 0);
    if (enemy) enemy.setPosition(enemySpot.x, enemySpot.y, 0);
  }
}

/** 飘字落在这一侧的地砖站位头顶。 */
export function hangFloatOrigin(side: "ally" | "enemy", index: number): { x: number; y: number } {
  const spot = hangStandPoint(side, index);
  return { x: spot.x, y: spot.y + 108 };
}

function setIdleCast(host: Node, active: boolean): void {
  const hang = host.getChildByName("IdleHang");
  if (!hang || !hang.isValid) return;
  const heroes = hang.getChildByName("IdleHeroes");
  if (heroes) heroes.active = active;
  const foes = hang.getChildByName("IdleFoes");
  if (foes) foes.active = active;
}

let openVfxMiss = false;
let appearMiss = false;
/** ZDKS 图里已经写着「战斗开始」。挂上之后不再另写一层系统字。 */
let titleOnSpine = false;

interface AppearRun {
  stop(): void;
}

const appearRuns = new Map<Node, AppearRun>();

/** 只在有模型的一侧播出场光，光心落在这些人身上。另一侧清掉上一局留下的帧。 */
function playHangAppear(
  layer: Node,
  speed: number,
  allies: ReadonlyArray<{ x: number; y: number }>,
  enemies: ReadonlyArray<{ x: number; y: number }>
): void {
  stopHangAppear(layer);
  const timers: Array<ReturnType<typeof setTimeout>> = [];
  const stops: Array<() => void> = [];
  const step = battleFrameStep(speed);
  const left = hangAppearAnchor(allies);
  const right = hangAppearAnchor(enemies);
  const arm = (name: string, at: { x: number; y: number } | null, side: "left" | "right") => {
    const old = layer.getChildByName(name);
    if (old) old.destroy();
    if (!at) {
      const which = side === "left" ? "左侧" : "右侧";
      GameLog.shared.info("Mainline", "开战出场光跳过" + which + "，这一侧没有模型");
      return;
    }
    const paths = battleAppearFramePaths(side);
    const reel = mountFrameReel(layer, 240, name);
    reel.node.setPosition(at.x, at.y, 0);
    stops.push(() => reel.stop());
    reel.play(paths, (ok) => {
      if (!ok) noteAppearMiss();
    });
    const timer = setTimeout(() => reel.stop(), paths.length * step + 40);
    const maybe = timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
    timers.push(timer);
  };
  arm("HangAppearLeft", left, "left");
  arm("HangAppearRight", right, "right");
  const stop = () => {
    for (let i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    for (let i = 0; i < stops.length; i++) stops[i]();
  };
  appearRuns.set(layer, { stop });
  const hooked = layer as Node & { mxzgAppearHook?: boolean };
  if (!hooked.mxzgAppearHook) {
    hooked.mxzgAppearHook = true;
    layer.on(Node.EventType.NODE_DESTROYED, () => {
      const run = appearRuns.get(layer);
      if (!run) return;
      run.stop();
      appearRuns.delete(layer);
    });
  }
}

function stopHangAppear(layer: Node): void {
  const run = appearRuns.get(layer);
  if (!run) return;
  run.stop();
  appearRuns.delete(layer);
}

function noteAppearMiss(): void {
  if (appearMiss) return;
  appearMiss = true;
  GameLog.shared.warn("Mainline", "开战出场帧 battle-appear 没有挂上，仍写战斗开始");
}

function playOpenVfx(layer: Node): void {
  const flash = layer.getChildByName("HangFlash");
  if (flash) flash.active = false;
  titleOnSpine = false;
  let host = layer.getChildByName("HangOpenVfx");
  if (!host || !host.isValid) {
    host = uiNode("HangOpenVfx");
    host.addComponent(UITransform).setContentSize(220, 220);
    place(host, layer, 0, 180);
  }
  mountNamedSpine(host, "ZDKS", "stand", {
    loop: false,
    onReady: () => {
      titleOnSpine = true;
      if (flash && flash.isValid) flash.active = false;
    },
    onFail: () => {
      titleOnSpine = false;
      if (flash && flash.isValid) {
        flash.active = true;
        setText(flash, "战斗开始");
      }
      if (openVfxMiss) return;
      openVfxMiss = true;
      GameLog.shared.warn("Mainline", "开战特效 spine/ZDKS 没有挂上，仍写战斗开始");
    },
  });
}

function paintHangSprite(node: Node, path: string, miss: string): void {
  const sprite = node.getComponent(Sprite);
  if (!sprite) return;
  try {
    resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
      if (!node.isValid) return;
      if (err || !asset) {
        GameLog.shared.warn("Mainline", miss);
        return;
      }
      sprite.spriteFrame = asset;
    });
  } catch (err) {
    GameLog.shared.warn("Mainline", miss);
  }
}

/**
 * 演武暂停时会清掉右侧的怪。这里按战报守方或 chapter.note 再摆上。
 * 关号用进战 idx：max_idx 是 chapterId，打的是下一关。两个 idx 都没有就不造第 1 关。
 * 没有关卡、表是空的、类型没有 stand、spine 路径挂不上时只打日志，不补默认怪。
 * 返回摆上的站位。空数组表示右侧没有模型。
 */
function seatHangEnemies(layer: Node): { x: number; y: number }[] {
  try {
    const old = layer.getChildByName("HangFoes");
    if (old) old.destroy();
    const wire = Session.source === "wire" || GameStore.source === "wire";
    const chapter = GameStore.chapter();
    const stageId = hangFightStageId(GameStore.mockStageId(), chapter.nowIdx, chapter.maxIdx, wire);
    const rows = stageId === null ? [] : chapterStageEnemies(stageId);
    const monsters: { heroType: number; hp: number | null; name: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      monsters.push({ heroType: rows[i].heroType, hp: rows[i].hp, name: rows[i].name });
    }
    const match = GameStore.battle();
    const report = match && match.report ? match.report.defHeroes : null;
    const line = planHangFightLine(stageId, monsters, (stem) => wireSpineHasClip(stem, "stand"), fightReport(report));
    if (line.foes.length === 0) {
      const stageText = stageId === null ? "关号未同步" : "关" + stageId;
      GameLog.shared.warn("Mainline", "开战敌方没有摆上 " + stageText + " " + line.reason);
      return [];
    }
    const host = uiNode("HangFoes");
    place(host, layer, 0, 0);
    host.setSiblingIndex(0);
    const names: string[] = [];
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < line.foes.length; i++) {
      const foe = line.foes[i];
      names.push(foe.stem);
      const spot = hangStandPoint("enemy", foe.spot);
      points.push({ x: spot.x, y: spot.y });
      const slot = place(uiNode("HangFoe"), host, spot.x, spot.y);
      mountBattleSpine(slot, foe.stem, () => {
        GameLog.shared.warn("Mainline", "开战敌方 spine/" + foe.stem + " 没有挂上");
        if (slot.isValid) slot.active = false;
      }, { face: spot.face });
    }
    const stageText = line.stageId === null ? "—" : String(line.stageId);
    GameLog.shared.info(
      "Mainline",
      "开战敌方 " + line.source + " 关" + stageText + " " + names.join(",") + " spine/" + names.join(",spine/") + " " + line.reason
    );
    return points;
  } catch (err) {
    GameLog.shared.warn("Mainline", "开战敌方没有摆上 " + messageOf(err));
    return [];
  }
}

/** 战报 hero_id 对不上套时，用名册 hero_type。两边都不是套名就留原 id，让后面打日志。 */
function fightReport(
  heroes: { heroId: number | null; hp: number | null; maxHp: number | null }[] | null
): { heroId: number | null; hp: number | null; maxHp: number | null }[] | null {
  if (!heroes) return null;
  const roster = GameStore.heroes();
  const out: { heroId: number | null; hp: number | null; maxHp: number | null }[] = [];
  for (let i = 0; i < heroes.length; i++) {
    const hero = heroes[i];
    out.push({ heroId: spineIdOf(hero.heroId, roster), hp: hero.hp, maxHp: hero.maxHp });
  }
  return out;
}

function spineIdOf(
  heroId: number | null,
  roster: { heroId: number | null; heroType: number | null }[] | null
): number | null {
  if (typeof heroId !== "number" || !isFinite(heroId) || heroId <= 0) return heroId;
  const id = Math.floor(heroId);
  let type: number | null = null;
  if (roster) {
    for (let i = 0; i < roster.length; i++) {
      if (roster[i].heroId === id) {
        type = roster[i].heroType;
        break;
      }
    }
  }
  const stem = hangSpineStem(id, type);
  const parsed = Number(stem);
  if (!isFinite(parsed) || parsed <= 0) return id;
  return Math.floor(parsed);
}

/** 大理石上还站着的我方。含窄屏把整列右移的那段。没有人就空。 */
function allyModelPoints(page: Node): { x: number; y: number }[] {
  const host = battleHost(page);
  const hang = host.getChildByName("IdleHang");
  if (!hang || !hang.isValid) return [];
  const heroes = hang.getChildByName("IdleHeroes");
  if (!heroes) return [];
  const out: { x: number; y: number }[] = [];
  const kids = heroes.children;
  for (let i = 0; i < kids.length; i++) {
    const kid = kids[i];
    if (!kid.active) continue;
    out.push({
      x: hang.position.x + heroes.position.x + kid.position.x,
      y: hang.position.y + heroes.position.y + kid.position.y,
    });
  }
  return out;
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
  flash.active = false;
  place(flash, layer, 0, 250);

  const roundBg = createRect("HangRoundBg", 160, 36, new Color(16, 18, 28, 180));
  place(roundBg, layer, 0, 560);
  const roundPlate = uiNode("HangRoundPlate");
  const plateUi = roundPlate.addComponent(UITransform);
  plateUi.setContentSize(160, 36);
  const plateSprite = roundPlate.addComponent(Sprite);
  plateSprite.sizeMode = Sprite.SizeMode.CUSTOM;
  place(roundPlate, roundBg, 0, 0);
  paintHangSprite(roundPlate, "ui/battle/battle-end_spr-round-bg", "回合牌 battle-end_spr-round-bg 没有挂上，仍用色块");
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
  skill.name = "HangSkillName";
  place(skill, skillBg, 0, 0);
  armHangSkillFont(skill);

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
  const skipBg = createRect("HangSkipBg", 74, 76, new Color(46, 110, 190, 230));
  place(skipBg, layer, 300, 540);
  const skipPlate = uiNode("HangSkipPlate");
  const skipUi = skipPlate.addComponent(UITransform);
  skipUi.setContentSize(74, 76);
  const skipSprite = skipPlate.addComponent(Sprite);
  skipSprite.sizeMode = Sprite.SizeMode.CUSTOM;
  place(skipPlate, skipBg, 0, 0);
  paintHangSprite(skipPlate, "ui/battle/battle-scene_btn-speed-11", "跳过钮 battle-scene_btn-speed-11 没有挂上，仍写跳过");
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

const HANG_SKILL_FONT = "font/FZCSJW-GB1-0";
let hangSkillFont: TTFFont | null = null;

/** 技能名用战斗壳同一套方正字。加载失败留着系统字，并打一次日志。 */
function armHangSkillFont(node: Node): void {
  const label = node.getComponent(Label);
  if (!label) return;
  if (hangSkillFont) {
    label.useSystemFont = false;
    label.font = hangSkillFont;
    return;
  }
  resources.load(HANG_SKILL_FONT, TTFFont, (err, font) => {
    if (!node.isValid) return;
    if (err || !font) {
      GameLog.shared.warn("Mainline", "技能名字体 FZCSJW 没有挂上，仍用系统字");
      return;
    }
    hangSkillFont = font;
    label.useSystemFont = false;
    label.font = font;
  });
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

function pushSide(
  out: HangFloat[],
  prev: BattleUnit[] | null,
  next: BattleUnit[],
  side: "ally" | "enemy",
  crit: boolean
): void {
  if (!prev) return;
  const n = prev.length < next.length ? prev.length : next.length;
  for (let i = 0; i < n && i < 3; i++) {
    const delta = prev[i].hp - next[i].hp;
    if (!isFinite(delta) || delta === 0) continue;
    const heal = delta < 0;
    const amount = heal ? -delta : delta;
    const at = hangFloatOrigin(side, i);
    out.push({
      text: (heal ? "+" : "-") + String(amount),
      x: at.x,
      y: at.y,
      heal,
      crit: crit && !heal,
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
