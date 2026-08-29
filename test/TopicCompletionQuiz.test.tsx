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
      topicMasteryStats: {},
      checkpointProgress: {
        currentCheckpointId: "cp1",
        clearedCheckpointIds: [],
        earnedBadges: [],
        badgeFragments: [],
        finalExamAttempts: [],
        rarePityCount: 0,
      },
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
        checkpointProgress: {
          currentCheckpointId: "cp1",
          clearedCheckpointIds: [] as string[],
          earnedBadges: [],
          badgeFragments: [],
          finalExamAttempts: [],
          rarePityCount: 0,
        },
      },
    },
  };
});

const completeStudySession = vi.hoisted(() => vi.fn());
const refreshIntegratedStatus = vi.hoisted(() => vi.fn());
const saveQuestionAttemptsForCurrentSession = vi.hoisted(() => vi.fn());

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
  // 成果差分（GF-P0-005）が使う合格準備度の前後値。
  // 既定ではキャッシュ無し・再計算失敗の経路を通し、完了処理が影響を受けないことを保つ。
  loadCachedProgressBootstrap: () => null,
  refreshIntegratedStatus,
  reportTopicQuizResult: vi.fn(),
  saveAnswersToDb: vi.fn(),
  saveProgressToDb: vi.fn(),
  saveQuestionAttemptsForCurrentSession,
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
  refreshIntegratedStatus.mockResolvedValue(null);
  completeStudySession.mockReturnValue({
    state: flow.next,
    newlyEarnedIds: [],
    streakMilestone: null,
  });
  saveQuestionAttemptsForCurrentSession.mockResolvedValue({
    authState: "authenticated",
    userId: "user-1",
    exposures: {
      "completion-question": {
        questionId: "completion-question",
        state: "seen",
        attemptedBefore: true,
        firstAttemptAt: "2026-07-01T00:00:00.000Z",
        attemptCount: 2,
      },
    },
  });
});

afterEach(() => {
  cleanup();
});

async function completeWith(answerText: string): Promise<string[]> {
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
  await waitFor(() => expect(completeStudySession).toHaveBeenCalled());
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
    expect(saveQuestionAttemptsForCurrentSession).toHaveBeenCalledTimes(1);
    expect(completeStudySession.mock.invocationCallOrder[0]).toBeGreaterThan(
      saveQuestionAttemptsForCurrentSession.mock.invocationCallOrder[0],
    );
    expect(completeStudySession.mock.calls[0][3]).toEqual({
      "completion-question": expect.objectContaining({ state: "seen" }),
    });
  });

  it("emits allCorrect after the final correct answer", async () => {
    await expect(completeWith("完了テストの正解")).resolves.toEqual([
      "correct",
      "allCorrect",
    ]);
  });

  it("emits taskComplete after a non-perfect completion", async () => {
    await expect(completeWith("完了テストの不正解")).resolves.toEqual([
      "incorrect",
      "taskComplete",
    ]);
  });

  it("prioritizes checkpointClear over allCorrect", async () => {
    flow.next.progress.checkpointProgress.clearedCheckpointIds = ["cp1"];

    await expect(completeWith("完了テストの正解")).resolves.toEqual([
      "correct",
      "checkpointClear",
    ]);
  });
});

describe("session outcome feedback (GF-P0-005)", () => {
  async function completeAndSettle() {
    render(<TopicCompletionQuiz topic={topic} />);
    fireEvent.click(screen.getByText("完了テストの正解").closest("button")!);
    fireEvent.click(screen.getByText("このレッスンを完了する").closest("button")!);
    await waitFor(() => screen.getByText(/問正解$/));
  }

  it("shows what changed above the XP reward", async () => {
    await completeAndSettle();

    const panel = screen.getByText(/問正解$/).closest("div")!;
    const text = panel.textContent ?? "";
    expect(text).toContain("今回の変化");
    expect(text.indexOf("今回の変化")).toBeLessThan(text.indexOf("XP"));
  });

  it("still completes when the readiness recalculation fails", async () => {
    refreshIntegratedStatus.mockRejectedValue(new Error("network down"));

    await completeAndSettle();

    // 完了表示・XP・ストリークは通常どおり出る。
    expect(screen.getByText(/問正解$/)).toBeInTheDocument();
    expect(screen.getByText("今回の変化")).toBeInTheDocument();
  });

  it("does not show a readiness comparison without measured values", async () => {
    await completeAndSettle();

    // 「58% → 66%」のような実測比較が出ていないこと
    // （「合格準備度への反映を見る」の既存リンクとは別物）。
    const panel = screen.getByText(/問正解$/).closest("div")!;
    expect(panel.textContent ?? "").not.toMatch(/\d+%\s*→\s*\d+%/);
  });
});
