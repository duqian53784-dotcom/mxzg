import { Node, Prefab } from "cc";
import { messageOf } from "../../core/errors";
import { GameLog } from "../../core/GameLog";
import { loadPrefab, spawnPrefab } from "../prefabLoad";
import { BaseView } from "./BaseView";
import { UILayer } from "./UILayer";
import { ViewClass, ViewSpec, viewCtorById, viewSpecOf } from "./UIRegistry";
import { bindViewCloser } from "./viewClose";

export interface PageNav {
  readonly current: string | null;
  openChild(id: string): void;
  back(): boolean;
}

export interface UIManagerHost {
  showToast(text: string, durationMs?: number): void;
  /** 页面已经进栈之后才调用。失败和取消不调用。 */
  onPageOpened?(id: string): void;
}

interface OpenPage {
  id: string;
  host: Node;
  view: BaseView<unknown>;
}

/** 加载还没进栈，玩家已经去了别的页。不 Toast，不改底栏。 */
export class OpenCancelled extends Error {
  constructor() {
    super("打开已取消");
    this.name = "OpenCancelled";
  }
}

export function isOpenCancelled(err: unknown): boolean {
  return err instanceof OpenCancelled;
}

/**
 * 正式界面的开关。页面仍进 PanelNav / UIShell。
 * 没登记的页面继续走原来的 presentPage，这里不接。
 * 预制没装上之前不进页面栈，避免留下可点的空壳。
 * 每次打开带一个意图。加载期间切走，旧意图作废，不能再压栈。
 */
export class UIManager {
  static readonly instance = new UIManager();

  private nav: PageNav | null = null;
  private host: UIManagerHost | null = null;
  private armed = new Set<string>();
  private prepared = new Map<string, OpenPage>();
  private pages = new Map<string, OpenPage[]>();
  private cached = new Map<string, OpenPage>();
  private opening = new Map<string, Promise<BaseView<unknown>>>();
  private tokens = new Map<number, string>();
  private nextToken = 1;

  install(nav: PageNav, host: UIManagerHost): void {
    this.nav = nav;
    this.host = host;
  }

  /**
   * 打开已注册的视图。
   * 预制、脚本都装好，并且这次打开还有效，才压进页面栈。
   * 失败时壳已经销毁，并 Toast。取消时只拆壳。
   */
  async open<T>(ctor: ViewClass<T>, args?: T): Promise<BaseView<T>> {
    const spec = viewSpecOf(ctor);
    if (!spec) throw new Error("视图未注册");
    if (spec.layer !== UILayer.Page) throw new Error("这一阶段 UIManager 只打开 Page，收到 " + spec.layer);
    if (!this.nav) throw new Error("UIManager 还没接上页面栈");
    if (!spec.allowMultiple) {
      const existing = this.top(spec.id);
      if (existing && this.nav.current === spec.id) {
        existing.view.runOpen(args);
        await existing.view.whenReady();
        return existing.view as BaseView<T>;
      }
      const pending = this.opening.get(spec.id);
      if (pending) return (await pending) as BaseView<T>;
    }
    const reused = spec.allowMultiple ? null : this.takeCache(spec.id);
    const job = reused ? this.reopen(reused, spec, args) : this.openNew(ctor, spec, args);
    if (!spec.allowMultiple) this.opening.set(spec.id, job);
    try {
      return (await job) as BaseView<T>;
    } finally {
      if (this.opening.get(spec.id) === job) this.opening.delete(spec.id);
    }
  }

  /**
   * presentPage 里调用。只有 open() 已经装好、刚登记过的页面才返回宿主。
   * 没登记的返回 null，调用方继续走原来的壳。
   */
  createPageHost(id: string): Node | null {
    if (!this.armed.has(id)) return null;
    this.armed.delete(id);
    const ready = this.prepared.get(id);
    this.prepared.delete(id);
    if (!ready) return null;
    const list = this.pages.get(id) || [];
    list.push(ready);
    this.pages.set(id, list);
    return ready.host;
  }

