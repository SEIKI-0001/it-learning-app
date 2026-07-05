// AI採点の回答記録（学習記録）の保存（サーバー専用）。
// すべて Supabase の service role 経由。未設定 / userId 無しのときは graceful に
// スキップして採点体験を止めない（保存失敗は採点結果の返却を妨げない）。
//
// 回数制限・分析用のメタログ（lib/billing/plan.ts の logUsage / ai_usage_logs）とは
// 役割が異なり、こちらはユーザーの回答本文と採点結果を残す「学習記録」。

import { getServiceSupabase } from "@/lib/supabaseServer";
import type { GradeProviderId } from "@/lib/ai/gradingCore";
import type {
  GradeResult,
  GradingRecord,
  WrittenGrade,
  WrittenQuestion,
} from "@/types/aiGrading";

// AI採点の保存済み記録（ai_grading_records）の1行。
type GradingRow = {
  id: string;
  question_id: string;
  category: string | null;
  user_answer: string;
  score: number;
  grade: string;
  is_correct: boolean;
  summary: string | null;
  good_points: string[] | null;
  missing_points: string[] | null;
  feedback: string | null;
  model_answer: string | null;
  next_review_theme: string | null;
  provider: string | null;
  model: string | null;
  created_at: string;
};

function rowToRecord(row: GradingRow): GradingRecord {
  return {
    id: row.id,
    questionId: row.question_id,
    category: row.category ?? "",
    userAnswer: row.user_answer,
    result: {
      score: row.score,
      grade: (row.grade as WrittenGrade) ?? "C",
      isCorrect: row.is_correct,
      summary: row.summary ?? "",
      goodPoints: row.good_points ?? [],
      missingPoints: row.missing_points ?? [],
      feedback: row.feedback ?? "",
      modelAnswer: row.model_answer ?? "",
      nextReviewTheme: row.next_review_theme ?? "",
    },
    provider: row.provider === "claude" ? "claude" : "gemini",
    model: row.model ?? "",
    createdAt: row.created_at,
  };
}

/**
 * AI採点の回答記録を 1 件保存する。userId 無し / Supabase 未設定はスキップ（投げない）。
 * userAnswer は AI 送信時のマスク前（ユーザー自身の回答）をそのまま残す。
 */
export async function saveGradingRecord(entry: {
  userId: string | null;
  question: WrittenQuestion;
  userAnswer: string;
  result: GradeResult;
  provider: GradeProviderId;
  model: string;
}): Promise<void> {
  if (!entry.userId) return;
  const supabase = getServiceSupabase();
  if (!supabase) return;

  const { question, result } = entry;

  const { error } = await supabase.from("ai_grading_records").insert({
    user_id: entry.userId,
    question_id: question.id,
    category: question.category,
    user_answer: entry.userAnswer,
    score: result.score,
    grade: result.grade,
    is_correct: result.isCorrect,
    summary: result.summary,
    good_points: result.goodPoints,
    missing_points: result.missingPoints,
    feedback: result.feedback,
    model_answer: result.modelAnswer,
    next_review_theme: result.nextReviewTheme,
    provider: entry.provider,
    model: entry.model,
  });

  if (error) {
    // 保存失敗は採点体験を止めない（サーバーログにだけ残す）。
    console.error("[ai-grading] saveGradingRecord failed:", error.message);
  }
}

/** ログイン中ユーザーのAI採点履歴を新しい順に取得する。未設定時は空配列。 */
export async function loadGradingRecordsForUser(
  userId: string | null,
  limit = 100,
): Promise<GradingRecord[]> {
  if (!userId) return [];
  const supabase = getServiceSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ai_grading_records")
    .select(
      "id,question_id,category,user_answer,score,grade,is_correct,summary,good_points,missing_points,feedback,model_answer,next_review_theme,provider,model,created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) console.error("[ai-grading] history fetch failed:", error.message);
    return [];
  }

  return (data as GradingRow[]).map(rowToRecord);
}
