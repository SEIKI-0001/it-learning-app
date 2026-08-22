import { EXAM_READINESS_CONFIG } from "@/lib/examReadiness/config";
import {
  dedupeAnswerEvents,
  strongestEvidenceByCanonicalQuestion,
  strongestEvidenceByTopic,
} from "@/lib/examReadiness/evidence";
import {
  freshnessCoefficient,
  retentionOverdueMultiplier,
} from "@/lib/examReadiness/time";
import type {
  AssessmentSession,
  ComponentInput,
  ConfidenceInputs,
  FieldEvidenceResult,
  P0WeakTopicReason,
  ReadinessAnswerEvidence,
  WeakPenaltyResult,
  WeakTopicReason,
} from "@/types/examReadiness";

const RETENTION_VALUE_BY_STAGE: Readonly<Record<number, number>> = {
  2: 50,
  3: 75,
  4: 90,
};

const WEAK_REASON_BY_P0_REASON: Readonly<Record<P0WeakTopicReason, WeakTopicReason>> = {
  low_mastery: "low_mastery",
  repeated_miss: "repeated_incorrect",
  summary_exam_miss: "unresolved_summative_error",
  review_failure: "latest_review_failed",
};

const WEAK_REASON_TIE_PRIORITY: Readonly<Record<WeakTopicReason, number>> = {
  low_mastery: 1,
  repeated_incorrect: 2,
  latest_review_failed: 3,
  unresolved_summative_error: 4,
};

export function computeFirstPerformance(input: ComponentInput): number | null {
  const eligible = eventDeduplicatedAnswers(input).filter(
    (event) => event.firstAttemptState === "first",
  );
  if (eligible.length === 0) return null;

  let weightedCorrect = 0;
  let totalWeight = 0;
  for (const event of eligible) {
    const weight = EXAM_READINESS_CONFIG.coverageEvidenceCoefficients[event.kind]
      * freshnessCoefficient(input.calculationReferenceTime, new Date(event.answeredAt));
    totalWeight += weight;
    if (event.isCorrect) weightedCorrect += weight;
  }

  return totalWeight === 0 ? null : weightedCorrect / totalWeight * 100;
}

export function computeSummativePerformance(input: ComponentInput): number | null {
  const eligible = eligibleSummativeSessions(input.assessmentSessions)
    .sort(compareCompletedSessionDescending)
    .slice(0, 3);
  if (eligible.length === 0) return null;

  const scored = eligible.map((assessment) => {
    const score = assessment.correctCount / assessment.questionCount * 100;
    const firstKnownCount = assessment.firstCount + assessment.seenCount;
    const firstEvidenceCoefficient = firstKnownCount === 0
      ? 0.5
      : 0.5 + 0.5 * (assessment.firstCount / firstKnownCount);
    const weight = assessment.questionCount
      * EXAM_READINESS_CONFIG.sourceTrustCoefficients[assessment.source]
      * firstEvidenceCoefficient
      * freshnessCoefficient(
        input.calculationReferenceTime,
        new Date(assessment.completedAt as string),
      );
    return { score, weight };
  });
  const totalWeight = scored.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return null;

  const weightedMean = scored.reduce(
    (sum, item) => sum + item.score * item.weight,
    0,
  ) / totalWeight;
  const minimum = Math.min(...scored.map((item) => item.score));
  return 0.7 * weightedMean + 0.3 * minimum;
}

export function computeTopicMastery(input: ComponentInput): number | null {
  let weightedMastery = 0;
  let evaluatedImportance = 0;

  for (const topic of input.topics) {
    const stats = input.masteryByTopic[topic.topicId];
    if (stats === undefined || !stats.lastEvaluatedAt) continue;
    weightedMastery += stats.masteryScore * topic.importance;
    evaluatedImportance += topic.importance;
  }

  return evaluatedImportance === 0 ? null : weightedMastery / evaluatedImportance;
}

export function computeRetention(input: ComponentInput): number | null {
  const latestByTopic = new Map<string, ComponentInput["reviewOutcomes"][number]>();
  for (const outcome of input.reviewOutcomes) {
    if (!outcome.wasDue || (outcome.isCorrect && outcome.stage < 2)) continue;
    const current = latestByTopic.get(outcome.topicId);
    if (current === undefined || compareIsoTime(outcome.completedAt, current.completedAt) > 0) {
      latestByTopic.set(outcome.topicId, outcome);
    }
  }

  let weightedRetention = 0;
  let eligibleImportance = 0;
  for (const topic of input.topics) {
    const outcome = latestByTopic.get(topic.topicId);
    if (outcome === undefined) continue;
    const baseValue = outcome.isCorrect
      ? (RETENTION_VALUE_BY_STAGE[outcome.stage] ?? (outcome.stage >= 5 ? 100 : 0))
      : 0;
    const overdueMultiplier = retentionOverdueMultiplier({
      referenceTime: input.calculationReferenceTime,
      dueAt: new Date(outcome.dueAt),
      scheduledIntervalDays: outcome.scheduledIntervalDays,
    });
    weightedRetention += baseValue * overdueMultiplier * topic.importance;
    eligibleImportance += topic.importance;
  }

  return eligibleImportance === 0 ? null : weightedRetention / eligibleImportance;
}

