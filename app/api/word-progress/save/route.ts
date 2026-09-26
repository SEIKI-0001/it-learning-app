import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  canRecordStudyForUser,
  recordingLockedResponse,
} from "@/lib/billing/recordingGate";
import { wordProgressToRow } from "@/lib/dbMappers";
import { isValidWordProgress, type WordProgress } from "@/lib/wordProgressModel";

export const runtime = "nodejs";

/**
 * POST /api/word-progress/save
 * 英略語単語帳の進捗を UPSERT する。
 * body: { userId: string, progress: WordProgress }            … 1件（学習のたびに送る）
 *     | { userId: string, progresses: WordProgress[] }        … まとめて（端末にしか無い
 *       既存の進捗を DB へ引き継ぐ同期で使う。最大 MAX_BATCH 件）
 *
 * - epoch ms の lastReviewedAt / nextReviewAt は ISO 文字列(timestamptz)に変換。
 * - updated_at は保存時の現在時刻で更新（wordProgressToRow 内）。
 * - Supabase 未設定: 503 / userId なし: 401 / progress 不正: 400 / 保存失敗: 500
 */
const MAX_BATCH = 200;

type SaveBody = { userId?: string; progress?: WordProgress; progresses?: unknown };

export async function POST(request: Request) {
  let body: SaveBody = {};
  try {
    body = (await request.json()) as SaveBody;
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

  let list: WordProgress[];
  if (Array.isArray(body.progresses)) {
    if (body.progresses.length === 0 || body.progresses.length > MAX_BATCH) {
      return NextResponse.json({ ok: false, error: "progress invalid" }, { status: 400 });
    }
    // 壊れた要素だけ落とす（端末の古いデータが1件壊れていても残りは引き継ぐ）。
    list = body.progresses.filter(isValidWordProgress);
    if (list.length === 0) {
      return NextResponse.json({ ok: false, error: "progress invalid" }, { status: 400 });
    }
  } else {
    const progress = body.progress;
    if (!progress || typeof progress.acronymId !== "string" || !progress.acronymId) {
      return NextResponse.json({ ok: false, error: "progress invalid" }, { status: 400 });
    }
    list = [progress];
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  const { error } = await supabase
    .from("user_word_progress")
    .upsert(list.map((progress) => wordProgressToRow(userId, progress)), {
      onConflict: "user_id,word_id",
    });

  if (error) {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
