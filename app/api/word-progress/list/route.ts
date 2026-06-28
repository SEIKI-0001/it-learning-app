import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  wordProgressRowToProgress,
  type WordProgressRow,
} from "@/lib/dbMappers";
import type { WordProgressMap } from "@/lib/wordlistProgress";

export const runtime = "nodejs";

/**
 * POST /api/word-progress/list
 * 英略語単語帳の進捗を全件取得する。
 * body: { userId: string }
 * 返却: { ok: true, progress: WordProgressMap }（DBの timestamptz は epoch ms に戻す）
 *
 * - Supabase 未設定: 503（クライアントは localStorage で継続）
 * - userId なし: 401
 * - 取得失敗: 500
 */
export async function POST(request: Request) {
  let body: { userId?: string } = {};
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("user_word_progress")
    .select(
      "word_id, status, correct_count, wrong_count, review_count, last_reviewed_at, next_review_at, last_self_rating",
    )
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ ok: false, error: "list failed" }, { status: 500 });
  }

  const progress: WordProgressMap = {};
  for (const row of (data ?? []) as WordProgressRow[]) {
    const p = wordProgressRowToProgress(row);
    progress[p.acronymId] = p;
  }

  return NextResponse.json({ ok: true, progress });
}
