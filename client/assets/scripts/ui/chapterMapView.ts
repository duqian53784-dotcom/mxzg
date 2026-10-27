/**
 * 主线章节地图和通关奖励。
 * 地图是 chapterreward.map 对应的 ui/chapter/mapXX.jpg（640×1280）。
 * 关卡不按 chapter.pos 钉在图上。那一列是阵位。底下列表才是关。
 * 通关奖励用已有 ChapterRewardLayer / ChapterExtraRewardCell / ChapterRewardCell。
 * 领取不发 3011。出战只放当前关，仍由调用方走原来的战斗。
 */
import { Button, Color, Mask, Node, resources, ScrollView, Sprite, SpriteFrame, UITransform, Vec2 } from "cc";
import { chapterPlaceLabel, itemIconResource } from "../config/gameCatalog";
import { chapterExtraRewards, chapterMapStages, chapterStageFace, ChapterExtraFace } from "../config/rosterCatalog";
import { GameLog } from "../core/GameLog";
import { GameStore } from "../core/GameStore";
import {
  CHAPTER_EXTRA_CELL_H,
  CHAPTER_EXTRA_CELL_W,
  CHAPTER_MAP_H,
  CHAPTER_MAP_W,
  CHAPTER_REWARD_BOX_H,
  CHAPTER_REWARD_BOX_W,
  chapterMapCloseSeat,
  chapterMapResource,
  chapterMapRewardSeat,
  chapterMapStageStripY,
  chapterMapTitleY,
  extraRewardProgress,
  extraRewardTipPath,
  fillRewardTip,
  mainlineClearedCount,
} from "./chapterBoardPlan";
import { loadPrefab, spawnPrefab } from "./prefabLoad";
import { createLabel, place, setText, uiNode } from "./UiKit";

const INK = new Color(122, 71, 45, 255);
const CREAM = new Color(255, 236, 190, 255);
const STRIP_W = 600;
const STRIP_H = 52;
const CHIP_W = 88;

const EXTRA_CELL = "prefabs/ui/chapter/ChapterExtraRewardCell";
const REWARD_CELL = "prefabs/ui/chapter/ChapterRewardCell";
export const CHAPTER_REWARD_PREFAB = "prefabs/ui/chapter/ChapterRewardLayer";

export function mountChapterMap(
  sheet: Node,
  actions: { onStage: (idx: number) => void; onReward: () => void; onClose: () => void }
): void {
  const live = stageIdx();
  const known = synced();
  const face = known ? chapterStageFace(live) : null;
  const map = chapterMapResource(face ? face.map : "");
  const art = uiNode("ChapterMap");
  const artUi = art.addComponent(UITransform);
  artUi.setContentSize(CHAPTER_MAP_W, CHAPTER_MAP_H);
  const image = art.addComponent(Sprite);
  image.sizeMode = Sprite.SizeMode.CUSTOM;
  place(art, sheet, 0, 0);
  if (!map) {
    GameLog.shared.info("Mainline", "这一关没有章节地图，关卡列表仍在");
  } else {
    paintSprite(art, map, "章节地图 " + map + " 没有挂上，关卡列表仍在");
  }
  const caption = mapCaption(live, known, face ? face.name : "");
  const title = createLabel(caption, 22, { color: CREAM, width: 420, height: 36 });
  title.name = "ChapterMapTitle";
  place(title, art, 0, chapterMapTitleY());
  const closeSeat = chapterMapCloseSeat();
  const close = spriteButton("MapClose", 55, 58, "ui/common/button_btn-close-1", actions.onClose);
  place(close, art, closeSeat.x, closeSeat.y);
  const rewardSeat = chapterMapRewardSeat();
  const reward = spriteButton("MapReward", 136, 38, "ui/chapter-reward-lang/chapter-reward-lang_btn-reward-1", actions.onReward);
  place(reward, art, rewardSeat.x, rewardSeat.y);
  const stages = known ? chapterMapStages(live) : [];
  const strip = hScroll(art, "StageStrip", 0, chapterMapStageStripY(), STRIP_W, STRIP_H);
  if (stages.length === 0) {
    place(createLabel(known ? "这一关没有同图关卡" : "主线未同步", 16, { color: CREAM, width: 280, height: 28 }), strip.content, 80, 0);
    return;
  }
  const content = strip.content;
  const box = content.getComponent(UITransform);
  const width = stages.length * CHIP_W;
  if (box) box.setContentSize(width, STRIP_H);
  let current = 0;
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    if (stage.idx === live) current = i;
    const on = stage.idx === live;
    const chip = spriteButton(
      "stage-" + stage.idx,
      CHIP_W - 8,
      40,
      on ? "ui/common/button_btn-tab-24" : "ui/common/button_btn-tab-23",
      () => actions.onStage(stage.idx)
    );
    place(createLabel("第" + stage.missionId + "关", 14, { color: INK, width: CHIP_W - 12, height: 24 }), chip, 0, 0);
    place(chip, content, i * CHIP_W + CHIP_W / 2, 0);
  }
  scrollStrip(strip.scroll, current, width);
}

