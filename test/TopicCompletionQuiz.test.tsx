// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import TopicCompletionQuiz from "@/components/learn/TopicCompletionQuiz";
import { subscribeMochitEvent } from "@/components/mochit/mochitEventBus";

const flow = vi.hoisted(() => {
  const before = {
    profile: { dailyMinutes: 15 },
    progress: {
      exp: 100,
      level: 1,
      streakCount: 2,
      completedTopics: [],
      weakTags: [],
      topicMastery: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
      checkpointProgress: { clearedCheckpointIds: [] },
    },
    answers: [],
  };
  return {
    before,
    userId: null as string | null,
    next: {
      ...before,
      progress: {
        ...before.progress,
        exp: 115,
        streakCount: 3,
        checkpointProgress: { clearedCheckpointIds: [] as string[] },
      },
    },
  };
});

const completeStudySession = vi.hoisted(() => vi.fn());
const saveQuestionAttemptsWithExposure = vi.hoisted(() => vi.fn());

vi.mock("@/lib/useAppState", () => ({
  useAppState: () => [flow.before, vi.fn()],
}));

vi.mock("@/lib/storage", () => ({
  saveAppState: vi.fn(),
}));

vi.mock("@/lib/studySession", () => ({
  completeStudySession,
}));

vi.mock("@/lib/study", () => ({
  XP_PER_CORRECT: 10,
  studyXpReward: () => ({ multiplier: 1 }),
}));

vi.mock("@/lib/celebration", () => ({
  badgeEarnedCelebrations: () => [],
  emitCelebration: vi.fn(),
}));

vi.mock("@/lib/badgeSignals", () => ({
  getClientBadgeSignals: () => ({}),
}));

vi.mock("@/lib/userSession", () => ({
  getUserId: () => flow.userId,
  reportTopicQuizResult: vi.fn(),
  saveAnswersToDb: vi.fn(),
  saveProgressToDb: vi.fn(),
  saveQuestionAttemptsWithExposure,
  todayLocalDate: () => "2026-07-26",
}));

const topic = {
  id: "topic-reaction",
  field: "technology" as const,
  tags: ["reaction"],
  checkQuestions: [
    {
      id: "completion-question",
      prompt: "完了イベントを確認する",
      choices: [
        { key: "A" as const, text: "完了テストの正解" },
        { key: "B" as const, text: "完了テストの不正解" },
        { key: "C" as const, text: "完了テストの別解1" },
        { key: "D" as const, text: "完了テストの別解2" },
      ],
      correctChoice: "A" as const,
      explanation: "解説",
      difficulty: 1 as const,
    },
  ],
};

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  flow.userId = null;
  flow.next.progress.checkpointProgress.clearedCheckpointIds = [];
  completeStudySession.mockReturnValue({
    state: flow.next,
    newlyEarnedIds: [],
    streakMilestone: null,
  });
  saveQuestionAttemptsWithExposure.mockResolvedValue({
    "completion-question": {
      questionId: "completion-question",
      state: "seen",
      attemptedBefore: true,
      firstAttemptAt: "2026-07-01T00:00:00.000Z",
      attemptCount: 2,
    },
  });
});

afterEach(() => {
  cleanup();
});

function completeWith(answerText: string): string[] {
  const events: string[] = [];
  const unsubscribe = subscribeMochitEvent((signal) =>
    events.push(signal.type),
  );
  render(<TopicCompletionQuiz topic={topic} />);
  fireEvent.click(screen.getByText(answerText).closest("button")!);
  fireEvent.click(
    screen.getByRole("button", {
      name: "このレッスンを完了する",
    }),
  );
  unsubscribe();
  return events;
}

describe("TopicCompletionQuiz Mochit reactions", () => {
  it("awaits logged-in exposure before completing Mastery", async () => {
    flow.userId = "user-1";
    render(<TopicCompletionQuiz topic={topic} />);
    fireEvent.click(screen.getByText("完了テストの正解").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: "このレッスンを完了する" }));

    await waitFor(() => expect(completeStudySession).toHaveBeenCalled());
    expect(saveQuestionAttemptsWithExposure).toHaveBeenCalledTimes(1);
    expect(completeStudySession.mock.invocationCallOrder[0]).toBeGreaterThan(
      saveQuestionAttemptsWithExposure.mock.invocationCallOrder[0],
    );
    expect(completeStudySession.mock.calls[0][3]).toEqual({
      "completion-question": expect.objectContaining({ state: "seen" }),
    });
  });

  it("emits allCorrect after the final correct answer", () => {
    expect(completeWith("完了テストの正解")).toEqual([
      "correct",
      "allCorrect",
    ]);
  });

  it("emits taskComplete after a non-perfect completion", () => {
    expect(completeWith("完了テストの不正解")).toEqual([
      "incorrect",
      "taskComplete",
    ]);
  });

  it("prioritizes checkpointClear over allCorrect", () => {
    flow.next.progress.checkpointProgress.clearedCheckpointIds = ["cp1"];

    expect(completeWith("完了テストの正解")).toEqual([
      "correct",
      "checkpointClear",
    ]);
  });
});
