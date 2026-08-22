import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildReadinessTopicCatalog,
  ExamReadinessCatalogError,
  resolveReadinessQuestionContext,
} from "@/lib/examReadiness/catalog";
import type { ExamReadinessEvidenceBundle } from "@/lib/examReadiness/calculator";
import {
  normalizeEvidenceKind,
  normalizeFirstAttemptState,
} from "@/lib/examReadiness/evidence";
import { getWeakTopics } from "@/lib/learningLoop";
import type { ReviewItem, TopicMasteryStats } from "@/types";
import type {
  AssessmentSession,
  ExamReadinessResult,
  FirstAttemptState,
  ReadinessAnswerEvidence,
  ReadinessEvidenceKind,
  ReadinessReviewOutcome,
} from "@/types/examReadiness";

const MAX_EVIDENCE_READ_ATTEMPTS = 3;
const DAY_MS = 86_400_000;

export type ExamReadinessRepositoryErrorCode =
  | "evidence_query_failed"
  | "evidence_invalid"
  | "evidence_revision_unstable"
  | "stored_result_invalid"
  | "evidence_event_registration_failed"
  | "invalid_argument";

export class ExamReadinessRepositoryError extends Error {
  readonly code: ExamReadinessRepositoryErrorCode;

  constructor(code: ExamReadinessRepositoryErrorCode, message: string) {
    super(message);
    this.name = "ExamReadinessRepositoryError";
    this.code = code;
  }
}

type QueryResponse = { data: unknown; error: unknown };

type ProgressEvidence = {
  masteryByTopic: Record<string, TopicMasteryStats>;
  reviewQueue: ReviewItem[];
};

type P0Evidence = TopicMasteryStats["recentEvidence"][number];

/**
 * Service-role repository boundary. Callers must pass an already authenticated internal user ID;
 * request-body identities are resolved before entering this module.
 */
export async function loadExamReadinessEvidence(
  supabase: SupabaseClient,
  userId: string,
): Promise<ExamReadinessEvidenceBundle> {
  requireNonEmpty(userId, "userId");

  for (let attempt = 0; attempt < MAX_EVIDENCE_READ_ATTEMPTS; attempt += 1) {
    const revisionBefore = await readEvidenceRevision(supabase, userId);
    const evidence = await readEvidenceRows(supabase, userId);
    const revisionAfter = await readEvidenceRevision(supabase, userId);
    if (revisionBefore === revisionAfter) {
      return assembleEvidenceBundle(evidence, userId, revisionAfter);
    }
  }

  throw new ExamReadinessRepositoryError(
    "evidence_revision_unstable",
    "Exam readiness evidence changed during three consecutive reads",
  );
}

export async function getStoredCurrentReadiness(
  supabase: SupabaseClient,
  userId: string,
): Promise<ExamReadinessResult | null> {
  requireNonEmpty(userId, "userId");
  const response = await supabase
    .from("exam_readiness_current")
    .select("result")
    .eq("user_id", userId)
    .maybeSingle() as QueryResponse;
  ensureQuerySucceeded(response, "exam_readiness_current");
  if (response.data === null) return null;
  if (!isRecord(response.data) || !("result" in response.data)) {
    throw invalidStoredResult();
  }
  return parseStoredResult(response.data.result);
}

export async function registerEvidenceEvent(
  supabase: SupabaseClient,
  userId: string,
  eventKey: string,
): Promise<number> {
  requireNonEmpty(userId, "userId");
  requireNonEmpty(eventKey, "eventKey");
  const response = await supabase.rpc("register_exam_readiness_evidence", {
    p_user_id: userId,
    p_event_key: eventKey,
  }) as QueryResponse;
  if (response.error) {
    throw new ExamReadinessRepositoryError(
      "evidence_event_registration_failed",
      "Could not register Exam Readiness evidence",
    );
  }
  return parseRevision(response.data, "evidence_event_registration_failed");
}

