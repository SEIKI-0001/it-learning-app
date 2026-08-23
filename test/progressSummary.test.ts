import { describe, expect, it } from "vitest";
import { computeProgressSummary } from "@/lib/progressSummary";
import type { UserProgress } from "@/types";
import type { Topic } from "@/types/content";

function progress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
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
    ...overrides,
  };
}

describe("computeProgressSummary", () => {
  it("names local completion/mastery as learning progress, never readiness", () => {
    const topics = [{ id: "topic-1" }] as Topic[];
    const summary = computeProgressSummary(topics, progress({
      completedTopics: ["topic-1"],
      topicMastery: { "topic-1": 100 },
    }), [], new Date("2026-08-22T00:00:00.000Z"));

    expect(summary.learningProgressPct).toBe(100);
    expect(summary).not.toHaveProperty("readinessPct");
  });

  it("returns zero learning progress for an empty catalog", () => {
    expect(computeProgressSummary([], progress())).toMatchObject({
      completedCount: 0,
      totalCount: 0,
      learningProgressPct: 0,
    });
  });
});
