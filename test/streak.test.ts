import { describe, expect, it } from "vitest";
import type { AppState, UserProgress } from "@/types";
import type { StreakMeta } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import {
  advanceStreak,
  applyStreakMilestones,
  getStreakMeta,
  isStreakAtRisk,
  shieldsAvailable,
  INITIAL_STREAK_META,
  STREAK_MILESTONES,
  STREAK_MILESTONE_XP,
} from "@/lib/streak";
import { calculateLevel } from "@/lib/game";

// ストリーク・おまもり・節目報酬の特性テスト。
// gameful-design-v2 の「損失回避は救済可能性とセット」「報酬は再実行で二重付与しない」
// と、おまもりカウンタの単調性（マージで消費が復活しない前提）を固定する。

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 7, 20, 12, 0, 0);

function daysBefore(days: number): string {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}

function progress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    level: 1,
    exp: 0,
    streakCount: 0,
    weakTags: [],
    completedTopics: [],
    topicMastery: {},
    reviewQueue: [],
    currentDay: 1,
    completedDays: [],
    checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS },
    ...overrides,
  };
}

function withMeta(meta: Partial<StreakMeta>, overrides: Partial<UserProgress> = {}): UserProgress {
  return progress({
    ...overrides,
    checkpointProgress: {
      ...INITIAL_CHECKPOINT_PROGRESS,
      streakMeta: { ...INITIAL_STREAK_META, ...meta },
    },
  });
}

function state(p: UserProgress): AppState {
  return { progress: p, answers: [] };
}

describe("getStreakMeta / shieldsAvailable", () => {
  it("falls back to the initial meta for older data without one", () => {
    expect(getStreakMeta(progress())).toEqual(INITIAL_STREAK_META);
  });

  it("reports the held shields as granted minus used", () => {
    expect(shieldsAvailable({ ...INITIAL_STREAK_META, shieldsGranted: 3, shieldsUsed: 1 })).toBe(2);
  });

  it("never reports a negative shield count", () => {
    expect(shieldsAvailable({ ...INITIAL_STREAK_META, shieldsGranted: 1, shieldsUsed: 4 })).toBe(0);
  });
});

describe("advanceStreak", () => {
  it("starts the streak at one for a first-ever session", () => {
    expect(advanceStreak(progress(), NOW).streakCount).toBe(1);
  });

  it("does not advance twice on the same local day", () => {
    const p = progress({ streakCount: 5, lastPlayedAt: new Date(2026, 7, 20, 1, 0, 0).toISOString() });

    expect(advanceStreak(p, NOW).streakCount).toBe(5);
  });

  it("advances by one after a single day", () => {
    const p = progress({ streakCount: 5, lastPlayedAt: daysBefore(1) });

    expect(advanceStreak(p, NOW).streakCount).toBe(6);
  });

  it("resets to one after a two-day gap with no shield", () => {
    const p = progress({ streakCount: 9, lastPlayedAt: daysBefore(2) });
    const advanced = advanceStreak(p, NOW);

    expect(advanced.streakCount).toBe(1);
    expect(advanced.shieldConsumed).toBe(false);
  });

  it("spends a shield to survive exactly one missed day", () => {
    const p = withMeta({ shieldsGranted: 1 }, { streakCount: 9, lastPlayedAt: daysBefore(2) });
    const advanced = advanceStreak(p, NOW);

    expect(advanced.streakCount).toBe(10);
    expect(advanced.shieldConsumed).toBe(true);
    expect(advanced.checkpointProgress?.streakMeta?.shieldsUsed).toBe(1);
    expect(advanced.checkpointProgress?.streakMeta?.shieldsGranted).toBe(1);
    expect(advanced.checkpointProgress?.streakMeta?.lastShieldUsedAt).toBe(NOW.toISOString());
  });

  it("does not spend a shield for a gap longer than one missed day", () => {
    const p = withMeta({ shieldsGranted: 2 }, { streakCount: 9, lastPlayedAt: daysBefore(3) });
    const advanced = advanceStreak(p, NOW);

    expect(advanced.streakCount).toBe(1);
    expect(advanced.shieldConsumed).toBe(false);
    expect(advanced.checkpointProgress?.streakMeta?.shieldsUsed).toBe(0);
  });

  it("cannot spend a shield that was already used", () => {
    const p = withMeta(
      { shieldsGranted: 1, shieldsUsed: 1 },
      { streakCount: 9, lastPlayedAt: daysBefore(2) },
    );

    expect(advanceStreak(p, NOW).streakCount).toBe(1);
  });

  it("does not mutate the progress it was given", () => {
    const p = withMeta({ shieldsGranted: 1 }, { streakCount: 9, lastPlayedAt: daysBefore(2) });
    const snapshot = structuredClone(p);
    advanceStreak(p, NOW);

    expect(p).toEqual(snapshot);
  });
});