/** 通关奖励窗。按钮不发 3011。前往只打开那一关的预览。 */
export function dressChapterRewardBoard(view: Node, onStage: (idx: number) => void): void {
  const box = findNamed(view, "spr_box") || view;
  const old = box.getChildByName("RewardBoard");
  if (old) old.destroy();
  const board = uiNode("RewardBoard");
  place(board, box, 0, 0);
  const faces = chapterExtraRewards();
  const known = synced();
  const cleared = mainlineClearedCount(known ? stageIdx() : null, known);
  if (faces.length === 0) {
    place(createLabel("没有通关奖励表", 18, { color: INK, width: 400, height: 36 }), board, 0, 0);
    GameLog.shared.info("Mainline", "通关奖励没有 chapterextrareward");
    return;
  }
  const rowY = CHAPTER_REWARD_BOX_H / 2 - CHAPTER_EXTRA_CELL_H / 2 - 12;
  const rowScroll = hScroll(board, "ExtraRow", 0, rowY, CHAPTER_REWARD_BOX_W - 16, CHAPTER_EXTRA_CELL_H);
  const row = rowScroll.content;
  const rowBox = row.getComponent(UITransform);
  if (rowBox) rowBox.setContentSize(faces.length * CHAPTER_EXTRA_CELL_W, CHAPTER_EXTRA_CELL_H);
  const listH = CHAPTER_REWARD_BOX_H - CHAPTER_EXTRA_CELL_H - 36;
  const list = vScroll(board, "RewardList", 0, -CHAPTER_EXTRA_CELL_H / 2 - 8, CHAPTER_REWARD_BOX_W, listH);
  const listBox = list.getComponent(UITransform);
  if (listBox) listBox.setContentSize(CHAPTER_REWARD_BOX_W, faces.length * 160);
  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];
    const progress = extraRewardProgress(cleared, face.gate);
    void mountCell(row, EXTRA_CELL, "extra-" + face.gate).then((cell) => {
      if (!cell || !board.isValid) return;
      place(cell, row, i * CHAPTER_EXTRA_CELL_W, -CHAPTER_EXTRA_CELL_H / 2);
      dressExtraCell(cell, face, progress);
    });
    void mountCell(list, REWARD_CELL, "gate-" + face.gate).then((cell) => {
      if (!cell || !board.isValid) return;
      place(cell, list, -CHAPTER_REWARD_BOX_W / 2, -(i + 1) * 160);
      dressRewardRow(cell, face, progress, () => onStage(face.gate));
    });
  }
}

function dressExtraCell(cell: Node, face: ChapterExtraFace, progress: string): void {
  writeNamed(cell, "lbl_mission", progress);
  const tip = extraRewardTipPath(face.tipImg);
  const mark = findNamed(cell, "spr_top_tip");
  if (mark && tip) paintSprite(mark, tip, "通关奖励角标 " + tip + " 没有挂上");
  else if (!tip) GameLog.shared.info("Mainline", "通关奖励 tip_img " + face.tipImg + " 没有对应角标");
  const slot = findNamed(cell, "spr_reward_bg");
  if (slot) {
    const path = itemIconResource(face.itemType, null) || "ui/bag/backpack_" + face.itemType;
    const icon = spriteButton("RewardIcon", 72, 72, path, () => {
      GameLog.shared.info("Mainline", "通关奖励不发 3011");
      toast(cell, "不发领取协议");
    });
    place(icon, slot, 0, 0);
    if (face.itemNum > 1) {
      place(createLabel("×" + face.itemNum, 14, { color: CREAM, width: 48, height: 18 }), icon, 16, -24);
    }
  }
  const button = findNamed(cell, "btn_reward");
  if (button) {
    if (!button.getComponent(Button)) button.addComponent(Button);
    button.on(Button.EventType.CLICK, () => {
      GameLog.shared.info("Mainline", "通关奖励不发 3011");
      toast(cell, "不发领取协议");
    });
  }
  const tipText = fillRewardTip(face.tip, face.gate);
  if (tipText) GameLog.shared.info("Mainline", "通关 " + face.gate + " " + tipText);
}

function dressRewardRow(cell: Node, face: ChapterExtraFace, progress: string, onGo: () => void): void {
  writeNamed(cell, "lbl_title", "通关" + face.gate + "关(" + progress + ")");
  const button = findNamed(cell, "btn_battle");
  if (!button) return;
  if (!button.getComponent(Button)) button.addComponent(Button);
  button.on(Button.EventType.CLICK, () => {
    GameLog.shared.info("Mainline", "通关奖励前往只看关卡，不发 3011");
    onGo();
  });
}

