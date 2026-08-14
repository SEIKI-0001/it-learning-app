import { describe, expect, it } from "vitest";
import type { AppState } from "@/types";
import { generateFinalExam } from "@/lib/finalExam";
import { recordFinalExamAttempt } from "@/lib/checkpoints";

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

  it("records answers as mastery evidence without changing the existing pass result", () => {
    const current = state();
    current.progress.topicMastery = { "tech-binary-data": 50 };
    const next = recordFinalExamAttempt(
      current,
      {
        checkpointId: "cp1",
        passed: false,
        correct: 0,
        total: 1,
        attemptedAt: "2026-08-11T00:00:00.000Z",
        wrongTopicIds: ["tech-binary-data"],
      },
      undefined,
      new Date("2026-08-11T00:00:00.000Z"),
      [{
        questionId: "tech-binary-data-q1",
        selectedChoice: "B",
        isCorrect: false,
        answeredAt: "2026-08-11T00:00:00.000Z",
        tag: "binary",
        topicId: "tech-binary-data",
      }],
    );

    expect(next.progress.checkpointProgress?.clearedCheckpointIds).not.toContain("cp1");
    expect(next.progress.topicMastery["tech-binary-data"]).toBeLessThan(50);
    expect(next.progress.topicMasteryStats?.["tech-binary-data"].recentEvidence[0].kind).toBe("checkpoint");
    expect(next.answers).toHaveLength(1);
  });
});
