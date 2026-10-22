import { assetManager, Button, Color, EditBox, instantiate, Node, Prefab, Sprite } from "cc";
import { BATTLE_PREFAB_PATH } from "./battlePrefabLayout";

/**
 * 界面 Prefab 在 assets/prefabs，不在 resources。
 * assets/prefabs 是名为 prefabs 的 Asset Bundle。
 * 路径相对 assets，例如 prefabs/ui/login/LoginPanel。
 * 先 loadBundle，再用 bundle.load。编辑器还没刷出 bundle 时，用 .meta uuid 走 assetManager.loadAny。
 * 不要 resources.load。
 */

/** 相对 assets，不是 resources 路径。 */
export const LOGIN_PREFAB_PATH = "prefabs/ui/login/LoginPanel";
export const CREATE_ROLE_PREFAB_PATH = "prefabs/ui/login/CreateRolePanel";
export const CITY_CHROME_PREFAB_PATH = "prefabs/ui/city/CityChrome";
export const CITY_HUB_PREFAB_PATH = "prefabs/ui/city/CityHub";
export const HERO_PREFAB_PATH = "prefabs/ui/hero/HeroPage";
export const SUMMON_PREFAB_PATH = "prefabs/ui/summon/SummonPage";
export { BATTLE_PREFAB_PATH };

/** 与 .prefab.meta 的 uuid 一致。只给 loadAny 兜底，不拿去 resources.load。 */
const PREFAB_UUID: { [path: string]: string } = {
  "prefabs/ui/login/LoginPanel": "196fd024-dd83-4ee7-9783-1617ce3279a8",
  "prefabs/ui/login/CreateRolePanel": "d2eb0e48-bc58-4e09-b95f-ce45350461b1",
  "prefabs/ui/city/CityChrome": "c97efb56-db67-4c93-84d5-e29436794e86",
  "prefabs/ui/city/CityHub": "118c08f7-43eb-477d-ab62-50f3ec65294f",
  "prefabs/ui/hero/HeroPage": "1c983cf8-4cc7-4895-b30e-953df1d90eed",
  "prefabs/ui/summon/SummonPage": "12fca329-1355-43ce-bde5-624e1cc844c1",
  [BATTLE_PREFAB_PATH]: "733c8611-a124-4c16-bb79-6b3011dfb408",
};

export function loadPrefab(assetPath: string): Promise<Prefab> {
  const parsed = splitAssetPath(assetPath);
  return loadBundlePrefab(parsed.bundle, parsed.inner).catch((bundleErr: unknown) => {
    const uuid = PREFAB_UUID[assetPath];
    if (!uuid) return Promise.reject(bundleErr);
    return loadUuidPrefab(uuid).catch((uuidErr: unknown) => {
      throw new Error(assetPath + " " + errText(bundleErr) + "；loadAny " + errText(uuidErr));
    });
  });
}

export function spawnPrefab(prefab: Prefab, parent: Node): Node {
  const root = instantiate(prefab);
  root.parent = parent;
  return root;
}

export function findNode(root: Node, path: string): Node | null {
  let cur: Node | null = root;
  const parts = path.split("/");
  for (let i = 0; i < parts.length; i++) {
    if (!cur) return null;
    const name = parts[i];
    if (!name) continue;
    cur = cur.getChildByName(name);
  }
  return cur;
}

export function requireNode(root: Node, path: string): Node {
  const node = findNode(root, path);
  if (!node) throw new Error("缺少节点 " + path);
  return node;
}

export function bindClick(node: Node, fn: () => void): void {
  const button = node.getComponent(Button);
  if (!button) throw new Error(node.name + " 缺少 Button");
  node.on(Button.EventType.CLICK, fn);
}

export function setInteractable(node: Node, on: boolean): void {
  const button = node.getComponent(Button);
  if (button) button.interactable = on;
}

export function readEditBox(node: Node): string {
  const edit = node.getComponent(EditBox);
  if (!edit) throw new Error(node.name + " 缺少 EditBox");
  return typeof edit.string === "string" ? edit.string : "";
}

export function writeEditBox(node: Node, value: string): void {
  const edit = node.getComponent(EditBox);
  if (!edit) throw new Error(node.name + " 缺少 EditBox");
  edit.string = value;
}

export function tintSprite(node: Node, color: Color): void {
  const sprite = node.getComponent(Sprite);
  if (sprite) sprite.color = color;
}

function splitAssetPath(assetPath: string): { bundle: string; inner: string } {
  const slash = assetPath.indexOf("/");
  if (slash <= 0 || slash >= assetPath.length - 1) {
    throw new Error("Prefab 路径要相对 assets，例如 prefabs/ui/login/LoginPanel");
  }
  return { bundle: assetPath.slice(0, slash), inner: assetPath.slice(slash + 1) };
}

function loadBundlePrefab(bundleName: string, inner: string): Promise<Prefab> {
  return new Promise((resolve, reject) => {
    assetManager.loadBundle(bundleName, (err, bundle) => {
      if (err || !bundle) {
        reject(err || new Error("没有 bundle " + bundleName));
        return;
      }
      bundle.load(inner, Prefab, (loadErr, asset) => {
        if (loadErr || !asset) {
          reject(loadErr || new Error("bundle 里没有 " + inner));
          return;
        }
        resolve(asset);
      });
    });
  });
}

function loadUuidPrefab(uuid: string): Promise<Prefab> {
  return new Promise((resolve, reject) => {
    assetManager.loadAny({ uuid }, (err, asset) => {
      if (err || !asset) {
        reject(err || new Error("loadAny 没有 " + uuid));
        return;
      }
      resolve(asset);
    });
  });
}

function errText(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "加载失败";
}