async function readEvidenceRevision(supabase: SupabaseClient, userId: string): Promise<number> {
  const response = await supabase
    .from("exam_readiness_evidence_state")
    .select("revision")
    .eq("user_id", userId)
    .maybeSingle() as QueryResponse;
  ensureQuerySucceeded(response, "exam_readiness_evidence_state");
  if (response.data === null) return 0;
  if (!isRecord(response.data)) {
    throw invalidEvidence("Invalid evidence revision row");
  }
  return parseRevision(response.data.revision, "evidence_invalid");
}

async function readEvidenceRows(supabase: SupabaseClient, userId: string) {
  const [progress, questionAttempts, sessions, sessionAnswers] = await Promise.all([
    supabase
      .from("user_progress")
      .select("topic_mastery_stats, review_queue")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("question_attempts")
      .select(
        "attempt_id, question_id, question_type, topic_id, is_correct, answered_at, official_exam_field, is_first_attempt, attempt_group_id",
      )
      .eq("user_id", userId)
      .order("answered_at", { ascending: true }),
    supabase
      .from("assessment_sessions")
      .select(
        "session_id, user_id, source, mode, status, started_at, completed_at, question_count, answered_count, correct_count, first_count, seen_count, unknown_count",
      )
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .order("session_id", { ascending: true }),
    supabase
      .from("assessment_session_answers")
      .select(
        "answer_id, idempotency_key, session_id, canonical_question_id, topic_id, field_id, is_correct, first_attempt_state, answered_at",
      )
      .eq("user_id", userId)
      .order("answered_at", { ascending: true }),
  ]) as [QueryResponse, QueryResponse, QueryResponse, QueryResponse];

  ensureQuerySucceeded(progress, "user_progress");
  ensureQuerySucceeded(questionAttempts, "question_attempts");
  ensureQuerySucceeded(sessions, "assessment_sessions");
  ensureQuerySucceeded(sessionAnswers, "assessment_session_answers");
  return { progress, questionAttempts, sessions, sessionAnswers };
}

function assembleEvidenceBundle(
  rows: Awaited<ReturnType<typeof readEvidenceRows>>,
  userId: string,
  evidenceRevision: number,
): ExamReadinessEvidenceBundle {
  try {
    const progress = parseProgressEvidence(rows.progress.data);
    const assessmentSessions = parseAssessmentSessions(rows.sessions.data);
    const sessionById = new Map(assessmentSessions.map((session) => [session.sessionId, session]));
    const p0Answers = parseP0Answers(progress.masteryByTopic);
    const attemptAnswers = parseQuestionAttempts(rows.questionAttempts.data);
    const sessionAnswers = parseSessionAnswers(
      rows.sessionAnswers.data,
      sessionById,
      attemptAnswers,
    );
    const reconciledAttemptAnswers = attemptAnswers.map((attempt) => {
      const matchingSessionAnswer = sessionAnswers.find(
        (sessionAnswer) => isSamePersistedAnswerFact(attempt, sessionAnswer),
      );
      return matchingSessionAnswer === undefined
        ? attempt
        : { ...attempt, idempotencyKey: matchingSessionAnswer.idempotencyKey };
    });

    return {
      evidenceRevision,
      topics: buildReadinessTopicCatalog(),
      answers: [...p0Answers, ...reconciledAttemptAnswers, ...sessionAnswers],
      assessmentSessions,
      masteryByTopic: progress.masteryByTopic,
      reviewOutcomes: parseReviewOutcomes(progress),
      weakTopicSignals: getWeakTopics(progress.masteryByTopic).map((weak) => ({
        topicId: weak.topicId,
        reason: weak.reason,
      })),
    };
  } catch (error) {
    if (error instanceof ExamReadinessRepositoryError) throw error;
    if (error instanceof ExamReadinessCatalogError) {
      throw invalidEvidence(error.message);
    }
    throw invalidEvidence(`Invalid evidence for user ${userId}`);
  }
}

