import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import type { GradingRecord, WrittenGrade } from "@/types/aiGrading";

export const runtime = "nodejs";

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
 * POST /api/ai-grading/history
 * ログイン中ユーザーのAI採点履歴（復習用）を新しい順に返す。
 * body: { userId?: string }（userId は後方互換時のみ参照）
 * 未ログイン / 未設定は空配列を返す（UI を止めない）。
 */
export async function POST(request: Request) {
  let body: { userId?: string } = {};
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    /* body 無しでも続行（userId はセッションから解決する） */
  }

  const userId = await getRequestUserId(body);
  if (!userId) return NextResponse.json({ ok: true, records: [] });

  const supabase = getServiceSupabase();
  if (!supabase) return NextResponse.json({ ok: true, records: [] });

  const { data, error } = await supabase
    .from("ai_grading_records")
    .select(
      "id,question_id,category,user_answer,score,grade,is_correct,summary,good_points,missing_points,feedback,model_answer,next_review_theme,provider,model,created_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    if (error) console.error("[ai-grading] history fetch failed:", error.message);
    return NextResponse.json({ ok: true, records: [] });
  }

  const records = (data as GradingRow[]).map(rowToRecord);
  return NextResponse.json({ ok: true, records });
}
