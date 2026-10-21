import { NetClient } from "./NetClient";

/**
 * ?transport=ws 登录进主城后，这条 NetClient 要活过 Boot 切场景。
 * 心跳 1004 继续发。28000、50000 这类 s2c 仍由 WsTransport 记成 wire.<cmdId>，这里不解析。
 */
export class WireSession {
  static net: NetClient | null = null;

  static hold(net: NetClient): void {
    if (this.net && this.net !== net) this.net.close();
    this.net = net;
  }

  /** 只放下引用。调用方自己 close。 */
  static release(net: NetClient | null): void {
    if (net && this.net === net) this.net = null;
  }

  static close(): void {
    const net = this.net;
    this.net = null;
    if (net) net.close();
  }
}