function parseProgressEvidence(value: unknown): ProgressEvidence {
  if (value === null) return { masteryByTopic: {}, reviewQueue: [] };
  if (!isRecord(value)) throw invalidEvidence("Invalid user_progress evidence row");
  return {
    masteryByTopic: parseMasteryByTopic(value.topic_mastery_stats ?? {}),
    reviewQueue: parseReviewQueue(value.review_queue ?? []),
  };
}

function parseMasteryByTopic(value: unknown): Record<string, TopicMasteryStats> {
  if (!isRecord(value)) throw invalidEvidence("Invalid topic_mastery_stats");
  const parsed: Record<string, TopicMasteryStats> = {};
  for (const [topicId, raw] of Object.entries(value)) {
    if (!isRecord(raw) || !Array.isArray(raw.recentEvidence)) {
      throw invalidEvidence(`Invalid Topic Mastery for ${topicId}`);
    }
    if (
      raw.topicId !== topicId
      || !isFiniteNumber(raw.masteryScore)
      || !isIsoString(raw.lastEvaluatedAt)
      || !isNonNegativeInteger(raw.correctCount)
      || !isNonNegativeInteger(raw.incorrectCount)
      || !isNonNegativeInteger(raw.reviewSuccessCount)
    ) {
      throw invalidEvidence(`Invalid Topic Mastery for ${topicId}`);
    }
    const recentEvidence = raw.recentEvidence.map((item) => parseP0Evidence(item, topicId));
    parsed[topicId] = {
      topicId,
      masteryScore: raw.masteryScore,
      lastEvaluatedAt: raw.lastEvaluatedAt,
      correctCount: raw.correctCount,
      incorrectCount: raw.incorrectCount,
      reviewSuccessCount: raw.reviewSuccessCount,
      recentEvidence,
    };
  }
  return parsed;
}

function parseP0Evidence(value: unknown, topicId: string): P0Evidence {
  if (!isRecord(value)) throw invalidEvidence(`Invalid P0 evidence for ${topicId}`);
  if (
    !isNonEmptyString(value.questionId)
    || !isLegacyEvidenceKind(value.kind)
    || typeof value.isCorrect !== "boolean"
    || typeof value.isFirstSeen !== "boolean"
    || !isIsoString(value.answeredAt)
    || (value.exposureState !== undefined && !isFirstAttemptState(value.exposureState))
  ) {
    throw invalidEvidence(`Invalid P0 evidence for ${topicId}`);
  }
  return value as P0Evidence;
}

function parseReviewQueue(value: unknown): ReviewItem[] {
  if (!Array.isArray(value)) throw invalidEvidence("Invalid review_queue");
  return value.map((raw) => {
    if (
      !isRecord(raw)
      || !isNonEmptyString(raw.topicId)
      || !isIsoString(raw.dueAt)
      || typeof raw.reason !== "string"
      || (raw.reviewStage !== undefined && !isNonNegativeInteger(raw.reviewStage))
      || (raw.lastReviewedAt !== undefined && !isIsoString(raw.lastReviewedAt))
    ) {
      throw invalidEvidence("Invalid review_queue item");
    }
    return raw as ReviewItem;
  });
}

function parseP0Answers(masteryByTopic: Record<string, TopicMasteryStats>) {
  const answers: ReadinessAnswerEvidence[] = [];
  for (const [topicId, mastery] of Object.entries(masteryByTopic)) {
    for (const evidence of mastery.recentEvidence) {
      const kind = normalizeEvidenceKind(evidence.kind);
      const context = resolveReadinessQuestionContext({
        questionId: evidence.questionId,
        topicId,
      });
      answers.push({
        answerId: null,
        idempotencyKey: fallbackEventKey(evidence.questionId, kind, evidence.answeredAt),
        sessionId: null,
        canonicalQuestionId: context.canonicalQuestionId,
        topicId: context.topicId,
        fieldId: context.fieldId,
        kind,
        isCorrect: evidence.isCorrect,
        firstAttemptState: normalizeFirstAttemptState(evidence),
        answeredAt: evidence.answeredAt,
      });
    }
  }
  return answers;
}

