// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState, UserAnswer } from "@/types";
import { INITIAL_CHECKPOINT_PROGRESS } from "@/types/checkpoint";
import { getAllTopics } from "@/lib/content";
import GrowthCheckPage from "@/app/growth-check/page";

// GF-P0-003（再設計）。可視化が主で、出題は材料不足時の任意フォールバック。
//   - 材料が十分なら出題しない
//   - 出題しても学習進行は動かさず、記録は既存経路のみ
//   - 表示できたCPだけを「表示済み」にする

const DAY_MS = 86_400_000;
const TOPICS = getAllTopics().filter((topic) => topic.checkQuestions.length > 0);
const TOPIC = TOPICS[0];
const QUESTION = TOPIC.checkQuestions[0];

const saveQuestionAttemptsForCurrentSession = vi.hoisted(() => vi.fn());
const completeStudySession = vi.hoisted(() => vi.fn());
const saveProgressToDb = vi.hoisted(() => vi.fn());
const emitCelebration = vi.hoisted(() => vi.fn());
const saveAppState = vi.hoisted(() => vi.fn());
const setAppState = vi.hoisted(() => vi.fn());
const appState = vi.hoisted(() => ({
  current: null as AppState | null,
  /** true の間は useAppState と同じく undefined（＝読み込み中）を返す。 */
  loading: false,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/growth-check",
}));

vi.mock("@/lib/useAppState", () => ({
  useAppState: () => [appState.loading ? undefined : appState.current, setAppState],
}));

vi.mock("@/lib/storage", () => ({ saveAppState }));

vi.mock("@/lib/userSession", () => ({
  saveQuestionAttemptsForCurrentSession,
  saveProgressToDb,
  getUserId: () => "user-1",
  todayLocalDate: () => "2026-08-30",
}));

// 学習進行を動かす経路。呼ばれないことを確認するために用意する。
vi.mock("@/lib/studySession", () => ({ completeStudySession }));
vi.mock("@/lib/celebration", () => ({
  emitCelebration,
  badgeEarnedCelebrations: () => [],
}));

function answer(
  questionId: string,
  isCorrect: boolean,
  daysBefore: number,
  topicId = TOPIC.id,
): UserAnswer {
  return {
    questionId,
    topicId,
    tag: "tag",
    selectedChoice: isCorrect ? "A" : "B",
    isCorrect,
    answeredAt: new Date(Date.now() - daysBefore * DAY_MS).toISOString(),
  };
}

function stateWith(answers: UserAnswer[], overrides: Partial<AppState["progress"]> = {}): AppState {
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
      ...overrides,
    },
    answers,
  };
}

/** 「以前まちがえた → いま正解」と正答率改善の両方が立つ、材料の十分な履歴。 */
function richHistory(): UserAnswer[] {
  return [
    answer("q1", false, 60),
    answer("q2", false, 59),
    answer("q3", false, 58),
    answer("q1", true, 5),
    answer("q2", true, 4),
    answer("q3", true, 3),
  ];
}

/** 材料が乏しく、フォールバックのミニチャレンジに落ちる履歴。 */
function thinHistory(): UserAnswer[] {
  return [answer(QUESTION.id, false, 20)];
}

beforeEach(() => {
  vi.clearAllMocks();
  saveQuestionAttemptsForCurrentSession.mockResolvedValue({
    authState: "authenticated",
    userId: "user-1",
    exposures: {},
  });
  appState.current = stateWith(richHistory());
  appState.loading = false;
});

afterEach(cleanup);

// 回帰: useAppState は必ず undefined から始まり、値は effect で後から入る。
// 表示内容を useState の初期化関数で組み立てると、その initializer が走る初回レンダー
// では state が無く、null が二度と再計算されない初期値として固定されて永久 Loading に
// なる。「最初から AppState を返すモック」だけではこの経路を踏めないため、
// 読み込み中→ロード完了の2フェーズをここで再現する。
describe("state arrives after the first render", () => {
  it("shows the growth summary once the app state has loaded", () => {
    appState.loading = true;
    const { rerender } = render(<GrowthCheckPage />);
    expect(screen.getByText("読み込み中…")).toBeInTheDocument();

    appState.loading = false;
    rerender(<GrowthCheckPage />);

    expect(screen.queryByText("読み込み中…")).toBeNull();
    expect(screen.getByText("学習記録からの変化")).toBeInTheDocument();
  });

  it("falls back to the optional challenge when the evidence is thin", () => {
    appState.current = stateWith(thinHistory());
    appState.loading = true;
    const { rerender } = render(<GrowthCheckPage />);
    expect(screen.getByText("読み込み中…")).toBeInTheDocument();

    appState.loading = false;
    rerender(<GrowthCheckPage />);

    expect(screen.queryByText("読み込み中…")).toBeNull();
    expect(screen.getByText("もう少し確かめる")).toBeInTheDocument();
  });

  // 「読み込み中」と「比較材料なし」を別状態として扱う。
  it("distinguishes an empty record from still loading", () => {
    appState.current = stateWith([]);
    appState.loading = true;
    const { rerender } = render(<GrowthCheckPage />);
    expect(screen.getByText("読み込み中…")).toBeInTheDocument();
    expect(screen.queryByText("まだ比べられる記録がありません")).toBeNull();

    appState.loading = false;
    rerender(<GrowthCheckPage />);

    expect(screen.queryByText("読み込み中…")).toBeNull();
    expect(screen.getByText("まだ比べられる記録がありません")).toBeInTheDocument();
  });

  // 閲覧中に出題が差し替わらない（確定は最初の1回だけ）。
  it("keeps the same challenge across later state updates", () => {
    appState.current = stateWith(thinHistory());
    appState.loading = true;
    const { rerender } = render(<GrowthCheckPage />);
    appState.loading = false;
    rerender(<GrowthCheckPage />);
    const first = screen.getByText(/問を解いてみる/).textContent;

    // 別のレッスンを完了した等で state が入れ替わっても、表示中の内容は変えない。
    appState.current = stateWith(richHistory());
    rerender(<GrowthCheckPage />);

    expect(screen.getByText(/問を解いてみる/).textContent).toBe(first);
  });
});

