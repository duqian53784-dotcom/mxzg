/**
 * 真服主线页。展示 s2c 3007 的 now_idx / max_idx。
 * 「关卡数据」在本页，再发空 c2s 3007（GReqChapterData 无字段，整帧 04000000bf0b0000）。
 * 展示 max_idx（= chapterId）、res_reward_time（= startTime）、extra_reward_id。不播 spine。
 * 挂在已合 3001 / 3010 / 3012 之后，按钮在「挑战」前面。只读，不落库。
 * 「挑战」在本页，发空 c2s 3001。和「挂机战报」同一行（y=-22），首屏可见。
 * 信息页 body 放在裁切里，可上下拖动，底栏盖住的探针能拖上来。进战和结算把 body 挪回页面根，BattlePage 不进这层裁切。
 * 已领首通在本页只读展示，打开时拉空 c2s 3010。
 * 快速战斗次数在本页只读展示，3010 之后再拉空 c2s 3012。不发 3013。
 * 「挂机战报」在本页，发 c2s 3006（chapterIdx、firstPos，不是空帧）。不发 3005。
 * 「挂机奖励」在本页，再发空 c2s 3004（GReqChapterItemList 无字段，整帧 04000000bc0b0000）。
 * 展示 reward_time、max_reward_time。不播 spine。不领取。
 * 挂在已合 3006 之后，按钮在「挂机战报」旁边。不从 3006 自动接。
 * 「获取阵容」在本页，再发空 c2s 3101（GReqLineUp 无字段，整帧 040000001d0c0000，小端 1d 0c 00 00）。
 * 展示 list、assistance_unlock。不播 spine。不改阵容。不发 3100。不接 3020。
 * 挂在已合 3007 之后、进战之前，按钮和 3102、3103、3030 探针并排。不从 3001 自动接。
 * 「查询阵法」在本页，再发空 c2s 3099（GReqQueryFormation 无字段，整帧 040000001b0c0000，小端 1b 0c 00 00）。
 * 展示 unlockIds。不播 spine。不改阵法。不发 3098。不发 3100。不接 3020。
 * 挂在已合 3101 旁边、已合 3007 之后、进战之前。不从 3001 或 3101 自动接。
 * 「请求战报」在本页，发 c2s 3102（battle_id、type，不是空壳）。不从 3001 或 3006 自动接。
 * 3001 / 3006 的战报不落库，拿它们的 battle_id 常回 BATTLE_REPORT_TIMEOUT。
 * 「切磋」在本页，发 c2s 3030（type、opponent_id、server_id，不是空壳）。opponent_id 不预填。
 * 有 report 走同一套 spine。3030 落库后可再点 3102，不自动发。
 * 「空壳探针 / 预计算」在本页，发 c2s 3103。空壳是 040000001f0c0000。
 * 可带 hero_ids、type、line_up_type。hero_ids 可从已同步的 3101 字段 2 填入。
 * 不从 3102 自动接。fighting=0 是成功，不 Toast。不播 spine。
 * 主线入口已在「更多」，不往主屏再放矩形。
 * 收到 report 在本页播 spine 站场、回合攻击，以及 batch2 技能/受击特效。3001、3006、3102 和 3030 都走 planWireSpineReplay。3103 不走。3101 不走。3099 不走。
 * USE_BATTLE_PREFAB 默认开。上述回放进战时挂 BattlePage.prefab：站位、血条、回合、战报，技能挂 VfxSkill，受击挂 VfxHit。WireBattlePage 仍不挂。
 * 同一份回放再写 Prefab 的 FloatDmg、FloatCrit、SkillNameBanner、前排 HeadAnchor。没有的 crit / level / buffs 藏起，不写成 0，也不编名字。
 * 开关关掉或 Prefab 加载失败时，仍用本页代码 UI，不另建这些挂点。跳过、撤退、关闭不发新 c2s。不改 Boot。
 * 不发 18001，不把 Mock 1201/1202 当战报。
 * 没有 report 或未同步时 Toast「真服未同步」，不回落 Mock。3103 的 fighting=0 不 Toast。
 */