function parseQuestionAttempts(value: unknown): ReadinessAnswerEvidence[] {
  if (!Array.isArray(value)) throw invalidEvidence("Invalid question_attempts result");
  return value.map((raw) => {
    if (
      !isRecord(raw)
      || !isNonEmptyString(raw.attempt_id)
      || !isNonEmptyString(raw.question_id)
      || !isNonEmptyString(raw.topic_id)
      || !isQuestionAttemptKind(raw.question_type)
      || typeof raw.is_correct !== "boolean"
      || !isIsoString(raw.answered_at)
      || typeof raw.is_first_attempt !== "boolean"
      || (raw.official_exam_field !== null && raw.official_exam_field !== undefined
        && !isConfiguredField(raw.official_exam_field))
      || (raw.attempt_group_id !== null && raw.attempt_group_id !== undefined
        && typeof raw.attempt_group_id !== "string")
    ) {
      throw invalidEvidence("Invalid question_attempts row");
    }
    const kind = questionAttemptKind(raw.question_type);
    const officialExamFieldId = kind === "official_past"
      ? raw.official_exam_field as string | null | undefined
      : undefined;
    const context = resolveReadinessQuestionContext({
      questionId: raw.question_id,
      topicId: raw.topic_id,
      officialExamFieldId,
    });
    return {
      answerId: raw.attempt_id,
      idempotencyKey: fallbackEventKey(raw.question_id, kind, raw.answered_at),
      sessionId: typeof raw.attempt_group_id === "string" ? raw.attempt_group_id : null,
      canonicalQuestionId: context.canonicalQuestionId,
      topicId: context.topicId,
      fieldId: context.fieldId,
      ...(context.officialExamFieldId === undefined
        ? {}
        : { officialExamFieldId: context.officialExamFieldId }),
      kind,
      isCorrect: raw.is_correct,
      firstAttemptState: raw.is_first_attempt ? "first" : "seen",
      answeredAt: raw.answered_at,
    };
  });
}

function parseAssessmentSessions(value: unknown): AssessmentSession[] {
  if (!Array.isArray(value)) throw invalidEvidence("Invalid assessment_sessions result");
  const sessions = value.map((raw): AssessmentSession => {
    if (
      !isRecord(raw)
      || !isNonEmptyString(raw.session_id)
      || !isNonEmptyString(raw.user_id)
      || !isAssessmentSource(raw.source)
      || !isAssessmentMode(raw.mode)
      || !isAssessmentStatus(raw.status)
      || !isIsoString(raw.started_at)
      || (raw.completed_at !== null && !isIsoString(raw.completed_at))
      || !isNonNegativeInteger(raw.question_count)
      || !isNonNegativeInteger(raw.answered_count)
      || !isNonNegativeInteger(raw.correct_count)
      || !isNonNegativeInteger(raw.first_count)
      || !isNonNegativeInteger(raw.seen_count)
      || !isNonNegativeInteger(raw.unknown_count)
    ) {
      throw invalidEvidence("Invalid assessment_sessions row");
    }
    return {
      sessionId: raw.session_id,
      userId: raw.user_id,
      source: raw.source,
      mode: raw.mode,
      status: raw.status,
      startedAt: raw.started_at,
      completedAt: raw.completed_at,
      questionCount: raw.question_count,
      answeredCount: raw.answered_count,
      correctCount: raw.correct_count,
      firstCount: raw.first_count,
      seenCount: raw.seen_count,
      unknownCount: raw.unknown_count,
    };
  });
  return sessions.sort((left, right) => {
    if (left.completedAt === null && right.completedAt !== null) return 1;
    if (left.completedAt !== null && right.completedAt === null) return -1;
    if (left.completedAt !== null && right.completedAt !== null) {
      const byCompletion = right.completedAt.localeCompare(left.completedAt);
      if (byCompletion !== 0) return byCompletion;
    }
    return left.sessionId.localeCompare(right.sessionId);
  });
}

