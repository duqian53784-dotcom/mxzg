import type { Node } from "cc";
import { UIManager } from "../../framework/ui/UIManager";
import type { PageNav } from "../../framework/ui/UIManager";

/** Application navigation for the two authenticated roots, using the existing UIManager. */
export class RemakeNavigation implements PageNav {
  current: string | null = null;
  private currentHost: Node | null = null;
  constructor(private readonly ui: UIManager, private readonly parent: Node) {}

  openChild(id: string): void {
    const next = this.ui.createPageHost(id);
    if (!next) throw new Error("页面未准备好：" + id);
    // A failed load never reaches here, so the visible page survives loading failures.
    const previous = this.current;
    const previousHost = this.currentHost;
    next.parent = this.parent;
    this.current = id;
    this.currentHost = next;
    if (previous) this.ui.noteClosed(previous);
    if (previousHost?.isValid) previousHost.destroy();
  }

  /** Login and authenticated home are session roots; returning requires explicit logout. */
  back(): boolean { return false; }

  dispose(): void {
    this.ui.invalidatePending();
    if (this.current) this.ui.noteClosed(this.current);
    if (this.currentHost?.isValid) this.currentHost.destroy();
    this.current = null;
    this.currentHost = null;
    this.ui.uninstall(this);
  }
}
