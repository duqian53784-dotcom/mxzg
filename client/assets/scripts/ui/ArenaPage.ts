/**
 * 竞技场（C10）。积分、约排名、固定对手，挑战一键结算。
 * 不改 .scene。玩法列表「竞技场」在主线 Lv8 打开本页。返回走页面栈。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applyArenaChallenge,
  arenaDailyLine,
  arenaFailToast,
  arenaReportLine,
  arenaResultToast,
  arenaRowText,
  arenaScoreLine,
  challengeButtonText,
  emptyArenaToast,
} from "../module/arena/match";
import { ArenaChallengeResp, ArenaOpponent, ArenaViewResp } from "../net/protocol/types";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const STAT = new Color(255, 214, 120, 255);
const ROW_FILL = new Color(48, 64, 96, 255);
const SELECTED_FILL = new Color(168, 96, 42, 255);
const FIGHT_FILL = new Color(168, 72, 64, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface ArenaHost {
  showToast(text: string): void;
  alive(): boolean;
  view(): Promise<ArenaViewResp>;
  challenge(opponentId: number): Promise<ArenaChallengeResp>;
  onProgress(): void;
  close(): void;
}

export interface ArenaPage {
  node: Node;
  reload(): void;
  dispose(): void;
}

export function buildArenaPage(host: ArenaHost): ArenaPage {
  return new ArenaController(host);
}

class ArenaController implements ArenaPage {
  readonly node: Node;
  private readonly body: Node;
  private readonly rowsHost: Node;
  private disposed = false;
  private busy = false;
  private ticket = 0;
  private toldError = false;
  private selectedId = 0;
  private opponents: ArenaOpponent[] = [];
  private used = 0;
  private limit = 0;
  private scoreLabel: Node | null = null;
  private dailyLabel: Node | null = null;
  private resultLabel: Node | null = null;
  private fightButton: Node | null = null;
  private lastReport = "点一名对手，再点挑战。胜负按战力结算";

  constructor(private readonly host: ArenaHost) {
    this.node = uiNode("ArenaPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    place(createLabel("竞技场", 40, { color: TITLE }), this.body, 0, 460);
    place(createLabel("固定对手，一键结算，不播战报", 18, { color: MUTED, width: 640 }), this.body, 0, 410);
    this.scoreLabel = place(createLabel("读取中…", 24, { color: STAT, width: 640 }), this.body, 0, 360);
    this.dailyLabel = place(createLabel("", 20, { color: MUTED, width: 640 }), this.body, 0, 318);
    this.rowsHost = place(uiNode("rows-host"), this.body, 0, 0);
    this.resultLabel = place(createLabel(this.lastReport, 18, { color: MUTED, width: 640, height: 48 }), this.body, 0, -40);
    this.fightButton = place(
      createButton("挑战", () => void this.fight(), 560, 64, FIGHT_FILL, 22),
      this.body,
      0,
      -130
    );
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -210);
    GameLog.shared.info("Arena", "open");
    void this.refresh();
  }

  reload(): void {
    if (this.disposed) return;
    void this.refresh();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.ticket += 1;
  }

  private async refresh(): Promise<void> {
    if (this.disposed) return;
    const ticket = ++this.ticket;
    try {
      const view = await this.host.view();
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      if (!view.ok) {
        this.noteError(errorText(view.code ?? ErrorCode.UNKNOWN_CMD));
        return;
      }
      this.toldError = false;
      this.render(view);
    } catch (err) {
      if (this.disposed || ticket !== this.ticket || !this.host.alive()) return;
      this.noteError(messageOf(err));
    }
  }

  private render(view: ArenaViewResp): void {
    const opponents = view.opponents || [];
    this.opponents = opponents;
    this.used = view.used;
    this.limit = view.limit;
    if (this.selectedId === 0 || !findOpponent(opponents, this.selectedId)) {
      this.selectedId = opponents.length > 0 ? opponents[0].id : 0;
    }
    const selected = findOpponent(opponents, this.selectedId);
    this.write(this.scoreLabel, arenaScoreLine(view.score, view.rank, view.power));
    this.write(this.dailyLabel, arenaDailyLine(view.used, view.limit, view.gold));
    this.write(this.resultLabel, this.lastReport);
    this.write(
      this.fightButton ? this.fightButton.getChildByName("Label") : null,
      challengeButtonText(selected ? selected.name : null, view.used, view.limit)
    );
    const old = this.rowsHost.getChildByName("rows");
    if (old) {
      old.parent = null;
      if (old.isValid) old.destroy();
    }
    const rows = uiNode("rows");
    rows.parent = this.rowsHost;
    const top = 240;
    const step = 52;
    for (let i = 0; i < opponents.length; i++) {
      const row = opponents[i];
      const picked = row.id === this.selectedId;
      const button = createButton(
        (picked ? "已选 " : "") + arenaRowText(row.name, row.score, row.power, view.power),
        () => this.select(row.id),
        640,
        48,
        picked ? SELECTED_FILL : ROW_FILL,
        18
      );
      place(button, rows, 0, top - i * step);
    }
  }

  private select(opponentId: number): void {
    if (this.disposed || this.selectedId === opponentId) return;
    this.selectedId = opponentId;
    GameLog.shared.info("Arena", "select " + opponentId);
    void this.refresh();
  }

  private async fight(): Promise<void> {
    if (this.busy || this.disposed) return;
    const opponent = findOpponent(this.opponents, this.selectedId);
    if (!opponent) {
      this.host.showToast(emptyArenaToast());
      return;
    }
    this.busy = true;
    this.ticket += 1;
    GameLog.shared.info("Arena", "challenge " + opponent.id);
    try {
      const resp = await this.host.challenge(opponent.id);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = arenaFailToast(resp);
        GameLog.shared.warn("Arena", text);
        this.host.showToast(text);
        this.selectedId = opponent.id;
        void this.refresh();
        return;
      }
      applyArenaChallenge(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = arenaResultToast(resp.opponentName, resp.win, resp.scoreDelta, resp.goldGain);
      this.lastReport = arenaReportLine(resp.playerPower, resp.opponentPower, resp.win) + " · " + text;
      GameLog.shared.info("Arena", text + " score " + resp.score + " gold " + resp.gold);
      this.host.showToast(text);
      this.selectedId = resp.opponentId;
      void this.refresh();
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Arena", text);
      this.host.showToast(text);
    } finally {
      this.busy = false;
    }
  }

  private noteError(text: string): void {
    if (this.toldError) return;
    this.toldError = true;
    GameLog.shared.warn("Arena", text);
    this.host.showToast(text);
    this.write(this.scoreLabel, "暂时无法打开竞技场");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}

function findOpponent(opponents: ArenaOpponent[], id: number): ArenaOpponent | null {
  for (let i = 0; i < opponents.length; i++) {
    if (opponents[i].id === id) return opponents[i];
  }
  return null;
}
