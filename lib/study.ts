import type { AppState, ReviewItem, UserAnswer, UserProgress } from "@/types";
import type { Topic } from "@/types/content";
import { grantExp } from "@/lib/game";
import { advanceStreak } from "@/lib/streak";
import { calculateTopicMastery, masteryForTopic } from "@/lib/mastery";

// ============================================================================
// トピック単位の学習進行(7日固定の completeQuest に代わる新ロジック)。
// すべてイミュータブル: 元の state は変更せず、新しい AppState を返す。
// XP/レベルの計算は lib/game.ts の calculateLevel を再利用する。
// ============================================================================

const DAY_MS = 1000 * 60 * 60 * 24;

// XP の内訳（表示側でも同じ数字を使うため export する。二重管理を防ぐ）。
export const XP_PER_CORRECT = 10; // 確認問題1問正解
export const XP_PER_COMPLETION = 5; // トピック完了
export const XP_NEW_TOPIC_BONUS = 20; // 新規習得ボーナス
export const XP_PER_COMBO = 2; // 3連続正解目以降、1問ごとのコンボボーナス
export const COMBO_BONUS_CAP = 10; // コンボボーナスの上限（XPインフレ防止）

/**
 * 連続正解コンボのXPボーナス。回答順の最長連続正解を求め、
 * 3連続目以降1問につき +XP_PER_COMBO（上限 COMBO_BONUS_CAP）。
 * 2連続まではボーナスなし（緊張感は3連続から報いる）。
 */
