import { NextResponse } from "next/server";
import { getWrittenQuestion } from "@/data/writtenQuestions";
import {
  gradeWrittenAnswer,
  GradingError,
} from "@/lib/ai/gradeWrittenAnswer";

export const runtime = "nodejs";

const MIN_ANSWER_LENGTH = 20;

/**
 * POST /api/ai-grading
 * 記述問題の回答を AI（Gemini）で採点する。
 * body: { questionId: string, userAnswer: string }
 *
 * - userAnswer が空 / 20文字未満: 400（Gemini は呼ばない）
 * - questionId が存在しない: 404
 * - 採点成功: 200 { ok: true, result: GradeResult }
 * - 採点失敗: 502（ユーザーには簡潔なメッセージのみ）
 *
 * APIキーはサーバー側（lib/ai/gradeWrittenAnswer）でのみ使用し、クライアントへ露出しない。
 */
export async function POST(request: Request) {
  let body: { questionId?: string; userAnswer?: string } = {};
  try {
    body = (await request.json()) as {
      questionId?: string;
      userAnswer?: string;
    };
  } catch {
    return NextResponse.json(
      { ok: false, error: "リクエストの形式が正しくありません。" },
      { status: 400 }
    );
  }

  const questionId = (body.questionId ?? "").trim();
  const userAnswer = (body.userAnswer ?? "").trim();

  // 空 / 短すぎる回答は Gemini を呼ばずに弾く。
  if (userAnswer.length < MIN_ANSWER_LENGTH) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "もう少し詳しく書いてください。理由・仕組み・具体例を含めると採点できます。",
      },
      { status: 400 }
    );
  }

  const question = getWrittenQuestion(questionId);
  if (!question) {
    return NextResponse.json(
      { ok: false, error: "問題が見つかりませんでした。" },
      { status: 404 }
    );
  }

  try {
    const result = await gradeWrittenAnswer(question, userAnswer);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    // 詳細はサーバーログにだけ残す。
    if (e instanceof GradingError) {
      console.error("[ai-grading] grading error:", e.message);
    } else {
      console.error("[ai-grading] unexpected error:", e);
    }
    return NextResponse.json(
      {
        ok: false,
        error: "採点に失敗しました。時間をおいてもう一度試してください。",
      },
      { status: 502 }
    );
  }
}
