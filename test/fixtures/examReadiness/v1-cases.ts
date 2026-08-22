import type { TopicMasteryStats } from "@/types";
import type {
  AssessmentSession,
  ReadinessAnswerEvidence,
  ReadinessReviewOutcome,
  ReadinessTopic,
  ReadinessWeakTopicSignal,
} from "@/types/examReadiness";

export const REFERENCE_TIME = new Date("2026-08-22T00:00:00.000Z");

export type ReadinessFixtureEvidence = {
  evidenceRevision: number;
  topics: ReadinessTopic[];
  answers: ReadinessAnswerEvidence[];
  assessmentSessions: AssessmentSession[];
  masteryByTopic: Readonly<Record<string, TopicMasteryStats>>;
  reviewOutcomes: ReadinessReviewOutcome[];
  weakTopicSignals?: ReadinessWeakTopicSignal[];
};

export function makeTopic(overrides: Partial<ReadinessTopic> = {}): ReadinessTopic {
  return {
    topicId: "technology-topic",
    fieldId: "technology",
    label: "Technology topic",
    importance: 3,
    ...overrides,
  };
}

export function makeAnswer(
  index: number,
  overrides: Partial<ReadinessAnswerEvidence> = {},
): ReadinessAnswerEvidence {
  return {
    answerId: `answer-${index}`,
    idempotencyKey: `event-${index}`,
    sessionId: null,
    canonicalQuestionId: `question-${index}`,
    topicId: "technology-topic",
    fieldId: "technology",
    officialExamFieldId: "technology",
    kind: "official_past",
    isCorrect: true,
    firstAttemptState: "seen",
    answeredAt: REFERENCE_TIME.toISOString(),
    ...overrides,
  };
}

export function makeSession(
  index: number,
  overrides: Partial<AssessmentSession> = {},
): AssessmentSession {
  return {
    sessionId: `session-${index}`,
    userId: "user-1",
    source: "mock",
    mode: "exam",
    status: "completed",
    startedAt: `2026-08-${18 + index}T00:00:00.000Z`,
    completedAt: `2026-08-${19 + index}T00:00:00.000Z`,
    questionCount: 100,
    answeredCount: 100,
    correctCount: 100,
    firstCount: 100,
    seenCount: 0,
    unknownCount: 0,
    ...overrides,
  };
}

export function makeMastery(
  topicId: string,
  masteryScore: number,
): TopicMasteryStats {
  return {
    topicId,
    masteryScore,
    lastEvaluatedAt: "2026-08-21T00:00:00.000Z",
    correctCount: 1,
    incorrectCount: 0,
    reviewSuccessCount: 0,
    recentEvidence: [],
  };
}

export function makeReview(
  overrides: Partial<ReadinessReviewOutcome> = {},
): ReadinessReviewOutcome {
  return {
    topicId: "technology-topic",
    completedAt: "2026-08-21T00:00:00.000Z",
    wasDue: true,
    isCorrect: true,
    stage: 3,
    dueAt: "2026-08-25T00:00:00.000Z",
    scheduledIntervalDays: 3,
    ...overrides,
  };
}

export function makeEvidence(
  overrides: Partial<ReadinessFixtureEvidence> = {},
): ReadinessFixtureEvidence {
  return {
    evidenceRevision: 7,
    topics: [
      makeTopic({ topicId: "strategy-topic", fieldId: "strategy", label: "Strategy topic" }),
      makeTopic({ topicId: "management-topic", fieldId: "management", label: "Management topic" }),
      makeTopic(),
    ],
    answers: [],
    assessmentSessions: [],
    masteryByTopic: {},
    reviewOutcomes: [],
    ...overrides,
  };
}

export function officialAnswersByField(
  counts: Readonly<Record<"strategy" | "management" | "technology", number>>,
  overrides: Partial<ReadinessAnswerEvidence> = {},
): ReadinessAnswerEvidence[] {
  const answers: ReadinessAnswerEvidence[] = [];
  let index = 0;
  for (const fieldId of ["strategy", "management", "technology"] as const) {
    for (let fieldIndex = 0; fieldIndex < counts[fieldId]; fieldIndex += 1) {
      answers.push(makeAnswer(index, {
        topicId: `${fieldId}-topic`,
        fieldId,
        officialExamFieldId: fieldId,
        ...overrides,
      }));
      index += 1;
    }
  }
  return answers;
}

