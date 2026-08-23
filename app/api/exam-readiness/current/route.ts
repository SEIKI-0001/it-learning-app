import { getInternalUserId } from "@/lib/auth/currentUser";
import {
  ExamReadinessServiceError,
  getCurrentReadiness,
  type ExamReadinessServiceErrorCode,
} from "@/lib/examReadiness/service";
import {
  ExamReadinessRepositoryError,
  type ExamReadinessRepositoryErrorCode,
} from "@/lib/examReadiness/repository";
import { getServiceSupabase } from "@/lib/supabaseServer";

const JSON_HEADERS = {
  "Cache-Control": "private, no-store",
  "Content-Type": "application/json",
};

export async function GET() {
  try {
    const userId = await getInternalUserId();
    if (!userId) {
      return json({ ok: false, error: "unauthenticated" }, 401);
    }

    const supabase = getServiceSupabase();
    if (!supabase) {
      return json({ ok: false, error: "supabase_not_configured" }, 503);
    }

    const readiness = await getCurrentReadiness({ supabase, userId });
    return json({ ok: true, readiness });
  } catch (error) {
    if (isRetryableReadinessError(error)) {
      return json({ ok: false, error: "readiness_temporarily_unavailable" }, 503);
    }
    console.error("exam readiness current failed", error);
    return json({ ok: false, error: "readiness_unavailable" }, 500);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function isRetryableReadinessError(error: unknown): boolean {
  if (error instanceof ExamReadinessServiceError) {
    return error.retryable && TEMPORARY_SERVICE_CODES.has(error.code);
  }
  return error instanceof ExamReadinessRepositoryError
    && TEMPORARY_REPOSITORY_CODES.has(error.code);
}

const TEMPORARY_SERVICE_CODES = new Set<ExamReadinessServiceErrorCode>([
  "claim_failed",
  "completion_failed",
  "current_read_unstable",
  "recalculation_busy",
  "recalculation_unstable",
]);

const TEMPORARY_REPOSITORY_CODES = new Set<ExamReadinessRepositoryErrorCode>([
  "evidence_revision_unstable",
]);
