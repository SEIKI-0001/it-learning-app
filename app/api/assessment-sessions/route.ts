import { getInternalUserId } from "@/lib/auth/currentUser";
import {
  abandonAssessmentSession,
  completeAssessmentSession,
  startAssessmentSession,
  type AssessmentSessionActionInput,
} from "@/lib/examReadiness/assessmentSession";
import { getServiceSupabase } from "@/lib/supabaseServer";

const JSON_HEADERS = {
  "Cache-Control": "private, no-store",
  "Content-Type": "application/json",
};

export async function POST(request: Request): Promise<Response> {
  try {
    const userId = await getInternalUserId();
    if (!userId) return json({ ok: false, error: "unauthenticated" }, 401);

    let value: unknown;
    try {
      value = await request.json();
    } catch {
      return json({ ok: false, error: "invalid_assessment_session" }, 400);
    }
    const input = parseAction(value);
    if (input === null) {
      return json({ ok: false, error: "invalid_assessment_session" }, 400);
    }

    const supabase = getServiceSupabase();
    if (!supabase) {
      return json({ ok: false, error: "supabase_not_configured" }, 503);
    }

    const session = input.action === "start"
      ? await startAssessmentSession({ supabase, userId, input })
      : input.action === "complete"
        ? await completeAssessmentSession({ supabase, userId, input })
        : await abandonAssessmentSession({ supabase, userId, input });
    return json({ ok: true, session });
  } catch (error) {
    const code = persistenceErrorCode(error);
    if (code === "invalid_session") {
      return json({ ok: false, error: "invalid_assessment_session" }, 400);
    }
    if (code === "session_not_found") {
      return json({ ok: false, error: "assessment_session_not_found" }, 404);
    }
    if (code === "session_conflict") {
      return json({ ok: false, error: "assessment_session_conflict" }, 409);
    }
    console.error("assessment session persistence failed", error);
    return json({ ok: false, error: "assessment_session_unavailable" }, 500);
  }
}

function parseAction(value: unknown): AssessmentSessionActionInput | null {
  if (!isRecord(value) || typeof value.action !== "string") return null;
  switch (value.action) {
    case "start":
      if (
        !hasOnlyKeys(value, [
          "action", "sessionId", "source", "mode", "startedAt", "questionCount", "userId",
        ])
        || !isUuid(value.sessionId)
        || !isSource(value.source)
        || !isMode(value.mode)
        || !isIsoString(value.startedAt)
        || !isNonNegativeInteger(value.questionCount)
      ) return null;
      return {
        action: "start",
        sessionId: value.sessionId,
        source: value.source,
        mode: value.mode,
        startedAt: value.startedAt,
        questionCount: value.questionCount,
      };
    case "complete":
      if (
        !hasOnlyKeys(value, ["action", "sessionId", "completedAt", "answers", "userId"])
        || !isUuid(value.sessionId)
        || !isIsoString(value.completedAt)
        || !Array.isArray(value.answers)
      ) return null;
      {
        const answers = value.answers.map(parseAnswer);
        if (answers.some((answer) => answer === null)) return null;
        return {
          action: "complete",
          sessionId: value.sessionId,
          completedAt: value.completedAt,
          answers: answers as NonNullable<(typeof answers)[number]>[],
        };
      }
    case "abandon":
      if (
        !hasOnlyKeys(value, ["action", "sessionId", "completedAt", "userId"])
        || !isUuid(value.sessionId)
        || !isIsoString(value.completedAt)
      ) return null;
      return {
        action: "abandon",
        sessionId: value.sessionId,
        completedAt: value.completedAt,
      };
    default:
      return null;
  }
}

function parseAnswer(value: unknown): {
  idempotencyKey: string;
  canonicalQuestionId: string;
  topicId: string;
  isCorrect: boolean;
  answeredAt: string;
} | null {
  if (
    !isRecord(value)
    || !hasOnlyKeys(value, [
      "idempotencyKey", "canonicalQuestionId", "topicId", "isCorrect", "answeredAt",
    ])
    || !isNonEmptyString(value.idempotencyKey)
    || !isNonEmptyString(value.canonicalQuestionId)
    || !isNonEmptyString(value.topicId)
    || typeof value.isCorrect !== "boolean"
    || !isIsoString(value.answeredAt)
  ) return null;
  return {
    idempotencyKey: value.idempotencyKey,
    canonicalQuestionId: value.canonicalQuestionId,
    topicId: value.topicId,
    isCorrect: value.isCorrect,
    answeredAt: value.answeredAt,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function persistenceErrorCode(value: unknown): string | null {
  return isRecord(value) && typeof value.code === "string" ? value.code : null;
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoString(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isSource(value: unknown): value is "checkpoint" | "summary" | "mock" | "official_past" {
  return value === "checkpoint" || value === "summary" || value === "mock"
    || value === "official_past";
}

function isMode(value: unknown): value is "practice" | "exam" {
  return value === "practice" || value === "exam";
}