function parseSessionAnswers(
  value: unknown,
  sessionById: ReadonlyMap<string, AssessmentSession>,
  attemptAnswers: ReadonlyArray<ReadinessAnswerEvidence>,
): ReadinessAnswerEvidence[] {
  if (!Array.isArray(value)) throw invalidEvidence("Invalid assessment_session_answers result");
  return value.map((raw) => {
    if (
      !isRecord(raw)
      || !isNonEmptyString(raw.answer_id)
      || !isNonEmptyString(raw.idempotency_key)
      || !isNonEmptyString(raw.session_id)
      || !isNonEmptyString(raw.canonical_question_id)
      || !isNonEmptyString(raw.topic_id)
      || !isConfiguredField(raw.field_id)
      || typeof raw.is_correct !== "boolean"
      || !isFirstAttemptState(raw.first_attempt_state)
      || !isIsoString(raw.answered_at)
    ) {
      throw invalidEvidence("Invalid assessment_session_answers row");
    }
    const session = sessionById.get(raw.session_id);
    if (session === undefined) {
      throw invalidEvidence(`Assessment answer references missing session ${raw.session_id}`);
    }
    const matchingAttempt = attemptAnswers.find((attempt) =>
      attempt.sessionId === raw.session_id
      && attempt.canonicalQuestionId === raw.canonical_question_id
      && attempt.answeredAt === raw.answered_at
      && attempt.kind === session.source
    );
    const context = resolveReadinessQuestionContext({
      questionId: raw.canonical_question_id,
      topicId: raw.topic_id,
      officialExamFieldId: session.source === "official_past"
        ? matchingAttempt?.officialExamFieldId
        : undefined,
    });
    return {
      answerId: raw.answer_id,
      idempotencyKey: raw.idempotency_key,
      sessionId: raw.session_id,
      canonicalQuestionId: context.canonicalQuestionId,
      topicId: context.topicId,
      fieldId: context.fieldId,
      ...(context.officialExamFieldId === undefined
        ? {}
        : { officialExamFieldId: context.officialExamFieldId }),
      kind: session.source,
      isCorrect: raw.is_correct,
      firstAttemptState: raw.first_attempt_state,
      answeredAt: raw.answered_at,
    };
  });
}

function isSamePersistedAnswerFact(
  left: ReadinessAnswerEvidence,
  right: ReadinessAnswerEvidence,
): boolean {
  return left.sessionId !== null
    && left.sessionId !== undefined
    && left.sessionId === right.sessionId
    && left.canonicalQuestionId === right.canonicalQuestionId
    && left.kind === right.kind
    && left.answeredAt === right.answeredAt;
}

function parseReviewOutcomes(progress: ProgressEvidence): ReadinessReviewOutcome[] {
  return progress.reviewQueue.flatMap((review) => {
    if (review.lastReviewedAt === undefined) return [];
    const mastery = progress.masteryByTopic[review.topicId];
    const latestReview = mastery?.recentEvidence
      .filter((evidence) => evidence.kind === "review")
      .sort((left, right) => right.answeredAt.localeCompare(left.answeredAt))[0];
    if (latestReview === undefined || latestReview.answeredAt !== review.lastReviewedAt) return [];
    const interval = Math.max(
      1,
      Math.round((Date.parse(review.dueAt) - Date.parse(review.lastReviewedAt)) / DAY_MS),
    );
    return [{
      topicId: review.topicId,
      completedAt: review.lastReviewedAt,
      wasDue: true,
      isCorrect: latestReview.isCorrect,
      stage: review.reviewStage ?? 0,
      dueAt: review.dueAt,
      scheduledIntervalDays: interval,
    }];
  });
}

