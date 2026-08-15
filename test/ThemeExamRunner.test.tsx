// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ThemeExamRunner from "@/components/themeExam/ThemeExamRunner";
import type { ThemeExamQuestionView } from "@/types/themeExam";

const flow = vi.hoisted(() => ({
  before: {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: {},
      topicMasteryStats: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
    },
    answers: [],
  },
  next: {
    progress: {
      level: 1,
      exp: 0,
      streakCount: 0,
      weakTags: [],
      completedTopics: [],
      topicMastery: { "tech-binary-data": 12 },
      topicMasteryStats: {},
      reviewQueue: [],
      currentDay: 1,
      completedDays: [],
    },
    answers: [],
  },
}));

const recordThemeExamLearningResult = vi.hoisted(() => vi.fn());
const saveQuestionAttemptsWithExposure = vi.hoisted(() => vi.fn());
const saveProgressToDb = vi.hoisted(() => vi.fn());

vi.mock("@/lib/useAppState", () => ({
  useAppState: () => [flow.before, vi.fn()],
}));
vi.mock("@/lib/storage", () => ({ saveAppState: vi.fn() }));
vi.mock("@/lib/userSession", () => ({
  getUserId: () => "user-1",
  saveProgressToDb,
  saveQuestionAttemptsWithExposure,
}));
vi.mock("@/lib/themeExam", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/themeExam")>();
  return { ...actual, recordThemeExamLearningResult };
});

const question: ThemeExamQuestionView = {
  id: "tech-binary-data-ex1",
  questionNumber: 1,
  prompt: "2進数の確認",
  choices: [
    { key: "A", text: "正しい選択肢" },
    { key: "B", text: "誤った選択肢" },
    { key: "C", text: "選択肢C" },
    { key: "D", text: "選択肢D" },
  ],
  correctChoice: "A",
  explanation: "解説",
  difficulty: 3,
  topicId: "tech-binary-data",
  topicTitle: "2進数とデータ表現",
  tags: ["binary"],
};

beforeEach(() => {
  vi.clearAllMocks();
  recordThemeExamLearningResult.mockReturnValue(flow.next);
  saveQuestionAttemptsWithExposure.mockResolvedValue({
    "tech-binary-data-ex1": {
      questionId: "tech-binary-data-ex1",
      state: "seen",
      attemptedBefore: true,
      firstAttemptAt: "2026-08-01T00:00:00.000Z",
      attemptCount: 2,
    },
  });
});

afterEach(cleanup);

describe("ThemeExamRunner exposure integration", () => {
  it("awaits one classification batch before updating summary-exam Mastery", async () => {
    render(
      <ThemeExamRunner
        examId="theme-exam-computer-basics"
        themeSlug="computer-basics"
        themeTitle="コンピュータ基礎"
        passRate={60}
        questions={[question]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "試験を始める" }));
    fireEvent.click(screen.getByRole("button", { name: /正しい選択肢/ }));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    await waitFor(() => expect(recordThemeExamLearningResult).toHaveBeenCalled());
    expect(saveQuestionAttemptsWithExposure).toHaveBeenCalledTimes(1);
    expect(recordThemeExamLearningResult.mock.invocationCallOrder[0]).toBeGreaterThan(
      saveQuestionAttemptsWithExposure.mock.invocationCallOrder[0],
    );
    expect(recordThemeExamLearningResult.mock.calls[0][3]).toEqual({
      "tech-binary-data-ex1": expect.objectContaining({ state: "seen" }),
    });
    expect(saveProgressToDb).toHaveBeenCalledWith("user-1", flow.next.progress);
  });
});
