import { _decorator, Button, EditBox, Label, Node } from "cc";
import { BaseView } from "../../../framework/ui/BaseView";
import type { AccountActions, AccountView } from "../AccountController";
import type { AccountState } from "../AccountModel";

const { ccclass, property } = _decorator;

@ccclass("AccountLoginView")
export class AccountLoginView extends BaseView implements AccountView {
  @property(EditBox) accountInput: EditBox | null = null;
  @property(Button) loginButton: Button | null = null;
  @property(Button) restoreButton: Button | null = null;
  @property(Button) logoutButton: Button | null = null;
  @property(Label) statusLabel: Label | null = null;
  @property(Label) profileLabel: Label | null = null;
  @property(Node) developerPanel: Node | null = null;
  @property(Button) developerButton: Button | null = null;

  bind(actions: AccountActions): () => void {
    for (const name of ["accountInput", "loginButton", "restoreButton", "logoutButton", "statusLabel", "profileLabel"]) {
      if (!(this as unknown as Record<string, unknown>)[name]) throw new Error("AccountLogin Prefab 未绑定 " + name);
    }
    const login = () => actions.login(this.accountInput!.string);
    const restore = () => actions.restore();
    const logout = () => actions.logout();
    const toggleDeveloper = () => {
      if (this.developerPanel) this.developerPanel.active = !this.developerPanel.active;
    };
    this.loginButton!.node.on(Button.EventType.CLICK, login);
    this.restoreButton!.node.on(Button.EventType.CLICK, restore);
    this.logoutButton!.node.on(Button.EventType.CLICK, logout);
    this.developerButton?.node.on(Button.EventType.CLICK, toggleDeveloper);
    return () => {
      this.loginButton!.node.off(Button.EventType.CLICK, login);
      this.restoreButton!.node.off(Button.EventType.CLICK, restore);
      this.logoutButton!.node.off(Button.EventType.CLICK, logout);
      this.developerButton?.node.off(Button.EventType.CLICK, toggleDeveloper);
    };
  }

  render(state: AccountState): void {
    this.loginButton!.interactable = !state.busy;
    this.restoreButton!.interactable = !state.busy;
    this.accountInput!.enabled = !state.busy;
    this.accountInput!.node.active = !state.role;
    this.logoutButton!.interactable = !state.busy;
    if (this.developerButton) this.developerButton.interactable = !state.busy;
    this.statusLabel!.string = state.busy ? "正在连接服务器…" : state.error || "";
    this.profileLabel!.string = state.role ? `当前角色：${state.role.nickname}` : "仅供本机联调 · 暂未接入正式渠道账号";
  }
}
