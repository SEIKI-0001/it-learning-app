import { expect, it } from "vitest";
import type { AppState, TopicMasteryStats, UserProgress } from "@/types";
import {
  progressRowToProgress,
  progressToRow,
  type ProgressRow,
} from "@/lib/dbMappers";
import { mergeProgress } from "@/lib/mergeAppState";
import { normalizeAppState } from "@/lib/storage";

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
    ...overrides,
  };
}

function mastery(score: number, at: string): TopicMasteryStats {
  return {
    topicId: "topic-a",
    masteryScore: score,
    lastEvaluatedAt: at,
    correctCount: 2,
    incorrectCount: 1,
    reviewSuccessCount: 0,
    recentEvidence: [],
  };
}

it("normalizes an old AppState with empty evidence-backed mastery", () => {
  const oldState: AppState = { progress: progress(), answers: [] };
  delete oldState.progress.topicMasteryStats;

  expect(normalizeAppState(oldState).progress.topicMasteryStats).toEqual({});
});

it("round-trips topic mastery stats through the progress DB mapper", () => {
  const detail = mastery(42, "2026-08-11T00:00:00.000Z");
  const row = progressToRow("user-1", progress({
    topicMastery: { "topic-a": 42 },
    topicMasteryStats: { "topic-a": detail },
  }));

  expect(row.topic_mastery_stats).toEqual({ "topic-a": detail });
  expect(progressRowToProgress(row as ProgressRow).topicMasteryStats).toEqual({
    "topic-a": detail,
  });
});

it("uses the newest mastery evaluation even when its score is lower", () => {
  const oldHigh = progress({
    lastPlayedAt: "2026-08-10T00:00:00.000Z",
    topicMastery: { "topic-a": 80 },
    topicMasteryStats: { "topic-a": mastery(80, "2026-08-10T00:00:00.000Z") },
  });
  const newLow = progress({
    lastPlayedAt: "2026-08-11T00:00:00.000Z",
    topicMastery: { "topic-a": 55 },
    topicMasteryStats: { "topic-a": mastery(55, "2026-08-11T00:00:00.000Z") },
  });

  const merged = mergeProgress(oldHigh, newLow);
  expect(merged.topicMastery["topic-a"]).toBe(55);
  expect(merged.topicMasteryStats?.["topic-a"].masteryScore).toBe(55);
});