import { Button, Color, EditBox, EventTouch, Mask, Node, UITransform } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
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
  formatWireIdleProbe,
  WIRE_IDLE_PROBE_UNSYNCED_TOAST,
} from "../net/protocol/wireIdle";
import {
  formatWireFormationProbe,
  WIRE_FORMATION_PROBE_UNSYNCED_TOAST,
} from "../net/protocol/wireFormation";
import {
  formatWireLineUpProbe,
  WIRE_LINEUP_PROBE_UNSYNCED_TOAST,
} from "../net/protocol/wireLineUp";
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
import { BattlePrefabShell, mountBattlePrefab, USE_BATTLE_PREFAB } from "./BattlePage";
import { BattlePresentation, planBattlePresentation } from "./battlePresentation";
import {
  BattlePresentMount,
  clearBattleOverhead,
  paintBattleFloats,
  paintBattleOverhead,
  paintBattleSkillName,
} from "./battlePresentView";
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
const PAGE_W = 720;
const PAGE_H = 1280;
/**
 * 底栏中心约 -575、高 140，顶边约 -505。返回钮底边在 -672。
 * 上滑这么多，底边停在底栏上方，查询阵法 / 获取阵容 / 关卡数据 / 返回都能点到。
 */
const PROBE_SCROLL_MAX = 220;
const DRAG_PX = 12;

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
type WaitKind = "3001" | "3006" | "3102" | "3103" | "3030" | "3007" | "3004" | "3101" | "3099";

export function buildWireMainlinePage(host: WireMainlineHost): WireMainlinePage {
  return new WireMainlineController(host);
}

class WireMainlineController implements WireMainlinePage {
  readonly node: Node;
  private readonly body: Node;
  private readonly viewport: Node;
  private disposed = false;
  private scrollY = 0;
  private dragMoved = 0;
  private dragging = false;
  private offScroll: (() => void) | null = null;
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
  private seenIdleProbeSerial = 0;
  private seenLineUpSerial = 0;
  private seenFormationSerial = 0;
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
  private idleProbeLabel: Node | null = null;
  private lineUpProbeLabel: Node | null = null;
  private formationProbeLabel: Node | null = null;
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
  private battleShell: BattlePrefabShell | null = null;
  private present: BattlePresentation | null = null;
  private presentMount: BattlePresentMount | null = null;
  private slotRoots: Node[] = [];
  private lastSnap: WireBattleMatch | null = null;