function mapCaption(idx: number, known: boolean, area: string): string {
  if (!known) return "主线未同步";
  const place = chapterPlaceLabel(idx);
  const head = place || (idx >= 1 ? "第" + idx + "关" : "主线未同步");
  return area ? head + " " + area : head;
}

function stageIdx(): number {
  const mock = GameStore.mockStageId();
  if (mock !== null && mock >= 1) return Math.floor(mock);
  const chapter = GameStore.chapter();
  if (chapter.nowIdx !== null && chapter.nowIdx >= 1) return Math.floor(chapter.nowIdx);
  if (chapter.maxIdx !== null && chapter.maxIdx >= 1) return Math.floor(chapter.maxIdx);
  return 1;
}

function synced(): boolean {
  const mock = GameStore.mockStageId();
  const chapter = GameStore.chapter();
  return (mock !== null && mock >= 1) || chapter.nowIdx !== null || chapter.maxIdx !== null;
}

function scrollStrip(scroll: ScrollView, index: number, contentW: number): void {
  let shift = index * CHIP_W + CHIP_W / 2 - STRIP_W / 2;
  if (shift < 0) shift = 0;
  const max = contentW > STRIP_W ? contentW - STRIP_W : 0;
  if (shift > max) shift = max;
  scroll.scrollToOffset(new Vec2(shift, 0), 0);
}

function hScroll(parent: Node, name: string, x: number, y: number, width: number, height: number): { content: Node; scroll: ScrollView } {
  const view = uiNode(name);
  const ui = view.addComponent(UITransform);
  ui.setContentSize(width, height);
  ui.setAnchorPoint(0.5, 0.5);
  const mask = view.addComponent(Mask);
  mask.type = Mask.Type.GRAPHICS_RECT;
  const scroll = view.addComponent(ScrollView);
  scroll.vertical = false;
  scroll.horizontal = true;
  scroll.inertia = true;
  const content = uiNode("content");
  const box = content.addComponent(UITransform);
  box.setAnchorPoint(0, 0.5);
  box.setContentSize(width, height);
  place(content, view, -width / 2, 0);
  scroll.content = content;
  place(view, parent, x, y);
  return { content, scroll };
}

function vScroll(parent: Node, name: string, x: number, y: number, width: number, height: number): Node {
  const view = uiNode(name);
  const ui = view.addComponent(UITransform);
  ui.setContentSize(width, height);
  ui.setAnchorPoint(0.5, 0.5);
  const mask = view.addComponent(Mask);
  mask.type = Mask.Type.GRAPHICS_RECT;
  const scroll = view.addComponent(ScrollView);
  scroll.vertical = true;
  scroll.horizontal = false;
  scroll.inertia = true;
  const content = uiNode("content");
  const box = content.addComponent(UITransform);
  box.setAnchorPoint(0.5, 1);
  box.setContentSize(width, height);
  place(content, view, 0, height / 2);
  scroll.content = content;
  place(view, parent, x, y);
  return content;
}

function mountCell(parent: Node, path: string, name: string): Promise<Node | null> {
  return loadPrefab(path).then(
    (prefab) => {
      if (!parent.isValid) return null;
      const node = spawnPrefab(prefab, parent);
      node.name = name;
      silenceMenus(node);
      return node;
    },
    (_err) => {
      GameLog.shared.warn("Mainline", path + " 没有挂上");
      return null;
    }
  );
}

function silenceMenus(root: Node): void {
  const stack: Node[] = [root];
  while (stack.length > 0) {
    const node = stack.pop() as Node;
    const kids = node.children;
    for (let i = 0; i < kids.length; i++) stack.push(kids[i]);
    if (node.name !== "menu" && node.name.indexOf("menu") < 0 && node.name.indexOf("Menu") < 0) continue;
    const ui = node.getComponent(UITransform);
    if (!ui || ui.contentSize.width < 400 || ui.contentSize.height < 400) continue;
    ui.setContentSize(0, 0);
  }
}

function spriteButton(name: string, width: number, height: number, path: string, onTap: () => void): Node {
  const node = uiNode(name);
  const ui = node.addComponent(UITransform);
  ui.setContentSize(width, height);
  const image = node.addComponent(Sprite);
  image.sizeMode = Sprite.SizeMode.CUSTOM;
  paintSprite(node, path, name + " " + path + " 没有挂上");
  if (!node.getComponent(Button)) node.addComponent(Button);
  node.on(Button.EventType.CLICK, onTap);
  return node;
}

function paintSprite(node: Node, path: string, miss: string): void {
  const image = node.getComponent(Sprite);
  if (!image) return;
  try {
    resources.load(path + "/spriteFrame", SpriteFrame, (err, asset) => {
      if (!node.isValid) return;
      if (err || !asset) {
        GameLog.shared.warn("Mainline", miss);
        return;
      }
      image.spriteFrame = asset;
    });
  } catch (_err) {
    GameLog.shared.warn("Mainline", miss);
  }
}
