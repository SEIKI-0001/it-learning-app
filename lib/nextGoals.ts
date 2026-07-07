// 「あと少し」ネクストゴールの算出（目標勾配の可視化・純関数・保存データなし）。
//
// ゴールに近いほどモチベーションが上がる（目標勾配効果）ため、進捗率が
// 0.5〜0.95 の「あと少し」のゴールを優先して見せる。ソースはすべて既存関数:
//   - 突破試験の解放まで: buildCheckpointGate の必須バッジ充足
//   - 次のランクまで: getRankStatus の remaining/ratio
//   - 次のストリーク節目まで: lib/streak の STREAK_MILESTONES
// 「次のバッジ」のテキスト提示は TodayPolicyStrip が担うため、ここでは
// 数値バーで見せられるゴールだけを扱う（重複させない）。

import type { AppState } from "@/types";
import { buildCheckpointGate, getCheckpointProgress } from "@/lib/checkpoints";
import { getRankStatus } from "@/lib/rank";
import { getStreakMeta, STREAK_MILESTONES } from "@/lib/streak";

export type NextGoal = {
  kind: "gate" | "rank" | "streak";
  emoji: string;
  label: string;
  /** 残りの具体量（例: 「必須バッジ あと1個」）。 */
  detail: string;
  ratio: number; // 0〜1
  href: string;
};

/** 「あと少し」(0.5〜0.95)を最優先に、進捗率の高い順に並べたゴール一覧。 */
export function buildNextGoals(state: AppState): NextGoal[] {
  const goals: NextGoal[] = [];

  // 突破試験の解放まで（必須バッジの充足度）
  const cpProgress = getCheckpointProgress(state);
  const gate = buildCheckpointGate(state, cpProgress.currentCheckpointId);
  if (gate.checkpoint.finalExam && !gate.finalExamUnlocked) {
    const target = gate.requiredBadgeCount;
    const current = Math.min(gate.earnedRequiredCount, target);
    goals.push({
      kind: "gate",
      emoji: "⚔️",
      label: `突破試験（CP${gate.checkpoint.order}）の解放`,
      detail: `必須バッジ あと${Math.max(0, target - current)}個`,
      ratio: target > 0 ? current / target : 0,
      href: "/badges",
    });
  }

  // 次のランクまで
  const rank = getRankStatus(state.progress.exp);
  if (!rank.isMax && rank.next) {
    goals.push({
      kind: "rank",
      emoji: rank.next.emoji,
      label: `次のランク「${rank.next.name}」`,
      detail: `あと ${rank.remaining} XP`,
      ratio: rank.ratio,
      href: "/rank",
    });
  }

  // 次のストリーク節目まで（受領済みの節目はスキップ）
  const streak = state.progress.streakCount;
  const claimed = new Set(getStreakMeta(state.progress).claimedMilestones);
  const nextMilestone = STREAK_MILESTONES.find(
    (d) => !claimed.has(d) && d > streak,
  );
  if (nextMilestone !== undefined && streak > 0) {
    goals.push({
      kind: "streak",
      emoji: "🔥",
      label: `ストリーク${nextMilestone}日の節目`,
      detail: `あと${nextMilestone - streak}日`,
      ratio: streak / nextMilestone,
      href: "/today",
    });
  }

  // 「あと少し」ゾーンを最優先、その中では進捗率の高い順。
  const zone = (g: NextGoal) => (g.ratio >= 0.5 && g.ratio < 0.95 ? 0 : 1);
  return goals.sort((a, b) => zone(a) - zone(b) || b.ratio - a.ratio);
}
