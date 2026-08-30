// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import type { CheckpointId } from "@/types/checkpoint";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { emitCelebration, subscribeCelebration, type Celebration } from "@/lib/celebration";

// GF-P1-003。CP突破が「段階の変化」として、通常学習の完了とは別に見えること。

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

function capture(): Celebration[] {
  const received: Celebration[] = [];
  cleanups.push(subscribeCelebration((batch) => received.push(...batch)));
  return received;
}

function state(
  clearedCheckpointIds: CheckpointId[] = [],
  overrides: Partial<AppState["progress"]> = {},
): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: {},
      topicMasteryStats: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp1",
        clearedCheckpointIds,
      },
      ...overrides,
    },
    answers: [],
  };
}

describe("a checkpoint breakthrough reads as a step change", () => {
  it("announces the growth stage alongside the breakthrough", () => {
    const received = capture();
    emitCelebration(state(["cp1"]), state(["cp1", "cp2"]));

    const kinds = received.map((c) => c.kind);
    expect(kinds).toContain("cpCleared");
    expect(kinds).toContain("mochitGrowth");
  });

  it("names the stage it reached", () => {
    const received = capture();
    emitCelebration(state(["cp1"]), state(["cp1", "cp2"]));

    const growth = received.find((c) => c.kind === "mochitGrowth");
    expect(growth).toMatchObject({ from: 1, to: 2, label: "成長期" });
  });

  it("stays quiet when the breakthrough does not change the stage", () => {
    const received = capture();
    emitCelebration(state(["cp1", "cp2"]), state(["cp1", "cp2", "cp3"]));

    expect(received.map((c) => c.kind)).toContain("cpCleared");
    expect(received.map((c) => c.kind)).not.toContain("mochitGrowth");
  });

  it("does not fire for a plain lesson completion", () => {
    const received = capture();
    emitCelebration(state([], { exp: 0 }), state([], { exp: 30 }));

    const kinds = received.map((c) => c.kind);
    expect(kinds).toContain("xpGain");
    expect(kinds).not.toContain("mochitGrowth");
    expect(kinds).not.toContain("cpCleared");
  });

  it("carries no reward payload of its own", () => {
    const received = capture();
    emitCelebration(state(["cp1"]), state(["cp1", "cp2"]));

    const growth = received.find((c) => c.kind === "mochitGrowth");
    expect(growth).not.toHaveProperty("xp");
    expect(growth).not.toHaveProperty("badgeId");
  });
});
