// 「この学習をすると何が進むか」を行動前に開示する（GF-P0-002・純関数・保存なし）。
//
// 誠実さの境界（要件書 GF-P0-002 Acceptance Criteria）:
//   - 架空数値・保証できない「+○%」を出さない。
//   - 合格準備度の上昇値は事前予測しない（完了後の実測差分だけが具体値を持てる）。
//   - 出すのは「確定して更新対象になる項目」だけ。
//
// 必須バッジ・CP 進行の判定は独自条件を書かず、既存の buildBadgeStatuses に
// 「そのトピックを完了しただけの仮想 state」を通して再評価する。
// BADGE_CONDITIONS は BadgeMetrics の純粋な閾値述語なので、これは予測ではなく
// 確定判定になる。仮想 state はその場で作って捨て、保存も副作用も持たない。

import type { AppState } from "@/types";
import type { BadgeSignals } from "@/lib/badges";
import type { CheckpointGate } from "@/types/checkpoint";
import type { ActionImpact, TodayPrimaryAction } from "@/types/gameful";
import { ACTION_IMPACT_LIMIT } from "@/types/gameful";
import { buildBadgeStatuses } from "@/lib/badges";
import { getWeakTopics } from "@/lib/learningLoop";

/** そのトピックを完了しただけの仮想 state（引数の state は変更しない）。 */
function withTopicCompleted(state: AppState, topicId: string): AppState {
  if (state.progress.completedTopics.includes(topicId)) return state;
  return {
    ...state,
    progress: {
      ...state.progress,
      completedTopics: [...state.progress.completedTopics, topicId],
    },
  };
}

/**
 * そのトピックを完了したときに新しく条件を満たす「未獲得の必須バッジ」。
 * completedTopics だけを動かした保守的な見積りなので、実際より多く出ることはない。
 */
function badgesUnlockedBy(
  state: AppState,
  topicId: string,
  signals?: BadgeSignals,
): { id: string; label: string }[] {
  const metNow = new Set(
    buildBadgeStatuses(state, signals)
      .filter((status) => status.earned || status.conditionMet)
      .map((status) => status.def.id),
  );

  return buildBadgeStatuses(withTopicCompleted(state, topicId), signals)
    .filter(
      (status) =>
        status.def.requiredForGate &&
        !status.earned &&
        status.conditionMet &&
        !metNow.has(status.def.id),
    )
    .map((status) => ({ id: status.def.id, label: status.def.label }));
}

/**
 * Primary の学習を完了すると更新される項目を最大3件返す。
 * 必ず1件以上返る（測定証拠の追加は完了時に必ず起きるため）。
 */
export function buildActionImpact(input: {
  state: AppState;
  action: TodayPrimaryAction;
  gate: CheckpointGate;
  signals?: BadgeSignals;
}): ActionImpact[] {
  const { state, action, gate, signals } = input;

  // 突破試験は「挑戦する」行動。合否は事前に確定しないため、合格を前提にした
  // 断定はせず、挑戦そのものが確実に生む更新だけを出す。
  if (action.kind === "final_exam" || action.topicId === null) {
    return [
      {
        kind: "checkpoint",
        label: `合格すると CP${gate.checkpoint.order}「${gate.checkpoint.title}」を突破します`,
      },
      { kind: "evidence", label: "突破試験の結果を測定データに追加します" },
    ];
  }

  const topicId = action.topicId;
  const impacts: ActionImpact[] = [];

  // 1. 復習キューの消化（キューに載っていれば完了で必ず外れる）。
  if (state.progress.reviewQueue.some((item) => item.topicId === topicId)) {
    impacts.push({ kind: "review_queue", label: "復習キューを1件消化します" });
  }

  // 2. 弱点の再測定（弱点判定に載っていれば結果が必ず再評価される）。
  if (getWeakTopics(state.progress.topicMasteryStats ?? {}).some((w) => w.topicId === topicId)) {
    impacts.push({ kind: "weak_remeasure", label: "弱点トピックを再測定します" });
  }

  // 3. 必須バッジの条件充足（既存のバッジ判定をそのまま再評価して確定判定する）。
  const unlocked = badgesUnlockedBy(state, topicId, signals);
  if (unlocked.length > 0) {
    impacts.push({
      kind: "required_badge",
      label:
        unlocked.length === 1
          ? `必須バッジ「${unlocked[0].label}」の条件を満たします`
          : `必須バッジ ${unlocked.length}件の条件を満たします`,
    });

    // 4. それが現在の CP に残る最後の必須バッジなら、突破試験が解放される。
    const unlockedIds = new Set(unlocked.map((badge) => badge.id));
    const stillMissing = gate.missingBadges.filter((badge) => !unlockedIds.has(badge.id));
    if (gate.checkpoint.finalExam && !gate.finalExamUnlocked && stillMissing.length === 0) {
      impacts.push({
        kind: "checkpoint",
        label: `CP${gate.checkpoint.order}の突破試験が解放されます`,
      });
    }
  }

  // 5. 測定証拠の追加（完了時に必ず起きる。最低1件を保証するフォールバック）。
  impacts.push({ kind: "evidence", label: "理解度の測定データを更新します" });

  return impacts.slice(0, ACTION_IMPACT_LIMIT);
}
