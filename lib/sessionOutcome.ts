// 学習完了直後の「何が変わったか」を実測差分から組み立てる（GF-P0-005・純関数）。
//
// 誠実さの境界（要件書 GF-P0-005 Acceptance Criteria）:
//   - 演出だけで準備度・習熟度・弱点値を変更しない。ここは読み取り専用。
//   - 合格準備度は「サーバー再計算が成功し、比較可能な値がある」ときだけ X → Y を出す。
//     再計算未完了・証拠不足・値不変のときは「測定データを更新」という事実表現にする。
//   - XP・レベル・ランク・バッジ獲得・CP突破・ストリーク節目はここでは扱わない。
//     lib/celebration.ts が既に演出しており、同じ成果を2回通知しないため。
//
// 表示順は要件書 §9.2 の優先順位に従う:
//   学習成果 > 合格への意味 > 進行 > ゲーム報酬

import type { AppState, UserAnswer } from "@/types";
import type { SessionOutcome } from "@/types/gameful";
import { SESSION_OUTCOME_LIMIT } from "@/types/gameful";
import { buildCheckpointGate, getCheckpointProgress } from "@/lib/checkpoints";
import { getWeakTopics } from "@/lib/learningLoop";

/** 比較可能な合格準備度の前後値。どちらか欠けたら X → Y を出さない。 */
export type ReadinessComparison = {
  before: number | null;
  after: number | null;
};

function masteryOf(state: AppState, topicId: string): number | null {
  const detailed = state.progress.topicMasteryStats?.[topicId]?.masteryScore;
  if (typeof detailed === "number") return detailed;
  const plain = state.progress.topicMastery?.[topicId];
  return typeof plain === "number" ? plain : null;
}

/** 今回正解した問題のうち、それ以前の解答が誤答だったものの数。 */
function revengeCount(before: AppState, answers: UserAnswer[]): number {
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
 * 学習前後の状態差分から、見せる価値のある成果を最大4件返す。
 * 必ず1件以上返る（具体差分が無くても測定更新の事実は必ず起きるため）。
 */
export function buildSessionOutcome(input: {
  before: AppState;
  after: AppState;
  topicId: string;
  answers: UserAnswer[];
  /** サーバー再計算の前後値。未取得・失敗時は省略する。 */
  readiness?: ReadinessComparison;
}): SessionOutcome[] {
  const { before, after, topicId, answers, readiness } = input;
  const outcomes: SessionOutcome[] = [];

  // --- Rank 1: 学習成果 ------------------------------------------------------
  const revenged = revengeCount(before, answers);
  if (revenged > 0) {
    outcomes.push({
      kind: "revenge",
      label: "前回まちがえた問題に正解",
      detail: `${revenged}問`,
    });
  }

  const masteryBefore = masteryOf(before, topicId);
  const masteryAfter = masteryOf(after, topicId);
  if (masteryAfter !== null && masteryBefore !== masteryAfter) {
    outcomes.push({
      kind: "mastery",
      label: "このトピックの理解度",
      detail: masteryBefore === null ? `${masteryAfter}` : `${masteryBefore} → ${masteryAfter}`,
    });
  }

  // --- Rank 2: 合格への意味 --------------------------------------------------
  const wasQueued = before.progress.reviewQueue.some((item) => item.topicId === topicId);
  const stillQueued = after.progress.reviewQueue.some((item) => item.topicId === topicId);
  if (wasQueued && !stillQueued) {
    outcomes.push({ kind: "review_cleared", label: "復習キューから外れました", detail: null });
  }

  const wasWeak = getWeakTopics(before.progress.topicMasteryStats ?? {}).some(
    (weak) => weak.topicId === topicId,
  );
  const stillWeak = getWeakTopics(after.progress.topicMasteryStats ?? {}).some(
    (weak) => weak.topicId === topicId,
  );
  if (wasWeak && !stillWeak) {
    outcomes.push({ kind: "weak_resolved", label: "弱点の判定から外れました", detail: null });
  }

  // 合格準備度は「両方の実測値が揃っていて、かつ動いた」ときだけ具体値を出す。
  if (
    readiness &&
    typeof readiness.before === "number" &&
    typeof readiness.after === "number" &&
    readiness.before !== readiness.after
  ) {
    outcomes.push({
      kind: "readiness",
      label: "合格準備度",
      detail: `${readiness.before}% → ${readiness.after}%`,
    });
  }

  // --- Rank 3: 進行 ----------------------------------------------------------
  // CP が進んだ場合は cpCleared の演出が担当するので、同じCP内の充足だけを見る。
  const cpBefore = getCheckpointProgress(before).currentCheckpointId;
  const cpAfter = getCheckpointProgress(after).currentCheckpointId;
  if (cpBefore === cpAfter) {
    const gateBefore = buildCheckpointGate(before, cpBefore);
    const gateAfter = buildCheckpointGate(after, cpAfter);
    if (gateAfter.earnedRequiredCount > gateBefore.earnedRequiredCount) {
      outcomes.push({
        kind: "checkpoint",
        label: `CP${gateAfter.checkpoint.order}の必須バッジ`,
        detail: `${gateBefore.earnedRequiredCount}/${gateBefore.totalRequiredCount} → ${gateAfter.earnedRequiredCount}/${gateAfter.totalRequiredCount}`,
      });
    }
  }

  // --- 最低1件の保証 ---------------------------------------------------------
  // 完了処理は必ず測定データを更新する。具体差分が出せなくても事実として示す。
  if (outcomes.length === 0) {
    outcomes.push({
      kind: "measurement",
      label: "理解度の測定データを更新しました",
      detail: null,
    });
  }

  return outcomes.slice(0, SESSION_OUTCOME_LIMIT);
}
