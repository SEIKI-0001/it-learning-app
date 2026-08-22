import type { TopicMasteryStats } from "@/types";

export type FirstAttemptState = "first" | "seen" | "unknown";
export type ReadinessBand = "measuring" | "needs_work" | "approaching" | "ready" | "stable";
export type ConfidenceLevel = "low" | "medium" | "high";
export type ReadinessEvidenceKind =
  | "confirmation"
  | "checkpoint"
  | "review"
  | "summary"
  | "mock"
  | "official_past";

export type ReadinessTopic = {
  topicId: string;
  fieldId: string;
  label: string;
  importance: 1 | 2 | 3;
};

export type ReadinessAnswerEvidence = {
  answerId: string | null;
  idempotencyKey: string;
  canonicalQuestionId: string;
  topicId: string;
  fieldId: string;
  /** The exam-scheme field for official questions, which may differ from the Topic's primary field. */
  officialExamFieldId?: string;
  kind: ReadinessEvidenceKind;
  isCorrect: boolean;
  firstAttemptState: FirstAttemptState;
  answeredAt: string;
};

export type ConfidenceReasonCode =
  | "insufficient_evidence"
  | "insufficient_coverage"
  | "insufficient_field_evidence"
  | "insufficient_summative_sessions";

export type ReadinessConfidenceReason = {
  code: ConfidenceReasonCode;
  fieldId?: string;
  actual: number;
  required: number;
};

export type FieldScoreGate = {
  evaluated: boolean;
  cap: number | null;
  reasonCode: string | null;
};

export type ReadinessFieldScore = {
  fieldId: string;
  label: string;
  score: number | null;
  evidenceSufficiency: number;
  scoreGate: FieldScoreGate;
};

export type ReadinessComponents = {
  firstPerformance: number | null;
  summativePerformance: number | null;
  topicMastery: number | null;
  retention: number | null;
  assessmentCoverage: number;
};

export type AppliedReadinessCap = {
  type: "field" | "confidence";
  cap: number;
  reasonCode: string;
  fieldId?: string;
};

export type CalculationTrace = {
  baseScore: number | null;
  weakTopicPenalty: number;
  preGateScore: number | null;
  appliedCaps: AppliedReadinessCap[];
};

export type EvidenceSummary = {
  uniqueQuestionCount: number;
  weightedEvidenceUnits: number;
  summativeSessionCount: number;
  summativeSessionIds: string[];
  evidenceRevision: number;
};

export type WeakTopicReason =
  | "low_mastery"
  | "repeated_incorrect"
  | "unresolved_summative_error"
  | "latest_review_failed";

export type WeakTopic = {
  topicId: string;
  label: string;
  importance: number;
  reason: WeakTopicReason;
  penalty: number;
  penaltyApplied: boolean;
};

export type PrimaryImprovement = {
  code:
    | "collect_more_evidence"
    | "improve_field"
    | "review_weak_topic"
    | "improve_retention"
    | "take_summative_assessment";
  fieldId?: string;
  topicId?: string;
};

export type NormalizedAnswerEvidence = {
  answerId: string;
  idempotencyKey: string;
  sessionId: string;
  canonicalQuestionId: string;
  topicId: string;
  fieldId: string;
  isCorrect: boolean;
  firstAttemptState: FirstAttemptState;
  answeredAt: string;
};

export type AssessmentSession = {
  sessionId: string;
  userId: string;
  source: "checkpoint" | "summary" | "mock" | "official_past";
  mode: "practice" | "exam";
  status: "in_progress" | "completed" | "abandoned";
  startedAt: string;
  completedAt: string | null;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  firstCount: number;
  seenCount: number;
  unknownCount: number;
};

export type EvidenceBundle = {
  evidenceRevision: number;
  answers: NormalizedAnswerEvidence[];
  assessmentSessions: AssessmentSession[];
};

export type ReadinessReviewOutcome = {
  topicId: string;
  completedAt: string;
  wasDue: boolean;
  isCorrect: boolean;
  /** The stage reached by this result. Stage 1 is the initial-learning success. */
  stage: number;
  /** The current deadline after this result. */
  dueAt: string;
  /** The interval that produced the current deadline. */
  scheduledIntervalDays: number;
};

export type P0WeakTopicReason =
  | "low_mastery"
  | "summary_exam_miss"
  | "review_failure"
  | "repeated_miss";

export type ReadinessWeakTopicSignal = {
  topicId: string;
  reason: P0WeakTopicReason;
};

export type ComponentInput = {
  calculationReferenceTime: Date;
  topics: ReadinessTopic[];
  answers: ReadinessAnswerEvidence[];
  assessmentSessions: AssessmentSession[];
  /** Parsed latest topic_mastery_stats; calculators must treat this as read-only. */
  masteryByTopic: Readonly<Record<string, TopicMasteryStats>>;
  reviewOutcomes: ReadinessReviewOutcome[];
  weakTopicSignals?: ReadinessWeakTopicSignal[];
};

export type FieldEvidenceResult = {
  fieldId: string;
  weightedEvidenceUnits: number;
  targetEvidenceUnits: number;
  evidenceVolume: number;
  assessmentCoverage: number;
  evidenceSufficiency: number;
};

export type WeakPenaltyResult = {
  topics: WeakTopic[];
  penalty: number;
};

export type ConfidenceInputs = {
  uniqueQuestionCount: number;
  weightedEvidenceUnits: number;
  evidenceVolume: number;
  assessmentCoverage: number;
  fieldEvidence: FieldEvidenceResult[];
  threeFieldEvidenceSufficiency: number;
  completedEligibleSummativeSessionCount: number;
  summativeSessionIds: string[];
  summativeSessionSufficiency: number;
};

export type ExamReadinessResult = {
  score: number | null;
  band: ReadinessBand;
  confidence: {
    score: number;
    level: ConfidenceLevel;
    reasons: ReadinessConfidenceReason[];
  };
  fields: ReadinessFieldScore[];
  components: ReadinessComponents;
  calculation: CalculationTrace;
  evidence: EvidenceSummary;
  weakTopics: WeakTopic[];
  primaryImprovement: PrimaryImprovement | null;
  modelVersion: string;
  examSchemeVersion: string;
  calculationReferenceTime: string;
  calculatedAt: string;
  validUntil: string | null;
  snapshotDate: string;
};
