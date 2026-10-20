/**
 * 召唤面板（C6）。单抽和十连都花钻石。
 * 不改 .scene。底栏「召唤」打开本页，结果留在页面上。返回走页面栈。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText, messageOf } from "../core/errors";
import { GameLog } from "../core/GameLog";
import {
  applySummon,
  ownedDiamondText,
  singleButtonText,
  summonFailToast,
  summonResultText,
  summonToast,
  tenButtonText,
} from "../module/summon/pull";
import { SummonPullResp } from "../net/protocol/types";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const RESULT = new Color(214, 224, 236, 255);
const SINGLE_FILL = new Color(168, 116, 42, 255);
const TEN_FILL = new Color(120, 72, 168, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface SummonHost {
  diamond(): number;
  showToast(text: string): void;
  alive(): boolean;
  pull(count: number): Promise<SummonPullResp>;
  onProgress(): void;
  close(): void;
}

export interface SummonPage {
  node: Node;
  dispose(): void;
}

export function buildSummonPage(host: SummonHost): SummonPage {
  return new SummonController(host);
}

class SummonController implements SummonPage {
  readonly node: Node;
  private readonly body: Node;
  private disposed = false;
  private busy = false;
  private diamondLabel: Node | null = null;
  private resultLabel: Node | null = null;

  constructor(private readonly host: SummonHost) {
    this.node = uiNode("SummonPage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.build();
    GameLog.shared.info("Summon", "open");
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
  }

  private build(): void {
    place(createLabel("召唤", 40, { color: TITLE }), this.body, 0, 470);
    place(
      createLabel("单抽 10 钻石，十连 90 钻石。重复英雄转为碎片", 20, { color: MUTED, width: 640 }),
      this.body,
      0,
      410
    );
    this.diamondLabel = place(
      createLabel(ownedDiamondText(this.host.diamond()), 24, { color: TITLE, width: 640 }),
      this.body,
      0,
      350
    );
    place(
      createButton(singleButtonText(), () => void this.pull(1), 460, 68, SINGLE_FILL),
      this.body,
      0,
      260
    );
    place(
      createButton(tenButtonText(), () => void this.pull(10), 460, 68, TEN_FILL),
      this.body,
      0,
      170
    );
    place(createLabel("本次结果", 22, { color: MUTED }), this.body, 0, 90);
    place(createRect("result-bg", 640, 300, new Color(16, 28, 48, 255)), this.body, 0, -90);
    this.resultLabel = place(
      createLabel(summonResultText([]), 18, {
        color: RESULT,
        width: 600,
        height: 270,
        align: "left",
      }),
      this.body,
      0,
      -90
    );
    place(
      createLabel("新英雄出现在底栏「英雄」。碎片先记在会话里，背包留到以后", 18, { color: MUTED, width: 640 }),
      this.body,
      0,
      -280
    );
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -360);
  }

  private async pull(count: number): Promise<void> {
    if (this.busy || this.disposed) return;
    this.busy = true;
    GameLog.shared.info("Summon", "pull " + count);
    try {
      const resp = await this.host.pull(count);
      if (this.disposed || !this.host.alive()) return;
      if (!resp.ok) {
        const text = summonFailToast(resp);
        GameLog.shared.warn("Summon", text);
        this.host.showToast(text);
        this.write(this.diamondLabel, ownedDiamondText(resp.diamond));
        return;
      }
      applySummon(resp);
      if (this.host.alive()) this.host.onProgress();
      const text = summonToast(resp);
      GameLog.shared.info("Summon", text + " diamond " + resp.diamond);
      this.host.showToast(text);
      this.write(this.diamondLabel, ownedDiamondText(resp.diamond));
      this.write(this.resultLabel, summonResultText(resp.drops));
    } catch (err) {
      if (this.disposed || !this.host.alive()) return;
      const text = messageOf(err);
      GameLog.shared.warn("Summon", text);
      this.host.showToast(text.length > 0 ? text : errorText(ErrorCode.UNKNOWN_CMD));
    } finally {
      this.busy = false;
    }
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}
