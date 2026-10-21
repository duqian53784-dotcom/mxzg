import { GameLog } from "../core/GameLog";
import { Session } from "../core/Session";
import { NetClient } from "./NetClient";
import {
  decodeWireChapter,
  formatWireMainline,
  WIRE_CHAPTER_CMD,
  wireChapterHasIdx,
  wireChapterNote,
  WireChapterProgress,
} from "./protocol/wireChapter";
import {
  decodeWireIdle,
  decodeWireIdleClaim,
  WIRE_IDLE_CLAIM_CMD,
  WIRE_IDLE_CMD,
  wireIdleClaimNote,
  wireIdleHasTime,
  wireIdleNote,
  WireIdleClaim,
  WireIdleSnapshot,
} from "./protocol/wireIdle";
import {
  decodeWireRole,
  WIRE_ROLE_CMD,
  wireProfileHasBar,
  wireProfileNote,
  WireRoleProfile,
} from "./protocol/wireProfile";
import { wireBody } from "./protocol/wireLogin";

/**
 * ?transport=ws 登录进主城后，这条 NetClient 要活过 Boot 切场景。
 * 心跳 1004 继续发。
 * 连上就听 wire.2001、wire.3007、wire.3004 和 wire.3005。
 * 登录成功后先发空的 c2s 2001（日志里的拉角色资料），紧接着发空的 c2s 3007，
 * 再发空的 c2s 3004（挂机奖励列表）。不等 s2c 2001，也不夹那一长串别的号。
 * s2c 2001 按 Role.proto：字段 9 角色名、字段 6 等级、字段 2 金币、字段 1 宝石（顶栏钻石）。
 * s2c 3007 按 Battle.proto：字段 2 now_idx、字段 3 max_idx。缺的 idx 不写成 0。
 * 不写 Session.stageId，主城按钮用 mainlineLabel()。
 * 至少有一个 idx 时点按钮打开只读代码页；两个都没有仍 Toast。
 * 不打开 Mock 关卡页，不发 3002 / 3010。
 * s2c 3004 按 Battle.proto：字段 1 reward_time、字段 2 max_reward_time。缺的不写成 0。
 * 不写 Session.gold。挂机页用 rewardTime / maxRewardTime。没有这两项时主城挂机只 Toast。
 * s2c 3005 只改 reward_time。没有奖励清单，不改金币和钻石。
 * 缺的顶栏字段不写，那个格子保持未同步。字段 5 是奖杯，不写进金币。开服天不推。
 * 别的 s2c 仍只记 wire.<cmdId>。解不开就忽略，不抛进拆帧循环。
 */
export class WireSession {
  static net: NetClient | null = null;

  /** s2c 3007 字段 2。没出现过是 null。 */
  static nowIdx: number | null = null;
  /** s2c 3007 字段 3。0 是服上的 0。没出现过是 null。 */
  static maxIdx: number | null = null;
  /** s2c 3004 字段 1。0 是服上的 0。没出现过是 null。 */
  static rewardTime: number | null = null;
  /** s2c 3004 字段 2。0 是服上的 0。没出现过是 null。 */
  static maxRewardTime: number | null = null;
  /** 每处理一帧 s2c 3005 加一。挂机页用来认领回包。 */
  static claimSerial = 0;
  /** 最近一帧 s2c 3005 的说明。不写金币。 */
  static claimNote = "";

  private static watched: NetClient | null = null;
  private static offProfile: (() => void) | null = null;
  private static offChapter: (() => void) | null = null;
  private static offIdle: (() => void) | null = null;
  private static offIdleClaim: (() => void) | null = null;
  private static pending: WireRoleProfile | null = null;
  private static pendingChapter: WireChapterProgress | null = null;
  private static pendingIdle: WireIdleSnapshot | null = null;
  private static listeners = new Set<() => void>();

  /** 套接字一开就听。登录回包里如果已经夹着 2001、3007 或 3004，先记下，等角色写入后再套上。 */
  static watch(net: NetClient): void {
    if (this.watched === net && this.offProfile && this.offChapter && this.offIdle && this.offIdleClaim) return;
    this.unhook();
    this.watched = net;
    this.offProfile = net.subscribe(WIRE_ROLE_CMD, (msg) => this.onRole(msg.data));
    this.offChapter = net.subscribe(WIRE_CHAPTER_CMD, (msg) => this.onChapter(msg.data));
    this.offIdle = net.subscribe(WIRE_IDLE_CMD, (msg) => this.onIdle(msg.data));
    this.offIdleClaim = net.subscribe(WIRE_IDLE_CLAIM_CMD, (msg) => this.onIdleClaim(msg.data));
  }

  static hold(net: NetClient): void {
    if (this.net && this.net !== net) this.net.close();
    this.net = net;
    this.watch(net);
  }

