// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WordlistEntry } from "@/types/wordlist";
import CheckPackRunner from "@/components/checkPack/CheckPackRunner";

const mocks = vi.hoisted(() => ({
  getUserId: vi.fn(),
  saveQuestionAttempts: vi.fn(),
  submitCheckPack: vi.fn(),
  recordQuizResult: vi.fn(),
}));

vi.mock("@/lib/userSession", () => ({
  getUserId: mocks.getUserId,
  saveQuestionAttempts: mocks.saveQuestionAttempts,
  submitCheckPack: mocks.submitCheckPack,
  todayLocalDate: () => "2026-08-23",
}));

vi.mock("@/lib/wordlistProgress", () => ({ recordQuizResult: mocks.recordQuizResult }));

// 単語の4択生成は wordlist 側の責務。ここでは確認パックの遷移だけを見たいので固定化する。
vi.mock("@/lib/wordlist", () => ({
  buildQuizForEntry: (entry: WordlistEntry) => ({
    prompt: `${entry.acronym} の意味は？`,
    choices: [
      { key: "A" as const, text: `${entry.id}-正解` },
      { key: "B" as const, text: `${entry.id}-誤答B` },
      { key: "C" as const, text: `${entry.id}-誤答C` },
      { key: "D" as const, text: `${entry.id}-誤答D` },
    ],
    correctKey: "A" as const,
    explanation: "用語の解説",
  }),
}));

const QUIZ_COUNT = 4;
const EXAM_COUNT = 2;

