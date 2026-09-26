// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AiGradingPage from "@/app/ai-grading/page";
import { getWrittenQuestion, getWrittenQuestions } from "@/data/writtenQuestions";
import type { AiGradingResponse } from "@/lib/ai/gradingClient";
import type { AiGradingBootstrapResult, GradingRecord } from "@/types/aiGrading";

const harness = vi.hoisted(() => ({
  bootstrap: null as AiGradingBootstrapResult | null,
  saveCache: vi.fn(),
  requestAiGrading: vi.fn<(...args: unknown[]) => Promise<AiGradingResponse>>(),
}));

vi.mock("@/components/BottomNav", () => ({ default: () => null }));
vi.mock("@/lib/ai/gradingClient", () => ({ requestAiGrading: harness.requestAiGrading }));
vi.mock("@/lib/userSession", () => ({
  getUserId: () => "user-1",
  setUserId: vi.fn(),
  readTokenFromUrl: () => null,
  resolveToken: vi.fn(),
  loadCachedAiGradingBootstrap: () => null,
  saveCachedAiGradingBootstrap: harness.saveCache,
  fetchAiGradingBootstrap: async () => harness.bootstrap,
}));

const QUESTIONS = getWrittenQuestions();
const LONG_ANSWER = "ドメイン名をIPアドレスへ変換する仕組みで、ブラウザはDNSサーバに問い合わせます。";

function record(questionId: string, grade: "A" | "C" = "A"): GradingRecord {
  const q = getWrittenQuestion(questionId)!;
  return {
    id: `r-${questionId}`,
    questionId,
    category: q.category,
    userAnswer: "以前の回答",
    result: {
      score: grade === "A" ? 85 : 50,
      grade,
      isCorrect: grade === "A",
      summary: "",
      goodPoints: [],
      missingPoints: [],
      feedback: "",
      modelAnswer: q.modelAnswer,
      nextReviewTheme: "",
    },
    provider: "gemini",
    model: "gemini-test",
    createdAt: "2026-09-20T00:00:00.000Z",
  };
}

function bootstrap(history: GradingRecord[] = []): AiGradingBootstrapResult {
  return {
    userId: "user-1",
    billingStatus: {
      plan: "free",
      providerLabel: "Gemini",
      usage: { used: 0, limit: 3, remaining: 3 },
      tracked: true,
      checkoutEnabled: false,
    },
    gradingHistory: history,
    initialQuestionIndex: 0,
  };
}

async function openPage(search = "") {
  window.history.replaceState(null, "", `/ai-grading${search}`);
  render(<AiGradingPage />);
  await screen.findByRole("button", { name: /おまかせで1問/ });
}

function currentTitle() {
  return screen.getByRole("heading", { level: 2 }).textContent;
}

beforeEach(() => {
  harness.bootstrap = bootstrap();
  harness.saveCache.mockReset();
  harness.requestAiGrading.mockReset();
});
afterEach(() => cleanup());

