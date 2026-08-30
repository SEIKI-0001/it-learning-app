import { describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import type { CheckpointProgress } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { calculateLevel } from "@/lib/game";
import {
  applyBadgeDrop,
  getPendingChoice,
  resolveDropChoice,
  rollBadgeDrop,
} from "@/lib/badgeDrops";

// 追加ドロップ（ランダム報酬）の特性テスト。
// gameful-design-v2 §11「既存pityを維持。変更時はテストで固定確認」と
// 「ランダム報酬で準備度・習熟度・必須バッジ・CP進行を変動させない」を機械的に固定する。

/** 決められた順に値を返す rng（消費し切ったら最後の値を返し続ける）。 */
function seq(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

function cp(overrides: Partial<CheckpointProgress> = {}): CheckpointProgress {
  return { ...INITIAL_CHECKPOINT_PROGRESS, ...overrides };
}

function state(overrides: Partial<CheckpointProgress> = {}): AppState {
  return {
    progress: {
      level: 3,
      exp: 200,
      streakCount: 4,
      weakTags: ["tag-a"],
      completedTopics: ["topic-a", "topic-b"],
      topicMastery: { "topic-a": 70 },
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
      checkpointProgress: cp(overrides),
    },
    answers: [],
  };
}

describe("rollBadgeDrop rarity and pity", () => {
  it("rolls a common fragment when the first random value is above the rare threshold", () => {
    const roll = rollBadgeDrop(cp(), seq(0.99, 0));

    expect(roll.drop.kind).toBe("fragment");
    expect(roll.drop.rarity).toBe("common");
    expect(roll.badgeFragments).toEqual([{ fragmentId: "frag-common", count: 1 }]);
    expect(roll.bonusXp).toBe(0);
  });

  it("increments the pity counter on a common roll and resets it on a rare roll", () => {
    expect(rollBadgeDrop(cp({ rarePityCount: 2 }), seq(0.99, 0)).rarePityCount).toBe(3);
    expect(rollBadgeDrop(cp({ rarePityCount: 2 }), seq(0.1, 0.2)).rarePityCount).toBe(0);
  });

  it("forces a rare roll once the pity counter reaches the threshold", () => {
    // 天井到達時は rng が「はずれ」を返しても rare になる。
    const roll = rollBadgeDrop(cp({ rarePityCount: 5 }), seq(0.99, 0.2));

    expect(roll.drop.rarity).toBe("rare");
    expect(roll.rarePityCount).toBe(0);
  });

  it("keeps forcing rare while the pity counter stays above the threshold", () => {
    expect(rollBadgeDrop(cp({ rarePityCount: 9 }), seq(0.99, 0.2)).drop.rarity).toBe("rare");
  });

  it("marks the roll epic only below the epic threshold", () => {
    expect(rollBadgeDrop(cp(), seq(0.02, 0.2)).drop.rarity).toBe("epic");
    expect(rollBadgeDrop(cp(), seq(0.1, 0.2)).drop.rarity).toBe("rare");
  });

  it("caps the bonus XP of a rare chest at the small-XP allowance", () => {
    const roll = rollBadgeDrop(cp(), seq(0.1, 0.2));

    expect(roll.drop.kind).toBe("chest");
    expect(roll.bonusXp).toBeLessThanOrEqual(3);
  });

  it("never grants more than two fragments on a common roll", () => {
    expect(rollBadgeDrop(cp(), seq(0.99, 0)).badgeFragments[0].count).toBe(1);
    expect(rollBadgeDrop(cp(), seq(0.99, 0.99)).badgeFragments[0].count).toBe(2);
  });

  it("accumulates fragment counts onto an existing fragment of the same id", () => {
    const roll = rollBadgeDrop(
      cp({ badgeFragments: [{ fragmentId: "frag-common", count: 4 }] }),
      seq(0.99, 0),
    );

    expect(roll.badgeFragments).toEqual([{ fragmentId: "frag-common", count: 5 }]);
  });

  it("offers a choice drop without granting any fragment up front", () => {
    const roll = rollBadgeDrop(cp(), seq(0.1, 0.9));

    expect(roll.drop.kind).toBe("choice");
    expect(roll.badgeFragments).toEqual([]);
    expect(roll.bonusXp).toBe(0);
  });

  it("makes every choice option an auxiliary reward with no learning penalty", () => {
    const roll = rollBadgeDrop(cp(), seq(0.1, 0.9));
    if (roll.drop.kind !== "choice") throw new Error("expected a choice drop");

    expect(roll.drop.options).toHaveLength(3);
    for (const option of roll.drop.options) {
      // 欠片か飾りのみ。バッジ・CP・準備度に触れるフィールドを持たない。
      expect(Object.keys(option).sort()).toEqual(
        expect.arrayContaining(["id", "label", "rarity", "emoji"]),
      );
      expect(option).not.toHaveProperty("badgeId");
      expect(option).not.toHaveProperty("xp");
    }
    expect(roll.drop.options.some((option) => option.rarity !== "common")).toBe(true);
  });

  it("does not mutate the checkpoint progress it was given", () => {
    const before = cp({ badgeFragments: [{ fragmentId: "frag-common", count: 1 }] });
    const snapshot = structuredClone(before);
    rollBadgeDrop(before, seq(0.99, 0));

    expect(before).toEqual(snapshot);
  });
});

describe("applyBadgeDrop keeps learning progression untouched", () => {
  it("only moves fragments, the pity counter and a small XP bonus", () => {
    const before = state({ rarePityCount: 1 });
    const { state: after } = applyBadgeDrop(before, seq(0.99, 0));

    expect(after.progress.checkpointProgress?.badgeFragments).toEqual([
      { fragmentId: "frag-common", count: 1 },
    ]);
    expect(after.progress.checkpointProgress?.rarePityCount).toBe(2);
    expect(after.progress.exp).toBe(before.progress.exp);
  });

  it("never awards a badge, advances a checkpoint or changes mastery", () => {
    const before = state({
      earnedBadges: [{ badgeId: "b-cp1-touch-tech", earnedAt: "2026-08-01T00:00:00.000Z" }],
      currentCheckpointId: "cp2",
      clearedCheckpointIds: ["cp1"],
    });
    const { state: after } = applyBadgeDrop(before, seq(0.02, 0.2)); // epic chest

    expect(after.progress.checkpointProgress?.earnedBadges).toEqual(
      before.progress.checkpointProgress?.earnedBadges,
    );
    expect(after.progress.checkpointProgress?.currentCheckpointId).toBe("cp2");
    expect(after.progress.checkpointProgress?.clearedCheckpointIds).toEqual(["cp1"]);
    expect(after.progress.completedTopics).toEqual(before.progress.completedTopics);
    expect(after.progress.topicMastery).toEqual(before.progress.topicMastery);
    expect(after.progress.weakTags).toEqual(before.progress.weakTags);
    expect(after.progress.checkpointProgress?.finalExamAttempts).toEqual([]);
  });

  it("adds at most the small XP allowance and keeps the level in sync", () => {
    const before = state();
    const { state: after } = applyBadgeDrop(before, seq(0.1, 0.2)); // rare chest = bonus XP

    const gained = after.progress.exp - before.progress.exp;
    expect(gained).toBeGreaterThan(0);
    expect(gained).toBeLessThanOrEqual(3);
    // grantExp を通しているので exp と level が乖離しない。
    expect(after.progress.level).toBe(calculateLevel(after.progress.exp));
  });

  it("does not mutate the state it was given", () => {
    const before = state();
    const snapshot = structuredClone(before);
    applyBadgeDrop(before, seq(0.99, 0));

    expect(before).toEqual(snapshot);
  });
});

describe("pending choice", () => {
  /** choice ドロップが出た直後の state（rng 0.1, 0.9 で choice になる）。 */
  function withPendingChoice() {
    return applyBadgeDrop(state(), seq(0.1, 0.9), new Date("2026-08-30T00:00:00.000Z")).state;
  }

  it("keeps the three options until one is chosen", () => {
    const pending = getPendingChoice(withPendingChoice());

    expect(pending?.options).toHaveLength(3);
    expect(pending?.id).toBe("2026-08-30T00:00:00.000Z");
  });

  it("grants nothing before a choice is made", () => {
    expect(withPendingChoice().progress.checkpointProgress?.badgeFragments).toEqual([]);
  });

  it("does not create a pending choice for a plain fragment drop", () => {
    const { state: after } = applyBadgeDrop(state(), seq(0.99, 0));

    expect(getPendingChoice(after)).toBeUndefined();
  });

  it("grants the chosen fragment", () => {
    const after = resolveDropChoice(withPendingChoice(), "opt-frag-rare");

    expect(after.progress.checkpointProgress?.badgeFragments).toEqual([
      { fragmentId: "frag-rare", count: 2 },
    ]);
  });

  it("accepts a cosmetic-only option without granting a fragment", () => {
    const after = resolveDropChoice(withPendingChoice(), "opt-cosmetic");

    expect(after.progress.checkpointProgress?.badgeFragments).toEqual([]);
    expect(getPendingChoice(after)).toBeUndefined();
  });

  it("clears the pending choice once resolved", () => {
    const after = resolveDropChoice(withPendingChoice(), "opt-frag-rare");

    expect(getPendingChoice(after)).toBeUndefined();
    expect(after.progress.checkpointProgress?.gameful?.rewards?.lastResolvedChoiceId).toBe(
      "2026-08-30T00:00:00.000Z",
    );
  });

  it("is idempotent: choosing twice grants only once", () => {
    const once = resolveDropChoice(withPendingChoice(), "opt-frag-rare");
    const twice = resolveDropChoice(once, "opt-frag-rare");

    expect(twice).toBe(once);
    expect(twice.progress.checkpointProgress?.badgeFragments).toEqual([
      { fragmentId: "frag-rare", count: 2 },
    ]);
  });

  it("ignores an option that was not offered", () => {
    const pendingState = withPendingChoice();

    expect(resolveDropChoice(pendingState, "opt-not-offered")).toBe(pendingState);
  });

  it("does nothing when there is no pending choice", () => {
    const plain = state();

    expect(resolveDropChoice(plain, "opt-frag-rare")).toBe(plain);
  });

  it("grants no XP, badge or checkpoint progress for any choice", () => {
    const before = withPendingChoice();
    const after = resolveDropChoice(before, "opt-frag-rare");

    expect(after.progress.exp).toBe(before.progress.exp);
    expect(after.progress.checkpointProgress?.earnedBadges).toEqual([]);
    expect(after.progress.checkpointProgress?.currentCheckpointId).toBe("cp0");
    expect(after.progress.completedTopics).toEqual(before.progress.completedTopics);
  });

  it("does not mutate the state it was given", () => {
    const before = withPendingChoice();
    const snapshot = structuredClone(before);
    resolveDropChoice(before, "opt-frag-rare");

    expect(before).toEqual(snapshot);
  });
});
