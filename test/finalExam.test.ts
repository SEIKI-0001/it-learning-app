import { describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import { generateFinalExam } from "@/lib/finalExam";

const cp1Topics = [
  "tech-binary-data",
  "tech-computer-core",
  "mgmt-development-process",
  "strat-enterprise-activities",
];

function state(completedTopics = cp1Topics): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics,
      topicMastery: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
    },
    answers: [],
  };
}

describe("roadmap final exams", () => {
  it("uses only completed, in-scope topics with deterministic duplicate-free selection", () => {
    const first = generateFinalExam(state(), "cp1", { attemptId: "attempt-1" });
    const second = generateFinalExam(state(), "cp1", { attemptId: "attempt-1" });

    expect(first.questions).toHaveLength(6);
    expect(new Set(first.questions.map((question) => question.id)).size).toBe(6);
    expect(first.questions.map((question) => question.id)).toEqual(
      second.questions.map((question) => question.id),
    );
    for (const topicId of Object.values(first.topicIdByQuestionId)) {
      expect(cp1Topics).toContain(topicId);
    }
  });

  it("excludes recent questions when its declared scope has enough alternatives", () => {
    const first = generateFinalExam(state(), "cp1", { attemptId: "attempt-1" });
    const retry = generateFinalExam(state(), "cp1", {
      attemptId: "attempt-2",
      recentQuestionIds: first.questions.map((question) => question.id),
    });

    expect(retry.reusedRecentQuestion).toBe(false);
    expect(retry.questions.some((question) => first.questions.some((old) => old.id === question.id))).toBe(false);
  });

  it("never fills a checkpoint exam with unlearned topics", () => {
    expect(() => generateFinalExam(state(["tech-binary-data"]), "cp1")).toThrow(
      "scoped questions from completed topics",
    );
  });
});
