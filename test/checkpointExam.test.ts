import { describe, expect, it } from "vitest";
import type { AppState, QuestionExposureMap, UserAnswer } from "@/types";
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

  it("keeps pass semantics separate while recording checkpoint mastery evidence", () => {
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

    const exposures: QuestionExposureMap = {
      "tech-binary-data-q1": {
        questionId: "tech-binary-data-q1",
        state: "seen",
        attemptedBefore: true,
        firstAttemptAt: "2026-07-01T00:00:00.000Z",
        attemptCount: 2,
      },
    };
    const next = recordCheckpointExamResult(
      state,
      answers,
      exposures,
      new Date("2026-07-10T00:00:00Z"),
    );

    expect(next.progress.reviewQueue).toEqual([
      expect.objectContaining({
        topicId: "tech-binary-data",
        dueAt: "2026-07-11T00:00:00.000Z",
      }),
    ]);
    expect(next.progress.topicMastery["tech-binary-data"]).toBeLessThan(40);
    expect(next.progress.topicMasteryStats?.["tech-binary-data"].incorrectCount).toBe(1);
    expect(next.progress.topicMasteryStats?.["tech-binary-data"].recentEvidence[0].kind).toBe("checkpoint");
    expect(next.progress.topicMasteryStats?.["tech-binary-data"].recentEvidence[0]).toEqual(
      expect.objectContaining({ exposureState: "seen", isFirstSeen: false }),
    );
    expect(next.progress.weakTags).toEqual(["binary"]);
  });
});
