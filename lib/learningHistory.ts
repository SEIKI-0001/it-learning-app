// 学習ヒートマップ・累計スタッツ・あゆみ年表の導出（GF-P1-004・純関数・保存なし）。
//
// 要件書 §12 のとおり LearningHistorySummary は「導出優先」。ここでは
// question_attempts に相当するローカルの解答履歴と checkpoint_progress から
// すべて組み立て、再構築できる値を二重に保存しない。
//
// 表示の約束:
//   - 未学習日は「失敗」ではない。強度0の中立な日として扱い、警告色を割り当てない。
//   - 日付境界はユーザーのローカル日付に合わせる（UTC スライスは使わない）。

import type { AppState, UserAnswer } from "@/types";
import { localDateOf } from "@/lib/dailyQuests";
import { getCheckpoint, getCheckpointProgress } from "@/lib/checkpoints";
import { getBadge } from "@/lib/badges";
import { getStreakMeta } from "@/lib/streak";

/** ヒートマップ1日ぶん。 */
export type HeatmapDay = {
  /** ローカル日付 "YYYY-MM-DD"。 */
  date: string;
  /** その日の日付（1〜31）。 */
  dayOfMonth: number;
  /** 週の何曜日か（0=日）。月初の余白を作るのに使う。 */
  weekday: number;
  answerCount: number;
  correctCount: number;
  /**
   * 表示強度 0〜4。0 は「学習していない日」で、失敗ではない。
   * 色分けは呼び出し側が中立色の濃淡で行う。
   */
  intensity: 0 | 1 | 2 | 3 | 4;
};

export type LearningHeatmap = {
  year: number;
  /** 1〜12。 */
  month: number;
  days: HeatmapDay[];
  /** その月に学習した日数。 */
  studiedDayCount: number;
};

/** 解答数から表示強度を決める。0問は 0（中立）。 */
function intensityOf(answerCount: number): HeatmapDay["intensity"] {
  if (answerCount <= 0) return 0;
  if (answerCount < 5) return 1;
  if (answerCount < 10) return 2;
  if (answerCount < 20) return 3;
  return 4;
}

/** ローカル日付ごとの解答集計。 */
function countByLocalDate(answers: UserAnswer[]): Map<string, { total: number; correct: number }> {
  const byDate = new Map<string, { total: number; correct: number }>();
  for (const answer of answers) {
    const parsed = new Date(answer.answeredAt);
    if (Number.isNaN(parsed.getTime())) continue;
    const key = localDateOf(parsed);
    const entry = byDate.get(key) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (answer.isCorrect) entry.correct += 1;
    byDate.set(key, entry);
  }
  return byDate;
}

/**
 * 指定月（既定は now の月）の日別学習量。
 * その月のすべての日を返し、学習していない日も intensity 0 として含める。
 */
export function buildLearningHeatmap(input: {
  answers: UserAnswer[];
  now?: Date;
}): LearningHeatmap {
  const now = input.now ?? new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const byDate = countByLocalDate(input.answers);

  const dayCount = new Date(year, month + 1, 0).getDate();
  const days: HeatmapDay[] = [];
  let studiedDayCount = 0;

  for (let day = 1; day <= dayCount; day++) {
    const date = new Date(year, month, day);
    const key = localDateOf(date);
    const entry = byDate.get(key);
    const answerCount = entry?.total ?? 0;
    if (answerCount > 0) studiedDayCount += 1;
    days.push({
      date: key,
      dayOfMonth: day,
      weekday: date.getDay(),
      answerCount,
      correctCount: entry?.correct ?? 0,
      intensity: intensityOf(answerCount),
    });
  }

  return { year, month: month + 1, days, studiedDayCount };
}

export type LifetimeStats = {
  totalAnswers: number;
  totalCorrect: number;
  /** 1問でも解いた日の数。 */
  studyDayCount: number;
  /** 自己ベストの連続学習日数。 */
  longestStreak: number;
};

/** 累計スタッツ。すべて既存ログから数える。 */
export function buildLifetimeStats(state: AppState): LifetimeStats {
  const byDate = countByLocalDate(state.answers);
  const meta = getStreakMeta(state.progress);
  return {
    totalAnswers: state.answers.length,
    totalCorrect: state.answers.filter((answer) => answer.isCorrect).length,
    studyDayCount: byDate.size,
    // 自己ベストが未記録の旧データでは、現在の連続日数を下限として扱う。
    longestStreak: Math.max(meta.longestStreak, state.progress.streakCount),
  };
}

export type JourneyEventKind = "started" | "badge" | "checkpoint";

/** あゆみ年表の1件。 */
export type JourneyEvent = {
  kind: JourneyEventKind;
  /** ISO 日時。 */
  at: string;
  label: string;
};

/**
 * 「あゆみ」年表。日時が確定しているイベントだけを新しい順で返す。
 *
 * 自己ベストのストリークは達成日時を保存していないため年表には出さない
 * （日付を推測して並べると事実でなくなる）。累計スタッツ側で示す。
 */
export function buildJourneyTimeline(state: AppState): JourneyEvent[] {
  const cp = getCheckpointProgress(state);
  const events: JourneyEvent[] = [];

  const firstAnswer = [...state.answers].sort((a, b) =>
    a.answeredAt.localeCompare(b.answeredAt),
  )[0];
  if (firstAnswer) {
    events.push({ kind: "started", at: firstAnswer.answeredAt, label: "学習をはじめた日" });
  }

  for (const earned of cp.earnedBadges) {
    const badge = getBadge(earned.badgeId);
    if (!badge) continue;
    events.push({
      kind: "badge",
      at: earned.earnedAt,
      label: `バッジ「${badge.label}」を獲得`,
    });
  }

  for (const attempt of cp.finalExamAttempts) {
    if (!attempt.passed) continue;
    const checkpoint = getCheckpoint(attempt.checkpointId);
    events.push({
      kind: "checkpoint",
      at: attempt.attemptedAt,
      label: `CP${checkpoint.order}「${checkpoint.title}」を突破`,
    });
  }

  return events.sort((a, b) => b.at.localeCompare(a.at));
}
