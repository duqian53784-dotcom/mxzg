/**
 * 启动加载层和热更层。两套 prefab 节点名相同，按名字绑。
 * 挂在 SafeFrame 上，根节点是设计分辨率 720×1280，不再按父节点 2000 放大。
 * Prefab 加载失败时用同一批 resources 贴图搭一份。
 */
import { BlockInputEvents, Button, Color, Mask, Node, Sprite, SpriteFrame, UITransform, resources } from "cc";
import { ConfigLoader } from "../config/ConfigLoader";
import { mountNamedSpine } from "./battleSpine";
import { findNode, loadPrefab, spawnPrefab } from "./prefabLoad";
import { createButton, createLabel, place, setText, uiNode } from "./UiKit";

export const LOADING_PREFAB_PATH = "prefabs/ui/login/LoadingLayer";
export const UPDATE_PREFAB_PATH = "prefabs/ui/login/UpdateLayer";

const FILL_W = 524;
const FILL_LEFT = -FILL_W / 2;
const TIP_MS = 3500;
const SPINE_STEM = "jindutiao";
const SPINE_CLIP = "stand";

export type BootChromeKind = "loading" | "update";

export interface BootCopy {
  versionFail: string;
  retry: string;
  /** 版本失败层重试一次之后的按钮。language 47647 是「跳过」，表没到时用「继续」。 */
  versionSkip: string;
  newVersion: string;
  wifi: string;
  verify: string;
  tips: string[];
}

const COPY_FALLBACK: BootCopy = {
  versionFail: "校验版本失败",
  retry: "重试",
  versionSkip: "继续",
  newVersion: "有新版本啦！",
  wifi: "请在wifi环境下，点击下载按钮进行更新。",
  verify: "正在验证资源，请耐心等候",
  tips: [],
};

export async function loadBootCopy(): Promise<BootCopy> {
  const copy: BootCopy = {
    versionFail: COPY_FALLBACK.versionFail,
    retry: COPY_FALLBACK.retry,
    versionSkip: COPY_FALLBACK.versionSkip,
    newVersion: COPY_FALLBACK.newVersion,
    wifi: COPY_FALLBACK.wifi,
    verify: COPY_FALLBACK.verify,
    tips: [],
  };
  try {
    const lang = await ConfigLoader.loadJson<{ rows?: unknown }>("config/language");
    const map = indexLanguage(lang.rows);
    copy.versionFail = pick(map, "47741", copy.versionFail);
    copy.retry = pick(map, "110013", copy.retry);
    copy.versionSkip = pick(map, "47647", copy.versionSkip);
    copy.newVersion = pick(map, "110029", copy.newVersion);
    copy.wifi = pick(map, "110030", copy.wifi);
    copy.verify = pick(map, "47149", copy.verify);
    const tipsFile = await ConfigLoader.loadJson<{ rows?: unknown }>("config/loadingtips");
    const rows = Array.isArray(tipsFile.rows) ? tipsFile.rows : [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || typeof row !== "object") continue;
      const tips = (row as { tips?: unknown }).tips;
      const key = typeof tips === "number" || typeof tips === "string" ? String(tips) : "";
      const line = key ? map[key] : "";
      if (line) copy.tips.push(line);
    }
  } catch (_err) {
    /* 表还没齐时用上面的字。loadAll 之后会再进缓存。 */
  }
  return copy;
}

export class BootChrome {
  private root: Node | null = null;
  private kind: BootChromeKind = "loading";
  private ratio = 0;
  private stage = "";
  private tips: string[] = [];
  private tipIndex = -1;
  private tipTimer: ReturnType<typeof setInterval> | null = null;
  private retryResolve: ((ok: boolean) => void) | null = null;
  private destroyed = false;

  constructor(private parent: Node) {}

  async open(kind: BootChromeKind): Promise<void> {
    if (this.destroyed || !this.parent.isValid) return;
    this.kind = kind;
    this.destroyRoot();
    const path = kind === "update" ? UPDATE_PREFAB_PATH : LOADING_PREFAB_PATH;
    let root: Node | null = null;
    try {
      const prefab = await loadPrefab(path);
      if (this.destroyed || !this.parent.isValid) return;
      root = spawnPrefab(prefab, this.parent);
    } catch (_err) {
      if (this.destroyed || !this.parent.isValid) return;
      root = this.buildFallback();
      root.parent = this.parent;
    }
    this.root = root;
    this.bindRetry();
    this.apply();
    this.mountSpine();
    this.raise();
  }