  /**
   * 这次进主城还没看到新的 s2c 3007 / 3004。丢掉上一名角色的 idx 和挂机时间。
   * 登录过程中先到的包仍留在 pending，接着 flush 再写。
   */
  static prepareCity(): void {
    this.nowIdx = null;
    this.maxIdx = null;
    this.rewardTime = null;
    this.maxRewardTime = null;
    this.claimNote = "";
    this.claimSerial = 0;
  }

  /** 只放下引用。调用方自己 close。 */
  static release(net: NetClient | null): void {
    if (net && this.net === net) this.net = null;
    if (net && this.watched === net) {
      this.unhook();
      this.watched = null;
      this.pending = null;
      this.pendingChapter = null;
      this.pendingIdle = null;
      this.nowIdx = null;
      this.maxIdx = null;
      this.rewardTime = null;
      this.maxRewardTime = null;
      this.claimNote = "";
      this.claimSerial = 0;
    }
  }

  static close(): void {
    const net = this.net;
    this.net = null;
    this.unhook();
    this.watched = null;
    this.pending = null;
    this.pendingChapter = null;
    this.pendingIdle = null;
    this.nowIdx = null;
    this.maxIdx = null;
    this.rewardTime = null;
    this.maxRewardTime = null;
    this.claimNote = "";
    this.claimSerial = 0;
    if (net) net.close();
  }

  /** 顶栏或主线按钮有变化时通知。MainApp 用来重画。 */
  static onSync(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** applyWireRole 之后调用。登录过程中先到的资料在这里写上。 */
  static flush(): void {
    this.commit();
    this.commitChapter();
    this.commitIdle();
  }

  /** 空的 c2s 2001。旧桥日志里这一帧没有包体。 */
  static pullRoleProfile(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ROLE_CMD);
  }