export const V1_GOLDEN_CASES = [
  {
    name: "no data",
    evidence: makeEvidence(),
    expected: {
      score: null,
      band: "measuring",
      calculation: { baseScore: null, weakTopicPenalty: 0, preGateScore: null, appliedCaps: [] },
      primaryImprovement: { code: "collect_more_evidence" },
    },
  },
  {
    name: "sparse first evidence capped at 59",
    evidence: makeEvidence({
      answers: [makeAnswer(0, { firstAttemptState: "first" })],
    }),
    expected: {
      score: 59,
      band: "measuring",
      confidence: { level: "low" },
      calculation: { appliedCaps: [{ type: "confidence", cap: 59, reasonCode: "low_confidence" }] },
    },
  },
  {
    name: "one low-evidence field",
    evidence: makeEvidence({
      answers: officialAnswersByField({ strategy: 13, management: 20, technology: 46 }),
      masteryByTopic: {
        "strategy-topic": makeMastery("strategy-topic", 100),
        "management-topic": makeMastery("management-topic", 100),
        "technology-topic": makeMastery("technology-topic", 100),
      },
    }),
    expected: {
      confidence: { score: 59, level: "low" },
      primaryImprovement: { code: "collect_more_evidence" },
    },
  },
  {
    name: "three stable summative sessions",
    evidence: makeEvidence({
      answers: officialAnswersByField({ strategy: 35, management: 20, technology: 45 }),
      assessmentSessions: [makeSession(0), makeSession(1), makeSession(2)],
      masteryByTopic: {
        "strategy-topic": makeMastery("strategy-topic", 100),
        "management-topic": makeMastery("management-topic", 100),
        "technology-topic": makeMastery("technology-topic", 100),
      },
    }),
    expected: {
      score: 100,
      band: "stable",
      confidence: { score: 100, level: "high", reasons: [] },
      primaryImprovement: null,
    },
  },
  {
    name: "Review failure",
    evidence: makeEvidence({
      answers: officialAnswersByField({ strategy: 35, management: 20, technology: 45 }),
      assessmentSessions: [makeSession(0), makeSession(1), makeSession(2)],
      masteryByTopic: {
        "strategy-topic": makeMastery("strategy-topic", 100),
        "management-topic": makeMastery("management-topic", 100),
        "technology-topic": makeMastery("technology-topic", 100),
      },
      reviewOutcomes: [makeReview({ isCorrect: false, stage: 0 })],
    }),
    expected: {
      weakTopics: [{ topicId: "technology-topic", reason: "latest_review_failed", penaltyApplied: true }],
      primaryImprovement: { code: "review_weak_topic", topicId: "technology-topic" },
    },
  },
  {
    name: "more than five Weak Topics",
    evidence: (() => {
      const topics = Array.from({ length: 6 }, (_, index) => makeTopic({
        topicId: `weak-${index}`,
        fieldId: index % 3 === 0 ? "strategy" : index % 3 === 1 ? "management" : "technology",
        label: `Weak ${index}`,
        importance: 3,
      }));
      return makeEvidence({
        topics,
        assessmentSessions: [makeSession(0, { correctCount: 80 })],
        weakTopicSignals: topics.map(({ topicId }) => ({ topicId, reason: "summary_exam_miss" as const })),
      });
    })(),
    expected: {
      calculation: { weakTopicPenalty: 7.5 },
      weakTopics: [
        { topicId: "weak-0", penaltyApplied: true },
        { topicId: "weak-1", penaltyApplied: true },
        { topicId: "weak-2", penaltyApplied: true },
        { topicId: "weak-3", penaltyApplied: true },
        { topicId: "weak-4", penaltyApplied: true },
        { topicId: "weak-5", penaltyApplied: false },
      ],
      primaryImprovement: { code: "collect_more_evidence" },
    },
  },
  {
    name: "repeated canonical questions",
    evidence: makeEvidence({
      answers: [
        makeAnswer(0, { canonicalQuestionId: "same", kind: "confirmation" }),
        makeAnswer(1, { canonicalQuestionId: "same", kind: "official_past" }),
      ],
    }),
    expected: {
      evidence: { uniqueQuestionCount: 1, weightedEvidenceUnits: 1 },
    },
  },
  {
    name: "time-boundary-only change",
    evidence: makeEvidence({
      answers: [makeAnswer(0, { answeredAt: "2026-07-23T00:00:00.000Z", firstAttemptState: "first" })],
    }),
    expected: {
      validUntil: "2026-08-23T00:00:00.000Z",
    },
  },
] as const;
