/**
 * 回放用的帧路径。都在 resources/battle 下，给 resources.load 的是不带扩展名的路径。
 * hero-beattack 跳过只有一张小图的第 0 套。skill-101050201-3 只播编号帧，不播那张无序号底图。
 * hero-skill 的文件名是 hero-skill_effect-1-0 … 9，不是 stem_序号。
 */

export const HIT_RUNS: readonly (readonly [string, number])[] = [
  ["1", 5],
  ["2", 5],
  ["3", 3],
  ["4", 4],
  ["5", 4],
];

export const EFFECT_RUNS: readonly (readonly [string, number])[] = [
  ["duola-skill-effect-parry", 24],
  ["skill-effect-contract", 20],
  ["skill-effect-parry", 10],
  ["skill-effect-revive", 11],
  ["skill-effect-shield", 10],
  ["skill-effect-slient", 8],
  ["titan-skill-effect-contract", 21],
];

export const SKILL_RUNS: readonly (readonly [string, number])[] = [
  ["hero-skill", 10],
  ["skill-101010011", 9],
  ["skill-101020021", 11],
  ["skill-101030030", 6],
  ["skill-101040050", 7],
  ["skill-101040051", 6],
  ["skill-101040120-1", 8],
  ["skill-101040120-2", 14],
  ["skill-101050060", 11],
  ["skill-101050070", 8],
  ["skill-101050073", 19],
  ["skill-101050080", 11],
  ["skill-101050080-1", 6],
  ["skill-101050080-2", 12],
  ["skill-101050083", 11],
  ["skill-101050085", 7],
  ["skill-101050090", 18],
  ["skill-101050100", 23],
  ["skill-101050101", 21],
  ["skill-101050110", 10],
  ["skill-101050130", 8],
  ["skill-101050201-2", 23],
  ["skill-101050201-3", 11],
  ["skill-102010011", 4],
  ["skill-102020021", 14],
  ["skill-102030031", 8],
  ["skill-102040040", 14],
  ["skill-102040050", 11],
  ["skill-102050060", 8],
  ["skill-102050070", 7],
  ["skill-102050080", 7],
  ["skill-102050100", 18],
  ["skill-103010011", 7],
  ["skill-103020021", 15],
  ["skill-103030030", 12],
  ["skill-103030031", 9],
  ["skill-103040041", 11],
  ["skill-103040050", 8],
  ["skill-103040051", 10],
  ["skill-103040120", 11],
  ["skill-103050060", 18],
  ["skill-104030011", 6],
  ["skill-104040020", 9],
  ["skill-104040021", 9],
  ["skill-104040031", 9],
  ["skill-104050040", 6],
  ["skill-104050041", 11],
  ["skill-104050050", 7],
  ["skill-104050060", 14],
];

export function pickIndex(skillId: number | null, length: number): number {
  if (length <= 0) return 0;
  if (typeof skillId !== "number" || !isFinite(skillId)) return 0;
  return Math.floor(Math.abs(skillId)) % length;
}

function numbered(prefix: string, count: number): string[] {
  const paths: string[] = [];
  for (let i = 0; i < count; i++) paths.push(prefix + String(i));
  return paths;
}

export function hitFramePaths(skillId: number | null): string[] {
  const run = HIT_RUNS[pickIndex(skillId, HIT_RUNS.length)];
  const set = run[0];
  const paths: string[] = [];
  for (let i = 0; i < run[1]; i++) {
    const n = i < 10 ? "0" + String(i) : String(i);
    paths.push("battle/hero-beattack/hero-beattack_" + set + "-" + n);
  }
  return paths;
}

export function effectFramePaths(skillId: number | null): string[] {
  const run = EFFECT_RUNS[pickIndex(skillId, EFFECT_RUNS.length)];
  return numbered("battle/skill-effect/" + run[0] + "/" + run[0] + "_", run[1]);
}

export function skillFramePaths(skillId: number | null): string[] {
  const run = SKILL_RUNS[pickIndex(skillId, SKILL_RUNS.length)];
  if (run[0] === "hero-skill") {
    return numbered("battle/skill/hero-skill/hero-skill_effect-1-", run[1]);
  }
  return numbered("battle/skill/" + run[0] + "/" + run[0] + "_", run[1]);
}
