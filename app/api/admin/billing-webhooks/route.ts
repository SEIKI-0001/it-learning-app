import { NextResponse } from "next/server";
import { STALE_WEBHOOK_PROCESSING_SECONDS } from "@/lib/billing/webhookState";
import { getServiceSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/** 管理画面向けに、手動再処理が必要な失敗・停止Stripeイベントを返す。 */
export async function GET() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  const staleBefore = new Date(
    Date.now() - STALE_WEBHOOK_PROCESSING_SECONDS * 1000,
  ).toISOString();
  const columns = "event_id, event_type, status, attempt_count, last_error, updated_at";
  const [failedResult, stalledResult] = await Promise.all([
    supabase
      .from("stripe_webhook_events")
      .select(columns)
      .eq("status", "failed")
      .order("updated_at", { ascending: false })
      .limit(25),
    supabase
      .from("stripe_webhook_events")
      .select(columns)
      .eq("status", "processing")
      .lt("updated_at", staleBefore)
      .order("updated_at", { ascending: false })
      .limit(25),
  ]);
  if (failedResult.error || stalledResult.error) {
    console.error(
      "[admin] recoverable billing webhooks query failed:",
      failedResult.error?.message ?? stalledResult.error?.message,
    );
    return NextResponse.json({ ok: false, error: "query failed" }, { status: 500 });
  }

  const events = [...(failedResult.data ?? []), ...(stalledResult.data ?? [])]
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, 25);
  return NextResponse.json({ ok: true, events });
}
