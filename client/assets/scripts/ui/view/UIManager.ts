import { Node, Prefab } from "cc";
import { messageOf } from "../../core/errors";
import { GameLog } from "../../core/GameLog";
import { loadPrefab } from "../prefabLoad";
import { BaseView } from "./BaseView";
import { mountBackpackPage } from "./backpackMount";
import { UILayer } from "./UILayer";
import { ViewClass, viewCtorById, viewSpecOf } from "./UIRegistry";
import { bindViewCloser } from "./viewClose";

export interface PageNav {
  readonly current: string | null;
  openChild(id: string): void;
  back(): boolean;
}

export interface UIManagerHost {
  showToast(text: string, durationMs?: number): void;
}

interface OpenPage {
  id: string;
  host: Node;
  ready: Promise<BaseView<unknown>>;
}

interface PreparedPage {
  host: Node;
  view: BaseView<unknown>;
}

/**
 * 正式界面的开关。页面仍进 PanelNav / UIShell。
 * 没登记的页面继续走原来的 presentPage，这里不接。
 * 预制没装上之前不进页面栈，避免留下可点的空壳。
 * 这一阶段只有背包，挂页时带店内底图。
 */
export class UIManager {
  static readonly instance = new UIManager();

  private nav: PageNav | null = null;
  private host: UIManagerHost | null = null;
  private armed = new Set<string>();
  private prepared = new Map<string, PreparedPage>();
  private pages = new Map<string, OpenPage>();
  private opening = new Map<string, Promise<BaseView<unknown>>>();

  install(nav: PageNav, host: UIManagerHost): void {
    this.nav = nav;
    this.host = host;
  }

  /**
   * 打开已注册的视图。
   * 预制、脚本都装好之后才压进页面栈。失败时壳已经销毁，并 Toast。
   */
  async open<T>(ctor: ViewClass<T>, args?: T): Promise<BaseView<T>> {
    const spec = viewSpecOf(ctor);
    if (!spec) throw new Error("视图未注册");
    if (spec.layer !== UILayer.Page) throw new Error("这一阶段 UIManager 只打开 Page，收到 " + spec.layer);
    if (!this.nav) throw new Error("UIManager 还没接上页面栈");
    const existing = this.pages.get(spec.id);
    if (existing && this.nav.current === spec.id) {
      const view = (await existing.ready) as BaseView<T>;
      view.onOpen(args);
      return view;
    }
    const pending = this.opening.get(spec.id);
    if (pending) {
      const view = (await pending) as BaseView<T>;
      view.onOpen(args);
      return view;
    }
    const job = this.openNew(ctor, spec.id, spec.prefab, args);
    this.opening.set(spec.id, job);
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
    const ctor = viewCtorById(id);
    const spec = ctor ? viewSpecOf(ctor) : null;
    const ready = this.prepared.get(id);
    this.prepared.delete(id);
    if (!ctor || !spec || !ready) return null;
    this.pages.set(id, { id, host: ready.host, ready: Promise.resolve(ready.view) });
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

  /** PanelNav 关页之后调用。视图自己退订。 */
  noteClosed(id: string): void {
    const page = this.pages.get(id);
    if (!page) return;
    this.pages.delete(id);
    void page.ready.then(
      (view) => view.onClose(),
      () => {
        GameLog.shared.warn("UI", "关页时视图还没挂上 " + id);
      }
    );
  }

  private async openNew(ctor: ViewClass<unknown>, id: string, prefabPath: string, args: unknown): Promise<BaseView<unknown>> {
    const shell = new Node("LiveShell");
    try {
      const view = await this.mount(shell, ctor, prefabPath, args);
      if (!this.nav) throw new Error("UIManager 还没接上页面栈");
      if (!shell.isValid || !view.node.isValid) throw new Error("页面已关");
      this.prepared.set(id, { host: shell, view });
      this.armed.add(id);
      if (this.nav.current !== id) this.nav.openChild(id);
      if (!this.pages.has(id)) throw new Error("页面没有挂上 " + id);
      return view;
    } catch (err) {
      this.armed.delete(id);
      this.prepared.delete(id);
      if (shell.isValid) shell.destroy();
      this.reportOpenFailed(id, err);
      throw err instanceof Error ? err : new Error(messageOf(err));
    }
  }

  private async mount(shell: Node, ctor: ViewClass<unknown>, prefabPath: string, args: unknown): Promise<BaseView<unknown>> {
    let prefab: Prefab;
    try {
      prefab = await loadPrefab(prefabPath);
    } catch (err) {
      throw new Error(prefabPath + " " + messageOf(err));
    }
    if (!shell.isValid) throw new Error("页面已关");
    const viewNode = await mountBackpackPage(shell, prefab);
    if (!shell.isValid || !viewNode.isValid) throw new Error("页面已关");
    const found = viewNode.getComponent(ctor);
    if (!found) throw new Error(prefabPath + " 上没有视图组件");
    found.onOpen(args);
    await found.whenReady();
    return found;
  }

  /** 页面还没进栈。Toast 给玩家看，日志留给排查。 */
  private reportOpenFailed(id: string, err: unknown): void {
    const text = id === "bag" ? "背包没有打开" : "页面没有打开";
    GameLog.shared.error("UI", text + " " + messageOf(err));
    this.toast(text);
  }
}

bindViewCloser((view) => {
  UIManager.instance.close(view);
});
