import { _decorator, AudioClip, Component, director, Director, Node, Prefab, resources, sp, SpriteFrame, sys } from "cc";
import { AccountModel } from "../../features/account/AccountModel";
import { AccountApi, readSession } from "../../features/account/AccountApi";
import { AccountService } from "../../features/account/AccountService";
import { AccountController } from "../../features/account/AccountController";
import { AccountLoginView } from "../../features/account/ui/AccountLoginView";
import { JsonClient } from "../../platform/http/JsonClient";
import { createXhrAdapter } from "../../platform/http/XhrAdapter";
import { HomeController } from "../../features/home/HomeController";
import { RemakeHomeView } from "../../features/home/ui/RemakeHomeView";
import { UIManager, isOpenCancelled } from "../../framework/ui/UIManager";
import { registerView } from "../../framework/ui/UIRegistry";
import { UILayer } from "../../framework/ui/UILayer";
import { RemakeNavigation } from "./RemakeNavigation";
import { ConfigDb, ConfigLoader } from "../../config/ConfigLoader";
import { BootChrome, loadBootCopy } from "../../ui/bootChrome";
import { playLogoSplash } from "../../ui/logoSplash";
import type { LogoSplashHandle } from "../../ui/logoSplash";
import { runStartup, StartupCancelled } from "./StartupFlow";
import { LoginEntry } from "./LoginEntry";

const { ccclass, property } = _decorator;
const SESSION_KEY = "mxzg.remake.developmentSession";

/** Application composition and startup; existing loading artwork and page manager are reused. */
@ccclass("RemakeApp")
export class RemakeApp extends Component {
  @property(Prefab) loginPrefab: Prefab | null = null;
  @property(Prefab) homePrefab: Prefab | null = null;
  @property(Prefab) loadingPrefab: Prefab | null = null;
  @property(Node) pageHost: Node | null = null;
  @property(Node) startupHost: Node | null = null;
  @property apiBaseUrl = "http://127.0.0.1:18080";
  private navigation: RemakeNavigation | null = null;
  private offAccount: (() => void) | null = null;
  private unregisterViews: Array<() => void> = [];
  private requestedRoute = "";
  private alive = false;
  private started = false;
  private chrome: BootChrome | null = null;
  private logo: LogoSplashHandle | null = null;
  private routeEpoch = 0;
  private routePending = false;
  private paintWaiters = new Set<() => void>();

  start(): void {
    if (!this.loginPrefab || !this.homePrefab || !this.loadingPrefab || !this.pageHost || !this.startupHost) throw new Error("Remake 场景未绑定页面/加载 Prefab 或启动宿主，请重新打开已更新的 Remake.scene");
    const model = new AccountModel();
    const api = new AccountApi(new JsonClient(this.apiBaseUrl, createXhrAdapter()));
    const storage = sys.localStorage;
    const service = new AccountService(model, api, {
      read: () => { const saved = storage.getItem(SESSION_KEY); return saved ? readSession(JSON.parse(saved)) : null; },
      write: session => storage.setItem(SESSION_KEY, JSON.stringify(session)),
      clear: () => storage.removeItem(SESSION_KEY),
    });
    const ui = UIManager.instance;
    const entry = new LoginEntry();
    let syncRoute = () => {};
    this.navigation = new RemakeNavigation(ui, this.pageHost);
    ui.install(this.navigation, { showToast: text => console.warn("[RemakeUI] " + text) });
    // All business composition lives here. The UI framework imports no account/home classes.
    this.unregisterViews.push(registerView(AccountLoginView, {
      id: "remake-login", prefab: "prefabs/ui/account/AccountLogin", layer: UILayer.Page,
      cache: false, allowMultiple: false, load: async () => this.loginPrefab!,
      createController: view => new AccountController(model, service, view as AccountLoginView, () => {
        entry.confirm();
        syncRoute();
      }),
    }));
    this.unregisterViews.push(registerView(RemakeHomeView, {
      id: "remake-home", prefab: "prefabs/ui/remake-home/RemakeHome", layer: UILayer.Page,
      cache: false, allowMultiple: false, load: async () => this.homePrefab!,
      createController: view => new HomeController(model, service, view as RemakeHomeView),
    }));
    this.alive = true;
    syncRoute = () => {
      if (!this.alive || !this.started) return;
      if (model.snapshot.busy) {
        this.chrome?.show();
        this.chrome?.setStage("同步角色资料");
        this.chrome?.setRatio(0);
        return;
      }
      if (!model.snapshot.role) entry.reset();
      const route = entry.route(!!model.snapshot.role);
      if (route === this.requestedRoute) {
        if (!this.routePending) this.chrome?.hide();
        return;
      }
      this.requestedRoute = route;
      ui.keepOnly(route);
      const epoch = ++this.routeEpoch;
      this.routePending = true;
      this.chrome?.show();
      this.chrome?.setStage(route === "remake-home" ? "准备主城" : "准备登录界面");
      this.chrome?.setRatio(0);
      void ui.openById(route).then(async () => {
        if (!this.alive || epoch !== this.routeEpoch) return;
        this.chrome?.setRatio(1);
        await this.reveal(epoch, route === "remake-home");
        if (epoch === this.routeEpoch) this.routePending = false;
      }).catch(async error => {
        if (!this.alive || epoch !== this.routeEpoch) return;
        this.routePending = false;
        if (isOpenCancelled(error)) {
          // A login -> home -> login change can cancel an earlier load of the same route.
          if (this.requestedRoute === route) { this.requestedRoute = ""; syncRoute(); }
          return;
        }
        if (this.requestedRoute === route) this.requestedRoute = "";
        console.error("[RemakeUI] " + route, error);
        if (await this.chrome?.prompt("界面加载失败，请重试", "重试")) syncRoute();
      });
    };
    this.offAccount = model.subscribe(syncRoute);
    void this.boot(async () => {
      await service.restore();
    }, async () => {
      const route = entry.route(!!model.snapshot.role);
      this.requestedRoute = route;
      ui.keepOnly(route);
      await ui.openById(route);
    }).then(() => {
      if (!this.alive) return;
      this.started = true;
      syncRoute();
    }).catch(error => {
      if (this.alive) console.error("[RemakeStartup]", error);
    });
  }

