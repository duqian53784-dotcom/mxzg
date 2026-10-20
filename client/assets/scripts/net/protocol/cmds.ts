/**
 * P0 消息名与占位 ID。
 * cmd 字符串与 MockTransport / Boot 已有调用对齐。
 * 数值 ID 不是旧服 .proto 的真实编号，阶段 D 对照后再改这张表。
 */

export const Cmd = {
  login: "login",
  heartbeat: "heartbeat",
  roleEnter: "role.enter",
  roleCreate: "role.create",
  stageEnter: "stage.enter",
  stageResult: "stage.result",
  idleQuery: "idle.query",
  idleClaim: "idle.claim",
  heroList: "hero.list",
  heroUpgrade: "hero.upgrade",
  summonPull: "summon.pull",
  bagList: "bag.list",
  bagUse: "bag.use",
  mailList: "mail.list",
  mailRead: "mail.read",
  mailClaim: "mail.claim",
  mailClaimAll: "mail.claimAll",
  mailDelete: "mail.delete",
  smithView: "smith.view",
  smithStrengthen: "smith.strengthen",
  arenaView: "arena.view",
  arenaChallenge: "arena.challenge",
} as const;

export const CmdId = {
  login: 1001,
  heartbeat: 1002,
  roleEnter: 1101,
  roleCreate: 1102,
  stageEnter: 1201,
  stageResult: 1202,
  idleQuery: 1301,
  idleClaim: 1302,
  heroList: 1401,
  heroUpgrade: 1402,
  summonPull: 1501,
  bagList: 1601,
  bagUse: 1602,
  mailList: 1701,
  mailRead: 1702,
  mailClaim: 1703,
  mailClaimAll: 1704,
  mailDelete: 1705,
  smithView: 1801,
  smithStrengthen: 1802,
  arenaView: 1901,
  arenaChallenge: 1902,
} as const;

export type CmdName = (typeof Cmd)[keyof typeof Cmd];

export interface CmdSpec {
  id: number;
  cmd: CmdName;
}

/** P0 手写 stub 清单。真 Protobuf 生成后仍用这些 cmd 名对接 Proto.*。 */
export const P0_CMDS: readonly CmdSpec[] = [
  { id: CmdId.login, cmd: Cmd.login },
  { id: CmdId.heartbeat, cmd: Cmd.heartbeat },
  { id: CmdId.roleEnter, cmd: Cmd.roleEnter },
  { id: CmdId.roleCreate, cmd: Cmd.roleCreate },
  { id: CmdId.stageEnter, cmd: Cmd.stageEnter },
  { id: CmdId.stageResult, cmd: Cmd.stageResult },
  { id: CmdId.idleQuery, cmd: Cmd.idleQuery },
  { id: CmdId.idleClaim, cmd: Cmd.idleClaim },
  { id: CmdId.heroList, cmd: Cmd.heroList },
  { id: CmdId.heroUpgrade, cmd: Cmd.heroUpgrade },
  { id: CmdId.summonPull, cmd: Cmd.summonPull },
  { id: CmdId.bagList, cmd: Cmd.bagList },
  { id: CmdId.bagUse, cmd: Cmd.bagUse },
  { id: CmdId.mailList, cmd: Cmd.mailList },
  { id: CmdId.mailRead, cmd: Cmd.mailRead },
  { id: CmdId.mailClaim, cmd: Cmd.mailClaim },
  { id: CmdId.mailClaimAll, cmd: Cmd.mailClaimAll },
  { id: CmdId.mailDelete, cmd: Cmd.mailDelete },
  { id: CmdId.smithView, cmd: Cmd.smithView },
  { id: CmdId.smithStrengthen, cmd: Cmd.smithStrengthen },
  { id: CmdId.arenaView, cmd: Cmd.arenaView },
  { id: CmdId.arenaChallenge, cmd: Cmd.arenaChallenge },
];
