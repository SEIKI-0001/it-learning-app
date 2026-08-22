export const EXAM_READINESS_MODEL_VERSION = "exam-readiness-rule-v1";
export const EXAM_SCHEME_VERSION = "ip-3field-2026";

export const EXAM_READINESS_CONFIG = {
  modelVersion: EXAM_READINESS_MODEL_VERSION,
  examSchemeVersion: EXAM_SCHEME_VERSION,
  fields: [
    { fieldId: "strategy", label: "ストラテジ", scoredQuestionRatio: 32 / 92 },
    { fieldId: "management", label: "マネジメント", scoredQuestionRatio: 18 / 92 },
    { fieldId: "technology", label: "テクノロジ", scoredQuestionRatio: 42 / 92 },
  ],
  componentWeights: {
    firstPerformance: 30,
    summativePerformance: 25,
    topicMastery: 25,
    retention: 10,
    assessmentCoverage: 10,
  },
  freshnessSchedule: [
    { minimumElapsedWholeDays: 0, coefficient: 1 },
    { minimumElapsedWholeDays: 31, coefficient: 0.8 },
    { minimumElapsedWholeDays: 61, coefficient: 0.6 },
    { minimumElapsedWholeDays: 91, coefficient: 0.4 },
  ],
  retentionOverdueSchedule: {
    fewerThanOneWholeDay: 1,
    throughScheduledInterval: 0.7,
    beyondScheduledInterval: 0.4,
  },
  shortageThresholds: {
    weightedEvidenceUnits: 100,
    assessmentCoverage: 60,
    fieldEvidenceSufficiency: 60,
    summativeSessionCount: 3,
  },
  confidenceWeights: {
    evidenceVolume: 0.35,
    assessmentCoverage: 0.25,
    threeFieldEvidenceSufficiency: 0.2,
    summativeSessionSufficiency: 0.2,
  },
  fieldEvidenceConfidenceCaps: {
    below40: 59,
    from40Through59: 79,
  },
  fieldScoreCaps: {
    below40: 59,
    from40Through59: 74,
  },
  confidenceScoreCap: 59,
  weakTopic: {
    maximumTopicCount: 5,
    maximumPenalty: 12,
    reasonCoefficients: {
      low_mastery: 1,
      repeated_incorrect: 1.25,
      unresolved_summative_error: 1.5,
      latest_review_failed: 1.5,
    },
  },
  sourceTrustCoefficients: {
    checkpoint: 0.6,
    summary: 0.8,
    mock: 0.9,
    official_past: 1,
  },
  coverageEvidenceCoefficients: {
    confirmation: 0.4,
    checkpoint: 0.6,
    review: 0.7,
    summary: 0.8,
    mock: 0.9,
    official_past: 1,
  },
} as const;
