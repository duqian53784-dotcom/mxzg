/**
 * 真服主线只读页。只展示 s2c 3007 的 now_idx / max_idx。
 * 不发 3002 / 3010，不进关，不挑战，不结算。Mock 关卡页仍是 MainlinePage。
 */
import { Color, Node } from "cc";
import { GameLog } from "../core/GameLog";
import { WireSession } from "../net/WireSession";
import {
  formatWireChapterIdx,
  WIRE_MAINLINE_READONLY_NOTE,
  WIRE_MAINLINE_READONLY_TITLE,
} from "../net/protocol/wireChapter";
import { createButton, createLabel, createRect, place, setText, uiNode } from "./UiKit";

const PAGE_BG = new Color(8, 16, 32, 255);
const TITLE = new Color(255, 228, 170, 255);
const MUTED = new Color(190, 205, 225, 255);
const BACK_FILL = new Color(36, 72, 120, 255);

export interface WireMainlineHost {
  alive(): boolean;
  close(): void;
}

export interface WireMainlinePage {
  node: Node;
  dispose(): void;
}

export function buildWireMainlinePage(host: WireMainlineHost): WireMainlinePage {
  return new WireMainlineController(host);
}

class WireMainlineController implements WireMainlinePage {
  readonly node: Node;
  private readonly body: Node;
  private disposed = false;
  private offSync: (() => void) | null = null;
  private nowLabel: Node | null = null;
  private maxLabel: Node | null = null;

  constructor(private readonly host: WireMainlineHost) {
    this.node = uiNode("WireMainlinePage");
    place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);
    this.body = uiNode("body");
    this.body.parent = this.node;
    this.build();
    this.render();
    GameLog.shared.info("Mainline", "wire open " + this.nowText() + " / " + this.maxText());
    this.offSync = WireSession.onSync(() => this.onSync());
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.offSync) {
      this.offSync();
      this.offSync = null;
    }
  }

  private build(): void {
    place(createLabel(WIRE_MAINLINE_READONLY_TITLE, 40, { color: TITLE }), this.body, 0, 220);
    this.nowLabel = place(createLabel(this.nowText(), 28, { color: TITLE, width: 640 }), this.body, 0, 120);
    this.maxLabel = place(createLabel(this.maxText(), 28, { color: TITLE, width: 640 }), this.body, 0, 60);
    place(createLabel(WIRE_MAINLINE_READONLY_NOTE, 22, { color: MUTED, width: 640 }), this.body, 0, -20);
    place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -140);
  }

  private onSync(): void {
    if (this.disposed || !this.host.alive()) return;
    this.render();
  }

  private render(): void {
    if (this.disposed) return;
    this.write(this.nowLabel, this.nowText());
    this.write(this.maxLabel, this.maxText());
  }

  private nowText(): string {
    return formatWireChapterIdx("now", WireSession.nowIdx);
  }

  private maxText(): string {
    return formatWireChapterIdx("max", WireSession.maxIdx);
  }

  private write(node: Node | null, text: string): void {
    if (node && node.isValid) setText(node, text);
  }
}