describe("applyStreakMilestones", () => {
  it("returns the same state when nothing was reached", () => {
    const before = state(withMeta({ longestStreak: 2 }, { streakCount: 2 }));

    const result = applyStreakMilestones(before);
    expect(result.state).toBe(before);
    expect(result.milestone).toBeNull();
  });

  it("claims the three-day milestone with its fixed XP", () => {
    const result = applyStreakMilestones(state(progress({ streakCount: 3 })));

    expect(result.milestone).toEqual({ days: 3, rewardXp: STREAK_MILESTONE_XP[3], shieldGranted: false });
    expect(result.state.progress.exp).toBe(STREAK_MILESTONE_XP[3]);
    expect(result.state.progress.checkpointProgress?.streakMeta?.claimedMilestones).toEqual([3]);
  });

  it("grants a shield at the seven-day milestone", () => {
    const result = applyStreakMilestones(state(progress({ streakCount: 7 })));

    expect(result.milestone?.days).toBe(7);
    expect(result.milestone?.shieldGranted).toBe(true);
    expect(result.state.progress.checkpointProgress?.streakMeta?.shieldsGranted).toBe(1);
  });

  it("pays every milestone crossed at once and reports the highest", () => {
    const result = applyStreakMilestones(state(progress({ streakCount: 7 })));

    // 3日と7日をまたいで到達 → 両方支払い、代表は7日。
    expect(result.state.progress.checkpointProgress?.streakMeta?.claimedMilestones).toEqual([3, 7]);
    expect(result.milestone?.rewardXp).toBe(STREAK_MILESTONE_XP[3] + STREAK_MILESTONE_XP[7]);
  });

  it("is idempotent: a second pass claims nothing more", () => {
    const first = applyStreakMilestones(state(progress({ streakCount: 7 })));
    const second = applyStreakMilestones(first.state);

    expect(second.milestone).toBeNull();
    expect(second.state.progress.exp).toBe(first.state.progress.exp);
  });

  it("does not re-pay a milestone after the streak resets and climbs again", () => {
    const claimed = applyStreakMilestones(state(progress({ streakCount: 7 })));
    const relapsed = applyStreakMilestones({
      ...claimed.state,
      progress: { ...claimed.state.progress, streakCount: 3 },
    });

    expect(relapsed.milestone).toBeNull();
    expect(relapsed.state.progress.exp).toBe(claimed.state.progress.exp);
  });

  it("tracks the personal best streak even with no milestone reached", () => {
    const result = applyStreakMilestones(state(progress({ streakCount: 2 })));

    expect(result.milestone).toBeNull();
    expect(result.state.progress.checkpointProgress?.streakMeta?.longestStreak).toBe(2);
  });

  it("keeps exp and level in sync through the shared grantExp path", () => {
    const result = applyStreakMilestones(state(progress({ streakCount: 100, exp: 40 })));

    expect(result.state.progress.level).toBe(calculateLevel(result.state.progress.exp));
  });

  it("only pays XP and shields, never badges or checkpoints", () => {
    const before = state(progress({ streakCount: 7, completedTopics: ["topic-a"] }));
    const after = applyStreakMilestones(before).state.progress;

    expect(after.completedTopics).toEqual(["topic-a"]);
    expect(after.topicMastery).toEqual({});
    expect(after.checkpointProgress?.earnedBadges).toEqual([]);
    expect(after.checkpointProgress?.clearedCheckpointIds).toEqual([]);
    expect(after.checkpointProgress?.currentCheckpointId).toBe("cp0");
  });

  it("covers every declared milestone with a reward amount", () => {
    for (const days of STREAK_MILESTONES) {
      expect(STREAK_MILESTONE_XP[days]).toBeGreaterThan(0);
    }
  });
});

describe("isStreakAtRisk", () => {
  it("is false when today already has a session", () => {
    const p = progress({ streakCount: 5, lastPlayedAt: new Date(2026, 7, 20, 1, 0, 0).toISOString() });

    expect(isStreakAtRisk(p, NOW)).toBe(false);
  });

  it("is true when the last session was yesterday", () => {
    expect(isStreakAtRisk(progress({ streakCount: 5, lastPlayedAt: daysBefore(1) }), NOW)).toBe(true);
  });

  it("is false once the streak is already broken", () => {
    expect(isStreakAtRisk(progress({ streakCount: 5, lastPlayedAt: daysBefore(3) }), NOW)).toBe(false);
  });

  it("is false for a streak too short to lose", () => {
    expect(isStreakAtRisk(progress({ streakCount: 1, lastPlayedAt: daysBefore(1) }), NOW)).toBe(false);
  });

  it("is false with no recorded session", () => {
    expect(isStreakAtRisk(progress({ streakCount: 5 }), NOW)).toBe(false);
  });
});
