import { AccountModel } from "./AccountModel";
import type { AccountState } from "./AccountModel";
import { AccountService } from "./AccountService";

export interface AccountActions { login(account: string): void; restore(): void; logout(): void; }
export interface AccountView {
  bind(actions: AccountActions): () => void;
  render(state: AccountState): void;
}

/** UI lifetime only. Network state continues in the feature when a view is closed. */
export class AccountController {
  private disposers: Array<() => void> = [];
  private open = false;
  constructor(private readonly model: AccountModel, private readonly service: AccountService,
    private readonly view: AccountView, private readonly enterGame: () => void = () => {}) {}

  show(): void {
    if (this.open) return;
    const unbind = this.view.bind({
      login: account => {
        if (this.model.snapshot.busy) return;
        void this.startGame(account);
      },
      restore: () => { if (!this.model.snapshot.busy) void this.service.restore(); },
      logout: () => this.service.logout(),
    });
    this.disposers = [unbind, this.model.subscribe(state => this.view.render(state))];
    this.open = true;
    try { this.view.render(this.model.snapshot); }
    catch (error) { this.close(); throw error; }
  }
  close(): void {
    this.open = false;
    for (const dispose of this.disposers.splice(0)) dispose();
  }

  private async startGame(account: string): Promise<void> {
    // A prepared session is revalidated on the explicit Start click. Switching
    // accounts first clears the prepared session through the existing logout action.
    const success = this.model.snapshot.role ? await this.service.restore() : await this.service.login(account);
    if (success && this.open) this.enterGame();
  }
}
