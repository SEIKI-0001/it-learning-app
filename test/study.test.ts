import { describe, expect, it } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import { completeTopicStudy, snoozeTopicReview, studyXpReward } from "@/lib/study";
import { calculateTopicMastery, effectiveTopicMastery } from "@/lib/mastery";

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

describe("mastery and repeat XP", () => {
  it("requires history across separate days before a perfect score reaches 100", () => {
    const answers = Array.from({ length: 4 }, (_, index) => ({
      ...correctAnswer(`2026-07-01T0${index}:00:00.000Z`),
      questionId: `q-${index}`,
    }));
    expect(calculateTopicMastery(answers, new Date("2026-07-01T12:00:00Z"))).toBeLessThan(100);

    const spaced = [
      ...answers,
      ...Array.from({ length: 4 }, (_, index) => ({
        ...correctAnswer(`2026-07-04T0${index}:00:00.000Z`),
        questionId: `r-${index}`,
      })),
      ...Array.from({ length: 4 }, (_, index) => ({
        ...correctAnswer(`2026-07-11T0${index}:00:00.000Z`),
        questionId: `s-${index}`,
      })),
    ];
    expect(calculateTopicMastery(spaced, new Date("2026-07-11T12:00:00Z"))).toBe(100);
    expect(effectiveTopicMastery(100, spaced, new Date("2026-10-11T12:00:00Z"))).toBeLessThan(100);
  });

  it("reduces XP for same-day repeats and rewards due reviews more", () => {
    const now = new Date("2026-07-10T12:00:00Z");
    const state = emptyState();
    state.progress.completedTopics = ["topic-1"];
    state.answers = [correctAnswer("2026-07-10T08:00:00Z")];
    expect(studyXpReward(state, "topic-1", now)).toEqual({ multiplier: 0.1, label: "same_day" });

    state.answers = [correctAnswer("2026-07-01T08:00:00Z")];
    state.progress.reviewQueue = [
      { topicId: "topic-1", dueAt: "2026-07-10T00:00:00Z", reason: "復習期限" },
    ];
    expect(studyXpReward(state, "topic-1", now)).toEqual({ multiplier: 0.6, label: "due_review" });
  });
});
