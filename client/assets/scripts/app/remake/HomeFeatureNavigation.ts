import { isOpenCancelled } from "../../framework/ui/UIManager";

interface FeatureUi {
  keepOnly(id: string): void;
  openById(id: string): Promise<unknown>;
  back(): boolean;
}
interface FeatureHost {
  current(): string | null;
  authorized(): boolean;
  notice(text: string): void;
}

/** Feature intent is separate from login/Start intent. Loading never removes the home root. */
export class HomeFeatureNavigation {
  private epoch = 0;
  private disposed = false;
  constructor(private readonly ui: FeatureUi, private readonly host: FeatureHost) {}

  open(id: string): boolean {
    if (id !== "city" && id !== "hero") return false;
    if (this.disposed || !this.host.authorized()) return true;
    if (id === "city") {
      this.reset();
      this.ui.keepOnly("remake-home");
      this.ui.back();
      this.host.notice("");
      return true;
    }
    if (this.host.current() !== "remake-home") return true;
    const epoch = ++this.epoch;
    this.host.notice("正在准备英雄界面…");
    this.ui.keepOnly("hero");
    void this.ui.openById("hero").then(() => {
      if (this.accepts(epoch)) this.host.notice("");
    }).catch(error => {
      if (!this.accepts(epoch)) return;
      if (isOpenCancelled(error)) {
        // A rapid hero -> city -> hero may still share the first cancelled UIManager job.
        this.open("hero");
        return;
      }
      console.error("[RemakeHero]", error);
      if (this.host.current() === "remake-home") this.host.notice("英雄界面加载失败，点击底栏“英雄”重试");
    });
    return true;
  }
  reset(): void { this.epoch++; }
  dispose(): void { this.disposed = true; this.reset(); }
  private accepts(epoch: number): boolean {
    return !this.disposed && epoch === this.epoch && this.host.authorized();
  }
}
