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

/**
 * 正式界面的开关。页面仍进 PanelNav / UIShell，返回和主城页签关的是同一叠。
 * 没登记的页面继续走原来的 presentPage，这里不接。
 * 这一阶段只有背包，挂页时带店内底图。
 */
export class UIManager {
  static readonly instance = new UIManager();

  private nav: PageNav | null = null;
  private host: UIManagerHost | null = null;
  private armed = new Set<string>();
  private pendingArgs = new Map<string, unknown>();
  private pages = new Map<string, OpenPage>();

  install(nav: PageNav, host: UIManagerHost): void {
    this.nav = nav;
    this.host = host;
  }

  /**
   * 打开已注册的视图。
   * 预制还在加载时，返回的 Promise 会等到视图 onOpen 做完。
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
    this.pendingArgs.set(spec.id, args);
    this.armed.add(spec.id);
    if (this.nav.current !== spec.id) this.nav.openChild(spec.id);
    const page = this.pages.get(spec.id);
    if (!page) {
      this.armed.delete(spec.id);
      throw new Error("页面没有挂上 " + spec.id);
    }
    return (await page.ready) as BaseView<T>;
  }

  /**
   * presentPage 里调用。只有 open() 刚登记过的页面 id 才返回宿主。
   * 没登记的返回 null，调用方继续走原来的壳。
   */
  createPageHost(id: string): Node | null {
    if (!this.armed.has(id)) return null;
    this.armed.delete(id);
    const ctor = viewCtorById(id);
    const spec = ctor ? viewSpecOf(ctor) : null;
    if (!ctor || !spec) return null;
    const host = new Node("LiveShell");
    const args = this.pendingArgs.get(id);
    this.pendingArgs.delete(id);
    const ready = this.finish(host, ctor, spec.prefab, args);
    this.pages.set(id, { id, host, ready });
    return host;
  }

  /** 关掉最上面一层。传入视图时，它必须就是当前页。 */
  close(view?: object): boolean {
    if (!this.nav) return false;
    if (view) {
      const spec = viewSpecOf(view.constructor);
      if (!spec || this.nav.current !== spec.id) return false;
    }
    return this.nav.back();
  }

  back(): boolean {
    if (!this.nav) return false;
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

  private async finish(host: Node, ctor: Function, prefabPath: string, args: unknown): Promise<BaseView<unknown>> {
    let prefab: Prefab;
    try {
      prefab = await loadPrefab(prefabPath);
    } catch (err) {
      throw new Error(prefabPath + " " + messageOf(err));
    }
    if (!host.isValid) throw new Error("页面已关");
    const viewNode = await mountBackpackPage(host, prefab);
    if (!host.isValid || !viewNode.isValid) throw new Error("页面已关");
    const found = viewNode.getComponent(ctor as new () => BaseView<unknown>);
    if (!found) throw new Error(prefabPath + " 上没有视图组件");
    found.onOpen(args);
    await found.whenReady();
    return found;
  }
}

bindViewCloser((view) => {
  UIManager.instance.close(view);
});
