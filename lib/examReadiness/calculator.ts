import {
  computeAssessmentCoverage,
  computeConfidenceInputs,
  computeFirstPerformance,
  computeRetention,
  computeSummativePerformance,
  computeTopicMastery,
  computeWeakTopics,
  scopeComponentInputsToField,
} from "@/lib/examReadiness/components";
import {
  EXAM_READINESS_CONFIG,
  EXAM_READINESS_MODEL_VERSION,
  EXAM_SCHEME_VERSION,
} from "@/lib/examReadiness/config";
import {
  selectPrimaryImprovement,
  type PerTopicRetention,
} from "@/lib/examReadiness/primaryImprovement";
import { nextTimeBoundary, snapshotDateInTokyo } from "@/lib/examReadiness/time";
import type {
  AppliedReadinessCap,
  ComponentInput,
  ExamReadinessResult,
  ReadinessBand,
  ReadinessComponents,
  ReadinessConfidenceReason,
  ReadinessFieldScore,
} from "@/types/examReadiness";

type PerformanceComponentName = Exclude<keyof ReadinessComponents, "assessmentCoverage">;

export type ExamReadinessEvidenceBundle = Omit<ComponentInput, "calculationReferenceTime"> & {
  evidenceRevision: number;
};

export type ExamReadinessDraft = Omit<
  ExamReadinessResult,
  "calculatedAt" | "snapshotDate"
>;

const PERFORMANCE_COMPONENT_NAMES: PerformanceComponentName[] = [
  "firstPerformance",
  "summativePerformance",
  "topicMastery",
  "retention",
];

export function calculateExamReadinessDraft(args: {
  evidence: ExamReadinessEvidenceBundle;
  calculationReferenceTime: Date;
  modelVersion?: string;
  examSchemeVersion?: string;
}): ExamReadinessDraft {
  const input = componentInput(args.evidence, args.calculationReferenceTime);
  const components = calculateComponents(input);
  const hasPerformance = hasMeasuredPerformance(components);
  const computedWeak = computeWeakTopics(input);
  const weakTopics = hasPerformance
    ? computedWeak.topics
    : computedWeak.topics.map((topic) => ({ ...topic, penaltyApplied: false }));
  const weakTopicPenalty = hasPerformance ? computedWeak.penalty : 0;
  const baseScore = hasPerformance ? normalizedScore(components) : null;
  const preGateScore = baseScore === null ? null : Math.max(0, baseScore - weakTopicPenalty);

  const confidenceInputs = computeConfidenceInputs(input);
  const fields = calculateFields(input, confidenceInputs.fieldEvidence);
  const confidence = calculateConfidence(confidenceInputs, fields);
  const appliedCaps = fieldCaps(fields);
  if (preGateScore !== null && confidence.level === "low") {
    appliedCaps.push({
      type: "confidence",
      cap: EXAM_READINESS_CONFIG.confidenceScoreCap,
      reasonCode: "low_confidence",
    });
  }
  const score = preGateScore === null
    ? null
    : Math.round(Math.min(preGateScore, ...appliedCaps.map((cap) => cap.cap)));
  const band = readinessBand(score, confidence.level);
  const boundary = nextTimeBoundary({
    calculationReferenceTime: args.calculationReferenceTime,
    evidenceTimes: input.answers.map((answer) => new Date(answer.answeredAt)),
    reviews: input.reviewOutcomes.map((review) => ({
      dueAt: new Date(review.dueAt),
      scheduledIntervalDays: review.scheduledIntervalDays,
    })),
  });

  const resultWithoutPrimary: Omit<ExamReadinessDraft, "primaryImprovement"> = {
    score,
    band,
    confidence,
    fields,
    components,
    calculation: {
      baseScore,
      weakTopicPenalty,
      preGateScore,
      appliedCaps,
    },
    evidence: {
      uniqueQuestionCount: confidenceInputs.uniqueQuestionCount,
      weightedEvidenceUnits: confidenceInputs.weightedEvidenceUnits,
      summativeSessionCount: confidenceInputs.completedEligibleSummativeSessionCount,
      summativeSessionIds: confidenceInputs.summativeSessionIds,
      evidenceRevision: args.evidence.evidenceRevision,
    },
    weakTopics,
    modelVersion: args.modelVersion ?? EXAM_READINESS_MODEL_VERSION,
    examSchemeVersion: args.examSchemeVersion ?? EXAM_SCHEME_VERSION,
    calculationReferenceTime: args.calculationReferenceTime.toISOString(),
    validUntil: boundary?.toISOString() ?? null,
  };

  return {
    ...resultWithoutPrimary,
    primaryImprovement: selectPrimaryImprovement({
      resultWithoutPrimary,
      perTopicRetention: calculatePerTopicRetention(input),
    }),
  };
}

