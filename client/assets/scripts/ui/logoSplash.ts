/**
 * 开机 logo。旧 lua 不在仓库里，淡入淡出按这套资源常用的三段：
 * 淡入 1 秒、停留 1 秒、淡出 0.5 秒。点一下跳过停留和淡出。
 * bgm-logo 从淡入开始循环，进主城再停。
 * logo-scene_spr-logo.png 仍是 3×3 的失败抽出。比 LOGO_SPECK_MAX 还小就不显示，
 * 改用 logo-scene 里已经抽出的左右饰纹拼成焰环。真图以后大于这个尺寸就只显示那一张。
 */
import { AudioClip, AudioSource, BlockInputEvents, Color, Node, resources, Sprite, SpriteFrame, UIOpacity, UITransform } from "cc";
import { GameLog } from "../core/GameLog";
import { createRect, place, uiNode } from "./UiKit";

export const LOGO_FADE_IN_SEC = 1;
export const LOGO_HOLD_SEC = 1;
export const LOGO_FADE_OUT_SEC = 0.5;
export const LOGO_SPRITE = "ui/login/logo-scene_spr-logo";
export const LOGO_ORNAMENT_L = "ui/login/logo-scene_spr-parttern-l";
export const LOGO_ORNAMENT_R = "ui/login/logo-scene_spr-parttern-r";
export const LOGO_BGM = "audio/bgm-logo";
/** 宽或高不超过这个数，当成失败抽出，不拿来当开机图。 */
export const LOGO_SPECK_MAX = 8;
/** 左右饰纹拉到同一高度，中间叠一段，右边再抬一点，拼成焰环。 */
export const LOGO_RING_HEIGHT = 820;
export const LOGO_RING_OVERLAP = 210;
export const LOGO_RING_LIFT = 40;
export const LOGO_RING_RIGHT_LIFT = 36;

export interface LogoSplashHandle {
  done: Promise<void>;
  skip(): void;
  stop(): void;
  /** 进主城时停掉。启动失败时也停。 */
  stopMusic(): void;
}

export function logoFrameIsSpeck(frame: SpriteFrame | null | undefined): boolean {
  if (!frame || !frame.originalSize) return true;
  const width = frame.originalSize.width;
  const height = frame.originalSize.height;
  if (!(width > LOGO_SPECK_MAX) || !(height > LOGO_SPECK_MAX)) return true;
  return false;
}

export function playLogoSplash(parent: Node, audioHost: Node): LogoSplashHandle {
  const root = uiNode("LogoSplash");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(2000, 2000);
  root.addComponent(BlockInputEvents);
  root.parent = parent;
  place(createRect("dim", 2000, 2000, new Color(0, 0, 0, 255)), root, 0, 0);
  const logo = uiNode("logo-scene_spr-logo");
  const logoUi = logo.addComponent(UITransform);
  logoUi.setContentSize(LOGO_RING_HEIGHT, LOGO_RING_HEIGHT);
  const sprite = logo.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.RAW;
  sprite.enabled = false;
  const opacity = logo.addComponent(UIOpacity);
  opacity.opacity = 0;
  logo.parent = root;

  let skipped = false;
  let stopped = false;
  const timers: Array<ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>> = [];
  let audio: AudioSource | null = null;

  const clearTimers = () => {
    for (let i = 0; i < timers.length; i++) clearTimeout(timers[i] as ReturnType<typeof setTimeout>);
    timers.length = 0;
  };

  let onSkip = (): void => undefined;
  let settle: (() => void) | null = null;

  const finish = () => {
    if (stopped) return;
    stopped = true;
    clearTimers();
    root.off(Node.EventType.TOUCH_END, onSkip);
    if (root.isValid) root.destroy();
    if (settle) {
      const doneSettle = settle;
      settle = null;
      doneSettle();
    }
  };

  const done = new Promise<void>((resolve) => {
    settle = resolve;
    onSkip = () => {
      if (skipped || stopped) return;
      skipped = true;
      clearTimers();
      void fade(opacity, opacity.opacity, 0, 0.15).then(() => finish());
    };
    root.on(Node.EventType.TOUCH_END, onSkip);

    resources.load(LOGO_SPRITE + "/spriteFrame", SpriteFrame, (err, frame) => {
      if (stopped || !logo.isValid) return;
      if (!err && frame && !logoFrameIsSpeck(frame)) {
        sprite.enabled = true;
        sprite.spriteFrame = frame;
        const size = frame.originalSize;
        if (size && size.width > 0 && size.height > 0) logoUi.setContentSize(size.width, size.height);
        return;
      }
      mountLogoRing(logo, opacity);
    });
    resources.load(LOGO_BGM, AudioClip, (err, clip) => {
      if (stopped || !audioHost.isValid || err || !clip) return;
      audio = audioHost.getComponent(AudioSource) || audioHost.addComponent(AudioSource);
      audio.clip = clip;
      audio.loop = true;
      audio.play();
    });

    void fade(opacity, 0, 255, LOGO_FADE_IN_SEC).then(() => {
      if (stopped || skipped) return;
      const hold = setTimeout(() => {
        if (stopped || skipped) return;
        void fade(opacity, 255, 0, LOGO_FADE_OUT_SEC).then(() => finish());
      }, LOGO_HOLD_SEC * 1000);
      timers.push(hold);
    });
  });

  return {
    done,
    skip() {
      root.emit(Node.EventType.TOUCH_END);
    },
    stop() {
      finish();
    },
    stopMusic() {
      if (audio) audio.stop();
    },
  };
}

