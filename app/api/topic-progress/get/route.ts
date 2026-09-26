import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import type { TopicStage } from "@/types/studyProgress";

export const runtime = "nodejs";

/**
 * POST /api/topic-progress/get
 * 1トピックの現在ステージを返す（/today の確認パック導線の出し分けに使う）。
 * body: { userId?, topicId }
 * 返却: { ok, stage }（未記録なら stage="not_started"）
 *
 * body: { userId?, all: true } のときは記録済みの全トピックを返す
 * 返却: { ok, stages: { [topicId]: stage } }（未記録のトピックは含めない）。
 * Today が「用語定着中（terms_stabilizing）」のトピックを1回の通信で知るために使う。
 *
 * Supabase 未設定: 503 / userId なし: 401 / body 不正: 400
 */
export async function POST(request: Request) {
  let body: { userId?: string; topicId?: string; all?: boolean } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const all = body.all === true;
  const topicId = (body.topicId ?? "").trim();
  if (!all && !topicId) {
    return NextResponse.json({ ok: false, error: "invalid topic" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  if (all) {
    const { data, error } = await supabase
      .from("topic_progress")
      .select("topic_id, stage")
      .eq("user_id", userId);
    if (error) {
      return NextResponse.json({ ok: false, error: "get failed" }, { status: 500 });
    }
    const stages: Record<string, TopicStage> = {};
    for (const row of (data ?? []) as { topic_id: string; stage: string }[]) {
      if (row.topic_id && row.stage) stages[row.topic_id] = row.stage as TopicStage;
    }
    return NextResponse.json({ ok: true, stages });
  }

  const { data, error } = await supabase
    .from("topic_progress")
    .select("stage")
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "get failed" }, { status: 500 });
  }

  const stage = ((data?.stage as string) ?? "not_started") as TopicStage;
  return NextResponse.json({ ok: true, stage });
}
