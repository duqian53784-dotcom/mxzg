import { GameLog } from "../core/GameLog";
import { Session } from "../core/Session";
import { NetClient } from "./NetClient";
import { decodeWireRole, WIRE_ROLE_CMD, WireRoleProfile } from "./protocol/wireProfile";
import { wireBody } from "./protocol/wireLogin";

/**
 * ?transport=ws 登录进主城后，这条 NetClient 要活过 Boot 切场景。
 * 心跳 1004 继续发。
 * 连上就听 wire.2001。登录成功后发空的 c2s 2001（日志里的拉角色资料）。
 * 字段 9 是角色名，写进 Session 并通知主城刷新顶栏。
 * 等级、金币、钻石这包对不上，不写。别的 s2c 仍只记 wire.<cmdId>。
 * 解不开就忽略，不抛进拆帧循环。
 */
export class WireSession {
  static net: NetClient | null = null;

  private static watched: NetClient | null = null;
  private static offProfile: (() => void) | null = null;
  private static pending: WireRoleProfile | null = null;
  private static listeners = new Set<() => void>();

  /** 套接字一开就听。登录回包里如果已经夹着 2001，先记下，等角色写入后再套上。 */
  static watch(net: NetClient): void {
    if (this.watched === net && this.offProfile) return;
    this.unhook();
    this.watched = net;
    this.offProfile = net.subscribe(WIRE_ROLE_CMD, (msg) => this.onRole(msg.data));
  }

  static hold(net: NetClient): void {
    if (this.net && this.net !== net) this.net.close();
    this.net = net;
    this.watch(net);
  }

  /** 只放下引用。调用方自己 close。 */
  static release(net: NetClient | null): void {
    if (net && this.net === net) this.net = null;
    if (net && this.watched === net) {
      this.unhook();
      this.watched = null;
      this.pending = null;
    }
  }

  static close(): void {
    const net = this.net;
    this.net = null;
    this.unhook();
    this.watched = null;
    this.pending = null;
    if (net) net.close();
  }

  /** 顶栏有变化时通知。MainApp 用来重画角色名。 */
  static onSync(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** applyWireRole 之后调用。登录过程中先到的名字在这里写上。 */
  static flush(): void {
    const name = this.pending && this.pending.name;
    if (!name) return;
    if (!Session.applyWireSync({ name })) return;
    this.pending = null;
    GameLog.shared.info("Wire", "角色名 " + name);
    this.emit();
  }

  /** 空的 c2s 2001。旧桥日志里这一帧没有包体。 */
  static pullRoleProfile(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ROLE_CMD);
  }

  private static onRole(data: unknown): void {
    let profile: WireRoleProfile | null = null;
    try {
      profile = decodeWireRole(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 2001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!profile) {
      GameLog.shared.info("Wire", "s2c 2001 解不开，顶栏不改");
      return;
    }
    if (!profile.name) {
      GameLog.shared.info("Wire", "s2c 2001 没有可用的角色名，顶栏不改");
      return;
    }
    this.pending = profile;
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 2001 角色名先记下：" + profile.name);
      return;
    }
    Session.applyWireSync({ name: profile.name });
    this.pending = null;
    GameLog.shared.info("Wire", "角色名 " + profile.name);
    this.emit();
  }

  private static emit(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener();
      } catch (err) {
        GameLog.shared.error("Wire", "刷新顶栏失败 " + (err instanceof Error ? err.message : "未知错误"));
      }
    }
  }

  private static unhook(): void {
    if (this.offProfile) {
      this.offProfile();
      this.offProfile = null;
    }
  }
}
