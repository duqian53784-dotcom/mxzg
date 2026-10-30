import { JsonClient } from "../../platform/http/JsonClient";
export interface InventoryItem {
    readonly itemId: number;
    readonly quantity: number;
}
export function readInventory(value: unknown): readonly InventoryItem[] {
    if (!Array.isArray(value))
        throw new Error("背包数据无效");
    const seen = new Set<number>();
    const rows = value.map(item => {
        if (!item || typeof item !== "object" || !Number.isSafeInteger(item.itemId) || item.itemId <= 0 ||
            !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || seen.has(item.itemId))
            throw new Error("背包条目无效");
        seen.add(item.itemId);
        return Object.freeze({ itemId: item.itemId as number, quantity: item.quantity as number });
    });
    return Object.freeze(rows);
}
export class InventoryApi {
    constructor(private readonly http: JsonClient) { }
    async list(token: string): Promise<readonly InventoryItem[]> { return readInventory(await this.http.request("/api/v1/inventory", undefined, token)); }
}
