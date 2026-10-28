import { Button, BlockInputEvents, Node, Prefab, Sprite, UITransform } from "cc";
import { messageOf } from "../../core/errors";
import { GameLog } from "../../core/GameLog";
import { BagFace } from "../../module/bag/bagBoard";
import { loadPrefab, spawnPrefab } from "../prefabLoad";
import { mountCcbiView } from "../pagePrefabShell";
import { assignContentSize, bindVisibleRefresh, fitVisibleRoot } from "../visibleFit";
import { BackpackInfoView } from "./BackpackInfoView";
import { paintSpritePaths } from "./spritePaint";

const PAGE_SHELL = "prefabs/ui/common/PagePrefabShell";
const LIST_BACKDROP = "prefabs/ui/common/ListBackdrop";
const BAG_BACKDROP = ["ui/bag/map-bg-backpack-1", "ui/maps/map-bg-backpack-1"];

/**
 * 把背包 Prefab 盖进页面宿主。店内底和羊皮纸跟原来的壳一样。
 * 这里只认已知预制的直接子节点，不在 BackpackView 里搜整棵树。
 */
export async function mountBackpackPage(host: Node, layer: Prefab): Promise<Node> {
  let shell: Node | null = null;
  try {
    const shellPrefab = await loadPrefab(PAGE_SHELL);
    const backdropPrefab = await loadPrefab(LIST_BACKDROP);
    if (!host.isValid) throw new Error("页面已关");
    const pack = spawnPrefab(backdropPrefab, host);
    pack.name = "ListBackdrop";
    paintBackdrop(pack);
    shell = spawnPrefab(shellPrefab, host);
    shell.name = "PagePrefabShell";
    const backdrop = host.getChildByName("ListBackdrop");
    if (backdrop && backdrop.parent !== shell) {
      backdrop.parent = shell;
      backdrop.setSiblingIndex(0);
    }
    bindVisibleRefresh(shell, () => {
      if (!shell || !shell.isValid) return;
      const box = fitVisibleRoot(shell);
      stretchBackdrop(shell, box.width, box.height);
    });
  } catch (err) {
    GameLog.shared.warn("Bag", "背包底图没有挂上 " + messageOf(err));
  }
  if (!host.isValid) throw new Error("页面已关");
  const parent = shell && shell.isValid ? shell : host;
  const view = spawnPrefab(layer, parent);
  mountCcbiView(view);
  return view;
}

/** 详情盖在背包上。DimSheet 的 dim、InfoCard 都是这一层的直接子节点。 */
export function openBagInfo(host: Node, dimPrefab: Prefab, infoPrefab: Prefab, face: BagFace, toast: (text: string) => void): Node | null {
  if (!host.isValid) return null;
  const old = host.getChildByName("InfoCard");
  if (old) old.destroy();
  const sheet = spawnPrefab(dimPrefab, host);
  sheet.name = "InfoCard";
  sheet.setSiblingIndex(Math.max(0, host.children.length - 1));
  const close = () => {
    if (sheet.isValid) sheet.destroy();
  };
  const dim = sheet.getChildByName("dim");
  if (dim) {
    if (!dim.getComponent(Button)) dim.addComponent(Button);
    dim.on(Button.EventType.CLICK, close);
    assignContentSize(dim.getComponent(UITransform), 720, 1100);
    dim.setPosition(320, 480, 0);
  } else {
    GameLog.shared.warn("Bag", "DimSheet 下没有 dim");
  }
  const card = spawnPrefab(infoPrefab, sheet);
  card.setPosition(125, 330, 0);
  if (!card.getComponent(BlockInputEvents)) card.addComponent(BlockInputEvents);
  const info = card.getComponent(BackpackInfoView);
  if (!info) {
    GameLog.shared.warn("Bag", "BackpackInfoLayer 上没有 BackpackInfoView");
    return sheet;
  }
  info.show(face, close, toast);
  return sheet;
}

function paintBackdrop(pack: Node): void {
  const art = pack.getChildByName("ShellBackdrop");
  if (!art) {
    GameLog.shared.warn("Bag", "ListBackdrop 下没有 ShellBackdrop");
    return;
  }
  const sprite = art.getComponent(Sprite);
  if (sprite) sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  paintSpritePaths(art, BAG_BACKDROP);
}

function stretchBackdrop(root: Node, width: number, height: number): void {
  if (!(width > 1) || !(height > 1)) return;
  const pack = root.getChildByName("ListBackdrop");
  if (!pack) return;
  assignContentSize(pack.getComponent(UITransform), width, height);
  const ui = pack.getComponent(UITransform);
  if (ui) ui.setAnchorPoint(0.5, 0.5);
  pack.setPosition(0, 0, 0);
  const names = ["ShellBackdropDim", "ShellBackdrop"];
  for (let i = 0; i < names.length; i++) {
    const node = pack.getChildByName(names[i]);
    if (!node) continue;
    assignContentSize(node.getComponent(UITransform), width, height);
    const childUi = node.getComponent(UITransform);
    if (childUi) childUi.setAnchorPoint(0.5, 0.5);
    node.setPosition(0, 0, 0);
    const sprite = node.getComponent(Sprite);
    if (sprite) sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  }
}
