// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import {
  badgeEarnedCelebrations,
  emitCelebration,
} from "@/lib/celebration";
import { subscribeMochitEvent } from "@/components/mochit/mochitEventBus";

const state = {
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
  },
  answers: [],
} as AppState;

describe("celebration Mochit bridge", () => {
  it("emits one badgeEarned reaction for a badge celebration batch", () => {
    const events: string[] = [];
    const unsubscribe = subscribeMochitEvent((signal) =>
      events.push(signal.type),
    );

    emitCelebration(
      state,
      state,
      badgeEarnedCelebrations(["b-cp1-touch-tech"]),
    );
    unsubscribe();

    expect(events).toEqual(["badgeEarned"]);
  });
});
