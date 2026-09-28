import type { NodeState } from "../network/NetworkSceneBase";

// インターネット・パケットの図解の型（InternetProtocolExperience と PacketDioramaScene で共有）。

export type PacketNodeId = "sender" | "rTop" | "rMid" | "rBot" | "receiver";

export type RouteId = "top" | "mid" | "bot";

/** パケットの居場所：送信側の積み場 / 経路の途中（道・区間・進み具合）/ 受信側のトレイ（何段目か） */
export type PacketSpot =
  | { kind: "stack"; slot: number }
  | { kind: "road"; route: RouteId; leg: 0 | 1; t: number }
  | { kind: "tray"; slot: number };

export type PacketView = {
  no: number;
  data: string;
  route: RouteId;
  spot: PacketSpot;
  /** 到着した順番（受信トレイで表示） */
  arrived?: number;
};

export type PacketSceneProps = {
  nodes: Record<PacketNodeId, NodeState>;
  routes: Partial<Record<RouteId, "active">>;
  /** 分割前のひとかたまりのデータ（null=もう分割した） */
  whole: string | null;
  packets: PacketView[];
  trayMode: "arrival" | "sorted" | null;
  restored: string | null;
  reducedMotion: boolean;
};
