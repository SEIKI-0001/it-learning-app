import { describe, expect, it } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import { completeTopicStudy, snoozeTopicReview } from "@/lib/study";

function emptyState(): AppState {
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
    },
    answers: [],
  };
}

function correctAnswer(at: string): UserAnswer {
  return {
    questionId: "topic-q1",
    selectedChoice: "A",
    isCorrect: true,
    answeredAt: at,
    tag: "topic-tag",
    topicId: "topic-1",
  };
}

describe("topic review confirmation", () => {
  it("requires two delayed full-score confirmations before removing the review item", () => {
    const firstDate = new Date("2026-07-01T00:00:00Z");
    const first = completeTopicStudy(emptyState(), "topic-1", [correctAnswer(firstDate.toISOString())], firstDate);
    expect(first.progress.reviewQueue[0]).toEqual(
      expect.objectContaining({ reason: "定着確認", confirmationCount: 0 }),
    );

    const secondDate = new Date("2026-07-04T00:00:00Z");
    const second = completeTopicStudy(first, "topic-1", [correctAnswer(secondDate.toISOString())], secondDate);
    expect(second.progress.reviewQueue[0]).toEqual(
      expect.objectContaining({ reason: "もう一度定着確認", confirmationCount: 1 }),
    );

    const thirdDate = new Date("2026-07-11T00:00:00Z");
    const third = completeTopicStudy(second, "topic-1", [correctAnswer(thirdDate.toISOString())], thirdDate);
    expect(third.progress.reviewQueue).toEqual([]);
  });

  it("snoozing a review does not change mastery or mark a topic complete", () => {
    const state = emptyState();
    state.progress.topicMastery = { "topic-1": 25 };
    state.progress.reviewQueue = [
      { topicId: "topic-1", dueAt: "2026-07-01T00:00:00Z", reason: "間違えた問題" },
    ];

    const next = snoozeTopicReview(state, "topic-1", 3, new Date("2026-07-01T00:00:00Z"));

    expect(next.progress.topicMastery["topic-1"]).toBe(25);
    expect(next.progress.completedTopics).toEqual([]);
    expect(next.progress.reviewQueue[0]).toEqual(
      expect.objectContaining({ reason: "3日後に再確認", dueAt: "2026-07-04T00:00:00.000Z" }),
    );
  });
});
