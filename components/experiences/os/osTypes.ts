import type { NodeState } from "../network/NetworkSceneBase";

// OS の図解の型（OsExperience と OsDioramaScene で共有）。

export type OsLayer = "app" | "os" | "hw";

export type OsPart = "music" | "files" | "core" | "cpu" | "speaker" | "storage" | "user" | "wallL" | "wallR";

type BlockPart = Exclude<OsPart, "user" | "wallL" | "wallR">;

export type OsSceneProps = {
  layers: Record<OsLayer, NodeState>;
  parts: Partial<Record<BlockPart, NodeState>>;
  /** 板と板をつなぐ縦の経路（上から下へ／下から上へ） */
  links: { from: OsPart; to: OsPart; tone: "request" | "result" | "blocked" }[];
  capsule: { at: OsPart; text: string; tone: "request" | "result" | "blocked" } | null;
  barrier: boolean;
  userHears: string | null;
  reducedMotion: boolean;
};
