import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  canRecordStudyForUser,
  recordingLockedResponse,
} from "@/lib/billing/recordingGate";
import { wordProgressToRow } from "@/lib/dbMappers";
import type { WordProgress } from "@/lib/wordlistProgress";

export const runtime = "nodejs";

/**
 * POST /api/word-progress/save
 * 英略語単語帳の進捗を 1 件 UPSERT する。
 * body: { userId: string, progress: WordProgress }
 *
 * - epoch ms の lastReviewedAt / nextReviewAt は ISO 文字列(timestamptz)に変換。
 * - updated_at は保存時の現在時刻で更新（wordProgressToRow 内）。
 * - Supabase 未設定: 503 / userId なし: 401 / progress 不正: 400 / 保存失敗: 500
 */
export async function POST(request: Request) {
  let body: { userId?: string; progress?: WordProgress } = {};
  try {
    body = (await request.json()) as { userId?: string; progress?: WordProgress };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  if (!(await canRecordStudyForUser(userId))) {
    return recordingLockedResponse();
  }

  const progress = body.progress;
  if (!progress || typeof progress.acronymId !== "string" || !progress.acronymId) {
    return NextResponse.json({ ok: false, error: "progress invalid" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  const { error } = await supabase
    .from("user_word_progress")
    .upsert(wordProgressToRow(userId, progress), { onConflict: "user_id,word_id" });

  if (error) {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
