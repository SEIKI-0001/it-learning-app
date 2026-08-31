// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import PastExamRunner from "@/components/pastExam/PastExamRunner";
import type { PastExamQuestionView } from "@/lib/pastExam/questionView";
import { initializeAppState, loadAppState, saveAppState } from "@/lib/storage";

// ============================================================================
// 練習モード / 本番モードの表示ルールの検証。
//   - 選択肢をシャッフルしないこと
//   - 練習モードは回答後に正答と解説を出すこと
//   - 本番モードは採点まで正答も解説も出さないこと
//   - 図表・出典・「解説は本サービス独自」を表示すること
// ============================================================================

const storageValues = new Map<string, string>();
const assessmentFailures: Record<"start" | "complete" | "abandon", number> = {
  start: 0,
  complete: 0,
  abandon: 0,
};
const assessmentMalformed: Record<"start" | "complete" | "abandon", number> = {
  start: 0,
  complete: 0,
  abandon: 0,
};
let progressFailures = 0;
let attemptFailures = 0;
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
  assessmentFailures.start = 0;
  assessmentFailures.complete = 0;
  assessmentFailures.abandon = 0;
  assessmentMalformed.start = 0;
  assessmentMalformed.complete = 0;
  assessmentMalformed.abandon = 0;
  progressFailures = 0;
  attemptFailures = 0;
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    const userId = window.localStorage.getItem("fequest:userId");
    if (url === "/api/session/state") {
      return userId
        ? new Response(JSON.stringify({ ok: true, userId }), { status: 200 })
        : new Response(JSON.stringify({ ok: false }), { status: 401 });
    }
    if (url === "/api/question-attempts/save") {
      if (!userId) return new Response(JSON.stringify({ ok: false }), { status: 401 });
      if (attemptFailures > 0) {
        attemptFailures -= 1;
        return new Response(JSON.stringify({ error: "response_lost" }), { status: 503 });
      }
      const attempts = JSON.parse(String(init?.body)).attempts as Array<{ questionId: string }>;
      return new Response(JSON.stringify({
        ok: true,
        userId,
        saved: attempts.length,
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
      const body = JSON.parse(String(init?.body)) as {
        action: "start" | "complete" | "abandon";
        sessionId: string;
      };
      if (assessmentFailures[body.action] > 0) {
        assessmentFailures[body.action] -= 1;
        return new Response(JSON.stringify({ error: "persistence_failed" }), { status: 503 });
      }
      if (assessmentMalformed[body.action] > 0) {
        assessmentMalformed[body.action] -= 1;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return assessmentResponse(body.action, body.sessionId);
    }
    if (url === "/api/progress/save" && progressFailures > 0) {
      progressFailures -= 1;
      return new Response(JSON.stringify({ error: "response_lost" }), { status: 503 });
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

/** 保存APIへ送られた attempt を、呼び出し順に平坦化して取り出す。 */
function savedAttempts(): Array<Record<string, unknown>> {
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  return fetchMock.mock.calls
    .filter(([url]) => url === "/api/question-attempts/save")
    .flatMap(([, init]) => JSON.parse((init as RequestInit).body as string).attempts);
}

function assessmentActions(): Array<Record<string, unknown>> {
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  return fetchMock.mock.calls
    .filter(([url]) => url === "/api/assessment-sessions")
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));
}

function progressSaves(): Array<Record<string, unknown>> {
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  return fetchMock.mock.calls
    .filter(([url]) => url === "/api/progress/save")
    .map(([, init]) => JSON.parse((init as RequestInit).body as string));
}

function assessmentResponse(action: string, sessionId: string): Response {
  return new Response(JSON.stringify({
    ok: true,
    session: {
      sessionId,
      status: action === "start"
        ? "in_progress"
        : action === "complete"
          ? "completed"
          : "abandoned",
    },
  }), { status: 200 });
}

const EXPLANATION_1 = "これは問1の独自解説です。正答の理由をここで説明します。";
const EXPLANATION_2 = "これは問2の独自解説です。誤答の理由もここで説明します。";

function makeQuestions(): PastExamQuestionView[] {
  return [
    {
      id: "q1",
      questionNumber: 1,
      prompt: "問1の問題文",
      // わざと正答を D にしておく。表示順が A→D のまま変わらないことを確かめるため。
      choices: [
        { key: "A", text: "選択肢アの本文" },
        { key: "B", text: "選択肢イの本文" },
        { key: "C", text: "選択肢ウの本文" },
        { key: "D", text: "選択肢エの本文" },
      ],
      correctChoice: "D",
      explanation: EXPLANATION_1,
      examField: "strategy",
      topicId: "strat-intellectual-property",
      topicTitle: "知的財産権",
      figures: [
        {
          id: "q1-figure-1",
          kind: "image",
          src: "/question-bank/official/ipa/it-passport/2026/q003-figure-1.png",
          alt: "問1の図表の説明",
          width: 648,
          height: 170,
        },
      ],
      attribution: "出典：令和8年度 ITパスポート試験 公開問題 問1",
      sourceUrl: "https://example.invalid/qs.pdf",
      answerSourceUrl: "https://example.invalid/ans.pdf",
      version: 2,
      origin: "official_past",
      year: 2026,
    },
    {
      id: "q2",
      questionNumber: 2,
      prompt: "問2の問題文",
      choices: [
        { key: "A", text: "2のアの本文" },
        { key: "B", text: "2のイの本文" },
        { key: "C", text: "2のウの本文" },
        { key: "D", text: "2のエの本文" },
      ],
      correctChoice: "A",
      explanation: EXPLANATION_2,
      examField: "technology",
      topicId: "tech-ai-ml",
      topicTitle: "AIと機械学習",
      figures: [],
      attribution: "出典：令和8年度 ITパスポート試験 公開問題 問2",
      sourceUrl: "https://example.invalid/qs.pdf",
      answerSourceUrl: "https://example.invalid/ans.pdf",
      version: 2,
      origin: "official_past",
      year: 2026,
    },
  ];
}

function renderRunner() {
  return render(
    <PastExamRunner year={2026} yearLabel="令和8年度" questions={makeQuestions()} />,
  );
}

async function startMode(mode: "練習モード" | "本番モード") {
  const card = screen.getByRole("heading", { name: mode }).closest("section")!;
  fireEvent.click(within(card).getByRole("button", { name: "始める" }));
  await screen.findByText("問1の問題文");
}

describe("モード選択", () => {
  it("練習モードと本番モードを選べる", () => {
    renderRunner();
    expect(screen.getByRole("heading", { name: "練習モード" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "本番モード" })).toBeInTheDocument();
  });

  it("本番モードの制限時間が案内されている", () => {
    renderRunner();
    expect(screen.getByText(/120分/)).toBeInTheDocument();
  });

  it("共通セッションの開始保存が終わるまで問題を表示しない", async () => {
    let resolveStart!: (response: Response) => void;
    const pendingStart = new Promise<Response>((resolve) => {
      resolveStart = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url === "/api/session/state") {
        return Promise.resolve(new Response(JSON.stringify({ ok: false }), { status: 401 }));
      }
      if (url === "/api/assessment-sessions") return pendingStart;
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    }));
    renderRunner();

    const card = screen.getByRole("heading", { name: "本番モード" }).closest("section")!;
    fireEvent.click(within(card).getByRole("button", { name: "始める" }));

    expect(screen.queryByText("問1の問題文")).not.toBeInTheDocument();
    await waitFor(() => expect(assessmentActions()).toHaveLength(1));
    expect(assessmentActions()[0]).toMatchObject({
      action: "start",
      source: "official_past",
      mode: "exam",
      questionCount: 2,
    });
    resolveStart(assessmentResponse("start", String(assessmentActions()[0].sessionId)));
    expect(await screen.findByText("問1の問題文")).toBeInTheDocument();
  });

  it("開始保存に失敗したときは問題を表示せず同じ操作を再試行できる", async () => {
    assessmentFailures.start = 1;
    renderRunner();
    const card = screen.getByRole("heading", { name: "本番モード" }).closest("section")!;

    fireEvent.click(within(card).getByRole("button", { name: "始める" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("開始");
    expect(screen.queryByText("問1の問題文")).not.toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "始める" }));
    expect(await screen.findByText("問1の問題文")).toBeInTheDocument();
    const starts = assessmentActions().filter((action) => action.action === "start");
    expect(starts).toHaveLength(2);
    expect(starts[1]).toMatchObject({
      sessionId: starts[0].sessionId,
      startedAt: starts[0].startedAt,
    });
  });
});

describe("共通評価セッション", () => {
  it("本番モードは回答保存、セッション完了、P0進捗の順で確定する", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    initializeAppState({
      itExperience: "none",
      dailyMinutes: "15",
      examPlan: "undecided",
      confidence: 1,
    });
    renderRunner();
    await startMode("本番モード");
    fireEvent.click(screen.getByText("選択肢エの本文"));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    await screen.findByText("50%");
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    const urls = fetchMock.mock.calls.map(([url]) => url);
    const attemptIndex = urls.lastIndexOf("/api/question-attempts/save");
    const completionIndex = fetchMock.mock.calls.findIndex(([url, init]) =>
      url === "/api/assessment-sessions"
      && JSON.parse((init as RequestInit).body as string).action === "complete"
    );
    const progressIndex = urls.lastIndexOf("/api/progress/save");

    expect(attemptIndex).toBeGreaterThan(-1);
    expect(completionIndex).toBeGreaterThan(attemptIndex);
    expect(progressIndex).toBeGreaterThan(completionIndex);
    expect(assessmentActions().find((action) => action.action === "complete"))
      .toMatchObject({
        sessionId: expect.any(String),
        answers: [{
          canonicalQuestionId: "q1",
          topicId: "strat-intellectual-property",
          isCorrect: true,
        }],
      });
    const completion = assessmentActions().find((action) => action.action === "complete");
    expect(progressSaves()).toEqual([
      expect.objectContaining({
        readinessTrigger: {
          triggerType: "assessment",
          triggerId: completion?.sessionId,
        },
      }),
    ]);
  });

  it("明示的な最初からやり直しだけが旧セッションを abandon する", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    renderRunner();
    await startMode("練習モード");
    await waitFor(() => expect(
      [...storageValues.keys()].some((key) => key.startsWith("fequest:pastExam")),
    ).toBe(true));
    cleanup();
    renderRunner();
    const card = screen.getByRole("heading", { name: "練習モード" }).closest("section")!;
    fireEvent.click(await within(card).findByRole("button", { name: "最初からやり直す" }));

    await waitFor(() => expect(
      assessmentActions().some((action) => action.action === "abandon"),
    ).toBe(true));
    const actions = assessmentActions().filter((action) =>
      action.action === "abandon" || action.action === "start"
    );
    expect(actions.slice(-2).map((action) => action.action)).toEqual(["abandon", "start"]);
  });

  it("abandon に失敗したときは再開データを消さず新しいセッションを開始しない", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    renderRunner();
    await startMode("練習モード");
    await waitFor(() => expect(
      [...storageValues.keys()].some((key) => key.startsWith("fequest:pastExam")),
    ).toBe(true));
    cleanup();
    assessmentFailures.abandon = 1;
    renderRunner();
    const card = screen.getByRole("heading", { name: "練習モード" }).closest("section")!;

    fireEvent.click(await within(card).findByRole("button", { name: "最初からやり直す" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("終了");
    expect([...storageValues.keys()].some((key) => key.startsWith("fequest:pastExam"))).toBe(true);
    const actions = assessmentActions();
    const abandonIndex = actions.findIndex((action) => action.action === "abandon");
    expect(abandonIndex).toBeGreaterThan(-1);
    expect(actions.slice(abandonIndex + 1).some((action) => action.action === "start")).toBe(false);
    expect(within(card).getByRole("button", { name: "最初からやり直す" })).toBeEnabled();

    fireEvent.click(within(card).getByRole("button", { name: "最初からやり直す" }));
    expect(await screen.findByText("問1の問題文")).toBeInTheDocument();
    const abandons = assessmentActions().filter((action) => action.action === "abandon");
    expect(abandons).toHaveLength(2);
    expect(abandons[1]).toMatchObject({
      sessionId: abandons[0].sessionId,
      completedAt: abandons[0].completedAt,
    });
  });

  it("abandon の応答喪失後にリロードしても同じ終了操作を再送してから新規開始する", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    renderRunner();
    await startMode("練習モード");
    cleanup();

    assessmentMalformed.abandon = 1;
    renderRunner();
    const firstCard = screen.getByRole("heading", { name: "練習モード" }).closest("section")!;
    fireEvent.click(await within(firstCard).findByRole("button", { name: "最初からやり直す" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("終了");
    const persistedAfterLostResponse = [...storageValues.entries()]
      .find(([key]) => key.startsWith("fequest:pastExam") && key.endsWith(":practice"));
    expect(JSON.parse(persistedAfterLostResponse![1]).pendingMutation).toMatchObject({
      action: "abandon",
      completedAt: expect.any(String),
    });

    cleanup();
    renderRunner();
    const reloadedCard = screen.getByRole("heading", { name: "練習モード" }).closest("section")!;
    fireEvent.click(await within(reloadedCard).findByRole("button", { name: "最初からやり直す" }));
    expect(await screen.findByText("問1の問題文")).toBeInTheDocument();

    const lifecycle = assessmentActions().filter((action) =>
      action.action === "abandon" || action.action === "start"
    );
    const abandons = lifecycle.filter((action) => action.action === "abandon");
    expect(abandons).toHaveLength(2);
    expect(abandons[1]).toEqual(abandons[0]);
    expect(lifecycle.slice(-3).map((action) => action.action)).toEqual([
      "abandon",
      "abandon",
      "start",
    ]);
  });
});

describe("選択肢の並び", () => {
  it("シャッフルせず、公式どおり ア→イ→ウ→エ の順に出す", async () => {
    renderRunner();
    await startMode("練習モード");

    // 正答は D（エ）だが、並びは公式どおり ア→イ→ウ→エ のまま動かないこと。
    const texts = screen
      .getAllByRole("button")
      .map((b) => b.textContent ?? "")
      .filter((t) => /選択肢[アイウエ]の本文/.test(t))
      .map((t) => t.match(/選択肢[アイウエ]の本文/)![0]);

    expect(texts).toEqual([
      "選択肢アの本文",
      "選択肢イの本文",
      "選択肢ウの本文",
      "選択肢エの本文",
    ]);
  });

  it("内部キーA〜Dを画面上は ア〜エ として表示する", async () => {
    renderRunner();
    await startMode("練習モード");
    for (const label of ["ア", "イ", "ウ", "エ"]) {
      expect(screen.getByText(`選択肢${label}`, { selector: ".sr-only" })).toBeInTheDocument();
    }
  });
});

describe("練習モード", () => {
  it("回答するまでは解説を出さない", async () => {
    renderRunner();
    await startMode("練習モード");
    expect(screen.queryByText(EXPLANATION_1)).not.toBeInTheDocument();
  });

  it("回答すると正誤と独自解説をその場で出す", async () => {
    renderRunner();
    await startMode("練習モード");

    fireEvent.click(screen.getByText("選択肢アの本文"));

    expect(screen.getByText(EXPLANATION_1)).toBeInTheDocument();
    expect(screen.getByText("解説（本サービス独自）")).toBeInTheDocument();
    // 正答は D なので不正解、かつ正答記号エが示される。
    expect(screen.getByText(/不正解.*正答: エ/)).toBeInTheDocument();
  });

  it("正解したときは正解と表示する", async () => {
    renderRunner();
    await startMode("練習モード");
    fireEvent.click(screen.getByText("選択肢エの本文"));
    expect(screen.getByText("正解")).toBeInTheDocument();
  });

  it("前後の問題へ移動できる", async () => {
    renderRunner();
    await startMode("練習モード");

    expect(screen.getByText("問1の問題文")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "次の問題" }));
    expect(screen.getByText("問2の問題文")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "前の問題" }));
    expect(screen.getByText("問1の問題文")).toBeInTheDocument();
  });

  it("残り時間を表示しない", async () => {
    renderRunner();
    await startMode("練習モード");
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("一度回答したら別の選択肢へ変更できない", async () => {
    renderRunner();
    await startMode("練習モード");

    // 問1の正答は D。まず誤答の A を選ぶ。
    fireEvent.click(screen.getByText("選択肢アの本文"));
    expect(screen.getByText(/不正解.*正答: エ/)).toBeInTheDocument();

    // 正答が見えた後に正答の D をクリックしても、回答は A のまま動かない。
    fireEvent.click(screen.getByText("選択肢エの本文"));

    expect(screen.getByText(/不正解.*正答: エ/)).toBeInTheDocument();
    expect(screen.queryByText("正解")).not.toBeInTheDocument();

    await waitFor(() => expect(
      [...storageValues.keys()].some((key) => key.startsWith("fequest:pastExam")),
    ).toBe(true));
    const saved = [...storageValues.entries()].find(([key]) => key.startsWith("fequest:pastExam"));
    expect(JSON.parse(saved![1]).answers[1].selected).toBe("A");
  });

  it("回答後は全選択肢が disabled になる", async () => {
    renderRunner();
    await startMode("練習モード");

    for (const text of ["選択肢アの本文", "選択肢イの本文", "選択肢ウの本文", "選択肢エの本文"]) {
      expect(screen.getByText(text).closest("button")).not.toBeDisabled();
    }

    fireEvent.click(screen.getByText("選択肢アの本文"));

    for (const text of ["選択肢アの本文", "選択肢イの本文", "選択肢ウの本文", "選択肢エの本文"]) {
      expect(screen.getByText(text).closest("button")).toBeDisabled();
    }
  });

  it("問題を移動して戻ってきても回答は固定されたまま", async () => {
    renderRunner();
    await startMode("練習モード");

    fireEvent.click(screen.getByText("選択肢アの本文"));
    fireEvent.click(screen.getByRole("button", { name: "次の問題" }));
    expect(screen.getByText("問2の問題文")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "前の問題" }));

    // 戻っても解説が出たまま、選択肢は disabled のまま。
    expect(screen.getByText(EXPLANATION_1)).toBeInTheDocument();
    expect(screen.getByText("選択肢エの本文").closest("button")).toBeDisabled();

    // 戻った先で正答をクリックしても変わらない。
    fireEvent.click(screen.getByText("選択肢エの本文"));
    expect(screen.getByText(/不正解.*正答: エ/)).toBeInTheDocument();
  });

  it("同じ問題の保存リクエストは1回だけ送る", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    renderRunner();
    await startMode("練習モード");

    fireEvent.click(screen.getByText("選択肢アの本文"));
    // 変更しようとしても、移動して戻ってから押しても、追加で送らない。
    fireEvent.click(screen.getByText("選択肢エの本文"));
    fireEvent.click(screen.getByRole("button", { name: "次の問題" }));
    fireEvent.click(screen.getByRole("button", { name: "前の問題" }));
    fireEvent.click(screen.getByText("選択肢イの本文"));

    expect(savedAttempts()).toHaveLength(1);
    expect(savedAttempts()[0]).toMatchObject({ questionId: "q1", selectedAnswer: "A" });
  });

  it("別の問題に答えればその問題ぶんは保存される", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    renderRunner();
    await startMode("練習モード");

    fireEvent.click(screen.getByText("選択肢アの本文"));
    fireEvent.click(screen.getByRole("button", { name: "次の問題" }));
    await waitFor(() => expect(screen.getByText("2のアの本文").closest("button")).not.toBeDisabled());
    fireEvent.click(screen.getByText("2のアの本文"));

    expect(savedAttempts().map((a) => a.questionId)).toEqual(["q1", "q2"]);
  });

  it("回答保存が完了するまで別問題の回答と採点を開始できない", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    let resolveSave!: (response: Response) => void;
    const pendingSave = new Promise<Response>((resolve) => {
      resolveSave = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/session/state") {
        return Promise.resolve(new Response(JSON.stringify({
          ok: true,
          userId: "user-1",
        }), { status: 200 }));
      }
      if (url === "/api/question-attempts/save") return pendingSave;
      if (url === "/api/assessment-sessions") {
        const body = JSON.parse(String(init?.body)) as { action: string; sessionId: string };
        return Promise.resolve(assessmentResponse(body.action, body.sessionId));
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    }));
    renderRunner();
    await startMode("練習モード");

    fireEvent.click(screen.getByText("選択肢アの本文"));
    fireEvent.click(screen.getByRole("button", { name: "次の問題" }));

    expect(screen.getByText("2のアの本文").closest("button")).toBeDisabled();
    expect(screen.getByRole("button", { name: "回答保存中…" })).toBeDisabled();

    await act(async () => {
      resolveSave(new Response(JSON.stringify({
        ok: true,
        userId: "user-1",
        saved: 1,
        exposures: [{
          questionId: "q1",
          state: "first",
          attemptedBefore: false,
          firstAttemptAt: "2026-08-15T00:00:00.000Z",
          attemptCount: 1,
        }],
      }), { status: 200 }));
      await pendingSave;
    });

    await waitFor(() => expect(screen.getByText("2のアの本文").closest("button")).not.toBeDisabled());
    expect(screen.getByRole("button", { name: "採点する" })).not.toBeDisabled();
  });

  it("回答した内容は途中状態として保存される", async () => {
    renderRunner();
    await startMode("練習モード");
    fireEvent.click(screen.getByText("選択肢アの本文"));

    await waitFor(() => expect(
      [...storageValues.keys()].some((key) => key.startsWith("fequest:pastExam")),
    ).toBe(true));
    const saved = [...storageValues.entries()].find(([key]) => key.startsWith("fequest:pastExam"));
    expect(saved).toBeDefined();
    expect(JSON.parse(saved![1]).answers[1].selected).toBe("A");
  });
});

