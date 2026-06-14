import type { AppState, ReviewItem, UserAnswer, UserProgress } from "@/types";
import type { Topic } from "@/types/content";
import { calculateLevel } from "@/lib/game";

// ============================================================================
// トピック単位の学習進行(7日固定の completeQuest に代わる新ロジック)。
// すべてイミュータブル: 元の state は変更せず、新しい AppState を返す。
// XP/レベルの計算は lib/game.ts の calculateLevel を再利用する。
// ============================================================================

const DAY_MS = 1000 * 60 * 60 * 24;

/** 同じ日に学習済みか(ストリーク判定用) */
function isSameDay(a: string | undefined, b: Date): boolean {
  if (!a) return false;
  const d = new Date(a);
  return (
    d.getFullYear() === b.getFullYear() &&
    d.getMonth() === b.getMonth() &&
    d.getDate() === b.getDate()
  );
}

/** 連続学習日数を更新する。今日が初回なら+1、間が空いていれば1にリセット。 */
function nextStreak(progress: UserProgress, now: Date): number {
  if (isSameDay(progress.lastPlayedAt, now)) return progress.streakCount;
  if (!progress.lastPlayedAt) return 1;
  const last = new Date(progress.lastPlayedAt);
  const gapDays = Math.floor((now.getTime() - last.getTime()) / DAY_MS);
  return gapDays <= 1 ? progress.streakCount + 1 : 1;
}

/** 正答率(0〜1) */
function correctRatio(answers: UserAnswer[]): number {
  if (answers.length === 0) return 1;
  return answers.filter((a) => a.isCorrect).length / answers.length;
}

/** 復習期限を算出。習熟度が高いほど先送り(簡易の間隔反復)。 */
function nextDueAt(mastery: number, now: Date): string {
  const days = mastery >= 90 ? 7 : mastery >= 70 ? 3 : 1;
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

/** weakTags を再計算(不正解だったタグの集合) */
function recomputeWeakTags(answers: UserAnswer[]): string[] {
  return Array.from(
    new Set(answers.filter((a) => !a.isCorrect).map((a) => a.tag)),
  );
}

/**
 * トピックの学習(確認問題)を完了する。
 * - 習熟度を正答率から更新
 * - XP/レベルを加算(正解+10 / 完了+5 / 新規習得+20)
 * - 完了トピック・解答履歴・苦手タグ・ストリークを更新
 * - 復習キューに次回期限で登録
 */
export function completeTopicStudy(
  state: AppState,
  topicId: string,
  newAnswers: UserAnswer[],
  now: Date = new Date(),
): AppState {
  const ratio = correctRatio(newAnswers);
  const mastery = Math.round(ratio * 100);

  const correctCount = newAnswers.filter((a) => a.isCorrect).length;
  const wasCompleted = state.progress.completedTopics.includes(topicId);
  let gainedExp = correctCount * 10 + 5;
  if (!wasCompleted) gainedExp += 20; // 新規習得ボーナス

  const allAnswers = [...state.answers, ...newAnswers];
  const newExp = state.progress.exp + gainedExp;

  const completedTopics = wasCompleted
    ? state.progress.completedTopics
    : [...state.progress.completedTopics, topicId];

  // 復習キュー: このトピックの既存項目を入れ替える。満点でなければ要復習で登録。
  const queue = state.progress.reviewQueue.filter((r) => r.topicId !== topicId);
  if (mastery < 100) {
    queue.push({
      topicId,
      dueAt: nextDueAt(mastery, now),
      reason: ratio < 0.6 ? "間違えた問題" : "復習期限",
    });
  }

  return {
    profile: state.profile,
    answers: allAnswers,
    progress: {
      ...state.progress,
      exp: newExp,
      level: calculateLevel(newExp),
      streakCount: nextStreak(state.progress, now),
      weakTags: recomputeWeakTags(allAnswers),
      lastPlayedAt: now.toISOString(),
      completedTopics,
      topicMastery: { ...state.progress.topicMastery, [topicId]: mastery },
      reviewQueue: queue,
    },
  };
}

/** トピックを「理解済み」にする。習熟度100・復習キューから除外。 */
export function markTopicMastered(
  state: AppState,
  topicId: string,
  now: Date = new Date(),
): AppState {
  const completedTopics = state.progress.completedTopics.includes(topicId)
    ? state.progress.completedTopics
    : [...state.progress.completedTopics, topicId];
  return {
    ...state,
    progress: {
      ...state.progress,
      completedTopics,
      topicMastery: { ...state.progress.topicMastery, [topicId]: 100 },
      reviewQueue: state.progress.reviewQueue.filter((r) => r.topicId !== topicId),
      lastPlayedAt: now.toISOString(),
    },
  };
}

/** トピックを復習対象に追加する(詳細ページの「復習対象に追加」導線)。 */
export function addTopicToReview(
  state: AppState,
  topicId: string,
  reason = "あとで復習",
  now: Date = new Date(),
): AppState {
  if (state.progress.reviewQueue.some((r) => r.topicId === topicId)) return state;
  const item: ReviewItem = {
    topicId,
    dueAt: now.toISOString(),
    reason,
  };
  return {
    ...state,
    progress: {
      ...state.progress,
      reviewQueue: [...state.progress.reviewQueue, item],
    },
  };
}

/** 3分野ごとの習熟度(0〜100)を平均で算出する。 */
export function fieldMastery(
  progress: UserProgress,
  topics: Topic[],
): Record<Topic["field"], number> {
  const fields: Topic["field"][] = ["technology", "management", "strategy"];
  const result = {} as Record<Topic["field"], number>;
  for (const field of fields) {
    const inField = topics.filter((t) => t.field === field);
    if (inField.length === 0) {
      result[field] = 0;
      continue;
    }
    const sum = inField.reduce(
      (s, t) => s + (progress.topicMastery[t.id] ?? 0),
      0,
    );
    result[field] = Math.round(sum / inField.length);
  }
  return result;
}