describe("visualization comes first", () => {
  it("shows the growth summary without asking any question", () => {
    render(<GrowthCheckPage />);

    expect(screen.getByText("学習記録からの変化")).toBeInTheDocument();
    expect(screen.queryByText("もう少し確かめる")).toBeNull();
    expect(screen.queryByText(/問を解いてみる/)).toBeNull();
  });

  it("reports the recovered questions from existing history", () => {
    render(<GrowthCheckPage />);

    expect(screen.getByText("以前まちがえた問題に、いまは正解できます")).toBeInTheDocument();
  });

  it("says nothing when there is no comparable record", () => {
    appState.current = stateWith([]);
    render(<GrowthCheckPage />);

    expect(screen.getByText("まだ比べられる記録がありません")).toBeInTheDocument();
  });
});

describe("optional fallback challenge", () => {
  beforeEach(() => {
    appState.current = stateWith(thinHistory());
  });

  it("offers the challenge only when the evidence is thin", () => {
    render(<GrowthCheckPage />);

    expect(screen.getByText("もう少し確かめる")).toBeInTheDocument();
    expect(screen.getByText(/任意なので、スキップしても構いません/)).toBeInTheDocument();
  });

  it("gives skipping the same weight as starting", () => {
    render(<GrowthCheckPage />);

    expect(screen.getByText("スキップして今日の学習へ")).toHaveAttribute("href", "/today");
  });

  it("does not start the quiz until it is chosen", () => {
    render(<GrowthCheckPage />);

    expect(screen.queryByText("結果をみる")).toBeNull();
  });

  it("keeps review-owned topics out of the challenge", () => {
    appState.current = stateWith(thinHistory(), {
      reviewQueue: [
        { topicId: TOPIC.id, dueAt: new Date(Date.now() - DAY_MS).toISOString(), reason: "復習" },
      ],
    });
    render(<GrowthCheckPage />);

    // 復習が担当中なので出題対象が無くなる。
    expect(screen.queryByText("もう少し確かめる")).toBeNull();
  });
});

describe("challenge side effects", () => {
  async function runChallenge() {
    appState.current = stateWith(thinHistory());
    render(<GrowthCheckPage />);
    fireEvent.click(screen.getByText(/問を解いてみる/).closest("button")!);
    const correctText = QUESTION.choices.find((c) => c.key === QUESTION.correctChoice)!.text;
    fireEvent.click(screen.getByText(correctText).closest("button")!);
    fireEvent.click(screen.getByText("結果をみる").closest("button")!);
    await waitFor(() => screen.getByText("前回とのくらべ"));
  }

  it("records the attempt through the shared save path", async () => {
    await runChallenge();

    expect(saveQuestionAttemptsForCurrentSession).toHaveBeenCalledTimes(1);
    const [attempts] = saveQuestionAttemptsForCurrentSession.mock.calls[0];
    expect(attempts[0]).toMatchObject({ questionId: QUESTION.id, topicId: TOPIC.id });
  });

  it("never claims a first exposure of its own", async () => {
    await runChallenge();

    const [attempts] = saveQuestionAttemptsForCurrentSession.mock.calls[0];
    for (const attempt of attempts) {
      expect(attempt).not.toHaveProperty("isFirstAttempt");
      expect(attempt).not.toHaveProperty("exposure");
    }
  });

  it("does not run the study session orchestrator or fire celebrations", async () => {
    await runChallenge();

    expect(completeStudySession).not.toHaveBeenCalled();
    expect(emitCelebration).not.toHaveBeenCalled();
  });

  it("still shows the comparison when recording fails", async () => {
    saveQuestionAttemptsForCurrentSession.mockRejectedValue(new Error("offline"));

    await runChallenge();

    expect(screen.getByText("前回とのくらべ")).toBeInTheDocument();
  });

  it("shows no XP framing anywhere", () => {
    appState.current = stateWith(thinHistory());
    const { container } = render(<GrowthCheckPage />);

    expect(container.textContent).not.toMatch(/XP/);
  });
});

describe("once per checkpoint", () => {
  it("records the checkpoint as shown when something was displayed", async () => {
    render(<GrowthCheckPage />);

    await waitFor(() => expect(saveAppState).toHaveBeenCalled());
    const saved = saveAppState.mock.calls[0][0] as AppState;
    expect(saved.progress.checkpointProgress?.gameful?.growthCheck?.shownCheckpointIds).toEqual([
      "cp1",
    ]);
  });

  it("does not record anything when there was nothing to show", async () => {
    appState.current = stateWith([]);
    render(<GrowthCheckPage />);

    await waitFor(() => screen.getByText("まだ比べられる記録がありません"));
    expect(saveAppState).not.toHaveBeenCalled();
  });

  it("does not record twice for the same checkpoint", async () => {
    appState.current = stateWith(richHistory(), {
      checkpointProgress: {
        ...INITIAL_CHECKPOINT_PROGRESS,
        currentCheckpointId: "cp1",
        gameful: { growthCheck: { shownCheckpointIds: ["cp1"] } },
      },
    });
    render(<GrowthCheckPage />);

    await waitFor(() => screen.getByText("学習記録からの変化"));
    expect(saveAppState).not.toHaveBeenCalled();
  });
});