  /** 关掉当前这一页。传入视图时，它必须就是当前页。 */
  close(view?: object): boolean {
    if (!this.nav) return false;
    if (view) {
      const spec = viewSpecOf(view.constructor);
      if (!spec || this.nav.current !== spec.id) return false;
    }
    return this.nav.back();
  }

  toast(text: string): void {
    if (this.host) this.host.showToast(text, 1600);
  }

  /**
   * 后来的页面导航只留下目标页的打开意图。
   * 背包还在加载时玩家去了别的页，这次打开就不能再压栈。
   */
  keepOnly(id: string): void {
    for (const [token, page] of this.tokens) {
      if (page !== id) this.tokens.delete(token);
    }
  }

  /** 丢掉所有还没进栈的打开。 */
  invalidatePending(): void {
    this.tokens.clear();
  }

  /**
   * 页面栈要销毁宿主之前问一下。cache 的页面先摘下来，不销毁。
   * 节点已经没了就不能缓存。
   */
  retainOnClose(node: Node): boolean {
    for (const list of this.pages.values()) {
      for (let i = 0; i < list.length; i++) {
        const page = list[i];
        if (page.host !== node) continue;
        const ctor = viewCtorById(page.id);
        const spec = ctor ? viewSpecOf(ctor) : null;
        return !!(spec && spec.cache && node.isValid);
      }
    }
    return false;
  }

  /** PanelNav 关页之后调用。视图自己退订。缓存的页面只 onClose。 */
  noteClosed(id: string): void {
    const list = this.pages.get(id);
    if (!list || list.length === 0) return;
    const page = list.pop();
    if (!page) return;
    if (list.length === 0) this.pages.delete(id);
    page.view.runClose();
    const ctor = viewCtorById(id);
    const spec = ctor ? viewSpecOf(ctor) : null;
    if (spec && spec.cache && page.host.isValid && page.view.node && page.view.node.isValid) {
      page.host.removeFromParent();
      this.cached.set(id, page);
      return;
    }
    page.view.runUnbind();
    page.view.runDispose();
  }

  private top(id: string): OpenPage | null {
    const list = this.pages.get(id);
    if (!list || list.length === 0) return null;
    return list[list.length - 1];
  }

  private takeCache(id: string): OpenPage | null {
    const page = this.cached.get(id);
    if (!page) return null;
    this.cached.delete(id);
    if (!page.host.isValid || !page.view.node || !page.view.node.isValid) return null;
    return page;
  }

  private issue(id: string): number {
    const token = this.nextToken;
    this.nextToken += 1;
    this.tokens.set(token, id);
    return token;
  }

  private async openNew(ctor: ViewClass<unknown>, spec: ViewSpec, args: unknown): Promise<BaseView<unknown>> {
    const shell = new Node("LiveShell");
    const origin = this.nav ? this.nav.current : null;
    const token = this.issue(spec.id);
    let view: BaseView<unknown> | null = null;
    try {
      view = await this.mount(shell, ctor, spec, args);
      this.ensureCurrent(token, spec.id, origin);
      if (!shell.isValid || !view.node || !view.node.isValid) throw new Error("页面已关");
      this.stage(spec, shell, view, token);
    } catch (err) {
      throw this.abandon(spec, shell, view, token, err);
    }
    this.notify(spec.id);
    return view;
  }

