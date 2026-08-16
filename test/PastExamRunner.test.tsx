// @vitest-environment jsdom

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import PastExamRunner from "@/components/pastExam/PastExamRunner";
import type { PastExamQuestionView } from "@/lib/pastExam/questionView";

// ============================================================================
// 練習モード / 本番モードの表示ルールの検証。
//   - 選択肢をシャッフルしないこと
//   - 練習モードは回答後に正答と解説を出すこと
//   - 本番モードは採点まで正答も解説も出さないこと
//   - 図表・出典・「解説は本サービス独自」を表示すること
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
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    const userId = window.localStorage.getItem("fequest:userId");
    if (url === "/api/session/state") {
      return userId
        ? new Response(JSON.stringify({ ok: true, userId }), { status: 200 })
        : new Response(JSON.stringify({ ok: false }), { status: 401 });
    }
    if (url === "/api/question-attempts/save") {
      if (!userId) return new Response(JSON.stringify({ ok: false }), { status: 401 });
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

function startMode(mode: "練習モード" | "本番モード") {
  const card = screen.getByRole("heading", { name: mode }).closest("section")!;
  fireEvent.click(within(card).getByRole("button", { name: "始める" }));
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
});

describe("選択肢の並び", () => {
  it("シャッフルせず、公式どおり ア→イ→ウ→エ の順に出す", () => {
    renderRunner();
    startMode("練習モード");

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

  it("内部キーA〜Dを画面上は ア〜エ として表示する", () => {
    renderRunner();
    startMode("練習モード");
    for (const label of ["ア", "イ", "ウ", "エ"]) {
      expect(screen.getByText(`選択肢${label}`, { selector: ".sr-only" })).toBeInTheDocument();
    }
  });
});

describe("練習モード", () => {
  it("回答するまでは解説を出さない", () => {
    renderRunner();
    startMode("練習モード");
    expect(screen.queryByText(EXPLANATION_1)).not.toBeInTheDocument();
  });

  it("回答すると正誤と独自解説をその場で出す", () => {
    renderRunner();
    startMode("練習モード");

    fireEvent.click(screen.getByText("選択肢アの本文"));

    expect(screen.getByText(EXPLANATION_1)).toBeInTheDocument();
    expect(screen.getByText("解説（本サービス独自）")).toBeInTheDocument();
    // 正答は D なので不正解、かつ正答記号エが示される。
    expect(screen.getByText(/不正解.*正答: エ/)).toBeInTheDocument();
  });

  it("正解したときは正解と表示する", () => {
    renderRunner();
    startMode("練習モード");
    fireEvent.click(screen.getByText("選択肢エの本文"));
    expect(screen.getByText("正解")).toBeInTheDocument();
  });

  it("前後の問題へ移動できる", () => {
    renderRunner();
    startMode("練習モード");

    expect(screen.getByText("問1の問題文")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "次の問題" }));
    expect(screen.getByText("問2の問題文")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "前の問題" }));
    expect(screen.getByText("問1の問題文")).toBeInTheDocument();
  });

  it("残り時間を表示しない", () => {
    renderRunner();
    startMode("練習モード");
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("一度回答したら別の選択肢へ変更できない", async () => {
    renderRunner();
    startMode("練習モード");

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

  it("回答後は全選択肢が disabled になる", () => {
    renderRunner();
    startMode("練習モード");

    for (const text of ["選択肢アの本文", "選択肢イの本文", "選択肢ウの本文", "選択肢エの本文"]) {
      expect(screen.getByText(text).closest("button")).not.toBeDisabled();
    }

    fireEvent.click(screen.getByText("選択肢アの本文"));

    for (const text of ["選択肢アの本文", "選択肢イの本文", "選択肢ウの本文", "選択肢エの本文"]) {
      expect(screen.getByText(text).closest("button")).toBeDisabled();
    }
  });

  it("問題を移動して戻ってきても回答は固定されたまま", () => {
    renderRunner();
    startMode("練習モード");

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

  it("同じ問題の保存リクエストは1回だけ送る", () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    renderRunner();
    startMode("練習モード");

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
    startMode("練習モード");

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
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url === "/api/session/state") {
        return Promise.resolve(new Response(JSON.stringify({
          ok: true,
          userId: "user-1",
        }), { status: 200 }));
      }
      if (url === "/api/question-attempts/save") return pendingSave;
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    }));
    renderRunner();
    startMode("練習モード");

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
    startMode("練習モード");
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
  it("残り時間を表示する", () => {
    renderRunner();
    startMode("本番モード");
    expect(screen.getByRole("timer")).toBeInTheDocument();
    expect(screen.getByText(/残り 2:00:00|残り 1:59:5\d/)).toBeInTheDocument();
  });

  it("回答しても正答・解説を出さない", () => {
    renderRunner();
    startMode("本番モード");

    fireEvent.click(screen.getByText("選択肢アの本文"));

    expect(screen.queryByText(EXPLANATION_1)).not.toBeInTheDocument();
    expect(screen.queryByText("解説（本サービス独自）")).not.toBeInTheDocument();
    expect(screen.queryByText(/正答:/)).not.toBeInTheDocument();
    expect(screen.queryByText("正解")).not.toBeInTheDocument();
  });

  it("採点前は回答を変更できる（練習モードのような確定はしない）", async () => {
    renderRunner();
    startMode("本番モード");

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

  it("採点するまで保存APIへ送らない（1問ごとの送信は練習モードだけ）", () => {
    renderRunner();
    startMode("本番モード");

    fireEvent.click(screen.getByText("選択肢アの本文"));
    fireEvent.click(screen.getByText("選択肢エの本文"));

    expect(savedAttempts()).toHaveLength(0);
  });

  it("回答を変更して採点すると、変更後の回答で採点される", async () => {
    window.localStorage.setItem("fequest:userId", "user-1");
    renderRunner();
    startMode("本番モード");

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
    startMode("本番モード");

    fireEvent.click(screen.getByText("選択肢アの本文"));
    fireEvent.click(screen.getByRole("button", { name: "採点する" }));

    expect(await screen.findByText(EXPLANATION_1)).toBeInTheDocument();
    expect(screen.getByText(EXPLANATION_2)).toBeInTheDocument();
  });

  it("未回答の問題へ移動できる（問題一覧から選ぶ）", () => {
    renderRunner();
    startMode("本番モード");
    fireEvent.click(screen.getByRole("button", { name: "問2（未回答）" }));
    expect(screen.getByText("問2の問題文")).toBeInTheDocument();
  });
});

describe("図表・出典の表示", () => {
  it("図表を alt つきで、問題文の後・選択肢の前に表示する", () => {
    renderRunner();
    startMode("練習モード");

    const figure = screen.getByAltText("問1の図表の説明");
    expect(figure).toBeInTheDocument();

    const prompt = screen.getByText("問1の問題文");
    const firstChoice = screen.getByText("選択肢アの本文");
    // DOM 上の並びが 問題文 → 図表 → 選択肢 になっていること。
    expect(prompt.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(figure.compareDocumentPosition(firstChoice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("出典と、解説が独自である旨を表示する", () => {
    renderRunner();
    startMode("練習モード");

    expect(
      screen.getByText("出典：令和8年度 ITパスポート試験 公開問題 問1"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("問題文・選択肢はIPA公開問題です。解説は本サービス独自のものです。"),
    ).toBeInTheDocument();
  });

  it("IPA公式PDFへのリンクを出す", () => {
    renderRunner();
    startMode("練習モード");
    const link = screen.getByRole("link", { name: "IPA公式PDF（問題）を開く" });
    expect(link).toHaveAttribute("href", "https://example.invalid/qs.pdf");
    expect(link).toHaveAttribute("target", "_blank");
  });
});

describe("結果画面", () => {
  async function gradeWithOneCorrect() {
    renderRunner();
    startMode("本番モード");
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
});
