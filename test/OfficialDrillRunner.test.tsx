// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getQuestionById } from "@/lib/questionBank";
import { toPastExamQuestionView } from "@/lib/pastExam/viewModel";
import { PAST_EXAM_MISS_LABEL } from "@/lib/learningLoop";
import OfficialDrillRunner from "@/components/pastExam/OfficialDrillRunner";

const mocks = vi.hoisted(() => ({
  getUserId: vi.fn(),
  saveAttempts: vi.fn(),
  saveProgressToDb: vi.fn(),
  loadAppState: vi.fn(),
  saveAppState: vi.fn(),
  markTodayActivityDone: vi.fn(),
}));

vi.mock("@/lib/userSession", () => ({
  createAssessmentSessionId: () => "20000000-0000-4000-8000-000000000001",
  getUserId: mocks.getUserId,
  saveProgressToDb: mocks.saveProgressToDb,
  saveAssessmentQuestionAttemptsForCurrentSession: mocks.saveAttempts,
}));
vi.mock("@/lib/storage", () => ({ loadAppState: mocks.loadAppState, saveAppState: mocks.saveAppState }));
vi.mock("@/lib/todayActivityLog", () => ({ markTodayActivityDone: mocks.markTodayActivityDone }));

// 年度をまたいだ2問（問番号が重ならない前提に頼らないことも確かめる）。
const ids = ["ipa-it-passport-2026-q060", "ipa-it-passport-2025-q060"];
const questions = ids.map((id) => toPastExamQuestionView(getQuestionById(id)!));

function appState(): AppState {
  return {
    progress: {
      level: 1, exp: 0, streakCount: 0, weakTags: [],
      completedTopics: [], topicMastery: {}, topicMasteryStats: {}, reviewQueue: [],
      currentDay: 1, completedDays: [],
      checkpointProgress: { ...INITIAL_CHECKPOINT_PROGRESS, currentCheckpointId: "cp5" },
    },
    answers: [],
  };
}

function choose(label: "ア" | "イ" | "ウ" | "エ") {
  const button = screen.getAllByRole("button").find((b) => b.textContent?.trim().startsWith(label));
  fireEvent.click(button!);
}

const LABEL = { A: "ア", B: "イ", C: "ウ", D: "エ" } as const;

describe("OfficialDrillRunner", () => {
  beforeEach(() => {
    mocks.getUserId.mockReturnValue("user-a");
    mocks.saveAttempts.mockImplementation(async (attempts: { questionId: string }[]) => ({
      authState: "authenticated",
      userId: "user-a",
      exposures: Object.fromEntries(attempts.map((a) => [a.questionId, {
        questionId: a.questionId, state: "first", attemptedBefore: false, firstAttemptAt: null, attemptCount: 1,
      }])),
    }));
    mocks.loadAppState.mockReturnValue(appState());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("公式過去問として保存し、誤答トピックを復習へ回し、Today のタスクを済みにする", async () => {
    render(
      <OfficialDrillRunner stage="random" title="公式問題ランダム演習" questions={questions} todayTaskId="act:past-exam" />,
    );

    // 1問目: 正解、2問目: 不正解
    choose(LABEL[questions[0].correctChoice]);
    fireEvent.click(await screen.findByRole("button", { name: "次の問題へ" }));
    const wrong = (["A", "B", "C", "D"] as const).find((k) => k !== questions[1].correctChoice)!;
    choose(LABEL[wrong]);
    fireEvent.click(await screen.findByRole("button", { name: "結果を見る" }));

    // question_attempts へ official_past / 練習モードで1問ずつ保存（Exam Readiness の根拠）
    expect(mocks.saveAttempts).toHaveBeenCalledTimes(2);
    expect(mocks.saveAttempts.mock.calls[0][0][0]).toMatchObject({
      questionId: ids[0],
      questionType: "official_past",
      attemptMode: "practice",
      attemptGroupId: "20000000-0000-4000-8000-000000000001",
    });

    // AppState: 回答が積まれ、誤答トピックが翌日の復習に入る
    await waitFor(() => expect(mocks.saveAppState).toHaveBeenCalled());
    const saved = mocks.saveAppState.mock.calls[0][0] as AppState;
    expect(saved.answers.map((a) => a.questionId)).toEqual(ids);
    const review = saved.progress.reviewQueue.find((r) => r.topicId === questions[1].topicId);
    expect(review?.reason).toBe(PAST_EXAM_MISS_LABEL);
    expect(mocks.saveProgressToDb).toHaveBeenCalledWith("user-a", saved.progress);
    expect(mocks.markTodayActivityDone).toHaveBeenCalledWith("act:past-exam");

    expect(screen.getByText("公式問題ランダム演習 の結果")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "今日の学習に戻る" })).toHaveAttribute("href", "/today");
  });

  it("未ログインでも演習は完遂でき、端末の学習記録には反映する（サーバ保存はしない）", async () => {
    mocks.getUserId.mockReturnValue(null);
    render(<OfficialDrillRunner stage="field-drill" title="t" questions={[questions[0]]} todayTaskId={null} />);
    choose(LABEL[questions[0].correctChoice]);
    fireEvent.click(await screen.findByRole("button", { name: "結果を見る" }));
    expect(mocks.saveAttempts).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.saveAppState).toHaveBeenCalled());
    expect(mocks.markTodayActivityDone).toHaveBeenCalledWith(null);
  });
});
