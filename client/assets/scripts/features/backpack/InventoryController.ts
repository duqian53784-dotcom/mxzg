import { AccountModel } from "../account/AccountModel";
import { AccountService, SessionChanged } from "../account/AccountService";
import type { BagTabKind } from "../../config/gameCatalog";
import type { StoreBagItem } from "../../core/GameStore";
import type { BagFace } from "../../module/bag/bagBoard";
import { ItemCatalog } from "./ItemCatalog";
import { InventoryApi } from "./InventoryApi";
import type { InventoryItem } from "./InventoryApi";
export interface InventorySource {
    rows(tab: BagTabKind): StoreBagItem[];
    face(item: StoreBagItem): BagFace;
    message(): string;
    retry(): void;
    failed(): boolean;
}
export interface InventoryView {
    useInventory(source: InventorySource): void;
    refreshInventory(): void;
}
export class InventoryController {
    private status: "loading" | "ready" | "error" = "loading";
    private items: readonly InventoryItem[] = [];
    private error = "";
    private closed = false;
    private pending = false;
    private epoch = 0;
    private offAccount: (() => void) | null = null;
    constructor(private readonly account: AccountModel, private readonly service: AccountService, private readonly api: InventoryApi, private readonly catalog: ItemCatalog, private readonly view: InventoryView) {
        view.useInventory({
            rows: tab => this.items.filter(item => { const face = catalog.face(item.itemId, item.quantity); return !face.wallet && face.category === tab; })
                .map(item => ({ itemId: item.itemId, itemType: item.itemId, num: item.quantity })),
            face: item => catalog.face(item.itemId!, item.num!),
            message: () => this.status === "loading" ? "正在同步背包…" : this.status === "error" ? this.error + (this.items.length ? "，显示上次库存" : "") + "，点击分类重试" : this.items.length ? catalog.greeting : "背包为空",
            retry: () => { void this.refresh(); }, failed: () => this.status === "error",
        });
    }
    show(): void {
        if (this.closed || this.offAccount)
            return;
        const role = this.account.snapshot.role?.id;
        this.offAccount = this.account.subscribe(state => {
            if (state.busy || !state.role || state.role.id !== role) {
                this.epoch++;
                this.items = [];
                this.view.refreshInventory();
            }
        });
        void this.refresh();
    }
    async refresh(): Promise<void> {
        if (this.closed || this.pending)
            return;
        const epoch = ++this.epoch;
        this.pending = true;
        this.status = "loading";
        // Keep the last accepted snapshot during a same-role refresh. Clearing it here
        // temporarily shrinks the list and loses scroll position before the reply arrives.
        this.view.refreshInventory();
        try {
            const items = await this.service.authenticated(token => this.api.list(token));
            if (this.closed || epoch !== this.epoch)
                return;
            this.items = items;
            this.status = "ready";
        }
        catch (error) {
            if (this.closed || epoch !== this.epoch || error instanceof SessionChanged)
                return;
            this.status = "error";
            this.error = error instanceof Error ? error.message : "背包读取失败";
        }
        finally {
            if (!this.closed && epoch === this.epoch) {
                this.pending = false;
                this.view.refreshInventory();
            }
        }
    }
    close(): void {
        this.closed = true;
        this.epoch++;
        this.items = [];
        this.offAccount?.();
        this.offAccount = null;
    }
}
