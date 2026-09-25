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
  loadAppState: vi.fn(),
}));

vi.mock("@/lib/userSession", () => ({
  getUserId: mocks.getUserId,
  saveQuestionAttempts: mocks.saveQuestionAttempts,
  submitCheckPack: mocks.submitCheckPack,
  todayLocalDate: () => "2026-08-23",
}));

vi.mock("@/lib/storage", () => ({ loadAppState: mocks.loadAppState }));

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
  mocks.loadAppState.mockReturnValue(null);
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

/** 確認問題（レッスン末尾）の回答が端末に記録された状態を作る。 */
function withConfirmationAnswers(results: Record<number, boolean>) {
  const answeredAt = new Date(Date.now() - 60_000).toISOString();
  mocks.loadAppState.mockReturnValue({
    progress: { reviewQueue: [] },
    answers: Object.entries(results).map(([n, isCorrect]) => ({
      questionId: `quiz-q${n}`,
      isCorrect,
      answeredAt,
      tag: "tech",
      topicId: "tech-binary-data",
    })),
  });
}

describe("CheckPackRunner skips questions already solved in the confirmation quiz", () => {
  it("Case 1: 全問正解済みならステップ1を自動完了し、回答を複製せず次へ進む", async () => {
    withConfirmationAnswers({ 1: true, 2: true, 3: true, 4: true });
    mocks.saveQuestionAttempts.mockResolvedValueOnce(examSaved());

    renderRunner();

    expect(await screen.findByText("関連用語の確認")).toBeTruthy();
    expect(screen.getByText(/確認問題ですべて理解できています/)).toBeTruthy();
    // 省いた問題の回答は保存しない（確認問題の記録がそのまま根拠）。
    expect(mocks.saveQuestionAttempts).not.toHaveBeenCalled();

    answerFlashcardStep();
    await screen.findByText("過去問レベル問題");
    answerExamStep();
    await screen.findByText("確認パックの結果");

    await waitFor(() => expect(mocks.submitCheckPack).toHaveBeenCalledTimes(1));
    expect(mocks.saveQuestionAttempts).toHaveBeenCalledTimes(1);
    expect(mocks.saveQuestionAttempts.mock.calls[0][1].every(
      (a: { questionType: string }) => a.questionType === "exam_level",
    )).toBe(true);
    // 基礎確認は未実施（null）ではなく満たした扱い: stage が不利にならない。
    expect(mocks.submitCheckPack).toHaveBeenCalledWith("user-1", expect.objectContaining({
      quizRate: 100,
    }));
  });

  it("Case 2: 不正解だった1問だけを出題し、進捗表示も 1/1 で整合する", async () => {
    withConfirmationAnswers({ 1: true, 2: false, 3: true, 4: true });
    mocks.saveQuestionAttempts
      .mockResolvedValueOnce(savedExposures(["quiz-q2"]))
      .mockResolvedValueOnce(examSaved());

    renderRunner();

    await screen.findByText(/正解済みの3問は省いています/);
    expect(screen.getByText(/quiz の問題2/)).toBeTruthy();
    expect(screen.queryByText(/quiz の問題1/)).toBeNull();
    expect(screen.getByText(/問題 1 \/ 1/)).toBeTruthy();

    answerStep(["quiz-q2-正解"], "次へ（用語の確認）");
    await screen.findByText("関連用語の確認");

    const [, quizAttempts] = mocks.saveQuestionAttempts.mock.calls[0];
    expect(quizAttempts.map((a: { questionId: string }) => a.questionId)).toEqual(["quiz-q2"]);

    answerFlashcardStep();
    await screen.findByText("過去問レベル問題");
    answerExamStep();
    await waitFor(() => expect(mocks.submitCheckPack).toHaveBeenCalledTimes(1));
    expect(mocks.submitCheckPack).toHaveBeenCalledWith("user-1", expect.objectContaining({
      quizRate: 100,
    }));
  });

  it("Case 3: 未回答の2問だけを出題し、率は省いた正解を含めて計算する", async () => {
    withConfirmationAnswers({ 1: true, 3: true });
    mocks.saveQuestionAttempts
      .mockResolvedValueOnce(savedExposures(["quiz-q2", "quiz-q4"]))
      .mockResolvedValueOnce(examSaved());

    renderRunner();

    await screen.findByText(/正解済みの2問は省いています/);
    // q2 は正解、q4 は誤答 → (2 + 1) / 4 = 75%
    fireEvent.click(screen.getByText("quiz-q2-正解").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    fireEvent.click(screen.getByText("quiz-q4-誤答B").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: "次へ（用語の確認）" }));
    await screen.findByText("関連用語の確認");

    const [, quizAttempts] = mocks.saveQuestionAttempts.mock.calls[0];
    expect(quizAttempts.map((a: { questionId: string }) => a.questionId)).toEqual([
      "quiz-q2",
      "quiz-q4",
    ]);

    answerFlashcardStep();
    await screen.findByText("過去問レベル問題");
    answerExamStep();
    await screen.findByText("確認パックの結果");
    await waitFor(() => expect(mocks.submitCheckPack).toHaveBeenCalledTimes(1));
    expect(mocks.submitCheckPack).toHaveBeenCalledWith("user-1", expect.objectContaining({
      quizRate: 75,
    }));
  });

  it("Case 4: 復習期限が来ているトピックは正解済みでも全問出題する", async () => {
    withConfirmationAnswers({ 1: true, 2: true, 3: true, 4: true });
    const state = mocks.loadAppState();
    mocks.loadAppState.mockReturnValue({
      ...state,
      progress: {
        reviewQueue: [{
          topicId: "tech-binary-data",
          dueAt: new Date(Date.now() - 3_600_000).toISOString(),
          reason: "復習期限",
        }],
      },
    });
    mocks.saveQuestionAttempts.mockResolvedValue(quizSaved());

    renderRunner();
    answerQuizStep();

    await screen.findByText("関連用語の確認");
    expect(mocks.saveQuestionAttempts.mock.calls[0][1]).toHaveLength(QUIZ_COUNT);
    expect(screen.queryByText(/確認問題ですべて理解できています/)).toBeNull();
  });
});
