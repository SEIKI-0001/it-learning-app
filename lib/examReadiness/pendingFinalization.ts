import type {
  AuthenticatedQuestionExposureResult,
  CompleteAssessmentSessionInput,
  QuestionAttemptInput,
} from "@/lib/userSession";
import { isStrictOffsetIsoTimestamp } from "@/lib/strictIsoTimestamp";
import type { AppState, UserAnswer } from "@/types";

export type AssessmentFinalizationSource =
  | "checkpoint"
  | "summary"
  | "mock"
  | "official_past";

export type PendingAssessmentFinalization<TBase, TNext, TResult> = {
  version: 1;
  sessionId: string;
  source: AssessmentFinalizationSource;
  attempts: QuestionAttemptInput[];
  completion: CompleteAssessmentSessionInput;
  baseState: TBase;
  exposureResult?: AuthenticatedQuestionExposureResult;
  completionAcknowledged?: true;
  nextState?: TNext;
  progressAcknowledged?: true;
  result: TResult;
};

export type PendingAssessmentFinalizationStages<TBase, TNext, TResult> = {
  /**
   * Freezes every acknowledgement transition. Official past exams use their
   * existing session record here so finalization never has two pending stores.
   */
  freeze?: (
    value: PendingAssessmentFinalization<TBase, TNext, TResult>,
  ) => PendingAssessmentFinalization<TBase, TNext, TResult>;
  /**
   * Each delivery surface owns the complete shape of its frozen base/result/P0
   * values. The shared machine invokes this before it can execute a remote
   * stage and after every durable acknowledgement transition.
   */
  validate?: (
    value: PendingAssessmentFinalization<TBase, TNext, TResult>,
  ) => boolean;
  /**
   * Rebuilds the display/result payload from the immutable request frame.
   * A local result is never authoritative input to P0 derivation.
   */
  rederiveResult?: (params: {
    baseState: TBase;
    attempts: QuestionAttemptInput[];
    completion: CompleteAssessmentSessionInput;
    result: TResult;
    sessionId: string;
  }) => TResult;
  saveAttempts: (
    attempts: QuestionAttemptInput[],
  ) => Promise<AuthenticatedQuestionExposureResult>;
  completeSession: (completion: CompleteAssessmentSessionInput) => Promise<void>;
  deriveNextState: (params: {
    baseState: TBase;
    result: TResult;
    exposureResult: AuthenticatedQuestionExposureResult;
    completion: CompleteAssessmentSessionInput;
  }) => TNext;
  saveProgress: (params: {
    nextState: TNext;
    exposureResult: AuthenticatedQuestionExposureResult;
    sessionId: string;
  }) => Promise<boolean>;
};

export async function resumePendingAssessmentFinalization<TBase, TNext, TResult>(
  pending: PendingAssessmentFinalization<TBase, TNext, TResult>,
  stages: PendingAssessmentFinalizationStages<TBase, TNext, TResult>,
): Promise<PendingAssessmentFinalization<TBase, TNext, TResult>> {
  const freeze = stages.freeze ?? freezePendingAssessmentFinalization;
  const freezeValidated = (
    value: PendingAssessmentFinalization<TBase, TNext, TResult>,
  ): PendingAssessmentFinalization<TBase, TNext, TResult> => {
    assertValidPendingAssessmentFinalization(value, stages.validate);
    const frozen = freeze(value);
    assertValidPendingAssessmentFinalization(frozen, stages.validate);
    return frozen;
  };
  // Validate cross-field invariants before a replay can reach a remote stage,
  // then replace any locally cached result with its deterministic source-of-
  // truth reconstruction before the first durable transition.
  assertValidPendingAssessmentFinalization(pending, stages.validate);
  const canonicalResult = stages.rederiveResult?.({
    baseState: pending.baseState,
    attempts: pending.attempts,
    completion: pending.completion,
    result: pending.result,
    sessionId: pending.sessionId,
  }) ?? pending.result;
  // Browser acknowledgement fields are never a receipt authority. Retain the
  // immutable request frame only, then replace every receipt/next payload from
  // fresh remote acknowledgements in this resume. This also prevents a forged
  // local P0 snapshot from being persisted again before canonical derivation.
  const requestFrame = { ...pending };
  delete requestFrame.exposureResult;
  delete requestFrame.completionAcknowledged;
  delete requestFrame.nextState;
  delete requestFrame.progressAcknowledged;
  let frozen = freezeValidated({ ...requestFrame, result: canonicalResult });

  // Local acknowledgements are a resume hint only. A browser record is not an
  // authority for assessment receipts, so each resume replays every
  // idempotent remote stage and replaces it with the server's current receipt.
  const exposureResult = await stages.saveAttempts(frozen.attempts);
  if (!isAuthenticatedExposureResult(exposureResult)) {
    throw new Error("Assessment attempt save did not acknowledge authoritative exposure");
  }
  frozen = freezeValidated({ ...frozen, exposureResult });

  await stages.completeSession(frozen.completion);
  frozen = freezeValidated({ ...frozen, completionAcknowledged: true });

  const nextState = stages.deriveNextState({
    baseState: frozen.baseState,
    result: frozen.result,
    exposureResult,
    completion: frozen.completion,
  });
  frozen = freezeValidated({ ...frozen, nextState });

  const progressSaved = await stages.saveProgress({
    nextState,
    exposureResult,
    sessionId: frozen.sessionId,
  });
  if (!progressSaved) {
    throw new Error("Assessment progress finalization was not acknowledged");
  }
  frozen = freezeValidated({ ...frozen, progressAcknowledged: true });

  return frozen;
}

