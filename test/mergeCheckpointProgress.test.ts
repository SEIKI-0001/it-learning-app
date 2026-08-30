import { describe, expect, it } from "vitest";
import type { UserProgress } from "@/types";
import type { CheckpointProgress } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { mergeProgress } from "@/lib/mergeAppState";
import { progressRowToProgress, progressToRow, type ProgressRow } from "@/lib/dbMappers";
import { normalizeAppState } from "@/lib/storage";

// checkpoint_progress (jsonb) の端末間マージの特性テスト。
//
// gameful-design-v2 §12.1 / §16.1「JSONB merge: 新フィールドが端末間マージで欠落しない」。
// lib/mergeAppState.ts の mergeCheckpointProgress は返り値を明示フィールド列挙で
// 組み立てるため、CheckpointProgress にフィールドを足して merge を更新し忘れると
// 端末間マージで黙って消える。下の "carries every documented field" がその番人。

function progress(cp: CheckpointProgress, overrides: Partial<UserProgress> = {}): UserProgress {
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
    checkpointProgress: cp,
    ...overrides,
  };
}

/** すべてのフィールドを埋めた CheckpointProgress。 */
function fullCheckpointProgress(): CheckpointProgress {
  return {
    currentCheckpointId: "cp3",
    clearedCheckpointIds: ["cp1", "cp2"],
    earnedBadges: [{ badgeId: "b-cp1-touch-tech", earnedAt: "2026-08-01T00:00:00.000Z" }],
    badgeFragments: [{ fragmentId: "frag-common", count: 4 }],
    finalExamAttempts: [
      {
        checkpointId: "cp2",
        passed: true,
        correct: 8,
        total: 10,
        attemptedAt: "2026-08-05T00:00:00.000Z",
        wrongTopicIds: ["topic-a"],
      },
    ],
    rarePityCount: 3,
    streakMeta: {
      claimedMilestones: [3, 7],
      shieldsGranted: 2,
      shieldsUsed: 1,
      longestStreak: 12,
      lastShieldUsedAt: "2026-08-10T00:00:00.000Z",
    },
    dailyQuests: {
      date: "2026-08-20",
      quests: [{ id: "complete_topic", goal: 1, progress: 1 }],
      claimed: true,
    },
    gameful: {
      growthCheck: { shownCheckpointIds: ["cp1", "cp2"] },
    },
  };
}

function merge(a: CheckpointProgress, b: CheckpointProgress): CheckpointProgress {
  return mergeProgress(progress(a), progress(b)).checkpointProgress!;
}

describe("checkpoint progress merge shape", () => {
  it("carries every documented field through a merge", () => {
    // CheckpointProgress にフィールドを足したら、このリストと
    // lib/mergeAppState.ts の mergeCheckpointProgress を同時に更新すること。
    const full = fullCheckpointProgress();

    expect(Object.keys(merge(full, full)).sort()).toEqual([
      "badgeFragments",
      "clearedCheckpointIds",
      "currentCheckpointId",
      "dailyQuests",
      "earnedBadges",
      "finalExamAttempts",
      "gameful",
      "rarePityCount",
      "streakMeta",
    ]);
  });

  it("is a no-op when both sides are identical", () => {
    const full = fullCheckpointProgress();

    expect(merge(full, full)).toEqual(full);
  });

  it("falls back to the initial progress when neither side has one", () => {
    const merged = mergeProgress(
      { ...progress(INITIAL_CHECKPOINT_PROGRESS), checkpointProgress: undefined },
      { ...progress(INITIAL_CHECKPOINT_PROGRESS), checkpointProgress: undefined },
    );

    expect(merged.checkpointProgress).toEqual(INITIAL_CHECKPOINT_PROGRESS);
  });

  it("keeps the side that exists when only one has progress", () => {
    const full = fullCheckpointProgress();
    const merged = mergeProgress(
      { ...progress(full), checkpointProgress: undefined },
      progress(full),
    );

    expect(merged.checkpointProgress).toEqual(full);
  });
});

