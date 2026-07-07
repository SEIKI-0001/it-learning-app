// アバターの成長段階（純粋関数）。
//
// 方針:
//   - 段階は保存せず、既存の進行データ（累計XPのランク・突破試験クリア数）から
//     毎回導出する（装備解放と同じ考え方。二重管理にならない）。
//   - ランク到達とCP突破の「どちらか早い方」で上がる。学習量型・試験突破型の
//     どちらの進め方でも成長を感じられるようにする。
//   - 見た目だけの変化（オーラ）。合否・ゲート判定には一切影響しない。

import type { AppState } from "@/types";
import { getRankStatus, RANKS } from "@/lib/rank";
import { getCheckpointProgress } from "@/lib/checkpoints";

export type AvatarGrowthStage = 1 | 2 | 3;

export const GROWTH_STAGE_LABELS: Record<AvatarGrowthStage, string> = {
  1: "かけだし",
  2: "成長期",
  3: "歴戦",
};

// 段階の到達条件（ランクindex または 突破試験クリア数のどちらか）。
const STAGE2_RANK_INDEX = 2; // 初級冒険者
const STAGE2_CP_CLEARS = 2;
const STAGE3_RANK_INDEX = 4; // 上級チャレンジャー
const STAGE3_CP_CLEARS = 4;

/** 現在の成長段階を進行データから導出する。 */
export function getAvatarGrowthStage(state: AppState): AvatarGrowthStage {
  const rankIndex = getRankStatus(state.progress.exp).index;
  const cpClears = getCheckpointProgress(state).clearedCheckpointIds.length;
  if (rankIndex >= STAGE3_RANK_INDEX || cpClears >= STAGE3_CP_CLEARS) return 3;
  if (rankIndex >= STAGE2_RANK_INDEX || cpClears >= STAGE2_CP_CLEARS) return 2;
  return 1;
}

/** 次の成長段階と、その到達条件の説明。最終段階なら null。 */
export function nextGrowthStageInfo(
  state: AppState,
): { stage: AvatarGrowthStage; conditionLabel: string } | null {
  const current = getAvatarGrowthStage(state);
  if (current >= 3) return null;
  const [rankIndex, cpClears] =
    current === 1
      ? [STAGE2_RANK_INDEX, STAGE2_CP_CLEARS]
      : [STAGE3_RANK_INDEX, STAGE3_CP_CLEARS];
  return {
    stage: (current + 1) as AvatarGrowthStage,
    conditionLabel: `ランク${rankIndex + 1}「${RANKS[rankIndex].name}」到達、または突破試験に${cpClears}回合格`,
  };
}
