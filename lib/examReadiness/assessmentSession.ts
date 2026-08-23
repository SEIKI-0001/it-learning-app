import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveReadinessQuestionContext,
} from "@/lib/examReadiness/catalog";
import { getQuestionById } from "@/lib/questionBank";
import type { AssessmentSession, FirstAttemptState } from "@/types/examReadiness";
import {
  isSameStrictIsoInstant,
  isStrictOffsetIsoTimestamp,
} from "@/lib/strictIsoTimestamp";

export type StartAssessmentSessionInput = {
  action: "start";
  sessionId: string;
  source: AssessmentSession["source"];
  mode: AssessmentSession["mode"];
  startedAt: string;
  questionCount: number;
};

export type CompleteAssessmentSessionInput = {
  action: "complete";
  sessionId: string;
  completedAt: string;
  answers: Array<{
    idempotencyKey: string;
    canonicalQuestionId: string;
    topicId: string;
    isCorrect: boolean;
    answeredAt: string;
  }>;
};

export type AbandonAssessmentSessionInput = {
  action: "abandon";
  sessionId: string;
  completedAt: string;
};

export type AssessmentSessionActionInput =
  | StartAssessmentSessionInput
  | CompleteAssessmentSessionInput
  | AbandonAssessmentSessionInput;

export type AssessmentSessionPersistenceErrorCode =
  | "invalid_session"
  | "session_not_found"
  | "session_conflict"
  | "persistence_failed";

export class AssessmentSessionPersistenceError extends Error {
  constructor(
    readonly code: AssessmentSessionPersistenceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AssessmentSessionPersistenceError";
  }
}

type QueryResult = { data: unknown; error: unknown };

type AttemptRow = {
  attempt_id: string;
  question_id: string;
  question_type: string;
  topic_id: string;
  is_correct: boolean;
  answered_at: string;
  official_exam_field: string | null;
  is_first_attempt: boolean;
  attempt_group_id: string;
};

type RpcAnswer = {
  idempotency_key: string;
  canonical_question_id: string;
  topic_id: string;
  field_id: string;
  is_correct: boolean;
  first_attempt_state: FirstAttemptState;
  answered_at: string;
};

export async function startAssessmentSession(args: {
  supabase: SupabaseClient;
  userId: string;
  input: StartAssessmentSessionInput;
}): Promise<AssessmentSession> {
  const existing = await readSession(args.supabase, args.userId, args.input.sessionId);
  if (existing !== null) {
    if (existing.status !== "in_progress") {
      throw sessionConflict("Assessment session is already terminal");
    }
    assertSameStartFrame(existing, args.input);
    return existing;
  }

  const row = {
    session_id: args.input.sessionId,
    user_id: args.userId,
    source: args.input.source,
    mode: args.input.mode,
    status: "in_progress",
    started_at: args.input.startedAt,
    completed_at: null,
    question_count: args.input.questionCount,
    answered_count: 0,
    correct_count: 0,
    first_count: 0,
    seen_count: 0,
    unknown_count: 0,
  };
  const response = await args.supabase.from("assessment_sessions").insert(row) as QueryResult;
  if (response.error) {
    if (errorCode(response.error) === "23505") {
      const concurrent = await readSession(args.supabase, args.userId, args.input.sessionId);
      if (concurrent !== null) {
        if (concurrent.status !== "in_progress") {
          throw sessionConflict("Assessment session is already terminal");
        }
        assertSameStartFrame(concurrent, args.input);
        return concurrent;
      }
    }
    throw persistenceFailed("Could not start assessment session");
  }
  return parseSession(row);
}

