/**
 * 挂机舞台上的演武。阵容站好之后一直打，不点「战斗」也打。
 * 敌人按当前关 chapter 里有 stand 的 hero_type 轮流出现，对不上就用敌方默认套。
 * 两波之间英雄留在地砖格上播 run，天和大理石往后滑。怪显示之后才攻击。套里没有 die 就打完收掉。
 * 飘字只是演出，不写钱包，不发 3001 / 3004 / 3005。
 * 点中间「战斗」进入真战报时暂停，回到挂机再继续。
 */
import { Node } from "cc";
import { chapterEnemies } from "../config/gameCatalog";
import { GameLog } from "../core/GameLog";
import { GameStore } from "../core/GameStore";
import { WIRE_SPINE_ENEMY_STEMS, WIRE_SPINE_HIT_STEM, wireSpineHasClip, wireSpineVfxClip } from "../net/protocol/wireBattle";
import { skillFramePaths, hitFramePaths } from "./battleFrames";
import { mountFrameReel } from "./battleFramePlay";
import { mountBattleSpine, SpineActor } from "./battleSpine";
import { placeHangFloats } from "./hangFloat";
import {
  IDLE_HANG_SPOTS,
  IDLE_SKIRMISH_APPEAR_MS,
  IDLE_SKIRMISH_GAP_MS,
  IDLE_SKIRMISH_KILL_MS,
  IDLE_SKIRMISH_OPEN_MS,
  IDLE_SKIRMISH_SPOTS,
  IDLE_SKIRMISH_STRIKE_MS,
  IdleFoePlan,
  idleMarchScroll,
  idleSkirmishHurt,
  idleSkirmishKillClip,
  idleSkirmishMayStrike,
  idleSkirmishStageIdx,
  idleSkirmishSwingClip,
  idleSkirmishSwings,
  planIdleFoe,
} from "./idleHangSkirmishPlan";
import { place, uiNode } from "./UiKit";

const MARCH_MS = 720;
const MARCH_STEPS = 8;
const FOE_LATE_MS = 2600;

export interface IdleSkirmish {
  retarget(actors: SpineActor[]): void;
  stop(): void;
}

const controls: { pause(): void; resume(): void }[] = [];

/** 真战报盖上来时停演武。 */
export function pauseIdleSkirmishes(): void {
  for (let i = 0; i < controls.length; i++) controls[i].pause();
}

/** 真战报拆掉之后继续。 */
export function resumeIdleSkirmishes(): void {
  for (let i = 0; i < controls.length; i++) controls[i].resume();
}