export function comboBonus(answers: UserAnswer[]): number {
  let longest = 0;
  let run = 0;
  for (const a of answers) {
    run = a.isCorrect ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  if (longest < 3) return 0;
  return Math.min((longest - 2) * XP_PER_COMBO, COMBO_BONUS_CAP);
}

/** 正答率(0〜1) */
function correctRatio(answers: UserAnswer[]): number {
  if (answers.length === 0) return 1;
  return answers.filter((a) => a.isCorrect).length / answers.length;
}

export type StudyXpReward = {
  multiplier: number;
  label: "new" | "due_review" | "same_day" | "repeat";
};

/**
 * 同じ易しい問題を繰り返してランクだけを上げられないよう、XPを学習価値に応じて調整する。
 * 新規=100%、期限到来復習=60%、同日反復=0%、それ以外の再挑戦=25%。
 */
export function studyXpReward(
  state: AppState,
  topicId: string,
  now: Date = new Date(),
): StudyXpReward {
  if (!state.progress.completedTopics.includes(topicId)) {
    return { multiplier: 1, label: "new" };
  }

  const review = state.progress.reviewQueue.find((item) => item.topicId === topicId);
  if (review && Date.parse(review.dueAt) <= now.getTime()) {
    return { multiplier: 0.6, label: "due_review" };
  }

  const today = now.toISOString().slice(0, 10);
  if (
    state.answers.some(
      (answer) => answer.topicId === topicId && answer.answeredAt.slice(0, 10) === today,
    )
  ) {
    // 同じ日の反復は理解確認として歓迎するが、ランク稼ぎには使えないようXPを付けない。
    return { multiplier: 0, label: "same_day" };
  }

  return { multiplier: 0.25, label: "repeat" };
}

/**
 * 直近の正答率（0〜1）。ゲート判定・バッジ条件の共通ヘルパー。
 * 直近 window 件で計算し、min 件に満たなければ 0（＝判定材料が不足）を返す。
 */
export function recentAccuracy(
  answers: UserAnswer[],
  window = 20,
  min = 5,
): number {
  const recent = answers.slice(-window);
  if (recent.length < min) return 0;
  return recent.filter((a) => a.isCorrect).length / recent.length;
}

/** 復習期限を算出。習熟度が高いほど先送り(簡易の間隔反復)。 */
function nextDueAt(mastery: number, now: Date): string {
  const days = mastery >= 90 ? 7 : mastery >= 70 ? 3 : 1;
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

function afterDays(now: Date, days: number): string {
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
  const allAnswers = [...state.answers, ...newAnswers];
  const topicAnswers = allAnswers.filter((answer) => answer.topicId === topicId);
  const mastery = calculateTopicMastery(topicAnswers, now);

  const correctCount = newAnswers.filter((a) => a.isCorrect).length;
  const wasCompleted = state.progress.completedTopics.includes(topicId);
  const reward = studyXpReward(state, topicId, now);
  const baseRepeatExp = correctCount * XP_PER_CORRECT + XP_PER_COMPLETION + comboBonus(newAnswers);
  let gainedExp = Math.round(baseRepeatExp * reward.multiplier);
  if (!wasCompleted) gainedExp += XP_NEW_TOPIC_BONUS;
  const { exp: newExp, level: newLevel } = grantExp(
    state.progress.exp,
    gainedExp,
  );

  const completedTopics = wasCompleted
    ? state.progress.completedTopics
    : [...state.progress.completedTopics, topicId];

  // 復習キュー: このトピックの既存項目を入れ替える。
  // 満点でも、時間を空けた確認を2回通るまで「理解済み」にはしない。
  const previousReview = state.progress.reviewQueue.find((r) => r.topicId === topicId);
  const queue = state.progress.reviewQueue.filter((r) => r.topicId !== topicId);
  if (ratio < 1) {
    queue.push({
      topicId,
      dueAt: nextDueAt(mastery, now),
      reason: ratio < 0.6 ? "間違えた問題" : "復習期限",
      confirmationCount: 0,
    });
  } else if (!wasCompleted) {
    queue.push({
      topicId,
      dueAt: afterDays(now, 3),
      reason: "定着確認",
      confirmationCount: 0,
    });
  } else if ((previousReview?.confirmationCount ?? 0) < 1) {
    queue.push({
      topicId,
      dueAt: afterDays(now, 7),
      reason: "もう一度定着確認",
      confirmationCount: (previousReview?.confirmationCount ?? 0) + 1,
    });
  }

  // ストリーク更新（1日欠けはおまもりが有れば自動消費して継続）。
  const streak = advanceStreak(state.progress, now);

  return {
    profile: state.profile,
    answers: allAnswers,
    progress: {
      ...state.progress,
      exp: newExp,
      level: newLevel,
      streakCount: streak.streakCount,
      weakTags: recomputeWeakTags(allAnswers),
      lastPlayedAt: now.toISOString(),
      completedTopics,
      topicMastery: { ...state.progress.topicMastery, [topicId]: mastery },
      reviewQueue: queue,
      checkpointProgress: streak.checkpointProgress,
    },
  };
}

/** 復習を一時的に先送りする。自己申告で習熟度や完了状態は変えない。 */
export function snoozeTopicReview(
  state: AppState,
  topicId: string,
  days = 3,
  now: Date = new Date(),
): AppState {
  const existing = state.progress.reviewQueue.find((item) => item.topicId === topicId);
  const queue = state.progress.reviewQueue.filter((item) => item.topicId !== topicId);
  queue.push({
    topicId,
    dueAt: afterDays(now, days),
    reason: `${days}日後に再確認`,
    confirmationCount: existing?.confirmationCount ?? 0,
  });
  return {
    ...state,
    progress: {
      ...state.progress,
      reviewQueue: queue,
    },
  };
}

/**
 * 複数トピックを復習キューへ追加する（重複は追加しない・dueAt は now）。
 * 復習追加の dedup ルールをここに一本化する（最終問題の不合格追加などから再利用）。
 */
export function addTopicsToReview(
  state: AppState,
  topicIds: string[],
  reason = "あとで復習",
  now: Date = new Date(),
): AppState {
  const existing = new Set(state.progress.reviewQueue.map((r) => r.topicId));
  const additions: ReviewItem[] = [];
  for (const topicId of topicIds) {
    if (existing.has(topicId)) continue;
    existing.add(topicId);
    additions.push({ topicId, dueAt: now.toISOString(), reason });
  }
  if (additions.length === 0) return state;
  return {
    ...state,
    progress: {
      ...state.progress,
      reviewQueue: [...state.progress.reviewQueue, ...additions],
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
  return addTopicsToReview(state, [topicId], reason, now);
}

/** 3分野ごとの習熟度(0〜100)を平均で算出する。 */
export function fieldMastery(
  progress: UserProgress,
  topics: Topic[],
  answers: UserAnswer[] = [],
  now: Date = new Date(),
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
      (s, t) => s + masteryForTopic(progress, answers, t.id, now),
      0,
    );
    result[field] = Math.round(sum / inField.length);
  }
  return result;
}