  /**
   * 空的 c2s 3007。旧桥日志三例都在 c2s 2001 之后的进游戏同步里发这一帧，包体是空的。
   * 这里跟在 pullRoleProfile 后面发，不等 s2c 2001，也不发夹在中间的其它号。
   */
  static pullChapter(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_CHAPTER_CMD);
  }

  /** 主城「主线」按钮。还没有 now_idx / max_idx 时是「主线 · 未同步」。 */
  static mainlineLabel(): string {
    return formatWireMainline(this.nowIdx, this.maxIdx);
  }

  /** 主城主线入口。两个 idx 都没出现过就不打开只读页。max_idx=0 算有。 */
  static hasChapter(): boolean {
    return wireChapterHasIdx({ nowIdx: this.nowIdx, maxIdx: this.maxIdx });
  }

  /**
   * 空的 c2s 3004。跟在 pullChapter 后面发，不等 s2c 2001。
   * 旧桥日志里这一帧在空 c2s 3007 之后，包体是空的。
   */
  static pullIdle(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_IDLE_CMD);
  }

  /** 空的 c2s 3005。没连上时返回 false，调用方 Toast。 */
  static claimIdle(): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    net.send(WIRE_IDLE_CLAIM_CMD);
    return true;
  }

  /** 主城挂机入口。两个时间都没出现过就是还没同步。 */
  static hasIdle(): boolean {
    return wireIdleHasTime({ rewardTime: this.rewardTime, maxRewardTime: this.maxRewardTime });
  }

  private static onRole(data: unknown): void {
    let profile: WireRoleProfile | null = null;
    try {
      profile = decodeWireRole(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 2001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!profile) {
      GameLog.shared.info("Wire", "s2c 2001 解不开，顶栏不改");
      return;
    }
    if (!wireProfileHasBar(profile)) {
      GameLog.shared.info("Wire", "s2c 2001 没有可写入顶栏的字段，顶栏不改");
      return;
    }
    this.remember(profile);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 2001 先记下：" + wireProfileNote(this.pending || profile));
      return;
    }
    this.commit();
  }

  private static onChapter(data: unknown): void {
    let progress: WireChapterProgress | null = null;
    try {
      progress = decodeWireChapter(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3007 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!progress) {
      GameLog.shared.info("Wire", "s2c 3007 解不开，主线不改");
      return;
    }
    if (!wireChapterHasIdx(progress)) {
      GameLog.shared.info("Wire", "s2c 3007 没有 now_idx/max_idx，主线不改");
      return;
    }
    this.rememberChapter(progress);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 3007 先记下：" + wireChapterNote(this.pendingChapter || progress));
      return;
    }
    this.commitChapter();
  }

  private static onIdle(data: unknown): void {
    let snapshot: WireIdleSnapshot | null = null;
    try {
      snapshot = decodeWireIdle(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3004 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snapshot) {
      GameLog.shared.info("Wire", "s2c 3004 解不开，挂机不改");
      return;
    }
    if (!wireIdleHasTime(snapshot)) {
      GameLog.shared.info("Wire", "s2c 3004 没有 reward_time/max_reward_time，挂机不改");
      return;
    }
    this.rememberIdle(snapshot);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 3004 先记下：" + wireIdleNote(this.pendingIdle || snapshot));
      return;
    }
    this.commitIdle();
  }

  private static onIdleClaim(data: unknown): void {
    let claim: WireIdleClaim | null = null;
    try {
      claim = decodeWireIdleClaim(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3005 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      this.finishClaim("s2c 3005 解不开，金币不改");
      return;
    }
    if (!claim) {
      GameLog.shared.info("Wire", "s2c 3005 解不开，金币不改");
      this.finishClaim("s2c 3005 解不开，金币不改");
      return;
    }
    if (claim.rewardTime === null) {
      GameLog.shared.info("Wire", "s2c 3005 没有 reward_time，金币不改");
      this.finishClaim("s2c 3005 没有 reward_time，金币不改");
      return;
    }
    const inCity = Session.source === "wire" && !!Session.role;
    if (this.pendingIdle) {
      this.pendingIdle = {
        rewardTime: claim.rewardTime,
        maxRewardTime: this.pendingIdle.maxRewardTime,
      };
    } else if (!inCity) {
      this.pendingIdle = { rewardTime: claim.rewardTime, maxRewardTime: null };
    }
    if (inCity) this.rewardTime = claim.rewardTime;
    const note = "s2c 3005 " + wireIdleClaimNote(claim);
    GameLog.shared.info("Wire", note);
    this.finishClaim(note);
  }

  /** 后到的包只补上自己有的字段，不把先记下、这一包没有的格子清掉。 */
  private static remember(profile: WireRoleProfile): void {
    const prev = this.pending;
    this.pending = {
      name: profile.name !== null ? profile.name : prev ? prev.name : null,
      level: profile.level !== null ? profile.level : prev ? prev.level : null,
      gold: profile.gold !== null ? profile.gold : prev ? prev.gold : null,
      diamond: profile.diamond !== null ? profile.diamond : prev ? prev.diamond : null,
    };
  }

  private static rememberChapter(progress: WireChapterProgress): void {
    const prev = this.pendingChapter;
    this.pendingChapter = {
      nowIdx: progress.nowIdx !== null ? progress.nowIdx : prev ? prev.nowIdx : null,
      maxIdx: progress.maxIdx !== null ? progress.maxIdx : prev ? prev.maxIdx : null,
    };
  }

  private static rememberIdle(snapshot: WireIdleSnapshot): void {
    const prev = this.pendingIdle;
    this.pendingIdle = {
      rewardTime: snapshot.rewardTime !== null ? snapshot.rewardTime : prev ? prev.rewardTime : null,
      maxRewardTime: snapshot.maxRewardTime !== null ? snapshot.maxRewardTime : prev ? prev.maxRewardTime : null,
    };
  }

  private static commit(): void {
    const profile = this.pending;
    if (!profile || !wireProfileHasBar(profile)) return;
    if (
      !Session.applyWireSync({
        name: profile.name,
        level: profile.level,
        gold: profile.gold,
        diamond: profile.diamond,
      })
    ) {
      return;
    }
    this.pending = null;
    GameLog.shared.info("Wire", wireProfileNote(profile));
    this.emit();
  }

  private static commitChapter(): void {
    const progress = this.pendingChapter;
    if (!progress || !wireChapterHasIdx(progress)) return;
    if (Session.source !== "wire" || !Session.role) return;
    if (progress.nowIdx !== null) this.nowIdx = progress.nowIdx;
    if (progress.maxIdx !== null) this.maxIdx = progress.maxIdx;
    this.pendingChapter = null;
    GameLog.shared.info("Wire", wireChapterNote(progress));
    this.emit();
  }

  private static commitIdle(): void {
    const snapshot = this.pendingIdle;
    if (!snapshot || !wireIdleHasTime(snapshot)) return;
    if (Session.source !== "wire" || !Session.role) return;
    if (snapshot.rewardTime !== null) this.rewardTime = snapshot.rewardTime;
    if (snapshot.maxRewardTime !== null) this.maxRewardTime = snapshot.maxRewardTime;
    this.pendingIdle = null;
    GameLog.shared.info("Wire", wireIdleNote(snapshot));
    this.emit();
  }

  private static finishClaim(note: string): void {
    this.claimNote = note;
    this.claimSerial += 1;
    this.emit();
  }

  private static emit(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener();
      } catch (err) {
        GameLog.shared.error("Wire", "刷新顶栏失败 " + (err instanceof Error ? err.message : "未知错误"));
      }
    }
  }

  private static unhook(): void {
    if (this.offProfile) {
      this.offProfile();
      this.offProfile = null;
    }
    if (this.offChapter) {
      this.offChapter();
      this.offChapter = null;
    }
    if (this.offIdle) {
      this.offIdle();
      this.offIdle = null;
    }
    if (this.offIdleClaim) {
      this.offIdleClaim();
      this.offIdleClaim = null;
    }
  }
}
