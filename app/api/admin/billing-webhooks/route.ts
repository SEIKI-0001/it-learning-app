import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/** 管理画面向けに、手動再処理が必要な失敗Stripeイベントだけを返す。 */
export async function GET() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .select("event_id, event_type, attempt_count, last_error, updated_at")
    .eq("status", "failed")
    .order("updated_at", { ascending: false })
    .limit(25);
  if (error) {
    console.error("[admin] failed billing webhooks query failed:", error.message);
    return NextResponse.json({ ok: false, error: "query failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, events: data ?? [] });
}
