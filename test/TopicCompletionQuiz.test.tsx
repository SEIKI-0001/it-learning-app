// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

vi.mock("@/lib/useAppState", () => ({
  useAppState: () => [flow.before, vi.fn()],
}));

vi.mock("@/lib/storage", () => ({
  saveAppState: vi.fn(),
}));

vi.mock("@/lib/studySession", () => ({
  completeStudySession: () => ({
    state: flow.next,
    newlyEarnedIds: [],
    streakMilestone: null,
  }),
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
  getUserId: () => null,
  reportTopicQuizResult: vi.fn(),
  saveAnswersToDb: vi.fn(),
  saveProgressToDb: vi.fn(),
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
  flow.next.progress.checkpointProgress.clearedCheckpointIds = [];
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
