import { describe, expect, it } from "vitest";

import {
  calculateExamReadinessDraft,
  finalizeExamReadinessResult,
  type ExamReadinessDraft,
} from "@/lib/examReadiness/calculator";
import {
  selectPrimaryImprovement,
  type PerTopicRetention,
} from "@/lib/examReadiness/primaryImprovement";
import {
  makeAnswer,
  makeEvidence,
  makeMastery,
  makeReview,
  makeSession,
  officialAnswersByField,
  REFERENCE_TIME,
} from "@/test/fixtures/examReadiness/v1-cases";

function calculate(
  evidence = makeEvidence(),
  calculationReferenceTime = REFERENCE_TIME,
): ExamReadinessDraft {
  return calculateExamReadinessDraft({ evidence, calculationReferenceTime });
}

const DAY_MS = 24 * 60 * 60 * 1000;

function completeMastery(score = 100) {
  return {
    "strategy-topic": makeMastery("strategy-topic", score),
    "management-topic": makeMastery("management-topic", score),
    "technology-topic": makeMastery("technology-topic", score),
  };
}

function evidenceWithUnits(
  counts: Readonly<Record<"strategy" | "management" | "technology", number>>,
  masteryScore = 100,
) {
  return makeEvidence({
    answers: officialAnswersByField(counts),
    masteryByTopic: completeMastery(masteryScore),
  });
}

