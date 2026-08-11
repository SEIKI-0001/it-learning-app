import { describe, expect, it } from "vitest";
import {
  buildMockExamInsights,
  generateMockExam,
  MOCK_EXAM_RULE,
  recordMockExamResult,
  scoreMockExam,
} from "@/lib/mockExam";
import { getAllTopics } from "@/lib/content";
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
    expect(result.topicScores.reduce((sum, score) => sum + score.total, 0)).toBe(100);
    expect(result.topicScores.every((score) => score.rate >= 0 && score.rate <= 100)).toBe(true);
    expect(result.weakTopics.every((topic) => topic.reason === "summary_exam_miss")).toBe(true);
  });

  it("builds top-three strengthening topics and deterministic next action", () => {
    const result = scoreMockExam(generateMockExam(state, "insight-seed"), []);
    const insights = buildMockExamInsights(result, getAllTopics());

    expect(insights.topics).toHaveLength(3);
    expect(insights.message).toContain("次回は");
    expect(insights.message).toContain("復習を優先します");
    expect(insights.primaryTopicId).toBe(insights.topics[0].topicId);
  });

  it("preserves mock_exam as the mastery evaluation type", () => {
    const exam = generateMockExam(state, "evaluation-type-seed");
    const question = exam.questions[0];
    const answer = {
      questionId: question.id,
      isCorrect: true,
      answeredAt: "2026-08-11T00:00:00.000Z",
      tag: question.id,
      topicId: exam.topicIdByQuestionId[question.id],
    };
    const result = scoreMockExam(exam, [answer]);

    const next = recordMockExamResult(state, [answer], result, new Date(answer.answeredAt));

    expect(next.progress.topicMasteryStats?.[answer.topicId].recentEvidence[0].kind).toBe("mock_exam");
  });
});
