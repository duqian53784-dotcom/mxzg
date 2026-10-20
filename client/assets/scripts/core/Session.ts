import { findServer } from "./servers";

/** Mock 登录结果。模块单例，切场景后仍在（不挂节点）。 */
export interface MockRole {
  roleId: number;
  name: string;
  level: number;
}

export class Session {
  static account = "";
  static token = "";
  /** 选服。默认本地Mock。 */
  static serverId = findServer(1).id;
  static serverName = findServer(1).name;
  static role: MockRole | null = null;
  /** 开服自然日。来自 Mock 的 role.enter；缺省第 1 天。 */
  static openDay = 1;
  /** 下一关。主城「主线」用它发 stage.enter。 */
  static stageId = 1;

  static setServer(id: number): void {
    const server = findServer(id);
    this.serverId = server.id;
    this.serverName = server.name;
  }
}

/** 主城标题下那一行：角色名、等级、所选服务器。 */
export function formatHubIdentity(): string {
  if (!Session.account) return "未登录（请从 Boot 进入）";
  const level = Session.role?.level ?? 1;
  const name = Session.role?.name || "未命名";
  const server = Session.serverName || "未选服";
  return name + " Lv" + level + " · " + server;
}
