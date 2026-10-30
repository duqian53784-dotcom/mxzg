import { _decorator, Button, Color, Label, Mask, Node, Prefab, ScrollView, UITransform, view } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import { ancestorScale } from "../../../ui/visibleFit";
import { spawnPrefab } from "../../../ui/prefabLoad";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
import { HeroIconCellView } from "./HeroIconCellView";
import { HeroCatalog } from "../HeroCatalog";
import { MAIN_POSITIONS } from "../LineupApi";
import type { FormationState, FormationScreen, FormationActions } from "../FormationController";
const { ccclass, property } = _decorator;
export interface FormationRequest {
    complete(confirmed: boolean): void;
}
/** Retained HeroSelectLayer, with explicit fields and no legacy protocol state. */
@ccclass("FormationView")
export class FormationView extends BaseView<FormationRequest> implements FormationScreen {
    @property(Button)
    closeButton: Button | null = null;
    @property(Button)
    confirmButton: Button | null = null;
    @property(Label)
    tipLabel: Label | null = null;
    @property(Label)
    titleLabel: Label | null = null;
    @property(Label)
    countLabel: Label | null = null;
    @property(Node)
    grid: Node | null = null;
    @property(Node)
    scrollContent: Node | null = null;
    @property(Node)
    scrollPort: Node | null = null;
    @property(Node)
    scrollHost: Node | null = null;
    @property(Node)
    filterMark: Node | null = null;
    @property([Node])
    elementButtons: Node[] = [];
    @property([Node])
    slots: Node[] = [];
    @property([Node])
    unsupported: Node[] = [];
    @property(Prefab)
    cellPrefab: Prefab | null = null;
    @property(Prefab)
    dimPrefab: Prefab | null = null;
    private actions: FormationActions | null = null;
    private catalog: HeroCatalog | null = null;
    private state: FormationState | null = null;
    private elem = 0;
    private done = false;
    private dim: Node | null = null;
    onOpen(args?: FormationRequest): void {
        this.args = args;
        if (!args || !this.grid || !this.cellPrefab || !this.dimPrefab || !this.scrollContent || !this.scrollPort)
            throw new Error("出阵预制体字段未绑定");
        this.dim = spawnPrefab(this.dimPrefab, this.node);
        this.dim.setSiblingIndex(0);
        this.dim.getChildByName("dim")?.on(Button.EventType.CLICK, () => this.actions?.cancel());
        for (const node of this.unsupported)
            node.active = false;
        this.scrollHost?.removeComponent(Mask);
        (this.scrollPort.getComponent(Mask) || this.scrollPort.addComponent(Mask)).type = Mask.Type.GRAPHICS_RECT;
        this.scrollContent.getComponent(UITransform)?.setAnchorPoint(0, 1);
        this.scrollContent.parent = this.scrollPort;
        this.scrollContent.setPosition(-290, 125, 0);
        this.grid.setPosition(0, 0, 0);
        const scroll = this.scrollHost?.getComponent(ScrollView) || this.scrollHost?.addComponent(ScrollView);
        if (scroll) {
            scroll.content = this.scrollContent;
            scroll.horizontal = false;
            scroll.vertical = true;
        }
        if (this.titleLabel) {
            this.titleLabel.string = "英雄出阵";
            this.titleLabel.node.getComponent(UITransform)?.setContentSize(400, 64);
        }
        if (this.countLabel) {
            this.countLabel.font = null;
            this.countLabel.useSystemFont = true;
            this.countLabel.fontSize = 26;
            this.countLabel.color = new Color(112,73,38,255);
            this.countLabel.lineHeight = 34;
            this.countLabel.node.getComponent(UITransform)?.setContentSize(420, 48);
        }
        const label = this.confirmButton?.node.getChildByName("Label")?.getComponent(Label);
        if (label)
            label.string = "战斗";
        view.on("canvas-resize", this.fit, this);
        this.fit();
    }
    private fit(): void {
        const { width, height } = view.getVisibleSize();
        const scale = Math.min(width * .94 / 640, height * .80 / 1034);
        this.node.setScale(scale / ancestorScale(this.node), scale / ancestorScale(this.node), 1);
        this.node.setPosition(-320 * scale, -517 * scale, 0);
        this.dim?.setPosition(320, 517, 0);
        this.dim?.getChildByName("dim")?.getComponent(UITransform)?.setContentSize(width / scale + 8, height / scale + 8);
    }
    bind(actions: FormationActions, catalog: HeroCatalog): () => void {
        this.actions = actions;
        this.catalog = catalog;
        const off: Array<() => void> = [];
        const bind = (node: Node | null, run: () => void) => { if (!node)
            return; node.on(Button.EventType.CLICK, run); off.push(() => node.off(Button.EventType.CLICK, run)); };
        bind(this.closeButton?.node || null, () => actions.cancel());
        bind(this.confirmButton?.node || null, () => actions.confirm());
        this.elementButtons.forEach((node, index) => bind(node, () => { this.elem = index; if (this.filterMark)
            this.filterMark.setPosition(node.position.x, node.position.y, 0); if (this.state)
            this.render(this.state); }));
        this.slots.forEach((node, index) => bind(node, () => actions.remove(index + 1)));
        return () => { for (const dispose of off)
            dispose(); this.actions = null; };
    }
    render(state: FormationState): void {
        this.state = state;
        if (this.tipLabel) {
            this.tipLabel.string = state.message;
            this.tipLabel.fontSize = 22;
            this.tipLabel.lineHeight = 28;
            this.tipLabel.node.getComponent(UITransform)?.setContentSize(540, 56);
        }
        if (this.countLabel)
            this.countLabel.string = "已上阵 " + state.lineup.slots.length + " / 7";
        if (this.confirmButton)
            this.confirmButton.interactable = !state.busy;
        for (const button of this.elementButtons) {
            const component = button.getComponent(Button);
            if (component)
                component.interactable = !state.busy;
        }
        if (!this.grid || !this.catalog || !this.cellPrefab)
            return;
        for (const child of this.grid.children.slice())
            child.destroy();
        const heroes = state.heroes.filter(hero => !this.elem || this.catalog!.find(hero.templateId)?.elem === this.elem);
        this.scrollContent?.getComponent(UITransform)?.setContentSize(580, Math.max(250, Math.ceil(heroes.length / 5) * 130 + 16));
        heroes.forEach((hero, index) => {
            const face = this.catalog!.find(hero.templateId);
            const cell = spawnPrefab(this.cellPrefab!, this.grid!);
            cell.setPosition(60 + index % 5 * 112, -65 - Math.floor(index / 5) * 130, 0);
            cell.setScale(.85, .85, 1);
            const component = cell.getComponent(HeroIconCellView);
            if (!component)
                throw new Error("出阵英雄格子缺少 View");
            component.show({ kind: "owned", hero: null, name: face?.name || String(hero.templateId), showName: true, face: face?.icon || null, elem: face?.elem || null, level: hero.level, stars: hero.star, locked: false, deployed: state.lineup.slots.some(slot => slot.heroId === hero.id) }, state.busy ? null : () => this.actions?.toggle(hero.id));
        });
        this.slots.forEach((node, index) => {
            const position = index + 1, allowed = MAIN_POSITIONS.includes(position as any), slot = state.lineup.slots.find(slot => slot.position === position);
            const hero = state.heroes.find(hero => hero.id === slot?.heroId), face = hero ? this.catalog!.find(hero.templateId) : null;
            node.getComponent(UITransform)?.setContentSize(84, 84);
            const button = node.getComponent(Button);
            if (button)
                button.interactable = allowed && !state.busy;
            const lock = node.getChildByName("spr_lock_" + position);
            if (lock)
                lock.active = !allowed;
            const image = node.getChildByName("spr_face");
            if (image) {
                image.active = !!hero;
                if (face?.icon)
                    paintSpritePaths(image, [face.icon]);
                image.setSiblingIndex(node.children.length - 1);
            }
            const text = node.getChildByName("lbl_attr_add_" + position)?.getComponent(Label);
            if (text) {
                text.string = allowed ? (face?.name || "空位") : "未开放";
                text.node.getComponent(UITransform)?.setContentSize(160, 44);
            }
        });
    }
    complete(confirmed: boolean): void { if (this.done)
        return; this.done = true; this.args?.complete(confirmed); this.close(); }
    onClose(): void { view.off("canvas-resize", this.fit, this); if (!this.done) {
        this.done = true;
        this.args?.complete(false);
    } this.state = null; }
}
