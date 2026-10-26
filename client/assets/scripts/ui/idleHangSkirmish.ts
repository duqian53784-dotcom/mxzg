/**
 * 挂机舞台上的演武。阵容站好之后一直打，不点「战斗」也打。
 * 敌人按当前关 chapter 里有 stand 的 hero_type 轮流出现，对不上就用敌方默认套。
 * 英雄播 attack，怪播 hit。套里没有 die 就打完收掉。
 * 飘字只是演出，不写钱包，不发 3001 / 3004 / 3005。
 * 点中间「战斗」进入真战报时暂停，回到挂机再继续。
 */
import { Node } from "cc";
import { chapterEnemies } from "../config/gameCatalog";
import { GameStore } from "../core/GameStore";
import { WIRE_SPINE_ENEMY_STEMS, WIRE_SPINE_HIT_STEM, wireSpineHasClip, wireSpineVfxClip } from "../net/protocol/wireBattle";
import { mountBattleSpine, SpineActor } from "./battleSpine";
import { placeHangFloats } from "./hangFloat";
import {
  IDLE_SKIRMISH_APPEAR_MS,
  IDLE_SKIRMISH_GAP_MS,
  IDLE_SKIRMISH_KILL_MS,
  IDLE_SKIRMISH_OPEN_MS,
  IDLE_SKIRMISH_SPOTS,
  IDLE_SKIRMISH_STRIKE_MS,
  IdleFoePlan,
  idleSkirmishHurt,
  idleSkirmishKillClip,
  idleSkirmishStageIdx,
  idleSkirmishSwings,
  planIdleFoe,
} from "./idleHangSkirmishPlan";
import { place, uiNode } from "./UiKit";

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
  let actors: SpineActor[] = [];
  let wave = 0;
  let swingCursor = 0;
  let generation = 0;
  let paused = false;
  let stopped = false;
  let foeNode: Node | null = null;
  let foeActor: SpineActor | null = null;
  let foe: IdleFoePlan | null = null;
  let puffNode: Node | null = null;
  let puffActor: SpineActor | null = null;
  const standGen = new Map<SpineActor, number>();

  const control = {
    pause(): void {
      if (stopped) return;
      paused = true;
      generation += 1;
      clearFoe();
      standAll();
    },
    resume(): void {
      if (stopped || !paused) return;
      paused = false;
      arm(IDLE_SKIRMISH_GAP_MS, openWave);
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
  arm(IDLE_SKIRMISH_OPEN_MS, openWave);
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
    foe = null;
    foeActor = null;
    if (foeNode && foeNode.isValid) foeNode.destroy();
    foeNode = null;
    placeHangFloats(floats, []);
    if (puffNode && puffNode.isValid) puffNode.active = false;
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
      arm(IDLE_SKIRMISH_GAP_MS, openWave);
      return;
    }
    if (actors.length === 0) {
      arm(IDLE_SKIRMISH_GAP_MS, openWave);
      return;
    }
    const chapter = GameStore.chapter();
    const stage = idleSkirmishStageIdx(GameStore.mockStageId(), chapter.nowIdx, chapter.maxIdx);
    const monsters = chapterEnemies(stage);
    foe = planIdleFoe(wave, monsters, (stem) => wireSpineHasClip(stem, "stand"), WIRE_SPINE_ENEMY_STEMS);
    const spot = IDLE_SKIRMISH_SPOTS[foe.spot];
    const node = place(uiNode("IdleFoe"), foes, spot.x, spot.y);
    const plan = foe;
    foeNode = node;
    foeActor = mountBattleSpine(node, plan.stem, () => {
      if (node.isValid) node.active = false;
    }, { face: plan.face });
    raiseFx();
    arm(IDLE_SKIRMISH_APPEAR_MS, () => strike(0));
  }

  function strike(index: number): void {
    if (blocked() || !foe || !foeActor || !foeNode || !foeNode.isValid) {
      clearFoe();
      arm(IDLE_SKIRMISH_GAP_MS, openWave);
      return;
    }
    const swings = idleSkirmishSwings(actors.length);
    const ally = actors[swingCursor % actors.length];
    swingCursor += 1;
    if (ally) {
      ally.play("attack");
      armStand(ally);
    }
    const blow = idleSkirmishHurt(foe.maxHp, index, swings);
    if (wireSpineHasClip(foe.stem, "hit")) foeActor.play("hit");
    const spot = IDLE_SKIRMISH_SPOTS[foe.spot];
    placeHangFloats(floats, [{ text: "-" + blow.hurt, x: spot.x, y: spot.y + 120, heal: false }]);
    puff(spot.x, spot.y + 40);
    raiseFx();
    if (blow.kill) arm(IDLE_SKIRMISH_STRIKE_MS, killFoe);
    else arm(IDLE_SKIRMISH_STRIKE_MS, () => strike(index + 1));
  }

  function killFoe(): void {
    if (foe && foeActor && foeNode && foeNode.isValid) {
      foeActor.play(idleSkirmishKillClip(foe.stem, wireSpineHasClip));
    }
    arm(IDLE_SKIRMISH_KILL_MS, () => {
      clearFoe();
      wave += 1;
      arm(IDLE_SKIRMISH_GAP_MS, openWave);
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
