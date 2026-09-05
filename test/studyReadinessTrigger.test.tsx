// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { completeStudySession } from "@/lib/studySession";
import TopicCompletionQuiz from "@/components/learn/TopicCompletionQuiz";

const flow = vi.hoisted(() => ({
  state: null as AppState | null,
}));
const mocks = vi.hoisted(() => ({
  saveProgressToDb: vi.fn(),
  saveQuestionAttemptsForCurrentSession: vi.fn(),
  reportTopicQuizResult: vi.fn(),
}));

vi.mock("@/lib/useAppState", () => ({
  useAppState: () => [flow.state, vi.fn()],
}));
vi.mock("@/lib/storage", () => ({ saveAppState: vi.fn() }));
vi.mock("@/lib/celebration", () => ({
  badgeEarnedCelebrations: () => [],
  emitCelebration: vi.fn(),
}));
vi.mock("@/lib/badgeSignals", () => ({ getClientBadgeSignals: () => ({}) }));
vi.mock("@/lib/userSession", () => ({
  loadCachedProgressBootstrap: () => null,
  refreshIntegratedStatus: vi.fn().mockResolvedValue(null),
  saveProgressToDb: mocks.saveProgressToDb,
  saveQuestionAttemptsForCurrentSession: mocks.saveQuestionAttemptsForCurrentSession,
  reportTopicQuizResult: mocks.reportTopicQuizResult,
  saveAnswersToDb: vi.fn(),
  todayLocalDate: () => "2026-08-23",
}));

const NOW = new Date("2026-08-23T01:00:00.000Z");
const TOPIC_ID = "tech-binary-data";

function state(reviewDueAt?: string): AppState {
  return {
    profile: {
      itExperience: "beginner",
      dailyMinutes: "15",
      examPlan: "undecided",
      confidence: 2,
    },
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: reviewDueAt ? [TOPIC_ID] : [],
      topicMastery: {},
      topicMasteryStats: {},
      reviewQueue: reviewDueAt
        ? [{ topicId: TOPIC_ID, dueAt: reviewDueAt, reason: "定着確認" }]
        : [],
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS },
      currentDay: 1,
      completedDays: [],
    },
    answers: [],
  };
}

function answer(questionId: string, answeredAt: string): UserAnswer {
  return {
    questionId,
    selectedChoice: "A",
    isCorrect: true,
    answeredAt,
    tag: "binary",
    topicId: TOPIC_ID,
  };
}

const topic = {
  id: TOPIC_ID,
  field: "technology" as const,
  tags: ["binary"],
  checkQuestions: [{
    id: "question-b",
    prompt: "2進数を選ぶ",
    choices: [
      { key: "A" as const, text: "1010" },
      { key: "B" as const, text: "ABC" },
      { key: "C" as const, text: "XYZ" },
      { key: "D" as const, text: "---" },
    ],
    correctChoice: "A" as const,
    explanation: "解説",
    difficulty: 1 as const,
    shuffleChoices: false,
  }],
};

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
  flow.state = state();
  mocks.saveProgressToDb.mockResolvedValue(true);
  mocks.reportTopicQuizResult.mockResolvedValue(true);
  mocks.saveQuestionAttemptsForCurrentSession.mockResolvedValue({
    authState: "authenticated",
    userId: "user-1",
    exposures: {
      "question-b": {
        questionId: "question-b",
        state: "first",
        attemptedBefore: false,
        firstAttemptAt: null,
        attemptCount: 1,
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("study readiness completion triggers", () => {
  it("builds an order-independent learning trigger from sorted P0 answer event keys", () => {
    const answers = [
      answer("question-z", "2026-08-23T01:02:00.000Z"),
      answer("question-a", "2026-08-23T01:01:00.000Z"),
    ];

    const completed = completeStudySession(
      state(),
      TOPIC_ID,
      answers,
      {
        "question-a": { questionId: "question-a", state: "first", attemptedBefore: false, firstAttemptAt: null, attemptCount: 1 },
        "question-z": { questionId: "question-z", state: "first", attemptedBefore: false, firstAttemptAt: null, attemptCount: 1 },
      },
      {},
      NOW,
    );

    expect(completed.readinessTrigger).toEqual({
      triggerType: "learning_complete",
      triggerId: [
        "question-a\u001fconfirmation\u001f2026-08-23T01:01:00.000Z",
        "question-z\u001fconfirmation\u001f2026-08-23T01:02:00.000Z",
      ].join("\u001e"),
    });
  });

  it("classifies only a due review completion as review_complete", () => {
    const completed = completeStudySession(
      state("2026-08-22T01:00:00.000Z"),
      TOPIC_ID,
      [answer("question-b", NOW.toISOString())],
      {
        "question-b": { questionId: "question-b", state: "seen", attemptedBefore: true, firstAttemptAt: "2026-08-01T00:00:00.000Z", attemptCount: 2 },
      },
      {},
      NOW,
    );

    expect(completed.readinessTrigger).toEqual({
      triggerType: "review_complete",
      triggerId: "question-b\u001freview\u001f2026-08-23T01:00:00.000Z",
    });
    expect(completed.state.progress.topicMasteryStats?.[TOPIC_ID].reviewSuccessCount)
      .toBe(1);
    expect(completed.state.progress.reviewQueue[0].dueAt)
      .toBe("2026-08-26T01:00:00.000Z");
  });

  it("awaits authoritative P0 progress persistence before finishing completion side effects", async () => {
    let resolveSave: ((value: boolean) => void) | undefined;
    mocks.saveProgressToDb.mockReturnValue(new Promise<boolean>((resolve) => {
      resolveSave = resolve;
    }));
    render(<TopicCompletionQuiz topic={topic} />);

    fireEvent.click(screen.getByText("1010").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: "このレッスンを完了する" }));

    await waitFor(() => expect(mocks.saveProgressToDb).toHaveBeenCalledOnce());
    expect(mocks.saveProgressToDb).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        topicMasteryStats: expect.objectContaining({
          [TOPIC_ID]: expect.objectContaining({ masteryScore: 8 }),
        }),
      }),
      {
        triggerType: "learning_complete",
        triggerId: "question-b\u001fconfirmation\u001f2026-08-23T01:00:00.000Z",
      },
    );
    expect(mocks.reportTopicQuizResult).not.toHaveBeenCalled();

    resolveSave?.(true);
    await waitFor(() => expect(mocks.reportTopicQuizResult).toHaveBeenCalledOnce());
    expect(mocks.saveProgressToDb.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.reportTopicQuizResult.mock.invocationCallOrder[0],
    );
  });

  it("does not start another readiness completion when authoritative P0 persistence fails", async () => {
    mocks.saveProgressToDb.mockResolvedValue(false);
    render(<TopicCompletionQuiz topic={topic} />);

    fireEvent.click(screen.getByText("1010").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: "このレッスンを完了する" }));

    await waitFor(() => expect(mocks.saveProgressToDb).toHaveBeenCalledOnce());
    expect(mocks.reportTopicQuizResult).not.toHaveBeenCalled();
    expect(await screen.findByText("全問正解！このレッスン、おつかれさま！"))
      .toBeInTheDocument();
  });
});
