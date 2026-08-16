import { describe, expect, it } from "vitest";
import type { AppState, QuestionExposureMap, UserAnswer } from "@/types";
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

function exposure(
  questionId: string,
  state: "first" | "seen" | "unknown",
): QuestionExposureMap {
  return {
    [questionId]: {
      questionId,
      state,
      attemptedBefore: state === "seen" ? true : state === "first" ? false : null,
      firstAttemptAt: null,
      attemptCount: state === "first" ? 1 : state === "seen" ? 2 : null,
    },
  };
}

describe("topic review confirmation", () => {
  it("extends successful review intervals from 3 to 7 to 14 days", () => {
    const firstDate = new Date("2026-07-01T00:00:00Z");
    const first = completeTopicStudy(
      emptyState(),
      "topic-1",
      [correctAnswer(firstDate.toISOString())],
      exposure("topic-q1", "first"),
      firstDate,
    );
    expect(first.progress.reviewQueue[0]).toEqual(
      expect.objectContaining({ reason: "定着確認", confirmationCount: 0 }),
    );

    const secondDate = new Date("2026-07-04T00:00:00Z");
    const second = completeTopicStudy(
      first,
      "topic-1",
      [correctAnswer(secondDate.toISOString())],
      exposure("topic-q1", "seen"),
      secondDate,
    );
    expect(second.progress.reviewQueue[0]).toEqual(
      expect.objectContaining({ reason: "2回目の定着確認", confirmationCount: 1 }),
    );

    const thirdDate = new Date("2026-07-11T00:00:00Z");
    const third = completeTopicStudy(
      second,
      "topic-1",
      [correctAnswer(thirdDate.toISOString())],
      exposure("topic-q1", "seen"),
      thirdDate,
    );
    expect(third.progress.reviewQueue[0]).toEqual(
      expect.objectContaining({
        reviewStage: 3,
        dueAt: "2026-07-25T00:00:00.000Z",
      }),
    );
  });

  it.each(["seen", "unknown"] as const)(
    "does not grant a first bonus to a fresh AppState when exposure is %s",
    (exposureState) => {
      const current = emptyState();
      current.progress.completedTopics = ["topic-1"];
      current.progress.reviewQueue = [{
        topicId: "topic-1",
        dueAt: "2026-07-10T00:00:00.000Z",
        reason: "復習期限",
      }];

      const next = completeTopicStudy(
        current,
        "topic-1",
        [correctAnswer("2026-07-10T12:00:00.000Z")],
        exposure("topic-q1", exposureState),
        new Date("2026-07-10T12:00:00.000Z"),
      );

      expect(next.progress.topicMastery["topic-1"]).toBe(14);
      expect(next.progress.topicMasteryStats?.["topic-1"].recentEvidence[0]).toEqual(
        expect.objectContaining({ exposureState, isFirstSeen: false }),
      );
    },
  );

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
    expect(studyXpReward(state, "topic-1", now)).toEqual({ multiplier: 0, label: "same_day" });

    state.answers = [correctAnswer("2026-07-01T08:00:00Z")];
    state.progress.reviewQueue = [
      { topicId: "topic-1", dueAt: "2026-07-10T00:00:00Z", reason: "復習期限" },
    ];
    expect(studyXpReward(state, "topic-1", now)).toEqual({ multiplier: 0.6, label: "due_review" });
  });
});
