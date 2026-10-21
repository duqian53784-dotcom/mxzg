import { findServer } from "./servers";

/** Mock 登录结果。模块单例，切场景后仍在（不挂节点）。 */
export interface MockRole {
  roleId: number;
  name: string;
  level: number;
}

/** mock：钱包和关卡来自 Mock。wire：只记下真服角色，金币钻石还没同步。 */
export type SessionSource = "mock" | "wire";

export class Session {
  static account = "";
  static token = "";
  /** 选服。默认本地Mock。 */
  static serverId = findServer(1).id;
  static serverName = findServer(1).name;
  static role: MockRole | null = null;
  /** 开服自然日。来自 Mock 的 role.enter；缺省第 1 天。真服登录不拿它当进度。 */
  static openDay = 1;
  /** 下一关。主城「主线」用它发 stage.enter。 */
  static stageId = 1;
  /** Mock 钱包。道具 id 1 金币、id 2 钻石。没进角色时是 0。wire 时保持 0，界面写未同步。 */
  static gold = 0;
  static diamond = 0;
  static source: SessionSource = "mock";

  static setServer(id: number): void {
    const server = findServer(id);
    this.serverId = server.id;
    this.serverName = server.name;
  }

  /** Boot 在 Mock 的 role.enter 成功后写入。缺金币钻石时记 0，避免沿用上一个号。 */
  static applyEnter(role: {
    roleId: number;
    name: string;
    level: number;
    openDay?: number;
    stageId?: number;
    gold?: number;
    diamond?: number;
  }): void {
    this.role = { roleId: role.roleId, name: role.name, level: role.level };
    this.openDay = typeof role.openDay === "number" && role.openDay >= 1 ? role.openDay : 1;
    this.stageId = typeof role.stageId === "number" && role.stageId >= 1 ? role.stageId : 1;
    this.gold = nonNegativeInt(role.gold);
    this.diamond = nonNegativeInt(role.diamond);
    this.source = "mock";
  }

  /**
   * 真服 s2c 1001 有角色 id 时写入。
   * 不填 Mock 起步金币 100 / 钻石 20。等级和关卡界面上标成未同步。
   * name 只有创角面板刚提交的名字；1001 已证明的字段里没有角色名。
   */
  static applyWireRole(input: { account: string; serverId: number; roleId: number; name?: string | null }): void {
    this.account = input.account;
    this.setServer(input.serverId);
    this.token = "";
    const typed = (input.name || "").trim();
    this.role = {
      roleId: input.roleId,
      name: typed || "角色 " + input.roleId,
      level: 1,
    };
    this.openDay = 1;
    this.stageId = 1;
    this.gold = 0;
    this.diamond = 0;
    this.source = "wire";
  }

  static applyCurrencies(gold?: number, diamond?: number): void {
    if (typeof gold === "number" && isFinite(gold)) this.gold = nonNegativeInt(gold);
    if (typeof diamond === "number" && isFinite(diamond)) this.diamond = nonNegativeInt(diamond);
  }
}

function nonNegativeInt(value: number | undefined): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/** 主城顶栏左侧第一行：角色名和等级。真服不显示占位 Lv1。 */
export function formatNameLine(): string {
  if (!Session.account) return "未登录";
  const name = Session.role?.name || "未命名";
  if (Session.source === "wire") return name;
  const level = Session.role?.level ?? 1;
  return name + " Lv" + level;
}

/** 顶栏左侧第二行：服务器和开服自然日。真服还没有开服天。 */
export function formatSubLine(): string {
  if (!Session.account) return "请从 Boot 进入";
  if (Session.source === "wire") {
    const id = Session.role ? String(Session.role.roleId) : "?";
    return "真服 · 角色 " + id;
  }
  const server = Session.serverName || "未选服";
  const day = Session.openDay >= 1 ? Session.openDay : 1;
  return server + " · 开服D" + day;
}

export function formatGoldLine(): string {
  if (Session.source === "wire") return "金币 未同步";
  return "金币 " + Session.gold;
}

export function formatDiamondLine(): string {
  if (Session.source === "wire") return "钻石 未同步";
  return "钻石 " + Session.diamond;
}

/** 主城标题下那一行：角色名、等级、所选服务器。 */
export function formatHubIdentity(): string {
  if (!Session.account) return "未登录（请从 Boot 进入）";
  const name = Session.role?.name || "未命名";
  if (Session.source === "wire") return name + " · 真服";
  const level = Session.role?.level ?? 1;
  const server = Session.serverName || "未选服";
  return name + " Lv" + level + " · " + server;
}
