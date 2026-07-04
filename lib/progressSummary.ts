import type { Topic } from "@/types/content";
import type { UserProgress } from "@/types";

// ============================================================================
// 進捗サマリ（統一指標）
// ----------------------------------------------------------------------------
// 役割:
//   「全体の学習到達度%」を1つの計算式に統一する。ホーム・/progress・/topics・
//   LINE Bot がそれぞれ別々に完了率を計算していたため数値が食い違っていた。
//   ここを唯一の算出元とし、各画面はこの関数の結果を表示するだけにする。
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
  masteredRatio: number; // 0〜1: 習熟度>=70 のトピック割合
  avgMasteryRatio: number; // 0〜1: 全トピックの平均習熟度/100（未着手は0）
  readinessPct: number; // 0〜100: 統一到達度 = round(50*完了率 + 50*平均習熟度)
};

/**
 * 全体の学習到達度を算出する。
 * readinessPct は「完了率」と「習熟度」の折衷（各50%）とし、
 * 「1回だけ合格点で完了したトピック」と「何度も復習して習熟したトピック」を
 * 区別できるようにする（完了率のみの旧指標より進捗の実態を表す）。
 */
export function computeProgressSummary(
  topics: Topic[],
  progress: UserProgress,
): ProgressSummary {
  const totalCount = topics.length;
  const completedCount = progress.completedTopics.length;

  if (totalCount === 0) {
    return {
      completedCount,
      totalCount: 0,
      completedRatio: 0,
      masteredRatio: 0,
      avgMasteryRatio: 0,
      readinessPct: 0,
    };
  }

  const completedRatio = completedCount / totalCount;

  const masteredCount = topics.filter(
    (t) => (progress.topicMastery[t.id] ?? 0) >= 70,
  ).length;
  const masteredRatio = masteredCount / totalCount;

  const masterySum = topics.reduce(
    (s, t) => s + (progress.topicMastery[t.id] ?? 0),
    0,
  );
  const avgMasteryRatio = masterySum / (totalCount * 100);

  const readinessPct = Math.round(
    50 * completedRatio + 50 * avgMasteryRatio,
  );

  return {
    completedCount,
    totalCount,
    completedRatio,
    masteredRatio,
    avgMasteryRatio,
    readinessPct,
  };
}
