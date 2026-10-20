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
    setSiblingIndex(index: number): void;
    getChildByName(name: string): Node | null;
    addComponent(type: unknown): any;
    getComponent(type: unknown): any;
    on(type: string, callback: (...args: unknown[]) => void, target?: unknown): void;
    destroy(): void;
  }

  export class Component {
    node: Node;
    isValid: boolean;
    start(): void;
  }

  export class UITransform {
    setContentSize(width: number, height: number): void;
    contentSize: { width: number; height: number };
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
    rect(x: number, y: number, w: number, h: number): void;
    fill(): void;
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
  export const HorizontalTextAlignment: { CENTER: number };
  export const VerticalTextAlignment: { CENTER: number };
  export const Overflow: { NONE: number; CLAMP: number };

  export const director: {
    loadScene(name: string, cb?: (err: Error | null, scene?: Node) => void): boolean;
    getScene(): { getChildByName(name: string): Node | null } | null;
  };

  export const resources: {
    load(path: string, type: unknown, cb: (err: Error | null, asset: JsonAsset | null) => void): void;
  };
}
