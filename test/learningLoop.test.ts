import { describe, expect, it } from "vitest";
import type { AppState, ReviewItem, TopicMasteryStats } from "@/types";
import {
  applyLearningEvidence,
  computeExamReadiness,
  getDueReviewTopics,
  getWeakTopics,
  scheduleTopicReview,
  updateLearningLoopProgress,
} from "@/lib/learningLoop";

const NOW = new Date("2026-08-11T00:00:00.000Z");

function stats(score = 50): TopicMasteryStats {
  return {
    topicId: "topic-a",
    masteryScore: score,
    lastEvaluatedAt: "2026-08-01T00:00:00.000Z",
    correctCount: 0,
    incorrectCount: 0,
    reviewSuccessCount: 0,
    recentEvidence: [],
  };
}

function state(): AppState {
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
    },
    answers: [],
  };
}

describe("Topic Mastery evidence", () => {
  it.each([
    ["confirmation", true, 58],
    ["review", true, 64],
    ["review", false, 32],
    ["summary_exam", true, 62],
    ["summary_exam", false, 30],
    ["mock_exam", true, 62],
    ["past_exam", false, 30],
    ["checkpoint", true, 60],
    ["checkpoint", false, 34],
  ] as const)("applies %s/%s with the configured strength", (kind, isCorrect, expected) => {
    const next = applyLearningEvidence(stats(), {
      topicId: "topic-a",
      questionId: "q-1",
      kind,
      isCorrect,
      isFirstSeen: false,
      answeredAt: NOW.toISOString(),
    });

    expect(next.masteryScore).toBe(expected);
  });

  it("gives first-seen evidence more weight without making one answer mastery 100", () => {
    const normal = applyLearningEvidence(stats(0), {
      topicId: "topic-a",
      questionId: "q-1",
      kind: "summary_exam",
      isCorrect: true,
      isFirstSeen: false,
      answeredAt: NOW.toISOString(),
    });
    const firstSeen = applyLearningEvidence(stats(0), {
      topicId: "topic-a",
      questionId: "q-2",
      kind: "summary_exam",
      isCorrect: true,
      isFirstSeen: true,
      answeredAt: NOW.toISOString(),
    });

    expect(firstSeen.masteryScore).toBeGreaterThan(normal.masteryScore);
    expect(firstSeen.masteryScore).toBeLessThan(100);
  });

  it("penalizes a repeated miss and clamps scores to 0..100", () => {
    const firstMiss = applyLearningEvidence(stats(50), {
      topicId: "topic-a",
      questionId: "q-1",
      kind: "confirmation",
      isCorrect: false,
      isFirstSeen: false,
      answeredAt: "2026-08-10T00:00:00.000Z",
    });
    const repeatedMiss = applyLearningEvidence(firstMiss, {
      topicId: "topic-a",
      questionId: "q-2",
      kind: "confirmation",
      isCorrect: false,
      isFirstSeen: false,
      answeredAt: NOW.toISOString(),
    });

    expect(repeatedMiss.masteryScore).toBe(26);
    expect(applyLearningEvidence(stats(95), {
      topicId: "topic-a", questionId: "q-3", kind: "review", isCorrect: true,
      isFirstSeen: false, answeredAt: NOW.toISOString(),
    }).masteryScore).toBe(100);
    expect(applyLearningEvidence(stats(5), {
      topicId: "topic-a", questionId: "q-4", kind: "summary_exam", isCorrect: false,
      isFirstSeen: false, answeredAt: NOW.toISOString(),
    }).masteryScore).toBe(0);
  });
});

describe("Review Due", () => {
  it.each([
    [undefined, 1, "2026-08-14T00:00:00.000Z"],
    [1, 2, "2026-08-18T00:00:00.000Z"],
    [2, 3, "2026-08-25T00:00:00.000Z"],
    [3, 4, "2026-09-08T00:00:00.000Z"],
    [4, 5, "2026-10-06T00:00:00.000Z"],
    [7, 8, "2027-02-07T00:00:00.000Z"],
  ] as const)("moves a successful review from stage %s to %s", (previousStage, expectedStage, dueAt) => {
    const previous: ReviewItem | undefined = previousStage === undefined ? undefined : {
      topicId: "topic-a",
      dueAt: "2026-08-11T00:00:00.000Z",
      reason: "定着確認",
      reviewStage: previousStage,
    };

    expect(scheduleTopicReview("topic-a", true, previous, NOW)).toEqual(
      expect.objectContaining({ reviewStage: expectedStage, dueAt }),
    );
  });

  it("schedules a failed review for the next day and resets its stage", () => {
    expect(scheduleTopicReview("topic-a", false, {
      topicId: "topic-a",
      dueAt: NOW.toISOString(),
      reason: "定着確認",
      reviewStage: 3,
    }, NOW)).toEqual(expect.objectContaining({
      reviewStage: 0,
      dueAt: "2026-08-12T00:00:00.000Z",
      reasonCode: "review_failure",
    }));
  });

  it("returns only due reviews in oldest-first order", () => {
    const due = getDueReviewTopics([
      { topicId: "future", dueAt: "2026-08-12T00:00:00.000Z", reason: "later" },
      { topicId: "today", dueAt: "2026-08-11T00:00:00.000Z", reason: "now" },
      { topicId: "old", dueAt: "2026-08-01T00:00:00.000Z", reason: "old" },
    ], NOW);

    expect(due.map((item) => item.topicId)).toEqual(["old", "today"]);
  });

  it("does not advance the stage for another success before the review is due", () => {
    const first = updateLearningLoopProgress(state().progress, [{
      topicId: "topic-a",
      questionId: "q-1",
      kind: "confirmation",
      isCorrect: true,
      isFirstSeen: true,
      answeredAt: NOW.toISOString(),
    }], NOW);
    const sameDay = new Date("2026-08-11T12:00:00.000Z");

    const second = updateLearningLoopProgress(first, [{
      topicId: "topic-a",
      questionId: "q-2",
      kind: "confirmation",
      isCorrect: true,
      isFirstSeen: true,
      answeredAt: sameDay.toISOString(),
    }], sameDay);

    expect(second.reviewQueue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          topicId: "topic-a",
          reviewStage: 1,
          dueAt: "2026-08-14T00:00:00.000Z",
        }),
      ]),
    );
  });
});