function parseStoredResult(value: unknown): ExamReadinessResult {
  if (!isExamReadinessResult(value)) throw invalidStoredResult();
  return value;
}

function isExamReadinessResult(value: unknown): value is ExamReadinessResult {
  if (!isRecord(value)) return false;
  return (
    isNullableScore(value.score)
    && isOneOf(value.band, ["measuring", "needs_work", "approaching", "ready", "stable"])
    && isConfidence(value.confidence)
    && Array.isArray(value.fields) && value.fields.every(isFieldScore)
    && isComponents(value.components)
    && isCalculation(value.calculation)
    && isEvidenceSummary(value.evidence)
    && Array.isArray(value.weakTopics) && value.weakTopics.every(isWeakTopic)
    && (value.primaryImprovement === null || isPrimaryImprovement(value.primaryImprovement))
    && isNonEmptyString(value.modelVersion)
    && isNonEmptyString(value.examSchemeVersion)
    && isIsoString(value.calculationReferenceTime)
    && isIsoString(value.calculatedAt)
    && (value.validUntil === null || isIsoString(value.validUntil))
    && typeof value.snapshotDate === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(value.snapshotDate)
  );
}

function isConfidence(value: unknown): boolean {
  return isRecord(value)
    && isScore(value.score)
    && isOneOf(value.level, ["low", "medium", "high"])
    && Array.isArray(value.reasons)
    && value.reasons.every((reason) => isRecord(reason)
      && isOneOf(reason.code, [
        "insufficient_evidence",
        "insufficient_coverage",
        "insufficient_field_evidence",
        "insufficient_summative_sessions",
      ])
      && (reason.fieldId === undefined || typeof reason.fieldId === "string")
      && isFiniteNumber(reason.actual)
      && isFiniteNumber(reason.required));
}

function isFieldScore(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.fieldId)
    && isNonEmptyString(value.label)
    && isNullableScore(value.score)
    && isScore(value.evidenceSufficiency)
    && isRecord(value.scoreGate)
    && typeof value.scoreGate.evaluated === "boolean"
    && (value.scoreGate.cap === null || isFiniteNumber(value.scoreGate.cap))
    && (value.scoreGate.reasonCode === null || typeof value.scoreGate.reasonCode === "string");
}

function isComponents(value: unknown): boolean {
  return isRecord(value)
    && isNullableScore(value.firstPerformance)
    && isNullableScore(value.summativePerformance)
    && isNullableScore(value.topicMastery)
    && isNullableScore(value.retention)
    && isScore(value.assessmentCoverage);
}

function isCalculation(value: unknown): boolean {
  return isRecord(value)
    && (value.baseScore === null || isFiniteNumber(value.baseScore))
    && isFiniteNumber(value.weakTopicPenalty)
    && (value.preGateScore === null || isFiniteNumber(value.preGateScore))
    && Array.isArray(value.appliedCaps)
    && value.appliedCaps.every((cap) => isRecord(cap)
      && isOneOf(cap.type, ["field", "confidence"])
      && isFiniteNumber(cap.cap)
      && isNonEmptyString(cap.reasonCode)
      && (cap.fieldId === undefined || typeof cap.fieldId === "string"));
}

function isEvidenceSummary(value: unknown): boolean {
  return isRecord(value)
    && isNonNegativeInteger(value.uniqueQuestionCount)
    && isFiniteNumber(value.weightedEvidenceUnits)
    && isNonNegativeInteger(value.summativeSessionCount)
    && Array.isArray(value.summativeSessionIds)
    && value.summativeSessionIds.every((id) => isNonEmptyString(id))
    && isNonNegativeInteger(value.evidenceRevision);
}

