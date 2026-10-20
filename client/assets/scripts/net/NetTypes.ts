export type NetState = "idle" | "connecting" | "connected" | "reconnecting" | "closed";

export interface NetMessage<T = unknown> {
  cmd: string;
  data?: T;
}

export type NetHandler = (msg: NetMessage) => void;

/** 传输层。MockTransport 不建真 socket；真 WebSocket 留到阶段 D。 */
export interface ITransport {
  connect(url: string): Promise<void>;
  send(msg: NetMessage): void;
  close(): void;
  onMessage(handler: NetHandler): void;
  onClose(handler: () => void): void;
}
