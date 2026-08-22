import { getInternalUserId } from "@/lib/auth/currentUser";
import { getCurrentReadiness } from "@/lib/examReadiness/service";
import { getServiceSupabase } from "@/lib/supabaseServer";

const JSON_HEADERS = {
  "Cache-Control": "private, no-store",
  "Content-Type": "application/json",
};

export async function GET() {
  const userId = await getInternalUserId();
  if (!userId) {
    return json({ ok: false, error: "unauthenticated" }, 401);
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return json({ ok: false, error: "supabase_not_configured" }, 503);
  }

  try {
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
  return error !== null
    && typeof error === "object"
    && "retryable" in error
    && error.retryable === true;
}
