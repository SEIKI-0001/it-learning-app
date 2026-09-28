import type { NodeState } from "../network/NetworkSceneBase";

// BCP の図解の型（BcpExperience と BcpDioramaScene で共有）。

export type BcpNodeId = "hq" | "system" | "staff" | "alt" | "vault";

/** 社員がいる場所 */
export type StaffSpot = "staff" | "alt" | "hq";

/** データがある場所（lost＝消えた） */
export type DataSpot = "vault" | "alt" | "lost";

export type BcpSceneProps = {
  nodes: Record<BcpNodeId, NodeState>;
  prep: { backup: boolean; site: boolean; contact: boolean };
  disaster: boolean;
  lanes: Partial<Record<"move" | "restore" | "sync", "active" | "blocked">>;
  staffToken: { at: StaffSpot; text: string; tone: "ok" | "ng" | "idle" };
  dataToken: { at: DataSpot; text: string; tone: "ok" | "ng" | "idle" } | null;
  shake: boolean;
  reducedMotion: boolean;
};
