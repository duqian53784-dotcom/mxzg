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
} as const;

export const CmdId = {
  login: 1001,
  heartbeat: 1002,
  roleEnter: 1101,
  roleCreate: 1102,
  stageEnter: 1201,
  stageResult: 1202,
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
];