const STORAGE_PREFIX = "fequest:assessmentFinalization:v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function pendingAssessmentFinalizationStorageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}:${sessionId}`;
}

export function loadPendingAssessmentFinalization(
  sessionId: string,
  expectedSource?: AssessmentFinalizationSource,
): PendingAssessmentFinalization<unknown, unknown, unknown> | null {
  if (!isBrowser() || !isNonEmptyString(sessionId)) return null;
  try {
    const raw = window.localStorage.getItem(pendingAssessmentFinalizationStorageKey(sessionId));
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidPendingAssessmentFinalization(parsed, sessionId, expectedSource) ? parsed : null;
  } catch {
    return null;
  }
}

export function savePendingAssessmentFinalization(
  value: PendingAssessmentFinalization<unknown, unknown, unknown>,
): void {
  if (!isBrowser() || !isValidPendingAssessmentFinalization(value, value.sessionId)) {
    throw new Error("Cannot persist a malformed assessment finalization");
  }
  try {
    window.localStorage.setItem(
      pendingAssessmentFinalizationStorageKey(value.sessionId),
      JSON.stringify(value),
    );
  } catch {
    throw new Error("Cannot persist assessment finalization");
  }
}

export function clearPendingAssessmentFinalization(sessionId: string): boolean {
  if (!isBrowser() || !isNonEmptyString(sessionId)) return false;
  const key = pendingAssessmentFinalizationStorageKey(sessionId);
  try {
    window.localStorage.removeItem(key);
    return window.localStorage.getItem(key) === null;
  } catch {
    // Leaving the frozen record in place is safer than treating an unacknowledged
    // finalization as complete when browser storage is unavailable.
    return false;
  }
}

/** Finds a frozen finalization for a delivery surface without trusting an index. */
export function findPendingAssessmentFinalization(
  source: AssessmentFinalizationSource,
  matches?: (value: PendingAssessmentFinalization<unknown, unknown, unknown>) => boolean,
): PendingAssessmentFinalization<unknown, unknown, unknown> | null {
  if (!isBrowser()) return null;
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(`${STORAGE_PREFIX}:`)) continue;
      const sessionId = key.slice(`${STORAGE_PREFIX}:`.length);
      const value = loadPendingAssessmentFinalization(sessionId, source);
      if (value !== null && (matches === undefined || matches(value))) return value;
    }
  } catch {
    return null;
  }
  return null;
}

export function isValidPendingAssessmentFinalization(
  value: unknown,
  sessionId: string,
  expectedSource?: AssessmentFinalizationSource,
): value is PendingAssessmentFinalization<unknown, unknown, unknown> {
  if (!isRecord(value)) return false;
  if (
    value.version !== 1
    || value.sessionId !== sessionId
    || !isNonEmptyString(value.sessionId)
    || !isSource(value.source)
    || (expectedSource !== undefined && value.source !== expectedSource)
    || !Array.isArray(value.attempts)
    || value.attempts.length === 0
    || !value.attempts.every(isQuestionAttempt)
    || new Set(value.attempts.map((attempt) => attempt.questionId)).size !== value.attempts.length
    || !value.attempts.every((attempt) => attempt.attemptGroupId === sessionId)
    || !isCompletion(value.completion, sessionId)
    || !hasCompletionAnswersMatchingAttempts(value.completion, value.attempts, sessionId)
    || !Object.hasOwn(value, "baseState")
    || value.baseState === undefined
    || !Object.hasOwn(value, "result")
    || value.result === undefined
    || (value.completionAcknowledged !== undefined && value.completionAcknowledged !== true)
    || (value.progressAcknowledged !== undefined && value.progressAcknowledged !== true)
  ) return false;
  const hasExposure = value.exposureResult !== undefined
    && isAuthenticatedExposureResult(value.exposureResult)
    && hasExactAuthoritativeExposures(value.exposureResult, value.attempts);
  const hasNextState = Object.hasOwn(value, "nextState");
  if (hasNextState && value.nextState === undefined) return false;
  if (value.completionAcknowledged === true && !hasExposure) return false;
  if (hasNextState && (!hasExposure || value.completionAcknowledged !== true)) return false;
  if (
    value.progressAcknowledged === true
    && (!hasExposure || value.completionAcknowledged !== true || !hasNextState)
  ) return false;
  return value.exposureResult === undefined || hasExposure;
}

