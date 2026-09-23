// 連続正解の検出（純粋ロジック・DOM/React 非依存）。
// 実際に届いた correct / incorrect の並びだけを数える＝推測はしない。
// 規定の回数に達した correct だけを correctStreak（通常の正解より少し強い喜び）へ置き換える。

import type { MochitEventSignal } from "./mochitEvents";

/** 3問連続で最初の強い喜び。その後は5の倍数ごと（毎回だと慣れて特別感が無くなる） */
export function isCorrectStreakMilestone(count: number): boolean {
  return count === 3 || (count > 3 && count % 5 === 0);
}

/** 間がこれ以上空いたら別の学習とみなして数え直す */
export const CORRECT_STREAK_GAP_MS = 10 * 60_000;

export type LearningStreakTracker = {
  /** 受け取ったシグナルを返す。連続正解の節目の correct は correctStreak に置き換える */
  process(signal: MochitEventSignal): MochitEventSignal;
  getCount(): number;
};

export function createLearningStreakTracker(now: () => number = () => Date.now()): LearningStreakTracker {
  let count = 0;
  let lastAt = 0;
  return {
    process(signal) {
      const at = now();
      if (signal.type === "correct") {
        count = at - lastAt > CORRECT_STREAK_GAP_MS ? 1 : count + 1;
        lastAt = at;
        return isCorrectStreakMilestone(count) ? { ...signal, type: "correctStreak" } : signal;
      }
      // 不正解・問題セットの終わり（全問正解/完了/突破）で数え直す。タップ等は数えない
      if (
        signal.type === "incorrect" ||
        signal.type === "allCorrect" ||
        signal.type === "taskComplete" ||
        signal.type === "checkpointClear"
      ) {
        count = 0;
      }
      return signal;
    },
    getCount() {
      return count;
    },
  };
}
