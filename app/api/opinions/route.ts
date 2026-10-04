import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  OPINION_RATE_LIMIT,
  OPINION_RATE_WINDOW_MINUTES,
  parseOpinionInput,
} from "@/lib/opinions";

export const runtime = "nodejs";

/**
 * POST /api/opinions
 * 意見箱への投稿を保存する。ユーザーはセッション（Google / LINE Cookie）から解決する。
 * body: { category: "improvement" | "mistake" | "bug" | "other", body: string, context?: string }
 */
export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const userId = await getRequestUserId(raw as { userId?: string });
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const parsed = parseOpinionInput(raw);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  // 連投防止。数え損ねても投稿自体は止めない（声を取りこぼさない方を優先）。
  const since = new Date(Date.now() - OPINION_RATE_WINDOW_MINUTES * 60_000).toISOString();
  const { count } = await supabase
    .from("user_opinions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= OPINION_RATE_LIMIT) {
    return NextResponse.json({ ok: false, error: "too many requests" }, { status: 429 });
  }

  const { error } = await supabase.from("user_opinions").insert({
    user_id: userId,
    category: parsed.value.category,
    body: parsed.value.body,
    context: parsed.value.context,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: "opinion save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
