/**
 * 只给 skeleton-check 的 esbuild 解析 "cc"。
 * Creator 工程不引用这个文件。isBrowser 保持 false，用来覆盖预览里 sys.isBrowser 不准的情况。
 */
export const sys = {
  isBrowser: false,
  platform: "native",
  Platform: {
    MOBILE_BROWSER: "mobile-browser",
    DESKTOP_BROWSER: "desktop-browser",
    ANDROID: "android",
    IOS: "ios",
  },
  getSafeAreaRect(): { x: number; y: number; width: number; height: number } {
    return { x: 0, y: 0, width: 0, height: 0 };
  },
};

export class JsonAsset {
  json: object | null = null;
}

export const resources = {
  load(_path: string, _type: unknown, cb: (err: Error | null, asset: unknown) => void): void {
    cb(new Error("skeleton-check 不读 resources"), null);
  },
};

/**
 * 下面只给 backpack-view-check 跑视图。
 * 不是引擎。skeleton-check 不经过这些类。
 */

type Listener = (...args: unknown[]) => void;

export const _decorator = {
  ccclass(_name?: string): ClassDecorator {
    return (ctor) => ctor;
  },
  property(..._args: unknown[]): PropertyDecorator {
    return () => undefined;
  },
};

export class Color {
  static WHITE = new Color(255, 255, 255, 255);
  r: number;
  g: number;
  b: number;
  a: number;
  constructor(r = 255, g = 255, b = 255, a = 255) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
}

export class Component {
  node: Node | null = null;
  isValid = true;
  enabled = true;
  onLoad(): void {}
}

export class Node {
  static EventType = {
    TOUCH_START: "touch-start",
    TOUCH_MOVE: "touch-move",
    TOUCH_END: "touch-end",
    TOUCH_CANCEL: "touch-cancel",
    NODE_DESTROYED: "node-destroyed",
    CHILD_ADDED: "child-added",
  };

  name: string;
  layer = 0;
  active = true;
  isValid = true;
  position = { x: 0, y: 0, z: 0 };
  scale = { x: 1, y: 1, z: 1 };
  scene: { getChildByName(name: string): Node | null } | null = null;
  private parentNode: Node | null = null;
  private childNodes: Node[] = [];
  private components: Component[] = [];
  private listeners = new Map<string, Listener[]>();

  constructor(name?: string) {
    this.name = name || "";
  }

  get children(): Node[] {
    return this.childNodes;
  }

  get parent(): Node | null {
    return this.parentNode;
  }

  set parent(next: Node | null) {
    if (this.parentNode === next) return;
    if (this.parentNode) {
      const list = this.parentNode.childNodes;
      const index = list.indexOf(this);
      if (index >= 0) list.splice(index, 1);
    }
    this.parentNode = next;
    if (next) next.childNodes.push(this);
  }

  get activeInHierarchy(): boolean {
    let cur: Node | null = this;
    while (cur) {
      if (!cur.active) return false;
      cur = cur.parentNode;
    }
    return true;
  }

  getChildByName(name: string): Node | null {
    for (let i = 0; i < this.childNodes.length; i++) {
      if (this.childNodes[i].name === name) return this.childNodes[i];
    }
    return null;
  }

  addComponent<T extends Component>(type: new () => T): T {
    const comp = new type();
    comp.node = this;
    this.components.push(comp);
    if (typeof comp.onLoad === "function") comp.onLoad();
    return comp;
  }

  getComponent(type: new (...args: unknown[]) => Component): Component | null {
    for (let i = 0; i < this.components.length; i++) {
      const comp = this.components[i];
      if (comp instanceof type || comp.constructor === type) return comp;
    }
    return null;
  }

  removeComponent(comp: Component): void {
    const index = this.components.indexOf(comp);
    if (index >= 0) this.components.splice(index, 1);
  }

  setPosition(x: number, y?: number, z?: number): void {
    this.position = { x, y: y || 0, z: z || 0 };
  }

  setScale(x: number, y?: number, z?: number): void {
    this.scale = { x, y: typeof y === "number" ? y : x, z: typeof z === "number" ? z : 1 };
  }

