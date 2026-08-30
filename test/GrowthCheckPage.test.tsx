// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import GrowthCheckPage from "@/app/growth-check/page";

// GF-P0-003 の受け入れ基準のうち、経路でしか確かめられないもの:
//   - 既出問題の記録が既存の保存経路（＝ is_first_attempt を原子的に決める側）を通ること
//   - 成長確認だけで XP・バッジ・CP・ストリークが動かないこと
//   - 結果に「前回 → 今回」が出ること
//   - 比較材料が無ければ何も出題しないこと

const DAY_MS = 86_400_000;
const TOPICS = getAllTopics().filter((topic) => topic.checkQuestions.length > 0);
const TOPIC = TOPICS[0];
const QUESTION = TOPIC.checkQuestions[0];

const saveQuestionAttemptsForCurrentSession = vi.hoisted(() => vi.fn());
const completeStudySession = vi.hoisted(() => vi.fn());
const saveProgressToDb = vi.hoisted(() => vi.fn());
const emitCelebration = vi.hoisted(() => vi.fn());
const appState = vi.hoisted(() => ({ current: null as AppState | null }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/growth-check",
}));

vi.mock("@/lib/useAppState", () => ({
  useAppState: () => [appState.current, vi.fn()],
}));

vi.mock("@/lib/userSession", () => ({
  saveQuestionAttemptsForCurrentSession,
  saveProgressToDb,
  todayLocalDate: () => "2026-08-30",
}));

// 学習進行を動かす経路。呼ばれないことを確認するために用意する。
vi.mock("@/lib/studySession", () => ({ completeStudySession }));
vi.mock("@/lib/celebration", () => ({
  emitCelebration,
  badgeEarnedCelebrations: () => [],
}));

function answer(questionId: string, isCorrect: boolean, daysBefore: number): UserAnswer {
  return {
    questionId,
    topicId: TOPIC.id,
    tag: "tag",
    selectedChoice: isCorrect ? "A" : "B",
    isCorrect,
    answeredAt: new Date(Date.now() - daysBefore * DAY_MS).toISOString(),
  };
}

function stateWith(answers: UserAnswer[]): AppState {
  return {
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
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp1" },
    },
    answers,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  saveQuestionAttemptsForCurrentSession.mockResolvedValue({
    authState: "authenticated",
    userId: "user-1",
    exposures: {
      [QUESTION.id]: {
        questionId: QUESTION.id,
        state: "seen",
        attemptedBefore: true,
        firstAttemptAt: "2026-07-01T00:00:00.000Z",
        attemptCount: 2,
      },
    },
  });
  appState.current = stateWith([answer(QUESTION.id, false, 20)]);
});

afterEach(cleanup);

async function answerAndFinish() {
  render(<GrowthCheckPage />);
  const correctText = QUESTION.choices.find((c) => c.key === QUESTION.correctChoice)!.text;
  fireEvent.click(screen.getByText(correctText).closest("button")!);
  fireEvent.click(screen.getByText("結果をみる").closest("button")!);
  await waitFor(() => screen.getByText("前回とのくらべ"));
}

describe("no comparison material", () => {
  it("offers no challenge to a user with no past misses", () => {
    appState.current = stateWith([]);
    render(<GrowthCheckPage />);

    expect(screen.getByText("まだ比べられる記録がありません")).toBeInTheDocument();
    expect(screen.queryByText("結果をみる")).toBeNull();
  });
});

describe("exposure integrity", () => {
  it("records the attempt through the shared save path", async () => {
    await answerAndFinish();

    expect(saveQuestionAttemptsForCurrentSession).toHaveBeenCalledTimes(1);
    const [attempts] = saveQuestionAttemptsForCurrentSession.mock.calls[0];
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      questionId: QUESTION.id,
      topicId: TOPIC.id,
      questionType: "topic_quiz",
    });
  });

  it("never claims a first exposure of its own", async () => {
    await answerAndFinish();

    const [attempts] = saveQuestionAttemptsForCurrentSession.mock.calls[0];
    // 初見判定はサーバー側の原子的処理が持つ。呼び出し側は一切主張しない。
    for (const attempt of attempts) {
      expect(attempt).not.toHaveProperty("isFirstAttempt");
      expect(attempt).not.toHaveProperty("exposure");
      expect(attempt).not.toHaveProperty("state");
    }
  });
});

describe("no progression side effects", () => {
  it("does not run the study session orchestrator", async () => {
    await answerAndFinish();

    expect(completeStudySession).not.toHaveBeenCalled();
  });

  it("does not save progress or fire reward celebrations", async () => {
    await answerAndFinish();

    expect(saveProgressToDb).not.toHaveBeenCalled();
    expect(emitCelebration).not.toHaveBeenCalled();
  });

  it("shows no XP framing anywhere on the page", async () => {
    const { container } = render(<GrowthCheckPage />);

    expect(container.textContent).not.toMatch(/XP/);
  });
});

describe("previous vs current", () => {
  it("shows the previous and current results side by side", async () => {
    await answerAndFinish();

    expect(screen.getByText("前回の正解")).toBeInTheDocument();
    expect(screen.getByText("今回の正解")).toBeInTheDocument();
    expect(screen.getByText(/前回まちがえた問題のうち1問に正解できました/)).toBeInTheDocument();
  });

  it("still shows the comparison when recording fails", async () => {
    saveQuestionAttemptsForCurrentSession.mockRejectedValue(new Error("offline"));

    await answerAndFinish();

    expect(screen.getByText("前回とのくらべ")).toBeInTheDocument();
  });
});