export function computeAssessmentCoverage(input: ComponentInput): number {
  const totalImportance = input.topics.reduce((sum, topic) => sum + topic.importance, 0);
  if (totalImportance === 0) return 0;

  const strongestByTopic = strongestEvidenceByTopic(
    eventDeduplicatedAnswers(input),
    input.calculationReferenceTime,
  );
  const weightedStrength = input.topics.reduce(
    (sum, topic) => sum + topic.importance * (strongestByTopic.get(topic.topicId)?.strength ?? 0),
    0,
  );
  return weightedStrength / totalImportance * 100;
}

export function computeFieldEvidence(input: ComponentInput): FieldEvidenceResult[] {
  const deduplicated = eventDeduplicatedAnswers(input);
  const strongestQuestions = strongestEvidenceByCanonicalQuestion(
    deduplicated,
    input.calculationReferenceTime,
  );
  const evaluatedTopicIds = new Set(
    strongestEvidenceByTopic(deduplicated, input.calculationReferenceTime).keys(),
  );
  const targetEvidenceUnits = EXAM_READINESS_CONFIG.shortageThresholds.weightedEvidenceUnits;

  return EXAM_READINESS_CONFIG.fields.map((field) => {
    let weightedEvidenceUnits = 0;
    for (const strongest of strongestQuestions.values()) {
      if (evidenceFieldId(strongest.event) === field.fieldId) {
        weightedEvidenceUnits += strongest.strength;
      }
    }

    const fieldTopics = input.topics.filter((topic) => topic.fieldId === field.fieldId);
    const allTopicImportance = fieldTopics.reduce((sum, topic) => sum + topic.importance, 0);
    const evaluatedTopicImportance = fieldTopics.reduce(
      (sum, topic) => sum + (evaluatedTopicIds.has(topic.topicId) ? topic.importance : 0),
      0,
    );
    const fieldTargetEvidenceUnits = targetEvidenceUnits * field.scoredQuestionRatio;
    const evidenceVolume = Math.min(
      100,
      weightedEvidenceUnits / fieldTargetEvidenceUnits * 100,
    );
    const assessmentCoverage = allTopicImportance === 0
      ? 0
      : evaluatedTopicImportance / allTopicImportance * 100;

    return {
      fieldId: field.fieldId,
      weightedEvidenceUnits,
      targetEvidenceUnits: fieldTargetEvidenceUnits,
      evidenceVolume,
      assessmentCoverage,
      evidenceSufficiency: Math.min(evidenceVolume, assessmentCoverage),
    };
  });
}

export function computeWeakTopics(input: ComponentInput): WeakPenaltyResult {
  const reasonsByTopic = new Map<string, Set<WeakTopicReason>>();
  const addReason = (topicId: string, reason: WeakTopicReason) => {
    const reasons = reasonsByTopic.get(topicId) ?? new Set<WeakTopicReason>();
    reasons.add(reason);
    reasonsByTopic.set(topicId, reasons);
  };

  for (const signal of input.weakTopicSignals ?? []) {
    addReason(signal.topicId, WEAK_REASON_BY_P0_REASON[signal.reason]);
  }
  for (const topic of input.topics) {
    const stats = input.masteryByTopic[topic.topicId];
    if (stats?.lastEvaluatedAt && stats.masteryScore < 60) {
      addReason(topic.topicId, "low_mastery");
    }
  }
  addTimeSeriesWeakReasons(input, addReason);

  const topics = input.topics.flatMap((topic) => {
    const reasons = reasonsByTopic.get(topic.topicId);
    if (reasons === undefined || reasons.size === 0) return [];
    const reason = [...reasons].sort(compareWeakReasons)[0];
    const penalty = topic.importance / 3
      * EXAM_READINESS_CONFIG.weakTopic.reasonCoefficients[reason];
    return [{
      topicId: topic.topicId,
      label: topic.label,
      importance: topic.importance,
      reason,
      penalty,
      penaltyApplied: false,
    }];
  }).sort((left, right) =>
    right.penalty - left.penalty
    || right.importance - left.importance
    || left.topicId.localeCompare(right.topicId)
  );

  for (let index = 0; index < topics.length; index += 1) {
    topics[index] = {
      ...topics[index],
      penaltyApplied: index < EXAM_READINESS_CONFIG.weakTopic.maximumTopicCount,
    };
  }
  const appliedPenalty = topics.reduce(
    (sum, topic) => sum + (topic.penaltyApplied ? topic.penalty : 0),
    0,
  );

  return {
    topics,
    penalty: Math.min(EXAM_READINESS_CONFIG.weakTopic.maximumPenalty, appliedPenalty),
  };
}

