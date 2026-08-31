// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import ThemeExamRunner from "@/components/themeExam/ThemeExamRunner";
import type { ThemeExamQuestionView } from "@/types/themeExam";
import { pendingAssessmentFinalizationStorageKey } from "@/lib/examReadiness/pendingFinalization";

const flow = vi.hoisted(() => ({
  hasState: true,
  setAppState: vi.fn(),
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
const saveAssessmentQuestionAttemptsForCurrentSession = vi.hoisted(() => vi.fn());
const saveProgressToDb = vi.hoisted(() => vi.fn());
const startAssessmentSessionForCurrentSession = vi.hoisted(() => vi.fn());
const completeAssessmentSessionForCurrentSession = vi.hoisted(() => vi.fn());
const saveAppStateVerified = vi.hoisted(() => vi.fn());

vi.mock("@/lib/useAppState", () => ({
  useAppState: () => [flow.hasState ? flow.before : undefined, flow.setAppState],
}));
vi.mock("@/lib/storage", () => ({ saveAppState: vi.fn(), saveAppStateVerified }));
vi.mock("@/lib/userSession", () => ({
  assessmentAnswerIdempotencyKey: (sessionId: string, questionId: string) =>
    `assessment:${sessionId}:${questionId}`,
  completeAssessmentSessionForCurrentSession,
  createAssessmentSessionId: () => "20000000-0000-4000-8000-000000000001",
  saveProgressToDb,
  saveAssessmentQuestionAttemptsForCurrentSession,
  startAssessmentSessionForCurrentSession,
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

const storageValues = new Map<string, string>();
const localStorageStub: Storage = {
  get length() {
    return storageValues.size;
  },
  clear() {
    storageValues.clear();
  },
  getItem(key) {
    return storageValues.get(key) ?? null;
  },
  key(index) {
    return [...storageValues.keys()][index] ?? null;
  },
  removeItem(key) {
    storageValues.delete(key);
  },
  setItem(key, value) {
    storageValues.set(key, String(value));
  },
};

beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageStub,
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  flow.setAppState.mockReset();
  window.localStorage.clear();
  flow.hasState = true;
  recordThemeExamLearningResult.mockReturnValue(flow.next);
  saveAssessmentQuestionAttemptsForCurrentSession.mockResolvedValue({
    authState: "authenticated",
    userId: "user-1",
    exposures: {
      "tech-binary-data-ex1": {
        questionId: "tech-binary-data-ex1",
        state: "seen",
        attemptedBefore: true,
        firstAttemptAt: "2026-08-01T00:00:00.000Z",
        attemptCount: 2,
      },
    },
  });
  startAssessmentSessionForCurrentSession.mockResolvedValue({
    sessionId: "20000000-0000-4000-8000-000000000001",
    status: "in_progress",
  });
  completeAssessmentSessionForCurrentSession.mockResolvedValue({
    sessionId: "20000000-0000-4000-8000-000000000001",
    status: "completed",
  });
  saveProgressToDb.mockResolvedValue(true);
  saveAppStateVerified.mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("ThemeExamRunner exposure integration", () => {
  it("rejects a malformed frozen summary shape before attempts, completion, or P0", async () => {
    const sessionId = "20000000-0000-4000-8000-000000000001";
    window.localStorage.setItem(pendingAssessmentFinalizationStorageKey(sessionId), JSON.stringify({
      version: 1,
      sessionId,
      source: "summary",
      attempts: [{
        questionId: question.id,
        questionType: "theme_exam",
        topicId: question.topicId,
        selectedAnswer: "A",
        isCorrect: true,
        answeredAt: "2026-08-30T00:00:00.000Z",
        attemptGroupId: sessionId,
      }],
      completion: {
        action: "complete",
        sessionId,
        completedAt: "2026-08-30T00:00:01.000Z",
        answers: [{
          idempotencyKey: `assessment:${sessionId}:${question.id}`,
          canonicalQuestionId: question.id,
          topicId: question.topicId,
          isCorrect: true,
          answeredAt: "2026-08-30T00:00:00.000Z",
        }],
      },
      baseState: {
        appState: flow.before,
        examId: "theme-exam-computer-basics",
        themeSlug: 42,
      },
      result: {
        sessionId,
        themeSlug: "computer-basics",
        total: 1,
        correct: 1,
        unanswered: 0,
        rate: 100,
        passed: true,
        questions: [{
          questionId: question.id,
          questionNumber: 1,
          selected: "A",
          correctChoice: "A",
          isCorrect: true,
          isUnanswered: false,
          topicId: question.topicId,
          topicTitle: question.topicTitle,
        }],
        reviewTopics: [],
      },
    }));

    render(
      <ThemeExamRunner
        examId="theme-exam-computer-basics"
        themeSlug="computer-basics"
        themeTitle="コンピュータ基礎"
        passRate={60}
        questions={[question]}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(saveAssessmentQuestionAttemptsForCurrentSession).not.toHaveBeenCalled();
    expect(completeAssessmentSessionForCurrentSession).not.toHaveBeenCalled();
    expect(saveProgressToDb).not.toHaveBeenCalled();
  });

  it("rejects a shape-valid summary result that disagrees with its frozen attempt frame", async () => {
    const sessionId = "20000000-0000-4000-8000-000000000001";
    window.localStorage.setItem(pendingAssessmentFinalizationStorageKey(sessionId), JSON.stringify({
      version: 1,
      sessionId,
      source: "summary",
      attempts: [{
        questionId: question.id,
        questionType: "theme_exam",
        topicId: question.topicId,
        selectedAnswer: "A",
        isCorrect: true,
        answeredAt: "2026-08-30T00:00:00.000Z",
        attemptGroupId: sessionId,
      }],
      completion: {
        action: "complete",
        sessionId,
        completedAt: "2026-08-30T00:00:00.000Z",
        answers: [{
          idempotencyKey: `assessment:${sessionId}:${question.id}`,
          canonicalQuestionId: question.id,
          topicId: question.topicId,
          isCorrect: true,
          answeredAt: "2026-08-30T00:00:00.000Z",
        }],
      },
      baseState: {
        appState: flow.before,
        examId: "theme-exam-computer-basics",
        themeSlug: "computer-basics",
      },
      // This is a complete result shape, but describes B/incorrect while the
      // immutable strict-attempt payload describes A/correct.
      result: {
        sessionId,
        themeSlug: "computer-basics",
        total: 1,
        correct: 0,
        unanswered: 0,
        rate: 0,
        passed: false,
        questions: [{
          questionId: question.id,
          questionNumber: 1,
          selected: "B",
          correctChoice: "A",
          isCorrect: false,
          isUnanswered: false,
          topicId: question.topicId,
          topicTitle: question.topicTitle,
        }],
        reviewTopics: [{
          topicId: question.topicId,
          topicTitle: question.topicTitle,
          incorrectCount: 1,
        }],
      },
    }));

    render(
      <ThemeExamRunner
        examId="theme-exam-computer-basics"
        themeSlug="computer-basics"
        themeTitle="コンピュータ基礎"
        passRate={60}
        questions={[question]}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(saveAssessmentQuestionAttemptsForCurrentSession).not.toHaveBeenCalled();
    expect(completeAssessmentSessionForCurrentSession).not.toHaveBeenCalled();
    expect(saveProgressToDb).not.toHaveBeenCalled();
  });

  it("persists start before showing questions", async () => {
    let releaseStart!: () => void;
    startAssessmentSessionForCurrentSession.mockImplementation(() =>
      new Promise((resolve) => {
        releaseStart = () => resolve({
          sessionId: "20000000-0000-4000-8000-000000000001",
          status: "in_progress",
        });
      })
    );
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

    expect(screen.queryByText("2進数の確認")).not.toBeInTheDocument();
    await waitFor(() => expect(startAssessmentSessionForCurrentSession).toHaveBeenCalled());
    releaseStart();
    expect(await screen.findByText("2進数の確認")).toBeInTheDocument();
    expect(startAssessmentSessionForCurrentSession).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "start",
        source: "summary",
        mode: "exam",
        questionCount: 1,
      }),
    );
  });

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
    fireEvent.click(await screen.findByRole("button", { name: /正しい選択肢/ }));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    await waitFor(() => expect(recordThemeExamLearningResult).toHaveBeenCalled());
    expect(saveAssessmentQuestionAttemptsForCurrentSession).toHaveBeenCalledTimes(1);
    expect(recordThemeExamLearningResult.mock.invocationCallOrder[0]).toBeGreaterThan(
      saveAssessmentQuestionAttemptsForCurrentSession.mock.invocationCallOrder[0],
    );
    expect(completeAssessmentSessionForCurrentSession.mock.invocationCallOrder[0]).toBeGreaterThan(
      saveAssessmentQuestionAttemptsForCurrentSession.mock.invocationCallOrder[0],
    );
    expect(recordThemeExamLearningResult.mock.invocationCallOrder[0]).toBeGreaterThan(
      completeAssessmentSessionForCurrentSession.mock.invocationCallOrder[0],
    );
    expect(recordThemeExamLearningResult.mock.calls[0][3]).toEqual({
      "tech-binary-data-ex1": expect.objectContaining({ state: "seen" }),
    });
    expect(saveProgressToDb).toHaveBeenCalledWith(
      "user-1",
      flow.next.progress,
      {
        triggerType: "assessment",
        triggerId: "20000000-0000-4000-8000-000000000001",
      },
    );
  });

  it("submits and updates Mastery only once when the grade button is rapidly repeated", async () => {
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
    fireEvent.click(await screen.findByRole("button", { name: /正しい選択肢/ }));
    const grade = screen.getByRole("button", { name: "採点する" });

    grade.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    grade.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await waitFor(() => expect(recordThemeExamLearningResult).toHaveBeenCalled());
    expect(saveAssessmentQuestionAttemptsForCurrentSession).toHaveBeenCalledTimes(1);
    expect(recordThemeExamLearningResult).toHaveBeenCalledTimes(1);
  });

  it("still completes the persisted session when P0 state is unavailable", async () => {
    flow.hasState = false;
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
    fireEvent.click(await screen.findByRole("button", { name: /正しい選択肢/ }));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    await waitFor(() => expect(completeAssessmentSessionForCurrentSession).toHaveBeenCalledOnce());
    expect(saveAssessmentQuestionAttemptsForCurrentSession).toHaveBeenCalledWith(
      expect.any(Array),
    );
    expect(recordThemeExamLearningResult).not.toHaveBeenCalled();
  });

  it("keeps questions unmounted after a failed start and retries the same action", async () => {
    startAssessmentSessionForCurrentSession
      .mockRejectedValueOnce(new Error("start failed"))
      .mockResolvedValueOnce({
        sessionId: "20000000-0000-4000-8000-000000000001",
        status: "in_progress",
      });
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

    expect(await screen.findByRole("alert")).toHaveTextContent("開始");
    expect(screen.queryByText("2進数の確認")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "試験を始める" }));
    expect(await screen.findByText("2進数の確認")).toBeInTheDocument();
    expect(startAssessmentSessionForCurrentSession.mock.calls[1][0]).toEqual(
      startAssessmentSessionForCurrentSession.mock.calls[0][0],
    );
  });

  it("does not write P0 or show results after failed completion and permits retry", async () => {
    completeAssessmentSessionForCurrentSession
      .mockRejectedValueOnce(new Error("complete failed"))
      .mockResolvedValueOnce({
        sessionId: "20000000-0000-4000-8000-000000000001",
        status: "completed",
      });
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
    fireEvent.click(await screen.findByRole("button", { name: /正しい選択肢/ }));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(screen.getByText("2進数の確認")).toBeInTheDocument();
    expect(recordThemeExamLearningResult).not.toHaveBeenCalled();
    expect(saveProgressToDb).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /誤った選択肢/ }));
    expect(screen.getByRole("button", { name: /正しい選択肢/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /誤った選択肢/ })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "採点する" }));
    await waitFor(() => expect(recordThemeExamLearningResult).toHaveBeenCalledOnce());
    expect(completeAssessmentSessionForCurrentSession.mock.calls[1][0]).toEqual(
      completeAssessmentSessionForCurrentSession.mock.calls[0][0],
    );
  });

  it.each([
    ["network", () => new TypeError("connection lost")],
    ["http", () => Object.assign(new Error("503"), { code: "http" })],
    ["malformed", () => Object.assign(new Error("bad response"), { code: "malformed_response" })],
    ["unknown", () => Object.assign(new Error("unknown exposure"), { code: "malformed_response" })],
  ])("does not cache %s exposure data and retries its byte-identical batch", async (_failure, error) => {
    saveAssessmentQuestionAttemptsForCurrentSession
      .mockRejectedValueOnce(error())
      .mockResolvedValueOnce({
        authState: "authenticated",
        userId: "user-1",
        exposures: {
          "tech-binary-data-ex1": {
            questionId: "tech-binary-data-ex1",
            state: "first",
            attemptedBefore: false,
            firstAttemptAt: "2026-08-01T00:00:00.000Z",
            attemptCount: 1,
          },
        },
      });
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
    fireEvent.click(await screen.findByRole("button", { name: /正しい選択肢/ }));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(recordThemeExamLearningResult).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));
    await waitFor(() => expect(recordThemeExamLearningResult).toHaveBeenCalledOnce());
    expect(saveAssessmentQuestionAttemptsForCurrentSession.mock.calls[1][0])
      .toEqual(saveAssessmentQuestionAttemptsForCurrentSession.mock.calls[0][0]);
  });

  it("remounts after a lost strict-save response and resumes the exact frozen finalization", async () => {
    saveAssessmentQuestionAttemptsForCurrentSession
      .mockRejectedValueOnce(new TypeError("connection lost"))
      .mockResolvedValueOnce({
        authState: "authenticated",
        userId: "user-1",
        exposures: {
          "tech-binary-data-ex1": {
            questionId: "tech-binary-data-ex1",
            state: "first",
            attemptedBefore: false,
            firstAttemptAt: "2026-08-01T00:00:00.000Z",
            attemptCount: 1,
          },
        },
      });
    const props = {
      examId: "theme-exam-computer-basics",
      themeSlug: "computer-basics",
      themeTitle: "コンピュータ基礎",
      passRate: 60,
      questions: [question],
    };
    render(<ThemeExamRunner {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "試験を始める" }));
    fireEvent.click(await screen.findByRole("button", { name: /正しい選択肢/ }));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(completeAssessmentSessionForCurrentSession).not.toHaveBeenCalled();
    const frozenAttempts = JSON.stringify(
      saveAssessmentQuestionAttemptsForCurrentSession.mock.calls[0][0],
    );

    cleanup();
    render(<ThemeExamRunner {...props} />);

    await waitFor(() => expect(saveAssessmentQuestionAttemptsForCurrentSession).toHaveBeenCalledTimes(2));
    expect(JSON.stringify(saveAssessmentQuestionAttemptsForCurrentSession.mock.calls[1][0]))
      .toBe(frozenAttempts);
    expect(await screen.findByText("合格ライン到達")).toBeInTheDocument();
  });

  it("keeps the summary result and pending record hidden until frozen P0 acknowledgement", async () => {
    saveProgressToDb.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const props = {
      examId: "theme-exam-computer-basics",
      themeSlug: "computer-basics",
      themeTitle: "コンピュータ基礎",
      passRate: 60,
      questions: [question],
    };
    render(<ThemeExamRunner {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "試験を始める" }));
    fireEvent.click(await screen.findByRole("button", { name: /正しい選択肢/ }));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(screen.queryByText("合格ライン到達")).not.toBeInTheDocument();
    expect(flow.setAppState).not.toHaveBeenCalled();
    const firstP0 = JSON.stringify(saveProgressToDb.mock.calls[0]);
    expect([...storageValues.keys()].some((key) =>
      key.startsWith("fequest:assessmentFinalization:"),
    )).toBe(true);

    cleanup();
    render(<ThemeExamRunner {...props} />);

    await waitFor(() => expect(saveProgressToDb).toHaveBeenCalledTimes(2));
    expect(JSON.stringify(saveProgressToDb.mock.calls[1])).toBe(firstP0);
    expect(await screen.findByText("合格ライン到達")).toBeInTheDocument();
    expect(flow.setAppState).toHaveBeenCalledOnce();
    expect([...storageValues.keys()].some((key) =>
      key.startsWith("fequest:assessmentFinalization:"),
    )).toBe(false);
  });

  it("keeps the frozen summary pending when localStorage removal fails", async () => {
    const props = {
      examId: "theme-exam-computer-basics",
      themeSlug: "computer-basics",
      themeTitle: "コンピュータ基礎",
      passRate: 60,
      questions: [question],
    };
    render(<ThemeExamRunner {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "試験を始める" }));
    fireEvent.click(await screen.findByRole("button", { name: /正しい選択肢/ }));
    const removeItem = vi.spyOn(window.localStorage, "removeItem").mockImplementation(() => {
      throw new DOMException("storage is unavailable");
    });

    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(screen.queryByText("合格ライン到達")).not.toBeInTheDocument();
    expect(flow.setAppState).not.toHaveBeenCalled();
    expect([...storageValues.keys()].some((key) =>
      key.startsWith("fequest:assessmentFinalization:"),
    )).toBe(true);

    removeItem.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "保存を再試行する" }));
    expect(await screen.findByText("合格ライン到達")).toBeInTheDocument();
  });

  it("keeps the frozen summary pending when verified local AppState persistence fails", async () => {
    saveAppStateVerified.mockReturnValue(false);
    const props = {
      examId: "theme-exam-computer-basics",
      themeSlug: "computer-basics",
      themeTitle: "コンピュータ基礎",
      passRate: 60,
      questions: [question],
    };
    render(<ThemeExamRunner {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "試験を始める" }));
    fireEvent.click(await screen.findByRole("button", { name: /正しい選択肢/ }));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(screen.queryByText("合格ライン到達")).not.toBeInTheDocument();
    expect(flow.setAppState).not.toHaveBeenCalled();
    expect(saveAppStateVerified).toHaveBeenCalledOnce();
    expect([...storageValues.keys()].some((key) =>
      key.startsWith("fequest:assessmentFinalization:"),
    )).toBe(true);
  });
});