describe("AI採点：出題の選び方", () => {
  it("指定が無ければ、おまかせ（最初の未回答）で始まる", async () => {
    harness.bootstrap = { ...bootstrap([record(QUESTIONS[0].id)]), initialQuestionIndex: 1 };
    await openPage();
    await waitFor(() => expect(currentTitle()).toBe(QUESTIONS[1].title));
  });

  it("おまかせで1問：未回答を優先して次の問題へ進み、URLも追従する", async () => {
    harness.bootstrap = bootstrap([record(QUESTIONS[1].id)]);
    await openPage();
    await waitFor(() => expect(currentTitle()).toBe(QUESTIONS[0].title));
    fireEvent.click(screen.getByRole("button", { name: /おまかせで1問/ }));
    expect(currentTitle()).toBe(QUESTIONS[2].title);
    expect(window.location.search).toBe(`?questionId=${QUESTIONS[2].id}`);
  });

  it("一覧を開き、絞り込んで、選んだ問題の回答画面へ進む", async () => {
    await openPage();
    fireEvent.click(screen.getByRole("button", { name: /一覧から選ぶ/ }));
    const picker = screen.getByRole("region", { name: "問題を選ぶ" });
    const total = within(picker).getAllByRole("listitem").length;
    expect(total).toBe(QUESTIONS.length);

    fireEvent.click(within(picker).getByRole("button", { name: "マネジメント" }));
    fireEvent.change(within(picker).getByRole("combobox"), { target: { value: "project-management" } });
    const titles = within(picker).getAllByRole("listitem").map((li) => li.querySelector("p")?.textContent);
    expect(titles).toEqual(expect.arrayContaining([getWrittenQuestion("pm-01")!.title, getWrittenQuestion("pm-03")!.title]));
    expect(titles).not.toContain(getWrittenQuestion("sec-01")!.title);

    fireEvent.click(within(picker).getByRole("button", { name: new RegExp(getWrittenQuestion("pm-03")!.title) }));
    expect(screen.queryByRole("region", { name: "問題を選ぶ" })).not.toBeInTheDocument();
    expect(currentTitle()).toBe(getWrittenQuestion("pm-03")!.title);
    expect(screen.getByText(getWrittenQuestion("pm-03")!.question)).toBeInTheDocument();
    expect(window.location.search).toBe("?questionId=pm-03");
  });

  it("キーワードと回答状況で絞り込め、回答済みにはグレードが出る", async () => {
    harness.bootstrap = bootstrap([record("sec-08", "C")]);
    await openPage();
    fireEvent.click(screen.getByRole("button", { name: /一覧から選ぶ/ }));
    const picker = screen.getByRole("region", { name: "問題を選ぶ" });
    fireEvent.change(within(picker).getByRole("searchbox"), { target: { value: "ゼロトラスト" } });
    expect(within(picker).getAllByRole("listitem")).toHaveLength(1);
    expect(within(picker).getByText("回答済み C")).toBeInTheDocument();
    fireEvent.click(within(picker).getByRole("button", { name: "未回答" }));
    expect(within(picker).queryAllByRole("listitem")).toHaveLength(0);
    expect(within(picker).getByText("条件に合う問題がありません。")).toBeInTheDocument();
    fireEvent.click(within(picker).getByRole("button", { name: "絞り込みを解除" }));
    expect(within(picker).getAllByRole("listitem")).toHaveLength(QUESTIONS.length);
  });

  it("?questionId= で特定の問題を直接開ける", async () => {
    await openPage("?questionId=sw-01");
    await waitFor(() => expect(currentTitle()).toBe(getWrittenQuestion("sw-01")!.title));
  });

  it("?topicId=（Todayからの導線）は引き続きそのトピックの問題を開く", async () => {
    await openPage("?topicId=tech-auth-authz-mfa");
    await waitFor(() => expect(currentTitle()).toBe(getWrittenQuestion("sec-01")!.title));
  });

  it("?topicId= はトピック内の未回答を優先する", async () => {
    harness.bootstrap = bootstrap([record("ai-01")]);
    await openPage("?topicId=tech-ai-ml");
    await waitFor(() => expect(currentTitle()).toBe(getWrittenQuestion("ai-02")!.title));
  });

  it("復習タブから同じ問題にもう一度挑戦できる", async () => {
    harness.bootstrap = bootstrap([record("db-03")]);
    await openPage();
    fireEvent.click(screen.getByRole("button", { name: /^復習/ }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(getWrittenQuestion("db-03")!.title) }));
    fireEvent.click(screen.getByRole("button", { name: "この問題をもう一度解く" }));
    expect(currentTitle()).toBe(getWrittenQuestion("db-03")!.title);
    expect(screen.getByLabelText("あなたの回答")).toHaveValue("");
  });
});

describe("AI採点：採点・履歴・回数（回帰）", () => {
  it("選んだ問題で採点し、履歴と残り回数・キャッシュを更新する", async () => {
    harness.requestAiGrading.mockResolvedValue({
      ok: true,
      result: { ...record("net-01").result, score: 90, grade: "S", summary: "よく説明できています" },
      meta: { plan: "free", provider: "gemini", model: "gemini-test", fallback: false, usage: { used: 1, limit: 3, remaining: 2 } },
    });
    await openPage("?questionId=net-01");
    await waitFor(() => expect(currentTitle()).toBe(getWrittenQuestion("net-01")!.title));
    fireEvent.change(screen.getByLabelText("あなたの回答"), { target: { value: LONG_ANSWER } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "採点する" }));
    });

    expect(harness.requestAiGrading).toHaveBeenCalledWith({ questionId: "net-01", userAnswer: LONG_ANSWER, userId: "user-1" });
    expect(await screen.findByText("よく説明できています")).toBeInTheDocument();
    expect(screen.getByText("本日の残り採点回数：2 / 3 回")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^復習（1）/ })).toBeInTheDocument();
    expect(harness.saveCache).toHaveBeenCalledWith(
      expect.objectContaining({ gradingHistory: [expect.objectContaining({ questionId: "net-01" })] }),
    );
    // 結果の下からも次の問題を選べる。
    expect(screen.getAllByRole("button", { name: /おまかせで1問/ })).toHaveLength(2);
  });

  it("上限到達（429）のメッセージをそのまま表示する", async () => {
    harness.requestAiGrading.mockResolvedValue({ ok: false, reason: "rate_limited", error: "本日のAI採点の上限（3回）に達しました。" });
    await openPage("?questionId=net-01");
    fireEvent.change(screen.getByLabelText("あなたの回答"), { target: { value: LONG_ANSWER } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "採点する" }));
    });
    expect(await screen.findByText("本日のAI採点の上限（3回）に達しました。")).toBeInTheDocument();
  });
});