function assertValidPendingAssessmentFinalization<TBase, TNext, TResult>(
  value: PendingAssessmentFinalization<TBase, TNext, TResult>,
  validate: PendingAssessmentFinalizationStages<TBase, TNext, TResult>["validate"],
): void {
  if (
    !isValidPendingAssessmentFinalization(value, value.sessionId, value.source)
    || (validate !== undefined && !validate(value))
  ) {
    throw new Error("Cannot persist a malformed assessment finalization");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * The frozen runners need a stable subset of AppState, not a permissive cast
 * from localStorage. These are every nested fields the P0 recorders read or
 * preserve, including timestamps that are later replayed into P0 evidence.
 */
export function isValidAssessmentAppState(value: unknown): value is AppState {
  if (!isRecord(value) || !isRecord(value.progress) || !Array.isArray(value.answers)) return false;
  return value.answers.every(isValidAssessmentUserAnswer)
    && isValidAssessmentProgress(value.progress)
    && (value.profile === undefined || isRecord(value.profile));
}

export function isValidAssessmentUserAnswers(value: unknown): value is UserAnswer[] {
  return Array.isArray(value) && value.every(isValidAssessmentUserAnswer);
}

function isValidAssessmentUserAnswer(value: unknown): value is UserAnswer {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.questionId)
    && (value.selectedChoice === undefined || isChoiceKey(value.selectedChoice))
    && typeof value.isCorrect === "boolean"
    && isStrictOffsetIsoTimestamp(value.answeredAt)
    && isNonEmptyString(value.tag)
    && (value.topicId === undefined || isNonEmptyString(value.topicId));
}

function isValidAssessmentProgress(value: Record<string, unknown>): boolean {
  return isFiniteNumber(value.level)
    && isFiniteNumber(value.exp)
    && isFiniteNumber(value.streakCount)
    && isStringArray(value.weakTags)
    && isStringArray(value.completedTopics)
    && isFiniteNumberRecord(value.topicMastery)
    && (value.topicMasteryStats === undefined || isValidTopicMasteryStats(value.topicMasteryStats))
    && Array.isArray(value.reviewQueue)
    && value.reviewQueue.every(isValidReviewItem)
    && (value.weeklyPlan === undefined || value.weeklyPlan === null || isValidWeeklyPlan(value.weeklyPlan))
    && (value.lastPlayedAt === undefined || isStrictOffsetIsoTimestamp(value.lastPlayedAt))
    && isFiniteNumber(value.currentDay)
    && Array.isArray(value.completedDays)
    && value.completedDays.every((day) => Number.isInteger(day) && day >= 0)
    && (value.checkpointProgress === undefined || isValidCheckpointProgress(value.checkpointProgress));
}

function isValidTopicMasteryStats(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every((stat) => {
    if (!isRecord(stat)) return false;
    return isNonEmptyString(stat.topicId)
      && isFiniteNumber(stat.masteryScore)
      && isStrictOffsetIsoTimestamp(stat.lastEvaluatedAt)
      && isNonNegativeInteger(stat.correctCount)
      && isNonNegativeInteger(stat.incorrectCount)
      && isNonNegativeInteger(stat.reviewSuccessCount)
      && Array.isArray(stat.recentEvidence)
      && stat.recentEvidence.every(isValidTopicMasteryEvidence);
  });
}

function isValidTopicMasteryEvidence(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.questionId)
    && isValidLearningEvidenceKind(value.kind)
    && typeof value.isCorrect === "boolean"
    && isStrictOffsetIsoTimestamp(value.answeredAt)
    && typeof value.isFirstSeen === "boolean"
    && (value.exposureState === undefined || isExposureState(value.exposureState));
}