describe("Weak Topics", () => {
  it.each([
    ["low_mastery", stats(40)],
    ["repeated_miss", { ...stats(70), recentEvidence: [
      { questionId: "q1", kind: "confirmation", isCorrect: false, isFirstSeen: false, answeredAt: "2026-08-10T00:00:00.000Z" },
      { questionId: "q2", kind: "confirmation", isCorrect: false, isFirstSeen: false, answeredAt: NOW.toISOString() },
    ] }],
    ["summary_exam_miss", { ...stats(70), recentEvidence: [
      { questionId: "q1", kind: "summary_exam", isCorrect: false, isFirstSeen: true, answeredAt: NOW.toISOString() },
    ] }],
    ["review_failure", { ...stats(70), recentEvidence: [
      { questionId: "q1", kind: "review", isCorrect: false, isFirstSeen: false, answeredAt: NOW.toISOString() },
    ] }],
  ] as const)("derives %s from evidence", (reason, topicStats) => {
    const weak = getWeakTopics({ "topic-a": topicStats as TopicMasteryStats });
    expect(weak).toEqual([expect.objectContaining({ topicId: "topic-a", reason })]);
  });

  it("clears a summary-exam weakness after a later successful review", () => {
    const recovered: TopicMasteryStats = {
      ...stats(70),
      recentEvidence: [
        { questionId: "summary", kind: "summary_exam", isCorrect: false, isFirstSeen: true, answeredAt: "2026-08-10T00:00:00.000Z" },
        { questionId: "review", kind: "review", isCorrect: true, isFirstSeen: true, answeredAt: NOW.toISOString() },
      ],
    };

    expect(getWeakTopics({ "topic-a": recovered })).toEqual([]);
  });

  it("does not classify an unevaluated zero-score topic as weak", () => {
    expect(getWeakTopics({
      "topic-a": {
        ...stats(0),
        lastEvaluatedAt: "",
      },
    })).toEqual([]);
  });
});

it("exposes a conservative Exam Readiness interface from evaluated topics", () => {
  const readiness = computeExamReadiness({
    a: { ...stats(40), topicId: "a" },
    b: { ...stats(80), topicId: "b" },
  });

  expect(readiness).toEqual({ score: 60, evaluatedTopicCount: 2, weakTopicCount: 1 });
});

describe("P0 learning loop scenario", () => {
  it("learns, schedules, weakens after summary miss, then extends after review success", () => {
    const learned = updateLearningLoopProgress(state().progress, [{
      topicId: "topic-a", questionId: "confirm-1", kind: "confirmation", isCorrect: true,
      isFirstSeen: true, answeredAt: NOW.toISOString(),
    }], NOW);
    expect(learned.topicMastery["topic-a"]).toBeGreaterThan(0);
    expect(learned.reviewQueue[0].dueAt).toBe("2026-08-14T00:00:00.000Z");

    const missedAt = new Date("2026-08-14T00:00:00.000Z");
    const missed = updateLearningLoopProgress(learned, [{
      topicId: "topic-a", questionId: "summary-1", kind: "summary_exam", isCorrect: false,
      isFirstSeen: true, answeredAt: missedAt.toISOString(),
    }], missedAt);
    expect(getWeakTopics(missed.topicMasteryStats ?? {})[0]).toEqual(
      expect.objectContaining({ topicId: "topic-a", reason: "summary_exam_miss" }),
    );
    expect(missed.reviewQueue[0].dueAt).toBe("2026-08-15T00:00:00.000Z");

    const reviewedAt = new Date("2026-08-15T00:00:00.000Z");
    const reviewed = updateLearningLoopProgress(missed, [{
      topicId: "topic-a", questionId: "review-1", kind: "review", isCorrect: true,
      isFirstSeen: true, answeredAt: reviewedAt.toISOString(),
    }], reviewedAt);
    expect(reviewed.topicMastery["topic-a"]).toBeGreaterThan(missed.topicMastery["topic-a"]);
    expect(reviewed.reviewQueue[0].dueAt).toBe("2026-08-18T00:00:00.000Z");
  });
});
