import { expect, it } from "vitest";
import type { AppState, QuestionExposureMap, UserAnswer } from "@/types";
import { completeTopicStudy } from "@/lib/study";
import {
  recordMockExamResult,
  type MockExamResult,
} from "@/lib/mockExam";
import { buildTodaysLearningQueue, getWeakTopics } from "@/lib/learningLoop";
import { getAllTopics } from "@/lib/content";

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

function answer(
  questionId: string,
  isCorrect: boolean,
  answeredAt: string,
): UserAnswer {
  return {
    questionId,
    selectedChoice: isCorrect ? "A" : "B",
    isCorrect,
    answeredAt,
    tag: "network",
    topicId: "tech-binary-data",
  };
}

function exposure(
  questionId: string,
  state: "first" | "seen" = "first",
): QuestionExposureMap {
  return {
    [questionId]: {
      questionId,
      state,
      attemptedBefore: state === "seen",
      firstAttemptAt: null,
      attemptCount: state === "seen" ? 2 : 1,
    },
  };
}

it("connects topic study, summary exam weakness, and successful review", () => {
  const learnedAt = new Date("2026-08-11T00:00:00.000Z");
  const learned = completeTopicStudy(
    state(),
    "tech-binary-data",
    [answer("confirm-1", true, learnedAt.toISOString())],
    exposure("confirm-1"),
    learnedAt,
  );
  expect(learned.progress.topicMasteryStats?.["tech-binary-data"].correctCount).toBe(1);
  expect(learned.progress.reviewQueue[0].dueAt).toBe("2026-08-14T00:00:00.000Z");

  const summaryAt = new Date("2026-08-14T00:00:00.000Z");
  const summaryAnswer = answer("summary-1", false, summaryAt.toISOString());
  const result: MockExamResult = {
    correct: 0,
    total: 1,
    fieldScores: {
      strategy: { correct: 0, total: 0 },
      management: { correct: 0, total: 0 },
      technology: { correct: 0, total: 1 },
    },
    topicScores: [{ topicId: "tech-binary-data", correct: 0, total: 1, rate: 0 }],
    weakTopics: [{ topicId: "tech-binary-data", severity: 95, reason: "summary_exam_miss" }],
    wrongTopicIds: ["tech-binary-data"],
  };
  const missed = recordMockExamResult(learned, [summaryAnswer], result, summaryAt);
  expect(getWeakTopics(missed.progress.topicMasteryStats ?? {})[0]).toEqual(
    expect.objectContaining({ topicId: "tech-binary-data", reason: "summary_exam_miss" }),
  );
  expect(missed.progress.reviewQueue[0].dueAt).toBe("2026-08-15T00:00:00.000Z");

  const reviewedAt = new Date("2026-08-15T00:00:00.000Z");
  const todayQueue = buildTodaysLearningQueue({
    progress: missed.progress,
    topics: getAllTopics(),
    now: reviewedAt,
  });
  expect(todayQueue[0]).toEqual(expect.objectContaining({
    topicId: "tech-binary-data",
    kind: "overdue_review",
  }));

  const reviewed = completeTopicStudy(
    missed,
    "tech-binary-data",
    [answer("review-1", true, reviewedAt.toISOString())],
    exposure("review-1"),
    reviewedAt,
  );
  expect(reviewed.progress.topicMastery["tech-binary-data"]).toBeGreaterThan(
    missed.progress.topicMastery["tech-binary-data"],
  );
  expect(reviewed.progress.reviewQueue[0].dueAt).toBe("2026-08-18T00:00:00.000Z");
});
