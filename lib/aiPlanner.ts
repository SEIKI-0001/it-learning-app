import type { Topic, TopicField } from "@/types/content";
import { FIELD_LABELS } from "@/types/content";
import type {
  ReviewItem,
  StudyPlan,
  TodayActivity,
  TodayMenu,
  TodayMenuEntry,
  TodayMenuItem,
  TodaysLearningQueueItem,
  UserAnswer,
  UserProfile,
  UserProgress,
} from "@/types";
import {
  getAllTopics,
  getRecommendedTopicsForUser,
  getTopic,
} from "@/lib/content";
import { buildTodaysLearningQueue } from "@/lib/learningLoop";
import { BOOK_NEW_SHARE, type BookQueueOptions } from "@/lib/bookStudyPlan";
import { daysUntilExamDate } from "@/lib/planningInputs";

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
  return daysUntilExamDate(profile?.examDate, now);
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
  now: Date = new Date(),
  /**
   * 当日の学習量の上書き（GF-P1-001）。省略時はプロフィールの予算をそのまま使い、
   * 従来と完全に同じメニューになる。上書きするのは「どれだけ」だけで、
   * 「何を」の優先順位（復習期限 > 弱点 > 新規）は変えない。
   */
  dailyMinutesOverride?: number,
  /**
   * トピック学習以外のタスク（関連用語・公式過去問。lib/todayActivities が作る）。
   * 渡したときだけ同じ優先度キューに並べ、時間予算の中で sequence に入れる。
   * 省略時は従来と完全に同じメニューになる。
   */
  activities?: TodayActivity[],
  /**
   * 参考書順（Book mode）。渡したときだけ新規トピックを本の順に並べ、
   * 学習量の BOOK_NEW_SHARE 以上を新規に残す（復習が溜まっても新規が止まらない）。
   * 省略時は従来と完全に同じメニューになる。
   */
  options?: { book?: BookQueueOptions | null },
): TodayMenu {
  const book = options?.book ?? null;
  const budget =
    typeof dailyMinutesOverride === "number" && dailyMinutesOverride > 0
      ? dailyMinutesOverride
      : resolveDailyMinutes(profile);
  const remaining = daysUntilExam(profile, now);

  // 直近の解答で間違いが多いほど、復習を厚くする(解答履歴の活用)。
  const recentWrong = answers
    .slice(-10)
    .filter((a) => !a.isCorrect).length;

  const ranked = buildTodaysLearningQueue({
    state: { profile, progress, answers }, progress, topics, now, activities,
    ...(book ? { book } : {}),
  });
  const reviewAll = ranked
    .filter((item) =>
      item.topicId &&
      (item.kind === "overdue_review" ||
        item.kind === "summary_weak" ||
        item.kind === "low_mastery" ||
        item.kind === "checkpoint_practice"),
    )
    .map((item): ReviewItem => {
      const existing = progress.reviewQueue.find((review) => review.topicId === item.topicId);
      return existing ?? {
        topicId: item.topicId!,
        dueAt: now.toISOString(),
        reason: item.reason,
        reasonCode:
          item.kind === "summary_weak" ? "summary_exam_miss" : "low_mastery",
      };
    });
  const reviewCap =
    (remaining !== null && remaining <= 7) || recentWrong >= 4 ? 3 : 2;
  const reviewItems: ReviewItem[] = reviewAll.slice(0, reviewCap);

  // 共通キューの順を保ったまま、Topic候補を時間予算へ収める。
  // トピックは従来どおり「予算を超えたらそこで打ち切り」。トピック以外のタスクは
  // 収まるものだけ入れる（短い単語タスクが大きなトピックの後ろで締め出されないように）。
  const { items, sequence, used: filled } = book
    ? fillBookMenu(ranked, budget)
    : fillMenu(ranked, budget);
  let used = filled;
  // 「今日のトピックの関連語」は、そのトピックが今日のメニューに入ったときだけ出す。
  const menuTopicIds = new Set(items.map((item) => item.topicId));
  const finalSequence = sequence.filter((entry) => {
    if (entry.type !== "activity" || !entry.activity.anchorTopicId) return true;
    if (menuTopicIds.has(entry.activity.anchorTopicId)) return true;
    used -= entry.activity.estimatedMinutes;
    return false;
  });

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

  const firstLearn = items.find((item) => item.kind === "learn");
  const firstLearnUnit = firstLearn
    ? ranked.find((c) => c.kind === "new_topic" && c.topicId === firstLearn.topicId)?.bookUnitId
    : undefined;
  const bookUnitLabel = book && firstLearnUnit
    ? book.order.units.find((unit) => unit.unitId === firstLearnUnit)?.label
    : undefined;

  return {
    theme,
    totalMinutes: used,
    items,
    reviewItems,
    message,
    ...(activities ? { sequence: finalSequence } : {}),
    ...(bookUnitLabel ? { bookUnitLabel } : {}),
  };
}

type MenuFill = { items: TodayMenuItem[]; sequence: TodayMenuEntry[]; used: number };

