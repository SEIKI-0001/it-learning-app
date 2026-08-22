import { describe, expect, it } from "vitest";

import {
  computeAssessmentCoverage,
  computeConfidenceInputs,
  computeFieldEvidence,
  computeFirstPerformance,
  computeRetention,
  scopeComponentInputsToField,
  computeSummativePerformance,
  computeTopicMastery,
  computeWeakTopics,
} from "@/lib/examReadiness/components";
import type {
  AssessmentSession,
  ComponentInput,
  ReadinessAnswerEvidence,
  ReadinessReviewOutcome,
  ReadinessTopic,
} from "@/types/examReadiness";
import type { TopicMasteryStats } from "@/types";

const referenceTime = new Date("2026-08-22T00:00:00.000Z");

function topic(overrides: Partial<ReadinessTopic> = {}): ReadinessTopic {
  return {
    topicId: "topic-1",
    fieldId: "technology",
    label: "Topic 1",
    importance: 1,
    ...overrides,
  };
}

function answer(overrides: Partial<ReadinessAnswerEvidence> = {}): ReadinessAnswerEvidence {
  return {
    answerId: "answer-1",
    idempotencyKey: "event-1",
    canonicalQuestionId: "question-1",
    topicId: "topic-1",
    fieldId: "technology",
    kind: "confirmation",
    isCorrect: true,
    firstAttemptState: "first",
    answeredAt: referenceTime.toISOString(),
    ...overrides,
  };
}

function session(overrides: Partial<AssessmentSession> = {}): AssessmentSession {
  return {
    sessionId: "session-1",
    userId: "user-1",
    source: "mock",
    mode: "exam",
    status: "completed",
    startedAt: "2026-08-21T23:00:00.000Z",
    completedAt: referenceTime.toISOString(),
    questionCount: 10,
    answeredCount: 10,
    correctCount: 8,
    firstCount: 10,
    seenCount: 0,
    unknownCount: 0,
    ...overrides,
  };
}

