import type { AppState } from "@/types";
import { getCheckpointProgress } from "@/lib/checkpoints";

export type MochitGrowthStage = 1 | 2 | 3;

export const MOCHIT_GROWTH_STAGE_LABELS: Record<MochitGrowthStage, string> = {
  1: "はじまり",
  2: "成長期",
  3: "つながりの達人",
};

const STAGE_TWO_CLEARS = 2;
const STAGE_THREE_CLEARS = 4;

export function getMochitGrowthStage(state: AppState): MochitGrowthStage {
  const clearedCount = getCheckpointProgress(state).clearedCheckpointIds.length;
  if (clearedCount >= STAGE_THREE_CLEARS) return 3;
  if (clearedCount >= STAGE_TWO_CLEARS) return 2;
  return 1;
}

export function nextMochitGrowthStageInfo(
  state: AppState,
): { stage: MochitGrowthStage; conditionLabel: string } | null {
  const stage = getMochitGrowthStage(state);
  if (stage === 3) return null;

  const targetClears = stage === 1 ? STAGE_TWO_CLEARS : STAGE_THREE_CLEARS;
  return {
    stage: (stage + 1) as MochitGrowthStage,
    conditionLabel: `チェックポイントを${targetClears}回クリア`,
  };
}

export function getMochitUnlockSummary(state: AppState): {
  clearedCheckpointCount: number;
  earnedBadgeCount: number;
} {
  const checkpointProgress = getCheckpointProgress(state);
  return {
    clearedCheckpointCount: checkpointProgress.clearedCheckpointIds.length,
    earnedBadgeCount: checkpointProgress.earnedBadges.length,
  };
}
