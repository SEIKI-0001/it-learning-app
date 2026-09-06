import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  normalizeNotificationPreferenceInput,
  preferenceRowToPreference,
  preferenceToRow,
} from "@/lib/notifications/preferences";
import { DEFAULT_NOTIFICATION_PREFERENCE } from "@/types/notification";

export const runtime = "nodejs";

const SELECT_COLUMNS =
  "opt_in, remind_hour, timezone, daily_reminder, streak_risk, comeback";

/**
 * GET /api/notifications/preference
 * 現在の通知設定を返す。行が無ければ既定値（オプトイン OFF）を返す。
 */
export async function GET() {
  const userId = await getRequestUserId();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "load failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    preference: data
      ? preferenceRowToPreference(data as Parameters<typeof preferenceRowToPreference>[0])
      : DEFAULT_NOTIFICATION_PREFERENCE,
  });
}

/**
 * POST /api/notifications/preference
 * 通知設定を保存する。部分更新でよく、欠けた項目は現在値を引き継ぐ。
 * オプトイン解除（停止）も同じ経路（optIn: false）で行う。
 */
export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const userId = await getRequestUserId(body as { userId?: string });
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  const { data: currentRow } = await supabase
    .from("notification_preferences")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  const current = currentRow
    ? preferenceRowToPreference(
        currentRow as Parameters<typeof preferenceRowToPreference>[0],
      )
    : DEFAULT_NOTIFICATION_PREFERENCE;

  const preference = normalizeNotificationPreferenceInput(body, current);

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(
      { ...preferenceToRow(userId, preference), updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

  if (error) {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, preference });
}
