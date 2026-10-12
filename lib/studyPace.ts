// 試験日から逆算した「今日の量」（ペースメーカー・純関数）。
//
// 設計の要:
//   - 残りの必要量を、試験日までの各日に「申告した時間の比」で割り振る。
//     休日を多めに申告していれば、休日の取り分が大きくなる。
//   - 今日の量 = 申告した時間と、今日の取り分の大きい方（上限 PACE_DAILY_CAP_MINUTES）。
//     申告より増やすのは「おまかせ」のときだけ。5/15/30分を選べばその量を使う（lib/studyAmount.ts）。
//   - 学習すると残りが減るので、その日最初の計算結果を固定する（paceBudget）。
//   - 決めるのは「どれだけ」だけ。「何を」の優先順位は learningLoop が保つ。

import type { AppState, UserProfile, UserProgress } from "@/types";
import type { Topic } from "@/types/content";
import type { PaceBudget, StudyPaceStatus } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getCheckpointProgress } from "@/lib/checkpoints";
import { daysUntilExamDate } from "@/lib/planningInputs";
import {
  declaredDailyMinutes,
  declaredHolidayMinutes,
  declaredWeekdayMinutes,
} from "@/lib/dailyMinutes";
import { localDateKey } from "@/lib/bookStudyPlan";
import { requiredMinutesEstimate } from "@/lib/studyPlanner";

/** 「おまかせ」で自動的に増やす上限（分）。これを超える分は over_cap として伝える。 */
export const PACE_DAILY_CAP_MINUTES = 120;
const DAY_MS = 86_400_000;

export type StudyPace = {
  /** 今日を含む、試験前日までの学習日数。 */
  daysRemaining: number;
  /** 「おまかせ」で使う今日の量（分）。 */
  todayMinutes: number;
  /** 今日の申告した時間（分）。土日は休日の分数。 */
  declaredTodayMinutes: number;
  /** 今日の取り分（分・5分単位）。上限で切る前の値。 */
  neededTodayMinutes: number;
  remainingMinutes: number;
  status: StudyPaceStatus;
  /** 試験日が仮（「未定」を選んだ人の3か月後）。 */
  provisional: boolean;
};

function ceilTo5(minutes: number): number {
  return Math.ceil(minutes / 5) * 5;
}

/** 試験日がない・試験当日を過ぎたときは null（逆算しない）。 */
export function computeStudyPace(input: {
  profile: UserProfile | undefined;
  progress: UserProgress;
  topics: Topic[];
  now?: Date;
}): StudyPace | null {
  const { profile, progress, topics } = input;
  const now = input.now ?? new Date();
  const daysRemaining = daysUntilExamDate(profile?.examDate, now);
  if (daysRemaining === null || daysRemaining <= 0) return null;

  const declaredTodayMinutes = declaredDailyMinutes(profile, now);
  let totalWeight = 0;
  for (let i = 0; i < daysRemaining; i += 1) {
    totalWeight += declaredDailyMinutes(profile, new Date(now.getTime() + i * DAY_MS));
  }
  const remainingMinutes = requiredMinutesEstimate(topics, progress);
  const neededTodayMinutes = totalWeight > 0
    ? ceilTo5((remainingMinutes * declaredTodayMinutes) / totalWeight)
    : 0;

  const status: StudyPaceStatus =
    neededTodayMinutes <= declaredTodayMinutes
      ? "on_pace"
      : neededTodayMinutes > PACE_DAILY_CAP_MINUTES
        ? "over_cap"
        : "raised";
  const todayMinutes = Math.max(
    declaredTodayMinutes,
    Math.min(neededTodayMinutes, PACE_DAILY_CAP_MINUTES),
  );

  return {
    daysRemaining,
    todayMinutes,
    declaredTodayMinutes,
    neededTodayMinutes,
    remainingMinutes,
    status,
    provisional: profile?.examPlan === "provisional",
  };
}

/** 固定した量を捨てて計算し直す条件（試験日・申告時間）。 */
export function paceBasis(profile: UserProfile | undefined): string {
  return [
    profile?.examDate ?? "",
    declaredWeekdayMinutes(profile),
    declaredHolidayMinutes(profile),
  ].join("|");
}

/** 今日固定した逆算ペース。日付か前提が違えば undefined。 */
export function getPinnedPace(state: AppState, now: Date = new Date()): PaceBudget | undefined {
  const pinned = getCheckpointProgress(state).gameful?.paceBudget;
  if (!pinned) return undefined;
  if (pinned.date !== localDateKey(now) || pinned.basis !== paceBasis(state.profile)) return undefined;
  return pinned;
}

/**
 * 今日の逆算ペースを返す。固定済みならそれを、なければ計算して固定した state を返す。
 * 逆算できない（試験日なし・当日以降）ときは pace=null で state はそのまま。
 */
export function resolveTodayPace(
  state: AppState,
  topics: Topic[],
  now: Date = new Date(),
): { pace: PaceBudget | null; state: AppState } {
  const pinned = getPinnedPace(state, now);
  if (pinned) return { pace: pinned, state };

  const computed = computeStudyPace({ profile: state.profile, progress: state.progress, topics, now });
  if (!computed) return { pace: null, state };

  const pace: PaceBudget = {
    date: localDateKey(now),
    basis: paceBasis(state.profile),
    minutes: computed.todayMinutes,
    status: computed.status,
    daysRemaining: computed.daysRemaining,
    computedAt: now.toISOString(),
  };
  const cp = state.progress.checkpointProgress ?? { ...INITIAL_CHECKPOINT_PROGRESS };
  return {
    pace,
    state: {
      ...state,
      progress: {
        ...state.progress,
        checkpointProgress: { ...cp, gameful: { ...cp.gameful, paceBudget: pace } },
      },
    },
  };
}