function isValidReviewItem(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.topicId)
    && isStrictOffsetIsoTimestamp(value.dueAt)
    && isNonEmptyString(value.reason)
    && (value.confirmationCount === undefined || isNonNegativeInteger(value.confirmationCount))
    && (value.reviewStage === undefined || isNonNegativeInteger(value.reviewStage))
    && (value.lastReviewedAt === undefined || isStrictOffsetIsoTimestamp(value.lastReviewedAt))
    && (value.reasonCode === undefined || isReviewReasonCode(value.reasonCode));
}

function isValidWeeklyPlan(value: unknown): boolean {
  return isRecord(value)
    && isDateOnly(value.weekStartDate)
    && isStringArray(value.topicIds)
    && isStringArray(value.reviewIds);
}

function isValidCheckpointProgress(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isCheckpointId(value.currentCheckpointId)
    && Array.isArray(value.clearedCheckpointIds)
    && value.clearedCheckpointIds.every(isCheckpointId)
    && Array.isArray(value.earnedBadges)
    && value.earnedBadges.every((badge) => isRecord(badge)
      && isNonEmptyString(badge.badgeId)
      && isStrictOffsetIsoTimestamp(badge.earnedAt)
      && (badge.fromDrop === undefined || typeof badge.fromDrop === "boolean"))
    && Array.isArray(value.badgeFragments)
    && value.badgeFragments.every((fragment) => isRecord(fragment)
      && isNonEmptyString(fragment.fragmentId)
      && isNonNegativeInteger(fragment.count))
    && Array.isArray(value.finalExamAttempts)
    && value.finalExamAttempts.every((attempt) => isRecord(attempt)
      && isCheckpointId(attempt.checkpointId)
      && typeof attempt.passed === "boolean"
      && isNonNegativeInteger(attempt.correct)
      && isNonNegativeInteger(attempt.total)
      && isStrictOffsetIsoTimestamp(attempt.attemptedAt)
      && isStringArray(attempt.wrongTopicIds))
    && isNonNegativeInteger(value.rarePityCount)
    && (value.streakMeta === undefined || isValidStreakMeta(value.streakMeta))
    && (value.dailyQuests === undefined || isValidDailyQuests(value.dailyQuests));
}

function isValidStreakMeta(value: unknown): boolean {
  return isRecord(value)
    && Array.isArray(value.claimedMilestones)
    && value.claimedMilestones.every(isNonNegativeInteger)
    && isNonNegativeInteger(value.shieldsGranted)
    && isNonNegativeInteger(value.shieldsUsed)
    && isNonNegativeInteger(value.longestStreak)
    && (value.lastShieldUsedAt === undefined || isStrictOffsetIsoTimestamp(value.lastShieldUsedAt));
}

function isValidDailyQuests(value: unknown): boolean {
  return isRecord(value)
    && isDateOnly(value.date)
    && Array.isArray(value.quests)
    && value.quests.every((quest) => isRecord(quest)
      && isNonEmptyString(quest.id)
      && isNonNegativeInteger(quest.goal)
      && isNonNegativeInteger(quest.progress))
    && typeof value.claimed === "boolean";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isFiniteNumberRecord(value: unknown): boolean {
  return isRecord(value) && Object.values(value).every(isFiniteNumber);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isChoiceKey(value: unknown): boolean {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function isExposureState(value: unknown): boolean {
  return value === "first" || value === "seen" || value === "unknown";
}

function isValidLearningEvidenceKind(value: unknown): boolean {
  return value === "confirmation"
    || value === "review"
    || value === "summary_exam"
    || value === "mock_exam"
    || value === "past_exam"
    || value === "checkpoint";
}

function isReviewReasonCode(value: unknown): boolean {
  return value === "scheduled"
    || value === "low_mastery"
    || value === "summary_exam_miss"
    || value === "review_failure"
    || value === "repeated_miss";
}

function isCheckpointId(value: unknown): boolean {
  return value === "cp0" || value === "cp1" || value === "cp2" || value === "cp3"
    || value === "cp4" || value === "cp5" || value === "cp6";
}

function isDateOnly(value: unknown): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isSource(value: unknown): value is AssessmentFinalizationSource {
  return value === "checkpoint"
    || value === "summary"
    || value === "mock"
    || value === "official_past";
}

function isQuestionAttempt(value: unknown): value is QuestionAttemptInput {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.questionId)
    && isQuestionType(value.questionType)
    && isNonEmptyString(value.topicId)
    && typeof value.isCorrect === "boolean"
    && optionalString(value.selectedAnswer)
    && optionalString(value.mistakeReason)
    && optionalFiniteNumber(value.timeSpentSeconds)
    && optionalString(value.sourceTaskId)
    && optionalStrictOffsetIsoTimestamp(value.answeredAt)
    && (value.attemptMode === undefined
      || value.attemptMode === null
      || value.attemptMode === "practice"
      || value.attemptMode === "exam")
    && optionalString(value.attemptGroupId);
}

function isQuestionType(value: unknown): value is QuestionAttemptInput["questionType"] {
  return value === "topic_quiz"
    || value === "exam_level"
    || value === "mini_exam"
    || value === "mock_exam"
    || value === "theme_exam"
    || value === "official_past";
}

function optionalString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function optionalStrictOffsetIsoTimestamp(value: unknown): boolean {
  return value === undefined || value === null || isStrictOffsetIsoTimestamp(value);
}

function optionalFiniteNumber(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "number" && Number.isFinite(value));
}

function isCompletion(value: unknown, sessionId: string): value is CompleteAssessmentSessionInput {
  if (!isRecord(value)) return false;
  return value.action === "complete"
    && value.sessionId === sessionId
    && isStrictOffsetIsoTimestamp(value.completedAt)
    && Array.isArray(value.answers)
    && value.answers.every(isAssessmentAnswer);
}

function isAssessmentAnswer(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.idempotencyKey)
    && isNonEmptyString(value.canonicalQuestionId)
    && isNonEmptyString(value.topicId)
    && typeof value.isCorrect === "boolean"
    && isStrictOffsetIsoTimestamp(value.answeredAt);
}

