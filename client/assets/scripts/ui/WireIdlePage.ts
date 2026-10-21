/**
 * 真服挂机页。只展示 s2c 3004 能对上的时间，领取只发空的 c2s 3005。
 * 不读 Mock 钱包，不放快速作战和推关。Mock 挂机页仍是 IdlePage。
 */
import { Color, Node } from "cc";
import { ErrorCode, errorText } from "../core/errors";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import { formatWireIdle } from "../net/protocol/wireIdle";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const GOLD = new Color(255, 214, 120, 255);
const CLAIM_FILL = new Color(168, 116, 42, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface WireIdleHost {
  showToast(text: string): void;
  alive(): boolean;
  close(): void;
}

export interface WireIdlePage {
  node: Node;
  dispose(): void;
}

export function buildWireIdlePage(host: WireIdleHost): WireIdlePage {
  return new WireIdleController(host);
}

class WireIdleController implements WireIdlePage {
  readonly node: Node;
  private readonly body: Node;
  private disposed = false;
  private awaiting = false;
  private seenClaim = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private offSync: (() => void) | null = null;
  private lastLabel: Node | null = null;
  private durationLabel: Node | null = null;
  private statusLabel: Node | null = null;
  private previewLabel: Node | null = null;
  private capLabel: Node | null = null;

  constructor(private readonly host: WireIdleHost) {
    this.seenClaim = WireSession.claimSerial;
    this.node = uiNode("WireIdlePage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.build();
    GameLog.shared.info("Idle", "wire open");
    this.render();
    this.offSync = WireSession.onSync(() => this.onSync());
    this.timer = setInterval(() => {
      if (this.disposed) return;
      this.render();
    }, 1000);
    const maybe = this.timer as { unref?: () => void };
    if (typeof maybe.unref === "function") maybe.unref();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.offSync) {
      this.offSync();
      this.offSync = null;
    }
  }

  private build(): void {
    place(createLabel("挂机", 40, { color: TITLE }), this.body, 0, 470);
    this.lastLabel = place(createLabel("上次领取 未同步", 20, { color: MUTED, width: 640 }), this.body, 0, 400);
    this.durationLabel = place(createLabel("已挂机 未同步", 28, { color: TITLE, width: 640 }), this.body, 0, 340);
    this.statusLabel = place(createLabel("", 18, { color: MUTED, width: 640 }), this.body, 0, 285);
    place(createRect("card", 640, 180, new Color(16, 28, 48, 255)), this.body, 0, 150);
    place(createLabel("当前可领", 18, { color: MUTED }), this.body, 0, 210);
    this.previewLabel = place(createLabel("", 22, { color: GOLD, width: 600, height: 80 }), this.body, 0, 150);
    this.capLabel = place(createLabel("", 18, { color: MUTED, width: 600 }), this.body, 0, 80);
    place(createButton("领取", () => this.claim(), 420, 64, CLAIM_FILL), this.body, 0, -40);
    place(
      createLabel("领取只发空的 3005 并记下回包。没有奖励清单，不改金币。快速作战仍是 Mock，这一页不放", 16, {
        color: MUTED,
        width: 640,
        height: 64,
      }),
      this.body,
      0,
      -140
    );
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -230);
  }

  private onSync(): void {
    if (this.disposed || !this.host.alive()) return;
    this.render();
    if (!this.awaiting || WireSession.claimSerial === this.seenClaim) return;
    this.awaiting = false;
    this.seenClaim = WireSession.claimSerial;
    const text = WireSession.claimNote || "领取回包已记下";
    GameLog.shared.info("Idle", text);
    this.host.showToast(text);
  }

  private render(): void {
    if (this.disposed) return;
    const view = formatWireIdle(
      { rewardTime: WireSession.rewardTime, maxRewardTime: WireSession.maxRewardTime },
      Math.floor(Date.now() / 1000)
    );
    this.write(this.lastLabel, view.last);
    this.write(this.durationLabel, view.duration);
    this.write(
      this.statusLabel,
      view.capped ? "已达上限。奖励清单仍不在这包里" : "时长只按 3004 的时间推。不按 Mock 的每分钟金币计算"
    );
    this.write(this.previewLabel, view.preview);
    this.write(this.capLabel, view.cap);
  }

  private claim(): void {
    if (this.disposed) return;
    GameLog.shared.info("Idle", "wire claim");
    if (!WireSession.claimIdle()) {
      this.host.showToast(errorText(ErrorCode.NET_NOT_CONNECTED));
      return;
    }
    this.awaiting = true;
    this.host.showToast("已发送领取，等回包");
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}