export function finalizeExamReadinessResult(
  draft: ExamReadinessDraft,
  calculatedAt: Date,
): ExamReadinessResult {
  return {
    ...draft,
    calculatedAt: calculatedAt.toISOString(),
    snapshotDate: snapshotDateInTokyo(calculatedAt),
  };
}

function componentInput(
  evidence: ExamReadinessEvidenceBundle,
  calculationReferenceTime: Date,
): ComponentInput {
  return {
    calculationReferenceTime,
    topics: evidence.topics,
    answers: evidence.answers,
    assessmentSessions: evidence.assessmentSessions,
    masteryByTopic: evidence.masteryByTopic,
    reviewOutcomes: evidence.reviewOutcomes,
    weakTopicSignals: evidence.weakTopicSignals,
  };
}

function calculateComponents(input: ComponentInput): ReadinessComponents {
  return {
    firstPerformance: computeFirstPerformance(input),
    summativePerformance: computeSummativePerformance(input),
    topicMastery: computeTopicMastery(input),
    retention: computeRetention(input),
    assessmentCoverage: computeAssessmentCoverage(input),
  };
}

function hasMeasuredPerformance(components: ReadinessComponents): boolean {
  return PERFORMANCE_COMPONENT_NAMES.some((name) => components[name] !== null);
}

function normalizedScore(components: ReadinessComponents): number {
  let weightedScore = 0;
  let availableWeight = 0;
  for (const [name, weight] of Object.entries(EXAM_READINESS_CONFIG.componentWeights) as Array<
    [keyof ReadinessComponents, number]
  >) {
    const value = components[name];
    if (value === null) continue;
    weightedScore += value * weight;
    availableWeight += weight;
  }
  return weightedScore / availableWeight;
}

function calculateFields(
  input: ComponentInput,
  fieldEvidence: ReturnType<typeof computeConfidenceInputs>["fieldEvidence"],
): ReadinessFieldScore[] {
  return EXAM_READINESS_CONFIG.fields.map((field) => {
    const fieldInputs = scopeComponentInputsToField(input, field.fieldId);
    const components: ReadinessComponents = {
      firstPerformance: computeFirstPerformance(fieldInputs.firstPerformanceInput),
      summativePerformance: null,
      topicMastery: computeTopicMastery(fieldInputs.topicInput),
      retention: computeRetention(fieldInputs.topicInput),
      assessmentCoverage: computeAssessmentCoverage(fieldInputs.topicInput),
    };
    const score = hasMeasuredPerformance(components)
      ? Math.round(normalizedScore(components))
      : null;
    const rawEvidenceSufficiency = fieldEvidence.find(
      (evidence) => evidence.fieldId === field.fieldId,
    )?.evidenceSufficiency ?? 0;
    const evidenceSufficiency = Math.round(rawEvidenceSufficiency);
    const evaluated = evidenceSufficiency >= 40 && score !== null;
    const cap = !evaluated || score === null
      ? null
      : score < 40
      ? EXAM_READINESS_CONFIG.fieldScoreCaps.below40
      : score < 60
      ? EXAM_READINESS_CONFIG.fieldScoreCaps.from40Through59
      : null;

    return {
      fieldId: field.fieldId,
      label: field.label,
      score,
      evidenceSufficiency,
      scoreGate: {
        evaluated,
        cap,
        reasonCode: cap === EXAM_READINESS_CONFIG.fieldScoreCaps.below40
          ? "field_score_below_40"
          : cap === EXAM_READINESS_CONFIG.fieldScoreCaps.from40Through59
          ? "field_score_below_60"
          : null,
      },
    };
  });
}

