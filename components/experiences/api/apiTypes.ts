import type { NodeState } from "../network/NetworkSceneBase";

// API の図解の型（ApiExperience と ApiDioramaScene で共有）。

export type ApiNodeId = "app" | "api" | "svc";

export type ApiStop = "app" | "apiIn" | "svc" | "apiOut" | "appBack" | "wall";

export type ApiLaneId = "req1" | "req2" | "res1" | "res2" | "direct";

export type ApiSceneProps = {
  nodes: Record<ApiNodeId, NodeState>;
  lanes: Partial<Record<ApiLaneId, "active" | "blocked">>;
  capsule: { stop: ApiStop; kind: "request" | "response" | "blocked"; tag: string; payload: string } | null;
  screen: string | null;
  bypass: boolean;
  reducedMotion: boolean;
};