describe("本番モード", () => {
  it("残り時間を表示する", async () => {
    renderRunner();
    await startMode("本番モード");
    expect(screen.getByRole("timer")).toBeInTheDocument();
    expect(screen.getByText(/残り 2:00:00|残り 1:59:5\d/)).toBeInTheDocument();
  });

  it("回答しても正答・解説を出さない", async () => {
    renderRunner();
    await startMode("本番モード");

    fireEvent.click(screen.getByText("選択肢アの本文"));

    expect(screen.queryByText(EXPLANATION_1)).not.toBeInTheDocument();
    expect(screen.queryByText("解説（本サービス独自）")).not.toBeInTheDocument();
    expect(screen.queryByText(/正答:/)).not.toBeInTheDocument();
    expect(screen.queryByText("正解")).not.toBeInTheDocument();
  });

  it("採点前は回答を変更できる（練習モードのような確定はしない）", async () => {
    renderRunner();
    await startMode("本番モード");

    fireEvent.click(screen.getByText("選択肢アの本文"));
    // 練習モードと違い、選択肢は押せるままであること。
    expect(screen.getByText("選択肢エの本文").closest("button")).not.toBeDisabled();

    fireEvent.click(screen.getByText("選択肢エの本文"));

    await waitFor(() => expect(
      [...storageValues.keys()].some((key) => key.startsWith("fequest:pastExam")),
    ).toBe(true));
    const saved = [...storageValues.entries()].find(([key]) => key.startsWith("fequest:pastExam"));
    expect(JSON.parse(saved![1]).answers[1].selected).toBe("D");

    // 変更した後も、採点前は正答・解説を出さない。
    expect(screen.queryByText(EXPLANATION_1)).not.toBeInTheDocument();
    expect(screen.queryByText("正解")).not.toBeInTheDocument();
  });

  it("採点するまで保存APIへ送らない（1問ごとの送信は練習モードだけ）", async () => {
    renderRunner();
    await startMode("本番モード");

    fireEvent.click(screen.getByText("選択肢アの本文"));
    fireEvent.click(screen.getByText("選択肢エの本文"));

    expect(savedAttempts()).toHaveLength(0);
  });

  it("回答を変更して採点すると、変更後の回答で採点される", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    renderRunner();
    await startMode("本番モード");

    // 問1の正答は D。まず A（誤答）を選び、D（正答）へ変更する。
    fireEvent.click(screen.getByText("選択肢アの本文"));
    fireEvent.click(screen.getByText("選択肢エの本文"));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    expect(await screen.findByText("50%")).toBeInTheDocument();
    expect(savedAttempts()).toHaveLength(2);
    expect(savedAttempts()[0]).toMatchObject({ questionId: "q1", selectedAnswer: "D" });
  });

  it("採点すると正答と解説が見えるようになる", async () => {
    renderRunner();
    await startMode("本番モード");

    fireEvent.click(screen.getByText("選択肢アの本文"));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    expect(await screen.findByText(EXPLANATION_1)).toBeInTheDocument();
    expect(screen.getByText(EXPLANATION_2)).toBeInTheDocument();
  });

  it("未回答の問題へ移動できる（問題一覧から選ぶ）", async () => {
    renderRunner();
    await startMode("本番モード");
    fireEvent.click(screen.getByRole("button", { name: "問2（未回答）" }));
    expect(screen.getByText("問2の問題文")).toBeInTheDocument();
  });
});