function mastery(topicId: string, masteryScore: number): TopicMasteryStats {
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

function review(overrides: Partial<ReadinessReviewOutcome> = {}): ReadinessReviewOutcome {
  return {
    topicId: "topic-1",
    completedAt: "2026-08-21T00:00:00.000Z",
    wasDue: true,
    isCorrect: true,
    stage: 2,
    dueAt: "2026-08-25T00:00:00.000Z",
    scheduledIntervalDays: 3,
    ...overrides,
  };
}

function input(overrides: Partial<ComponentInput> = {}): ComponentInput {
  return {
    calculationReferenceTime: referenceTime,
    topics: [topic()],
    answers: [],
    assessmentSessions: [],
    masteryByTopic: {},
    reviewOutcomes: [],
    ...overrides,
  };
}

describe("computeFirstPerformance", () => {
  it.each([
    ["first", 100],
    ["seen", null],
    ["unknown", null],
  ] as const)("treats %s answer state as specified", (firstAttemptState, expected) => {
    expect(computeFirstPerformance(input({ answers: [answer({ firstAttemptState })] }))).toBe(expected);
  });

  it("weights first answers by source strength", () => {
    const result = computeFirstPerformance(input({
      answers: [
        answer({ kind: "confirmation", isCorrect: true }),
        answer({ answerId: "answer-2", idempotencyKey: "event-2", canonicalQuestionId: "question-2", kind: "official_past", isCorrect: false }),
      ],
    }));

    expect(result).toBeCloseTo(0.4 / 1.4 * 100);
  });

  it("weights first answers by freshness", () => {
    const result = computeFirstPerformance(input({
      answers: [
        answer({ kind: "official_past", isCorrect: true, answeredAt: "2026-07-22T00:00:00.000Z" }),
        answer({ answerId: "answer-2", idempotencyKey: "event-2", canonicalQuestionId: "question-2", kind: "official_past", isCorrect: false }),
      ],
    }));

    expect(result).toBeCloseTo(0.8 / 1.8 * 100);
  });

  it("returns null without eligible first evidence", () => {
    expect(computeFirstPerformance(input())).toBeNull();
  });

  it("does not consume an answer that also belongs to a summative session", () => {
    const shared = input({
      answers: [answer({ kind: "summary" })],
      assessmentSessions: [session({ source: "summary", correctCount: 10 })],
    });

    expect(computeFirstPerformance(shared)).toBe(100);
    expect(computeSummativePerformance(shared)).toBe(100);
    expect(shared.answers).toHaveLength(1);
  });
});

describe("computeSummativePerformance", () => {
  it.each([
    ["summary", "exam", "completed", true],
    ["mock", "practice", "completed", true],
    ["official_past", "exam", "completed", true],
    ["checkpoint", "exam", "completed", false],
    ["official_past", "practice", "completed", false],
    ["summary", "exam", "in_progress", false],
    ["mock", "exam", "abandoned", false],
  ] as const)("applies eligibility to %s/%s/%s", (source, mode, status, eligible) => {
    const result = computeSummativePerformance(input({
      assessmentSessions: [session({ source, mode, status, completedAt: status === "completed" ? referenceTime.toISOString() : null })],
    }));
    expect(result === null).toBe(!eligible);
  });

  it("uses only the latest three completed eligible sessions", () => {
    const correctCounts = [0, 1, 2, 4];
    const sessions = correctCounts.map((correctCount, index) => session({
      sessionId: `session-${index}`,
      questionCount: 4,
      correctCount,
      answeredCount: 4,
      completedAt: `2026-08-${18 + index}T00:00:00.000Z`,
    }));

    expect(computeSummativePerformance(input({ assessmentSessions: sessions })))
      .toBeCloseTo(0.7 * ((25 + 50 + 100) / 3) + 0.3 * 25);
  });

  it.each([
    ["one session", [session({ correctCount: 8 })], 80],
    ["two sessions", [session({ sessionId: "one", correctCount: 10 }), session({ sessionId: "two", correctCount: 5 })], 67.5],
  ])("calculates from %s", (_name, assessmentSessions, expected) => {
    expect(computeSummativePerformance(input({ assessmentSessions }))).toBeCloseTo(expected);
  });

  it("keeps unanswered questions in the fixed denominator", () => {
    expect(computeSummativePerformance(input({
      assessmentSessions: [session({ questionCount: 10, answeredCount: 5, correctCount: 5 })],
    }))).toBe(50);
  });

  it("uses source trust in the weighted mean", () => {
    const result = computeSummativePerformance(input({
      assessmentSessions: [
        session({ sessionId: "official", source: "official_past", correctCount: 10 }),
        session({ sessionId: "summary", source: "summary", correctCount: 0 }),
      ],
    }));

    expect(result).toBeCloseTo(0.7 * (1000 / 18));
  });

  it("uses completed-session freshness in the weighted mean", () => {
    const result = computeSummativePerformance(input({
      assessmentSessions: [
        session({ sessionId: "fresh", correctCount: 10 }),
        session({ sessionId: "stale", correctCount: 0, completedAt: "2026-07-22T00:00:00.000Z" }),
      ],
    }));

    expect(result).toBeCloseTo(0.7 * (1000 / 18));
  });

  it("uses 0.5 + 0.5 * firstRate and excludes unknown from that rate", () => {
    const result = computeSummativePerformance(input({
      assessmentSessions: [
        session({ sessionId: "seen", correctCount: 10, firstCount: 0, seenCount: 10, unknownCount: 90 }),
        session({ sessionId: "first", correctCount: 0, firstCount: 10, seenCount: 0 }),
      ],
    }));

    expect(result).toBeCloseTo(0.7 * (100 / 3));
  });

  it("uses neutral 0.5 when all answers are unknown", () => {
    const result = computeSummativePerformance(input({
      assessmentSessions: [
        session({ sessionId: "unknown", correctCount: 10, firstCount: 0, seenCount: 0, unknownCount: 10 }),
        session({ sessionId: "first", correctCount: 0, firstCount: 10, seenCount: 0, unknownCount: 0 }),
      ],
    }));

    expect(result).toBeCloseTo(0.7 * (100 / 3));
  });

  it("combines 70% weighted mean with 30% minimum", () => {
    expect(computeSummativePerformance(input({
      assessmentSessions: [session({ sessionId: "high", correctCount: 10 }), session({ sessionId: "low", correctCount: 5 })],
    }))).toBeCloseTo(67.5);
  });
});

describe("computeTopicMastery", () => {
  it("importance-weights only evaluated topic_mastery_stats without mutating them", () => {
    const masteryByTopic = { "topic-1": mastery("topic-1", 50), "topic-2": mastery("topic-2", 100) };
    const original = structuredClone(masteryByTopic);
    const result = computeTopicMastery(input({
      topics: [topic(), topic({ topicId: "topic-2", importance: 3 })],
      masteryByTopic,
    }));

    expect(result).toBe(87.5);
    expect(masteryByTopic).toEqual(original);
  });

  it("excludes unevaluated topics instead of inserting zero", () => {
    expect(computeTopicMastery(input({
      topics: [topic(), topic({ topicId: "topic-2", importance: 3 })],
      masteryByTopic: { "topic-1": mastery("topic-1", 80) },
    }))).toBe(80);
  });

  it("returns null when no Topic has P0 evaluation", () => {
    expect(computeTopicMastery(input())).toBeNull();
  });
});

describe("computeRetention", () => {
  it("excludes initial stage-1 success", () => {
    expect(computeRetention(input({ reviewOutcomes: [review({ stage: 1, wasDue: false })] }))).toBeNull();
  });

  it("uses the latest due-review failure as zero", () => {
    expect(computeRetention(input({ reviewOutcomes: [
      review({ stage: 3, completedAt: "2026-08-20T00:00:00.000Z" }),
      review({ stage: 0, isCorrect: false, completedAt: "2026-08-21T00:00:00.000Z" }),
    ] }))).toBe(0);
  });

  it.each([
    [2, 50],
    [3, 75],
    [4, 90],
    [5, 100],
    [8, 100],
  ])("maps successful review stage %s to %s", (stage, expected) => {
    expect(computeRetention(input({ reviewOutcomes: [review({ stage })] }))).toBe(expected);
  });

  it("applies overdue multipliers only to Topics with retention evidence", () => {
    expect(computeRetention(input({
      topics: [topic(), topic({ topicId: "topic-without-review", importance: 3 })],
      reviewOutcomes: [review({ dueAt: "2026-08-20T00:00:00.000Z", scheduledIntervalDays: 3 })],
    }))).toBe(35);
  });
});

describe("computeAssessmentCoverage", () => {
  it("uses each Topic's strongest evidence and Topic importance", () => {
    const result = computeAssessmentCoverage(input({
      topics: [topic(), topic({ topicId: "topic-2", importance: 3 })],
      answers: [answer(), answer({ answerId: "answer-2", idempotencyKey: "event-2", canonicalQuestionId: "question-2", kind: "mock" })],
    }));
    expect(result).toBe(22.5);
  });

  it("reduces stale strongest evidence by freshness", () => {
    expect(computeAssessmentCoverage(input({
      answers: [answer({ kind: "mock", answeredAt: "2026-07-22T00:00:00.000Z" })],
    }))).toBeCloseTo(72);
  });

  it("returns zero without evidence", () => {
    expect(computeAssessmentCoverage(input())).toBe(0);
  });
});

describe("computeFieldEvidence", () => {
  it("uses targetEvidenceUnits times each exam-scheme ratio", () => {
    const fields = computeFieldEvidence(input());
    expect(fields.map(({ fieldId, targetEvidenceUnits }) => [fieldId, targetEvidenceUnits])).toEqual([
      ["strategy", 100 * 32 / 92],
      ["management", 100 * 18 / 92],
      ["technology", 100 * 42 / 92],
    ]);
  });

  it("uses officialExamFieldId for official volume and the primary Topic field for coverage", () => {
    const fields = computeFieldEvidence(input({
      topics: [topic({ fieldId: "technology" })],
      answers: [answer({ kind: "official_past", fieldId: "technology", officialExamFieldId: "strategy" })],
    }));
    const strategy = fields.find((field) => field.fieldId === "strategy")!;
    const technology = fields.find((field) => field.fieldId === "technology")!;

    expect(strategy.weightedEvidenceUnits).toBe(1);
    expect(strategy.assessmentCoverage).toBe(0);
    expect(technology.weightedEvidenceUnits).toBe(0);
    expect(technology.assessmentCoverage).toBe(100);
  });

  it("does not assign official volume to a Topic field when officialExamFieldId is unavailable", () => {
    const fields = computeFieldEvidence(input({
      topics: [topic({ fieldId: "technology" })],
      answers: [answer({ kind: "official_past", fieldId: "technology" })],
    }));

    expect(fields.map((field) => field.weightedEvidenceUnits)).toEqual([0, 0, 0]);
    expect(fields.find((field) => field.fieldId === "technology")?.assessmentCoverage).toBe(100);
  });

  it("uses binary importance-weighted Topic coverage", () => {
    const strategy = computeFieldEvidence(input({
      topics: [topic({ fieldId: "strategy" }), topic({ topicId: "topic-2", fieldId: "strategy", importance: 3 })],
      answers: [answer({ fieldId: "strategy" })],
    })).find((field) => field.fieldId === "strategy")!;

    expect(strategy.assessmentCoverage).toBe(25);
  });

  it("takes the minimum of field volume and field coverage", () => {
    const strategy = computeFieldEvidence(input({
      topics: [
        topic({ fieldId: "strategy" }),
        topic({ topicId: "topic-2", fieldId: "strategy", importance: 3 }),
      ],
      answers: Array.from({ length: 40 }, (_, index) => answer({
        answerId: `answer-${index}`,
        idempotencyKey: `event-${index}`,
        canonicalQuestionId: `question-${index}`,
        fieldId: "strategy",
        officialExamFieldId: "strategy",
        kind: "official_past",
      })),
    })).find((field) => field.fieldId === "strategy")!;

    expect(strategy.evidenceVolume).toBe(100);
    expect(strategy.assessmentCoverage).toBe(25);
    expect(strategy.evidenceSufficiency).toBe(25);
  });
});

describe("computeWeakTopics", () => {
  it.each([
    ["low_mastery", "low_mastery", 1],
    ["repeated_miss", "repeated_incorrect", 1.25],
    ["summary_exam_miss", "unresolved_summative_error", 1.5],
    ["review_failure", "latest_review_failed", 1.5],
  ] as const)("maps P0 %s to %s", (p0Reason, expectedReason, expectedPenalty) => {
    const result = computeWeakTopics(input({
      topics: [topic({ importance: 3 })],
      weakTopicSignals: [{ topicId: "topic-1", reason: p0Reason }],
    }));
    expect(result.topics[0]).toMatchObject({ reason: expectedReason, penalty: expectedPenalty });
  });

  it("uses only the maximum reason coefficient per Topic", () => {
    const result = computeWeakTopics(input({
      topics: [topic({ importance: 3 })],
      weakTopicSignals: [
        { topicId: "topic-1", reason: "low_mastery" },
        { topicId: "topic-1", reason: "summary_exam_miss" },
      ],
    }));
    expect(result).toMatchObject({ penalty: 1.5, topics: [{ reason: "unresolved_summative_error", penalty: 1.5, penaltyApplied: true }] });
  });

  it("keeps a summative miss unresolved until a later successful Review", () => {
    const summativeMiss = answer({
      sessionId: "summary-session",
      kind: "summary",
      isCorrect: false,
      answeredAt: "2026-08-19T00:00:00.000Z",
    });
    const laterConfirmation = answer({
      answerId: "answer-2",
      idempotencyKey: "event-2",
      canonicalQuestionId: "question-2",
      isCorrect: true,
      answeredAt: "2026-08-20T00:00:00.000Z",
    });
    const successfulReview = answer({
      answerId: "answer-3",
      idempotencyKey: "event-3",
      canonicalQuestionId: "question-3",
      kind: "review",
      isCorrect: true,
      answeredAt: "2026-08-21T00:00:00.000Z",
    });

    const assessmentSessions = [session({ sessionId: "summary-session", source: "summary" })];

    expect(computeWeakTopics(input({ answers: [summativeMiss, laterConfirmation], assessmentSessions })).topics[0]?.reason)
      .toBe("unresolved_summative_error");
    expect(computeWeakTopics(input({ answers: [summativeMiss, laterConfirmation, successfulReview], assessmentSessions })).topics)
      .toEqual([]);
  });

  it.each([
    ["official practice", "practice", "completed", false],
    ["official in progress", "exam", "in_progress", false],
    ["official exam", "exam", "completed", true],
  ] as const)("uses eligible session context for an %s miss", (_label, mode, status, expectedWeak) => {
    const officialMiss = answer({
      sessionId: "official-session",
      kind: "official_past",
      isCorrect: false,
    });
    const result = computeWeakTopics(input({
      answers: [officialMiss],
      assessmentSessions: [session({
        sessionId: "official-session",
        source: "official_past",
        mode,
        status,
        completedAt: status === "completed" ? referenceTime.toISOString() : null,
      })],
    }));

    expect(result.topics.some((weakTopic) => weakTopic.reason === "unresolved_summative_error"))
      .toBe(expectedWeak);
  });

  it("orders by penalty, importance, then topicId and applies only the top five", () => {
    const topics = [
      topic({ topicId: "f", label: "F", importance: 1 }),
      topic({ topicId: "e", label: "E", importance: 1 }),
      topic({ topicId: "d", label: "D", importance: 2 }),
      topic({ topicId: "c", label: "C", importance: 2 }),
      topic({ topicId: "b", label: "B", importance: 3 }),
      topic({ topicId: "a", label: "A", importance: 3 }),
    ];
    const result = computeWeakTopics(input({
      topics,
      weakTopicSignals: topics.map(({ topicId }) => ({ topicId, reason: "summary_exam_miss" as const })),
    }));

    expect(result.topics.map(({ topicId }) => topicId)).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(result.topics.map(({ penaltyApplied }) => penaltyApplied)).toEqual([true, true, true, true, true, false]);
  });

  it("uses the importance divisor 3 and caps the total at 12", () => {
    const malformedHighImportance = Array.from({ length: 5 }, (_, index) => ({
      ...topic({ topicId: `topic-${index}`, label: `Topic ${index}` }),
      importance: 100,
    })) as unknown as ReadinessTopic[];
    const result = computeWeakTopics(input({
      topics: malformedHighImportance,
      weakTopicSignals: malformedHighImportance.map(({ topicId }) => ({ topicId, reason: "summary_exam_miss" })),
    }));

    expect(result.topics[0].penalty).toBe(50);
    expect(result.penalty).toBe(12);
  });
});

describe("computeConfidenceInputs", () => {
  it("uses canonical strongest evidence only for volume and returns the minimum configured field sufficiency", () => {
    const result = computeConfidenceInputs(input({
      topics: [topic({ fieldId: "strategy" })],
      answers: [
        answer({ fieldId: "strategy", kind: "confirmation" }),
        answer({ answerId: "answer-2", idempotencyKey: "event-2", fieldId: "strategy", kind: "official_past" }),
      ],
    }));

    expect(result.uniqueQuestionCount).toBe(1);
    expect(result.weightedEvidenceUnits).toBe(1);
    expect(result.evidenceVolume).toBe(1);
    expect(result.threeFieldEvidenceSufficiency).toBe(0);
  });

  it("counts eligible completed summative sessions and caps sufficiency at 100", () => {
    const result = computeConfidenceInputs(input({
      assessmentSessions: [
        session({ sessionId: "summary", source: "summary" }),
        session({ sessionId: "mock", source: "mock" }),
        session({ sessionId: "official", source: "official_past" }),
        session({ sessionId: "official-practice", source: "official_past", mode: "practice" }),
        session({ sessionId: "checkpoint", source: "checkpoint" }),
        session({ sessionId: "old-summary", source: "summary", completedAt: "2026-08-01T00:00:00.000Z" }),
      ],
    }));

    expect(result.completedEligibleSummativeSessionCount).toBe(4);
    expect(result.summativeSessionIds).toEqual(["summary", "mock", "official", "old-summary"]);
    expect(result.summativeSessionSufficiency).toBe(100);
  });
});

describe("scopeComponentInputsToField", () => {
  it("centralizes official and Topic-primary field attribution and omits unavailable field summative data", () => {
    const source = input({
      topics: [
        topic({ topicId: "strategy-topic", fieldId: "strategy" }),
        topic({ topicId: "technology-topic", fieldId: "technology" }),
      ],
      answers: [
        answer({
          topicId: "technology-topic",
          fieldId: "technology",
          kind: "official_past",
          officialExamFieldId: "strategy",
        }),
        answer({
          answerId: "answer-2",
          idempotencyKey: "event-2",
          canonicalQuestionId: "question-2",
          topicId: "technology-topic",
          fieldId: "technology",
          kind: "confirmation",
        }),
      ],
      assessmentSessions: [session()],
      masteryByTopic: {
        "strategy-topic": mastery("strategy-topic", 70),
        "technology-topic": mastery("technology-topic", 90),
      },
      reviewOutcomes: [
        review({ topicId: "strategy-topic" }),
        review({ topicId: "technology-topic" }),
      ],
    });
    const strategy = scopeComponentInputsToField(source, "strategy");
    const technology = scopeComponentInputsToField(source, "technology");

    expect(strategy.firstPerformanceInput.answers.map((event) => event.idempotencyKey))
      .toEqual(["event-1"]);
    expect(technology.firstPerformanceInput.answers.map((event) => event.idempotencyKey))
      .toEqual(["event-2"]);
    expect(technology.topicInput.answers.map((event) => event.idempotencyKey))
      .toEqual(["event-1", "event-2"]);
    expect(technology.topicInput.topics.map((item) => item.topicId)).toEqual(["technology-topic"]);
    expect(Object.keys(technology.topicInput.masteryByTopic)).toEqual(["technology-topic"]);
    expect(technology.topicInput.reviewOutcomes.map((outcome) => outcome.topicId))
      .toEqual(["technology-topic"]);
    expect(strategy.firstPerformanceInput.assessmentSessions).toEqual([]);
    expect(strategy.topicInput.assessmentSessions).toEqual([]);
    expect(computeSummativePerformance(strategy.firstPerformanceInput)).toBeNull();
  });
});