export function computeConfidenceInputs(input: ComponentInput): ConfidenceInputs {
  const strongestQuestions = strongestEvidenceByCanonicalQuestion(
    eventDeduplicatedAnswers(input),
    input.calculationReferenceTime,
  );
  const weightedEvidenceUnits = [...strongestQuestions.values()].reduce(
    (sum, strongest) => sum + strongest.strength,
    0,
  );
  const targetEvidenceUnits = EXAM_READINESS_CONFIG.shortageThresholds.weightedEvidenceUnits;
  const fieldEvidence = computeFieldEvidence(input);
  const eligibleSessions = eligibleSummativeSessions(input.assessmentSessions);

  return {
    uniqueQuestionCount: strongestQuestions.size,
    weightedEvidenceUnits,
    evidenceVolume: Math.min(100, weightedEvidenceUnits / targetEvidenceUnits * 100),
    assessmentCoverage: computeAssessmentCoverage(input),
    fieldEvidence,
    threeFieldEvidenceSufficiency: fieldEvidence.length === 0
      ? 0
      : Math.min(...fieldEvidence.map((field) => field.evidenceSufficiency)),
    completedEligibleSummativeSessionCount: eligibleSessions.length,
    summativeSessionIds: eligibleSessions.map((assessment) => assessment.sessionId),
    summativeSessionSufficiency: Math.min(
      100,
      eligibleSessions.length
        / EXAM_READINESS_CONFIG.shortageThresholds.summativeSessionCount
        * 100,
    ),
  };
}

function eventDeduplicatedAnswers(input: ComponentInput): ReadinessAnswerEvidence[] {
  return dedupeAnswerEvents([...input.answers]);
}

function eligibleSummativeSessions(sessions: AssessmentSession[]): AssessmentSession[] {
  return sessions.filter((assessment) =>
    assessment.status === "completed"
    && assessment.completedAt !== null
    && assessment.questionCount > 0
    && (
      assessment.source === "summary"
      || assessment.source === "mock"
      || (assessment.source === "official_past" && assessment.mode === "exam")
    )
  );
}

function compareCompletedSessionDescending(left: AssessmentSession, right: AssessmentSession): number {
  return compareIsoTime(right.completedAt as string, left.completedAt as string)
    || left.sessionId.localeCompare(right.sessionId);
}

function compareIsoTime(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime();
}

function evidenceFieldId(event: ReadinessAnswerEvidence): string {
  if (event.kind === "official_past" && event.officialExamFieldId !== undefined) {
    return event.officialExamFieldId;
  }
  return event.fieldId;
}

function compareWeakReasons(left: WeakTopicReason, right: WeakTopicReason): number {
  const coefficients = EXAM_READINESS_CONFIG.weakTopic.reasonCoefficients;
  return coefficients[right] - coefficients[left]
    || WEAK_REASON_TIE_PRIORITY[right] - WEAK_REASON_TIE_PRIORITY[left];
}

function addTimeSeriesWeakReasons(
  input: ComponentInput,
  addReason: (topicId: string, reason: WeakTopicReason) => void,
): void {
  const answersByTopic = new Map<string, ReadinessAnswerEvidence[]>();
  for (const event of eventDeduplicatedAnswers(input)) {
    const history = answersByTopic.get(event.topicId) ?? [];
    history.push(event);
    answersByTopic.set(event.topicId, history);
  }

  for (const [topicId, history] of answersByTopic) {
    history.sort((left, right) =>
      compareIsoTime(left.answeredAt, right.answeredAt)
      || left.idempotencyKey.localeCompare(right.idempotencyKey)
    );
    if (history.length >= 2 && history.slice(-2).every((event) => !event.isCorrect)) {
      addReason(topicId, "repeated_incorrect");
    }
    const latestSummativeMissIndex = history.findLastIndex(
      (event) => isSummativeKind(event.kind) && !event.isCorrect,
    );
    if (
      latestSummativeMissIndex >= 0
      && !history.slice(latestSummativeMissIndex + 1).some(
        (event) => event.kind === "review" && event.isCorrect,
      )
    ) {
      addReason(topicId, "unresolved_summative_error");
    }
  }

  const latestReviewByTopic = new Map<string, ComponentInput["reviewOutcomes"][number]>();
  for (const outcome of input.reviewOutcomes) {
    if (!outcome.wasDue) continue;
    const current = latestReviewByTopic.get(outcome.topicId);
    if (current === undefined || compareIsoTime(outcome.completedAt, current.completedAt) > 0) {
      latestReviewByTopic.set(outcome.topicId, outcome);
    }
  }
  for (const outcome of latestReviewByTopic.values()) {
    if (!outcome.isCorrect) addReason(outcome.topicId, "latest_review_failed");
  }
}

function isSummativeKind(kind: ReadinessAnswerEvidence["kind"]): boolean {
  return kind === "summary" || kind === "mock" || kind === "official_past";
}