function calculateConfidence(
  inputs: ReturnType<typeof computeConfidenceInputs>,
  fields: ReadinessFieldScore[],
): ExamReadinessDraft["confidence"] {
  const weights = EXAM_READINESS_CONFIG.confidenceWeights;
  const rawScore = weights.evidenceVolume * inputs.evidenceVolume
    + weights.assessmentCoverage * inputs.assessmentCoverage
    + weights.threeFieldEvidenceSufficiency * inputs.threeFieldEvidenceSufficiency
    + weights.summativeSessionSufficiency * inputs.summativeSessionSufficiency;
  const minimumFieldSufficiency = Math.min(...fields.map((field) => field.evidenceSufficiency));
  const fieldCap = minimumFieldSufficiency < 40
    ? EXAM_READINESS_CONFIG.fieldEvidenceConfidenceCaps.below40
    : minimumFieldSufficiency < 60
    ? EXAM_READINESS_CONFIG.fieldEvidenceConfidenceCaps.from40Through59
    : Number.POSITIVE_INFINITY;
  const score = Math.round(Math.min(rawScore, fieldCap));

  return {
    score,
    level: score < 60 ? "low" : score < 80 ? "medium" : "high",
    reasons: confidenceReasons(inputs, fields),
  };
}

function confidenceReasons(
  inputs: ReturnType<typeof computeConfidenceInputs>,
  fields: ReadinessFieldScore[],
): ReadinessConfidenceReason[] {
  const thresholds = EXAM_READINESS_CONFIG.shortageThresholds;
  const reasons: ReadinessConfidenceReason[] = fields
    .filter((field) => field.evidenceSufficiency < thresholds.fieldEvidenceSufficiency)
    .map((field) => ({
      code: "insufficient_field_evidence",
      fieldId: field.fieldId,
      actual: field.evidenceSufficiency,
      required: thresholds.fieldEvidenceSufficiency,
    }));
  if (inputs.assessmentCoverage < thresholds.assessmentCoverage) {
    reasons.push({
      code: "insufficient_coverage",
      actual: inputs.assessmentCoverage,
      required: thresholds.assessmentCoverage,
    });
  }
  if (inputs.weightedEvidenceUnits < thresholds.weightedEvidenceUnits) {
    reasons.push({
      code: "insufficient_evidence",
      actual: inputs.weightedEvidenceUnits,
      required: thresholds.weightedEvidenceUnits,
    });
  }
  if (inputs.completedEligibleSummativeSessionCount < thresholds.summativeSessionCount) {
    reasons.push({
      code: "insufficient_summative_sessions",
      actual: inputs.completedEligibleSummativeSessionCount,
      required: thresholds.summativeSessionCount,
    });
  }
  return reasons;
}

function fieldCaps(fields: ReadinessFieldScore[]): AppliedReadinessCap[] {
  return fields.flatMap((field) => field.scoreGate.cap === null ? [] : [{
    type: "field" as const,
    cap: field.scoreGate.cap,
    reasonCode: field.scoreGate.reasonCode as string,
    fieldId: field.fieldId,
  }]);
}

function readinessBand(
  score: number | null,
  confidenceLevel: ExamReadinessDraft["confidence"]["level"],
): ReadinessBand {
  if (score === null || confidenceLevel === "low") return "measuring";
  if (score >= 85 && confidenceLevel === "high") return "stable";
  if (score >= 75) return "ready";
  if (score >= 60) return "approaching";
  return "needs_work";
}

function calculatePerTopicRetention(input: ComponentInput): PerTopicRetention[] {
  return input.topics.flatMap((topic) => {
    const retention = computeRetention({
      ...input,
      topics: [topic],
      reviewOutcomes: input.reviewOutcomes.filter((outcome) => outcome.topicId === topic.topicId),
    });
    return retention === null ? [] : [{ topicId: topic.topicId, retention, importance: topic.importance }];
  });
}