/**
 * Completion is a projection of the immutable attempt batch: exactly the
 * answered attempts, with the same identity, topic, correctness, timestamp,
 * and idempotency key. Rejecting a mismatch before the first retry prevents a
 * locally forged completion from being replayed against a valid session.
 */
function hasCompletionAnswersMatchingAttempts(
  completion: CompleteAssessmentSessionInput,
  attempts: QuestionAttemptInput[],
  sessionId: string,
): boolean {
  const attemptsByQuestionId = new Map(attempts.map((attempt) => [attempt.questionId, attempt]));
  const answeredAttempts = attempts.filter(
    (attempt) => attempt.selectedAnswer !== undefined && attempt.selectedAnswer !== null,
  );
  if (completion.answers.length !== answeredAttempts.length) return false;
  const completionIds = new Set(completion.answers.map((answer) => answer.canonicalQuestionId));
  if (completionIds.size !== completion.answers.length) return false;
  return completion.answers.every((answer) => {
    const attempt = attemptsByQuestionId.get(answer.canonicalQuestionId);
    return attempt !== undefined
      && attempt.selectedAnswer !== undefined
      && attempt.selectedAnswer !== null
      && answer.idempotencyKey === `assessment:${sessionId}:${attempt.questionId}`
      && answer.topicId === attempt.topicId
      && answer.isCorrect === attempt.isCorrect
      && answer.answeredAt === attempt.answeredAt;
  });
}

function isAuthenticatedExposureResult(value: unknown): value is AuthenticatedQuestionExposureResult {
  if (!isRecord(value) || value.authState !== "authenticated" || !isNonEmptyString(value.userId)) {
    return false;
  }
  if (!isRecord(value.exposures)) return false;
  return Object.values(value.exposures).every(isAuthoritativeExposure);
}

function hasExactAuthoritativeExposures(
  exposureResult: AuthenticatedQuestionExposureResult,
  attempts: QuestionAttemptInput[],
): boolean {
  const attemptIds = new Set(attempts.map((attempt) => attempt.questionId));
  const exposureIds = Object.keys(exposureResult.exposures);
  return exposureIds.length === attemptIds.size
    && exposureIds.every((questionId) => {
      const exposure = exposureResult.exposures[questionId];
      return attemptIds.has(questionId) && exposure.questionId === questionId;
    });
}

function isAuthoritativeExposure(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.questionId)
    && (value.state === "first" || value.state === "seen")
    && typeof value.attemptedBefore === "boolean"
    && (value.firstAttemptAt === null || isStrictOffsetIsoTimestamp(value.firstAttemptAt))
    && typeof value.attemptCount === "number"
    && Number.isInteger(value.attemptCount)
    && value.attemptCount >= 0;
}

function freezePendingAssessmentFinalization<TBase, TNext, TResult>(
  value: PendingAssessmentFinalization<TBase, TNext, TResult>,
): PendingAssessmentFinalization<TBase, TNext, TResult> {
  savePendingAssessmentFinalization(value);
  const frozen = loadPendingAssessmentFinalization(value.sessionId, value.source);
  if (frozen === null) {
    throw new Error("Assessment finalization could not be frozen");
  }
  return frozen as PendingAssessmentFinalization<TBase, TNext, TResult>;
}
