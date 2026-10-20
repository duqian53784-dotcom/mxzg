import {
  Button,
  Color,
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
