/** 仅给 client/tools/tsconfig.check.json 用，代替 Creator 生成的 cc 类型。不要被游戏脚本引用。 */
declare module "cc" {
  export const _decorator: {
    ccclass: (name?: string) => ClassDecorator;
    /** 既可 @property 也可 @property(options)，与 Creator 声明一致。 */
    property: PropertyDecorator & ((...args: unknown[]) => PropertyDecorator);
  };

  export class Color {
    constructor(r?: number, g?: number, b?: number, a?: number);
    r: number;
    g: number;
    b: number;
    a: number;
  }

  export class Node {
    name: string;
    layer: number;
    parent: Node | null;
    active: boolean;
    children: Node[];
    scene: { getChildByName(name: string): Node | null } | null;
    isValid: boolean;
    constructor(name?: string);
    setPosition(x: number, y: number, z?: number): void;
    setScale(x: number, y?: number, z?: number): void;
    setSiblingIndex(index: number): void;
    getChildByName(name: string): Node | null;
    addComponent(type: unknown): any;
    getComponent(type: unknown): any;
    on(type: string, callback: (...args: unknown[]) => void, target?: unknown): void;
    off(type: string, callback: (...args: unknown[]) => void, target?: unknown): void;
    destroy(): void;
    static EventType: {
      TOUCH_START: string;
      TOUCH_MOVE: string;
      TOUCH_END: string;
      TOUCH_CANCEL: string;
    };
  }

  export class Component {
    node: Node;
    isValid: boolean;
    start(): void;
  }

  export class Mask {
    static Type: {
      GRAPHICS_RECT: number;
      GRAPHICS_ELLIPSE: number;
      GRAPHICS_STENCIL: number;
      SPRITE_STENCIL: number;
    };
    type: number;
  }

  export class UITransform {
    setContentSize(width: number, height: number): void;
    setAnchorPoint(x: number, y: number): void;
    contentSize: { width: number; height: number };
    anchorX: number;
    anchorY: number;
    anchorPoint: { x: number; y: number };
  }

  export class Label {
    string: string;
    fontSize: number;
    lineHeight: number;
    useSystemFont: boolean;
    fontFamily: string;
    overflow: number;
    horizontalAlign: number;
    verticalAlign: number;
    color: Color;
  }

  export class Graphics {
    fillColor: Color;
    clear(): void;
    rect(x: number, y: number, w: number, h: number): void;
    fill(): void;
  }

  export class EditBox extends Component {
    static InputFlag: { DEFAULT: number; PASSWORD: number };
    static InputMode: { ANY: number; SINGLE_LINE: number };
    string: string;
    placeholder: string;
    maxLength: number;
    inputFlag: number;
    inputMode: number;
    textLabel: Label | null;
    placeholderLabel: Label | null;
  }

  export class Button {
    static Transition: { NONE: number; SCALE: number };
    static EventType: { CLICK: string };
    transition: number;
    zoomScale: number;
    interactable: boolean;
  }

  export class BlockInputEvents {}

  export class JsonAsset {
    json: object | null;
  }

  export const Layers: { Enum: { UI_2D: number } };
  export const HorizontalTextAlignment: { CENTER: number; LEFT: number };
  export const VerticalTextAlignment: { CENTER: number; TOP: number };
  export const Overflow: { NONE: number; CLAMP: number };

  export const director: {
    loadScene(name: string, cb?: (err: Error | null, scene?: Node) => void): boolean;
    getScene(): { getChildByName(name: string): Node | null } | null;
  };

  export const view: {
    getVisibleSize(): { width: number; height: number };
    getDesignResolutionSize(): { width: number; height: number };
    on(type: string, callback: (...args: unknown[]) => void, target?: unknown): void;
    off(type: string, callback: (...args: unknown[]) => void, target?: unknown): void;
  };

  export const screen: {
    windowSize: { width: number; height: number };
    on(type: string, callback: (...args: unknown[]) => void, target?: unknown): void;
    off(type: string, callback: (...args: unknown[]) => void, target?: unknown): void;
  };

  export const sys: {
    getSafeAreaRect(): { x: number; y: number; width: number; height: number };
    localStorage?: {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
    };
  };

  export class EventTouch {
    getUIDelta(): { x: number; y: number };
  }

  export class SpriteFrame {
    originalSize: { width: number; height: number };
  }

  export const resources: {
    load(path: string, type: unknown, cb: (err: Error | null, asset: any) => void): void;
  };

  export namespace sp {
    export class SkeletonData {}
    export class Skeleton extends Component {
      skeletonData: SkeletonData | null;
      premultipliedAlpha: boolean;
      setAnimation(track: number, name: string, loop: boolean): void;
      findAnimation(name: string): { name: string } | null;
    }
  }

  export class Prefab {}

  export class Sprite {
    static SizeMode: { CUSTOM: number; TRIMMED: number; RAW: number };
    color: Color;
    grayscale: boolean;
    spriteFrame: SpriteFrame | null;
    sizeMode: number;
  }

  export function instantiate(original: Prefab | Node): Node;

  export namespace AssetManager {
    export interface Bundle {
      load(path: string, type: unknown, cb: (err: Error | null, asset: Prefab | null) => void): void;
    }
  }

  export const assetManager: {
    loadBundle(name: string, cb: (err: Error | null, bundle: AssetManager.Bundle | null) => void): void;
    loadAny(
      request: string | { uuid?: string },
      cb: (err: Error | null, asset: Prefab | null) => void
    ): void;
  };
}
