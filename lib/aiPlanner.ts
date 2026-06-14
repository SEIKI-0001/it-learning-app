import type { Topic, TopicField } from "@/types/content";
import { FIELD_LABELS } from "@/types/content";
import type {
  ReviewItem,
  StudyPlan,
  TodayMenu,
  TodayMenuItem,
  UserAnswer,
  UserProfile,
  UserProgress,
} from "@/types";
import {
  getAllTopics,
  getRecommendedTopicsForUser,
  getReviewItemsForUser,
  getTopic,
} from "@/lib/content";

// ============================================================================
// AIプランナー抽象層
// ----------------------------------------------------------------------------
// 役割: ユーザーのプロフィール・進捗・解答履歴から「全体プラン」と「今日のメニュー」
//       を生成する。今は **ルールベースの仮実装**。
//
// 重要(設計上の約束):
//   - 7日固定ロジックにしない。学習はトピック単位で、試験日から逆算する。
//   - 入出力(UserProfile / UserProgress / StudyPlan / TodayMenu)は素直なJSON的構造。
//     → 将来 generateStudyPlan / generateTodayMenu の中身を OpenAI / Claude などの
//       LLM 呼び出しに差し替えても、呼び出し側(Web/LINE)は変更不要にする。
//   - 例(将来): const res = await llm.complete({ system, input: { profile, progress } })
//               return parseStudyPlan(res)
// ============================================================================

const ALL_FIELDS: TopicField[] = ["technology", "management", "strategy"];

/** プロフィールから1日の目安学習時間(分)を求める。 */
function resolveDailyMinutes(profile?: UserProfile): number {
  if (!profile) return 10;
  if (typeof profile.weekdayMinutes === "number" && profile.weekdayMinutes > 0) {
    return profile.weekdayMinutes;
  }
  const parsed = Number.parseInt(profile.dailyMinutes ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

/** 試験日までの残り日数(未設定なら null)。 */
export function daysUntilExam(
  profile?: UserProfile,
  now: Date = new Date(),
): number | null {
  if (!profile?.examDate) return null;
  const exam = new Date(`${profile.examDate}T00:00:00`);
  if (Number.isNaN(exam.getTime())) return null;
  const ms = exam.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/** 分野ごとの重み(合計1)。苦手分野を厚くする。 */
function computeFieldFocus(
  profile?: UserProfile,
): { field: TopicField; weight: number }[] {
  const weak = new Set(profile?.weakFields ?? []);
  const raw = ALL_FIELDS.map((field) => ({
    field,
    base: 1 + (weak.has(field) ? 1 : 0),
  }));
  const total = raw.reduce((s, r) => s + r.base, 0);
  return raw.map((r) => ({ field: r.field, weight: r.base / total }));
}

/**
 * 全体学習プランを生成する(ルールベース仮実装)。
 * 試験日から逆算し、学習可能時間・3分野バランス・苦手分野を考慮する。
 */
export function generateStudyPlan(
  profile: UserProfile | undefined,
  progress: UserProgress,
  topics: Topic[] = getAllTopics(),
): StudyPlan {
  const remaining = daysUntilExam(profile);
  const dailyMinutesTarget = resolveDailyMinutes(profile);
  const fieldFocus = computeFieldFocus(profile);

  const recommended = getRecommendedTopicsForUser({
    progress,
    weakFields: profile?.weakFields,
  }).filter((t) => topics.includes(t));

  let message: string;
  if (remaining === null) {
    message =
      "まずは試験予定日を設定しましょう。決まると、残り日数から逆算して毎日の分量を調整します。";
  } else if (remaining <= 0) {
    message = "試験当日ですね。これまで間違えた問題の見直しに集中しましょう。";
  } else {
    const weakLabels = (profile?.weakFields ?? [])
      .map((f) => FIELD_LABELS[f])
      .join("・");
    const focus = weakLabels ? `${weakLabels}を中心に、` : "";
    message = `試験まであと${remaining}日。1日あたり約${dailyMinutesTarget}分、${focus}3分野をバランスよく進めましょう。`;
  }

  return {
    daysUntilExam: remaining,
    dailyMinutesTarget,
    fieldFocus,
    recommendedTopicIds: recommended.map((t) => t.id),
    message,
  };
}

/**
 * 今日の学習メニューを生成する(ルールベース仮実装)。
 * 試験日・学習可能時間・進捗・重要度・苦手分野・復習対象から、
 * 「新規学習トピック + 復習」を時間予算に収まる範囲で組み立てる。
 */
export function generateTodayMenu(
  profile: UserProfile | undefined,
  progress: UserProgress,
  topics: Topic[] = getAllTopics(),
  answers: UserAnswer[] = [],
): TodayMenu {
  const budget = resolveDailyMinutes(profile);
  const remaining = daysUntilExam(profile);

  // 直近の解答で間違いが多いほど、復習を厚くする(解答履歴の活用)。
  const recentWrong = answers
    .slice(-10)
    .filter((a) => !a.isCorrect).length;

  // 復習を先に確保。試験が近い/直近の間違いが多いほど復習比率を上げる。
  const reviewAll = getReviewItemsForUser({
    progress,
    weakFields: profile?.weakFields,
  });
  const reviewCap =
    (remaining !== null && remaining <= 7) || recentWrong >= 4 ? 3 : 2;
  const reviewItems: ReviewItem[] = reviewAll.slice(0, reviewCap);

  // 新規学習トピックを時間予算に収まるだけ積む(最低1件)。
  const recommended = getRecommendedTopicsForUser({
    progress,
    weakFields: profile?.weakFields,
  }).filter((t) => topics.includes(t));

  const items: TodayMenuItem[] = [];
  let used = 0;
  for (const t of recommended) {
    if (items.length > 0 && used + t.estimatedMinutes > budget) break;
    items.push({
      topicId: t.id,
      title: t.title,
      field: t.field,
      estimatedMinutes: t.estimatedMinutes,
      kind: "learn",
    });
    used += t.estimatedMinutes;
    if (used >= budget) break;
  }

  const reviewMinutes = reviewItems.reduce(
    (s, r) => s + (getTopic(r.topicId)?.estimatedMinutes ?? 3),
    0,
  );

  const primary = items[0] ? getTopic(items[0].topicId) : undefined;
  const theme = primary
    ? `${FIELD_LABELS[primary.field]}：${primary.title}`
    : reviewItems.length > 0
      ? "今日は復習デー"
      : "学習トピックを追加しましょう";

  let message: string;
  if (items.length === 0 && reviewItems.length === 0) {
    message =
      "学べるトピックがまだありません。トピック一覧から興味のある分野を見てみましょう。";
  } else if (remaining !== null && remaining <= 3) {
    message = "試験直前です。新しい暗記より、間違えた問題の見直しを優先しましょう。";
  } else {
    message = "今日のぶんを終えたら『完了』を押して、ストリークを伸ばしましょう。";
  }

  return {
    theme,
    totalMinutes: used + reviewMinutes,
    items,
    reviewItems,
    message,
  };
}