describe("図表・出典の表示", () => {
  it("図表を alt つきで、問題文の後・選択肢の前に表示する", async () => {
    renderRunner();
    await startMode("練習モード");

    const figure = screen.getByAltText("問1の図表の説明");
    expect(figure).toBeInTheDocument();

    const prompt = screen.getByText("問1の問題文");
    const firstChoice = screen.getByText("選択肢アの本文");
    // DOM 上の並びが 問題文 → 図表 → 選択肢 になっていること。
    expect(prompt.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(figure.compareDocumentPosition(firstChoice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("出典と、解説が独自である旨を表示する", async () => {
    renderRunner();
    await startMode("練習モード");

    expect(
      screen.getByText("出典：令和8年度 ITパスポート試験 公開問題 問1"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("問題文・選択肢はIPA公開問題です。解説は本サービス独自のものです。"),
    ).toBeInTheDocument();
  });

  it("IPA公式PDFへのリンクを出す", async () => {
    renderRunner();
    await startMode("練習モード");
    const link = screen.getByRole("link", { name: "IPA公式PDF（問題）を開く" });
    expect(link).toHaveAttribute("href", "https://example.invalid/qs.pdf");
    expect(link).toHaveAttribute("target", "_blank");
  });
});

describe("結果画面", () => {
  async function gradeWithOneCorrect() {
    renderRunner();
    await startMode("本番モード");
    // 問1は正答D。ここでは A を選んで誤答にする。
    fireEvent.click(screen.getByText("選択肢アの本文"));
    fireEvent.click(screen.getByRole("button", { name: "次の問題" }));
    // 問2は正答A。正解しておく。
    fireEvent.click(screen.getByText("2のアの本文"));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));
    await screen.findByText("50%");
  }

  it("正答数と単純正答率を出す", async () => {
    await gradeWithOneCorrect();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("/ 2")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("公式出題区分別の内訳を出す", async () => {
    await gradeWithOneCorrect();
    expect(screen.getByText("ストラテジ系")).toBeInTheDocument();
    expect(screen.getByText("テクノロジ系")).toBeInTheDocument();
    expect(screen.getByText("マネジメント系")).toBeInTheDocument();
  });

  it("合否判定を出さず、注意書きを表示する", async () => {
    await gradeWithOneCorrect();
    expect(
      screen.getByText(
        "この結果は公開問題100問の単純正答率です。実際の試験の評価点や合否を再現するものではありません。",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/合格|不合格/)).not.toBeInTheDocument();
  });

  it("誤答だけに絞れる", async () => {
    await gradeWithOneCorrect();

    // 絞る前は両方見えている。
    expect(screen.getByText("問1の問題文")).toBeInTheDocument();
    expect(screen.getByText("問2の問題文")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /誤答だけに絞る（1問）/ }));

    expect(screen.getByText("問1の問題文")).toBeInTheDocument();
    expect(screen.queryByText("問2の問題文")).not.toBeInTheDocument();
  });

  it("復習先トピックへのリンクを出す", async () => {
    await gradeWithOneCorrect();
    expect(screen.getByRole("link", { name: "復習する: 知的財産権" })).toHaveAttribute(
      "href",
      "/topics/strat-intellectual-property",
    );
  });

  it("採点が終わると途中状態は残らない", async () => {
    await gradeWithOneCorrect();
    const leftovers = [...storageValues.keys()].filter((k) =>
      k.startsWith("fequest:pastExam"),
    );
    expect(leftovers).toEqual([]);
  });

  it("完了保存に失敗したときは結果・P0へ進まず途中状態から再試行できる", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    initializeAppState({
      itExperience: "none",
      dailyMinutes: "15",
      examPlan: "undecided",
      confidence: 1,
    });
    assessmentFailures.complete = 1;
    renderRunner();
    await startMode("本番モード");
    fireEvent.click(screen.getByText("選択肢エの本文"));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(screen.queryByText("50%")).not.toBeInTheDocument();
    expect(screen.getByText("問1の問題文")).toBeInTheDocument();
    expect([...storageValues.keys()].some((key) => key.startsWith("fequest:pastExam"))).toBe(true);
    expect((globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
      .filter(([url]) => url === "/api/progress/save")).toHaveLength(0);

    fireEvent.click(screen.getByText("選択肢アの本文"));
    expect(screen.getByText("選択肢エの本文").closest("button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "保存を再試行する" }));
    expect(await screen.findByText("50%")).toBeInTheDocument();
    expect([...storageValues.keys()].filter((key) => key.startsWith("fequest:pastExam"))).toEqual([]);
    const completions = assessmentActions().filter((action) => action.action === "complete");
    expect(completions).toHaveLength(2);
    expect(completions[1]).toMatchObject({
      sessionId: completions[0].sessionId,
      completedAt: completions[0].completedAt,
      answers: completions[0].answers,
    });
  });

  it("本番モードは strict 保存の応答喪失前に既存の再開セッションへ凍結payloadを保存する", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    initializeAppState({
      itExperience: "none",
      dailyMinutes: "15",
      examPlan: "undecided",
      confidence: 1,
    });
    attemptFailures = 1;
    renderRunner();
    await startMode("本番モード");
    fireEvent.click(screen.getByText("選択肢エの本文"));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(assessmentActions().filter((action) => action.action === "complete")).toHaveLength(0);
    expect(progressSaves()).toHaveLength(0);
    expect(screen.queryByText("50%")).not.toBeInTheDocument();

    const persisted = [...storageValues.entries()]
      .find(([key]) => key.startsWith("fequest:pastExam") && key.endsWith(":exam"));
    expect(persisted).toBeDefined();
    expect(JSON.parse(persisted![1]).pendingMutation).toMatchObject({
      action: "complete",
      finalization: {
        version: 1,
        source: "official_past",
        attempts: expect.arrayContaining([expect.objectContaining({ questionId: "q1" })]),
      },
    });
    expect([...storageValues.keys()].some((key) =>
      key.startsWith("fequest:assessmentFinalization:"),
    )).toBe(false);
  });

  it("完了応答の喪失後にリロードしても保存済みの同一採点操作を再送して復旧する", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    initializeAppState({
      itExperience: "none",
      dailyMinutes: "15",
      examPlan: "undecided",
      confidence: 1,
    });
    assessmentMalformed.complete = 1;
    renderRunner();
    await startMode("本番モード");
    fireEvent.click(screen.getByText("選択肢エの本文"));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    const persistedAfterLostResponse = [...storageValues.entries()]
      .find(([key]) => key.startsWith("fequest:pastExam") && key.endsWith(":exam"));
    const pending = JSON.parse(persistedAfterLostResponse![1]).pendingMutation;
    expect(pending).toMatchObject({
      action: "complete",
      completedAt: expect.any(String),
      answerSnapshot: expect.objectContaining({
        "1": expect.objectContaining({ selected: "D" }),
      }),
      assessmentAnswers: [expect.objectContaining({ canonicalQuestionId: "q1" })],
    });

    cleanup();
    renderRunner();
    const card = screen.getByRole("heading", { name: "本番モード" }).closest("section")!;
    fireEvent.click(await within(card).findByRole("button", { name: "続きから再開する" }));
    expect(await screen.findByText("50%")).toBeInTheDocument();
    expect([...storageValues.keys()].filter((key) => key.startsWith("fequest:pastExam"))).toEqual([]);

    const completions = assessmentActions().filter((action) => action.action === "complete");
    expect(completions).toHaveLength(2);
    expect(completions[1]).toEqual(completions[0]);
    expect(assessmentActions().filter((action) => action.action === "start")).toHaveLength(1);
  });

  it("完了応答の喪失後は新しいマウントで選択操作なしに最初の未確認stageから再開する", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    initializeAppState({
      itExperience: "none",
      dailyMinutes: "15",
      examPlan: "undecided",
      confidence: 1,
    });
    assessmentMalformed.complete = 1;
    renderRunner();
    await startMode("本番モード");
    fireEvent.click(screen.getByText("選択肢エの本文"));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    const firstCompletion = assessmentActions().find((action) => action.action === "complete");

    cleanup();
    renderRunner();

    expect(await screen.findByText("50%")).toBeInTheDocument();
    const completions = assessmentActions().filter((action) => action.action === "complete");
    expect(completions).toHaveLength(2);
    expect(completions[1]).toEqual(firstCompletion);
  });

  it("自動再開中の再開・やり直し操作は同じ frozen finalization を並行送信しない", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    initializeAppState({
      itExperience: "none",
      dailyMinutes: "15",
      examPlan: "undecided",
      confidence: 1,
    });
    assessmentMalformed.complete = 1;
    renderRunner();
    await startMode("本番モード");
    fireEvent.click(screen.getByText("選択肢エの本文"));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("保存");

    cleanup();
    const originalFetch = globalThis.fetch;
    let resolveCompletion!: (response: Response) => void;
    const pendingCompletion = new Promise<Response>((resolve) => {
      resolveCompletion = resolve;
    });
    vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
      if (url === "/api/assessment-sessions") {
        const body = JSON.parse(String(init?.body)) as { action: string };
        if (body.action === "complete") return pendingCompletion;
      }
      return originalFetch(url, init);
    }));

    renderRunner();
    await waitFor(() => expect(assessmentActions().filter((action) => action.action === "complete"))
      .toHaveLength(1));
    const card = screen.getByRole("heading", { name: "本番モード" }).closest("section")!;
    const resume = within(card).getByRole("button", { name: "続きから再開する" });
    const restart = within(card).getByRole("button", { name: "最初からやり直す" });
    expect(resume).toBeDisabled();
    expect(restart).toBeDisabled();
    fireEvent.click(resume);
    fireEvent.click(restart);

    expect(assessmentActions().filter((action) => action.action === "complete")).toHaveLength(1);
    expect(savedAttempts()).toHaveLength(0);
    expect(progressSaves()).toHaveLength(0);

    resolveCompletion(assessmentResponse("complete", String(
      assessmentActions().find((action) => action.action === "complete")?.sessionId,
    )));
    expect(await screen.findByText("50%")).toBeInTheDocument();
    expect(assessmentActions().filter((action) => action.action === "complete")).toHaveLength(1);
    expect(progressSaves()).toHaveLength(1);
  });

  it("official finalization keeps its session and result hidden when session removal fails", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    initializeAppState({
      itExperience: "none",
      dailyMinutes: "15",
      examPlan: "undecided",
      confidence: 1,
    });
    renderRunner();
    await startMode("本番モード");
    fireEvent.click(screen.getByText("選択肢エの本文"));
    const removeItem = vi.spyOn(window.localStorage, "removeItem").mockImplementation(() => {
      throw new DOMException("storage is unavailable");
    });

    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(screen.queryByText("50%")).not.toBeInTheDocument();
    expect([...storageValues.keys()].filter((key) => key.startsWith("fequest:pastExam")))
      .toHaveLength(1);

    removeItem.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "保存を再試行する" }));
    expect(await screen.findByText("50%")).toBeInTheDocument();
  });

  it("P0応答の喪失後に端末状態が変わってもリロード再送する進捗本文を固定する", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    initializeAppState({
      itExperience: "none",
      dailyMinutes: "15",
      examPlan: "undecided",
      confidence: 1,
    });
    progressFailures = 1;
    renderRunner();
    await startMode("本番モード");
    fireEvent.click(screen.getByText("選択肢エの本文"));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("保存");
    expect(progressSaves()).toHaveLength(1);
    const firstProgress = progressSaves()[0];

    const changed = loadAppState()!;
    saveAppState({
      ...changed,
      progress: { ...changed.progress, exp: changed.progress.exp + 123 },
    });
    cleanup();
    renderRunner();
    const card = screen.getByRole("heading", { name: "本番モード" }).closest("section")!;
    fireEvent.click(await within(card).findByRole("button", { name: "続きから再開する" }));
    expect(await screen.findByText("50%")).toBeInTheDocument();

    expect(progressSaves()).toHaveLength(2);
    expect(progressSaves()[1]).toEqual(firstProgress);
  });
});
