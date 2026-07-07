// ストリーク（連続学習日数）の進行・おまもり・マイルストーン報酬。
//
// 損失回避の設計:
//   - 1日欠けても「おまもり」が自動で身代わりになりストリークが続く（Duolingo型）。
//   - 節目（3/7/14/30/60/100日）に一度きりのXP報酬。7/30/100日ではおまもりも付与。
//   - 節目は claimedMilestones で受領済み管理し、リセット後の再到達で二重取りしない。
// データは CheckpointProgress.streakMeta（jsonb内・DBマイグレーション不要）に持つ。
// すべてイミュータブルな純関数。lib/study.ts の completeTopicStudy から呼ぶ。

import type { AppState, UserProgress } from "@/types";
import type { CheckpointProgress, StreakMeta } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { grantExp } from "@/lib/game";

const DAY_MS = 1000 * 60 * 60 * 24;

export const INITIAL_STREAK_META: StreakMeta = {
  claimedMilestones: [],
  shieldsGranted: 0,
  shieldsUsed: 0,
  longestStreak: 0,
};

/** ストリークの節目（日数）。到達で一度きりのXP報酬。 */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

/** 節目ごとの報酬XP。 */
export const STREAK_MILESTONE_XP: Record<number, number> = {
  3: 10,
  7: 20,
  14: 30,
  30: 50,
  60: 80,
  100: 120,
};

/** おまもりが追加で1個もらえる節目。 */
const SHIELD_MILESTONES = new Set([7, 30, 100]);

export function getStreakMeta(progress: UserProgress): StreakMeta {
  return progress.checkpointProgress?.streakMeta ?? INITIAL_STREAK_META;
}

/** いま使えるおまもりの数（累計付与 - 累計消費）。 */
export function shieldsAvailable(meta: StreakMeta): number {
  return Math.max(0, meta.shieldsGranted - meta.shieldsUsed);
}

/** 同じ日に学習済みか（ローカル時刻ベース）。 */
function isSameDay(a: string | undefined, b: Date): boolean {
  if (!a) return false;
  const d = new Date(a);
  return (
    d.getFullYear() === b.getFullYear() &&
    d.getMonth() === b.getMonth() &&
    d.getDate() === b.getDate()
  );
}

export type StreakAdvance = {
  streakCount: number;
  /** おまもりを消費してストリークを守ったか。 */
  shieldConsumed: boolean;
  /** 消費を反映した CheckpointProgress（消費なしなら元の参照のまま）。 */
  checkpointProgress: CheckpointProgress | undefined;
};

/**
 * 連続学習日数を更新する（旧 lib/study.ts nextStreak の移設＋おまもり対応）。
 * - 同じ日の2回目以降は変化なし。
 * - 前回から1日以内なら +1。
 * - ちょうど1日欠け（gapDays === 2）は、おまもりが有れば消費して継続 +1。
 * - それ以外は 1 にリセット。
 */
export function advanceStreak(progress: UserProgress, now: Date): StreakAdvance {
  const keep: StreakAdvance = {
    streakCount: progress.streakCount,
    shieldConsumed: false,
    checkpointProgress: progress.checkpointProgress,
  };
  if (isSameDay(progress.lastPlayedAt, now)) return keep;
  if (!progress.lastPlayedAt) return { ...keep, streakCount: 1 };

  const last = new Date(progress.lastPlayedAt);
  const gapDays = Math.floor((now.getTime() - last.getTime()) / DAY_MS);
  if (gapDays <= 1) return { ...keep, streakCount: progress.streakCount + 1 };

  const meta = getStreakMeta(progress);
  if (gapDays === 2 && shieldsAvailable(meta) > 0) {
    const cp = progress.checkpointProgress ?? { ...INITIAL_CHECKPOINT_PROGRESS };
    return {
      streakCount: progress.streakCount + 1,
      shieldConsumed: true,
      checkpointProgress: {
        ...cp,
        streakMeta: {
          ...meta,
          shieldsUsed: meta.shieldsUsed + 1,
          lastShieldUsedAt: now.toISOString(),
        },
      },
    };
  }
  return { ...keep, streakCount: 1 };
}

export type StreakMilestone = {
  days: number;
  rewardXp: number;
  shieldGranted: boolean;
};

export type StreakMilestoneResult = {
  state: AppState;
  /** 今回新たに受領した節目（複数跨ぎは最大の日数を代表として返す）。 */
  milestone: StreakMilestone | null;
};

/**
 * 未受領のストリーク節目を受領し、XP・おまもりを付与する（冪等）。
 * 自己ベスト（longestStreak）もここで更新する。変化が無ければ元の state を返す。
 */
export function applyStreakMilestones(state: AppState): StreakMilestoneResult {
  const progress = state.progress;
  const meta = getStreakMeta(progress);
  const claimed = new Set(meta.claimedMilestones);
  const reached = STREAK_MILESTONES.filter(
    (d) => progress.streakCount >= d && !claimed.has(d),
  );
  const longest = Math.max(meta.longestStreak, progress.streakCount);
  if (reached.length === 0 && longest === meta.longestStreak) {
    return { state, milestone: null };
  }

  let rewardXp = 0;
  let shieldsAdded = 0;
  for (const d of reached) {
    rewardXp += STREAK_MILESTONE_XP[d] ?? 0;
    if (SHIELD_MILESTONES.has(d)) shieldsAdded += 1;
    claimed.add(d);
  }

  const { exp, level } =
    rewardXp > 0
      ? grantExp(progress.exp, rewardXp)
      : { exp: progress.exp, level: progress.level };
  const cp = progress.checkpointProgress ?? { ...INITIAL_CHECKPOINT_PROGRESS };
  const nextMeta: StreakMeta = {
    ...meta,
    claimedMilestones: [...claimed].sort((a, b) => a - b),
    shieldsGranted: meta.shieldsGranted + shieldsAdded,
    longestStreak: longest,
  };

  const top = reached[reached.length - 1];
  return {
    state: {
      ...state,
      progress: {
        ...progress,
        exp,
        level,
        checkpointProgress: { ...cp, streakMeta: nextMeta },
      },
    },
    milestone:
      top !== undefined
        ? { days: top, rewardXp, shieldGranted: shieldsAdded > 0 }
        : null,
  };
}

/**
 * 「今日まだ学習しておらず、昨日までのストリークが今日で途切れる」状態か。
 * /today の損失回避バナーの表示判定に使う。
 */
export function isStreakAtRisk(progress: UserProgress, now: Date = new Date()): boolean {
  if (progress.streakCount < 2 || !progress.lastPlayedAt) return false;
  if (isSameDay(progress.lastPlayedAt, now)) return false;
  const gapDays = Math.floor(
    (now.getTime() - new Date(progress.lastPlayedAt).getTime()) / DAY_MS,
  );
  return gapDays <= 1;
}
