import { expect, it } from "vitest";
import type { AppState } from "@/types";
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

  const next = recordPastExamLearningResult(state, result, {
    1: { selected: "B", answeredAt: "2026-08-11T00:00:00.000Z", timeSpentSeconds: 10 },
  }, new Date("2026-08-11T00:00:00.000Z"));

  expect(next.progress.topicMastery["tech-binary-data"]).toBeLessThan(50);
  expect(next.progress.topicMasteryStats?.["tech-binary-data"].recentEvidence[0].kind).toBe("past_exam");
  expect(getWeakTopics(next.progress.topicMasteryStats ?? {})[0].reason).toBe("summary_exam_miss");
  expect(next.progress.reviewQueue[0].dueAt).toBe("2026-08-12T00:00:00.000Z");
});
