import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserIdFast } from "@/lib/apiUser";
import {
  summarizeCheckPackAttempts,
  type CheckPackAttemptRow,
} from "@/lib/checkPackHistorySummary";

export const runtime = "nodejs";

/**
 * POST /api/check-pack/history
 * 確認パックを「解き終えたことがあるか」を後から見返すための読み取り専用 API。
 * body: { topicId? }（省略時は全トピック）
 * 返却: { ok, history: { [topicId]: CheckPackHistoryEntry } }（未実施のトピックは含めない）
 *
 * Supabase 未設定: 503 / 匿名: 401 / body 不正: 400
 */
export async function POST(request: Request) {
  let body: { userId?: string; topicId?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const userId = await getRequestUserIdFast(body);
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

  const topicId = typeof body.topicId === "string" ? body.topicId.trim() : "";
  let query = supabase
    .from("topic_check_pack_attempts")
    .select(
      "topic_id, completed_at, result_status, quiz_score_rate, flashcard_score_rate, exam_level_score_rate",
    )
    .eq("user_id", userId);
  if (topicId) query = query.eq("topic_id", topicId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: "get failed" }, { status: 500 });
  }

  const history = summarizeCheckPackAttempts((data ?? []) as CheckPackAttemptRow[]);
  return NextResponse.json({ ok: true, history });
}
