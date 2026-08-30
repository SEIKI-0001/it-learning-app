// モチットに渡す学習コンテキストの組み立て（GF-P0-004・純関数・保存なし）。
//
// 発言の材料は「保存済みの学習事実」か「確定済みの計算結果」だけに限る
// （要件書 §1.1-4）。ここは学習前後の AppState を読むだけで、進行状態を作らない。
// 事実が無い項目は undefined のままにして、モチットに推測を語らせない。

import type { AppState, UserAnswer } from "@/types";
import type { MochitContext } from "@/components/mochit/mochitEvents";
import { buildCheckpointGate, getCheckpointProgress } from "@/lib/checkpoints";
import { getStreakMeta } from "@/lib/streak";

/** 今回正解した問題のうち、それ以前の解答が誤答だったものの数。 */
function countRecovered(before: AppState, answers: UserAnswer[]): number {
  let count = 0;
  for (const answer of answers) {
    if (!answer.isCorrect) continue;
    const prior = before.answers
      .filter((past) => past.questionId === answer.questionId)
      .sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
    const last = prior[prior.length - 1];
    if (last && !last.isCorrect) count += 1;
  }
  return count;
}

/**
 * 学習完了1回ぶんの確定事実からモチットのコンテキストを組み立てる。
 * 該当する事実が無ければ空オブジェクト（＝汎用メッセージにフォールバックする）。
 */
export function buildMochitContext(input: {
  before: AppState;
  after: AppState;
  topicId: string;
  answers: UserAnswer[];
  /** 今回新たに獲得したバッジID。Celebration との二重通知を避けるために使う。 */
  newlyEarnedBadgeIds?: string[];
}): MochitContext {
  const { before, after, topicId, answers, newlyEarnedBadgeIds = [] } = input;
  const context: MochitContext = {};

  const recovered = countRecovered(before, answers);
  if (recovered > 0) context.recoveredCount = recovered;

  const wasQueued = before.progress.reviewQueue.some((item) => item.topicId === topicId);
  const stillQueued = after.progress.reviewQueue.some((item) => item.topicId === topicId);
  if (wasQueued && !stillQueued) context.reviewCleared = true;

  if (newlyEarnedBadgeIds.length > 0) context.badgeJustEarned = true;

  // CP が進んだ場合は cpCleared の演出が担当するので、同じCP内だけを見る。
  const cpBefore = getCheckpointProgress(before).currentCheckpointId;
  const cpAfter = getCheckpointProgress(after).currentCheckpointId;
  if (cpBefore === cpAfter) {
    const gateBefore = buildCheckpointGate(before, cpBefore);
    const gateAfter = buildCheckpointGate(after, cpAfter);
    if (!gateBefore.finalExamUnlocked && gateAfter.finalExamUnlocked) {
      context.finalExamUnlocked = true;
    } else if (!gateAfter.finalExamUnlocked) {
      const remaining = gateAfter.totalRequiredCount - gateAfter.earnedRequiredCount;
      if (remaining > 0) context.remainingRequiredBadges = remaining;
    }
  }

  const metaBefore = getStreakMeta(before.progress);
  const metaAfter = getStreakMeta(after.progress);
  // 自己ベストは「更新され、かつ今の連続日数がその値」のときだけ言う。
  if (
    metaAfter.longestStreak > metaBefore.longestStreak &&
    after.progress.streakCount === metaAfter.longestStreak
  ) {
    context.personalBestStreak = metaAfter.longestStreak;
  }
  if (metaAfter.shieldsUsed > metaBefore.shieldsUsed) context.streakShieldUsed = true;

  return context;
}
