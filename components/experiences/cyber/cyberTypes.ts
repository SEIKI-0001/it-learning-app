import type { ReactNode } from "react";
import type { NodeState } from "../network/NetworkSceneBase";

// サイバー攻撃の図解の型（CyberAttacksExperience と CyberDioramaScene で共有）。

export type CyberNodeId = "attacker" | "internet" | "web" | "db" | "user" | "staff";

export type CyberLaneId = "ai" | "iw" | "wd" | "ui" | "is" | "as" | "sw";

export type LaneTone = "attack" | "normal" | "leak" | "phone";

export type CyberStop = CyberNodeId;

/** 図解の枠内に表示する、いまのステップの解説 */
export type CyberCaption = { label: string; title: string; badge?: ReactNode; /** 枠の下端に出す手口の説明 */ note?: string };

export type CyberSceneProps = {
  caption?: CyberCaption;
  nodes: Record<CyberNodeId, NodeState>;
  lanes: Partial<Record<CyberLaneId, LaneTone | "blocked">>;
  /** 移動するもの（命令文・罠・メール・データ…） */
  payload: { stop: CyberStop; tone: LaneTone; text: string } | null;
  /** 大量アクセス（DDoS）の粒を流すレーン */
  flood: CyberLaneId[];
  damage: { at: CyberNodeId; text: string }[];
  reducedMotion: boolean;
};
