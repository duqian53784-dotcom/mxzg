import { BagEvent } from "../BagEvent";
import type { BagStatus } from "./BagState";

export interface BagEventData {
    readonly roleKey: string | null;
    readonly revision: number;
    readonly status: BagStatus;
    readonly source: "session" | "query" | "operation" | "delta" | "failure";
}

/** Extend the single dispatcher's types without making framework depend on a feature. */
declare module "../../../framework/EventDispatcher" {
    interface EventPayloads {
        [BagEvent.Changed]: Readonly<BagEventData>;
    }
}
