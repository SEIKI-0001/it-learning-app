import { expect, it } from "vitest";
import type { AppState, QuestionExposureMap } from "@/types";
import type { PastExamResult } from "@/types/pastExam";
import { recordPastExamLearningResult } from "@/lib/pastExam/scoring";
import { getWeakTopics } from "@/lib/learningLoop";

it("records official past-exam misses as distinct evidence and next-day review", () => {
  const state: AppState = {
    progress: {
      level: 1, exp: 0, streakCount: 0, weakTags: [], completedTopics: [],
      topicMastery: { "tech-binary-data": 50 }, topicMasteryStats: {}, reviewQueue: [],
      currentDay: 1, completedDays: [],
    },
    answers: [],
  };
  const result: PastExamResult = {
    sessionId: "s1", year: 2026, mode: "exam", total: 1, correct: 0, unanswered: 0, rate: 0,
    byField: [{ field: "technology", total: 1, correct: 0, rate: 0 }],
    byTopic: [{ topicId: "tech-binary-data", total: 1, correct: 0, rate: 0 }],
    questions: [{
      questionId: "ipa-q1", questionNumber: 1, examField: "technology", selected: "B",
      correctChoice: "A", isCorrect: false, isUnanswered: false, topicId: "tech-binary-data",
    }],
  };

  const exposures: QuestionExposureMap = {
    "ipa-q1": {
      questionId: "ipa-q1", state: "seen", attemptedBefore: true,
      firstAttemptAt: "2026-08-01T00:00:00.000Z", attemptCount: 1,
    },
  };
  const next = recordPastExamLearningResult(state, result, {
    1: { selected: "B", answeredAt: "2026-08-11T00:00:00.000Z", timeSpentSeconds: 10 },
  }, exposures, new Date("2026-08-11T00:00:00.000Z"));

  expect(next.progress.topicMastery["tech-binary-data"]).toBeLessThan(50);
  expect(next.progress.topicMasteryStats?.["tech-binary-data"].recentEvidence[0].kind).toBe("past_exam");
  expect(getWeakTopics(next.progress.topicMasteryStats ?? {})[0].reason).toBe("summary_exam_miss");
  expect(next.progress.reviewQueue[0].dueAt).toBe("2026-08-12T00:00:00.000Z");
});

it("unknownの公式過去問回答には初見加点を付けない", () => {
  const state: AppState = {
    progress: {
      level: 1, exp: 0, streakCount: 0, weakTags: [], completedTopics: [],
      topicMastery: { "tech-binary-data": 50 }, topicMasteryStats: {}, reviewQueue: [],
      currentDay: 1, completedDays: [],
    },
    answers: [],
  };
  const result: PastExamResult = {
    sessionId: "s1", year: 2026, mode: "practice", total: 1, correct: 1,
    unanswered: 0, rate: 100,
    byField: [{ field: "technology", total: 1, correct: 1, rate: 100 }],
    byTopic: [{ topicId: "tech-binary-data", total: 1, correct: 1, rate: 100 }],
    questions: [{
      questionId: "ipa-q1", questionNumber: 1, examField: "technology", selected: "A",
      correctChoice: "A", isCorrect: true, isUnanswered: false, topicId: "tech-binary-data",
    }],
  };
  const answer = {
    1: { selected: "A" as const, answeredAt: "2026-08-11T00:00:00.000Z", timeSpentSeconds: 10 },
  };
  const unknown = recordPastExamLearningResult(
    state,
    result,
    answer,
    {},
    new Date("2026-08-11T00:00:00.000Z"),
  );
  const first = recordPastExamLearningResult(
    state,
    result,
    answer,
    {
      "ipa-q1": {
        questionId: "ipa-q1", state: "first", attemptedBefore: false,
        firstAttemptAt: "2026-08-11T00:00:00.000Z", attemptCount: 1,
      },
    },
    new Date("2026-08-11T00:00:00.000Z"),
  );
  const seen = recordPastExamLearningResult(
    state,
    result,
    answer,
    {
      "ipa-q1": {
        questionId: "ipa-q1", state: "seen", attemptedBefore: true,
        firstAttemptAt: "2026-08-01T00:00:00.000Z", attemptCount: 2,
      },
    },
    new Date("2026-08-11T00:00:00.000Z"),
  );

  expect(unknown.progress.topicMastery["tech-binary-data"])
    .toBe(seen.progress.topicMastery["tech-binary-data"]);
  expect(first.progress.topicMastery["tech-binary-data"])
    .toBeGreaterThan(unknown.progress.topicMastery["tech-binary-data"]);
});