  setSiblingIndex(index: number): void {
    const parent = this.parentNode;
    if (!parent) return;
    const list = parent.childNodes;
    const from = list.indexOf(this);
    if (from < 0) return;
    list.splice(from, 1);
    const at = Math.max(0, Math.min(index, list.length));
    list.splice(at, 0, this);
  }

  getSiblingIndex(): number {
    if (!this.parentNode) return 0;
    const index = this.parentNode.childNodes.indexOf(this);
    return index < 0 ? 0 : index;
  }

  on(type: string, callback: Listener): void {
    const list = this.listeners.get(type) || [];
    list.push(callback);
    this.listeners.set(type, list);
  }

  once(type: string, callback: Listener): void {
    const wrap: Listener = (...args) => {
      this.off(type, wrap);
      callback(...args);
    };
    this.on(type, wrap);
  }

  off(type: string, callback: Listener): void {
    const list = this.listeners.get(type);
    if (!list) return;
    const index = list.indexOf(callback);
    if (index >= 0) list.splice(index, 1);
  }

  emit(type: string, ...args: unknown[]): void {
    const list = (this.listeners.get(type) || []).slice();
    for (let i = 0; i < list.length; i++) list[i](...args);
  }

  removeFromParent(): void {
    this.parent = null;
  }

  destroy(): void {
    if (!this.isValid) return;
    this.isValid = false;
    const kids = this.childNodes.slice();
    this.emit(Node.EventType.NODE_DESTROYED);
    for (let i = 0; i < this.components.length; i++) this.components[i].isValid = false;
    for (let i = 0; i < kids.length; i++) kids[i].destroy();
    this.parent = null;
  }
}

export class UITransform extends Component {
  contentSize = { width: 0, height: 0 };
  _contentSize: { width: number; height: number } | null = null;
  anchorX = 0.5;
  anchorY = 0.5;
  anchorPoint = { x: 0.5, y: 0.5 };

  constructor() {
    super();
    this._contentSize = this.contentSize;
  }

  setContentSize(width: number, height: number): void {
    this.contentSize.width = width;
    this.contentSize.height = height;
    if (!this._contentSize) this._contentSize = this.contentSize;
    this._contentSize.width = width;
    this._contentSize.height = height;
  }

  setAnchorPoint(x: number, y: number): void {
    this.anchorX = x;
    this.anchorY = y;
    this.anchorPoint.x = x;
    this.anchorPoint.y = y;
  }
}

export class Label extends Component {
  string = "";
  fontSize = 20;
  lineHeight = 24;
  useSystemFont = true;
  font: unknown = null;
  fontFamily = "";
  overflow = 0;
  isBold = false;
  horizontalAlign = 1;
  verticalAlign = 1;
  color = new Color();
}

export class SpriteFrame {
  originalSize = { width: 0, height: 0 };
}

export class Sprite extends Component {
  static SizeMode = { CUSTOM: 0, TRIMMED: 1, RAW: 2 };
  static Type = { SIMPLE: 0, SLICED: 1, TILED: 2, FILLED: 3 };
  static FillType = { HORIZONTAL: 0, VERTICAL: 1, RADIAL: 2 };
  type = 0;
  fillType = 0;
  fillStart = 0;
  fillRange = 0;
  color = new Color();
  grayscale = false;
  spriteFrame: SpriteFrame | null = null;
  sizeMode = 0;
}

export class Graphics extends Component {
  fillColor = new Color();
  clear(): void {}
  rect(_x: number, _y: number, _w: number, _h: number): void {}
  fill(): void {}
}

export class Mask extends Component {
  static Type = {
    GRAPHICS_RECT: 0,
    GRAPHICS_ELLIPSE: 1,
    GRAPHICS_STENCIL: 2,
    SPRITE_STENCIL: 3,
  };
  type = Mask.Type.GRAPHICS_RECT;
}

export class ScrollView extends Component {
  vertical = true;
  horizontal = false;
  inertia = true;
  elastic = true;
  cancelInnerEvents = true;
  content: Node | null = null;
  scrollToTop(_time?: number): void {}
}

export class Button extends Component {
  static Transition = { NONE: 0, SCALE: 1, COLOR: 2, SPRITE: 3 };
  static EventType = { CLICK: "click" };
  transition = Button.Transition.NONE;
  zoomScale = 1.2;
  interactable = true;
}

export class BlockInputEvents extends Component {}

