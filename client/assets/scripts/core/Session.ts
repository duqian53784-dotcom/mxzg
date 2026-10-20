/** Mock 登录结果。模块单例，切场景后仍在（不挂节点）。 */
export interface MockRole {
  roleId: number;
  name: string;
  level: number;
}

export class Session {
  static account = "";
  static token = "";
  static role: MockRole | null = null;
  /** 开服自然日。来自 Mock 的 role.enter；缺省第 1 天。 */
  static openDay = 1;
  /** 下一关。主城「主线」用它发 stage.enter。 */
  static stageId = 1;
}