  constructor(private readonly host: WireMainlineHost) {
    this.node = uiNode("WireMainlinePage");
    place(createRect("bg", PAGE_W, PAGE_H, PAGE_BG), this.node, 0, 0);
    this.viewport = uiNode("probe-scroll");
    const viewUi = this.viewport.addComponent(UITransform);
    viewUi.setContentSize(PAGE_W, PAGE_H);
    viewUi.setAnchorPoint(0.5, 0.5);
    const mask = this.viewport.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;
    this.viewport.active = false;
    this.viewport.parent = this.node;
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.bindProbeScroll();
    this.seenSerial = WireSession.battleSerial;
    this.seenReportSerial = WireSession.chapterReportSerial;
    this.seenBattleReportSerial = WireSession.battleReportSerial;
    this.seenStudySerial = WireSession.studySerial;
    this.seenChapterProbeSerial = WireSession.chapterProbeSerial;
    this.seenIdleProbeSerial = WireSession.idleProbeSerial;
    this.seenLineUpSerial = WireSession.lineUpSerial;
    this.seenFormationSerial = WireSession.formationSerial;
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
    this.unbindProbeScroll();
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
    if (this.waitKind === "3004") {
      if (WireSession.idleProbeSerial === this.seenIdleProbeSerial) return;
      this.seenIdleProbeSerial = WireSession.idleProbeSerial;
      this.waiting = false;
      this.waitKind = null;
      this.write(this.idleProbeLabel, this.idleProbeText());
      this.write(this.statusLabel, this.statusText());
      return;
    }
    if (this.waitKind === "3101") {
      if (WireSession.lineUpSerial === this.seenLineUpSerial) return;
      this.seenLineUpSerial = WireSession.lineUpSerial;
      this.waiting = false;
      this.waitKind = null;
      this.write(this.lineUpProbeLabel, this.lineUpProbeText());
      this.write(this.statusLabel, this.statusText());
      return;
    }
    if (this.waitKind === "3099") {
      if (WireSession.formationSerial === this.seenFormationSerial) return;
      this.seenFormationSerial = WireSession.formationSerial;
      this.waiting = false;
      this.waitKind = null;
      this.write(this.formationProbeLabel, this.formationProbeText());
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
    this.attachInfoScroll();
    place(createLabel(WIRE_MAINLINE_READONLY_TITLE, 40, { color: TITLE }), this.body, 0, 550);
    this.nowLabel = place(createLabel(this.nowText(), 28, { color: TITLE, width: 640 }), this.body, 0, 460);
    this.maxLabel = place(createLabel(this.maxText(), 28, { color: TITLE, width: 640 }), this.body, 0, 410);
    this.fightLabel = place(createLabel(this.fightText(), 24, { color: TITLE, width: 640 }), this.body, 0, 360);
    this.rewardLabel = place(createLabel(this.rewardText(), 22, { color: TITLE, width: 640, height: 56 }), this.body, 0, 320);
    this.quickLabel = place(createLabel(this.quickText(), 22, { color: TITLE, width: 640, height: 56 }), this.body, 0, 260);
    this.statusLabel = place(createLabel(this.statusText(), 22, { color: MUTED, width: 640 }), this.body, 0, 210);
    place(createLabel(WIRE_MAINLINE_READONLY_NOTE, 16, { color: MUTED, width: 640, height: 72 }), this.body, 0, 166);
    this.hangLabel = place(createLabel(this.hangText(), 20, { color: TITLE, width: 640 }), this.body, 0, 94);
    this.reportLabel = place(createLabel(this.reportText(), 18, { color: MUTED, width: 640, height: 36 }), this.body, 0, 62);
    place(createButton("关-", () => this.bump("idx", -1), 88, 36, BACK_FILL), this.body, -240, 22);
    place(createButton("关+", () => this.bump("idx", 1), 88, 36, BACK_FILL), this.body, -120, 22);
    place(createButton("位-", () => this.bump("pos", -1), 88, 36, BACK_FILL), this.body, 40, 22);
    place(createButton("位+", () => this.bump("pos", 1), 88, 36, BACK_FILL), this.body, 160, 22);
    place(createButton("挂机战报", () => this.hangupReport(), 168, 40, OPEN_FILL), this.body, -204, -22);
    place(createButton("挑战", () => this.challenge(), 140, 40, OPEN_FILL), this.body, 0, -22);
    place(createButton("挂机奖励", () => this.pullIdleReward(), 168, 40, OPEN_FILL), this.body, 204, -22);
    this.idleProbeLabel = place(
      createLabel(this.idleProbeText(), 15, { color: TITLE, width: 640, height: 28 }),
      this.body,
      0,
      -64
    );
    place(createLabel(WIRE_BATTLE_REPORT_TIMEOUT_NOTE, 14, { color: MUTED, width: 640, height: 40 }), this.body, 0, -102);
    this.battleIdField = createField("battle_id", 280, 36, { text: this.battleId, maxLength: 64 });
    place(this.battleIdField.node, this.body, -150, -146);
    this.reportTypeField = createField("type", 180, 36, { text: this.reportType, maxLength: 32 });
    place(this.reportTypeField.node, this.body, 180, -146);
    this.fetchLabel = place(createLabel(this.fetchText(), 16, { color: MUTED, width: 640 }), this.body, 0, -184);
    place(createButton("请求战报", () => this.fetchBattleReport(), 200, 36, OPEN_FILL), this.body, 0, -222);
    this.studyLabel = place(createLabel(this.studyText(), 16, { color: TITLE, width: 640, height: 32 }), this.body, 0, -260);
    this.studyTypeField = createField("type", 100, 36, { text: this.studyType, maxLength: 8 });
    place(this.studyTypeField.node, this.body, -250, -300);
    this.studyServerField = createField("server_id", 140, 36, { text: this.studyServer, maxLength: 12 });
    place(this.studyServerField.node, this.body, -40, -300);
    this.studyOpponentField = createField("opponent_id", 200, 36, { text: this.studyOpponent, maxLength: 24 });
    place(this.studyOpponentField.node, this.body, 190, -300);
    place(createButton("切磋", () => this.studySpar(), 140, 36, OPEN_FILL), this.body, -120, -344);
    place(createButton("再拉 3102", () => this.fetchPersistedReport(), 160, 36, BACK_FILL), this.body, 120, -344);
    place(createLabel(WIRE_STUDY_PROBE_NOTE, 14, { color: MUTED, width: 640, height: 32 }), this.body, 0, -380);
    this.strengthLabel = place(createLabel(this.strengthText(), 16, { color: TITLE, width: 640, height: 32 }), this.body, 0, -412);
    this.heroIdsField = createField("hero_ids", 250, 36, { text: this.heroIdsText, maxLength: 180 });
    place(this.heroIdsField.node, this.body, -190, -452);
    this.strengthTypeField = createField("type", 130, 36, { text: this.strengthType, maxLength: 32 });
    place(this.strengthTypeField.node, this.body, 70, -452);
    this.lineUpTypeField = createField("line_up", 110, 36, { text: this.lineUpTypeText, maxLength: 12 });
    place(this.lineUpTypeField.node, this.body, 250, -452);
    place(createButton("空壳探针", () => this.probeStrength(), 150, 36, OPEN_FILL), this.body, -220, -496);
    place(createButton("预计算", () => this.precomputeStrength(), 140, 36, OPEN_FILL), this.body, 0, -496);
    place(createButton("用3101", () => this.fillFromLineUp(), 140, 36, BACK_FILL), this.body, 210, -496);
    this.lineUpProbeLabel = place(
      createLabel(this.lineUpProbeText(), 15, { color: TITLE, width: 640, height: 22 }),
      this.body,
      0,
      -530
    );
    this.formationProbeLabel = place(
      createLabel(this.formationProbeText(), 15, { color: TITLE, width: 640, height: 22 }),
      this.body,
      0,
      -552
    );
    this.chapterProbeLabel = place(
      createLabel(this.chapterProbeText(), 15, { color: TITLE, width: 640, height: 22 }),
      this.body,
      0,
      -574
    );
    place(createButton("查询阵法", () => this.probeFormation(), 140, 36, OPEN_FILL), this.body, -180, -614);
    place(createButton("获取阵容", () => this.pullLineUp(), 140, 36, OPEN_FILL), this.body, 0, -614);
    place(createButton("关卡数据", () => this.pullChapterData(), 140, 36, OPEN_FILL), this.body, 180, -614);
    place(createButton("返回", () => this.host.close(), 200, 36, BACK_FILL), this.body, 0, -654);
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
    this.write(this.idleProbeLabel, this.idleProbeText());
    this.write(this.lineUpProbeLabel, this.lineUpProbeText());
    this.write(this.formationProbeLabel, this.formationProbeText());
    if (!this.waiting) this.write(this.statusLabel, this.statusText());
  }

  private pullIdleReward(): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    if (!this.host.connected()) {
      this.host.showToast(errorText(ErrorCode.NET_NOT_CONNECTED));
      return;
    }
    if (!WireSession.hasChapter()) {
      this.host.showToast(WIRE_IDLE_PROBE_UNSYNCED_TOAST);
      return;
    }
    this.seenIdleProbeSerial = WireSession.idleProbeSerial;
    if (!WireSession.pullIdleProbe()) {
      this.host.showToast(WIRE_IDLE_PROBE_UNSYNCED_TOAST);
      return;
    }
    this.waitKind = "3004";
    this.waiting = true;
    this.write(this.statusLabel, "已发 3004 空壳，等待挂机奖励");
    GameLog.shared.info("Mainline", "wire idle reward 3004 empty");
  }

