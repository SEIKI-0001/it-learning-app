// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CheckPackRunner from "@/components/checkPack/CheckPackRunner";

const mocks = vi.hoisted(() => ({
  getUserId: vi.fn(),
  saveQuestionAttempts: vi.fn(),
  submitCheckPack: vi.fn(),
}));

vi.mock("@/lib/userSession", () => ({
  getUserId: mocks.getUserId,
  saveQuestionAttempts: mocks.saveQuestionAttempts,
  submitCheckPack: mocks.submitCheckPack,
  todayLocalDate: () => "2026-08-23",
}));

vi.mock("@/lib/wordlistProgress", () => ({ recordQuizResult: vi.fn() }));

const question = {
  id: "check-pack-question",
  prompt: "保存順序を確認する問題",
  choices: [
    { key: "A" as const, text: "選択肢A" },
    { key: "B" as const, text: "選択肢B" },
    { key: "C" as const, text: "選択肢C" },
    { key: "D" as const, text: "選択肢D" },
  ],
  correctChoice: "A" as const,
  explanation: "解説",
  difficulty: 1 as const,
};

function exposure(state: "first" | "unknown") {
  return {
    "check-pack-question": {
      questionId: "check-pack-question",
      state,
      attemptedBefore: state === "first" ? false : null,
      firstAttemptAt: state === "first" ? "2026-08-23T01:00:00.000Z" : null,
      attemptCount: state === "first" ? 1 : null,
    },
  };
}

function renderRunner() {
  render(
    <CheckPackRunner
      packId="pack-tech-binary"
      topicId="tech-binary-data"
      topicTitle="二進数"
      quizQuestions={[question]}
      flashcardEntries={[]}
      examQuestions={[]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "確認パックを始める" }));
  fireEvent.click(screen.getByText("選択肢A").closest("button")!);
  fireEvent.click(screen.getByRole("button", { name: "次へ（用語の確認）" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUserId.mockReturnValue("user-1");
  mocks.submitCheckPack.mockResolvedValue({
    stage: "basic_understood",
    resultStatus: "review_needed",
    nextAction: "復習する",
  });
});

afterEach(cleanup);

describe("CheckPackRunner completion persistence", () => {
  it("awaits authoritative attempt persistence before submitting the check pack", async () => {
    let resolveAttempts!: (value: ReturnType<typeof exposure>) => void;
    mocks.saveQuestionAttempts.mockReturnValue(new Promise((resolve) => {
      resolveAttempts = resolve;
    }));

    renderRunner();

    await waitFor(() => expect(mocks.saveQuestionAttempts).toHaveBeenCalledTimes(1));
    expect(mocks.submitCheckPack).not.toHaveBeenCalled();

    resolveAttempts(exposure("first"));

    await waitFor(() => expect(mocks.submitCheckPack).toHaveBeenCalledTimes(1));
    expect(mocks.submitCheckPack.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.saveQuestionAttempts.mock.invocationCallOrder[0],
    );
  });

  it("keeps frozen answers retryable and does not finalize after attempt-save failure", async () => {
    mocks.saveQuestionAttempts
      .mockResolvedValueOnce(exposure("unknown"))
      .mockResolvedValueOnce(exposure("first"));

    renderRunner();

    await waitFor(() => expect(mocks.saveQuestionAttempts).toHaveBeenCalledTimes(1));
    expect(mocks.submitCheckPack).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "次へ（用語の確認）" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "次へ（用語の確認）" }));

    await waitFor(() => expect(mocks.saveQuestionAttempts).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mocks.submitCheckPack).toHaveBeenCalledTimes(1));
    expect(mocks.saveQuestionAttempts.mock.calls[1]).toEqual(
      mocks.saveQuestionAttempts.mock.calls[0],
    );
  });
});
