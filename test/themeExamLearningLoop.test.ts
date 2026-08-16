import { describe, expect, it } from "vitest";
import type { AppState, QuestionExposureMap } from "@/types";
import { getWeakTopics } from "@/lib/learningLoop";
import { recordThemeExamLearningResult } from "@/lib/themeExam";
import type { ThemeExamResult } from "@/types/themeExam";

function state(): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: { "tech-binary-data": 70 },
      topicMasteryStats: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
    },
    answers: [],
  };
}

function result(isCorrect: boolean): ThemeExamResult {
  return {
    sessionId: "theme-session",
    themeSlug: "computer-basics",
    total: 1,
    correct: isCorrect ? 1 : 0,
    unanswered: 0,
    rate: isCorrect ? 100 : 0,
    passed: isCorrect,
    questions: [{
      questionId: "tech-binary-data-ex1",
      questionNumber: 1,
      selected: isCorrect ? "A" : "B",
      correctChoice: "A",
      isCorrect,
      isUnanswered: false,
      topicId: "tech-binary-data",
      topicTitle: "2進数とデータ表現",
    }],
    reviewTopics: isCorrect ? [] : [{
      topicId: "tech-binary-data",
      topicTitle: "2進数とデータ表現",
      incorrectCount: 1,
    }],
  };
}

function exposures(state: "first" | "seen" | "unknown"): QuestionExposureMap {
  return {
    "tech-binary-data-ex1": {
      questionId: "tech-binary-data-ex1",
      state,
      attemptedBefore: state === "seen" ? true : state === "first" ? false : null,
      firstAttemptAt: null,
      attemptCount: state === "first" ? 1 : state === "seen" ? 2 : null,
    },
  };
}

describe("theme summary exam learning loop", () => {
  it.each([
    ["first", 47],
    ["seen", 50],
    ["unknown", 50],
  ] as const)("records summary evidence with %s exposure", (exposureState, score) => {
    const next = recordThemeExamLearningResult(
      state(),
      result(false),
      "2026-08-15T05:00:00.000Z",
      exposures(exposureState),
    );

    expect(next.progress.topicMastery["tech-binary-data"]).toBe(score);
    expect(next.progress.topicMasteryStats?.["tech-binary-data"].recentEvidence[0]).toEqual(
      expect.objectContaining({
        kind: "summary_exam",
        exposureState,
        isFirstSeen: exposureState === "first",
      }),
    );
    expect(getWeakTopics(next.progress.topicMasteryStats ?? {})).toEqual([
      expect.objectContaining({
        topicId: "tech-binary-data",
        reason: "summary_exam_miss",
      }),
    ]);
    expect(next.progress.reviewQueue[0].dueAt).toBe("2026-08-16T05:00:00.000Z");
  });
});
