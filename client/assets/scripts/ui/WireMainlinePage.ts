/**
 * 真服主线页。展示 s2c 3007 的 now_idx / max_idx。
 * 「关卡数据」在本页，再发空 c2s 3007（GReqChapterData 无字段，整帧 04000000bf0b0000）。
 * 展示 max_idx（= chapterId）、res_reward_time（= startTime）、extra_reward_id。不播 spine。
 * 挂在已合 3001 / 3010 / 3012 之后，按钮在「挑战」前面。只读，不落库。
 * 「挑战」在本页，发空 c2s 3001。已领首通在本页只读展示，打开时拉空 c2s 3010。
 * 快速战斗次数在本页只读展示，3010 之后再拉空 c2s 3012。不发 3013。
 * 「挂机战报」在本页，发 c2s 3006（chapterIdx、firstPos，不是空帧）。不发 3005。
 * 「请求战报」在本页，发 c2s 3102（battle_id、type，不是空壳）。不从 3001 或 3006 自动接。
 * 3001 / 3006 的战报不落库，拿它们的 battle_id 常回 BATTLE_REPORT_TIMEOUT。
 * 「切磋」在本页，发 c2s 3030（type、opponent_id、server_id，不是空壳）。opponent_id 不预填。
 * 有 report 走同一套 spine。3030 落库后可再点 3102，不自动发。
 * 「空壳探针 / 预计算」在本页，发 c2s 3103。空壳是 040000001f0c0000。
 * 可带 hero_ids、type、line_up_type。hero_ids 可从已同步的 3101 字段 2 填入。
 * 不从 3102 自动接。fighting=0 是成功，不 Toast。不播 spine。
 * 主线入口已在「更多」，不往主屏再放矩形。
 * 收到 report 在本页播 spine 站场、回合攻击，以及 batch2 技能/受击特效。3001、3006、3102 和 3030 都走 planWireSpineReplay。3103 不走。
 * 不发 18001，不把 Mock 1201/1202 当战报。
 * 没有 report 或未同步时 Toast「真服未同步」，不回落 Mock。3103 的 fighting=0 不 Toast。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireBattleMatch,
  formatWireFightLine,
  planWireSpineReplay,
  resolveWireBattleWin,
  WIRE_BATTLE_UNSYNCED_TOAST,
  WIRE_SPINE_LOAD_FAIL,
  wireMainlineFightStage,
  wireSpineVfxClip,
  WireBattleMatch,
  WireSpineReplay,
  WireSpineSlot,
} from "../net/protocol/wireBattle";
import {
  formatWireChapterIdx,
  formatWireChapterProbe,
  WIRE_CHAPTER_PROBE_UNSYNCED_TOAST,
  WIRE_MAINLINE_READONLY_NOTE,
  WIRE_MAINLINE_READONLY_TITLE,
} from "../net/protocol/wireChapter";
import {
  formatWireChapterReward,
  WIRE_CHAPTER_REWARD_UNSYNCED_TOAST,
} from "../net/protocol/wireChapterReward";
import {
  formatWireQuickBattle,
  WIRE_QUICK_BATTLE_UNSYNCED_TOAST,
} from "../net/protocol/wireQuickBattle";
import {
  formatWireChapterReport,
  WIRE_CHAPTER_REPORT_UNSYNCED_TOAST,
} from "../net/protocol/wireChapterReport";
import {
  formatWireBattleReport,
  readWireBattleReportQuery,
  WIRE_BATTLE_REPORT_TIMEOUT_NOTE,
  WIRE_BATTLE_REPORT_UNSYNCED_TOAST,
} from "../net/protocol/wireBattleReport";
import {
  formatWirePreCompute,
  heroIdsFromLineUp,
  parseHeroIdList,
  parseLineUpType,
  parsePreComputeType,
  preComputeTypeEcho,
  WIRE_PRECOMPUTE_UNSYNCED_TOAST,
} from "../net/protocol/wirePreComputeStrength";
import {
  formatWireStudy,
  readWireStudyQuery,
  wireStudyBattleIdText,
  WIRE_STUDY_NEED_OPPONENT,
  WIRE_STUDY_PROBE_NOTE,
  WIRE_STUDY_SELF,
  WIRE_STUDY_UNSYNCED_TOAST,
} from "../net/protocol/wireStudy";
import { mountBattleSpine, SpineActor } from "./battleSpine";
import { createButton, createField, createLabel, createRect, place, setText, TextField, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const OPEN_FILL = new Color(46, 110, 190, 255);
const BACK_FILL = new Color(36, 72, 120, 255);
const WIN = new Color(255, 214, 120, 255);
const LOSE = new Color(230, 120, 110, 255);
const ALLY_BAR = new Color(88, 196, 120, 255);
const LOG_COLOR = new Color(214, 224, 236, 255);
const ENEMY_Y = 300;
const ALLY_Y = 20;
const BEAT_MS = 700;

export interface WireMainlineHost {
  alive(): boolean;
  close(): void;
  showToast(text: string): void;
  roleName(): string;
  roleId(): number | null;
  connected(): boolean;
}

export interface WireMainlinePage {
  node: Node;
  dispose(): void;
}

type Phase = "info" | "battle" | "done";
type WaitKind = "3001" | "3006" | "3102" | "3103" | "3030" | "3007";

export function buildWireMainlinePage(host: WireMainlineHost): WireMainlinePage {
  return new WireMainlineController(host);
}

class WireMainlineController implements WireMainlinePage {
  readonly node: Node;
  private readonly body: Node;
  private disposed = false;
  private waiting = false;
  private waitKind: WaitKind | null = null;
  private phase: Phase = "info";
  private replayKind: WaitKind = "3001";
  private seenSerial = 0;
  private seenReportSerial = 0;
  private seenBattleReportSerial = 0;
  private seenPreComputeSerial = 0;
  private seenStudySerial = 0;
  private seenChapterProbeSerial = 0;
  private chapterIdx = 1;
  private firstPos = 1;
  private battleId = "1";
  private reportType = "1";
  private heroIdsText = "";
  private strengthType = "";
  private lineUpTypeText = "";
  private studyType = "0";
  private studyServer = "1";
  private studyOpponent = "";
  private persistedBattleId: string | null = null;
  private lastSentType: string | null = null;
  private strengthSent = false;
  private offSync: (() => void) | null = null;
  private nowLabel: Node | null = null;
  private maxLabel: Node | null = null;
  private fightLabel: Node | null = null;
  private rewardLabel: Node | null = null;
  private quickLabel: Node | null = null;
  private hangLabel: Node | null = null;
  private reportLabel: Node | null = null;
  private fetchLabel: Node | null = null;
  private studyLabel: Node | null = null;
  private chapterProbeLabel: Node | null = null;
  private strengthLabel: Node | null = null;
  private battleIdField: TextField | null = null;
  private reportTypeField: TextField | null = null;
  private studyTypeField: TextField | null = null;
  private studyServerField: TextField | null = null;
  private studyOpponentField: TextField | null = null;
  private heroIdsField: TextField | null = null;
  private strengthTypeField: TextField | null = null;
  private lineUpTypeField: TextField | null = null;
  private statusLabel: Node | null = null;
  private resultLabel: Node | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private sleepResolve: ((cont: boolean) => void) | null = null;
  private skipped = false;
  private spineWarned = false;
  private actors: SpineActor[] = [];
  private vfxNodes: { stem: string; node: Node; actor: SpineActor }[] = [];
  private nameLabels: Node[] = [];
  private hpLabels: Node[] = [];
  private hpNow: (number | null)[] = [];
  private roundLabel: Node | null = null;
  private logLabel: Node | null = null;
  private logLines: string[] = [];
  private lastSnap: WireBattleMatch | null = null;

  constructor(private readonly host: WireMainlineHost) {
    this.node = uiNode("WireMainlinePage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.seenSerial = WireSession.battleSerial;
    this.seenReportSerial = WireSession.chapterReportSerial;
    this.seenBattleReportSerial = WireSession.battleReportSerial;
    this.seenStudySerial = WireSession.studySerial;
    this.seenChapterProbeSerial = WireSession.chapterProbeSerial;
    this.showInfo();
    if (!WireSession.hasChapterReward()) this.host.showToast(WIRE_CHAPTER_REWARD_UNSYNCED_TOAST);
    WireSession.pullChapterRewardList();
    if (!WireSession.hasQuickBattle()) this.host.showToast(WIRE_QUICK_BATTLE_UNSYNCED_TOAST);
    WireSession.pullQuickBattleCount();
    GameLog.shared.info("Mainline", "wire open " + this.nowText() + " / " + this.maxText() + " / " + this.rewardText() + " / " + this.quickText());
    this.offSync = WireSession.onSync(() => this.onSync());
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.waiting = false;
    this.wake(false);
    if (this.offSync) {
      this.offSync();
      this.offSync = null;
    }
  }

  private onSync(): void {
    if (this.disposed || !this.host.alive()) return;
    if (this.phase === "info") this.renderInfo();
    if (this.phase === "done") this.write(this.resultLabel, this.resultText());
    if (!this.waiting || !this.waitKind) return;
    if (this.waitKind === "3001") {
      if (WireSession.battleSerial === this.seenSerial) return;
      this.seenSerial = WireSession.battleSerial;
      this.waiting = false;
      this.waitKind = null;
      const snap = WireSession.battleMatch;
      if (!snap || !snap.report) {
        this.phase = "info";
        this.showInfo();
        return;
      }
      this.replayKind = "3001";
      this.phase = "battle";
      void this.play(snap);
      return;
    }
    if (this.waitKind === "3006") {
      if (WireSession.chapterReportSerial === this.seenReportSerial) return;
      this.seenReportSerial = WireSession.chapterReportSerial;
      this.waiting = false;
      this.waitKind = null;
      const report = WireSession.chapterReport;
      if (!report || !report.report) {
        this.host.showToast(WIRE_CHAPTER_REPORT_UNSYNCED_TOAST);
        this.phase = "info";
        this.showInfo();
        return;
      }
      const echoed = report.chapterIdx;
      const stage = echoed !== null && echoed >= 1 ? Math.floor(echoed) : this.chapterIdx;
      this.replayKind = "3006";
      this.phase = "battle";
      void this.play({ empty: false, report: report.report, marks: report.marks }, stage);
      return;
    }
    if (this.waitKind === "3103") {
      if (WireSession.preComputeSerial === this.seenPreComputeSerial) return;
      this.seenPreComputeSerial = WireSession.preComputeSerial;
      this.waiting = false;
      this.waitKind = null;
      const snap = WireSession.preCompute;
      if (!snap) {
        this.host.showToast(WIRE_PRECOMPUTE_UNSYNCED_TOAST);
        this.phase = "info";
        this.showInfo();
        return;
      }
      this.strengthSent = true;
      const echo = preComputeTypeEcho(this.lastSentType, snap.type);
      GameLog.shared.info(
        "Mainline",
        "wire precompute result " + formatWirePreCompute(snap) + " / echo=" + echo
      );
      this.phase = "info";
      this.renderInfo();
      return;
    }
    if (this.waitKind === "3030") {
      if (WireSession.studySerial === this.seenStudySerial) return;
      this.seenStudySerial = WireSession.studySerial;
      this.waiting = false;
      this.waitKind = null;
      const spar = WireSession.study;
      const battleText = wireStudyBattleIdText(spar);
      if (battleText !== null) {
        this.persistedBattleId = battleText;
        this.battleId = battleText;
        if (this.battleIdField) this.battleIdField.setValue(battleText);
      }
      if (!spar || !spar.report) {
        this.host.showToast(WIRE_STUDY_UNSYNCED_TOAST);
        this.phase = "info";
        this.showInfo();
        return;
      }
      this.replayKind = "3030";
      this.phase = "battle";
      void this.play({ empty: false, report: spar.report, marks: spar.marks });
      return;
    }
    if (this.waitKind === "3007") {
      if (WireSession.chapterProbeSerial === this.seenChapterProbeSerial) return;
      this.seenChapterProbeSerial = WireSession.chapterProbeSerial;
      this.waiting = false;
      this.waitKind = null;
      this.write(this.chapterProbeLabel, this.chapterProbeText());
      this.write(this.statusLabel, this.statusText());
      return;
    }
    if (this.waitKind !== "3102") return;
    if (WireSession.battleReportSerial === this.seenBattleReportSerial) return;
    this.seenBattleReportSerial = WireSession.battleReportSerial;
    this.waiting = false;
    this.waitKind = null;
    const fetched = WireSession.battleReport;
    if (!fetched || !fetched.report) {
      this.host.showToast(WIRE_BATTLE_REPORT_UNSYNCED_TOAST);
      this.phase = "info";
      this.showInfo();
      return;
    }
    this.replayKind = "3102";
    this.phase = "battle";
    void this.play({ empty: false, report: fetched.report, marks: fetched.marks });
  }

  private showInfo(): void {
    this.phase = "info";
    this.clearBody();
    place(createLabel(WIRE_MAINLINE_READONLY_TITLE, 40, { color: TITLE }), this.body, 0, 510);
    this.nowLabel = place(createLabel(this.nowText(), 28, { color: TITLE, width: 640 }), this.body, 0, 420);
    this.maxLabel = place(createLabel(this.maxText(), 28, { color: TITLE, width: 640 }), this.body, 0, 370);
    this.fightLabel = place(createLabel(this.fightText(), 24, { color: TITLE, width: 640 }), this.body, 0, 320);
    this.rewardLabel = place(createLabel(this.rewardText(), 22, { color: TITLE, width: 640, height: 56 }), this.body, 0, 280);
    this.quickLabel = place(createLabel(this.quickText(), 22, { color: TITLE, width: 640, height: 56 }), this.body, 0, 220);
    this.statusLabel = place(createLabel(this.statusText(), 22, { color: MUTED, width: 640 }), this.body, 0, 170);
    place(createLabel(WIRE_MAINLINE_READONLY_NOTE, 16, { color: MUTED, width: 640, height: 72 }), this.body, 0, 126);
    this.hangLabel = place(createLabel(this.hangText(), 20, { color: TITLE, width: 640 }), this.body, 0, 54);
    this.reportLabel = place(createLabel(this.reportText(), 18, { color: MUTED, width: 640, height: 36 }), this.body, 0, 22);
    place(createButton("关-", () => this.bump("idx", -1), 88, 36, BACK_FILL), this.body, -240, -18);
    place(createButton("关+", () => this.bump("idx", 1), 88, 36, BACK_FILL), this.body, -120, -18);
    place(createButton("位-", () => this.bump("pos", -1), 88, 36, BACK_FILL), this.body, 40, -18);
    place(createButton("位+", () => this.bump("pos", 1), 88, 36, BACK_FILL), this.body, 160, -18);
    place(createButton("挂机战报", () => this.hangupReport(), 220, 40, OPEN_FILL), this.body, 0, -62);
    place(createLabel(WIRE_BATTLE_REPORT_TIMEOUT_NOTE, 14, { color: MUTED, width: 640, height: 40 }), this.body, 0, -106);
    this.battleIdField = createField("battle_id", 280, 36, { text: this.battleId, maxLength: 64 });
    place(this.battleIdField.node, this.body, -150, -150);
    this.reportTypeField = createField("type", 180, 36, { text: this.reportType, maxLength: 32 });
    place(this.reportTypeField.node, this.body, 180, -150);
    this.fetchLabel = place(createLabel(this.fetchText(), 16, { color: MUTED, width: 640 }), this.body, 0, -188);
    place(createButton("请求战报", () => this.fetchBattleReport(), 200, 36, OPEN_FILL), this.body, 0, -226);
    this.studyLabel = place(createLabel(this.studyText(), 16, { color: TITLE, width: 640, height: 32 }), this.body, 0, -264);
    this.studyTypeField = createField("type", 100, 36, { text: this.studyType, maxLength: 8 });
    place(this.studyTypeField.node, this.body, -250, -304);
    this.studyServerField = createField("server_id", 140, 36, { text: this.studyServer, maxLength: 12 });
    place(this.studyServerField.node, this.body, -40, -304);
    this.studyOpponentField = createField("opponent_id", 200, 36, { text: this.studyOpponent, maxLength: 24 });
    place(this.studyOpponentField.node, this.body, 190, -304);
    place(createButton("切磋", () => this.studySpar(), 140, 36, OPEN_FILL), this.body, -120, -348);
    place(createButton("再拉 3102", () => this.fetchPersistedReport(), 160, 36, BACK_FILL), this.body, 120, -348);
    place(createLabel(WIRE_STUDY_PROBE_NOTE, 14, { color: MUTED, width: 640, height: 32 }), this.body, 0, -384);
    this.strengthLabel = place(createLabel(this.strengthText(), 16, { color: TITLE, width: 640, height: 32 }), this.body, 0, -416);
    this.heroIdsField = createField("hero_ids", 250, 36, { text: this.heroIdsText, maxLength: 180 });
    place(this.heroIdsField.node, this.body, -190, -456);
    this.strengthTypeField = createField("type", 130, 36, { text: this.strengthType, maxLength: 32 });
    place(this.strengthTypeField.node, this.body, 70, -456);
    this.lineUpTypeField = createField("line_up", 110, 36, { text: this.lineUpTypeText, maxLength: 12 });
    place(this.lineUpTypeField.node, this.body, 250, -456);
    place(createButton("空壳探针", () => this.probeStrength(), 150, 36, OPEN_FILL), this.body, -220, -500);
    place(createButton("预计算", () => this.precomputeStrength(), 140, 36, OPEN_FILL), this.body, 0, -500);
    place(createButton("用3101", () => this.fillFromLineUp(), 140, 36, BACK_FILL), this.body, 210, -500);
    this.chapterProbeLabel = place(
      createLabel(this.chapterProbeText(), 15, { color: TITLE, width: 640, height: 32 }),
      this.body,
      0,
      -540
    );
    place(createButton("关卡数据", () => this.pullChapterData(), 160, 36, OPEN_FILL), this.body, -160, -578);
    place(createButton("挑战", () => this.challenge(), 160, 36, OPEN_FILL), this.body, 140, -578);
    place(createButton("返回", () => this.host.close(), 200, 36, BACK_FILL), this.body, 0, -618);
  }

  private renderInfo(): void {
    this.write(this.nowLabel, this.nowText());
    this.write(this.maxLabel, this.maxText());
    this.write(this.fightLabel, this.fightText());
    this.write(this.rewardLabel, this.rewardText());
    this.write(this.quickLabel, this.quickText());
    this.write(this.hangLabel, this.hangText());
    this.write(this.reportLabel, this.reportText());
    this.write(this.fetchLabel, this.fetchText());
    this.write(this.studyLabel, this.studyText());
    this.write(this.strengthLabel, this.strengthText());
    this.write(this.chapterProbeLabel, this.chapterProbeText());
    if (!this.waiting) this.write(this.statusLabel, this.statusText());
  }

  private pullChapterData(): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    if (!this.host.connected()) {
      this.host.showToast(errorText(ErrorCode.NET_NOT_CONNECTED));
      return;
    }
    if (!WireSession.hasChapter()) {
      this.host.showToast(WIRE_CHAPTER_PROBE_UNSYNCED_TOAST);
      return;
    }
    this.seenChapterProbeSerial = WireSession.chapterProbeSerial;
    if (!WireSession.pullChapterProbe()) {
      this.host.showToast(WIRE_CHAPTER_PROBE_UNSYNCED_TOAST);
      return;
    }
    this.waitKind = "3007";
    this.waiting = true;
    this.write(this.statusLabel, "已发 3007 空壳，等待关卡数据");
    GameLog.shared.info("Mainline", "wire chapter data 3007 empty");
  }

  private challenge(): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    if (!this.host.connected()) {
      this.host.showToast(errorText(ErrorCode.NET_NOT_CONNECTED));
      return;
    }
    if (!WireSession.hasChapter()) {
      this.host.showToast(WIRE_BATTLE_UNSYNCED_TOAST);
      return;
    }
    this.seenSerial = WireSession.battleSerial;
    if (!WireSession.challengeMainline()) {
      this.host.showToast(WIRE_BATTLE_UNSYNCED_TOAST);
      return;
    }
    this.waitKind = "3001";
    this.replayKind = "3001";
    this.waiting = true;
    this.write(this.statusLabel, "已发 3001，等待战报");
    GameLog.shared.info("Mainline", "wire challenge 3001");
  }

  private hangupReport(): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    if (!this.host.connected()) {
      this.host.showToast(errorText(ErrorCode.NET_NOT_CONNECTED));
      return;
    }
    if (!WireSession.hasChapter()) {
      this.host.showToast(WIRE_CHAPTER_REPORT_UNSYNCED_TOAST);
      return;
    }
    this.seenReportSerial = WireSession.chapterReportSerial;
    if (!WireSession.pullChapterReport(this.chapterIdx, this.firstPos)) {
      this.host.showToast(WIRE_CHAPTER_REPORT_UNSYNCED_TOAST);
      return;
    }
    this.waitKind = "3006";
    this.replayKind = "3006";
    this.waiting = true;
    this.write(this.statusLabel, "已发 3006，等待战报");
    GameLog.shared.info("Mainline", "wire chapter report 3006 chapterIdx=" + this.chapterIdx + " firstPos=" + this.firstPos);
  }

  private fetchBattleReport(): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    if (!this.host.connected()) {
      this.host.showToast(errorText(ErrorCode.NET_NOT_CONNECTED));
      return;
    }
    if (!WireSession.hasChapter()) {
      this.host.showToast(WIRE_BATTLE_REPORT_UNSYNCED_TOAST);
      return;
    }
    const typedId = this.battleIdField ? this.battleIdField.getValue() : this.battleId;
    const typedType = this.reportTypeField ? this.reportTypeField.getValue() : this.reportType;
    const query = readWireBattleReportQuery({ battleId: typedId, type: typedType });
    this.battleId = query.battleId;
    this.reportType = query.type;
    if (this.battleIdField) this.battleIdField.setValue(query.battleId);
    if (this.reportTypeField) this.reportTypeField.setValue(query.type);
    this.write(this.fetchLabel, this.fetchText());
    this.seenBattleReportSerial = WireSession.battleReportSerial;
    if (!WireSession.pullBattleReport(query.battleId, query.type)) {
      this.host.showToast(WIRE_BATTLE_REPORT_UNSYNCED_TOAST);
      return;
    }
    this.waitKind = "3102";
    this.replayKind = "3102";
    this.waiting = true;
    this.write(this.statusLabel, "已发 3102，等待战报");
    GameLog.shared.info("Mainline", "wire battle report 3102 battle_id=" + query.battleId + " type=" + query.type);
  }

  private studySpar(): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    this.studyType = this.studyTypeField ? this.studyTypeField.getValue() : this.studyType;
    this.studyServer = this.studyServerField ? this.studyServerField.getValue() : this.studyServer;
    this.studyOpponent = this.studyOpponentField ? this.studyOpponentField.getValue() : this.studyOpponent;
    const query = readWireStudyQuery({
      type: this.studyType,
      opponentId: this.studyOpponent,
      serverId: this.studyServer,
    });
    if (!query) {
      this.write(this.studyLabel, WIRE_STUDY_NEED_OPPONENT);
      return;
    }
    const selfId = this.host.roleId();
    if (selfId !== null && query.opponentId === selfId) {
      this.write(this.studyLabel, WIRE_STUDY_SELF);
      return;
    }
    if (!this.host.connected()) {
      this.host.showToast(errorText(ErrorCode.NET_NOT_CONNECTED));
      return;
    }
    if (!WireSession.hasChapter()) {
      this.host.showToast(WIRE_STUDY_UNSYNCED_TOAST);
      return;
    }
    this.seenStudySerial = WireSession.studySerial;
    if (!WireSession.pullStudy(query.type, query.opponentId, query.serverId)) {
      this.host.showToast(WIRE_STUDY_UNSYNCED_TOAST);
      return;
    }
    this.waitKind = "3030";
    this.replayKind = "3030";
    this.waiting = true;
    this.write(this.statusLabel, "已发 3030，等待战报");
    GameLog.shared.info(
      "Mainline",
      "wire study 3030 type=" + query.type + " opponent_id=" + query.opponentId + " server_id=" + query.serverId
    );
  }

  private fetchPersistedReport(): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    const id = this.persistedBattleId;
    if (!id) {
      if (this.phase === "done") this.showInfo();
      this.write(this.studyLabel, "没有 battle_id，不发送");
      return;
    }
    this.battleId = id;
    if (this.battleIdField) this.battleIdField.setValue(id);
    this.fetchBattleReport();
  }

  private probeStrength(): void {
    this.sendStrength(true);
  }

  private precomputeStrength(): void {
    this.sendStrength(false);
  }

  private fillFromLineUp(): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    const ids = heroIdsFromLineUp(WireSession.lineUp);
    if (ids.length === 0) {
      GameLog.shared.info("Mainline", "3101 没有可填的 hero_id");
      return;
    }
    this.heroIdsText = ids.join(",");
    if (this.heroIdsField) this.heroIdsField.setValue(this.heroIdsText);
    this.write(this.strengthLabel, this.strengthText());
    GameLog.shared.info("Mainline", "wire precompute fill 3101 hero_ids=" + this.heroIdsText);
  }

  private sendStrength(shell: boolean): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    if (!this.host.connected()) {
      this.host.showToast(errorText(ErrorCode.NET_NOT_CONNECTED));
      return;
    }
    if (!WireSession.hasChapter()) {
      this.host.showToast(WIRE_PRECOMPUTE_UNSYNCED_TOAST);
      return;
    }
    const heroText = this.heroIdsField ? this.heroIdsField.getValue() : this.heroIdsText;
    const typeText = this.strengthTypeField ? this.strengthTypeField.getValue() : this.strengthType;
    const lineText = this.lineUpTypeField ? this.lineUpTypeField.getValue() : this.lineUpTypeText;
    this.heroIdsText = heroText;
    this.strengthType = typeText;
    this.lineUpTypeText = lineText;
    const heroIds = shell ? [] : parseHeroIdList(heroText);
    const type = shell ? null : parsePreComputeType(typeText);
    const lineUpType = shell ? null : parseLineUpType(lineText);
    this.lastSentType = type;
    this.seenPreComputeSerial = WireSession.preComputeSerial;
    const sent = shell
      ? WireSession.pullPreComputeStrength({ shell: true })
      : WireSession.pullPreComputeStrength({ shell: false, heroIds, type, lineUpType });
    if (!sent) {
      this.host.showToast(WIRE_PRECOMPUTE_UNSYNCED_TOAST);
      return;
    }
    this.waitKind = "3103";
    this.waiting = true;
    this.write(this.statusLabel, shell ? "已发 3103 空壳，等待战斗力" : "已发 3103，等待战斗力");
    const echoHint = type === null ? "type 无" : "type=" + type;
    const lineHint = lineUpType === null ? "line_up_type 无" : "line_up_type=" + lineUpType;
    GameLog.shared.info(
      "Mainline",
      shell
        ? "wire precompute 3103 empty"
        : "wire precompute 3103 hero_ids=" + heroIds.join(",") + " " + echoHint + " " + lineHint
    );
  }

  private bump(which: "idx" | "pos", delta: number): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    if (which === "idx") this.chapterIdx = clampProbe(this.chapterIdx + delta);
    else this.firstPos = clampProbe(this.firstPos + delta);
    this.write(this.hangLabel, this.hangText());
  }

  private async play(snap: WireBattleMatch, stageOverride?: number): Promise<void> {
    this.lastSnap = snap;
    const stage = typeof stageOverride === "number" ? stageOverride : wireMainlineFightStage(WireSession.nowIdx, WireSession.maxIdx);
    if (stage === null || !snap.report) {
      this.host.showToast(WIRE_BATTLE_UNSYNCED_TOAST);
      this.showInfo();
      return;
    }
    const plan = planWireSpineReplay(snap.report, this.host.roleId(), stage);
    GameLog.shared.info("Mainline", "wire spine idx " + plan.stageId + " " + plan.stems.join(",") + " " + formatWireBattleMatch(snap, this.host.roleId()));
    this.showBattle(plan);
    const played = await this.playback(plan);
    if (!played || this.disposed || !this.host.alive()) return;
    this.showDone(snap);
  }

  private showBattle(plan: WireSpineReplay): void {
    this.phase = "battle";
    this.skipped = false;
    this.spineWarned = false;
    this.logLines = [];
    this.clearBody();
    place(createLabel("进战 idx " + plan.stageId, 40, { color: TITLE }), this.body, 0, 500);
    this.roundLabel = place(createLabel("站场", 22, { color: MUTED, width: 640 }), this.body, 0, 450);
    place(createLabel("敌方", 18, { color: LOSE }), this.body, 0, 400);
    place(createLabel("我方", 18, { color: ALLY_BAR }), this.body, 0, 120);
    this.mountSlots(plan);
    place(createRect("log-bg", 660, 110, new Color(10, 18, 32, 230)), this.body, 0, -150);
    this.logLabel = place(
      createLabel("", 18, { color: LOG_COLOR, width: 620, height: 96, align: "left" }),
      this.body,
      0,
      -150
    );
    place(createButton("跳过", () => this.skip(), 240, 52), this.body, 0, -280);
  }

  private mountSlots(plan: WireSpineReplay): void {
    this.actors = [];
    this.nameLabels = [];
    this.hpLabels = [];
    this.hpNow = [];
    const totals = countSides(plan.slots);
    const seen = { ally: 0, enemy: 0, sword: 0, flag: 0 };
    for (let i = 0; i < plan.slots.length; i++) {
      const slot = plan.slots[i];
      const index = seen[slot.side];
      seen[slot.side] += 1;
      const xy = slotXY(slot.side, index, totals[slot.side]);
      const root = place(uiNode("slot-" + slot.stem), this.body, xy.x, xy.y);
      const name = place(createLabel(slot.label, 14, { color: MUTED, width: 180, height: 36 }), root, 0, -78);
      const hp = place(createLabel(hpText(slot, slot.hp), 14, { color: TITLE, width: 180 }), root, 0, -108);
      this.nameLabels.push(name);
      this.hpLabels.push(hp);
      this.hpNow.push(slot.hp);
      const slotIndex = i;
      this.actors.push(mountBattleSpine(root, slot.stem, () => this.failSlot(slotIndex)));
    }
    this.mountVfx(plan);
  }

  private mountVfx(plan: WireSpineReplay): void {
    this.vfxNodes = [];
    const stems: string[] = [];
    for (let b = 0; b < plan.beats.length; b++) {
      const vfx = plan.beats[b].vfx;
      for (let v = 0; v < vfx.length; v++) {
        const stem = vfx[v].stem;
        let seen = false;
        for (let s = 0; s < stems.length; s++) {
          if (stems[s] === stem) seen = true;
        }
        if (!seen) stems.push(stem);
      }
    }
    for (let i = 0; i < stems.length; i++) {
      const stem = stems[i];
      const holder = place(uiNode("vfx-" + stem), this.body, 0, 160);
      holder.active = false;
      const actor = mountBattleSpine(holder, stem, () => this.failVfx(), { effect: true });
      this.vfxNodes.push({ stem, node: holder, actor });
    }
  }

  private failSlot(index: number): void {
    if (this.disposed) return;
    const slotLabel = this.nameLabels[index];
    if (slotLabel && slotLabel.isValid) setText(slotLabel, WIRE_SPINE_LOAD_FAIL);
    if (this.spineWarned) return;
    this.spineWarned = true;
    GameLog.shared.info("Mainline", WIRE_SPINE_LOAD_FAIL);
    this.host.showToast(WIRE_SPINE_LOAD_FAIL);
  }

  private failVfx(): void {
    if (this.disposed || this.spineWarned) return;
    this.spineWarned = true;
    GameLog.shared.info("Mainline", WIRE_SPINE_LOAD_FAIL);
    this.host.showToast(WIRE_SPINE_LOAD_FAIL);
  }

  private async playback(plan: WireSpineReplay): Promise<boolean> {
    for (let i = 0; i < plan.beats.length; i++) {
      if (this.disposed) return false;
      if (this.skipped) {
        this.renderBeat(plan, plan.beats[plan.beats.length - 1]);
        return true;
      }
      this.renderBeat(plan, plan.beats[i]);
      const last = i === plan.beats.length - 1;
      const cont = await this.sleep(last ? 260 : BEAT_MS);
      if (!cont || this.disposed) return false;
      if (this.skipped) {
        this.renderBeat(plan, plan.beats[plan.beats.length - 1]);
        return true;
      }
    }
    return true;
  }

  private showDone(snap: WireBattleMatch): void {
    this.phase = "done";
    this.lastSnap = snap;
    this.clearBody();
    const win = snap.report ? resolveWireBattleWin(snap.report, this.host.roleId()) : null;
    const headline = win === true ? "胜利" : win === false ? "失败" : "胜负未带";
    const color = win === true ? WIN : win === false ? LOSE : MUTED;
    place(createLabel(headline, 56, { color }), this.body, 0, 360);
    this.resultLabel = place(createLabel(this.resultText(), 22, { color: MUTED, width: 640, height: 160 }), this.body, 0, 180);
    place(createLabel("spine 站场 / 回合攻击，技能和受击挂 batch2 命名特效", 18, { color: MUTED, width: 640 }), this.body, 0, 40);
    const again = this.replayKind === "3001" ? "再挑战" : this.replayKind === "3030" ? "再拉 3102" : "再看战报";
    place(
      createButton(again, () => this.again(), 240, 52, OPEN_FILL),
      this.body,
      0,
      -80
    );
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -170);
  }

  private again(): void {
    if (this.replayKind === "3006") this.hangupReport();
    else if (this.replayKind === "3030") this.fetchPersistedReport();
    else if (this.replayKind === "3102") this.fetchBattleReport();
    else this.challenge();
  }

  private skip(): void {
    if (this.disposed || this.phase !== "battle") return;
    this.skipped = true;
    this.wake(true);
  }

  private resultText(): string {
    const snap = this.lastSnap;
    const report = snap && snap.report ? formatWireBattleMatch(snap, this.host.roleId()) : "没有 report";
    const hang = this.replayKind === "3006" ? "\n" + this.reportText() : "";
    const fetched = this.replayKind === "3102" ? "\n" + this.fetchText() : "";
    const spar = this.replayKind === "3030" ? "\n" + this.studyText() + " / 不自动发" : "";
    return report + "\n" + this.nowText() + "\n" + this.maxText() + "\n" + this.quickText() + hang + fetched + spar;
  }

  private chapterProbeText(): string {
    return formatWireChapterProbe(WireSession.chapterProbe);
  }

  private studyText(): string {
    const base = formatWireStudy(WireSession.study);
    if (!this.persistedBattleId) return base;
    return base + " / 可再拉 3102 battle_id " + this.persistedBattleId;
  }

  private fetchText(): string {
    return formatWireBattleReport(WireSession.battleReport) + " / battle_id " + this.battleId + " / type " + this.reportType;
  }

  private strengthText(): string {
    const snap = WireSession.preCompute;
    const base = formatWirePreCompute(snap);
    if (!this.strengthSent || !snap) return base;
    const echo = preComputeTypeEcho(this.lastSentType, snap.type);
    if (echo === "match") return base + " / type 回声一致";
    if (echo === "mismatch") return base + " / type 回声不符";
    return base;
  }

  private hangText(): string {
    return "挂机战报 chapterIdx " + this.chapterIdx + " / firstPos " + this.firstPos;
  }

  private reportText(): string {
    return formatWireChapterReport(WireSession.chapterReport);
  }

  private nowText(): string {
    return formatWireChapterIdx("now", WireSession.nowIdx);
  }

  private maxText(): string {
    return formatWireChapterIdx("max", WireSession.maxIdx);
  }

  private fightText(): string {
    return formatWireFightLine(WireSession.nowIdx, WireSession.maxIdx);
  }

  private rewardText(): string {
    return formatWireChapterReward(WireSession.chapterReward);
  }

  private quickText(): string {
    return formatWireQuickBattle(WireSession.quickBattle);
  }

  private statusText(): string {
    const snap = WireSession.battleMatch;
    if (!snap) return "点挑战发 3001";
    return formatWireBattleMatch(snap, this.host.roleId());
  }

  private renderBeat(plan: WireSpineReplay, beat: WireSpineReplay["beats"][number]): void {
    for (let i = 0; i < beat.cues.length; i++) {
      const cue = beat.cues[i];
      const actor = this.actors[cue.slot];
      if (actor) actor.play(cue.clip);
    }
    for (let i = 0; i < this.vfxNodes.length; i++) this.vfxNodes[i].node.active = false;
    for (let i = 0; i < beat.vfx.length; i++) {
      const cue = beat.vfx[i];
      let row: { stem: string; node: Node; actor: SpineActor } | null = null;
      for (let n = 0; n < this.vfxNodes.length; n++) {
        if (this.vfxNodes[n].stem === cue.stem) row = this.vfxNodes[n];
      }
      if (!row) continue;
      const xy = anchorXY(plan.slots, cue.anchor, cue.role);
      row.node.setPosition(xy.x, xy.y, 0);
      row.node.active = true;
      row.actor.burst(wireSpineVfxClip(cue.stem));
    }
    for (let i = 0; i < beat.hp.length; i++) {
      if (beat.hp[i] !== null) this.hpNow[i] = beat.hp[i];
    }
    for (let i = 0; i < plan.slots.length; i++) {
      const label = this.hpLabels[i];
      if (label && label.isValid) setText(label, hpText(plan.slots[i], this.hpNow[i]));
    }
    if (this.roundLabel && this.roundLabel.isValid) setText(this.roundLabel, beat.line);
    this.logLines.push(beat.line);
    if (this.logLines.length > 4) this.logLines.shift();
    if (this.logLabel && this.logLabel.isValid) setText(this.logLabel, this.logLines.join("\n"));
  }

  private sleep(ms: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.sleepResolve = resolve;
      this.timer = setTimeout(() => {
        this.timer = null;
        this.sleepResolve = null;
        resolve(!this.disposed);
      }, ms);
      const maybe = this.timer as { unref?: () => void };
      if (typeof maybe.unref === "function") maybe.unref();
    });
  }

  private wake(cont: boolean): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const resolve = this.sleepResolve;
    this.sleepResolve = null;
    if (resolve) resolve(cont);
  }

  private clearBody(): void {
    this.actors = [];
    this.vfxNodes = [];
    this.nameLabels = [];
    this.hpLabels = [];
    this.hpNow = [];
    this.roundLabel = null;
    this.logLabel = null;
    this.nowLabel = null;
    this.maxLabel = null;
    this.fightLabel = null;
    this.rewardLabel = null;
    this.quickLabel = null;
    this.hangLabel = null;
    this.reportLabel = null;
    this.fetchLabel = null;
    this.studyLabel = null;
    this.chapterProbeLabel = null;
    this.battleIdField = null;
    this.reportTypeField = null;
    this.studyTypeField = null;
    this.studyServerField = null;
    this.studyOpponentField = null;
    this.statusLabel = null;
    this.resultLabel = null;
    const kids = this.body.children.slice();
    for (let i = 0; i < kids.length; i++) {
      kids[i].parent = null;
      kids[i].destroy();
    }
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

function clampProbe(value: number): number {
  if (!isFinite(value) || value < 1) return 1;
  if (value > 9999) return 9999;
  return Math.floor(value);
}

function countSides(slots: WireSpineSlot[]): { ally: number; enemy: number; sword: number; flag: number } {
  const totals = { ally: 0, enemy: 0, sword: 0, flag: 0 };
  for (let i = 0; i < slots.length; i++) totals[slots[i].side] += 1;
  return totals;
}

function anchorXY(slots: WireSpineSlot[], anchor: number | null, role: "skill" | "hit"): { x: number; y: number } {
  const lift = role === "skill" ? 40 : 0;
  if (anchor === null || anchor < 0 || anchor >= slots.length) {
    return { x: 0, y: role === "skill" ? 180 : 120 };
  }
  const slot = slots[anchor];
  const totals = countSides(slots);
  let index = 0;
  for (let i = 0; i < anchor; i++) {
    if (slots[i].side === slot.side) index += 1;
  }
  const xy = slotXY(slot.side, index, totals[slot.side]);
  return { x: xy.x, y: xy.y + lift };
}

function slotXY(side: WireSpineSlot["side"], index: number, total: number): { x: number; y: number } {
  if (side === "enemy") return { x: rowX(index, total), y: ENEMY_Y };
  if (side === "ally") return { x: rowX(index, total), y: ALLY_Y };
  if (side === "sword") return { x: 260, y: -30 };
  return { x: 0, y: 180 };
}

function rowX(index: number, total: number): number {
  if (total <= 1) return 0;
  if (total === 2) return index === 0 ? -160 : 160;
  if (index === 0) return -200;
  if (index === 1) return 0;
  return 200;
}

function hpText(slot: WireSpineSlot, hp: number | null): string {
  if (slot.side === "sword" || slot.side === "flag") return slot.stem;
  if (hp === null && slot.maxHp === null) return "hp 未带";
  if (hp === null) return "max " + slot.maxHp;
  if (slot.maxHp === null) return String(hp);
  return hp + "/" + slot.maxHp;
}
