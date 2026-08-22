export type FirstAttemptState = "first" | "seen" | "unknown";
export type ReadinessBand = "measuring" | "needs_work" | "approaching" | "ready" | "stable";
export type ConfidenceLevel = "low" | "medium" | "high";

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
