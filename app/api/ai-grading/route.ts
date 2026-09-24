import { NextResponse } from "next/server";
import { getWrittenQuestion } from "@/data/writtenQuestions";
import {
  gradeWrittenAnswer,
  getModelForProvider,
  GradingError,
} from "@/lib/ai/gradeWrittenAnswer";
import { saveGradingRecord } from "@/lib/ai/gradingRecords";
import { getRequestUserId } from "@/lib/apiUser";
import { isAuthEnabled } from "@/lib/auth/lineSession";
import { DAILY_LIMITS, PLAN_PROVIDER } from "@/lib/billing/constants";
import { countTodayUsage, getUserPlan, logUsage } from "@/lib/billing/plan";
import {
  AI_GRADING_MAX_ANSWER_LENGTH as MAX_ANSWER_LENGTH,
  AI_GRADING_MIN_ANSWER_LENGTH as MIN_ANSWER_LENGTH,
  type AiGradingMode,
} from "@/types/aiGrading";

export const runtime = "nodejs";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * POST /api/ai-grading
 * 記述問題の回答を AI で採点する。
 * body: { questionId: string, userAnswer: string, userId?: string, mode?: AiGradingMode }
 *
 * - mode="understanding_check": 章末のAI理解チェック。不足点を具体的に指摘させる指示を足す。
 *   回数制限・ログイン要否・履歴保存は通常採点と同じ（同じ1回として数える）。
 *
 * - free ユーザー: Gemini（通常採点） / pro ユーザー: Claude Sonnet（Pro採点）
 * - userAnswer が空 / 20文字未満: 400（AI は呼ばない）
 * - questionId が存在しない: 404
 * - 1日の回数上限超過: 429（AI は呼ばない）
 * - 採点成功: 200 { ok: true, result, meta }
 * - 採点失敗: 502（ユーザーには簡潔なメッセージのみ）
 *
 * APIキーはサーバー側（lib/ai/*）でのみ使用し、クライアントへ露出しない。
 */
export async function POST(request: Request) {
  let body: { questionId?: string; userAnswer?: string; userId?: string; mode?: string } = {};
  try {
    body = (await request.json()) as {
      questionId?: string;
      userAnswer?: string;
      userId?: string;
      mode?: string;
    };
  } catch {
    return NextResponse.json(
      { ok: false, error: "リクエストの形式が正しくありません。" },
      { status: 400 }
    );
  }

  const questionId = (body.questionId ?? "").trim();
  const userAnswer = (body.userAnswer ?? "").trim();
  // 未知の値は通常採点として扱う（古いクライアントや改ざんで採点を止めない）。
  const mode: AiGradingMode = body.mode === "understanding_check" ? "understanding_check" : "standard";
  const userId = await getRequestUserId(body);

  // production では匿名AI採点を禁止。非productionでは既存の auth-enabled ゲートを維持する。
  if (!userId && (isProduction() || isAuthEnabled())) {
    return NextResponse.json(
      { ok: false, error: "AI採点を使うにはログインが必要です。" },
      { status: 401 }
    );
  }

  // 空 / 短すぎる回答は AI を呼ばずに弾く。
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
  if (userAnswer.length > MAX_ANSWER_LENGTH) {
    return NextResponse.json(
      {
        ok: false,
        error: "回答が長すぎます。要点を2,000文字以内にまとめてください。",
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

  // プラン判定 → 利用回数チェック（AI 呼び出し前）。
  const plan = await getUserPlan(userId);
  const limit = DAILY_LIMITS[plan];
  const provider = PLAN_PROVIDER[plan];
  const used = await countTodayUsage(userId);

  // userId があるとき（＝回数を追跡できるとき）のみ上限を適用する。
  if (userId && used >= limit) {
    await logUsage({
      userId,
      provider,
      model: getModelForProvider(provider),
      questionId,
      status: "rate_limited",
    });
    return NextResponse.json(
      {
        ok: false,
        error: `本日のAI採点の上限（${limit}回）に達しました。明日また挑戦できます。`,
        meta: { plan, usage: { used, limit, remaining: 0 } },
      },
      { status: 429 }
    );
  }

  try {
    const outcome = await gradeWrittenAnswer(question, userAnswer, { provider, mode });

    await logUsage({
      userId,
      provider: outcome.provider,
      model: outcome.model,
      questionId,
      status: "success",
    });

    // 回答記録を学習記録として保存する（回数ログとは別テーブル）。失敗しても採点結果は返す。
    await saveGradingRecord({
      userId,
      question,
      userAnswer,
      result: outcome.result,
      provider: outcome.provider,
      model: outcome.model,
    });

    const usedAfter = used + 1;
    return NextResponse.json({
      ok: true,
      result: outcome.result,
      meta: {
        plan,
        provider: outcome.provider,
        model: outcome.model,
        fallback: outcome.fallback,
        usage: {
          used: usedAfter,
          limit,
          remaining: Math.max(0, limit - usedAfter),
        },
      },
    });
  } catch (e) {
    // 詳細はサーバーログにだけ残す。
    if (e instanceof GradingError) {
      console.error("[ai-grading] grading error:", e.message);
    } else {
      console.error("[ai-grading] unexpected error:", e);
    }

    await logUsage({
      userId,
      provider,
      model: getModelForProvider(provider),
      questionId,
      status: "error",
    });

    // Pro（Claude）採点の失敗はその旨を伝える。
    const error =
      plan === "pro"
        ? "Claude採点に失敗しました。時間をおいてもう一度試してください。"
        : "採点に失敗しました。時間をおいてもう一度試してください。";
    return NextResponse.json({ ok: false, error }, { status: 502 });
  }
}
