import type { Topic } from "@/types/content";
import type { UserProgress } from "@/types";
import type { UserAnswer } from "@/types";
import { masteryForTopic } from "@/lib/mastery";

// ============================================================================
// 学習進捗サマリ（ローカル集計）
// ----------------------------------------------------------------------------
// 役割:
//   AppState（localStorage）だけで計算できる軽量な進捗サマリ。
//   Exam Readiness とは別の「学習活動がどれだけ進んだか」だけを表す。
//   合格準備度の表示や判定には使わない。
//
// 設計の約束:
//   - 純粋関数（副作用なし）。studyPlanner.ts の重い計算に依存させない
//     （/topics や LINE Bot から軽量に呼べるようにするため）。
//   - onTrack（間に合い度）はここでは扱わない。試験日・学習時間ベースの別軸なので
//     studyPlanner.ts の computeOnTrack をそのまま使う。
// ============================================================================

export type ProgressSummary = {
  completedCount: number; // 完了トピック数（素の件数）
  totalCount: number; // 全トピック数
  completedRatio: number; // 0〜1: 完了トピック / 全トピック
  avgMasteryRatio: number; // 0〜1: 全トピックの平均習熟度/100（未着手は0）
  learningProgressPct: number; // 0〜100: 学習進捗 = round(50*完了率 + 50*平均習熟度)
};

/**
 * 全体の学習到達度を算出する。
 * learningProgressPct は「完了率」と「習熟度」の折衷（各50%）とし、
 * 「1回だけ合格点で完了したトピック」と「何度も復習して習熟したトピック」を
 * 区別できるようにする（完了率のみの旧指標より進捗の実態を表す）。
 */
export function computeProgressSummary(
  topics: Topic[],
  progress: UserProgress,
  answers: UserAnswer[] = [],
  now: Date = new Date(),
): ProgressSummary {
  const totalCount = topics.length;
  const completedCount = progress.completedTopics.length;

  if (totalCount === 0) {
    return {
      completedCount,
      totalCount: 0,
      completedRatio: 0,
      avgMasteryRatio: 0,
      learningProgressPct: 0,
    };
  }

  const completedRatio = completedCount / totalCount;

  const masterySum = topics.reduce(
    (s, t) => s + masteryForTopic(progress, answers, t.id, now),
    0,
  );
  const avgMasteryRatio = masterySum / (totalCount * 100);

  const learningProgressPct = Math.round(
    50 * completedRatio + 50 * avgMasteryRatio,
  );

  return {
    completedCount,
    totalCount,
    completedRatio,
    avgMasteryRatio,
    learningProgressPct,
  };
}
