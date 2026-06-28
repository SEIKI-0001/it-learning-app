import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import type { UserAnswer } from "@/types";

export const runtime = "nodejs";

/**
 * POST /api/answers/save
 * 回答履歴を追記する。ユーザーはセッション（Google / LINE Cookie）から解決する。
 * body: { dayNo: number, answers: UserAnswer[] }（userId は後方互換時のみ参照）
 */
export async function POST(request: Request) {
  let dayNo = 0;
  let answers: UserAnswer[] = [];
  let body: { userId?: string; dayNo?: number; answers?: UserAnswer[] } = {};
  try {
    body = (await request.json()) as {
      userId?: string;
      dayNo?: number;
      answers?: UserAnswer[];
    };
    dayNo = body.dayNo ?? 0;
    answers = body.answers ?? [];
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  if (answers.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  const rows = answers.map((a) => ({
    user_id: userId,
    question_id: a.questionId,
    day_no: dayNo,
    selected_choice: a.selectedChoice,
    is_correct: a.isCorrect,
    tag: a.tag,
    topic_id: a.topicId ?? null,
    answered_at: a.answeredAt,
  }));

  const { error } = await supabase.from("user_answers").insert(rows);
  if (error) {
    return NextResponse.json({ ok: false, error: "answers save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inserted: rows.length });
}