function isWeakTopic(value: unknown): boolean {
  return isRecord(value)
    && isNonEmptyString(value.topicId)
    && isNonEmptyString(value.label)
    && isFiniteNumber(value.importance)
    && isOneOf(value.reason, [
      "low_mastery",
      "repeated_incorrect",
      "unresolved_summative_error",
      "latest_review_failed",
    ])
    && isFiniteNumber(value.penalty)
    && typeof value.penaltyApplied === "boolean";
}

function isPrimaryImprovement(value: unknown): boolean {
  return isRecord(value)
    && isOneOf(value.code, [
      "collect_more_evidence",
      "improve_field",
      "review_weak_topic",
      "improve_retention",
      "take_summative_assessment",
    ])
    && (value.fieldId === undefined || typeof value.fieldId === "string")
    && (value.topicId === undefined || typeof value.topicId === "string");
}

function fallbackEventKey(
  questionId: string,
  kind: ReadinessEvidenceKind,
  answeredAt: string,
): string {
  return `${questionId}\u001f${kind}\u001f${answeredAt}`;
}

function questionAttemptKind(value: string): ReadinessEvidenceKind {
  switch (value) {
    case "topic_quiz":
    case "exam_level":
      return "confirmation";
    case "mini_exam":
      return "checkpoint";
    case "mock_exam":
      return "mock";
    case "theme_exam":
      return "summary";
    case "official_past":
      return "official_past";
  }
  throw invalidEvidence(`Unknown question attempt kind: ${value}`);
}

function parseRevision(value: unknown, code: ExamReadinessRepositoryErrorCode): number {
  const number = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (!isNonNegativeInteger(number) || !Number.isSafeInteger(number)) {
    throw new ExamReadinessRepositoryError(code, "Invalid Exam Readiness evidence revision");
  }
  return number;
}

function ensureQuerySucceeded(response: QueryResponse, table: string): void {
  if (response.error) {
    throw new ExamReadinessRepositoryError(
      "evidence_query_failed",
      `Could not load Exam Readiness evidence from ${table}`,
    );
  }
}

function invalidEvidence(message: string): ExamReadinessRepositoryError {
  return new ExamReadinessRepositoryError("evidence_invalid", message);
}

function invalidStoredResult(): ExamReadinessRepositoryError {
  return new ExamReadinessRepositoryError(
    "stored_result_invalid",
    "Stored Exam Readiness result is malformed or incomplete",
  );
}

function requireNonEmpty(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new ExamReadinessRepositoryError("invalid_argument", `${name} is required`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isIsoString(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isScore(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 100;
}

function isNullableScore(value: unknown): value is number | null {
  return value === null || isScore(value);
}

function isOneOf<T extends string>(value: unknown, candidates: readonly T[]): value is T {
  return typeof value === "string" && candidates.includes(value as T);
}

function isFirstAttemptState(value: unknown): value is FirstAttemptState {
  return isOneOf(value, ["first", "seen", "unknown"]);
}

function isConfiguredField(value: unknown): value is string {
  return isOneOf(value, ["strategy", "management", "technology"]);
}

function isLegacyEvidenceKind(value: unknown): value is P0Evidence["kind"] {
  return isOneOf(value, [
    "confirmation",
    "review",
    "summary_exam",
    "mock_exam",
    "past_exam",
    "checkpoint",
  ]);
}

function isQuestionAttemptKind(value: unknown): value is string {
  return isOneOf(value, [
    "topic_quiz",
    "exam_level",
    "mini_exam",
    "mock_exam",
    "official_past",
    "theme_exam",
  ]);
}

function isAssessmentSource(value: unknown): value is AssessmentSession["source"] {
  return isOneOf(value, ["checkpoint", "summary", "mock", "official_past"]);
}

function isAssessmentMode(value: unknown): value is AssessmentSession["mode"] {
  return isOneOf(value, ["practice", "exam"]);
}

function isAssessmentStatus(value: unknown): value is AssessmentSession["status"] {
  return isOneOf(value, ["in_progress", "completed", "abandoned"]);
}
