// 週間レポート。answers の answeredAt から直近7日間の積み上げを集計する。
// ユーザーを責めない・データが少なくても自然に出す・「今週も少し進んだ」が分かる設計。

import type { AppState, UserAnswer } from "@/types";

const DAY = 86_400_000;

export type WeeklyReport = {
  hasData: boolean; // 今週の解答が1問でもあるか
  answered: number; // 今週の解答数
  correct: number; // 今週の正解数
  accuracy: number | null; // 今週の正答率(0〜100)。解答0なら null
  daysStudied: number; // 今週学習した日数(暦日)
  topicsTouched: number; // 今週触れたトピック数
  topMissedTag: { tag: string; count: number } | null; // よく間違えたタグ
  reviewWaiting: number; // 復習待ち件数(現在)
  deltaAnswered: number | null; // 先週比(解答数)。先週データなしは null
};

function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function parseMs(a: UserAnswer): number | null {
  const t = new Date(a.answeredAt).getTime();
  return Number.isNaN(t) ? null : t;
}

/** 直近7日間の学習状況を集計する。 */
export function weeklyReport(state: AppState, now: Date = new Date()): WeeklyReport {
  const reviewWaiting = (state.progress.reviewQueue ?? []).length;
  const nowMs = now.getTime();
  const weekAgo = nowMs - 7 * DAY;
  const twoWeeksAgo = nowMs - 14 * DAY;

  const thisWeek: UserAnswer[] = [];
  let lastWeekCount = 0;
  for (const a of state.answers ?? []) {
    const t = parseMs(a);
    if (t === null) continue;
    if (t >= weekAgo && t <= nowMs) thisWeek.push(a);
    else if (t >= twoWeeksAgo && t < weekAgo) lastWeekCount++;
  }

  const answered = thisWeek.length;
  const correct = thisWeek.filter((a) => a.isCorrect).length;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null;

  const days = new Set<string>();
  const topics = new Set<string>();
  const missed = new Map<string, number>();
  for (const a of thisWeek) {
    const t = parseMs(a);
    if (t !== null) days.add(dayKey(t));
    if (a.topicId) topics.add(a.topicId);
    if (!a.isCorrect && a.tag) missed.set(a.tag, (missed.get(a.tag) ?? 0) + 1);
  }

  let topMissedTag: { tag: string; count: number } | null = null;
  for (const [tag, count] of missed) {
    if (!topMissedTag || count > topMissedTag.count) topMissedTag = { tag, count };
  }

  // 先週に解答があるときだけ先週比を出す(なければ無理に比較しない)。
  const deltaAnswered = lastWeekCount > 0 ? answered - lastWeekCount : null;

  return {
    hasData: answered > 0,
    answered,
    correct,
    accuracy,
    daysStudied: days.size,
    topicsTouched: topics.size,
    topMissedTag,
    reviewWaiting,
    deltaAnswered,
  };
}
