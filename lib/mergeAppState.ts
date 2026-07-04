import type {
  AppState,
  ReviewItem,
  UserAnswer,
  UserProgress,
  WeeklyPlan,
} from "@/types";

// ============================================================================
// AppState のマージ（複数端末の同期用・純粋関数）
// ----------------------------------------------------------------------------
// 背景:
//   進捗の保存は user_progress 行の丸ごと UPSERT のため、古い localStorage を
//   持つ端末がそのまま保存すると、他端末で進めた進捗を巻き戻してしまう。
//   セッション復元時にサーバー状態をローカルへ取り込む際、このマージを通して
//   「両方の進捗の和」を作り、巻き戻しを防ぐ。
//
// 方針:
//   - 進捗は「多く進んでいる方」を採用する（完了・習熟度・XPは失われない値）。
//   - プロフィールは設定画面で保存時に即DBへ書くため、サーバー側を正とする
//     （試験日変更などを他端末へ伝播させる）。サーバーに無ければローカルを使う。
//   - 回答履歴は questionId + answeredAt で重複排除した和集合。
// ============================================================================

/** 復習キューを topicId でマージする。同じトピックは期限が早い方を残す。 */
function mergeReviewQueue(a: ReviewItem[], b: ReviewItem[]): ReviewItem[] {
  const byTopic = new Map<string, ReviewItem>();
  for (const item of [...a, ...b]) {
    const prev = byTopic.get(item.topicId);
    if (!prev || item.dueAt < prev.dueAt) byTopic.set(item.topicId, item);
  }
  return [...byTopic.values()];
}

/**
 * 今週のタスクリストをマージする。
 * より新しい週（weekStartDate が後）を採用し、同じ週なら topicIds/reviewIds を
 * 和集合にする（両端末で別々に確定したリストを取りこぼさない）。
 */
function mergeWeeklyPlan(
  a: WeeklyPlan | null | undefined,
  b: WeeklyPlan | null | undefined,
): WeeklyPlan | null {
  if (!a) return b ?? null;
  if (!b) return a;
  if (a.weekStartDate === b.weekStartDate) {
    return {
      weekStartDate: a.weekStartDate,
      topicIds: [...new Set([...a.topicIds, ...b.topicIds])],
      reviewIds: [...new Set([...a.reviewIds, ...b.reviewIds])],
    };
  }
  return a.weekStartDate > b.weekStartDate ? a : b;
}

/** 2つの進捗をマージする（どちらの端末で進めた分も失わない）。 */
export function mergeProgress(a: UserProgress, b: UserProgress): UserProgress {
  // 連続日数と最終学習日は対で意味を持つため、最後に学習した側を採用する。
  const aTime = a.lastPlayedAt ? Date.parse(a.lastPlayedAt) : 0;
  const bTime = b.lastPlayedAt ? Date.parse(b.lastPlayedAt) : 0;
  const latest = bTime > aTime ? b : a;

  const topicMastery: Record<string, number> = { ...a.topicMastery };
  for (const [topicId, value] of Object.entries(b.topicMastery)) {
    topicMastery[topicId] = Math.max(topicMastery[topicId] ?? 0, value);
  }

  return {
    level: Math.max(a.level, b.level),
    exp: Math.max(a.exp, b.exp),
    streakCount: latest.streakCount,
    weakTags: [...new Set([...a.weakTags, ...b.weakTags])],
    lastPlayedAt: latest.lastPlayedAt ?? (bTime > aTime ? a : b).lastPlayedAt,
    completedTopics: [...new Set([...a.completedTopics, ...b.completedTopics])],
    topicMastery,
    reviewQueue: mergeReviewQueue(a.reviewQueue, b.reviewQueue),
    weeklyPlan: mergeWeeklyPlan(a.weeklyPlan, b.weeklyPlan),
    // 旧版互換フィールドも「進んでいる方」を残す。
    currentDay: Math.max(a.currentDay ?? 1, b.currentDay ?? 1),
    completedDays: [...new Set([...(a.completedDays ?? []), ...(b.completedDays ?? [])])].sort(
      (x, y) => x - y,
    ),
  };
}

/** 回答履歴の和集合（questionId + answeredAt で重複排除、回答日時順）。 */
export function mergeAnswers(a: UserAnswer[], b: UserAnswer[]): UserAnswer[] {
  const seen = new Map<string, UserAnswer>();
  for (const ans of [...a, ...b]) {
    seen.set(`${ans.questionId}@${ans.answeredAt}`, ans);
  }
  return [...seen.values()].sort((x, y) => x.answeredAt.localeCompare(y.answeredAt));
}

/**
 * ローカルの AppState にサーバーの AppState を取り込む。
 * local: この端末の localStorage / server: DB から復元した状態。
 */
export function mergeAppState(local: AppState, server: AppState): AppState {
  return {
    profile: server.profile ?? local.profile,
    progress: mergeProgress(local.progress, server.progress),
    answers: mergeAnswers(local.answers, server.answers),
  };
}
