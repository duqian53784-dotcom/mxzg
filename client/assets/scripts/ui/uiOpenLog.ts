import { Node } from "cc";
import { GameLog } from "../core/GameLog";

const ENGINE_COMPONENTS = [
  "UITransform",
  "Sprite",
  "Label",
  "Button",
  "Widget",
  "Layout",
  "ScrollView",
  "Mask",
  "Graphics",
  "RichText",
  "ProgressBar",
  "EditBox",
  "BlockInputEvents",
  "Canvas",
  "Camera",
  "PageView",
  "UIOpacity",
];

/** 预制路径的文件名，不带目录和 .prefab。 */
export function prefabBaseName(path: string): string {
  const cut = path.split("/").pop() || path;
  return cut.replace(/\.prefab$/, "");
}

/**
 * 预制根上的业务脚本类名。没有脚本时用节点名（CCBI 类名）。
 * 引擎组件和过短的压缩名跳过。
 */
export function componentClassName(node: Node | null | undefined): string {
  if (!node) return "";
  const list = node.components;
  if (list) {
    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      const ctor = row && row.constructor;
      const name = ctor && typeof ctor.name === "string" ? ctor.name : "";
      if (!name || name.length <= 2 || name === "Component") continue;
      if (ENGINE_COMPONENTS.indexOf(name) >= 0) continue;
      return name;
    }
  }
  return node.name || "";
}

/** 打开正式界面时打一行：类名 + 预制名。UIManager 落地后也调 GameLog.openView。 */
export function logOpenedPrefab(view: Node | null, prefabPath: string, fallbackClass: string): void {
  const prefab = prefabBaseName(prefabPath);
  const cls = componentClassName(view) || prefab || fallbackClass;
  GameLog.shared.openView(cls, prefab || "(none)", prefabPath);
}
