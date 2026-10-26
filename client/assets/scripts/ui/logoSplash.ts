/**
 * 开机 logo。旧 lua 不在仓库里，淡入淡出按这套资源常用的三段：
 * 淡入 1 秒、停留 1 秒、淡出 0.5 秒。点一下跳过停留和淡出。
 * bgm-logo 从淡入开始循环，进主城再停。
 */
import { AudioClip, AudioSource, BlockInputEvents, Color, Node, resources, Sprite, SpriteFrame, UIOpacity, UITransform } from "cc";
import { createRect, place, uiNode } from "./UiKit";

export const LOGO_FADE_IN_SEC = 1;
export const LOGO_HOLD_SEC = 1;
export const LOGO_FADE_OUT_SEC = 0.5;
export const LOGO_SPRITE = "ui/login/logo-scene_spr-logo";
export const LOGO_BGM = "audio/bgm-logo";

export interface LogoSplashHandle {
  done: Promise<void>;
  skip(): void;
  stop(): void;
  /** 进主城时停掉。启动失败时也停。 */
  stopMusic(): void;
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
  logoUi.setContentSize(3, 3);
  const sprite = logo.addComponent(Sprite);
  sprite.sizeMode = Sprite.SizeMode.RAW;
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
      if (!err && frame) sprite.spriteFrame = frame;
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

function fade(opacity: UIOpacity, from: number, to: number, seconds: number): Promise<void> {
  opacity.opacity = from;
  if (seconds <= 0) {
    opacity.opacity = to;
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
      if (t >= 1) {
        clearInterval(timer);
        resolve();
      }
    }, 16);
  });
}
