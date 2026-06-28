import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";

export const runtime = "nodejs";

type FeedbackAnswers = {
  q1_service?: string;
  q2_tedious?: string;
  q3_unclear?: string;
  q4_onemore?: string;
  q5_easier?: string;
};

/**
 * POST /api/feedback/save
 * 簡易フィードバックを保存する。ユーザーはセッション（Google / LINE Cookie）から解決する。
 * body: { dayNo?: number, feedback: FeedbackAnswers }（userId は後方互換時のみ参照）
 */
export async function POST(request: Request) {
  let dayNo: number | null = null;
  let feedback: FeedbackAnswers = {};
  let body: { userId?: string; dayNo?: number; feedback?: FeedbackAnswers } = {};
  try {
    body = (await request.json()) as {
      userId?: string;
      dayNo?: number;
      feedback?: FeedbackAnswers;
    };
    dayNo = body.dayNo ?? null;
    feedback = body.feedback ?? {};
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "supabase not configured" }, { status: 503 });
  }

  const { error } = await supabase.from("user_feedback").insert({
    user_id: userId,
    day_no: dayNo,
    q1_service: feedback.q1_service ?? null,
    q2_tedious: feedback.q2_tedious ?? null,
    q3_unclear: feedback.q3_unclear ?? null,
    q4_onemore: feedback.q4_onemore ?? null,
    q5_easier: feedback.q5_easier ?? null,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: "feedback save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