function mountLogoRing(logo: Node, opacity: UIOpacity): void {
  let left: SpriteFrame | null = null;
  let right: SpriteFrame | null = null;
  let pending = 2;
  const arrive = (side: "l" | "r", frame: SpriteFrame | null) => {
    if (side === "l") left = frame;
    else right = frame;
    pending -= 1;
    if (pending > 0 || !logo.isValid) return;
    if (left && right) {
      placeLogoRing(logo, opacity, left, right);
      return;
    }
    const only = left || right;
    if (only) {
      placeOneOrnament(logo, opacity, only, left ? "logo-ornament-l" : "logo-ornament-r");
      return;
    }
    GameLog.shared.warn("Boot", "logo ornament miss " + LOGO_ORNAMENT_L);
  };
  loadSprite(LOGO_ORNAMENT_L, (frame) => arrive("l", frame));
  loadSprite(LOGO_ORNAMENT_R, (frame) => arrive("r", frame));
}

function placeLogoRing(logo: Node, opacity: UIOpacity, left: SpriteFrame, right: SpriteFrame): void {
  const lw = left.originalSize.width;
  const lh = left.originalSize.height;
  const rw = right.originalSize.width;
  const rh = right.originalSize.height;
  if (!(lh > 0) || !(rh > 0)) return;
  const scaleL = LOGO_RING_HEIGHT / lh;
  const scaleR = LOGO_RING_HEIGHT / rh;
  const dispL = lw * scaleL;
  const dispR = rw * scaleR;
  const pair = dispL + dispR - LOGO_RING_OVERLAP;
  const leftEdge = -pair / 2;
  paintOrnament(logo, opacity, "logo-ornament-l", left, leftEdge + dispL / 2, LOGO_RING_LIFT, scaleL);
  paintOrnament(
    logo,
    opacity,
    "logo-ornament-r",
    right,
    leftEdge + dispL - LOGO_RING_OVERLAP + dispR / 2,
    LOGO_RING_LIFT + LOGO_RING_RIGHT_LIFT,
    scaleR
  );
}

function placeOneOrnament(logo: Node, opacity: UIOpacity, frame: SpriteFrame, name: string): void {
  const height = frame.originalSize.height;
  const scale = height > 0 ? LOGO_RING_HEIGHT / height : 1;
  paintOrnament(logo, opacity, name, frame, 0, LOGO_RING_LIFT, scale);
}

function paintOrnament(logo: Node, opacity: UIOpacity, name: string, frame: SpriteFrame, x: number, y: number, scale: number): void {
  const node = uiNode(name);
  const ui = node.addComponent(UITransform);
  const size = frame.originalSize;
  ui.setContentSize(size.width, size.height);
  const sprite = node.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.RAW;
  sprite.spriteFrame = frame;
  const childOpacity = node.addComponent(UIOpacity);
  childOpacity.opacity = opacity.opacity;
  node.setScale(scale, scale, 1);
  place(node, logo, x, y);
}

function loadSprite(path: string, done: (frame: SpriteFrame | null) => void): void {
  resources.load(path + "/spriteFrame", SpriteFrame, (err, frame) => {
    if (err || !frame) {
      GameLog.shared.warn("Boot", "logo ornament miss " + path);
      done(null);
      return;
    }
    done(frame);
  });
}

function fade(opacity: UIOpacity, from: number, to: number, seconds: number): Promise<void> {
  opacity.opacity = from;
  syncChildOpacity(opacity);
  if (seconds <= 0) {
    opacity.opacity = to;
    syncChildOpacity(opacity);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (!opacity.isValid) {
        clearInterval(timer);
        resolve();
        return;
      }
      const t = Math.min(1, (Date.now() - started) / (seconds * 1000));
      opacity.opacity = from + (to - from) * t;
      syncChildOpacity(opacity);
      if (t >= 1) {
        clearInterval(timer);
        resolve();
      }
    }, 16);
  });
}

function syncChildOpacity(opacity: UIOpacity): void {
  const node = opacity.node;
  if (!node || !node.isValid) return;
  const kids = node.children;
  for (let i = 0; i < kids.length; i++) {
    const child = kids[i].getComponent(UIOpacity);
    if (child) child.opacity = opacity.opacity;
  }
}
