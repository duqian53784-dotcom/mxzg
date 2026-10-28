/**
 * 挂机主面板上要写的字。只读 GameStore 和 chapterreward。
 * 不解协议。关卡没同步时标题写「主线未同步」，不编一关名字。
 * 三格和旧挂机条同一套：表上的每分钟，真服没表写 —/m，Mock 才退回旧节奏。
 */
import { chapterPlaceLabel } from "../../../config/gameCatalog";
import { chapterIdleMinute, idleCapMs } from "../../../config/rosterCatalog";
import { GameStore } from "../../../core/GameStore";
import { Session } from "../../../core/Session";
import { formatHangClock, goldPerMin, itemEveryMs } from "../../../module/idle/rewards";
import { IDLE_UNIX_FLOOR, wireIdleCapMs, wireIdleElapsedMs } from "../../../net/protocol/wireIdle";

export interface HangFace {
  caption: string;
  clock: string;
  gold: string;
  souls: string;
  exp: string;
  /** 关卡号已经从 Store 读到。没有时标题是「主线未同步」。 */
  synced: boolean;
}

export function hangFace(nowMs: number, openedAtMs: number): HangFace {
  const synced = chapterSynced();
  const idx = stageIdx();
  const rate = rates();
  return {
    caption: captionOf(synced, idx),
    clock: clockText(nowMs, openedAtMs),
    gold: rate.gold,
    souls: rate.souls,
    exp: rate.exp,
    synced,
  };
}

function chapterSynced(): boolean {
  const mock = GameStore.mockStageId();
  const chapter = GameStore.chapter();
  return (mock !== null && mock >= 1) || chapter.nowIdx !== null || chapter.maxIdx !== null;
}

function stageIdx(): number {
  const mock = GameStore.mockStageId();
  if (mock !== null && mock >= 1) return Math.floor(mock);
  const chapter = GameStore.chapter();
  if (chapter.nowIdx !== null && chapter.nowIdx >= 1) return Math.floor(chapter.nowIdx);
  if (chapter.maxIdx !== null && chapter.maxIdx >= 1) return Math.floor(chapter.maxIdx);
  return 1;
}

function captionOf(synced: boolean, idx: number): string {
  if (!synced) return "主线未同步";
  const place = chapterPlaceLabel(idx);
  if (place) return place;
  if (idx >= 1) return "第" + idx + "关";
  return "主线未同步";
}

function rates(): { gold: string; souls: string; exp: string } {
  const minute = chapterIdleMinute(stageIdx());
  if (minute) {
    return {
      gold: minute.gold + "/m",
      souls: minute.heroExp + "/m",
      exp: minute.roleExp + "/m",
    };
  }
  if (Session.source === "wire") return { gold: "—/m", souls: "—/m", exp: "—/m" };
  const cleared = clearedCount();
  const gold = goldPerMin(cleared);
  const every = itemEveryMs(cleared);
  const perMin = every > 0 ? Math.max(1, Math.round(60000 / every)) : 0;
  const sec = Math.max(1, Math.round(every / 1000));
  return { gold: gold + "/m", souls: perMin + "/m", exp: "每" + sec + "s" };
}

function clearedCount(): number {
  const stage = GameStore.mockStageId();
  if (stage !== null) return Math.max(0, stage - 1);
  const chapter = GameStore.chapter();
  if (chapter.fromStore && chapter.nowIdx !== null && chapter.nowIdx > 1) return chapter.nowIdx - 1;
  return 0;
}

function clockText(nowMs: number, openedAtMs: number): string {
  const idle = GameStore.idle();
  const now = typeof nowMs === "number" && isFinite(nowMs) ? nowMs : 0;
  if (idle.fromStore && (idle.rewardTime === null || !isFinite(idle.rewardTime) || idle.rewardTime < IDLE_UNIX_FLOOR)) {
    return "未同步";
  }
  const opened = typeof openedAtMs === "number" && isFinite(openedAtMs) ? openedAtMs : now;
  let elapsed = 0;
  if (idle.fromStore) elapsed = wireIdleElapsedMs(idle.rewardTime, now);
  else if (idle.anchorMs !== null && idle.anchorMs >= 1e9) elapsed = Math.max(0, now - idle.anchorMs);
  else elapsed = Math.max(0, now - opened);
  const cap = idle.fromStore ? wireIdleCapMs(idle.maxRewardTime, idleCapMs()) : idleCapMs();
  if (cap !== null && elapsed > cap) elapsed = cap;
  return formatHangClock(elapsed);
}
