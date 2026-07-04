import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  UNDERSTOOD_STAGES,
  type TopicProgressSummary,
  type TopicStage,
} from "@/types/studyProgress";

export const runtime = "nodejs";

/**
 * POST /api/topic-progress/summary
 * /progress の簡易サマリ用。ステージ別のトピック数を集計して返す。
 * body: { userId? }
 * 返却: { ok, summary: { basicUnderstood, reviewNeeded, weak } }
 *
 * Supabase 未設定: 503（クライアントは非表示で継続） / userId なし: 401
 */
export async function POST(request: Request) {
  let body: { userId?: string } = {};
  try {
    body = (await request.json()) as { userId?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
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

  const { data, error } = await supabase
    .from("topic_progress")
    .select("stage")
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ ok: false, error: "get failed" }, { status: 500 });
  }

  const understood = new Set<TopicStage>(UNDERSTOOD_STAGES);
  const summary: TopicProgressSummary = { basicUnderstood: 0, reviewNeeded: 0, weak: 0 };
  for (const r of (data ?? []) as { stage: string }[]) {
    const stage = r.stage as TopicStage;
    if (understood.has(stage)) summary.basicUnderstood += 1;
    else if (stage === "review_needed") summary.reviewNeeded += 1;
    else if (stage === "weak") summary.weak += 1;
  }

  return NextResponse.json({ ok: true, summary });
}
