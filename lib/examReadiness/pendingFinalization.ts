import type {
  AuthenticatedQuestionExposureResult,
  CompleteAssessmentSessionInput,
  QuestionAttemptInput,
} from "@/lib/userSession";

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
  let frozen = freeze(pending);

  if (frozen.exposureResult === undefined) {
    const exposureResult = await stages.saveAttempts(frozen.attempts);
    if (!isAuthenticatedExposureResult(exposureResult)) {
      throw new Error("Assessment attempt save did not acknowledge authoritative exposure");
    }
    frozen = freeze({ ...frozen, exposureResult });
  }

  if (frozen.completionAcknowledged !== true) {
    await stages.completeSession(frozen.completion);
    frozen = freeze({ ...frozen, completionAcknowledged: true });
  }

  const exposureResult = frozen.exposureResult;
  if (exposureResult === undefined) {
    throw new Error("Assessment exposure acknowledgement was not persisted");
  }

  if (!Object.hasOwn(frozen, "nextState")) {
    const nextState = stages.deriveNextState({
      baseState: frozen.baseState,
      result: frozen.result,
      exposureResult,
      completion: frozen.completion,
    });
    frozen = freeze({ ...frozen, nextState });
  }

  if (frozen.progressAcknowledged !== true) {
    const progressSaved = await stages.saveProgress({
      nextState: frozen.nextState as TNext,
      exposureResult,
      sessionId: frozen.sessionId,
    });
    if (!progressSaved) {
      throw new Error("Assessment progress finalization was not acknowledged");
    }
    frozen = freeze({ ...frozen, progressAcknowledged: true });
  }

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

export function clearPendingAssessmentFinalization(sessionId: string): void {
  if (!isBrowser() || !isNonEmptyString(sessionId)) return;
  try {
    window.localStorage.removeItem(pendingAssessmentFinalizationStorageKey(sessionId));
  } catch {
    // Leaving the frozen record in place is safer than treating an unacknowledged
    // finalization as complete when browser storage is unavailable.
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
    || !Object.hasOwn(value, "baseState")
    || value.baseState === undefined
    || !Object.hasOwn(value, "result")
    || value.result === undefined
    || (value.completionAcknowledged !== undefined && value.completionAcknowledged !== true)
    || (value.progressAcknowledged !== undefined && value.progressAcknowledged !== true)
  ) return false;
  return value.exposureResult === undefined
    || (isAuthenticatedExposureResult(value.exposureResult)
      && hasExactAuthoritativeExposures(value.exposureResult, value.attempts));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
    && optionalString(value.answeredAt)
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

function optionalFiniteNumber(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "number" && Number.isFinite(value));
}

function isCompletion(value: unknown, sessionId: string): value is CompleteAssessmentSessionInput {
  if (!isRecord(value)) return false;
  return value.action === "complete"
    && value.sessionId === sessionId
    && typeof value.completedAt === "string"
    && value.completedAt.length > 0
    && Array.isArray(value.answers)
    && value.answers.every(isAssessmentAnswer);
}

function isAssessmentAnswer(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.idempotencyKey)
    && isNonEmptyString(value.canonicalQuestionId)
    && isNonEmptyString(value.topicId)
    && typeof value.isCorrect === "boolean"
    && typeof value.answeredAt === "string"
    && value.answeredAt.length > 0;
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
    && (value.firstAttemptAt === null || typeof value.firstAttemptAt === "string")
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
