import { BaseModel } from "../../framework/BaseModel";
import { readBagItems } from "./data/BagItemData";
import type { BagItemData, BagItemDelta } from "./data/BagItemData";
import type { BagState } from "./data/BagState";

type BagContents = Omit<BagState, "roleKey" | "revision">;

/** The role's only inventory state. Controller owns requests and notifications. */
export class BagModel extends BaseModel {
    static readonly instance = new BagModel();
    private data: BagContents = this.emptyData();
    private cachedSnapshot: BagState | null = null;

    get snapshot(): BagState {
        if (!this.cachedSnapshot) {
            this.cachedSnapshot = Object.freeze({ ...this.data, roleKey: this.roleKey, revision: this.version });
        }
        return this.cachedSnapshot;
    }
    get items(): readonly BagItemData[] { return this.data.items; }
    getItem(itemId: number): Readonly<BagItemData> | undefined { return this.items.find(item => item.itemId === itemId); }
    quantity(itemId: number): number { return this.getItem(itemId)?.quantity || 0; }

    beginSync(): void {
        this.requireRole();
        this.commit({ ...this.data, status: "loading", error: "" });
    }

    fail(error: string): void {
        this.requireRole();
        this.commit({ ...this.data, status: "error", error });
    }

    replaceAll(items: readonly BagItemData[]): void {
        this.requireRole();
        const rows = readBagItems(items);
        this.commit({ status: "ready", synced: true, items: rows, error: "" });
    }

    /** Signed changes are separate from snapshots. Validate every change before committing. */
    applyDelta(changes: readonly BagItemDelta[]): void {
        this.requireRole();
        if (!this.data.synced) throw new Error("背包尚未同步，不能应用增量");
        const next = new Map(this.items.map(item => [item.itemId, item.quantity] as [number, number]));
        const seen = new Set<number>();
        for (const change of changes) {
            if (!Number.isSafeInteger(change.itemId) || change.itemId <= 0 || !Number.isSafeInteger(change.delta) || seen.has(change.itemId)) {
                throw new Error("背包增量无效");
            }
            seen.add(change.itemId);
            const quantity = (next.get(change.itemId) || 0) + change.delta;
            if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("背包增量数量无效");
            if (quantity) next.set(change.itemId, quantity);
            else next.delete(change.itemId);
        }
        this.replaceAll(Array.from(next, ([itemId, quantity]) => ({ itemId, quantity })));
    }

    protected onReset(): void {
        this.data = this.emptyData();
        this.cachedSnapshot = null;
    }

    private emptyData(): BagContents {
        return Object.freeze({ status: "idle", synced: false, items: Object.freeze([]), error: "" });
    }

    private requireRole(): void { if (!this.roleKey) throw new Error("背包没有当前角色"); }

    private commit(data: BagContents): void {
        this.data = Object.freeze(data);
        this.incrementVersion();
        this.cachedSnapshot = null;
    }
}
