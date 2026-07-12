import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  canRecordStudyForUser,
  recordingLockedResponse,
} from "@/lib/billing/recordingGate";
import { dailyStudyTaskToRow } from "@/lib/dbMappers";
import type { DailyStudyTaskInput } from "@/types/studyProgress";

export const runtime = "nodejs";

// "YYYY-MM-DD" 形式かどうかの軽い検証（不正なら今日の日付にフォールバック）。
function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * POST /api/daily-tasks/upsert
 * /today の今日のメニューを daily_study_tasks に保存する（重複作成しない）。
 * body: { userId?: string, date?: string("YYYY-MM-DD"), tasks: DailyStudyTaskInput[] }
 *
 * fire-and-forget 前提。失敗しても学習画面は止めない。
 * - 既存タスク（= 同 user/date/種別/topic/title）は上書きしない（ignoreDuplicates）。
 *   → 確認問題の実績（completion_source=app_actual）や達成度報告の status を消さない。
 * - Supabase 未設定: 503 / userId なし: 401 / body 不正: 400
 */
export async function POST(request: Request) {
  let body: { userId?: string; date?: string; tasks?: DailyStudyTaskInput[] } = {};
  try {
    body = (await request.json()) as typeof body;
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

  const date = isIsoDate(body.date) ? body.date : new Date().toISOString().slice(0, 10);
  const tasks = Array.isArray(body.tasks) ? body.tasks : [];
  if (tasks.length === 0) {
    return NextResponse.json({ ok: true, saved: 0 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  // 有効なタスクだけ行に変換（title 必須・種別必須）。
  const rows = tasks
    .filter((t) => t && t.taskType && (t.title ?? "").trim())
    .map((t) => dailyStudyTaskToRow(userId, date, t));

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, saved: 0 });
  }

  // ignoreDuplicates: 既存行は触らず、新規メニュー項目だけ追加する。
  const { error } = await supabase
    .from("daily_study_tasks")
    .upsert(rows, {
      onConflict: "user_id,date,task_type,topic_id,title",
      ignoreDuplicates: true,
    });

  if (error) {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: rows.length });
}
