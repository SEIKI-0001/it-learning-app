// 公式過去問を「始めてよいか」の唯一の判定（Single Source of Truth）。
//
// これまで判定が2か所にあった:
//   - lib/studyPlanner の isKakomonReady() … 学習計画（/plan・フェーズ推定）用
//   - CP5「過去問実戦」（旧称: 過去問準備）という CP の位置づけ … Today / CP 導線用
// 別々に増築すると「計画では過去問OK、Today では出ない」のような矛盾が起きるので、
// 開始可否はここだけで決め、学習計画・Today・CP 導線はすべてこの結果を参照する。
//
// 方針:
//   - 基本ルートは CP5（過去問実戦）から公式過去問を始める。
//   - ただし CP5 まで完全ロックはしない。試験日が近い人・十分な実力がある人は
//     CP3〜4 でも前倒しで解禁する（条件は旧 isKakomonReady の3条件をそのまま使う）。
//   - CP1〜2 は、たとえ数値条件を満たしても前倒ししない（全体像・基礎理解の段階で
//     本番問題を強制しない）。
//   - CP の進行状況が分からない旧データ（checkpointProgress 未保存）は、従来どおり
//     数値条件だけで判定する（既存ユーザーの計画表示を変えないため）。
//
// CP の突破条件（バッジ・突破試験）には一切関与しない。ここが決めるのは
// 「公式過去問の演習を学習導線に出してよいか」だけ。

import type { UserProgress } from "@/types";

/** 公式過去問を出してよい理由。 */
export type KakomonAccessReason =
  /** CP5 以降（基本ルート）。 */
  | "checkpoint"
  /** 試験日が近く、主要テーマにひと通り触れている（前倒し）。 */
  | "exam_near"
  /** 学習が十分進んでいる／直近の正答率が高い（前倒し）。 */
  | "strong_progress"
  /** まだ解禁しない。 */
  | "locked";

export type KakomonAccess = {
  unlocked: boolean;
  reason: KakomonAccessReason;
  /** 基本ルートか前倒しか（表示・分析用）。 */
  route: "standard" | "early" | "locked";
};

export type KakomonAccessInput = {
  /** 現在の CP 番号（cp5 → 5）。不明なら null。 */
  checkpointOrder: number | null;
  /** 完了トピック数 / 全トピック数（0〜1）。 */
  completedRatio: number;
  /** 直近の正答率（0〜1）。回答が無ければ null。 */
  recentAccuracy: number | null;
  /** 試験日までの残り日数。未設定なら null。 */
  daysRemaining: number | null;
};

/** 基本ルートで公式過去問を始める CP。 */
export const KAKOMON_STANDARD_CHECKPOINT = 5;
/** 前倒し解禁を検討してよい最初の CP（CP3〜4 後半）。 */
export const KAKOMON_EARLY_MIN_CHECKPOINT = 3;

/** 前倒し解禁の数値条件（旧 isKakomonReady と同じ値。変えるときはここだけ）。 */
export const KAKOMON_EARLY_RULE = {
  /** 主要テーマを一定数完了。 */
  completedRatio: 0.5,
  /** 試験が近い（日数）かつ、ある程度進んでいる（完了率）。 */
  examNearDays: 14,
  examNearCompletedRatio: 0.25,
  /** 直近の正答率が高く、ある程度進んでいる。 */
  accuracy: 0.7,
  accuracyCompletedRatio: 0.35,
} as const;

function earlyReason(input: KakomonAccessInput): KakomonAccessReason | null {
  const rule = KAKOMON_EARLY_RULE;
  if (
    input.daysRemaining !== null &&
    input.daysRemaining <= rule.examNearDays &&
    input.completedRatio >= rule.examNearCompletedRatio
  ) {
    return "exam_near";
  }
  if (input.completedRatio >= rule.completedRatio) return "strong_progress";
  if (
    input.recentAccuracy !== null &&
    input.recentAccuracy >= rule.accuracy &&
    input.completedRatio >= rule.accuracyCompletedRatio
  ) {
    return "strong_progress";
  }
  return null;
}

/** 公式過去問を始めてよいか。 */
export function evaluateKakomonAccess(input: KakomonAccessInput): KakomonAccess {
  const order = input.checkpointOrder;
  if (order !== null && order >= KAKOMON_STANDARD_CHECKPOINT) {
    return { unlocked: true, reason: "checkpoint", route: "standard" };
  }
  if (order !== null && order < KAKOMON_EARLY_MIN_CHECKPOINT) {
    return { unlocked: false, reason: "locked", route: "locked" };
  }
  const early = earlyReason(input);
  return early
    ? { unlocked: true, reason: early, route: "early" }
    : { unlocked: false, reason: "locked", route: "locked" };
}

/** 保存済みの CP 進行から CP 番号を得る（未保存・不正なら null）。 */
export function checkpointOrderOf(progress: UserProgress): number | null {
  const id = progress.checkpointProgress?.currentCheckpointId;
  if (!id) return null;
  const match = /^cp(\d)$/.exec(id);
  return match ? Number(match[1]) : null;
}