  setStage(text: string): void {
    this.stage = text;
    const node = this.child("Message");
    if (node) setText(node, text);
  }

  setRatio(ratio: number): void {
    const clamped = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
    this.ratio = clamped;
    const width = Math.round(FILL_W * clamped);
    const mask = this.child("BarMask");
    if (mask) {
      const ui = mask.getComponent(UITransform);
      if (ui) {
        const height = ui.contentSize && ui.contentSize.height > 0 ? ui.contentSize.height : 40;
        ui.setContentSize(width, height);
      }
    }
    const head = this.child("BarHead");
    if (head) head.setPosition(FILL_LEFT + width, head.position.y, 0);
    const percent = this.child("Percent");
    if (percent) setText(percent, Math.round(clamped * 100) + "%");
  }

  setTips(lines: string[]): void {
    const next: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const clean = stripHtml(lines[i]);
      if (clean) next.push(clean);
    }
    this.tips = next;
    this.tipIndex = -1;
    this.rotateTip();
    if (this.tipTimer) clearInterval(this.tipTimer);
    if (next.length > 1) this.tipTimer = setInterval(() => this.rotateTip(), TIP_MS);
  }

  show(): void {
    if (this.root && this.root.isValid) {
      this.root.active = true;
      this.raise();
    }
  }

  hide(): void {
    if (this.root && this.root.isValid) this.root.active = false;
    const retry = this.child("Retry");
    if (retry) retry.active = false;
  }

  /** 停在当前层上，等按钮。销毁时得到 false。 */
  prompt(message: string, buttonLabel: string): Promise<boolean> {
    this.show();
    this.setStage(message);
    this.setRetryLabel(buttonLabel);
    const retry = this.child("Retry");
    if (retry) retry.active = true;
    return new Promise((resolve) => {
      if (this.retryResolve) this.retryResolve(false);
      if (!retry) {
        this.retryResolve = null;
        resolve(false);
        return;
      }
      this.retryResolve = resolve;
    });
  }

  destroy(): void {
    this.destroyed = true;
    if (this.tipTimer) clearInterval(this.tipTimer);
    this.tipTimer = null;
    if (this.retryResolve) {
      const resolve = this.retryResolve;
      this.retryResolve = null;
      resolve(false);
    }
    this.destroyRoot();
  }

  private apply(): void {
    this.setStage(this.stage);
    this.setRatio(this.ratio);
    this.rotateTip();
    const retry = this.child("Retry");
    if (retry) retry.active = false;
  }

  private rotateTip(): void {
    if (this.tips.length === 0) return;
    if (this.tips.length === 1) {
      this.tipIndex = 0;
    } else {
      let next = this.tipIndex;
      do {
        next = Math.floor(Math.random() * this.tips.length);
      } while (next === this.tipIndex);
      this.tipIndex = next;
    }
    const node = this.child("Tips");
    if (node) setText(node, this.tips[this.tipIndex]);
  }

  private mountSpine(): void {
    const host = this.child("BarMask/Spine");
    if (!host) return;
    mountNamedSpine(host, SPINE_STEM, SPINE_CLIP);
  }

  private bindRetry(): void {
    const retry = this.child("Retry");
    if (!retry || !retry.getComponent(Button)) return;
    retry.on(Button.EventType.CLICK, () => {
      retry.active = false;
      const resolve = this.retryResolve;
      this.retryResolve = null;
      if (resolve) resolve(true);
    });
  }

  private setRetryLabel(text: string): void {
    const label = this.child("Retry/Label");
    if (label) setText(label, text);
  }

  private raise(): void {
    const root = this.root;
    const parent = root && root.parent;
    if (!root || !parent) return;
    root.setSiblingIndex(Math.max(0, parent.children.length - 1));
  }

  private child(path: string): Node | null {
    if (!this.root || !this.root.isValid) return null;
    return findNode(this.root, path);
  }

  private destroyRoot(): void {
    if (this.root && this.root.isValid) this.root.destroy();
    this.root = null;
  }

  private buildFallback(): Node {
    const root = uiNode(this.kind === "update" ? "UpdateLayer" : "LoadingLayer");
    const ui = root.addComponent(UITransform);
    ui.setContentSize(720, 1280);
    root.addComponent(BlockInputEvents);

    const bg = uiNode("Bg");
    const bgUi = bg.addComponent(UITransform);
    bgUi.setContentSize(756, 1280);
    const bgSprite = bg.addComponent(Sprite);
    bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    bg.parent = root;
    paintSprite(bg, bgSprite, "ui/login/bg-loading");

    const message = createLabel("", 24, { color: new Color(255, 244, 220, 255), width: 660, height: 72 });
    message.name = "Message";
    place(message, root, 0, -390);

    const plate = uiNode("PercentPlate");
    plate.addComponent(UITransform).setContentSize(84, 84);
    const plateSprite = plate.addComponent(Sprite);
    plateSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    place(plate, root, 0, -448);
    paintSprite(plate, plateSprite, "ui/common/loading_text-bg");

    const percent = createLabel("0%", 22, { color: new Color(255, 248, 230, 255), width: 160 });
    percent.name = "Percent";
    place(percent, root, 0, -448);

    const frame = uiNode("BarFrame");
    frame.addComponent(UITransform).setContentSize(617, 37);
    const frameSprite = frame.addComponent(Sprite);
    frameSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    place(frame, root, 0, -500);
    paintSprite(frame, frameSprite, "ui/common/loading_spr-bg-2");

    const track = uiNode("BarTrack");
    track.addComponent(UITransform).setContentSize(532, 32);
    const trackSprite = track.addComponent(Sprite);
    trackSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    place(track, root, 0, -500);
    paintSprite(track, trackSprite, "ui/common/loading_progress-bg");

    const mask = uiNode("BarMask");
    const maskUi = mask.addComponent(UITransform);
    maskUi.setAnchorPoint(0, 0.5);
    maskUi.setContentSize(0, 40);
    const maskComp = mask.addComponent(Mask);
    maskComp.type = Mask.Type.GRAPHICS_RECT;
    place(mask, root, FILL_LEFT, -500);

    const fill = uiNode("BarFill");
    fill.addComponent(UITransform).setContentSize(FILL_W, 24);
    const fillSprite = fill.addComponent(Sprite);
    fillSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    fill.setPosition(FILL_W / 2, 0, 0);
    fill.parent = mask;
    paintSprite(fill, fillSprite, "ui/common/loading_progress");

    const spine = uiNode("Spine");
    spine.addComponent(UITransform).setContentSize(275, 39);
    spine.setPosition(FILL_W / 2, 0, 0);
    spine.setScale(Math.round((FILL_W / 275) * 10000) / 10000, 1, 1);
    spine.parent = mask;

    const head = uiNode("BarHead");
    head.addComponent(UITransform).setContentSize(18, 27);
    const headSprite = head.addComponent(Sprite);
    headSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    place(head, root, FILL_LEFT, -500);
    paintSprite(head, headSprite, "ui/common/loading_spr-progress-1");

    const tips = createLabel("", 20, { color: new Color(255, 238, 178, 255), width: 660, height: 80 });
    tips.name = "Tips";
    place(tips, root, 0, -580);

    const retry = createButton("重试", () => undefined, 134, 56, new Color(210, 120, 40, 255), 24);
    retry.name = "Retry";
    retry.active = false;
    place(retry, root, 0, -280);
    return root;
  }
}

function paintSprite(node: Node, sprite: Sprite, path: string): void {
  resources.load(path + "/spriteFrame", SpriteFrame, (err, frame) => {
    if (!node.isValid || err || !frame) return;
    sprite.spriteFrame = frame;
  });
}

function indexLanguage(rows: unknown): { [key: string]: string } {
  const map: { [key: string]: string } = {};
  const list = Array.isArray(rows) ? rows : [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (!row || typeof row !== "object") continue;
    const rec = row as { key?: unknown; value?: unknown };
    if (rec.key === undefined || rec.key === null || typeof rec.value !== "string") continue;
    map[String(rec.key)] = stripHtml(rec.value);
  }
  return map;
}

function pick(map: { [key: string]: string }, key: string, fallback: string): string {
  return map[key] || fallback;
}

function stripHtml(raw: string): string {
  return raw.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

export function preloadBootAsset(path: string, type: unknown): Promise<void> {
  return new Promise((resolve) => {
    resources.load(path, type, () => resolve());
  });
}
