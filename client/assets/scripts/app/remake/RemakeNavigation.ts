import type { Node } from "cc";
import { UIManager } from "../../framework/ui/UIManager";
import type { PageNav } from "../../framework/ui/UIManager";

export interface FeaturePageHost {
  parent(id: string): Node | null;
  changed(id: string | null): void;
}

/** Session roots replace each other; a feature keeps its home root and shared chrome. */
export class RemakeNavigation implements PageNav {
  current: string | null = null;
  private currentHost: Node | null = null;
  private root: { id: string; host: Node } | null = null;
  constructor(private readonly ui: UIManager, private readonly parent: Node,
    private readonly features?: FeaturePageHost) {}

  openChild(id: string): void {
    const featureParent = this.features?.parent(id);
    const next = this.ui.createPageHost(id);
    if (!next) throw new Error("页面未准备好：" + id);
    if (featureParent?.isValid && this.current && this.currentHost && !this.root) {
      this.root = { id: this.current, host: this.currentHost };
      next.parent = featureParent;
      this.current = id;
      this.currentHost = next;
      this.features?.changed(id);
      return;
    }
    // A failed load never reaches here, so the visible page survives loading failures.
    const previous = this.current;
    const previousHost = this.currentHost;
    next.parent = this.parent;
    this.current = id;
    this.currentHost = next;
    if (previous) this.ui.noteClosed(previous);
    if (previousHost?.isValid) previousHost.destroy();
    if (this.root) {
      this.ui.noteClosed(this.root.id);
      if (this.root.host.isValid) this.root.host.destroy();
      this.root = null;
    }
    this.features?.changed(null);
  }

  /** A feature can return home; session roots never return to the prior identity. */
  back(): boolean {
    const root = this.root;
    if (!root) return false;
    this.ui.keepOnly(root.id);
    if (this.current) this.ui.noteClosed(this.current);
    if (this.currentHost?.isValid) this.currentHost.destroy();
    this.current = root.id;
    this.currentHost = root.host;
    this.root = null;
    this.features?.changed(null);
    return true;
  }

  dispose(): void {
    this.ui.invalidatePending();
    if (this.current) this.ui.noteClosed(this.current);
    if (this.currentHost?.isValid) this.currentHost.destroy();
    if (this.root) {
      this.ui.noteClosed(this.root.id);
      if (this.root.host.isValid) this.root.host.destroy();
      this.root = null;
    }
    this.current = null;
    this.currentHost = null;
    this.ui.uninstall(this);
  }
}