  private probeFormation(): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    if (!this.host.connected()) {
      this.host.showToast(errorText(ErrorCode.NET_NOT_CONNECTED));
      return;
    }
    if (!WireSession.hasChapter()) {
      this.host.showToast(WIRE_FORMATION_PROBE_UNSYNCED_TOAST);
      return;
    }
    this.seenFormationSerial = WireSession.formationSerial;
    if (!WireSession.pullFormationProbe()) {
      this.host.showToast(WIRE_FORMATION_PROBE_UNSYNCED_TOAST);
      return;
    }
    this.waitKind = "3099";
    this.waiting = true;
    this.write(this.statusLabel, "已发 3099 空壳，等待阵法");
    GameLog.shared.info("Mainline", "wire formation 3099 empty");
  }

  private pullLineUp(): void {
    if (this.disposed || this.phase === "battle" || this.waiting) return;
    if (!this.host.connected()) {
      this.host.showToast(errorText(ErrorCode.NET_NOT_CONNECTED));
      return;
    }
    if (!WireSession.hasChapter()) {
      this.host.showToast(WIRE_LINEUP_PROBE_UNSYNCED_TOAST);
      return;
    }
    this.seenLineUpSerial = WireSession.lineUpSerial;
    if (!WireSession.pullLineUpProbe()) {
      this.host.showToast(WIRE_LINEUP_PROBE_UNSYNCED_TOAST);
      return;
    }
    this.waitKind = "3101";
    this.waiting = true;
    this.write(this.statusLabel, "已发 3101 空壳，等待阵容");
    GameLog.shared.info("Mainline", "wire lineup 3101 empty");
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
    const present = planBattlePresentation(snap.report, plan);
    if (present.beats.length !== plan.beats.length) {
      GameLog.shared.warn("Mainline", "battle present beats " + present.beats.length + " / plan " + plan.beats.length);
    }
    GameLog.shared.info("Mainline", "wire spine idx " + plan.stageId + " " + plan.stems.join(",") + " " + formatWireBattleMatch(snap, this.host.roleId()));
    const ready = await this.showBattle(plan, present);
    if (!ready || this.disposed || !this.host.alive()) return;
    const played = await this.playback(plan);
    if (!played || this.disposed || !this.host.alive()) return;
    this.showDone(snap);
  }

  private async showBattle(plan: WireSpineReplay, present: BattlePresentation): Promise<boolean> {
    this.phase = "battle";
    this.skipped = false;
    this.spineWarned = false;
    this.logLines = [];
    this.clearBody();
    this.present = present;
    if (USE_BATTLE_PREFAB) {
      try {
        const shell = await mountBattlePrefab(this.body);
        if (this.disposed || this.phase !== "battle" || !this.host.alive()) {
          if (shell.root.isValid) shell.root.destroy();
          return false;
        }
        this.battleShell = shell;
        this.mountPrefabBattle(plan, shell);
        GameLog.shared.info("Mainline", "battle prefab " + shell.root.name);
        return true;
      } catch (err) {
        if (this.disposed || this.phase !== "battle") return false;
        GameLog.shared.warn("Mainline", "battle prefab " + messageOf(err) + "，改用代码 UI");
        this.host.showToast("战斗 Prefab 未加载，改用代码 UI");
        this.clearBody();
        this.present = present;
      }
    }
    this.mountCodeBattle(plan);
    return !this.disposed && this.host.alive();
  }

  private mountCodeBattle(plan: WireSpineReplay): void {
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

  private mountPrefabBattle(plan: WireSpineReplay, shell: BattlePrefabShell): void {
    this.roundLabel = shell.roundLabel;
    this.logLabel = shell.logLabel;
    setText(shell.roundLabel, "站场");
    setText(shell.logLabel, "");
    shell.bindSkip(() => this.skip());
    shell.bindRetreat(() => this.localRetreat());
    shell.bindClose(() => {
      if (!this.disposed) this.host.close();
    });
    this.presentMount = shell.present;
    this.actors = [];
    this.slotRoots = [];
    this.nameLabels = [];
    this.hpLabels = [];
    this.hpNow = [];
    const totals = countSides(plan.slots);
    const seen = { ally: 0, enemy: 0, sword: 0, flag: 0 };
    for (let i = 0; i < plan.slots.length; i++) {
      const slot = plan.slots[i];
      const index = seen[slot.side];
      seen[slot.side] += 1;
      const slotIndex = i;
      if (slot.side === "ally" || slot.side === "enemy") {
        const root = shell.slot(slot.side, index);
        const name = root.getChildByName("Label");
        if (name) setText(name, slot.stem);
        const hp = shell.hpLabel(slot.side, index);
        if (hp) setText(hp, hpText(slot, slot.hp));
        shell.setHpFill(slot.side, index, slot.hp, slot.maxHp);
        this.nameLabels.push(name || root);
        this.hpLabels.push(hp || root);
        this.hpNow.push(slot.hp);
        this.slotRoots.push(root);
        this.actors.push(mountBattleSpine(root, slot.stem, () => this.failSlot(slotIndex)));
        continue;
      }
      const xy = slotXY(slot.side, index, totals[slot.side]);
      const root = place(uiNode("slot-" + slot.stem), shell.layerField, xy.x, xy.y);
      const name = place(createLabel(slot.label, 14, { color: MUTED, width: 180, height: 36 }), root, 0, -78);
      const hp = place(createLabel(hpText(slot, slot.hp), 14, { color: TITLE, width: 180 }), root, 0, -108);
      this.nameLabels.push(name);
      this.hpLabels.push(hp);
      this.hpNow.push(slot.hp);
      this.slotRoots.push(root);
      this.actors.push(mountBattleSpine(root, slot.stem, () => this.failSlot(slotIndex)));
    }
    this.mountPrefabVfx(plan, shell);
    this.paintOverhead(plan);
  }

  private mountPrefabVfx(plan: WireSpineReplay, shell: BattlePrefabShell): void {
    this.vfxNodes = [];
    const stems: string[] = [];
    for (let b = 0; b < plan.beats.length; b++) {
      const vfx = plan.beats[b].vfx;
      for (let v = 0; v < vfx.length; v++) {
        const stem = vfx[v].stem;
        let seenStem = false;
        for (let s = 0; s < stems.length; s++) {
          if (stems[s] === stem) seenStem = true;
        }
        if (!seenStem) stems.push(stem);
      }
    }
    const park = shell.layerField;
    for (let i = 0; i < stems.length; i++) {
      const stem = stems[i];
      const holder = uiNode("vfx-" + stem);
      holder.parent = park;
      holder.active = false;
      const actor = mountBattleSpine(holder, stem, () => this.failVfx(), { effect: true });
      this.vfxNodes.push({ stem, node: holder, actor });
    }
  }

  private mountSlots(plan: WireSpineReplay): void {
    this.actors = [];
    this.slotRoots = [];
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
      this.slotRoots.push(root);
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

  /** 壳上的撤退。只结束本地回放，和跳过一样，不发 3002 / 3005 / 3020 / 3100 / 3098。 */
  private localRetreat(): void {
    if (this.disposed || this.phase !== "battle") return;
    GameLog.shared.info("Mainline", "撤退只结束本地回放，不发 c2s");
    this.skip();
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

  private idleProbeText(): string {
    return formatWireIdleProbe(WireSession.idleProbe);
  }

  private lineUpProbeText(): string {
    return formatWireLineUpProbe(WireSession.lineUp);
  }

  private formationProbeText(): string {
    return formatWireFormationProbe(WireSession.formation);
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
      if (this.battleShell && this.battleShell.root.isValid) this.battleShell.placeVfx(row.node, cue.role, xy.x, xy.y);
      else row.node.setPosition(xy.x, xy.y, 0);
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
    this.paintPrefabBeat(plan, beat);
    this.paintPresentBeat(plan, beat);
  }

  private paintPrefabBeat(plan: WireSpineReplay, beat: WireSpineReplay["beats"][number]): void {
    const shell = this.battleShell;
    if (!shell || !shell.root.isValid) return;
    if (shell.logLabel.isValid) setText(shell.logLabel, beat.line);
    shell.clearSkillLabels();
    for (let i = 0; i < beat.vfx.length; i++) {
      const cue = beat.vfx[i];
      if (cue.role !== "skill") continue;
      let index = 0;
      if (cue.anchor !== null && cue.anchor >= 0 && cue.anchor < plan.slots.length) {
        const side = plan.slots[cue.anchor].side;
        if (side === "ally" || side === "enemy") index = sideIndexAt(plan.slots, cue.anchor);
      }
      shell.setSkillLabel(index, cue.stem);
    }
    for (let i = 0; i < plan.slots.length; i++) {
      const slot = plan.slots[i];
      if (slot.side !== "ally" && slot.side !== "enemy") continue;
      shell.setHpFill(slot.side, sideIndexAt(plan.slots, i), this.hpNow[i], slot.maxHp);
    }
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

  private paintOverhead(plan: WireSpineReplay): void {
    const present = this.present;
    for (let i = 0; i < this.slotRoots.length; i++) {
      const slot = plan.slots[i];
      const root = this.slotRoots[i];
      if (!root || !root.isValid) continue;
      if (!slot || (slot.side !== "ally" && slot.side !== "enemy")) continue;
      let row: BattlePresentation["overhead"][number] | null = null;
      if (present) {
        for (let r = 0; r < present.overhead.length; r++) {
          if (present.overhead[r].slot === i) row = present.overhead[r];
        }
      }
      if (!row) clearBattleOverhead(root);
      else paintBattleOverhead(root, row);
    }
  }

  private paintPresentBeat(plan: WireSpineReplay, beat: WireSpineReplay["beats"][number]): void {
    const mount = this.presentMount;
    const present = this.present;
    if (!mount || !present) return;
    const index = plan.beats.indexOf(beat);
    if (index < 0 || index >= present.beats.length) return;
    const row = present.beats[index];
    paintBattleSkillName(mount, row.skillName);
    paintBattleFloats(mount, row.floats);
  }

  private bindProbeScroll(): void {
    const onStart = () => {
      this.dragMoved = 0;
    };
    const onMove = (event: EventTouch) => {
      this.dragProbe(event);
    };
    const onEnd = () => {
      this.endProbeDrag();
    };
    this.node.on(Node.EventType.TOUCH_START, onStart);
    this.node.on(Node.EventType.TOUCH_MOVE, onMove);
    this.node.on(Node.EventType.TOUCH_END, onEnd);
    this.node.on(Node.EventType.TOUCH_CANCEL, onEnd);
    this.offScroll = () => {
      if (!this.node.isValid) return;
      this.node.off(Node.EventType.TOUCH_START, onStart);
      this.node.off(Node.EventType.TOUCH_MOVE, onMove);
      this.node.off(Node.EventType.TOUCH_END, onEnd);
      this.node.off(Node.EventType.TOUCH_CANCEL, onEnd);
    };
  }

  private unbindProbeScroll(): void {
    if (!this.offScroll) return;
    this.offScroll();
    this.offScroll = null;
  }

  /** 只拖信息页。进战 / 结算时 body 不在裁切里，避免把 BattlePage 一起拖走。 */
  private dragProbe(event: EventTouch): void {
    if (this.disposed || this.phase !== "info" || !this.viewport.active) return;
    const delta = event && event.getUIDelta ? event.getUIDelta() : null;
    const dy = delta && typeof delta.y === "number" ? delta.y : 0;
    if (dy === 0) return;
    this.dragMoved += Math.abs(dy);
    if (this.dragMoved < DRAG_PX) return;
    if (!this.dragging) {
      this.dragging = true;
      this.setProbeInput(false);
    }
    this.scrollY = clampScroll(this.scrollY + dy, PROBE_SCROLL_MAX);
    this.body.setPosition(0, this.scrollY, 0);
  }

  private endProbeDrag(): void {
    const wasDragging = this.dragging;
    this.dragMoved = 0;
    this.dragging = false;
    if (wasDragging) this.setProbeInput(true);
  }

  private setProbeInput(enabled: boolean): void {
    if (!this.body.isValid) return;
    const kids = this.body.children;
    for (let i = 0; i < kids.length; i++) {
      const kid = kids[i];
      if (!kid.isValid) continue;
      const button = kid.getComponent(Button);
      if (button) button.interactable = enabled;
      const field = kid.getComponent(EditBox);
      if (field) field.enabled = enabled;
    }
  }

  private resetProbeScroll(): void {
    this.scrollY = 0;
    this.dragMoved = 0;
    this.dragging = false;
    if (this.body.isValid) this.body.setPosition(0, 0, 0);
  }

  private attachInfoScroll(): void {
    if (!this.viewport.isValid || !this.body.isValid) return;
    this.viewport.active = true;
    if (this.body.parent !== this.viewport) this.body.parent = this.viewport;
    this.resetProbeScroll();
  }

  /** 裁切只服务信息页。BattlePage 和代码战报挂在页面根上。 */
  private detachInfoScroll(): void {
    this.resetProbeScroll();
    if (this.body.isValid && this.body.parent !== this.node) this.body.parent = this.node;
    if (this.viewport.isValid) this.viewport.active = false;
  }

  private clearBody(): void {
    this.detachInfoScroll();
    this.battleShell = null;
    this.present = null;
    this.presentMount = null;
    this.slotRoots = [];
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
    this.idleProbeLabel = null;
    this.lineUpProbeLabel = null;
    this.formationProbeLabel = null;
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

function clampScroll(value: number, max: number): number {
  if (!isFinite(value) || value < 0) return 0;
  if (value > max) return max;
  return value;
}

function clampProbe(value: number): number {
  if (!isFinite(value) || value < 1) return 1;
  if (value > 9999) return 9999;
  return Math.floor(value);
}

function sideIndexAt(slots: WireSpineSlot[], anchor: number): number {
  const side = slots[anchor].side;
  let index = 0;
  for (let i = 0; i < anchor; i++) {
    if (slots[i].side === side) index += 1;
  }
  return index;
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