export async function abandonAssessmentSession(args: {
  supabase: SupabaseClient;
  userId: string;
  input: AbandonAssessmentSessionInput;
}): Promise<AssessmentSession> {
  const response = await args.supabase
    .from("assessment_sessions")
    .update({
      status: "abandoned",
      completed_at: args.input.completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", args.userId)
    .eq("session_id", args.input.sessionId)
    .eq("status", "in_progress")
    .select(SESSION_COLUMNS)
    .maybeSingle() as QueryResult;
  if (response.error) throw persistenceFailed("Could not abandon assessment session");
  if (response.data !== null) return parseSession(response.data);

  const existing = await readSession(args.supabase, args.userId, args.input.sessionId);
  if (existing === null) throw sessionNotFound();
  if (
    existing.status === "abandoned"
    && existing.completedAt !== null
    && isSameInstant(existing.completedAt, args.input.completedAt)
  ) {
    return existing;
  }
  throw sessionConflict("Assessment session is already terminal");
}

export async function completeAssessmentSession(args: {
  supabase: SupabaseClient;
  userId: string;
  input: CompleteAssessmentSessionInput;
}): Promise<AssessmentSession & {
  session: AssessmentSession;
  completedNow: boolean;
  readinessUpdated: boolean;
}> {
  const frame = await readSession(args.supabase, args.userId, args.input.sessionId);
  if (frame === null) throw sessionNotFound();
  if (frame.status === "abandoned") {
    throw sessionConflict("Assessment session is abandoned");
  }
  if (args.input.answers.length > frame.questionCount) {
    throw new AssessmentSessionPersistenceError(
      "invalid_session",
      "Assessment answers exceed the immutable question count",
    );
  }
  assertUniqueAnswerIdentities(args.input.answers);

  const attempts = await readAuthoritativeAttempts(
    args.supabase,
    args.userId,
    args.input.sessionId,
  );
  const answers = args.input.answers.map((answer) =>
    buildRpcAnswer(frame, answer, attempts)
  );
  const response = await args.supabase.rpc("complete_assessment_session", {
    p_user_id: args.userId,
    p_session_id: args.input.sessionId,
    p_completed_at: args.input.completedAt,
    p_answers: answers,
  }) as QueryResult;
  if (response.error) throw mapRpcError(response.error);
  const completed = parseCompletion(response.data);

  return {
    ...completed.session,
    session: completed.session,
    completedNow: completed.completedNow,
    // Assessment evidence is published only after the matching P0 progress payload is
    // committed by save_user_progress_with_readiness_evidence.
    readinessUpdated: false,
  };
}

const SESSION_COLUMNS = [
  "session_id",
  "user_id",
  "source",
  "mode",
  "status",
  "started_at",
  "completed_at",
  "question_count",
  "answered_count",
  "correct_count",
  "first_count",
  "seen_count",
  "unknown_count",
].join(", ");

async function readSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<AssessmentSession | null> {
  const response = await supabase
    .from("assessment_sessions")
    .select(SESSION_COLUMNS)
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .maybeSingle() as QueryResult;
  if (response.error) throw persistenceFailed("Could not read assessment session");
  return response.data === null ? null : parseSession(response.data);
}

async function readAuthoritativeAttempts(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<AttemptRow[]> {
  const response = await supabase
    .from("question_attempts")
    .select(
      "attempt_id, question_id, question_type, topic_id, is_correct, answered_at, official_exam_field, is_first_attempt, attempt_group_id",
    )
    .eq("user_id", userId)
    .eq("attempt_group_id", sessionId) as QueryResult;
  if (response.error || !Array.isArray(response.data)) {
    throw persistenceFailed("Could not read authoritative question attempts");
  }
  if (response.data.some((value) => !isAttemptRow(value))) {
    throw persistenceFailed("Authoritative question attempts returned invalid rows");
  }
  return response.data as AttemptRow[];
}

function buildRpcAnswer(
  session: AssessmentSession,
  input: CompleteAssessmentSessionInput["answers"][number],
  attempts: AttemptRow[],
): RpcAnswer {
  const expectedQuestionType = questionTypeForSource(session.source);
  const matching = attempts
    .filter((attempt) =>
      attempt.question_id === input.canonicalQuestionId
      && isSameInstant(attempt.answered_at, input.answeredAt)
      && attempt.question_type === expectedQuestionType
    )
    .sort((left, right) => left.attempt_id.localeCompare(right.attempt_id))[0];
  if (matching === undefined) {
    throw new AssessmentSessionPersistenceError(
      "invalid_session",
      "Assessment answer has no authoritative question attempt",
    );
  }
  const firstAttemptState: FirstAttemptState = matching.is_first_attempt ? "first" : "seen";

  if (session.source === "official_past") {
    const question = getQuestionById(input.canonicalQuestionId);
    if (
      question === undefined
      || question.origin !== "official_past"
      || question.official?.examField === undefined
    ) {
      throw new AssessmentSessionPersistenceError(
        "invalid_session",
        "Official assessment answer has no authoritative question attempt",
      );
    }
    const context = resolveReadinessQuestionContext({
      questionId: question.id,
      topicId: question.primaryTopicId,
      officialExamFieldId: question.official.examField,
    });
    return {
      idempotency_key: input.idempotencyKey,
      canonical_question_id: context.canonicalQuestionId,
      topic_id: context.topicId,
      field_id: context.officialExamFieldId as string,
      is_correct: matching.is_correct,
      first_attempt_state: firstAttemptState,
      answered_at: input.answeredAt,
    };
  }

  const context = resolveReadinessQuestionContext({
    questionId: matching.question_id,
    topicId: matching.topic_id,
  });
  return {
    idempotency_key: input.idempotencyKey,
    canonical_question_id: context.canonicalQuestionId,
    topic_id: context.topicId,
    field_id: context.fieldId,
    is_correct: matching.is_correct,
    first_attempt_state: firstAttemptState,
    answered_at: input.answeredAt,
  };
}

function parseCompletion(value: unknown): {
  session: AssessmentSession;
  completedNow: boolean;
} {
  if (!isRecord(value) || typeof value.completed_now !== "boolean") {
    throw persistenceFailed("Assessment completion returned an invalid result");
  }
  return {
    session: parseSession(value.session),
    completedNow: value.completed_now,
  };
}

function parseSession(value: unknown): AssessmentSession {
  if (!isRecord(value)) throw persistenceFailed("Invalid assessment session row");
  if (
    !isNonEmptyString(value.session_id)
    || !isNonEmptyString(value.user_id)
    || !isSource(value.source)
    || !isMode(value.mode)
    || !isStatus(value.status)
    || !isStrictOffsetIsoTimestamp(value.started_at)
    || (value.completed_at !== null && !isStrictOffsetIsoTimestamp(value.completed_at))
    || !isNonNegativeInteger(value.question_count)
    || !isNonNegativeInteger(value.answered_count)
    || !isNonNegativeInteger(value.correct_count)
    || !isNonNegativeInteger(value.first_count)
    || !isNonNegativeInteger(value.seen_count)
    || !isNonNegativeInteger(value.unknown_count)
  ) {
    throw persistenceFailed("Invalid assessment session row");
  }
  return {
    sessionId: value.session_id,
    userId: value.user_id,
    source: value.source,
    mode: value.mode,
    status: value.status,
    startedAt: value.started_at,
    completedAt: value.completed_at,
    questionCount: value.question_count,
    answeredCount: value.answered_count,
    correctCount: value.correct_count,
    firstCount: value.first_count,
    seenCount: value.seen_count,
    unknownCount: value.unknown_count,
  };
}

function assertSameStartFrame(
  existing: AssessmentSession,
  input: StartAssessmentSessionInput,
): void {
  if (
    existing.source !== input.source
    || existing.mode !== input.mode
    || !isSameInstant(existing.startedAt, input.startedAt)
    || existing.questionCount !== input.questionCount
  ) {
    throw sessionConflict("Assessment start conflicts with the immutable frame");
  }
}

function isSameInstant(left: string, right: string): boolean {
  return isSameStrictIsoInstant(left, right);
}

function assertUniqueAnswerIdentities(
  answers: CompleteAssessmentSessionInput["answers"],
): void {
  if (
    new Set(answers.map((answer) => answer.idempotencyKey)).size !== answers.length
    || new Set(answers.map((answer) => answer.canonicalQuestionId)).size !== answers.length
  ) {
    throw new AssessmentSessionPersistenceError(
      "invalid_session",
      "Assessment answers contain duplicate identities",
    );
  }
}

function mapRpcError(error: unknown): AssessmentSessionPersistenceError {
  const code = errorCode(error);
  if (code === "P0002") return sessionNotFound();
  if (code === "23505" || code === "40001") {
    return sessionConflict("Assessment session is terminal or conflicts with stored facts");
  }
  if (code === "22023") {
    return new AssessmentSessionPersistenceError(
      "invalid_session",
      "Assessment completion was invalid",
    );
  }
  return persistenceFailed("Could not complete assessment session");
}

function questionTypeForSource(source: AssessmentSession["source"]): string {
  switch (source) {
    case "checkpoint": return "mini_exam";
    case "summary": return "theme_exam";
    case "mock": return "mock_exam";
    case "official_past": return "official_past";
  }
}

function isAttemptRow(value: unknown): value is AttemptRow {
  return isRecord(value)
    && isNonEmptyString(value.attempt_id)
    && isNonEmptyString(value.question_id)
    && isNonEmptyString(value.question_type)
    && isNonEmptyString(value.topic_id)
    && typeof value.is_correct === "boolean"
    && isStrictOffsetIsoTimestamp(value.answered_at)
    && (value.official_exam_field === null || typeof value.official_exam_field === "string")
    && typeof value.is_first_attempt === "boolean"
    && isNonEmptyString(value.attempt_group_id);
}

function errorCode(error: unknown): string | null {
  return isRecord(error) && typeof error.code === "string" ? error.code : null;
}

function persistenceFailed(message: string): AssessmentSessionPersistenceError {
  return new AssessmentSessionPersistenceError("persistence_failed", message);
}

function sessionNotFound(): AssessmentSessionPersistenceError {
  return new AssessmentSessionPersistenceError("session_not_found", "Assessment session not found");
}

function sessionConflict(message: string): AssessmentSessionPersistenceError {
  return new AssessmentSessionPersistenceError("session_conflict", message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isSource(value: unknown): value is AssessmentSession["source"] {
  return value === "checkpoint" || value === "summary" || value === "mock"
    || value === "official_past";
}

function isMode(value: unknown): value is AssessmentSession["mode"] {
  return value === "practice" || value === "exam";
}

function isStatus(value: unknown): value is AssessmentSession["status"] {
  return value === "in_progress" || value === "completed" || value === "abandoned";
}
