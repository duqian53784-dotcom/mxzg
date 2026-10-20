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
}
