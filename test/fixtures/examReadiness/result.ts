import type { ExamReadinessResult } from "@/types/examReadiness";

export function makeExamReadinessResult(
  overrides: Partial<ExamReadinessResult> = {},
): ExamReadinessResult {
  const base: ExamReadinessResult = {
    score: 78,
    band: "ready",
    confidence: {
      score: 76,
      level: "medium",
      reasons: [],
    },
    fields: [
      {
        fieldId: "strategy",
        label: "ストラテジ",
        score: 82,
        evidenceSufficiency: 74,
        scoreGate: { evaluated: true, cap: null, reasonCode: null },
      },
      {
        fieldId: "management",
        label: "マネジメント",
        score: 76,
        evidenceSufficiency: 72,
        scoreGate: { evaluated: true, cap: null, reasonCode: null },
      },
      {
        fieldId: "technology",
        label: "テクノロジ",
        score: 68,
        evidenceSufficiency: 70,
        scoreGate: { evaluated: true, cap: null, reasonCode: null },
      },
    ],
    components: {
      firstPerformance: 81,
      summativePerformance: 74,
      topicMastery: 77,
      retention: 69,
      assessmentCoverage: 73,
    },
    calculation: {
      baseScore: 80,
      weakTopicPenalty: 2,
      preGateScore: 78,
      appliedCaps: [],
    },
    evidence: {
      uniqueQuestionCount: 120,
      weightedEvidenceUnits: 112,
      summativeSessionCount: 3,
      summativeSessionIds: ["summary-1", "mock-1", "official-1"],
      evidenceRevision: 9,
    },
    weakTopics: [
      {
        topicId: "tech-network",
        label: "ネットワーク基礎",
        importance: 3,
        reason: "repeated_incorrect",
        penalty: 1.25,
        penaltyApplied: true,
      },
    ],
    primaryImprovement: {
      code: "review_weak_topic",
      topicId: "tech-network",
    },
    modelVersion: "exam-readiness-rule-v1",
    examSchemeVersion: "ip-3field-2026",
    calculationReferenceTime: "2026-08-22T00:00:00.000Z",
    calculatedAt: "2026-08-22T00:00:01.000Z",
    validUntil: "2026-08-23T00:00:00.000Z",
    snapshotDate: "2026-08-22",
  };

  return { ...base, ...overrides };
}
