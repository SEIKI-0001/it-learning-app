import { NextResponse } from "next/server";
import {
  processStripeWebhookEvent,
  type StripeEvent,
} from "@/app/api/billing/webhook/route";
import { getServiceSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type FailedEventRow = {
  event_id: string;
  event_type: string | null;
  event_payload: StripeEvent | null;
  attempt_count: number | null;
};

/**
 * 失敗したStripeイベントを管理者が再処理する。
 * /api/admin/* は proxy.ts のBasic認証で保護される。
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;
  if (!eventId) {
    return NextResponse.json({ ok: false, error: "invalid event id" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .select("event_id, event_type, event_payload, attempt_count")
    .eq("event_id", eventId)
    .eq("status", "failed")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ ok: false, error: "query failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "failed event not found" }, { status: 404 });
  }

  const event = data as FailedEventRow;
  if (!event.event_payload || event.event_payload.id !== eventId) {
    return NextResponse.json(
      { ok: false, error: "event payload is unavailable; retry from Stripe instead" },
      { status: 422 },
    );
  }

  // 同時に再実行されないよう、failed → processing を原子的に取得する。
  const { data: claimed, error: claimError } = await supabase
    .from("stripe_webhook_events")
    .update({
      status: "processing",
      attempt_count: Math.max(1, event.attempt_count ?? 0) + 1,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", eventId)
    .eq("status", "failed")
    .select("event_id");
  if (claimError) {
    return NextResponse.json({ ok: false, error: "retry claim failed" }, { status: 500 });
  }
  if ((claimed?.length ?? 0) !== 1) {
    return NextResponse.json({ ok: false, error: "event is already being retried" }, { status: 409 });
  }

  try {
    await processStripeWebhookEvent(event.event_payload);
  } catch (error) {
    console.error("[admin] Stripe webhook manual retry failed:", error);
    return NextResponse.json({ ok: false, error: "retry failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, eventId });
}
