import { EXAM_READINESS_CONFIG } from "@/lib/examReadiness/config";
import type { ExamReadinessDraft } from "@/lib/examReadiness/calculator";
import type { ExamReadinessResult } from "@/types/examReadiness";

export type PerTopicRetention = {
  topicId: string;
  retention: number;
  importance: number;
};

export function selectPrimaryImprovement(args: {
  resultWithoutPrimary: Omit<ExamReadinessDraft, "primaryImprovement">;
  perTopicRetention: PerTopicRetention[];
}): ExamReadinessResult["primaryImprovement"] {
  const result = args.resultWithoutPrimary;
  if (result.score === null) return { code: "collect_more_evidence" };

  if (result.confidence.level === "low") {
    const substantiveShortage = result.confidence.reasons.some((reason) =>
      reason.code === "insufficient_evidence"
      || reason.code === "insufficient_coverage"
      || reason.code === "insufficient_field_evidence"
    );
    if (substantiveShortage) return { code: "collect_more_evidence" };
    return { code: "take_summative_assessment" };
  }

  const cappedFields = result.fields
    .filter((field) => field.scoreGate.evaluated && field.scoreGate.cap !== null)
    .sort((left, right) =>
      (left.scoreGate.cap as number) - (right.scoreGate.cap as number)
      || (left.score ?? Number.POSITIVE_INFINITY) - (right.score ?? Number.POSITIVE_INFINITY)
      || fieldOrder(left.fieldId) - fieldOrder(right.fieldId)
    );
  if (cappedFields.length > 0) {
    return { code: "improve_field", fieldId: cappedFields[0].fieldId };
  }

  const weakTopic = result.weakTopics
    .filter((topic) => topic.penaltyApplied)
    .sort((left, right) =>
      right.penalty - left.penalty
      || right.importance - left.importance
      || left.topicId.localeCompare(right.topicId)
    )[0];
  if (weakTopic !== undefined) {
    return { code: "review_weak_topic", topicId: weakTopic.topicId };
  }

  if (result.components.retention !== null && result.components.retention < 75) {
    const retentionTopic = [...args.perTopicRetention].sort((left, right) =>
      left.retention - right.retention
      || right.importance - left.importance
      || left.topicId.localeCompare(right.topicId)
    )[0];
    return retentionTopic === undefined
      ? { code: "improve_retention" }
      : { code: "improve_retention", topicId: retentionTopic.topicId };
  }

  if (
    result.evidence.summativeSessionCount
    < EXAM_READINESS_CONFIG.shortageThresholds.summativeSessionCount
  ) {
    return { code: "take_summative_assessment" };
  }

  return null;
}

function fieldOrder(fieldId: string): number {
  const index = EXAM_READINESS_CONFIG.fields.findIndex((field) => field.fieldId === fieldId);
  return index < 0 ? Number.POSITIVE_INFINITY : index;
}
