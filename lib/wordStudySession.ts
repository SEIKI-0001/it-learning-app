"use client";

// 単語帳の1セッションを終えたときの後処理（カード学習・4択の共通）。
//   - Today から来たタスクなら、今日のタスクを「済み」にする（lib/todayActivityLog）
//   - 「覚えた」「正解」になった語数を今日のミッションへ反映する（開くだけでは進まない）。
//     用語ミッションは Today の用語タスクとして学んだ分だけを数える。
// 単語ごとの進捗（lib/wordlistProgress）は回答のたびに記録済みなので、ここでは触らない。

import { applyDailyQuestProgress } from "@/lib/dailyQuests";
import { loadAppState, saveAppState } from "@/lib/storage";
import { markTodayActivityDone } from "@/lib/todayActivityLog";
import { getUserId, saveProgressToDb } from "@/lib/userSession";
import { ACTIVITY_KEYS } from "@/lib/todayActivitySpec";

const VOCAB_TASK_ID: string = ACTIVITY_KEYS.vocab;

export function completeWordStudySession(params: {
  /** 「覚えた」「正解」になった語数。 */
  cleared: number;
  /** Today のタスク id（Today から来ていなければ null）。 */
  todayTaskId: string | null;
}): void {
  markTodayActivityDone(params.todayTaskId);
  if (params.cleared <= 0) return;
  const state = loadAppState();
  if (!state) return;
  const next = applyDailyQuestProgress(state, {
    kind: "words",
    correct: 0,
    total: 0,
    isReview: false,
    maxCombo: 0,
    wordsCleared: params.cleared,
    fromTodayTask: params.todayTaskId === VOCAB_TASK_ID,
  });
  if (next === state) return;
  saveAppState(next);
  const userId = getUserId();
  if (userId) saveProgressToDb(userId, next.progress);
}
