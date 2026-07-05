import {
  UNDERSTOOD_STAGES,
  type TopicProgressSummary,
  type TopicStage,
} from "@/types/studyProgress";

// ============================================================================
// トピック別ステージの集計（純粋関数）。
// ----------------------------------------------------------------------------
// /progress のサマリ表示と、次フェーズの IntegratedLearningStatus の両方から
// 再利用できるよう、DB・React に依存しない集計関数として分離している。
// ============================================================================

/**
 * トピックステージの配列から /progress 用サマリを組み立てる。
 * - basicUnderstood : basic_understood 以上（理解済み系）の数
 * - examReady       : 本番対応OK（exam_ready）の数
 * - reviewNeeded / weak / termsStabilizing / examCheckPending : 各ステージの数
 * - risks           : 用語未定着 / 過去問レベル未達 / 苦手滞留 の内訳
 */
export function summarizeTopicStages(
  stages: TopicStage[],
): TopicProgressSummary {
  const understood = new Set<TopicStage>(UNDERSTOOD_STAGES);
  const summary: TopicProgressSummary = {
    basicUnderstood: 0,
    reviewNeeded: 0,
    weak: 0,
    examReady: 0,
    termsStabilizing: 0,
    examCheckPending: 0,
    risks: { termsNotStable: 0, examNotPassed: 0, weakStuck: 0 },
  };

  for (const stage of stages) {
    if (understood.has(stage)) summary.basicUnderstood += 1;
    if (stage === "exam_ready") summary.examReady! += 1;
    else if (stage === "terms_stabilizing") summary.termsStabilizing! += 1;
    else if (stage === "exam_check_pending") summary.examCheckPending! += 1;
    else if (stage === "review_needed") summary.reviewNeeded += 1;
    else if (stage === "weak") summary.weak += 1;
  }

  summary.risks = {
    termsNotStable: summary.termsStabilizing!,
    examNotPassed: summary.examCheckPending!,
    weakStuck: summary.weak,
  };

  return summary;
}