function menuItemFor(candidate: TodaysLearningQueueItem): TodayMenuItem | null {
  const t = candidate.topicId ? getTopic(candidate.topicId) : undefined;
  if (!t) return null;
  return {
    topicId: t.id,
    title: t.title,
    field: t.field,
    estimatedMinutes: t.estimatedMinutes,
    kind: candidate.kind === "new_topic" ? "learn" : "review",
  };
}

/** アプリ順（従来）の詰め方。 */
function fillMenu(ranked: TodaysLearningQueueItem[], budget: number): MenuFill {
  const items: TodayMenuItem[] = [];
  const sequence: TodayMenuEntry[] = [];
  let used = 0;
  let topicsClosed = false;
  for (const candidate of ranked) {
    if (candidate.activity) {
      const activity = candidate.activity;
      if (sequence.length > 0 && used + activity.estimatedMinutes > budget) continue;
      sequence.push({ type: "activity", activity });
      used += activity.estimatedMinutes;
      continue;
    }
    if (topicsClosed || !candidate.topicId) continue;
    const item = menuItemFor(candidate);
    if (!item) continue;
    if (sequence.length > 0 && used + item.estimatedMinutes > budget) {
      topicsClosed = true;
      continue;
    }
    items.push(item);
    sequence.push({ type: "topic", item });
    used += item.estimatedMinutes;
    if (used >= budget) topicsClosed = true;
  }
  return { items, sequence, used };
}

/**
 * 参考書順の詰め方。並び（優先度）は同じキューのまま、学習量に枠を設ける。
 *   - 新規（本の順）: 残っていれば最低1件、かつ予算の BOOK_NEW_SHARE を確保する。
 *     本の順を飛ばさないよう、入らないトピックが出たらそこで新規を打ち切る
 *   - 復習・苦手補強と、優先度の高いタスク（公式過去問の解き直し・演習など）:
 *     新規の確保分を除いた枠に入れる（1件も入らないときは、新規1件と合わせて収まれば1件だけ入れる）。
 *     入らなかった期限切れ復習は期限切れのまま翌日以降に残る
 *   - 優先度の低いタスク（復習語・関連語）: 残った時間に収まるものだけ
 * 新規が残っていなければ従来の詰め方と同じ。
 */
function fillBookMenu(ranked: TodaysLearningQueueItem[], budget: number): MenuFill {
  const firstNew = ranked.find((c) => c.kind === "new_topic" && c.topicId);
  if (!firstNew) return fillMenu(ranked, budget);
  const newReserve = Math.max(firstNew.estimatedMinutes, Math.ceil(budget * BOOK_NEW_SHARE));
  const reviewBudget = Math.max(0, budget - newReserve);
  const isHighActivity = (c: TodaysLearningQueueItem) =>
    Boolean(c.activity) && c.priority >= BOOK_HIGH_ACTIVITY_PRIORITY;

  // 1) 復習・苦手補強・優先度の高いタスクを、新規の確保分を除いた枠へ
  const chosen = new Set<string>();
  let used = 0;
  for (const candidate of ranked) {
    const isReviewTopic = !candidate.activity && candidate.topicId && candidate.kind !== "new_topic";
    if (!isReviewTopic && !isHighActivity(candidate)) continue;
    const minutes = candidate.estimatedMinutes;
    const fits = used + minutes <= reviewBudget;
    const firstAlongsideNew = chosen.size === 0 && minutes + firstNew.estimatedMinutes <= budget;
    if (!fits && !firstAlongsideNew) continue;
    chosen.add(candidate.id);
    used += minutes;
  }

  // 2) 新規を本の順に、残りの予算いっぱいまで（最低1件）
  let newCount = 0;
  for (const candidate of ranked) {
    if (candidate.kind !== "new_topic" || !candidate.topicId) continue;
    if (newCount > 0 && used + candidate.estimatedMinutes > budget) break;
    chosen.add(candidate.id);
    used += candidate.estimatedMinutes;
    newCount += 1;
  }

  // 3) 優先度の低いタスクは残った時間に収まるものだけ
  for (const candidate of ranked) {
    if (!candidate.activity || isHighActivity(candidate)) continue;
    if (used + candidate.estimatedMinutes > budget) continue;
    chosen.add(candidate.id);
    used += candidate.estimatedMinutes;
  }

  // キューの順のまま組み立てる
  const items: TodayMenuItem[] = [];
  const sequence: TodayMenuEntry[] = [];
  for (const candidate of ranked) {
    if (!chosen.has(candidate.id)) continue;
    if (candidate.activity) {
      sequence.push({ type: "activity", activity: candidate.activity });
      continue;
    }
    const item = menuItemFor(candidate);
    if (!item) continue;
    items.push(item);
    sequence.push({ type: "topic", item });
  }
  return { items, sequence, used };
}

/** Book mode で、復習と同じ枠に入れるタスクの優先度の下限（公式過去問の解き直し・演習・用語定着待ち）。 */
const BOOK_HIGH_ACTIVITY_PRIORITY = 1000;