describe("calculateExamReadinessDraft", () => {
  it.each([
    [31, 30],
    [61, 60],
    [91, 90],
  ])(
    "uses eligible unanswered-session completion for the %i-day freshness boundary",
    (_transitionDay, elapsedDays) => {
      const completedAt = new Date(REFERENCE_TIME.getTime() - elapsedDays * DAY_MS).toISOString();
      const result = calculate(makeEvidence({
        assessmentSessions: [makeSession(0, {
          completedAt,
          answeredCount: 0,
          correctCount: 0,
          firstCount: 0,
          seenCount: 0,
          unknownCount: 0,
        })],
      }));

      expect(result.validUntil).toBe(
        new Date(REFERENCE_TIME.getTime() + DAY_MS).toISOString(),
      );
    },
  );

  it("uses session completion time when its answer was submitted at a different instant", () => {
    const session = makeSession(0, {
      completedAt: new Date(REFERENCE_TIME.getTime() - 30 * DAY_MS).toISOString(),
      questionCount: 1,
      answeredCount: 1,
      correctCount: 1,
      firstCount: 0,
      seenCount: 1,
    });
    const result = calculate(makeEvidence({
      assessmentSessions: [session],
      answers: [makeAnswer(0, {
        sessionId: session.sessionId,
        kind: "mock",
        answeredAt: new Date(REFERENCE_TIME.getTime() - 31 * DAY_MS).toISOString(),
      })],
    }));

    expect(result.validUntil).toBe(
      new Date(REFERENCE_TIME.getTime() + DAY_MS).toISOString(),
    );
  });

  it("keeps the score null when all four performance components are null", () => {
    const result = calculate(makeEvidence({
      answers: [makeAnswer(0, { firstAttemptState: "seen" })],
      weakTopicSignals: [{ topicId: "technology-topic", reason: "repeated_miss" }],
    }));

    expect(result.components).toMatchObject({
      firstPerformance: null,
      summativePerformance: null,
      topicMastery: null,
      retention: null,
    });
    expect(result.components.assessmentCoverage).toBeGreaterThan(0);
    expect(result.calculation).toEqual({
      baseScore: null,
      weakTopicPenalty: 0,
      preGateScore: null,
      appliedCaps: [],
    });
    expect(result.score).toBeNull();
    expect(result.band).toBe("measuring");
    expect(result.weakTopics.every((topic) => !topic.penaltyApplied)).toBe(true);
  });

  it.each([
    [
      "first performance",
      makeEvidence({ answers: [makeAnswer(0, { firstAttemptState: "first" })] }),
      83.33333333333333,
    ],
    [
      "summative performance",
      makeEvidence({ assessmentSessions: [makeSession(0, { correctCount: 80 })] }),
      57.142857142857146,
    ],
    [
      "Topic Mastery",
      makeEvidence({ masteryByTopic: completeMastery(80) }),
      57.142857142857146,
    ],
    [
      "retention",
      makeEvidence({ reviewOutcomes: [makeReview()] }),
      37.5,
    ],
    [
      "mixed missing performance",
      makeEvidence({ masteryByTopic: completeMastery(80), reviewOutcomes: [makeReview()] }),
      61.111111111111114,
    ],
  ])("renormalizes available weights for %s", (_name, evidence, expectedBaseScore) => {
    expect(calculate(evidence).calculation.baseScore).toBeCloseTo(expectedBaseScore, 12);
  });

  it.each([
    [39, 13, "checkpoint", 59, false],
    [40, 14, null, 79, true],
    [59, 20, "confirmation", 79, true],
    [60, 21, null, 88, true],
  ] as const)(
    "uses rounded field sufficiency %i to choose the confidence cap",
    (expectedSufficiency, strategyUnits, extraKind, expectedCap, gateEvaluated) => {
      const answers = officialAnswersByField({
        strategy: strategyUnits,
        management: 20,
        technology: 46,
      });
      if (extraKind !== null) {
        answers.push(makeAnswer(10_000 + strategyUnits, {
          topicId: "strategy-topic",
          fieldId: "strategy",
          officialExamFieldId: undefined,
          kind: extraKind,
        }));
      }
      const result = calculate(makeEvidence({
        answers,
        assessmentSessions: [makeSession(0), makeSession(1), makeSession(2)],
        masteryByTopic: completeMastery(),
      }));
      const strategy = result.fields.find((field) => field.fieldId === "strategy")!;

      expect(strategy.evidenceSufficiency).toBe(expectedSufficiency);
      expect(strategy.scoreGate.evaluated).toBe(gateEvaluated);
      expect(result.confidence.score).toBe(expectedCap);
      if (expectedSufficiency < 60) {
        expect(result.confidence.reasons).toContainEqual({
          code: "insufficient_field_evidence",
          fieldId: "strategy",
          actual: expectedSufficiency,
          required: 60,
        });
      } else {
        expect(result.confidence.reasons).not.toContainEqual(
          expect.objectContaining({ code: "insufficient_field_evidence", fieldId: "strategy" }),
        );
      }
    },
  );

  it.each([
    [39, 14.04, 59],
    [40, 15.44, 74],
    [59, 42.04, 74],
    [60, 43.44, null],
  ] as const)("uses rounded field score %i to choose its score cap", (score, masteryScore, cap) => {
    const result = calculate(makeEvidence({
      answers: officialAnswersByField({ strategy: 35, management: 20, technology: 45 }),
      masteryByTopic: {
        ...completeMastery(),
        "strategy-topic": makeMastery("strategy-topic", masteryScore),
      },
    }));
    const strategy = result.fields.find((field) => field.fieldId === "strategy")!;

    expect(strategy.score).toBe(score);
    const reasonCode = cap === 59
      ? "field_score_below_40"
      : cap === 74
      ? "field_score_below_60"
      : null;
    expect(strategy.scoreGate).toEqual({
      evaluated: true,
      cap,
      reasonCode,
    });
    if (cap === null) {
      expect(result.calculation.appliedCaps).not.toContainEqual(
        expect.objectContaining({ fieldId: "strategy" }),
      );
    } else {
      expect(result.calculation.appliedCaps).toContainEqual({
        type: "field",
        cap,
        reasonCode,
        fieldId: "strategy",
      });
    }
    if (score === 39) {
      expect(result).toMatchObject({ score: 59, band: "needs_work" });
    }
    if (score === 40) {
      expect(result).toMatchObject({ score: 74, band: "approaching" });
    }
  });

  it.each([
    [59, { strategy: 22, management: 12, technology: 28 }, "low"],
    [60, { strategy: 22, management: 13, technology: 29 }, "medium"],
    [79, { strategy: 35, management: 19, technology: 44 }, "medium"],
    [80, { strategy: 35, management: 20, technology: 45 }, "high"],
  ] as const)("derives confidence level from rounded score %i", (score, counts, level) => {
    const result = calculate(evidenceWithUnits(counts));

    expect(result.confidence.score).toBe(score);
    expect(result.confidence.level).toBe(level);
    const evidenceCount = counts.strategy + counts.management + counts.technology;
    if (evidenceCount < 100) {
      expect(result.confidence.reasons).toContainEqual({
        code: "insufficient_evidence",
        actual: evidenceCount,
        required: 100,
      });
    } else {
      expect(result.confidence.reasons).not.toContainEqual(
        expect.objectContaining({ code: "insufficient_evidence" }),
      );
    }
    expect(result.confidence.reasons).toContainEqual({
      code: "insufficient_summative_sessions",
      actual: 0,
      required: 3,
    });
  });

  it("stores every confidence shortage as structured measured facts", () => {
    const result = calculate();

    expect(result.confidence.reasons).toEqual([
      { code: "insufficient_field_evidence", fieldId: "strategy", actual: 0, required: 60 },
      { code: "insufficient_field_evidence", fieldId: "management", actual: 0, required: 60 },
      { code: "insufficient_field_evidence", fieldId: "technology", actual: 0, required: 60 },
      { code: "insufficient_coverage", actual: 0, required: 60 },
      { code: "insufficient_evidence", actual: 0, required: 100 },
      { code: "insufficient_summative_sessions", actual: 0, required: 3 },
    ]);
  });

  it.each([
    [75, 75, "ready"],
    [84, 84, "ready"],
    [85, 85, "stable"],
  ] as const)("maps high-confidence score %i to %s", (targetScore, expectedScore, band) => {
    const masteryScore = (targetScore * 35 - 1_000) / 25;
    const result = calculate(evidenceWithUnits(
      { strategy: 35, management: 20, technology: 45 },
      masteryScore,
    ));

    expect(result.score).toBe(expectedScore);
    expect(result.band).toBe(band);
  });

  it("maps a high-confidence score rounded to 60 to approaching", () => {
    const topics = Array.from({ length: 100 }, (_, index) => {
      const fieldId = index < 35 ? "strategy" : index < 55 ? "management" : "technology";
      return {
        topicId: `topic-${index}`,
        fieldId,
        label: `Topic ${index}`,
        importance: 1 as const,
      };
    });
    const correctByField = { strategy: 16, management: 10, technology: 21 };
    const seenByField = { strategy: 0, management: 0, technology: 0 };
    const answers = topics.map((topic, index) => {
      const fieldId = topic.fieldId as keyof typeof correctByField;
      const isCorrect = seenByField[fieldId] < correctByField[fieldId];
      seenByField[fieldId] += 1;
      return makeAnswer(index, {
        topicId: topic.topicId,
        fieldId,
        officialExamFieldId: fieldId,
        firstAttemptState: "first",
        isCorrect,
      });
    });
    const result = calculate(makeEvidence({ topics, answers }));

    expect(result.confidence).toMatchObject({ score: 80, level: "high" });
    expect(result.score).toBe(60);
    expect(result.band).toBe("approaching");
  });

  it("classifies score 85 with medium confidence as ready", () => {
    const masteryScore = (85 * 35 - 1_000) / 25;
    const result = calculate(evidenceWithUnits(
      { strategy: 22, management: 13, technology: 29 },
      masteryScore,
    ));

    expect(result.score).toBe(85);
    expect(result.confidence.level).toBe("medium");
    expect(result.band).toBe("ready");
  });

  it("preserves raw calculation values and records all applied caps before final rounding", () => {
    const result = calculate(makeEvidence({
      assessmentSessions: [makeSession(0, { correctCount: 80 })],
      weakTopicSignals: [{ topicId: "technology-topic", reason: "summary_exam_miss" }],
    }));

    expect(result.calculation.baseScore).toBeCloseTo(57.142857142857146, 12);
    expect(result.calculation.weakTopicPenalty).toBe(1.5);
    expect(result.calculation.preGateScore).toBeCloseTo(55.642857142857146, 12);
    expect(result.calculation.appliedCaps).toEqual([
      { type: "confidence", cap: 59, reasonCode: "low_confidence" },
    ]);
    expect(result.score).toBe(56);
  });

  it("freezes calculation time in the draft and finalizes processing time in Tokyo", () => {
    const draft = calculate();
    const finalized = finalizeExamReadinessResult(
      draft,
      new Date("2026-08-22T15:00:00.000Z"),
    );

    expect(draft.calculationReferenceTime).toBe("2026-08-22T00:00:00.000Z");
    expect(finalized.calculatedAt).toBe("2026-08-22T15:00:00.000Z");
    expect(finalized.snapshotDate).toBe("2026-08-23");
  });
});

