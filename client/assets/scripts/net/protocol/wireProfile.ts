/**
 * 登录后的角色资料。只绑定 net-20261020.jsonl 里能对上的字段。
 *
 * 旧客户端在 s2c 1001 有角色之后发空的 c2s 2001（整帧 04 00 00 00 d1 07 00 00）。
 * 三例 s2c 2001 的字段 9 都是字符串「见习冒险家」，和这两次创角 c2s 1002 字段 1 相同。
 * 另一例 s2c 11005 把同一个字符串和角色 id 1000001 放在一起，用来核对这就是角色名。
 * 倩本机那串主动推送（28000、28103、20005、25001、23000、21013、50000）里没有这个名字，
 * 所以要自己发空的 c2s 2001，回包到了再改顶栏。
 *
 * 下面这些数在日志里见过，但三份角色对不上「哪一个是等级 / 金币 / 钻石」，这里不写进顶栏：
 * - 字段 6 三例都是 1，字段 25、29 也是 1。没有更高的等级可以对照。
 * - 字段 5 三例都是 1000。老号也没变过。s2c 18001 字段 2 同样是 1000，奖励 JSON 里也出现过 1000。
 * - 字段 15 只有先登录的那份是 100，两份新号没有这个字段（protobuf 省略 0）。只有一个非 0 样本。
 * - 字段 16 三例都是 1792406063，早于第一份角色的创建时间。可能是开服时刻，也可能是当天的某个日切。
 *   这份日志只跨了一个自然日，分不开，不开服天。
 * - 28000 / 25001 / 50000 是 100100 起的活动 id 和奖励 JSON，三份号结构一样，不是钱包。
 */
import { decodeProtoFields } from "./wireLogin";

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.roleProfile。 */
export const WIRE_ROLE_CMD = "wire.2001";

export interface WireRoleProfile {
  /** 字段 9。没有合格字符串时是 null，调用方保持原来的角色 id 或创角时填的名字。 */
  name: string | null;
}

const MAX_BODY = 8192;
const MAX_NAME = 32;

/**
 * 解 s2c 2001。解不开、超长、空包都返回 null，不抛。
 * 包能解开但没有合格的字段 9 时返回 { name: null }，顶栏不改。
 */
export function decodeWireRole(body: Uint8Array | null | undefined): WireRoleProfile | null {
  if (!body || body.length === 0 || body.length > MAX_BODY) return null;
  let fields = null;
  try {
    fields = decodeProtoFields(body);
  } catch (_err) {
    return null;
  }
  if (!fields) return null;
  let name: string | null = null;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field !== 9 || row.kind !== "string" || !row.text) continue;
    const text = acceptableName(row.text);
    if (text) {
      name = text;
      break;
    }
  }
  return { name };
}

function acceptableName(text: string): string | null {
  const name = text.trim();
  const chars = Array.from(name);
  if (chars.length < 1 || chars.length > MAX_NAME) return null;
  let marked = false;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i].codePointAt(0) || 0;
    if (c < 32) return null;
    if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c >= 0x80) marked = true;
  }
  if (!marked) return null;
  return name;
}
