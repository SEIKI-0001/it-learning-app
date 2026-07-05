import { NextResponse } from "next/server";
import { getWrittenQuestions } from "@/data/writtenQuestions";
import { loadGradingRecordsForUser } from "@/lib/ai/gradingRecords";
import { getRequestUserId } from "@/lib/apiUser";
import { getBillingStatusSnapshot } from "@/lib/billing/plan";
import type { GradingRecord } from "@/types/aiGrading";

export const runtime = "nodejs";

const QUESTIONS = getWrittenQuestions();

// 最初の未回答問題のindex（無ければ0）。
function firstUnansweredIndex(records: GradingRecord[]): number {
  const answered = new Set(records.map((r) => r.questionId));
  const i = QUESTIONS.findIndex((q) => !answered.has(q.id));
  return i === -1 ? 0 : i;
}

/**
 * POST /api/ai-grading/bootstrap
 * /ai-grading 初期表示用に、ユーザー解決・課金状態・採点履歴・初期問題indexをまとめて返す。
 * body: { userId?: string }（userId は後方互換時のみ参照）
 *
 * 未ログイン / Supabase 未設定でも、既存の個別APIと同じく画面を止めずに
 * free 状態・空履歴へフォールバックする。
 */
export async function POST(request: Request) {
  let body: { userId?: string } = {};
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    // body なしでもセッション Cookie から解決できる。
  }

  const userId = await getRequestUserId(body);
  const [billingStatus, gradingHistory] = await Promise.all([
    getBillingStatusSnapshot(userId),
    loadGradingRecordsForUser(userId),
  ]);

  return NextResponse.json({
    ok: true,
    userId,
    billingStatus,
    gradingHistory,
    initialQuestionIndex: firstUnansweredIndex(gradingHistory),
  });
}
