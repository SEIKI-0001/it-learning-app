import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import { questionAttemptToRow, type QuestionType } from "@/lib/dbMappers";

export const runtime = "nodejs";

// 問題（確認問題 / 過去問レベル / ミニ模試）の回答ログを question_attempts に保存する。
// 既存の user_answers は壊さない（確認問題は当面二重保存でも可）。
// - Supabase 未設定: 503 / userId なし: 401 / body 不正: 400
// - fire-and-forget で呼ばれる想定。保存失敗でも学習画面は止めない。

const VALID_TYPES = new Set<QuestionType>(["topic_quiz", "exam_level", "mini_exam", "mock_exam"]);

type AttemptInput = {
  questionId?: string;
  questionType?: string;
  topicId?: string;
  selectedAnswer?: string | null;
  isCorrect?: boolean;
  mistakeReason?: string | null;
  timeSpentSeconds?: number | null;
  sourceTaskId?: string | null;
  answeredAt?: string | null;
};

export async function POST(request: Request) {
  let body: { userId?: string; attempts?: AttemptInput[] } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const attempts = Array.isArray(body.attempts) ? body.attempts : [];
  const rows = attempts
    .filter(
      (a): a is AttemptInput =>
        typeof a?.questionId === "string" &&
        a.questionId.length > 0 &&
        typeof a?.topicId === "string" &&
        a.topicId.length > 0 &&
        typeof a?.isCorrect === "boolean" &&
        VALID_TYPES.has(a.questionType as QuestionType),
    )
    .map((a) =>
      questionAttemptToRow(userId, {
        questionId: a.questionId!,
        questionType: a.questionType as QuestionType,
        topicId: a.topicId!,
        selectedAnswer: a.selectedAnswer ?? null,
        isCorrect: a.isCorrect!,
        mistakeReason: a.mistakeReason ?? null,
        timeSpentSeconds:
          typeof a.timeSpentSeconds === "number" ? a.timeSpentSeconds : null,
        sourceTaskId: a.sourceTaskId ?? null,
        answeredAt: a.answeredAt ?? null,
      }),
    );

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "no valid attempts" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  const { error } = await supabase.from("question_attempts").insert(rows);
  if (error) {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: rows.length });
}
