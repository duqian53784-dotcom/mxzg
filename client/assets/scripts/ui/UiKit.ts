import {
  Button,
  Color,
  EditBox,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Layers,
  Node,
  Overflow,
  UITransform,
  VerticalTextAlignment,
} from "cc";

/** 代码里搭 UI，不依赖贴图。场景可以保持空白。 */
export function uiNode(name: string): Node {
  const node = new Node(name);
  node.layer = Layers.Enum.UI_2D;
  return node;
}

export function place(node: Node, parent: Node, x: number, y: number): Node {
  node.setPosition(x, y, 0);
  node.parent = parent;
  return node;
}

export function setText(node: Node, text: string): void {
  const label = node.getComponent(Label);
  if (label) label.string = text;
}

export function createLabel(
  text: string,
  fontSize: number,
  options?: { color?: Color; width?: number; height?: number; align?: "center" | "left" }
): Node {
  const width = options?.width ?? 680;
  const height = options?.height ?? fontSize + 16;
  const node = uiNode("Label");
  const ui = node.addComponent(UITransform);
  ui.setContentSize(width, height);
  const label = node.addComponent(Label);
  label.string = text;
  label.fontSize = fontSize;
  label.lineHeight = fontSize + 8;
  label.useSystemFont = true;
  label.fontFamily = "sans-serif";
  label.overflow = Overflow.CLAMP;
  label.horizontalAlign = options?.align === "left" ? HorizontalTextAlignment.LEFT : HorizontalTextAlignment.CENTER;
  label.verticalAlign = options?.height ? VerticalTextAlignment.TOP : VerticalTextAlignment.CENTER;
  label.color = options?.color ?? new Color(240, 240, 240, 255);
  return node;
}

export function createRect(name: string, width: number, height: number, color: Color): Node {
  const node = uiNode(name);
  const ui = node.addComponent(UITransform);
  ui.setContentSize(width, height);
  const g = node.addComponent(Graphics);
  g.fillColor = color;
  g.rect(-width / 2, -height / 2, width, height);
  g.fill();
  return node;
}

export function paintRect(node: Node, color: Color): void {
  const g = node.getComponent(Graphics);
  const ui = node.getComponent(UITransform);
  if (!g || !ui) return;
  const size = ui.contentSize;
  const width = size && typeof size.width === "number" ? size.width : 0;
  const height = size && typeof size.height === "number" ? size.height : 0;
  if (typeof g.clear === "function") g.clear();
  g.fillColor = color;
  g.rect(-width / 2, -height / 2, width, height);
  g.fill();
}

export interface TextField {
  node: Node;
  getValue(): string;
  setValue(value: string): void;
}

/** 单行输入。密码只影响显示，调用方决定要不要把值发出去。 */
export function createField(
  placeholder: string,
  width: number,
  height: number,
  options?: { password?: boolean; text?: string; maxLength?: number }
): TextField {
  const root = uiNode("Field");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(width, height);
  const bg = createRect("bg", width, height, new Color(32, 48, 78, 255));
  bg.parent = root;

  const initial = options?.text ?? "";
  const text = createLabel(initial, 22, {
    color: new Color(255, 255, 255, 255),
    width: width - 28,
    align: "left",
  });
  place(text, root, 0, 0);
  const hint = createLabel(placeholder, 22, {
    color: new Color(150, 166, 186, 255),
    width: width - 28,
    align: "left",
  });
  place(hint, root, 0, 0);
  if (initial) hint.active = false;

  const edit = root.addComponent(EditBox);
  edit.textLabel = text.getComponent(Label);
  edit.placeholderLabel = hint.getComponent(Label);
  edit.placeholder = placeholder;
  edit.maxLength = options?.maxLength ?? 16;
  edit.inputMode = EditBox.InputMode.SINGLE_LINE;
  edit.inputFlag = options?.password ? EditBox.InputFlag.PASSWORD : EditBox.InputFlag.DEFAULT;
  edit.string = initial;

  return {
    node: root,
    getValue(): string {
      return typeof edit.string === "string" ? edit.string : "";
    },
    setValue(value: string): void {
      edit.string = value;
      hint.active = !value;
    },
  };
}

export function createButton(
  text: string,
  onClick: () => void,
  width = 300,
  height = 56,
  fill?: Color
): Node {
  const root = uiNode("Btn");
  const ui = root.addComponent(UITransform);
  ui.setContentSize(width, height);

  const bg = createRect("bg", width, height, fill ?? new Color(46, 110, 190, 255));
  bg.parent = root;

  const label = createLabel(text, 24, { width: width - 16, color: new Color(255, 255, 255, 255) });
  label.parent = root;

  const button = root.addComponent(Button);
  button.transition = Button.Transition.SCALE;
  button.zoomScale = 0.96;
  root.on(Button.EventType.CLICK, onClick);
  return root;
}