function makeQuestions(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-q${i + 1}`,
    prompt: `${prefix} の問題${i + 1}`,
    choices: [
      { key: "A" as const, text: `${prefix}-q${i + 1}-正解` },
      { key: "B" as const, text: `${prefix}-q${i + 1}-誤答B` },
      { key: "C" as const, text: `${prefix}-q${i + 1}-誤答C` },
      { key: "D" as const, text: `${prefix}-q${i + 1}-誤答D` },
    ],
    correctChoice: "A" as const,
    explanation: "解説",
    difficulty: 1 as const,
  }));
}

const quizQuestions = makeQuestions("quiz", QUIZ_COUNT);
const examQuestions = makeQuestions("exam", EXAM_COUNT);
const flashcardEntries = [
  { id: "wl-cpu", acronym: "CPU" },
  { id: "wl-ram", acronym: "RAM" },
] as unknown as WordlistEntry[];

/** 保存済み（authoritative）な exposure 応答。 */
function savedExposures(questionIds: string[]) {
  return Object.fromEntries(questionIds.map((questionId) => [questionId, {
    questionId,
    state: "first" as const,
    attemptedBefore: false,
    firstAttemptAt: "2026-08-23T01:00:00.000Z",
    attemptCount: 1,
  }]));
}

/** 保存が確認できなかった（401・障害・未設定）ときの exposure 応答。 */
function unknownExposures(questionIds: string[]) {
  return Object.fromEntries(questionIds.map((questionId) => [questionId, {
    questionId,
    state: "unknown" as const,
    attemptedBefore: null,
    firstAttemptAt: null,
    attemptCount: null,
  }]));
}

const quizSaved = () => savedExposures(quizQuestions.map((q) => q.id));
const quizUnknown = () => unknownExposures(quizQuestions.map((q) => q.id));
const examSaved = () => savedExposures(examQuestions.map((q) => q.id));
const examUnknown = () => unknownExposures(examQuestions.map((q) => q.id));

function renderRunner() {
  render(
    <CheckPackRunner
      packId="pack-tech-binary"
      topicId="tech-binary-data"
      topicTitle="二進数"
      quizQuestions={quizQuestions}
      flashcardEntries={flashcardEntries}
      examQuestions={examQuestions}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "確認パックを始める" }));
}

/** 1ステップぶんを全問正解で解き切り、完了ボタンを押す。 */
function answerStep(correctTexts: string[], completeLabel: string) {
  correctTexts.forEach((text, i) => {
    fireEvent.click(screen.getByText(text).closest("button")!);
    if (i < correctTexts.length - 1) {
      fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    }
  });
  fireEvent.click(screen.getByRole("button", { name: completeLabel }));
}

const answerQuizStep = () =>
  answerStep(quizQuestions.map((q) => `${q.id}-正解`), "次へ（用語の確認）");
const answerFlashcardStep = () =>
  answerStep(flashcardEntries.map((e) => `${e.id}-正解`), "次へ（過去問レベル）");
const answerExamStep = () =>
  answerStep(examQuestions.map((q) => `${q.id}-正解`), "結果を見る");

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

describe("CheckPackRunner learning flow", () => {
  it("advances to the term step after the quiz batch is persisted", async () => {
    mocks.saveQuestionAttempts.mockResolvedValue(quizSaved());

    renderRunner();
    answerQuizStep();

    await waitFor(() => expect(mocks.saveQuestionAttempts).toHaveBeenCalledTimes(1));
    await screen.findByText("関連用語の確認");
    expect(screen.queryByText(/学習記録を保存できませんでした/)).toBeNull();
  });

  it("advances to the term step even when the exposure result is unknown", async () => {
    mocks.saveQuestionAttempts.mockResolvedValue(quizUnknown());

    renderRunner();
    answerQuizStep();

    await waitFor(() => expect(mocks.saveQuestionAttempts).toHaveBeenCalledTimes(1));
    // 保存できなくても学習は止めない: ステップ2へ進み、同じ画面に取り残されない。
    await screen.findByText("関連用語の確認");
    expect(screen.queryByText("基礎確認問題")).toBeNull();
    expect(screen.queryByRole("button", { name: "次へ（用語の確認）" })).toBeNull();
    expect(await screen.findByText(/学習記録を保存できませんでした/)).toBeTruthy();
  });

  it("advances to the term step when the save request itself rejects (401 相当)", async () => {
    mocks.saveQuestionAttempts.mockRejectedValue(new Error("unauthenticated"));

    renderRunner();
    answerQuizStep();

    await waitFor(() => expect(mocks.saveQuestionAttempts).toHaveBeenCalledTimes(1));
    await screen.findByText("関連用語の確認");
    expect(await screen.findByText(/学習記録を保存できませんでした/)).toBeTruthy();
  });

  it("reaches the result screen when the exam-level batch fails to persist", async () => {
    mocks.saveQuestionAttempts
      .mockResolvedValueOnce(quizSaved())
      .mockResolvedValueOnce(examUnknown());

    renderRunner();
    answerQuizStep();
    await screen.findByText("関連用語の確認");
    answerFlashcardStep();
    await screen.findByText("過去問レベル問題");
    answerExamStep();

    expect(await screen.findByText("確認パックの結果")).toBeTruthy();
    expect(await screen.findByText(/学習記録を保存できませんでした/)).toBeTruthy();
  });
});

describe("CheckPackRunner evidence discipline", () => {
  it("does not raise server-side progress for a session with unsaved answers", async () => {
    mocks.saveQuestionAttempts
      .mockResolvedValueOnce(quizUnknown())
      .mockResolvedValueOnce(examSaved());

    renderRunner();
    answerQuizStep();
    await screen.findByText("関連用語の確認");
    answerFlashcardStep();
    await screen.findByText("過去問レベル問題");
    answerExamStep();

    await screen.findByText("確認パックの結果");
    // 未保存の回答は正式な到達度証拠にしない: topic_progress / 合格準備度を動かさない。
    await waitFor(() => expect(mocks.saveQuestionAttempts).toHaveBeenCalledTimes(2));
    expect(mocks.submitCheckPack).not.toHaveBeenCalled();
    // ローカル判定の結果表示までは到達している（サーバー判定は使わない）。
    expect(screen.getByText("本番対応OK")).toBeTruthy();
    expect(screen.getByText(/進捗・合格準備度には反映されません/)).toBeTruthy();
  });

  it("keeps exposure, first-seen and readiness behaviour for a fully persisted session", async () => {
    mocks.saveQuestionAttempts
      .mockResolvedValueOnce(quizSaved())
      .mockResolvedValueOnce(examSaved());

    renderRunner();
    answerQuizStep();
    await screen.findByText("関連用語の確認");
    answerFlashcardStep();
    await screen.findByText("過去問レベル問題");
    answerExamStep();

    await screen.findByText("確認パックの結果");
    await waitFor(() => expect(mocks.submitCheckPack).toHaveBeenCalledTimes(1));

    // 正式進捗は authoritative な保存の後にだけ動く。
    expect(mocks.submitCheckPack.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.saveQuestionAttempts.mock.invocationCallOrder[1],
    );
    const [quizUserId, quizAttempts] = mocks.saveQuestionAttempts.mock.calls[0];
    expect(quizUserId).toBe("user-1");
    expect(quizAttempts).toHaveLength(QUIZ_COUNT);
    expect(quizAttempts[0]).toMatchObject({
      questionId: "quiz-q1",
      questionType: "topic_quiz",
      topicId: "tech-binary-data",
      isCorrect: true,
    });
    // first-seen 判定はサーバー側で answeredAt を伴う回答単位に確定する。
    expect(typeof quizAttempts[0].answeredAt).toBe("string");
    const [, examAttempts] = mocks.saveQuestionAttempts.mock.calls[1];
    expect(examAttempts[0]).toMatchObject({
      questionId: "exam-q1",
      questionType: "exam_level",
      topicId: "tech-binary-data",
    });
    expect(mocks.submitCheckPack).toHaveBeenCalledWith("user-1", expect.objectContaining({
      packId: "pack-tech-binary",
      topicId: "tech-binary-data",
      quizRate: 100,
      flashcardRate: 100,
      examLevelRate: 100,
      date: "2026-08-23",
    }));
    expect(screen.queryByText(/学習記録を保存できませんでした/)).toBeNull();
  });

  it("does not submit for anonymous learners but still completes the pack locally", async () => {
    mocks.getUserId.mockReturnValue(null);

    renderRunner();
    answerQuizStep();
    await screen.findByText("関連用語の確認");
    answerFlashcardStep();
    await screen.findByText("過去問レベル問題");
    answerExamStep();

    await screen.findByText("確認パックの結果");
    expect(mocks.saveQuestionAttempts).not.toHaveBeenCalled();
    expect(mocks.submitCheckPack).not.toHaveBeenCalled();
    // 未ログインは「保存失敗」ではないので、通知は出さない。
    expect(screen.queryByText(/学習記録を保存できませんでした/)).toBeNull();
  });
});
