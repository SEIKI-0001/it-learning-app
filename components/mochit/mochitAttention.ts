// モチットの Semantic Attention（「何を見ているか」）を視線へ変換する純粋ロジック。
// attention（意味: user/content/result/random）と attentionPoint（実際の位置）を分離し、
// 位置は画面やDOMに依存しない正規化座標で受け取る。DOM/React には依存しない。
//
// 正規化座標（将来 Rive の attentionX / attentionY と共通化する前提）:
//   x, y ∈ [0, 1]   0,0 = 左上 / 0.5,0.5 = 中央 / 1,1 = 右下
// DOM の pixel 座標ではない。

import type { MochitAttention } from "./mochitBehavior";
import type { GazeOffset } from "./mochitIdleAnimation";

export type MochitAttentionPoint = {
  x: number;
  y: number;
};

export const MOCHIT_ATTENTION_CENTER: Readonly<MochitAttentionPoint> = Object.freeze({ x: 0.5, y: 0.5 });

function clampAxis(v: number): number {
  // NaN / ±Infinity / 非数値は安全側（中央）へ
  if (typeof v !== "number" || !Number.isFinite(v)) return MOCHIT_ATTENTION_CENTER.x;
  return Math.min(1, Math.max(0, v));
}

/** 正規化座標を 0〜1 に収める。異常値の軸は中央（0.5）へフォールバックする。 */
export function clampMochitAttentionPoint(point: MochitAttentionPoint | null | undefined): MochitAttentionPoint {
  if (!point) return { ...MOCHIT_ATTENTION_CENTER };
  return { x: clampAxis(point.x), y: clampAxis(point.y) };
}

/**
 * 正規化座標 → 瞳のオフセット（master px）。0 → -range / 0.5 → 0 / 1 → +range。
 * 範囲外・異常値は clamp してから変換する。
 */
export function attentionPointToGazeOffset(
  point: MochitAttentionPoint | null | undefined,
  range: { rangeX: number; rangeY: number },
): GazeOffset {
  const p = clampMochitAttentionPoint(point);
  // 小数2桁に丸めて transform 文字列を安定させる（-0 は 0 に正規化）
  const round = (v: number) => Math.round(v * 100) / 100 || 0;
  return {
    x: round((p.x - 0.5) * 2 * range.rangeX),
    y: round((p.y - 0.5) * 2 * range.rangeY),
  };
}

/**
 * 視線の目標。random は Living Idle のランダム視線に任せる。
 * それ以外（Semantic Attention）は正規化座標の1点を見続ける。
 */
export type MochitGazeTarget = { kind: "random" } | { kind: "point"; point: MochitAttentionPoint };

/**
 * attention と attentionPoint から視線の目標を決める。
 *   random          → ランダム視線（従来の Living Idle）
 *   user            → 中央（ユーザー側）。attentionPoint は使わない
 *   content/result  → attentionPoint があればそこ、無ければ中央
 * content/result に固定方向は割り当てない（画面ごとに対象位置が違うため）。
 */
export function resolveMochitGazeTarget(
  attention: MochitAttention,
  attentionPoint?: MochitAttentionPoint | null,
): MochitGazeTarget {
  switch (attention) {
    case "random":
      return { kind: "random" };
    case "content":
    case "result":
      return { kind: "point", point: clampMochitAttentionPoint(attentionPoint) };
    case "user":
    default:
      return { kind: "point", point: { ...MOCHIT_ATTENTION_CENTER } };
  }
}
