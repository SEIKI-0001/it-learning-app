import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getRequestUserId } from "@/lib/apiUser";
import {
  topicProgressRowToProgress,
  topicProgressToRow,
  topicCheckPackAttemptToRow,
  type TopicProgressRow,
} from "@/lib/dbMappers";
import { judgeRates, decidePackStage } from "@/lib/checkPackJudge";
import { refreshIntegratedStatusForUser } from "@/lib/progressBootstrap";

export const runtime = "nodejs";

// 確認パックの結果を topic_check_pack_attempts に保存し、topic_progress.stage を更新する。
//
// 判定・ステージ更新は lib/checkPackJudge（純粋関数）に集約している。
//   確認問題(基礎理解) / 単語帳(用語定着) / 過去問レベル(本番対応力) の「結果」で判定し、
//   本番対応OK（exam_ready）は過去問レベル問題の結果でのみ与える。自己申告では上げない。
//
// - Supabase 未設定: 503（クライアントはローカル結果表示で継続） / userId なし: 401 / body 不正: 400

function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function clampRate(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export async function POST(request: Request) {
  let body: {
    userId?: string;
    packId?: string;
    topicId?: string;
    quizRate?: number | null;
    flashcardRate?: number | null;
    examLevelRate?: number | null;
    startedAt?: string;
    date?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const userId = await getRequestUserId(body);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const packId = (body.packId ?? "").trim();
  const topicId = (body.topicId ?? "").trim();
  if (!packId || !topicId) {
    return NextResponse.json({ ok: false, error: "invalid pack" }, { status: 400 });
  }

  const rates = {
    quizRate: clampRate(body.quizRate),
    flashcardRate: clampRate(body.flashcardRate),
    examLevelRate: clampRate(body.examLevelRate),
  };
  const date = isIsoDate(body.date) ? body.date : new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  // 既存の topic_progress を読む（連続失敗回数・回数カウントの引き継ぎに使う）。
  const { data: existingRow, error: getError } = await supabase
    .from("topic_progress")
    .select(
      "id, user_id, topic_id, stage, latest_quiz_score, latest_exam_level_score, quiz_attempt_count, exam_level_attempt_count, consecutive_failed_count, last_attempted_at, next_review_at",
    )
    .eq("user_id", userId)
    .eq("topic_id", topicId)
    .maybeSingle();

  if (getError) {
    return NextResponse.json({ ok: false, error: "get failed" }, { status: 500 });
  }

  const prev = existingRow
    ? topicProgressRowToProgress(existingRow as TopicProgressRow)
    : null;

  const judgement = judgeRates(rates);
  const decision = decidePackStage(judgement, prev?.consecutiveFailedCount ?? 0);

  // 1) パック結果を保存。
  const attemptRow = topicCheckPackAttemptToRow(userId, {
    packId,
    topicId,
    startedAt: body.startedAt ?? null,
    completedAt: now,
    quizScoreRate: rates.quizRate,
    flashcardScoreRate: rates.flashcardRate,
    examLevelScoreRate: rates.examLevelRate,
    resultStatus: decision.resultStatus,
    nextAction: decision.nextAction,
  });
  const { error: attemptError } = await supabase
    .from("topic_check_pack_attempts")
    .insert(attemptRow);
  if (attemptError) {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  // 2) topic_progress を更新。
  const row = topicProgressToRow(userId, topicId, {
    stage: decision.stage,
    latestQuizScore: rates.quizRate ?? prev?.latestQuizScore ?? null,
    latestExamLevelScore: rates.examLevelRate ?? prev?.latestExamLevelScore ?? null,
    quizAttemptCount:
      (prev?.quizAttemptCount ?? 0) + (judgement.quizAttempted ? 1 : 0),
    examLevelAttemptCount:
      (prev?.examLevelAttemptCount ?? 0) + (judgement.examAttempted ? 1 : 0),
    consecutiveFailedCount: decision.consecutiveFailedCount,
    lastAttemptedAt: now,
    nextReviewAt: prev?.nextReviewAt ?? null,
  });
  const { error: upsertError } = await supabase
    .from("topic_progress")
    .upsert(row, { onConflict: "user_id,topic_id" });
  if (upsertError) {
    return NextResponse.json({ ok: false, error: "save failed" }, { status: 500 });
  }

  // 3) 対応する当日タスク（確認問題・過去問レベル）があれば「アプリ実績・完了」に更新する。
  const doneTaskTypes: string[] = [];
  if (judgement.quizAttempted) doneTaskTypes.push("topic_quiz");
  if (judgement.examAttempted) doneTaskTypes.push("exam_level");
  if (doneTaskTypes.length > 0) {
    await supabase
      .from("daily_study_tasks")
      .update({ status: "completed", completion_source: "app_actual", updated_at: now })
      .eq("user_id", userId)
      .eq("date", date)
      .eq("topic_id", topicId)
      .in("task_type", doneTaskTypes);
  }

  // 統合進捗の当日スナップショットを更新する（合格準備度に即反映）。
  // 失敗してもこのレスポンスは成功のまま返す（進捗保存自体は完了しているため）。
  try {
    await refreshIntegratedStatusForUser(supabase, userId);
  } catch {
    /* fail-safe */
  }

  return NextResponse.json({
    ok: true,
    stage: decision.stage,
    resultStatus: decision.resultStatus,
    nextAction: decision.nextAction,
    rates,
  });
}