describe("checkpoint progress merge rules", () => {
  it("takes the checkpoint that is further along", () => {
    const a = { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp1" as const };
    const b = { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp4" as const };

    expect(merge(a, b).currentCheckpointId).toBe("cp4");
    expect(merge(b, a).currentCheckpointId).toBe("cp4");
  });

  it("unions cleared checkpoints", () => {
    const a = { ...INITIAL_CHECKPOINT_PROGRESS, clearedCheckpointIds: ["cp1" as const] };
    const b = { ...INITIAL_CHECKPOINT_PROGRESS, clearedCheckpointIds: ["cp2" as const] };

    expect(merge(a, b).clearedCheckpointIds.sort()).toEqual(["cp1", "cp2"]);
  });

  it("unions earned badges and keeps the earliest award time", () => {
    const a = {
      ...INITIAL_CHECKPOINT_PROGRESS,
      earnedBadges: [{ badgeId: "b-x", earnedAt: "2026-08-02T00:00:00.000Z" }],
    };
    const b = {
      ...INITIAL_CHECKPOINT_PROGRESS,
      earnedBadges: [
        { badgeId: "b-x", earnedAt: "2026-08-01T00:00:00.000Z" },
        { badgeId: "b-y", earnedAt: "2026-08-03T00:00:00.000Z" },
      ],
    };
    const merged = merge(a, b);

    expect(merged.earnedBadges).toHaveLength(2);
    expect(merged.earnedBadges.find((e) => e.badgeId === "b-x")?.earnedAt).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });

  it("takes the larger fragment count rather than summing both devices", () => {
    // 加算にすると同じ報酬が端末数だけ増える。max は何度マージしても増えない。
    const a = {
      ...INITIAL_CHECKPOINT_PROGRESS,
      badgeFragments: [{ fragmentId: "frag-common", count: 5 }],
    };
    const b = {
      ...INITIAL_CHECKPOINT_PROGRESS,
      badgeFragments: [{ fragmentId: "frag-common", count: 2 }],
    };

    expect(merge(a, b).badgeFragments).toEqual([{ fragmentId: "frag-common", count: 5 }]);
  });

  it("takes the larger pity counter", () => {
    const a = { ...INITIAL_CHECKPOINT_PROGRESS, rarePityCount: 4 };
    const b = { ...INITIAL_CHECKPOINT_PROGRESS, rarePityCount: 1 };

    expect(merge(a, b).rarePityCount).toBe(4);
  });

  it("deduplicates final exam attempts and orders them by time", () => {
    const attempt = fullCheckpointProgress().finalExamAttempts[0];
    const other = { ...attempt, attemptedAt: "2026-08-02T00:00:00.000Z", passed: false };
    const a = { ...INITIAL_CHECKPOINT_PROGRESS, finalExamAttempts: [attempt, other] };
    const b = { ...INITIAL_CHECKPOINT_PROGRESS, finalExamAttempts: [attempt] };
    const merged = merge(a, b);

    expect(merged.finalExamAttempts).toHaveLength(2);
    expect(merged.finalExamAttempts.map((x) => x.attemptedAt)).toEqual([
      "2026-08-02T00:00:00.000Z",
      "2026-08-05T00:00:00.000Z",
    ]);
  });
});

describe("streak meta merge", () => {
  const base = fullCheckpointProgress();

  it("unions claimed milestones so a reward is never paid twice", () => {
    const a = { ...base, streakMeta: { ...base.streakMeta!, claimedMilestones: [3] } };
    const b = { ...base, streakMeta: { ...base.streakMeta!, claimedMilestones: [7, 14] } };

    expect(merge(a, b).streakMeta?.claimedMilestones).toEqual([3, 7, 14]);
  });

  it("never resurrects a spent shield", () => {
    const spent = { ...base, streakMeta: { ...base.streakMeta!, shieldsGranted: 2, shieldsUsed: 2 } };
    const stale = { ...base, streakMeta: { ...base.streakMeta!, shieldsGranted: 2, shieldsUsed: 0 } };
    const merged = merge(spent, stale).streakMeta!;

    expect(merged.shieldsUsed).toBe(2);
    expect(merged.shieldsGranted - merged.shieldsUsed).toBe(0);
  });

  it("keeps the best personal streak", () => {
    const a = { ...base, streakMeta: { ...base.streakMeta!, longestStreak: 12 } };
    const b = { ...base, streakMeta: { ...base.streakMeta!, longestStreak: 30 } };

    expect(merge(a, b).streakMeta?.longestStreak).toBe(30);
  });

  it("keeps the side that has a streak meta when the other has none", () => {
    const withMeta = base;
    const without = { ...base, streakMeta: undefined };

    expect(merge(without, withMeta).streakMeta).toEqual(base.streakMeta);
    expect(merge(withMeta, without).streakMeta).toEqual(base.streakMeta);
  });
});

describe("daily quest merge", () => {
  const base = fullCheckpointProgress();

  it("takes the newer day and drops the stale one", () => {
    const older = {
      ...base,
      dailyQuests: { date: "2026-08-19", quests: [], claimed: false },
    };
    const newer = {
      ...base,
      dailyQuests: { date: "2026-08-20", quests: [], claimed: false },
    };

    expect(merge(older, newer).dailyQuests?.date).toBe("2026-08-20");
    expect(merge(newer, older).dailyQuests?.date).toBe("2026-08-20");
  });

  it("takes the highest progress per quest on the same day", () => {
    const a = {
      ...base,
      dailyQuests: {
        date: "2026-08-20",
        quests: [{ id: "correct_8", goal: 8, progress: 5 }],
        claimed: false,
      },
    };
    const b = {
      ...base,
      dailyQuests: {
        date: "2026-08-20",
        quests: [{ id: "correct_8", goal: 8, progress: 2 }],
        claimed: false,
      },
    };

    expect(merge(a, b).dailyQuests?.quests[0].progress).toBe(5);
  });

  it("treats the reward as claimed if either device claimed it", () => {
    const claimed = {
      ...base,
      dailyQuests: { date: "2026-08-20", quests: [], claimed: true },
    };
    const unclaimed = {
      ...base,
      dailyQuests: { date: "2026-08-20", quests: [], claimed: false },
    };

    expect(merge(unclaimed, claimed).dailyQuests?.claimed).toBe(true);
    expect(merge(claimed, unclaimed).dailyQuests?.claimed).toBe(true);
  });
});

describe("gameful state merge", () => {
  const base = fullCheckpointProgress();

  it("unions the checkpoints that already showed a growth check", () => {
    const a = { ...base, gameful: { growthCheck: { shownCheckpointIds: ["cp1" as const] } } };
    const b = { ...base, gameful: { growthCheck: { shownCheckpointIds: ["cp2" as const] } } };

    expect(merge(a, b).gameful?.growthCheck?.shownCheckpointIds.sort()).toEqual(["cp1", "cp2"]);
  });

  it("is idempotent: merging the same state twice adds nothing", () => {
    const once = merge(base, base);

    expect(merge(once, base)).toEqual(once);
  });

  it("never forgets a checkpoint that one device already showed", () => {
    // 片方の端末だけが表示済み → 未表示側とマージしても消えない
    // （消えると同じCPで2回出てしまう）。
    const shown = { ...base, gameful: { growthCheck: { shownCheckpointIds: ["cp3" as const] } } };
    const stale = { ...base, gameful: undefined };

    expect(merge(shown, stale).gameful?.growthCheck?.shownCheckpointIds).toEqual(["cp3"]);
    expect(merge(stale, shown).gameful?.growthCheck?.shownCheckpointIds).toEqual(["cp3"]);
  });

  it("leaves gameful undefined for older data that never had it", () => {
    const legacy = { ...base, gameful: undefined };

    expect(merge(legacy, legacy).gameful).toBeUndefined();
  });

  it("drops an empty growth check rather than storing an empty list", () => {
    const empty = { ...base, gameful: { growthCheck: { shownCheckpointIds: [] } } };

    expect(merge(empty, empty).gameful).toEqual({});
  });
});

describe("checkpoint progress persistence round-trip", () => {
  it("survives the database mapper unchanged", () => {
    const full = fullCheckpointProgress();
    const row = progressToRow("user-1", progress(full));

    expect(row.checkpoint_progress).toEqual(full);
    expect(progressRowToProgress(row as ProgressRow).checkpointProgress).toEqual(full);
  });

  it("survives normalizeAppState unchanged", () => {
    const full = fullCheckpointProgress();

    expect(
      normalizeAppState({ progress: progress(full), answers: [] }).progress.checkpointProgress,
    ).toEqual(full);
  });

  it("survives a full store -> load -> merge cycle", () => {
    const full = fullCheckpointProgress();
    const row = progressToRow("user-1", progress(full));
    const restored = progressRowToProgress(row as ProgressRow);

    expect(mergeProgress(progress(full), restored).checkpointProgress).toEqual(full);
  });
});
