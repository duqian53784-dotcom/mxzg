import type { AccountModel } from "../account/AccountModel";
import { SessionChanged } from "../account/AccountService";
import type { AccountAuthorization } from "../account/AccountService";
import { BaseController } from "../../framework/BaseController";
import type { ControllerSession } from "../../framework/BaseController";
import { batchNotifications } from "../../framework/EventDispatcher";
import { BagModel } from "./BagModel";
import { BagEvent } from "./BagEvent";
import { readBagItems } from "./data/BagItemData";
import type { BagItemData, BagItemDelta } from "./data/BagItemData";
import type { BagEventData } from "./data/BagEventData";

export interface BagGateway { list(token: string): Promise<readonly BagItemData[]>; }
export interface BagDependencies {
    readonly account: AccountModel;
    readonly authorization: AccountAuthorization;
    readonly api: BagGateway;
}

/** Role-session module. Opening or closing a BagView never owns this Controller. */
export class BagController extends BaseController {
    static readonly instance = new BagController(BagModel.instance);
    private account: AccountModel | null = null;
    private authorization: AccountAuthorization | null = null;
    private api: BagGateway | null = null;
    private readEpoch = 0;
    private pendingRead: Promise<boolean> | null = null;
    private writeCount = 0;
    private writeTail: Promise<void> = Promise.resolve();
    private inFlight = new Map<string, Promise<unknown>>();
    private receipts = new Set<string>();

    constructor(private readonly model: BagModel) { super(); }

    /** Application supplies dependencies explicitly. A repeated call cannot register twice. */
    initialize(dependencies?: BagDependencies): void {
        if (this.isInitialized) {
            if (dependencies && (dependencies.account !== this.account || dependencies.authorization !== this.authorization || dependencies.api !== this.api)) {
                throw new Error("BagController 已初始化，请先 dispose 后重设依赖");
            }
            return;
        }
        if (!dependencies) throw new Error("BagController.initialize 缺少 account/authorization/api");
        this.account = dependencies.account;
        this.authorization = dependencies.authorization;
        this.api = dependencies.api;
        super.initialize();
    }

    protected onInitialize(): void {
        this.ownListener(this.account!.subscribe(() => this.syncSession()));
        this.resetSession(null);
        this.syncSession();
    }

    protected onResetSession(roleKey: string | null): void {
        this.invalidateRead();
        this.writeCount = 0;
        this.writeTail = Promise.resolve();
        this.inFlight.clear();
        this.receipts.clear();
        if (this.isInitialized) this.model.reset(roleKey);
        else this.model.dispose();
        this.changed("session");
    }

    protected onDispose(): void {
        this.account = null;
        this.authorization = null;
        this.api = null;
    }

    /** Full query. Force invalidates an earlier read, e.g. after server starter initialization. */
    refresh(force = false): Promise<boolean> {
        if (!this.model.snapshot.roleKey || !this.authorization || !this.api) return Promise.resolve(false);
        const session = this.captureSession();
        if (this.writeCount) return this.writeTail.then(() => this.isCurrent(session) ? this.refresh(force) : false);
        if (this.pendingRead && !force) return this.pendingRead;
        const epoch = ++this.readEpoch;
        const authorization = this.authorization;
        const api = this.api;
        // Record deduplication before notifying observers, including synchronous callers of refresh().
        const request = Promise.resolve().then(() => this.read(session, epoch, authorization, api));
        this.pendingRead = request;
        void request.then(() => { if (this.pendingRead === request) this.pendingRead = null; });
        this.model.beginSync();
        this.changed("query");
        return request;
    }

    /**
     * Inventory-affecting operations are serialized. Reads wait for them; older reads are invalidated.
     * Other Controllers supply the existing request/result and synchronous related-Model commit.
     * A closed window does not cancel this role-session operation.
     */
    runInventoryUpdate<T>(responseId: string, request: () => Promise<T>, inventory: (result: T) => readonly BagItemData[],
        commitRelated: (result: T) => void): Promise<T> {
        if (!responseId) return Promise.reject(new Error("库存操作缺少唯一响应标识"));
        const current = this.inFlight.get(responseId);
        if (current) return current as Promise<T>;
        if (!this.model.roleKey || !this.authorization) return Promise.reject(new SessionChanged());
        const session = this.captureSession();
        const previous = this.writeTail;
        const duplicate = this.receipts.has(responseId);
        if (!duplicate) {
            this.invalidateRead();
            this.writeCount++;
        }
        const operation = (async () => {
            await previous;
            try {
                if (!this.isCurrent(session)) throw new SessionChanged();
                const result = await request();
                if (!this.isCurrent(session)) throw new SessionChanged();
                const items = readBagItems(inventory(result));
                if (!this.receipts.has(responseId)) {
                    batchNotifications(() => {
                        commitRelated(result);
                        this.model.replaceAll(items);
                        this.receipts.add(responseId);
                        this.changed("operation");
                    });
                }
                return result;
            } catch (error) {
                if (!duplicate && this.isCurrent(session) && !(error instanceof SessionChanged)) {
                    this.model.fail(error instanceof Error ? error.message : "背包更新失败");
                    this.changed("failure");
                }
                throw error;
            } finally {
                if (!duplicate && this.isCurrent(session)) this.writeCount--;
            }
        })();
        this.inFlight.set(responseId, operation);
        this.writeTail = operation.then(() => {}, () => {});
        const release = () => { if (this.inFlight.get(responseId) === operation) this.inFlight.delete(responseId); };
        void operation.then(release, release);
        if (!duplicate) {
            this.model.beginSync();
            this.changed("operation");
        }
        return operation;
    }

    /** For future typed push/delta protocols. Not wired to an invented server message this batch. */
    applyDelta(session: ControllerSession, responseId: string, changes: readonly BagItemDelta[]): boolean {
        if (!this.isCurrent(session) || this.receipts.has(responseId)) return false;
        if (!responseId || this.writeCount) throw new Error("增量需有唯一标识，且不能跨越进行中的库存操作");
        this.model.applyDelta(changes);
        this.invalidateRead();
        this.receipts.add(responseId);
        this.changed("delta");
        return true;
    }

    private async read(session: ControllerSession, epoch: number, authorization: AccountAuthorization, api: BagGateway): Promise<boolean> {
        try {
            const items = await authorization.authenticated(token => api.list(token));
            if (!this.isCurrent(session) || epoch !== this.readEpoch) return false;
            this.model.replaceAll(items);
            this.changed("query");
            return true;
        } catch (error) {
            if (!this.isCurrent(session) || epoch !== this.readEpoch || error instanceof SessionChanged) return false;
            this.model.fail(error instanceof Error ? error.message : "背包读取失败");
            this.changed("failure");
            return false;
        }
    }
    private syncSession(): void {
        const state = this.account?.snapshot;
        const key = state?.role && !state.busy ? (state.role.serverId || "") + "/" + state.role.id : null;
        if (key === this.model.roleKey) return;
        this.resetSession(key);
        if (key) void this.refresh();
    }

    private invalidateRead(): void {
        this.readEpoch++;
        this.pendingRead = null;
    }

    private changed(source: BagEventData["source"]): void {
        const state = this.model.snapshot;
        this.emit(BagEvent.Changed, Object.freeze({ roleKey: state.roleKey, status: state.status, revision: state.revision, source }));
    }
}