  private async boot(restore: () => Promise<void>, openPage: () => Promise<void>): Promise<void> {
    const chrome = this.chrome = new BootChrome(this.startupHost!, async () => this.loadingPrefab!);
    const logo = this.logo = playLogoSplash(this.startupHost!, this.node);
    await logo.fadedIn;
    if (!this.alive) return;
    await chrome.open("loading", logo.node);
    if (!this.alive) return;
    if (!chrome.isReady) throw new Error("已有 LoadingLayer 加载失败");
    await logo.held;
    if (!this.alive) return;
    logo.dismiss();
    await logo.done;
    while (this.alive) {
      try {
        chrome.show();
        await runStartup([
          { label: "加载游戏配置", weight: 50, run: async progress => {
            if (!ConfigDb.current) await ConfigLoader.loadAll(progress);
            else progress(1, 1);
            const copy = await loadBootCopy();
            if (this.alive) chrome.setTips(copy.tips);
          } },
          { label: "加载界面资源", weight: 20, run: async progress => {
            const jobs: Array<[string, typeof SpriteFrame | typeof sp.SkeletonData | typeof AudioClip]> = [
              ["spine/jiemian", sp.SkeletonData], ["spine/jindutiao", sp.SkeletonData],
              ["ui/maps/map-bg-loading/spriteFrame", SpriteFrame], ["audio/bgm-logo", AudioClip],
            ];
            let done = 0;
            await Promise.all(jobs.map(([path, type]) => new Promise<void>((resolve, reject) => {
              resources.load(path, type as typeof SpriteFrame, error => {
                if (error) { reject(error); return; }
                progress(++done, jobs.length); resolve();
              });
            })));
          } },
          { label: "准备账号信息", weight: 10, run: async () => restore() },
          { label: "准备登录界面", weight: 20, run: async () => openPage() },
        ], (label, ratio) => { chrome.setStage(label); chrome.setRatio(ratio); }, () => this.alive);
        await this.reveal(this.routeEpoch, this.requestedRoute === "remake-home");
        return;
      } catch (error) {
        if (!this.alive || error instanceof StartupCancelled) return;
        console.error("[RemakeStartup] task failed", error);
        if (!await chrome.prompt("加载失败，请重试", "重试")) return;
      }
    }
  }

  private async reveal(epoch: number, home: boolean): Promise<void> {
    await this.afterPaint();
    await this.afterPaint();
    if (!this.alive || epoch !== this.routeEpoch) return;
    await this.chrome?.fadeOut(0.3);
    if (!this.alive || epoch !== this.routeEpoch) return;
    this.chrome?.hide();
    if (home) this.logo?.stopMusic();
  }

  private afterPaint(): Promise<void> {
    if (!this.alive) return Promise.resolve();
    return new Promise(resolve => {
      const done = () => {
        director.off(Director.EVENT_AFTER_DRAW, done);
        this.paintWaiters.delete(done);
        resolve();
      };
      this.paintWaiters.add(done);
      director.once(Director.EVENT_AFTER_DRAW, done);
    });
  }
  onDestroy(): void {
    this.alive = false;
    this.started = false;
    this.routeEpoch++;
    for (const done of this.paintWaiters) done();
    this.logo?.stop(); this.logo?.stopMusic(); this.logo = null;
    this.chrome?.destroy(); this.chrome = null;
    this.offAccount?.(); this.offAccount = null;
    this.navigation?.dispose(); this.navigation = null;
    for (const unregister of this.unregisterViews.splice(0)) unregister();
  }
}