function baseWithoutPrimary(): Omit<ExamReadinessDraft, "primaryImprovement"> {
  const { primaryImprovement: _primaryImprovement, ...base } = calculate(makeEvidence({
    answers: officialAnswersByField({ strategy: 35, management: 20, technology: 45 }),
    assessmentSessions: [makeSession(0), makeSession(1), makeSession(2)],
    masteryByTopic: completeMastery(),
  }));
  void _primaryImprovement;
  return base;
}

function primary(args: {
  overrides?: Partial<Omit<ExamReadinessDraft, "primaryImprovement">>;
  perTopicRetention?: PerTopicRetention[];
}) {
  return selectPrimaryImprovement({
    resultWithoutPrimary: { ...baseWithoutPrimary(), ...args.overrides },
    perTopicRetention: args.perTopicRetention ?? [],
  });
}

describe("selectPrimaryImprovement", () => {
  it("collects evidence first when score is null", () => {
    expect(primary({ overrides: { score: null } })).toEqual({ code: "collect_more_evidence" });
  });

  it.each([
    { code: "insufficient_field_evidence", fieldId: "technology", actual: 39, required: 60 },
    { code: "insufficient_coverage", actual: 59, required: 60 },
    { code: "insufficient_evidence", actual: 99, required: 100 },
  ] as const)("collects evidence for low-confidence $code", (reason) => {
    expect(primary({ overrides: {
      confidence: { score: 59, level: "low", reasons: [reason] },
    } })).toEqual({ code: "collect_more_evidence" });
  });

  it("takes a summative assessment when that is the only low-confidence shortage", () => {
    expect(primary({ overrides: {
      confidence: {
        score: 59,
        level: "low",
        reasons: [{ code: "insufficient_summative_sessions", actual: 0, required: 3 }],
      },
    } })).toEqual({ code: "take_summative_assessment" });
  });

  it("chooses a field by cap, score, then scheme order", () => {
    expect(primary({ overrides: {
      fields: [
        { fieldId: "strategy", label: "S", score: 50, evidenceSufficiency: 100, scoreGate: { evaluated: true, cap: 74, reasonCode: "field_score_below_40_or_60" } },
        { fieldId: "management", label: "M", score: 39, evidenceSufficiency: 100, scoreGate: { evaluated: true, cap: 59, reasonCode: "field_score_below_40_or_60" } },
        { fieldId: "technology", label: "T", score: 38, evidenceSufficiency: 100, scoreGate: { evaluated: true, cap: 59, reasonCode: "field_score_below_40_or_60" } },
      ],
      calculation: {
        ...baseWithoutPrimary().calculation,
        appliedCaps: [
          { type: "field", cap: 74, reasonCode: "field_score_below_40_or_60", fieldId: "strategy" },
          { type: "field", cap: 59, reasonCode: "field_score_below_40_or_60", fieldId: "management" },
          { type: "field", cap: 59, reasonCode: "field_score_below_40_or_60", fieldId: "technology" },
        ],
      },
    } })).toEqual({ code: "improve_field", fieldId: "technology" });
  });

  it("chooses the field with the lowest cap before comparing scores", () => {
    expect(primary({ overrides: {
      fields: [
        { fieldId: "strategy", label: "S", score: 20, evidenceSufficiency: 100, scoreGate: { evaluated: true, cap: 74, reasonCode: "field_score_below_60" } },
        { fieldId: "management", label: "M", score: 39, evidenceSufficiency: 100, scoreGate: { evaluated: true, cap: 59, reasonCode: "field_score_below_40" } },
      ],
    } })).toEqual({ code: "improve_field", fieldId: "management" });
  });

  it("chooses the lowest field score when caps are equal", () => {
    expect(primary({ overrides: {
      fields: [
        { fieldId: "strategy", label: "S", score: 39, evidenceSufficiency: 100, scoreGate: { evaluated: true, cap: 59, reasonCode: "field_score_below_40" } },
        { fieldId: "management", label: "M", score: 38, evidenceSufficiency: 100, scoreGate: { evaluated: true, cap: 59, reasonCode: "field_score_below_40" } },
      ],
    } })).toEqual({ code: "improve_field", fieldId: "management" });
  });

  it("uses exam-scheme order when field caps and scores are equal", () => {
    expect(primary({ overrides: {
      fields: [
        { fieldId: "technology", label: "T", score: 39, evidenceSufficiency: 100, scoreGate: { evaluated: true, cap: 59, reasonCode: "field_score_below_40" } },
        { fieldId: "strategy", label: "S", score: 39, evidenceSufficiency: 100, scoreGate: { evaluated: true, cap: 59, reasonCode: "field_score_below_40" } },
      ],
    } })).toEqual({ code: "improve_field", fieldId: "strategy" });
  });

  it("chooses a Weak Topic by penalty, importance, then topicId", () => {
    expect(primary({ overrides: {
      weakTopics: [
        { topicId: "b", label: "B", importance: 3, reason: "low_mastery", penalty: 1, penaltyApplied: true },
        { topicId: "a", label: "A", importance: 3, reason: "low_mastery", penalty: 1, penaltyApplied: true },
      ],
    } })).toEqual({ code: "review_weak_topic", topicId: "a" });
  });

  it("chooses the Weak Topic with the greatest individual penalty first", () => {
    expect(primary({ overrides: {
      weakTopics: [
        { topicId: "high-importance", label: "High importance", importance: 3, reason: "low_mastery", penalty: 1, penaltyApplied: true },
        { topicId: "high-penalty", label: "High penalty", importance: 1, reason: "latest_review_failed", penalty: 1.5, penaltyApplied: true },
      ],
    } })).toEqual({ code: "review_weak_topic", topicId: "high-penalty" });
  });

  it("chooses the greatest Weak Topic importance when penalties are equal", () => {
    expect(primary({ overrides: {
      weakTopics: [
        { topicId: "a", label: "A", importance: 1, reason: "low_mastery", penalty: 1, penaltyApplied: true },
        { topicId: "z", label: "Z", importance: 3, reason: "low_mastery", penalty: 1, penaltyApplied: true },
      ],
    } })).toEqual({ code: "review_weak_topic", topicId: "z" });
  });

  it("uses ascending topicId when Weak Topic penalty and importance are equal", () => {
    expect(primary({ overrides: {
      weakTopics: [
        { topicId: "b", label: "B", importance: 3, reason: "low_mastery", penalty: 1, penaltyApplied: true },
        { topicId: "a", label: "A", importance: 3, reason: "low_mastery", penalty: 1, penaltyApplied: true },
      ],
    } })).toEqual({ code: "review_weak_topic", topicId: "a" });
  });

  it("requires measured retention below 75 and chooses the deterministic Topic", () => {
    expect(primary({
      overrides: { components: { ...baseWithoutPrimary().components, retention: 74.9 } },
      perTopicRetention: [
        { topicId: "b", retention: 40, importance: 3 },
        { topicId: "c", retention: 30, importance: 2 },
        { topicId: "a", retention: 30, importance: 2 },
      ],
    })).toEqual({ code: "improve_retention", topicId: "a" });
    expect(primary({
      overrides: { components: { ...baseWithoutPrimary().components, retention: null } },
      perTopicRetention: [{ topicId: "a", retention: 0, importance: 3 }],
    })).toBeNull();
  });

  it("chooses the Topic with the lowest retention before comparing importance", () => {
    expect(primary({
      overrides: { components: { ...baseWithoutPrimary().components, retention: 50 } },
      perTopicRetention: [
        { topicId: "important", retention: 40, importance: 3 },
        { topicId: "lowest", retention: 30, importance: 1 },
      ],
    })).toEqual({ code: "improve_retention", topicId: "lowest" });
  });

  it("chooses the greatest Topic importance when retention values are equal", () => {
    expect(primary({
      overrides: { components: { ...baseWithoutPrimary().components, retention: 50 } },
      perTopicRetention: [
        { topicId: "a", retention: 30, importance: 1 },
        { topicId: "z", retention: 30, importance: 3 },
      ],
    })).toEqual({ code: "improve_retention", topicId: "z" });
  });

  it("uses ascending topicId when Topic retention and importance are equal", () => {
    expect(primary({
      overrides: { components: { ...baseWithoutPrimary().components, retention: 50 } },
      perTopicRetention: [
        { topicId: "b", retention: 30, importance: 3 },
        { topicId: "a", retention: 30, importance: 3 },
      ],
    })).toEqual({ code: "improve_retention", topicId: "a" });
  });

  it("keeps substantive low-confidence shortage ahead of every later improvement", () => {
    expect(primary({ overrides: {
      confidence: {
        score: 59,
        level: "low",
        reasons: [
          { code: "insufficient_evidence", actual: 20, required: 100 },
          { code: "insufficient_summative_sessions", actual: 0, required: 3 },
        ],
      },
      fields: [
        { fieldId: "strategy", label: "S", score: 39, evidenceSufficiency: 100, scoreGate: { evaluated: true, cap: 59, reasonCode: "field_score_below_40" } },
      ],
      weakTopics: [
        { topicId: "weak", label: "Weak", importance: 3, reason: "low_mastery", penalty: 1, penaltyApplied: true },
      ],
      components: { ...baseWithoutPrimary().components, retention: 50 },
      evidence: { ...baseWithoutPrimary().evidence, summativeSessionCount: 0 },
    }, perTopicRetention: [{ topicId: "retention", retention: 20, importance: 3 }] }))
      .toEqual({ code: "collect_more_evidence" });
  });

  it("keeps summative-only low confidence ahead of field, Weak, and retention improvements", () => {
    expect(primary({ overrides: {
      confidence: {
        score: 59,
        level: "low",
        reasons: [{ code: "insufficient_summative_sessions", actual: 0, required: 3 }],
      },
      fields: [
        { fieldId: "strategy", label: "S", score: 39, evidenceSufficiency: 100, scoreGate: { evaluated: true, cap: 59, reasonCode: "field_score_below_40" } },
      ],
      weakTopics: [
        { topicId: "weak", label: "Weak", importance: 3, reason: "low_mastery", penalty: 1, penaltyApplied: true },
      ],
      components: { ...baseWithoutPrimary().components, retention: 50 },
    }, perTopicRetention: [{ topicId: "retention", retention: 20, importance: 3 }] }))
      .toEqual({ code: "take_summative_assessment" });
  });

  it("keeps a field cap ahead of Weak, retention, and summative improvements", () => {
    expect(primary({ overrides: {
      fields: [
        { fieldId: "strategy", label: "S", score: 39, evidenceSufficiency: 100, scoreGate: { evaluated: true, cap: 59, reasonCode: "field_score_below_40" } },
      ],
      weakTopics: [
        { topicId: "weak", label: "Weak", importance: 3, reason: "low_mastery", penalty: 1, penaltyApplied: true },
      ],
      components: { ...baseWithoutPrimary().components, retention: 50 },
      evidence: { ...baseWithoutPrimary().evidence, summativeSessionCount: 0 },
    }, perTopicRetention: [{ topicId: "retention", retention: 20, importance: 3 }] }))
      .toEqual({ code: "improve_field", fieldId: "strategy" });
  });

  it("keeps a penalty-applied Weak Topic ahead of retention and summative improvements", () => {
    expect(primary({ overrides: {
      weakTopics: [
        { topicId: "weak", label: "Weak", importance: 3, reason: "low_mastery", penalty: 1, penaltyApplied: true },
      ],
      components: { ...baseWithoutPrimary().components, retention: 50 },
      evidence: { ...baseWithoutPrimary().evidence, summativeSessionCount: 0 },
    }, perTopicRetention: [{ topicId: "retention", retention: 20, importance: 3 }] }))
      .toEqual({ code: "review_weak_topic", topicId: "weak" });
  });

  it("keeps low retention ahead of insufficient summative sessions", () => {
    expect(primary({
      overrides: {
        components: { ...baseWithoutPrimary().components, retention: 50 },
        evidence: { ...baseWithoutPrimary().evidence, summativeSessionCount: 0 },
      },
      perTopicRetention: [{ topicId: "retention", retention: 20, importance: 3 }],
    })).toEqual({ code: "improve_retention", topicId: "retention" });
  });

  it("requests summative evidence below three eligible sessions, then returns null", () => {
    expect(primary({ overrides: {
      evidence: { ...baseWithoutPrimary().evidence, summativeSessionCount: 2 },
    } })).toEqual({ code: "take_summative_assessment" });
    expect(primary({})).toBeNull();
  });
});
