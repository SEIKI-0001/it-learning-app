import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

// TODO(本番公開前): この集計エンドポイントと /admin は現在「認証なし」で誰でも閲覧可能。
// 個人の回答・フィードバックを含むため、本番公開前には必ず認証/認可を追加すること
// （例: Basic 認証 / Vercel パスワード保護 / 管理者ロール + Supabase RLS ポリシー）。

type ProgressRow = {
  user_id: string;
  current_day: number;
  exp: number;
  level: number;
  completed_days: number[] | null;
  streak_count: number;
};

type AnswerRow = {
  user_id: string;
  day_no: number;
  is_correct: boolean;
  tag: string | null;
};

/**
 * GET /api/admin/summary
 * 管理画面用の集計を返す。
 */
export async function GET() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  const [users, progress, answers, feedback] = await Promise.all([
    supabase.from("line_users").select("id, line_user_id, display_name, created_at"),
    supabase
      .from("user_progress")
      .select("user_id, current_day, exp, level, completed_days, streak_count"),
    supabase.from("user_answers").select("user_id, day_no, is_correct, tag"),
    supabase
      .from("user_feedback")
      .select("user_id, day_no, q1_service, q2_tedious, q3_unclear, q4_onemore, q5_easier, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (users.error || progress.error || answers.error || feedback.error) {
    return NextResponse.json({ ok: false, error: "query failed" }, { status: 500 });
  }

  const userRows = users.data ?? [];
  const progressRows = (progress.data ?? []) as ProgressRow[];
  const answerRows = (answers.data ?? []) as AnswerRow[];

  // ---- ファネル集計 -------------------------------------------------------
  const totalUsers = userRows.length;

  // Day1 開始 = Day1 の問題を1問でも回答したユーザー
  const day1StartedSet = new Set(
    answerRows.filter((a) => a.day_no === 1).map((a) => a.user_id),
  );
  const day1Started = day1StartedSet.size;

  const completedIncludes = (row: ProgressRow, day: number) =>
    (row.completed_days ?? []).includes(day);

  const day1Completed = progressRows.filter((r) => completedIncludes(r, 1)).length;
  // Day3 到達 = current_day が 3 以上（= Day1,2 をクリアして Day3 に進んだ）
  const day3Reached = progressRows.filter((r) => r.current_day >= 3).length;
  const day7Completed = progressRows.filter((r) => completedIncludes(r, 7)).length;

  // ---- 正答率 -------------------------------------------------------------
  const totalAnswers = answerRows.length;
  const correctAnswers = answerRows.filter((a) => a.is_correct).length;
  const averageAccuracy =
    totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  // ---- 苦手タグランキング（不正解の多いタグ順） --------------------------
  const weakTagCount = new Map<string, number>();
  for (const a of answerRows) {
    if (!a.is_correct && a.tag) {
      weakTagCount.set(a.tag, (weakTagCount.get(a.tag) ?? 0) + 1);
    }
  }
  const weakTagRanking = Array.from(weakTagCount.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  // ---- ユーザー別 ---------------------------------------------------------
  const progressByUser = new Map(progressRows.map((r) => [r.user_id, r]));
  const userList = userRows.map((u) => {
    const p = progressByUser.get(u.id);
    return {
      userId: u.id,
      lineUserId: u.line_user_id as string,
      displayName: (u.display_name as string | null) ?? null,
      currentDay: p?.current_day ?? 0,
      exp: p?.exp ?? 0,
      level: p?.level ?? 0,
      completedDays: p?.completed_days ?? [],
      createdAt: u.created_at as string,
    };
  });

  return NextResponse.json({
    ok: true,
    funnel: {
      totalUsers,
      day1Started,
      day1Completed,
      day3Reached,
      day7Completed,
    },
    accuracy: { averageAccuracy, correctAnswers, totalAnswers },
    weakTagRanking,
    users: userList,
    feedback: feedback.data ?? [],
  });
}