  private async reopen(page: OpenPage, spec: ViewSpec, args: unknown): Promise<BaseView<unknown>> {
    const origin = this.nav ? this.nav.current : null;
    const token = this.issue(spec.id);
    try {
      page.view.runOpen(args);
      await page.view.whenReady();
      this.ensureCurrent(token, spec.id, origin);
      if (!page.host.isValid || !page.view.node || !page.view.node.isValid) throw new Error("页面已关");
      this.stage(spec, page.host, page.view, token);
    } catch (err) {
      const cancelled = isOpenCancelled(err) || !this.tokens.has(token);
      this.tokens.delete(token);
      this.armed.delete(spec.id);
      this.prepared.delete(spec.id);
      page.view.runClose();
      if (page.host.isValid) this.cached.set(spec.id, page);
      if (!cancelled) this.reportOpenFailed(spec.id, err);
      if (cancelled && !isOpenCancelled(err)) {
        GameLog.shared.info("UI", "打开已取消 " + spec.id + " " + messageOf(err));
        throw new OpenCancelled();
      }
      throw err instanceof Error ? err : new Error(messageOf(err));
    }
    this.notify(spec.id);
    return page.view;
  }

  /** 意图还在，而且玩家没有切到别的页。 */
  private ensureCurrent(token: number, id: string, origin: string | null): void {
    if (!this.tokens.has(token)) throw new OpenCancelled();
    if (!this.nav) throw new Error("UIManager 还没接上页面栈");
    if (this.nav.current !== origin && this.nav.current !== id) throw new OpenCancelled();
  }

  /** 装好了才登记进栈。只清掉这一次的意图，别的打开还留着。 */
  private stage(spec: ViewSpec, shell: Node, view: BaseView<unknown>, token: number): void {
    if (!this.nav) throw new Error("UIManager 还没接上页面栈");
    this.prepared.set(spec.id, { id: spec.id, host: shell, view });
    this.armed.add(spec.id);
    if (spec.allowMultiple || this.nav.current !== spec.id) this.nav.openChild(spec.id);
    if (!this.top(spec.id)) throw new Error("页面没有挂上 " + spec.id);
    this.tokens.delete(token);
  }

  /** 已经在栈上才刷新底栏。 */
  private notify(id: string): void {
    if (this.host && this.host.onPageOpened) this.host.onPageOpened(id);
  }

  private abandon(spec: ViewSpec, shell: Node, view: BaseView<unknown> | null, token: number, err: unknown): Error {
    const cancelled = isOpenCancelled(err) || !this.tokens.has(token);
    this.tokens.delete(token);
    this.armed.delete(spec.id);
    this.prepared.delete(spec.id);
    if (view) {
      view.runClose();
      if (!spec.cache) {
        view.runUnbind();
        view.runDispose();
      }
    }
    if (shell.isValid) shell.destroy();
    if (!cancelled) this.reportOpenFailed(spec.id, err);
    if (cancelled && !isOpenCancelled(err)) {
      GameLog.shared.info("UI", "打开已取消 " + spec.id + " " + messageOf(err));
      return new OpenCancelled();
    }
    return err instanceof Error ? err : new Error(messageOf(err));
  }

  private async mount(shell: Node, ctor: ViewClass<unknown>, spec: ViewSpec, args: unknown): Promise<BaseView<unknown>> {
    let prefab: Prefab;
    try {
      prefab = await loadPrefab(spec.prefab);
    } catch (err) {
      throw new Error(spec.prefab + " " + messageOf(err));
    }
    if (!shell.isValid) throw new Error("页面已关");
    const viewNode = spec.mount ? await spec.mount(shell, prefab) : spawnPrefab(prefab, shell);
    if (!shell.isValid || !viewNode.isValid) throw new Error("页面已关");
    const found = viewNode.getComponent(ctor);
    if (!found) throw new Error(spec.prefab + " 上没有视图组件");
    found.runOpen(args);
    await found.whenReady();
    return found;
  }

  /** 页面还没进栈。Toast 给玩家看，日志留给排查。取消不走这里。 */
  private reportOpenFailed(id: string, err: unknown): void {
    const text = id === "bag" ? "背包没有打开" : "页面没有打开";
    GameLog.shared.error("UI", text + " " + messageOf(err));
    this.toast(text);
  }
}

bindViewCloser((view) => {
  UIManager.instance.close(view);
});
