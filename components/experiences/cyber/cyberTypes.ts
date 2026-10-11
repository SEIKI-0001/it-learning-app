import type { ReactNode } from "react";
import type { NodeState } from "../network/NetworkSceneBase";

// サイバー攻撃の図解の型（CyberAttacksExperience と CyberScene3D / CyberDioramaScene で共有）。

export type CyberNodeId = "attacker" | "internet" | "web" | "db" | "user" | "staff";

export type CyberLaneId = "ai" | "iw" | "wd" | "ui" | "is" | "as" | "sw";

export type LaneTone = "attack" | "normal" | "leak" | "phone";

export type CyberStop = CyberNodeId;

/** 図解の枠内に表示する、いまのステップの解説（2.5D 版のみ） */
export type CyberCaption = { label: string; title: string; badge?: ReactNode; /** 枠の下端に出す手口の説明 */ note?: string };

/** いま起きていることを1つだけ伝える短い吹き出し（35文字以内）。target の場所を指す */
export type CyberBubble = { target: CyberNodeId; text: string; tone?: "danger" };

/** 画面（攻撃者・利用者のノートPC、社員のモニター）に映すもの */
export type ScreenKind =
  | "code" // 攻撃者：命令を打ち込む黒い画面
  | "loot" // 攻撃者：盗んだデータが並ぶ
  | "browser" // 利用者：いつものサイト
  | "board" // 利用者：掲示板
  | "down" // 利用者：つながらない
  | "trap" // 利用者：罠のスクリプトが動いた
  | "work" // 社員：表計算の仕事中
  | "mail" // 社員：取引先を装ったメール
  | "virus"; // 社員：ウイルスに感染

export type ScreenOwner = "attacker" | "user" | "staff";

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
  /** 3D 版：場面の吹き出し */
  bubble?: CyberBubble | null;
  /** 3D 版：画面に映すもの（指定が無ければふだんの画面） */
  screens?: Partial<Record<ScreenOwner, ScreenKind>>;
  /** 3D 版：運ぶ物が動き出す場所（前の場面で止まっていた所）。null なら攻撃者の手元から */
  from?: CyberNodeId | null;
  /** 3D 版：「もう一度見る」などで同じ場面を最初から動かし直すための番号 */
  epoch?: number;
  /** 3D 版：一時停止中（模型の動きもその場で止める） */
  paused?: boolean;
};

/** 攻撃者から各場所への通り道（どのレーンがどこを結ぶか） */
export const LANE_ENDS: Record<CyberLaneId, [CyberNodeId, CyberNodeId]> = {
  ai: ["attacker", "internet"],
  iw: ["internet", "web"],
  wd: ["web", "db"],
  ui: ["user", "internet"],
  is: ["internet", "staff"],
  as: ["attacker", "staff"],
  sw: ["staff", "web"],
};

/**
 * いまの場面で名札を出す場所。動いている場所・被害の出た場所・吹き出しが指す場所だけにし、
 * 場面に関係ない名札は出さない。攻撃を選ぶ前（全部 idle で吹き出しなし）は地図として全部出す。
 */
export function shownNodeLabels({ nodes, damage, bubble }: Pick<CyberSceneProps, "nodes" | "damage" | "bubble">): Set<CyberNodeId> {
  const ids = Object.keys(nodes) as CyberNodeId[];
  const busy = ids.filter((id) => nodes[id] !== "idle");
  if (busy.length === 0 && !bubble) return new Set(ids);
  const shown = new Set<CyberNodeId>(busy);
  for (const d of damage) shown.add(d.at);
  if (bubble) shown.add(bubble.target);
  return shown;
}
