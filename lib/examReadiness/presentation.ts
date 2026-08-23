import { EXAM_READINESS_CONFIG } from "@/lib/examReadiness/config";
import { getTopic } from "@/lib/content";
import type {
  ConfidenceLevel,
  ExamReadinessResult,
  ReadinessBand,
  ReadinessConfidenceReason,
} from "@/types/examReadiness";

export function readinessBandLabel(band: ReadinessBand): string {
  switch (band) {
    case "measuring":
      return "測定中";
    case "needs_work":
      return "要強化";
    case "approaching":
      return "あと一歩";
    case "ready":
      return "準備良好";
    case "stable":
      return "安定";
  }
}

export function confidenceLevelLabel(level: ConfidenceLevel): string {
  switch (level) {
    case "low":
      return "低";
    case "medium":
      return "中";
    case "high":
      return "高";
  }
}

export function readinessScoreLabel(score: number | null): string {
  return score === null ? "測定中" : `${score}/100`;
}

export function readinessResultLabel(result: ExamReadinessResult): string {
  if (result.score === null) return "測定中";
  return `${readinessScoreLabel(result.score)}（${readinessBandLabel(result.band)}）`;
}

function configuredFieldLabel(fieldId: string | undefined): string {
  if (!fieldId) return "該当分野";
  return EXAM_READINESS_CONFIG.fields.find((field) => field.fieldId === fieldId)?.label
    ?? "該当分野";
}

export function readinessFieldLabel(
  fieldId: string | undefined,
  result?: ExamReadinessResult,
): string {
  return result?.fields.find((field) => field.fieldId === fieldId)?.label
    ?? configuredFieldLabel(fieldId);
}

function topicLabel(
  topicId: string | undefined,
  result: ExamReadinessResult,
): string | null {
  if (!topicId) return null;
  return result.weakTopics.find((topic) => topic.topicId === topicId)?.label
    ?? getTopic(topicId)?.title
    ?? null;
}

export function confidenceReasonLabel(reason: ReadinessConfidenceReason): string {
  switch (reason.code) {
    case "insufficient_evidence":
      return `回答の根拠がまだ不足しています（${reason.actual}/${reason.required}）`;
    case "insufficient_coverage":
      return `評価できた範囲がまだ不足しています（${reason.actual}/${reason.required}）`;
    case "insufficient_field_evidence":
      return `${configuredFieldLabel(reason.fieldId)}の根拠がまだ不足しています（${reason.actual}/${reason.required}）`;
    case "insufficient_summative_sessions":
      return `本番形式テストの完了回数がまだ不足しています（${reason.actual}/${reason.required}回）`;
  }
}

export function primaryImprovementLabel(
  improvement: ExamReadinessResult["primaryImprovement"],
  result: ExamReadinessResult,
): string | null {
  if (!improvement) return null;

  switch (improvement.code) {
    case "collect_more_evidence":
      return "問題に答えて、判定材料を増やしましょう";
    case "improve_field": {
      const label = readinessFieldLabel(improvement.fieldId, result);
      return `「${label}」の問題を優先しましょう`;
    }
    case "review_weak_topic": {
      const label = topicLabel(improvement.topicId, result) ?? "苦手トピック";
      return `「${label}」を復習しましょう`;
    }
    case "improve_retention": {
      const label = topicLabel(improvement.topicId, result);
      return label
        ? `「${label}」の期限の来た復習に取り組みましょう`
        : "期限の来た復習に取り組みましょう";
    }
    case "take_summative_assessment":
      return "本番形式テストを完了しましょう";
  }
}
