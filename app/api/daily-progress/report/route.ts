import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import { dailyProgressReportToRow } from "@/lib/dbMappers";
import {
  PROGRESS_LEVEL_RATE,
  type DailyTaskStatus,
  type ProgressLevel,
  type ProgressReason,
} from "@/types/studyProgress";

export const runtime = "nodejs";

const LEVELS: ProgressLevel[] = ["all", "half", "little", "none", "rest"];
const REASONS: ProgressReason[] = ["no_time", "difficult", "tired", "forgot", "other"];

function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

// 達成度 → 当日タスクの status。
//   all → completed / half・little → partially_completed / none・rest → skipped
function statusForLevel(level: ProgressLevel): DailyTaskStatus {
  if (level === "all") return "completed";
  if (level === "half" || level === "little") return "partially_completed";
  return "skipped"; // none / rest
}

/**
 * POST /api/daily-progress/report
 * 1日1回の達成度報告を保存し、当日の自己申告タスクの status を更新する。
 * body: { userId?, date?, selectedLevel, optionalReason? }
 *
 * - selected_level → estimated_completion_rate（all=100/half=50/little=25/none=0/rest=null）
 * - 保存後、当日の daily_study_tasks を status 反映（completion_source=app_actual は上書きしない）。
 * - 再入力は同日上書き（unique(user_id, date)）。
 * - Supabase 未設定: 503 / userId なし: 401 / body 不正: 400
 */
export async function POST(request: Request) {
  let body: {
    userId?: string;
    date?: string;
    selectedLevel?: ProgressLevel;
    optionalReason?: ProgressReason | null;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const level = body.selectedLevel;
  if (!level || !LEVELS.includes(level)) {
    return NextResponse.json({ ok: false, error: "invalid level" }, { status: 400 });
  }
  const reason =
    body.optionalReason && REASONS.includes(body.optionalReason)
      ? body.optionalReason
      : null;

  const date = isIsoDate(body.date) ? body.date : new Date().toISOString().slice(0, 10);
  const rate = PROGRESS_LEVEL_RATE[level]; // number | null

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  const { error: reportError } = await supabase
    .from("daily_progress_reports")
    .upsert(dailyProgressReportToRow(userId, date, level, rate, reason), {
      onConflict: "user_id,date",
    });

  if (reportError) {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  // 当日タスクへ status を反映。
  //   - completion_source is null（初期タスク）→ 更新する
  //   - completion_source = self_report → 再報告で上書きする
  //   - completion_source = app_actual（確認問題の実績）→ 絶対に上書きしない
  // .neq('...','app_actual') は三値論理で NULL 行が更新対象から外れるため使わない。
  const status = statusForLevel(level);
  const { error: taskError } = await supabase
    .from("daily_study_tasks")
    .update({
      status,
      estimated_completion_rate: rate,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("date", date)
    .or("completion_source.is.null,completion_source.eq.self_report");

  // タスク更新の失敗は致命的ではない（報告自体は保存済み）。ログ相当に留め ok を返す。
  if (taskError) {
    return NextResponse.json({ ok: true, tasksUpdated: false });
  }

  return NextResponse.json({ ok: true, tasksUpdated: true });
}
