import { describe, expect, it } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import { getAllTopics } from "@/lib/content";
import {
  buildCheckpointExam,
  getCheckpointExamDefinition,
  recordCheckpointExamResult,
} from "@/lib/checkpointExam";

function emptyState(): AppState {
  return {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: { "tech-binary-data": 40 },
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
    },
    answers: [],
  };
}

describe("checkpoint exams", () => {
  it("uses only its declared scope with a deterministic, duplicate-free selection", () => {
    const checkpointId = "cp-technology-foundations";
    const definition = getCheckpointExamDefinition(checkpointId)!;
    const first = buildCheckpointExam({ checkpointId, attemptId: "attempt-1" });
    const second = buildCheckpointExam({ checkpointId, attemptId: "attempt-1" });
    const allowedCategories = new Set(definition.eligibleCategories);
    const allowedTopicIds = new Set(definition.eligibleTopicIds);
    const topicsById = new Map(getAllTopics().map((topic) => [topic.id, topic]));

    expect(first.questions).toHaveLength(definition.questionCount);
    expect(new Set(first.questions.map((question) => question.id)).size).toBe(
      definition.questionCount,
    );
    expect(first.questions.map((question) => question.id)).toEqual(
      second.questions.map((question) => question.id),
    );
    for (const question of first.questions) {
      const topic = topicsById.get(question.topicId)!;
      expect(
        allowedTopicIds.has(topic.id) || allowedCategories.has(topic.category),
      ).toBe(true);
    }
  });

  it("excludes recently answered questions when the in-scope pool is sufficient", () => {
    const checkpointId = "cp-management";
    const first = buildCheckpointExam({ checkpointId, attemptId: "attempt-1" });
    const retried = buildCheckpointExam({
      checkpointId,
      attemptId: "attempt-2",
      recentQuestionIds: first.questions.map((question) => question.id),
    });

    expect(retried.reusedRecentQuestion).toBe(false);
    expect(retried.questions.some((question) => first.questions.some((old) => old.id === question.id))).toBe(
      false,
    );
  });

  it("adds only incorrect checkpoint topics to review without inflating mastery", () => {
    const state = emptyState();
    const answers: UserAnswer[] = [
      {
        questionId: "tech-binary-data-q1",
        selectedChoice: "A",
        isCorrect: false,
        answeredAt: "2026-07-10T00:00:00.000Z",
        tag: "binary",
        topicId: "tech-binary-data",
      },
    ];

    const next = recordCheckpointExamResult(state, answers, new Date("2026-07-10T00:00:00Z"));

    expect(next.progress.reviewQueue).toEqual([
      expect.objectContaining({ topicId: "tech-binary-data", reason: "突破試験で要復習" }),
    ]);
    expect(next.progress.topicMastery).toEqual(state.progress.topicMastery);
    expect(next.progress.weakTags).toEqual(["binary"]);
  });
});
