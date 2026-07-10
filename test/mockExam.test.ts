import { describe, expect, it } from "vitest";
import { generateMockExam, MOCK_EXAM_RULE, scoreMockExam } from "@/lib/mockExam";
import type { AppState } from "@/types";

const state: AppState = {
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

describe("100-question mock exam", () => {
  it("creates a unique, balanced 100-question exam", () => {
    const exam = generateMockExam(state, "test-seed");
    expect(exam.questions).toHaveLength(MOCK_EXAM_RULE.questionCount);
    expect(new Set(exam.questions.map((question) => question.id)).size).toBe(100);
    for (const [field, total] of Object.entries(MOCK_EXAM_RULE.fieldQuestionCounts)) {
      expect(Object.values(exam.fieldByQuestionId).filter((value) => value === field)).toHaveLength(total);
    }
  });

  it("scores total and each field", () => {
    const exam = generateMockExam(state, "score-seed");
    const answers = exam.questions.map((question, index) => ({
      questionId: question.id,
      isCorrect: index % 2 === 0,
      answeredAt: "2026-07-10T00:00:00.000Z",
      tag: question.id,
      topicId: exam.topicIdByQuestionId[question.id],
    }));
    const result = scoreMockExam(exam, answers);
    expect(result.correct).toBe(50);
    expect(Object.values(result.fieldScores).reduce((sum, score) => sum + score.total, 0)).toBe(100);
  });
});
