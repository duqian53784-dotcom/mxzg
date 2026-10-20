import { failureCode, logErrorCode } from "../../core/errors";
import { NetClient } from "../NetClient";
import { decodeResponse } from "./codec";
import { Cmd } from "./cmds";
import {
  HeartbeatReq,
  HeartbeatResp,
  LoginReq,
  LoginResp,
  RoleCreateReq,
  RoleCreateResp,
  RoleEnterReq,
  RoleEnterResp,
  StageEnterReq,
  StageEnterResp,
  StageResultReq,
  StageResultResp,
} from "./types";

async function call<T>(net: NetClient, cmd: string, data?: unknown): Promise<T> {
  const msg = await net.request(cmd, data);
  const body = decodeResponse<T>(msg);
  const code = failureCode(body);
  if (code !== null) logErrorCode("Proto", code, cmd);
  return body;
}

/**
 * P0 类型化入口。内部仍是 NetClient.request → MockTransport。
 * 不传 net 时用 NetClient.shared（Boot 预览走这条）。
 */
export const Proto = {
  login(req: LoginReq, net: NetClient = NetClient.shared): Promise<LoginResp> {
    return call(net, Cmd.login, req);
  },

  heartbeat(req: HeartbeatReq, net: NetClient = NetClient.shared): Promise<HeartbeatResp> {
    return call(net, Cmd.heartbeat, req);
  },

  roleEnter(req: RoleEnterReq, net: NetClient = NetClient.shared): Promise<RoleEnterResp> {
    return call(net, Cmd.roleEnter, req);
  },

  roleCreate(req: RoleCreateReq, net: NetClient = NetClient.shared): Promise<RoleCreateResp> {
    return call(net, Cmd.roleCreate, req);
  },

  stageEnter(req: StageEnterReq, net: NetClient = NetClient.shared): Promise<StageEnterResp> {
    return call(net, Cmd.stageEnter, req);
  },

  stageResult(req: StageResultReq, net: NetClient = NetClient.shared): Promise<StageResultResp> {
    return call(net, Cmd.stageResult, req);
  },
};
