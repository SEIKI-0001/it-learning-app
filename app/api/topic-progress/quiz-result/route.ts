import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  canRecordStudyForUser,
  recordingLockedResponse,
} from "@/lib/billing/recordingGate";
import {
  topicProgressRowToProgress,
  topicProgressToRow,
  type TopicProgressRow,
} from "@/lib/dbMappers";
import { refreshIntegratedStatusForUser } from "@/lib/progressBootstrap";
import type { TopicStage } from "@/types/studyProgress";

export const runtime = "nodejs";

// 確認問題の合否しきい値（正答率75%以上で「基礎理解OK」）。
const PASS_THRESHOLD = 75;

function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * POST /api/topic-progress/quiz-result
 * 確認問題の結果から topic_progress を更新する（理解度は確認問題結果のみで判定）。
 * body: { userId?, topicId, correct, total, date? }
 *
 * 判定:
 *   - 正答率 75%以上 → basic_understood（連続失敗リセット）
 *   - 75%未満 → review_needed（連続失敗 +1）
 *   - 同一トピックで 75%未満が 2回以上連続 → weak
 * 自己申告では basic_understood にしない（このエンドポイントは確認問題結果専用）。
 *
 * 対応する当日タスク（topic_quiz）があれば completion_source=app_actual / status=completed に。
 * - Supabase 未設定: 503 / userId なし: 401 / body 不正: 400
 */
export async function POST(request: Request) {
  let body: {
    userId?: string;
    topicId?: string;
    correct?: number;
    total?: number;
    date?: string;
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
  if (!(await canRecordStudyForUser(userId))) {
    return recordingLockedResponse();
  }

  const topicId = (body.topicId ?? "").trim();
  const total = Number(body.total);
  const correct = Number(body.correct);
  if (!topicId || !Number.isFinite(total) || total <= 0 || !Number.isFinite(correct)) {
    return NextResponse.json({ ok: false, error: "invalid result" }, { status: 400 });
  }

  const rate = Math.round((Math.max(0, Math.min(correct, total)) / total) * 100);
  const passed = rate >= PASS_THRESHOLD;
  const date = isIsoDate(body.date) ? body.date : new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  // 既存のステージ状態を読む（連続失敗回数の判定に使う）。
  const { data: existingRow, error: getError } = await supabase
    .from("topic_progress")
    .select(
      "id, user_id, topic_id, stage, latest_quiz_score, latest_exam_level_score, quiz_attempt_count, exam_level_attempt_count, consecutive_failed_count, last_attempted_at, next_review_at",
    )
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .maybeSingle();

  if (getError) {
    return NextResponse.json({ ok: false, error: "get failed" }, { status: 500 });
  }

  const prev = existingRow
    ? topicProgressRowToProgress(existingRow as TopicProgressRow)
    : null;

  const consecutiveFailed = passed ? 0 : (prev?.consecutiveFailedCount ?? 0) + 1;
  let stage: TopicStage;
  if (passed) {
    stage = "basic_understood";
  } else if (consecutiveFailed >= 2) {
    stage = "weak"; // 75%未満が同一トピックで2回以上
  } else {
    stage = "review_needed";
  }

  const row = topicProgressToRow(userId, topicId, {
    stage,
    latestQuizScore: rate,
    latestExamLevelScore: prev?.latestExamLevelScore ?? null,
    quizAttemptCount: (prev?.quizAttemptCount ?? 0) + 1,
    examLevelAttemptCount: prev?.examLevelAttemptCount ?? 0,
    consecutiveFailedCount: consecutiveFailed,
    lastAttemptedAt: now,
    nextReviewAt: prev?.nextReviewAt ?? null,
  });

  const { error: upsertError } = await supabase
    .from("topic_progress")
    .upsert(row, { onConflict: "user_id,topic_id" });

  if (upsertError) {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  // 対応する当日の確認問題タスクを「アプリ実績・完了」に更新する（あれば）。
  await supabase
    .from("daily_study_tasks")
    .update({
      status: "completed",
      completion_source: "app_actual",
      estimated_completion_rate: rate,
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("date", date)
    .eq("topic_id", topicId)
    .eq("task_type", "topic_quiz");

  // 統合進捗の当日スナップショットを更新する（合格準備度に即反映）。
  // 失敗してもこのレスポンスは成功のまま返す（進捗保存自体は完了しているため）。
  try {
    await refreshIntegratedStatusForUser(supabase, userId);
  } catch {
    /* fail-safe */
  }

  return NextResponse.json({ ok: true, stage, rate });
}