/** 挂到 IdleHang 上。英雄换装时 retarget。节点销毁时停。 */
export function mountIdleSkirmish(hang: Node): IdleSkirmish {
  const foes = place(uiNode("IdleFoes"), hang, 0, 0);
  const fx = place(uiNode("IdleSkirmishFx"), hang, 0, 0);
  const floats = place(uiNode("IdleSkirmishFloats"), fx, 0, 0);
  const skillReel = mountFrameReel(fx, 280, "IdleSkillReel");
  const hitReel = mountFrameReel(fx, 200, "IdleHitReel");
  let actors: SpineActor[] = [];
  let wave = 0;
  let swingCursor = 0;
  let generation = 0;
  let paused = false;
  let stopped = false;
  let foeNode: Node | null = null;
  let foeActor: SpineActor | null = null;
  let foe: IdleFoePlan | null = null;
  let foeShown = false;
  let waveGen = 0;
  let puffNode: Node | null = null;
  let puffActor: SpineActor | null = null;
  const standGen = new Map<SpineActor, number>();
  let skyBase: { x: number; y: number } | null = null;
  let hallBase: { x: number; y: number } | null = null;

  const control = {
    pause(): void {
      if (stopped) return;
      paused = true;
      generation += 1;
      clearFoe();
      restoreHomes();
      restoreScroll();
      standAll();
    },
    resume(): void {
      if (stopped || !paused) return;
      paused = false;
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
    },
  };
  controls.push(control);

  const api: IdleSkirmish = {
    retarget(next: SpineActor[]): void {
      actors = next.slice();
    },
    stop(): void {
      if (stopped) return;
      stopped = true;
      paused = true;
      generation += 1;
      clearFoe();
      const index = controls.indexOf(control);
      if (index >= 0) controls.splice(index, 1);
    },
  };

  hang.once(Node.EventType.NODE_DESTROYED, () => api.stop());
  arm(IDLE_SKIRMISH_OPEN_MS, beginCycle);
  return api;

  function arm(ms: number, fn: () => void): void {
    const gen = generation;
    const timer = setTimeout(() => {
      if (gen !== generation || stopped || !hang.isValid) return;
      fn();
    }, ms);
    const maybe = timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
  }

  function blocked(): boolean {
    if (paused || stopped || !hang.isValid || !hang.active) return true;
    const parent = hang.parent;
    if (parent && !parent.active) return true;
    if (!parent) return false;
    const battle = parent.getChildByName("HangBattle");
    return !!(battle && battle.isValid && battle.active);
  }

  function standAll(): void {
    for (let i = 0; i < actors.length; i++) actors[i].play("stand");
  }

  function armStand(actor: SpineActor): void {
    const gen = (standGen.get(actor) || 0) + 1;
    standGen.set(actor, gen);
    const timer = setTimeout(() => {
      if (standGen.get(actor) !== gen || stopped) return;
      actor.play("stand");
    }, IDLE_SKIRMISH_STRIKE_MS - 80);
    const maybe = timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
  }

  function clearFoe(): void {
    waveGen += 1;
    foeShown = false;
    foe = null;
    foeActor = null;
    if (foeNode && foeNode.isValid) foeNode.destroy();
    foeNode = null;
    placeHangFloats(floats, []);
    skillReel.stop();
    hitReel.stop();
    if (puffNode && puffNode.isValid) puffNode.active = false;
  }

  function beginCycle(): void {
    if (blocked()) {
      clearFoe();
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      return;
    }
    if (actors.length === 0) {
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      return;
    }
    march(0);
  }

  /** 先原地跑，背景平移。跑完再刷怪，怪看得见才出刀。 */
  function march(step: number): void {
    if (blocked()) {
      restoreHomes();
      restoreScroll();
      clearFoe();
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      return;
    }
    if (step === 0) {
      restoreHomes();
      playMarch();
    }
    scrollLayers(step);
    if (step < MARCH_STEPS) {
      arm(Math.round(MARCH_MS / MARCH_STEPS), () => march(step + 1));
      return;
    }
    restoreScroll();
    restoreHomes();
    standAll();
    openWave();
  }

  function playMarch(): void {
    for (let i = 0; i < actors.length; i++) {
      const actor = actors[i];
      if (actor.gesture("run")) continue;
      if (actor.gesture("walk")) continue;
      actor.play("stand");
    }
  }

  function scrollLayers(step: number): void {
    const shift = idleMarchScroll(step, MARCH_STEPS);
    const sky = hang.getChildByName("IdleSky");
    const hall = hang.getChildByName("IdleFloor");
    if (sky && sky.isValid) {
      if (!skyBase) skyBase = { x: sky.position.x, y: sky.position.y };
      sky.setPosition(skyBase.x + shift.skyX, skyBase.y + shift.skyY, 0);
    }
    if (hall && hall.isValid) {
      if (!hallBase) hallBase = { x: hall.position.x, y: hall.position.y };
      hall.setPosition(hallBase.x + shift.hallX, hallBase.y + shift.hallY, 0);
    }
  }

  function restoreScroll(): void {
    const sky = hang.getChildByName("IdleSky");
    const hall = hang.getChildByName("IdleFloor");
    if (sky && sky.isValid && skyBase) sky.setPosition(skyBase.x, skyBase.y, 0);
    if (hall && hall.isValid && hallBase) hall.setPosition(hallBase.x, hallBase.y, 0);
  }

  function restoreHomes(): void {
    const n = actors.length < IDLE_HANG_SPOTS.length ? actors.length : IDLE_HANG_SPOTS.length;
    for (let i = 0; i < n; i++) {
      const spot = IDLE_HANG_SPOTS[i];
      const home = actors[i].node.parent;
      if (home && home.isValid) home.setPosition(spot.x, spot.y, 0);
    }
  }

  function raiseFx(): void {
    if (!fx.isValid) return;
    fx.setSiblingIndex(Math.max(0, hang.children.length - 1));
    const heroes = hang.getChildByName("IdleHeroes");
    if (heroes && foes.isValid) foes.setSiblingIndex(heroes.getSiblingIndex());
  }

  function openWave(): void {
    if (blocked()) {
      clearFoe();
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      return;
    }
    if (actors.length === 0) {
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      return;
    }
    const chapter = GameStore.chapter();
    const stage = idleSkirmishStageIdx(GameStore.mockStageId(), chapter.nowIdx, chapter.maxIdx);
    const monsters = chapterEnemies(stage);
    foe = planIdleFoe(wave, monsters, (stem) => wireSpineHasClip(stem, "stand"), WIRE_SPINE_ENEMY_STEMS);
    const spot = IDLE_SKIRMISH_SPOTS[foe.spot];
    const node = place(uiNode("IdleFoe"), foes, spot.x, spot.y);
    const plan = foe;
    const gen = waveGen;
    foeNode = node;
    foeShown = false;
    foeActor = mountBattleSpine(node, plan.stem, () => {
      if (gen !== waveGen) return;
      GameLog.shared.warn("IdleHang", "foe miss spine/" + plan.stem);
      if (node.isValid) node.active = false;
      clearFoe();
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
    }, {
      face: plan.face,
      onReady: () => {
        if (gen !== waveGen || !node.isValid) return;
        foeShown = true;
        node.active = true;
        standAll();
        arm(IDLE_SKIRMISH_APPEAR_MS, () => strike(0, gen));
      },
    });
    raiseFx();
    arm(FOE_LATE_MS, () => {
      if (gen !== waveGen || foeShown) return;
      GameLog.shared.warn("IdleHang", "foe late spine/" + plan.stem);
      clearFoe();
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
    });
  }

  function strike(index: number, gen: number): void {
    if (gen !== waveGen || blocked() || !foe || !foeActor || !foeNode || !foeNode.isValid) {
      if (gen === waveGen) {
        clearFoe();
        arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      }
      return;
    }
    if (!idleSkirmishMayStrike(foeShown)) {
      GameLog.shared.warn("IdleHang", "skip swing, foe not visible");
      clearFoe();
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
      return;
    }
    const swings = idleSkirmishSwings(actors.length);
    const ally = actors[swingCursor % actors.length];
    swingCursor += 1;
    const clip = idleSkirmishSwingClip(index);
    if (ally) {
      const skilled = clip === "attack2" && ally.gesture("attack2");
      if (!skilled) ally.play("attack");
      armStand(ally);
    }
    const blow = idleSkirmishHurt(foe.maxHp, index, swings);
    if (wireSpineHasClip(foe.stem, "hit")) foeActor.play("hit");
    const spot = IDLE_SKIRMISH_SPOTS[foe.spot];
    placeHangFloats(floats, [{ text: "-" + blow.hurt, x: spot.x, y: spot.y + 108, heal: false }]);
    playSwingFx(clip, spot.x, spot.y);
    puff(spot.x, spot.y + 40);
    raiseFx();
    if (blow.kill) arm(IDLE_SKIRMISH_STRIKE_MS, () => killFoe(gen));
    else arm(IDLE_SKIRMISH_STRIKE_MS, () => strike(index + 1, gen));
  }

  function playSwingFx(clip: "attack" | "attack2", x: number, y: number): void {
    const skill = clip === "attack2";
    if (skill) {
      skillReel.node.setPosition(x, y + 48, 0);
      skillReel.play(skillFramePaths(null), (ok) => {
        if (!ok) GameLog.shared.warn("IdleHang", "skill reel miss hero-skill");
      });
    } else {
      skillReel.stop();
    }
    hitReel.node.setPosition(x, y + 24, 0);
    hitReel.play(hitFramePaths(null), (ok) => {
      if (!ok) GameLog.shared.warn("IdleHang", "hit reel miss hero-beattack");
    });
  }

  function killFoe(gen: number): void {
    if (gen !== waveGen) return;
    if (foe && foeActor && foeNode && foeNode.isValid) {
      foeActor.play(idleSkirmishKillClip(foe.stem, wireSpineHasClip));
    }
    arm(IDLE_SKIRMISH_KILL_MS, () => {
      if (gen !== waveGen) return;
      clearFoe();
      wave += 1;
      arm(IDLE_SKIRMISH_GAP_MS, beginCycle);
    });
  }

  function puff(x: number, y: number): void {
    if (!puffNode || !puffNode.isValid) {
      puffNode = place(uiNode("IdleHit"), fx, x, y);
      const node = puffNode;
      puffActor = mountBattleSpine(node, WIRE_SPINE_HIT_STEM, () => {
        if (node.isValid) node.active = false;
      }, { effect: true });
    }
    puffNode.active = true;
    puffNode.setPosition(x, y, 0);
    if (puffActor) puffActor.burst(wireSpineVfxClip(WIRE_SPINE_HIT_STEM));
  }
}
