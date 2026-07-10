import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { getAllTopics } from "@/lib/content";
import { FIELD_LABELS, type TopicField } from "@/types/content";

export const runtime = "nodejs";

const USERS_PER_PAGE = 50;

type DashboardPayload = {
  overview: {
    totalUsers: number;
    examDateUsers: number;
    todayStudyUsers: number;
    todayAnswers: number;
    reviewQueueUsers: number;
  };
  accuracy: { correctAnswers: number; totalAnswers: number };
  topicMastery: { topicId: string; learners: number; avgMastery: number }[];
  weakFields: { field: string; count: number }[];
  weakTagRanking: { tag: string; count: number }[];
  recentAnswers: {
    userId: string;
    displayName: string;
    topicId: string | null;
    tag: string | null;
    isCorrect: boolean;
    answeredAt: string;
  }[];
  users: {
    userId: string;
    lineUserId: string | null;
    displayName: string;
    examDate: string | null;
    completedTopics: number;
    reviewQueue: number;
    exp: number;
    level: number;
    streakCount: number;
    lastPlayedAt: string | null;
    createdAt: string;
  }[];
};

/** Asia/Tokyo の「今日0時」を ISO 文字列で返す。 */
function startOfTodayJstIso(): string {
  const JST = 9 * 60 * 60 * 1000;
  const nowJst = new Date(Date.now() + JST);
  const startUtcMs =
    Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate()) - JST;
  return new Date(startUtcMs).toISOString();
}

function pageFromRequest(request: Request): number {
  const raw = new URL(request.url).searchParams.get("page");
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export async function GET(request: Request) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 503 },
    );
  }

  const page = pageFromRequest(request);
  const { data, error } = await supabase.rpc("admin_dashboard_summary", {
    p_today_start: startOfTodayJstIso(),
    p_user_limit: USERS_PER_PAGE,
    p_user_offset: (page - 1) * USERS_PER_PAGE,
  });
  if (error || !data) {
    console.error("[admin] dashboard summary failed:", error?.message);
    return NextResponse.json({ ok: false, error: "query failed" }, { status: 500 });
  }

  const dashboard = data as DashboardPayload;
  const topics = getAllTopics();
  const titleById = new Map(topics.map((topic) => [topic.id, topic]));
  const topicMasteryById = new Map(
    (dashboard.topicMastery ?? []).map((item) => [item.topicId, item]),
  );
  const topicMastery = topics.map((topic) => {
    const aggregate = topicMasteryById.get(topic.id);
    return {
      topicId: topic.id,
      title: topic.title,
      field: topic.field,
      fieldLabel: FIELD_LABELS[topic.field],
      learners: aggregate?.learners ?? 0,
      avgMastery: aggregate?.avgMastery ?? 0,
    };
  });

  const weakFieldById = new Map(
    (dashboard.weakFields ?? []).map((item) => [item.field, item.count]),
  );
  const weakFields = (["strategy", "management", "technology"] as TopicField[]).map(
    (field) => ({
      field,
      label: FIELD_LABELS[field],
      count: weakFieldById.get(field) ?? 0,
    }),
  );
  const totalAnswers = dashboard.accuracy?.totalAnswers ?? 0;
  const correctAnswers = dashboard.accuracy?.correctAnswers ?? 0;

  return NextResponse.json({
    ok: true,
    overview: dashboard.overview,
    accuracy: {
      totalAnswers,
      correctAnswers,
      averageAccuracy:
        totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
    },
    topicMastery,
    weakFields,
    weakTagRanking: dashboard.weakTagRanking ?? [],
    recentAnswers: (dashboard.recentAnswers ?? []).map((answer) => ({
      userId: answer.userId,
      displayName: answer.displayName,
      topicId: answer.topicId,
      topicTitle: answer.topicId
        ? (titleById.get(answer.topicId)?.title ?? answer.topicId)
        : answer.tag,
      isCorrect: answer.isCorrect,
      answeredAt: answer.answeredAt,
    })),
    users: dashboard.users ?? [],
    pagination: {
      page,
      perPage: USERS_PER_PAGE,
      totalUsers: dashboard.overview.totalUsers,
      totalPages: Math.max(1, Math.ceil(dashboard.overview.totalUsers / USERS_PER_PAGE)),
    },
  });
}
