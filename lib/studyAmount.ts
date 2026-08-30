// 当日の学習量の選択（GF-P1-001・純関数）。
//
// 設計の要:
//   - 既定は「おまかせ」＝選択なし。選ばないユーザーは何も決めずに、
//     従来どおりプロフィールの予算で学習できる。未回答の問いを作らない。
//   - ユーザーが選ぶのは「どれだけ（How much）」だけ。「何を（What）」の
//     優先順位（復習期限 > 弱点 > 新規）はシステムが保つ。
//   - 選択は当日限り。翌日は自動で「おまかせ」に戻り、選び直しを強制しない。

import type { AppState, UserProfile } from "@/types";
import type { StudyAmountChoice } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getCheckpointProgress } from "@/lib/checkpoints";

/** 選べる学習量。どれも同格に扱い、長い方を既定にも推奨にもしない。 */
export const STUDY_AMOUNT_OPTIONS = [5, 15, 30] as const;

export type StudyAmountOption = (typeof STUDY_AMOUNT_OPTIONS)[number];

/** プロフィール由来の既定予算（「おまかせ」で使われる分量）。 */
export function defaultDailyMinutes(profile: UserProfile | undefined): number {
  if (!profile) return 10;
  if (typeof profile.weekdayMinutes === "number" && profile.weekdayMinutes > 0) {
    return profile.weekdayMinutes;
  }
  const parsed = Number.parseInt(profile.dailyMinutes ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

/** その日に選ばれている学習量。選んでいなければ undefined（＝おまかせ）。 */
export function getStudyAmountChoice(
  state: AppState,
  date: string,
): StudyAmountChoice | undefined {
  const choice = getCheckpointProgress(state).gameful?.studyAmount;
  return choice && choice.date === date ? choice : undefined;
}

/** 選択済みの分数。おまかせなら null。 */
export function getSelectedMinutes(state: AppState, date: string): number | null {
  return getStudyAmountChoice(state, date)?.minutes ?? null;
}

/**
 * 実際に使う予算。選んでいればその分数、選んでいなければプロフィールの既定。
 * プランナーへ渡す上書き値としても使う。
 */
export function effectiveDailyMinutes(
  state: AppState,
  profile: UserProfile | undefined,
  date: string,
): number {
  return getSelectedMinutes(state, date) ?? defaultDailyMinutes(profile);
}

/**
 * 学習量を選ぶ。同じ分数を選び直しても状態は変わらない（冪等）。
 * 範囲外の値は保存しない。
 */
export function setStudyAmount(state: AppState, date: string, minutes: number): AppState {
  if (!STUDY_AMOUNT_OPTIONS.includes(minutes as StudyAmountOption)) return state;
  if (getSelectedMinutes(state, date) === minutes) return state;

  const cp = state.progress.checkpointProgress ?? { ...INITIAL_CHECKPOINT_PROGRESS };
  return {
    ...state,
    progress: {
      ...state.progress,
      checkpointProgress: {
        ...cp,
        gameful: { ...cp.gameful, studyAmount: { date, minutes } },
      },
    },
  };
}

/** 「おまかせ」に戻す。選んでいなければ何もしない。 */
export function clearStudyAmount(state: AppState, date: string): AppState {
  if (!getStudyAmountChoice(state, date)) return state;
  const cp = getCheckpointProgress(state);
  const gameful = { ...cp.gameful };
  delete gameful.studyAmount;
  return {
    ...state,
    progress: { ...state.progress, checkpointProgress: { ...cp, gameful } },
  };
}
