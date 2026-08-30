// 合格宣言（GF-P1-010・純関数）。
//
// 任意の記録で、宣言しても報酬は無く、しなくても不利益は無い。
// 合格準備度・報酬・機能アクセスのいずれにも影響しないことがこの機能の前提。
// 未達を責めないため、期限切れや失敗という状態自体を持たない。

import type { AppState, UserProfile } from "@/types";
import type { Pledge } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getCheckpointProgress } from "@/lib/checkpoints";
import { daysUntilExam } from "@/lib/aiPlanner";

const DAY_MS = 86_400_000;

export function getPledge(state: AppState): Pledge | undefined {
  return getCheckpointProgress(state).gameful?.pledge;
}

export function hasPledged(state: AppState): boolean {
  return getPledge(state) !== undefined;
}

/**
 * 合格を宣言する。既に宣言済みなら上書きせず state をそのまま返す
 * （宣言日は最初の意思表示の日として動かさない）。
 */
export function makePledge(
  state: AppState,
  now: Date = new Date(),
  examDate?: string,
): AppState {
  if (hasPledged(state)) return state;
  const cp = state.progress.checkpointProgress ?? { ...INITIAL_CHECKPOINT_PROGRESS };
  const pledge: Pledge = {
    pledgedAt: now.toISOString(),
    ...(examDate ? { examDate } : {}),
  };
  return {
    ...state,
    progress: {
      ...state.progress,
      checkpointProgress: { ...cp, gameful: { ...cp.gameful, pledge } },
    },
  };
}

/** 宣言を取り消す。取り消しても何も失わない。 */
export function releasePledge(state: AppState): AppState {
  const cp = getCheckpointProgress(state);
  if (!cp.gameful?.pledge) return state;
  const gameful = { ...cp.gameful };
  delete gameful.pledge;
  return {
    ...state,
    progress: { ...state.progress, checkpointProgress: { ...cp, gameful } },
  };
}

export type PledgeSummary = {
  pledgedAt: string;
  /** 宣言してから経過した日数（同日なら0）。 */
  daysSincePledge: number;
  /** 試験日までの残り日数。試験日未設定なら null。 */
  daysUntilExam: number | null;
};

/** 宣言の表示用サマリ。宣言していなければ null。 */
export function buildPledgeSummary(
  state: AppState,
  profile: UserProfile | undefined,
  now: Date = new Date(),
): PledgeSummary | null {
  const pledge = getPledge(state);
  if (!pledge) return null;

  const pledgedAtMs = Date.parse(pledge.pledgedAt);
  const daysSincePledge = Number.isFinite(pledgedAtMs)
    ? Math.max(0, Math.floor((now.getTime() - pledgedAtMs) / DAY_MS))
    : 0;

  return {
    pledgedAt: pledge.pledgedAt,
    daysSincePledge,
    daysUntilExam: profile ? daysUntilExam(profile, now) : null,
  };
}
