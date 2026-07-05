import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import { getAllTopics } from "@/lib/content";
import { getAllWords } from "@/lib/wordlist";
import {
  computeIntegratedStatus,
  type IntegratedDailyReport,
  type IntegratedExamAttempt,
  type IntegratedTopicProgress,
  type IntegratedWordProgress,
} from "@/lib/integratedStatus";
import { integratedStatusToRow } from "@/lib/dbMappers";
import type { TopicStage } from "@/types/studyProgress";

export const runtime = "nodejs";

// 統合進捗を計算し、当日分を integrated_learning_status に upsert する。
//
// 集計は lib/integratedStatus（純粋関数）に集約している。
//   確認問題(基礎理解) / 単語帳(用語定着) / 過去問レベル(本番対応力) / 日次達成度 を統合し、
//   合格に対する現在地・主なリスク・推奨配分を返す。自己申告は外部学習の推定にだけ使う。
//
// - Supabase 未設定: 503 / userId なし: 401
// - 計算はできたが保存に失敗しても画面は止めない（ok:true, saved:false で status を返す）。

/** exam_date（"YYYY-MM-DD"）から試験までの残り日数を求める。 */
function daysUntil(examDate: string | null, now: Date): number | null {
  if (!examDate) return null;
  const exam = new Date(`${examDate}T00:00:00`);
  if (Number.isNaN(exam.getTime())) return null;
  return Math.max(0, Math.ceil((exam.getTime() - now.getTime()) / 86_400_000));
}

function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export async function POST(request: Request) {
  let body: { userId?: string; date?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // body なしでも動く（date は今日を使う）。
  }

  const userId = await getRequestUserId(body);
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

  const now = new Date();
  const statusDate = isIsoDate(body.date)
    ? body.date
    : now.toISOString().slice(0, 10);
  const sinceIso = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const recentDate = new Date(now.getTime() - 14 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  // 統合に必要な生データをまとめて取得。個別の失敗は空配列にフォールバックする。
  const [profileRes, progressRes, wordRes, reportRes, examRes] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("exam_date")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("topic_progress")
        .select("topic_id, stage")
        .eq("user_id", userId),
      supabase
        .from("user_word_progress")
        .select("status, next_review_at")
        .eq("user_id", userId),
      supabase
        .from("daily_progress_reports")
        .select("estimated_completion_rate")
        .eq("user_id", userId)
        .gte("date", recentDate),
      supabase
        .from("question_attempts")
        .select("is_correct")
        .eq("user_id", userId)
        .eq("question_type", "exam_level")
        .gte("answered_at", sinceIso),
    ]);

  const examDate =
    (profileRes.data as { exam_date: string | null } | null)?.exam_date ?? null;

  const topicProgress: IntegratedTopicProgress[] = (
    (progressRes.data ?? []) as { topic_id: string; stage: string }[]
  ).map((r) => ({ topicId: r.topic_id, stage: r.stage as TopicStage }));

  const wordProgress: IntegratedWordProgress[] = (
    (wordRes.data ?? []) as { status: string; next_review_at: string | null }[]
  ).map((r) => ({ status: r.status, nextReviewAt: r.next_review_at }));

  const recentReports: IntegratedDailyReport[] = (
    (reportRes.data ?? []) as { estimated_completion_rate: number | null }[]
  ).map((r) => ({ estimatedCompletionRate: r.estimated_completion_rate }));

  const examLevelAttempts: IntegratedExamAttempt[] = (
    (examRes.data ?? []) as { is_correct: boolean }[]
  ).map((r) => ({ isCorrect: r.is_correct }));

  const topics = getAllTopics().map((t) => ({
    id: t.id,
    field: t.field,
    title: t.title,
  }));

  const status = computeIntegratedStatus({
    statusDate,
    now,
    daysUntilExam: daysUntil(examDate, now),
    topics,
    topicProgress,
    wordProgress,
    totalWordCount: getAllWords().length,
    recentReports,
    examLevelAttempts,
  });

  // 当日分を upsert。保存に失敗しても計算結果は返す（UI は止めない）。
  const { error: upsertError } = await supabase
    .from("integrated_learning_status")
    .upsert(integratedStatusToRow(userId, status), {
      onConflict: "user_id,status_date",
    });

  return NextResponse.json({ ok: true, saved: !upsertError, status });
}
