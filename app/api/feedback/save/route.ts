import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";

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
 * 簡易フィードバック（Day1 / Day7 完了後）を保存する。
 * body: { userId: string, dayNo?: number, feedback: FeedbackAnswers }
 */
export async function POST(request: Request) {
  let userId = "";
  let dayNo: number | null = null;
  let feedback: FeedbackAnswers = {};
  try {
    const body = (await request.json()) as {
      userId?: string;
      dayNo?: number;
      feedback?: FeedbackAnswers;
    };
    userId = (body.userId ?? "").trim();
    dayNo = body.dayNo ?? null;
    feedback = body.feedback ?? {};
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
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
