/**
 * Network facade placeholder (Mock first, real socket in stage D).
 */
export type NetState = "idle" | "connecting" | "connected" | "closed";

export class NetClient {
  state: NetState = "idle";

  connect(_url: string): void {
    this.state = "connecting";
    // TODO B4
    this.state = "connected";
  }

  close(): void {
    this.state = "closed";
  }
}