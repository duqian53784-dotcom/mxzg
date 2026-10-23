/**
 * 这一局里点「出阵」记下的英雄。不发 3100 / 3013。
 * 真服 MAIN 仍走原来的阵容。这里只在 MAIN 还是空的时候，让挂机和出阵看同一份选择。
 */
import { GameStore } from "../core/GameStore";
import { WireSession } from "../net/WireSession";
import { mainFormationHeroes } from "../net/protocol/starterLineup";

const ids: number[] = [];
const listeners: Array<() => void> = [];

export function localLineupIds(): number[] {
  return ids.slice();
}

/** 最多 8 个。重复的丢掉。空数组表示这一局还没在出阵里确认。 */
export function setLocalLineup(next: readonly number[]): void {
  ids.length = 0;
  for (let i = 0; i < next.length; i++) {
    const id = next[i];
    if (typeof id !== "number" || !isFinite(id) || id <= 0) continue;
    const heroId = Math.floor(id);
    if (ids.indexOf(heroId) >= 0) continue;
    ids.push(heroId);
    if (ids.length >= 8) break;
  }
  for (let i = 0; i < listeners.length; i++) listeners[i]();
}

export function onLocalLineup(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    const index = listeners.indexOf(fn);
    if (index >= 0) listeners.splice(index, 1);
  };
}

/** 出阵确认过，或 3101 MAIN 里已经有英雄。 */
export function hangLineupReady(): boolean {
  return deployedHeroIds().length > 0;
}

/** 本局出阵优先。否则用商店或会话里的 MAIN。 */
export function deployedHeroIds(): number[] {
  if (ids.length > 0) return ids.slice();
  const line = GameStore.formation() || WireSession.lineUp;
  const heroes = mainFormationHeroes(line);
  const found: number[] = [];
  for (let i = 0; i < heroes.length; i++) found.push(heroes[i].heroId);
  return found;
}
