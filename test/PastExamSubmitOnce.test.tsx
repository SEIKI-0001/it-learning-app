// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import PastExamRunner from "@/components/pastExam/PastExamRunner";
import type { PastExamQuestionView } from "@/lib/pastExam/questionView";

// ============================================================================
// 本番モードの採点が1セッションにつき1回だけ走ること。
// ----------------------------------------------------------------------------
// 採点が複数回通ると saveAllAttempts() が100問ぶんの保存をそのたびに送るため、
// 同じ回答が二重に記録される。二重に走りうる経路をそれぞれ塞げているかを見る。
// ============================================================================

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
  window.localStorage.clear();
  window.localStorage.setItem("fequest:userId", "user-1");
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === "/api/session/state") {
      return new Response(JSON.stringify({ ok: true, userId: "user-1" }), { status: 200 });
    }
    if (url === "/api/question-attempts/save") {
      const attempts = JSON.parse(String(init?.body)).attempts as Array<{ questionId: string }>;
      return new Response(JSON.stringify({
        ok: true,
        userId: "user-1",
        exposures: attempts.map((attempt) => ({
          questionId: attempt.questionId,
          state: "first",
          attemptedBefore: false,
          firstAttemptAt: "2026-08-15T00:00:00.000Z",
          attemptCount: 1,
        })),
      }), { status: 200 });
    }
    if (url === "/api/assessment-sessions") {
      const body = JSON.parse(String(init?.body)) as { action: string; sessionId: string };
      return new Response(JSON.stringify({
        ok: true,
        session: {
          sessionId: body.sessionId,
          status: body.action === "start" ? "in_progress" : "completed",
        },
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }));
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** 保存APIの呼び出し回数（＝ saveAllAttempts が走った回数）。 */
function saveCallCount(): number {
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  return fetchMock.mock.calls.filter(([url]) => url === "/api/question-attempts/save")
    .length;
}

/** 保存APIへ送られた attempt を、呼び出し順に平坦化して取り出す。 */
function savedAttempts(): Array<Record<string, unknown>> {
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  return fetchMock.mock.calls
    .filter(([url]) => url === "/api/question-attempts/save")
    .flatMap(([, init]) => JSON.parse((init as RequestInit).body as string).attempts);
}

function makeQuestions(): PastExamQuestionView[] {
  return [1, 2].map((n) => ({
    id: `q${n}`,
    questionNumber: n,
    prompt: `問${n}の問題文`,
    choices: [
      { key: "A" as const, text: `${n}のアの本文` },
      { key: "B" as const, text: `${n}のイの本文` },
      { key: "C" as const, text: `${n}のウの本文` },
      { key: "D" as const, text: `${n}のエの本文` },
    ],
    correctChoice: "A" as const,
    explanation: `問${n}の独自解説`,
    examField: "strategy" as const,
    topicId: "strat-intellectual-property",
    topicTitle: "知的財産権",
    figures: [],
    attribution: `出典：令和8年度 ITパスポート試験 公開問題 問${n}`,
    sourceUrl: "https://example.invalid/qs.pdf",
    answerSourceUrl: "https://example.invalid/ans.pdf",
    version: 2,
    origin: "official_past",
    year: 2026,
  }));
}

function renderRunner() {
  return render(
    <PastExamRunner year={2026} yearLabel="令和8年度" questions={makeQuestions()} />,
  );
}

async function startExamMode() {
  const card = screen.getByRole("heading", { name: "本番モード" }).closest("section")!;
  fireEvent.click(within(card).getByRole("button", { name: "始める" }));
  await screen.findByText("問1の問題文");
}

function gradeButton(): HTMLElement {
  return screen.getByRole("button", { name: /採点する|採点中/ });
}

describe("本番モードの採点は1回だけ走る", () => {
  it("採点ボタンを連打しても保存は1回だけ", async () => {
    renderRunner();
    await startExamMode();

    const button = gradeButton();

    // 連打の要点は「再描画が挟まらないうちに2回目が走る」こと。
    // fireEvent は1回ごとに再描画まで進めてしまうので、
    // 同じ act の中で続けて dispatch し、state 更新が反映される前に2回目を通す。
    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => expect(saveCallCount()).toBe(1));
  });

  it("採点すると結果画面へ進み、問題数ぶんの回答だけが送られる", async () => {
    renderRunner();
    await startExamMode();
    fireEvent.click(gradeButton());

    // 2問ぶん。未回答も「未回答だった」という事実として送る。
    await waitFor(() => expect(savedAttempts()).toHaveLength(2));
    expect(savedAttempts().map((a) => a.questionId)).toEqual(["q1", "q2"]);
    expect(await screen.findByRole("button", { name: /もう一度|戻る|選び直す/ })).toBeInTheDocument();
  });

  it("時間切れの自動採点と手動採点が競合しても保存は1回だけ", async () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    try {
      renderRunner();
      const card = screen.getByRole("heading", { name: "本番モード" }).closest("section")!;
      fireEvent.click(within(card).getByRole("button", { name: "始める" }));
      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.getByText("問1の問題文")).toBeInTheDocument();

      // 制限時間を使い切らせる（タイマーは残り0秒のあいだ毎秒発火しうる）。
      await act(async () => vi.advanceTimersByTimeAsync(121 * 60 * 1000));

      expect(saveCallCount()).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("採点処理が走り出したら採点ボタンを無効化する", async () => {
    renderRunner();
    await startExamMode();
    fireEvent.click(gradeButton());

    // 結果画面へ遷移しているので、採点ボタン自体が画面から消えている。
    expect(screen.queryByRole("button", { name: /採点する/ })).not.toBeInTheDocument();
  });

  it("やり直すと次のセッションでは再び採点できる", async () => {
    renderRunner();
    await startExamMode();
    fireEvent.click(gradeButton());
    await waitFor(() => expect(saveCallCount()).toBe(1));

    // 結果画面から戻って、もう一度本番モードを始める。
    fireEvent.click(await screen.findByRole("button", { name: /もう一度|戻る|選び直す/ }));
    const card = screen.getByRole("heading", { name: "本番モード" }).closest("section")!;
    fireEvent.click(
      within(card).getByRole("button", { name: /始める|最初からやり直す/ }),
    );
    await screen.findByText("問1の問題文");
    fireEvent.click(gradeButton());

    // 別セッションなので、こちらは新たに1回保存される。
    await waitFor(() => expect(saveCallCount()).toBe(2));
  });
});

describe("練習モードの保存は従来どおり", () => {
  it("1問ごとに保存し、同じ問題を二度送らない", async () => {
    renderRunner();
    const card = screen.getByRole("heading", { name: "練習モード" }).closest("section")!;
    fireEvent.click(within(card).getByRole("button", { name: "始める" }));
    await screen.findByText("問1の問題文");

    fireEvent.click(screen.getByText("1のアの本文").closest("button")!);
    // 回答は最初の1回で確定するので、押し直しても送られない。
    fireEvent.click(screen.getByText("1のイの本文").closest("button")!);

    await waitFor(() => expect(saveCallCount()).toBe(1));
    expect(savedAttempts()).toHaveLength(1);
  });
});
