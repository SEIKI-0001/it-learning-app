import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getAllTopics } from "@/lib/content";
import { FIELD_LABELS, type TopicField } from "@/types/content";

export const runtime = "nodejs";

// 管理画面用の集計（ITパスポート学習コーチ）。
// 認証は proxy.ts(Basic 認証)で前段に実施。ここは集計のみ。
// 7日固定モデル(current_day / completed_days / Day funnel)の指標は撤去した。

type ProfileRow = {
  user_id: string;
  exam_date: string | null;
  weak_fields: string[] | null;
};

type ProgressRow = {
  user_id: string;
  exp: number;
  level: number;
  streak_count: number;
  completed_topics: string[] | null;
  topic_mastery: Record<string, number> | null;
  review_queue: { topicId: string }[] | null;
  last_played_at: string | null;
};

type AnswerRow = {
  user_id: string;
  topic_id: string | null;
  is_correct: boolean;
  tag: string | null;
  answered_at: string;
};

/** Asia/Tokyo の「今日0時」を ISO 文字列で返す。 */
function startOfTodayJstIso(): string {
  const JST = 9 * 60 * 60 * 1000;
  const nowJst = new Date(Date.now() + JST);
  const startUtcMs =
    Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate()) - JST;
  return new Date(startUtcMs).toISOString();
}

export async function GET() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  const [users, profiles, progress, answers] = await Promise.all([
    supabase.from("line_users").select("id, line_user_id, display_name, created_at"),
    supabase.from("user_profiles").select("user_id, exam_date, weak_fields"),
    supabase
      .from("user_progress")
      .select(
        "user_id, exp, level, streak_count, completed_topics, topic_mastery, review_queue, last_played_at",
      ),
    supabase
      .from("user_answers")
      .select("user_id, topic_id, is_correct, tag, answered_at")
      .order("answered_at", { ascending: false }),
  ]);

  if (users.error || profiles.error || progress.error || answers.error) {
    return NextResponse.json({ ok: false, error: "query failed" }, { status: 500 });
  }

  const userRows = users.data ?? [];
  const profileRows = (profiles.data ?? []) as ProfileRow[];
  const progressRows = (progress.data ?? []) as ProgressRow[];
  const answerRows = (answers.data ?? []) as AnswerRow[];

  const topics = getAllTopics();
  const titleById = new Map(topics.map((t) => [t.id, t]));

  // ---- 概況 ---------------------------------------------------------------
  const totalUsers = userRows.length;
  const examDateUsers = profileRows.filter((p) => Boolean(p.exam_date)).length;
  const reviewQueueUsers = progressRows.filter(
    (p) => Array.isArray(p.review_queue) && p.review_queue.length > 0,
  ).length;

  const todayStart = startOfTodayJstIso();
  const todayAnswerRows = answerRows.filter((a) => a.answered_at >= todayStart);
  const todayAnswers = todayAnswerRows.length;
  const todayStudyUsers = new Set(todayAnswerRows.map((a) => a.user_id)).size;

  // ---- 正答率 -------------------------------------------------------------
  const totalAnswers = answerRows.length;
  const correctAnswers = answerRows.filter((a) => a.is_correct).length;
  const averageAccuracy =
    totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

  // ---- トピック別 習熟度（全ユーザーの平均） ------------------------------
  const masteryAcc = new Map<string, { sum: number; learners: number }>();
  for (const p of progressRows) {
    const m = p.topic_mastery ?? {};
    for (const [topicId, value] of Object.entries(m)) {
      const cur = masteryAcc.get(topicId) ?? { sum: 0, learners: 0 };
      cur.sum += Number(value) || 0;
      cur.learners += 1;
      masteryAcc.set(topicId, cur);
    }
  }
  const topicMastery = topics.map((t) => {
    const acc = masteryAcc.get(t.id);
    return {
      topicId: t.id,
      title: t.title,
      field: t.field,
      fieldLabel: FIELD_LABELS[t.field],
      learners: acc?.learners ?? 0,
      avgMastery: acc && acc.learners > 0 ? Math.round(acc.sum / acc.learners) : 0,
    };
  });

  // ---- 苦手分野（プロフィール申告） + 苦手タグ（不正解の多い順） ----------
  const weakFieldCount = new Map<TopicField, number>();
  for (const p of profileRows) {
    for (const f of p.weak_fields ?? []) {
      const field = f as TopicField;
      weakFieldCount.set(field, (weakFieldCount.get(field) ?? 0) + 1);
    }
  }
  const weakFields = (["strategy", "management", "technology"] as TopicField[]).map(
    (field) => ({ field, label: FIELD_LABELS[field], count: weakFieldCount.get(field) ?? 0 }),
  );

  const weakTagCount = new Map<string, number>();
  for (const a of answerRows) {
    if (!a.is_correct && a.tag) {
      weakTagCount.set(a.tag, (weakTagCount.get(a.tag) ?? 0) + 1);
    }
  }
  const weakTagRanking = Array.from(weakTagCount.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  // ---- 回答履歴（直近30件） -----------------------------------------------
  const displayByUser = new Map(
    userRows.map((u) => [
      u.id,
      (u.display_name as string | null) ?? (u.line_user_id as string).slice(0, 8),
    ]),
  );
  const recentAnswers = answerRows.slice(0, 30).map((a) => ({
    userId: a.user_id,
    displayName: displayByUser.get(a.user_id) ?? a.user_id.slice(0, 8),
    topicId: a.topic_id,
    topicTitle: a.topic_id ? (titleById.get(a.topic_id)?.title ?? a.topic_id) : a.tag,
    isCorrect: a.is_correct,
    answeredAt: a.answered_at,
  }));

  // ---- LINE経由ユーザーの進捗 ---------------------------------------------
  const profileByUser = new Map(profileRows.map((p) => [p.user_id, p]));
  const progressByUser = new Map(progressRows.map((p) => [p.user_id, p]));
  const userList = userRows.map((u) => {
    const p = progressByUser.get(u.id);
    const pr = profileByUser.get(u.id);
    return {
      userId: u.id,
      lineUserId: u.line_user_id as string,
      displayName: (u.display_name as string | null) ?? null,
      examDate: pr?.exam_date ?? null,
      completedTopics: p?.completed_topics?.length ?? 0,
      reviewQueue: Array.isArray(p?.review_queue) ? p!.review_queue.length : 0,
      exp: p?.exp ?? 0,
      level: p?.level ?? 0,
      streakCount: p?.streak_count ?? 0,
      lastPlayedAt: p?.last_played_at ?? null,
      createdAt: u.created_at as string,
    };
  });

  return NextResponse.json({
    ok: true,
    overview: {
      totalUsers,
      examDateUsers,
      todayStudyUsers,
      todayAnswers,
      reviewQueueUsers,
    },
    accuracy: { averageAccuracy, correctAnswers, totalAnswers },
    topicMastery,
    weakFields,
    weakTagRanking,
    recentAnswers,
    users: userList,
  });
}