export class EditBox extends Component {
  static InputFlag = { DEFAULT: 0, PASSWORD: 1 };
  static InputMode = { ANY: 0, SINGLE_LINE: 1 };
  string = "";
  placeholder = "";
  maxLength = 0;
  inputFlag = 0;
  inputMode = 0;
  textLabel: Label | null = null;
  placeholderLabel: Label | null = null;
}

export class Widget extends Component {
  static AlignMode = { ON_WINDOW_RESIZE: 1 };
  isAlignHorizontalCenter = false;
  isAlignVerticalCenter = false;
  isAlignLeft = false;
  isAlignRight = false;
  isAlignTop = false;
  isAlignBottom = false;
  horizontalCenter = 0;
  verticalCenter = 0;
  left = 0;
  right = 0;
  top = 0;
  bottom = 0;
  alignMode = 0;
  updateAlignment(): void {}
}

export class Prefab {}

export class TTFFont {}
export class BitmapFont {}
export class AudioClip {}

export class AudioSource extends Component {
  clip: AudioClip | null = null;
  loop = false;
  volume = 1;
  play(): void {}
  stop(): void {}
}

export class UIOpacity extends Component {
  opacity = 255;
}

export class EventTouch {
  getUIDelta(): { x: number; y: number } {
    return { x: 0, y: 0 };
  }
}

export class Vec2 {
  x: number;
  y: number;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
}

export class Vec3 {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

export const Layers = { Enum: { UI_2D: 33554432 } };
export const HorizontalTextAlignment = { CENTER: 1, LEFT: 0, RIGHT: 2 };
export const VerticalTextAlignment = { CENTER: 1, TOP: 0, BOTTOM: 2 };
export const Overflow = { NONE: 0, CLAMP: 1, SHRINK: 2, RESIZE_HEIGHT: 3 };

const directorListeners = new Map<string, Listener[]>();

export class Director {
  static EVENT_AFTER_UPDATE = "after-update";
}

export const director = {
  loadScene(_name: string, _cb?: (err: Error | null, scene?: Node) => void): boolean {
    return false;
  },
  getScene(): { getChildByName(name: string): Node | null } | null {
    return null;
  },
  on(type: string, callback: Listener): void {
    const list = directorListeners.get(type) || [];
    list.push(callback);
    directorListeners.set(type, list);
  },
  off(type: string, callback: Listener): void {
    const list = directorListeners.get(type);
    if (!list) return;
    const index = list.indexOf(callback);
    if (index >= 0) list.splice(index, 1);
  },
  emit(type: string, ...args: unknown[]): void {
    const list = (directorListeners.get(type) || []).slice();
    for (let i = 0; i < list.length; i++) list[i](...args);
  },
};

export const view = {
  getVisibleSize(): { width: number; height: number } {
    return { width: 720, height: 1280 };
  },
  getDesignResolutionSize(): { width: number; height: number } {
    return { width: 720, height: 1280 };
  },
  on(_type: string, _callback: Listener): void {},
  off(_type: string, _callback: Listener): void {},
};

export const screen = {
  windowSize: { width: 720, height: 1280 },
  on(_type: string, _callback: Listener): void {},
  off(_type: string, _callback: Listener): void {},
};

export function instantiate(original: Prefab | Node | { _instantiate?: () => Node }): Node {
  const source = original as { _instantiate?: () => Node };
  if (source && typeof source._instantiate === "function") return source._instantiate();
  if (original instanceof Node) return new Node(original.name);
  return new Node("prefab");
}

export const assetManager = {
  loadBundle(_name: string, cb: (err: Error | null, bundle: null) => void): void {
    cb(new Error("backpack-view-check 不读 bundle"), null);
  },
  loadAny(_request: unknown, cb: (err: Error | null, asset: null) => void): void {
    cb(new Error("backpack-view-check 不读 uuid"), null);
  },
};

export namespace sp {
  export class SkeletonData {}
  export class Skeleton extends Component {
    skeletonData: SkeletonData | null = null;
    premultipliedAlpha = false;
    setAnimation(_track: number, _name: string, _loop: boolean): void {}
    setCompleteListener(_cb: (() => void) | null): void {}
    findAnimation(name: string): { name: string } | null {
      return name ? { name } : null;
    }
  }
}
