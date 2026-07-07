// 学習セッション完了の単一オーケストレータ。
//
// 「トピックの確認問題を完了する」という1イベントの副作用を1か所に集約する:
//   1. completeTopicStudy … 習熟度・XP(レベル同期)・復習キュー・ストリークを更新
//   2. applyBadgeProgress … 条件を満たしたバッジを確定付与（ランダム非依存）
//   3. applyBadgeDrop     … 新規獲得があったときだけ追加ドロップを1回（補助報酬のみ）
//
// これを /today・/review・トピック確認問題の各画面から共通で呼ぶことで、
// 「どの画面で完了したかでバッジ付与・ドロップ有無が変わる」不整合をなくす。
// useBadgeSync は取りこぼしを拾う冪等な catch-up として残す（主経路はここ）。

import type { AppState, UserAnswer } from "@/types";
import type { BadgeSignals } from "@/lib/badges";
import { completeTopicStudy } from "@/lib/study";
import {
  applyStreakMilestones,
  getStreakMeta,
  type StreakMilestone,
} from "@/lib/streak";
import { applyBadgeProgress } from "@/lib/checkpoints";
import { applyBadgeDrop } from "@/lib/badgeDrops";

export type StudySessionResult = {
  state: AppState;
  /** 今回新たに獲得したバッジID。 */
  newlyEarnedIds: string[];
  /** 追加ドロップの表示ラベル（発生しなければ null）。 */
  dropLabel: string | null;
  /** 今回受領したストリーク節目（無ければ null）。演出(emitCelebration)用。 */
  streakMilestone: StreakMilestone | null;
  /** 今回おまもりがストリークを守ったか（完了画面の表示用）。 */
  shieldConsumed: boolean;
};

/**
 * トピック学習を完了し、バッジ確定付与・追加ドロップまでを一括で行う。
 * 画面側は返り値の state を保存し、newlyEarnedIds / dropLabel を演出に使うだけでよい。
 */
export function completeStudySession(
  state: AppState,
  topicId: string,
  answers: UserAnswer[],
  signals?: BadgeSignals,
  now: Date = new Date(),
): StudySessionResult {
  const studied = completeTopicStudy(state, topicId, answers, now);
  // ストリーク節目のXP・おまもり付与（受領済みはスキップされる冪等処理）。
  const milestoned = applyStreakMilestones(studied);
  const awarded = applyBadgeProgress(milestoned.state, signals, now);

  let finalState = awarded.state;
  let dropLabel: string | null = null;
  // 条件達成（新規獲得あり）のときだけ追加ドロップを1回。進行は動かさない。
  if (awarded.newlyEarnedIds.length > 0) {
    const dropped = applyBadgeDrop(finalState);
    finalState = dropped.state;
    dropLabel = `${dropped.drop.emoji} ${dropped.drop.label}`;
  }

  return {
    state: finalState,
    newlyEarnedIds: awarded.newlyEarnedIds,
    dropLabel,
    streakMilestone: milestoned.milestone,
    shieldConsumed:
      getStreakMeta(finalState.progress).shieldsUsed >
      getStreakMeta(state.progress).shieldsUsed,
  };
}
