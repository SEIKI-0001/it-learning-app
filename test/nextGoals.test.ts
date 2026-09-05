import { describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import type { CheckpointProgress } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { buildNextGoals } from "@/lib/nextGoals";
import { getRequiredBadges } from "@/lib/badges";

// 「あと少し」ネクストゴールの特性テスト。
// 目標勾配（0.5〜0.95 を最優先）と、既存の gate / rank / streak ロジックを
// そのまま読むだけで独自計算を持たないことを固定する。

const CP1_REQUIRED = getRequiredBadges("cp1").map((b) => b.id);

function checkpoint(overrides: Partial<CheckpointProgress> = {}): CheckpointProgress {
  return { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp1", ...overrides };
}

function state(cp: CheckpointProgress, overrides: Partial<AppState["progress"]> = {}): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
      checkpointProgress: cp,
      ...overrides,
    },
    answers: [],
  };
}

function earned(count: number) {
  return CP1_REQUIRED.slice(0, count).map((badgeId) => ({
    badgeId,
    earnedAt: "2026-08-01T00:00:00.000Z",
  }));
}

describe("gate goal", () => {
  it("counts the required badges still missing for the final exam", () => {
    const goals = buildNextGoals(state(checkpoint({ earnedBadges: earned(2) })));
    const gate = goals.find((g) => g.kind === "gate");

    expect(gate?.detail).toBe(`必須バッジ あと${CP1_REQUIRED.length - 2}個`);
    expect(gate?.ratio).toBeCloseTo(2 / CP1_REQUIRED.length);
    expect(gate?.href).toBe("/badges");
  });

  it("drops the gate goal once the final exam is unlocked", () => {
    // 必須バッジを全獲得し、分野カバレッジも満たした状態を作る。
    const allBadges = state(checkpoint({ earnedBadges: earned(CP1_REQUIRED.length) }), {
      completedTopics: [],
    });
    const gate = buildNextGoals(allBadges).find((g) => g.kind === "gate");

    // 分野カバレッジ未達なら解放されないため、まだゴールとして残る。
    expect(gate?.detail).toBe("必須バッジ あと0個");
  });

  it("reports a full ratio when every required badge is earned", () => {
    const goals = buildNextGoals(state(checkpoint({ earnedBadges: earned(CP1_REQUIRED.length) })));

    expect(goals.find((g) => g.kind === "gate")?.ratio).toBe(1);
  });
});

describe("rank goal", () => {
  it("reports the remaining XP to the next rank", () => {
    const rank = buildNextGoals(state(checkpoint(), { exp: 30 })).find((g) => g.kind === "rank");

    expect(rank?.detail).toBe("あと 30 XP");
    expect(rank?.ratio).toBeCloseTo(0.5);
    expect(rank?.href).toBe("/rank");
  });

  it("omits the rank goal at the maximum rank", () => {
    const goals = buildNextGoals(state(checkpoint(), { exp: 999999 }));

    expect(goals.some((g) => g.kind === "rank")).toBe(false);
  });
});

describe("streak goal", () => {
  it("targets the next unclaimed milestone", () => {
    const cp = checkpoint({
      streakMeta: {
        claimedMilestones: [3],
        shieldsGranted: 0,
        shieldsUsed: 0,
        longestStreak: 5,
      },
    });
    const streak = buildNextGoals(state(cp, { streakCount: 5 })).find((g) => g.kind === "streak");

    expect(streak?.label).toBe("ストリーク7日の節目");
    expect(streak?.detail).toBe("あと2日");
    expect(streak?.ratio).toBeCloseTo(5 / 7);
  });

  it("skips milestones already claimed", () => {
    const cp = checkpoint({
      streakMeta: {
        claimedMilestones: [3, 7],
        shieldsGranted: 0,
        shieldsUsed: 0,
        longestStreak: 8,
      },
    });
    const streak = buildNextGoals(state(cp, { streakCount: 8 })).find((g) => g.kind === "streak");

    expect(streak?.label).toBe("ストリーク14日の節目");
  });

  it("omits the streak goal before the streak has started", () => {
    const goals = buildNextGoals(state(checkpoint(), { streakCount: 0 }));

    expect(goals.some((g) => g.kind === "streak")).toBe(false);
  });
});

describe("goal ordering", () => {
  it("puts the almost-there zone first, then the highest ratio", () => {
    // gate 2/3 = 0.67 (zone内) / rank 0 XP = 0 (zone外) / streak 5/7 = 0.71 (zone内)
    const cp = checkpoint({
      earnedBadges: earned(2),
      streakMeta: {
        claimedMilestones: [3],
        shieldsGranted: 0,
        shieldsUsed: 0,
        longestStreak: 5,
      },
    });
    const goals = buildNextGoals(state(cp, { streakCount: 5, exp: 0 }));

    expect(goals.map((g) => g.kind)).toEqual(["streak", "gate", "rank"]);
  });

  it("pushes a completed goal out of the almost-there zone", () => {
    // gate 3/3 = 1.0 は zone 外(>=0.95)。rank 0.5 が zone 内なので先に来る。
    const goals = buildNextGoals(
      state(checkpoint({ earnedBadges: earned(CP1_REQUIRED.length) }), { exp: 30 }),
    );

    expect(goals[0].kind).toBe("rank");
  });

  it("returns an empty list when nothing is in progress", () => {
    // cp0 は最終問題を持たず、XP 0 でランク進捗もなく、ストリークも未開始。
    const goals = buildNextGoals(
      state({ ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp0" }),
    );

    expect(goals.filter((g) => g.kind === "gate")).toEqual([]);
    expect(goals.some((g) => g.kind === "streak")).toBe(false);
  });
});

describe("purity", () => {
  it("does not mutate the state it was given", () => {
    const input = state(checkpoint({ earnedBadges: earned(2) }), { streakCount: 5, exp: 30 });
    const snapshot = structuredClone(input);
    buildNextGoals(input);

    expect(input).toEqual(snapshot);
  });

  it("derives goals without persisting anything", () => {
    const input = state(checkpoint({ earnedBadges: earned(2) }));
    const goals = buildNextGoals(input);

    expect(goals.length).toBeGreaterThan(0);
    expect(input.progress.checkpointProgress).toEqual(checkpoint({ earnedBadges: earned(2) }));
  });
});
