// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/today",
  requestMochitChat: vi.fn(),
  trackMochitEvent: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("@/lib/mochitAi/client", () => ({
  requestMochitChat: mocks.requestMochitChat,
  trackMochitEvent: mocks.trackMochitEvent,
}));

import MochitConsultSheet from "@/components/mochit/MochitConsultSheet";
import {
  closeMochitConsult,
  getMochitConsultSnapshot,
  offerMochitReflection,
  openMochitConsult,
  publishMochitQuestion,
  publishMochitToday,
  resetMochitConsultStoreForTest,
} from "@/components/mochit/mochitConsultStore";
import type { MochitQuestionContext } from "@/lib/mochitAi/types";

const storage = new Map<string, string>();

beforeAll(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, String(v)),
      removeItem: (k: string) => void storage.delete(k),
      clear: () => storage.clear(),
    },
  });
  Element.prototype.scrollTo = () => {};
});

beforeEach(() => {
  mocks.pathname = "/today";
  mocks.requestMochitChat.mockResolvedValue({ ok: true, reply: "今日はあと2つだよ。", intent: "today" });
});

afterEach(() => {
  cleanup();
  resetMochitConsultStoreForTest();
  storage.clear();
  vi.clearAllMocks();
});

const question: MochitQuestionContext = {
  questionId: "q1",
  topicId: "t1",
  prompt: "IPアドレスの役割はどれか。",
  choices: [
    { label: "A", text: "住所" },
    { label: "B", text: "名前" },
  ],
  correctLabel: "A",
  selectedLabel: "B",
  explanation: "解説",
};

function renderSheet() {
  return render(<MochitConsultSheet displayName="モチット" />);
}

describe("MochitConsultSheet", () => {
  it("閉じている間は何も出さず、開くとページに合った候補を出す", async () => {
    renderSheet();
    expect(screen.queryByTestId("mochit-consult-sheet")).toBeNull();
    act(() => openMochitConsult());
    expect(await screen.findByRole("dialog", { name: "モチットに相談する" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "今日あと何をすればいい？" })).toBeInTheDocument();
    expect(screen.getByLabelText("モチットに聞く")).toBeInTheDocument();
    expect(mocks.trackMochitEvent).toHaveBeenCalledWith("mochit_open", { page: "today", source: "pet" });
  });

  it("候補を押すと意図つきで送り、今日のルートも一緒に渡す", async () => {
    publishMochitToday({ date: "2026-09-26", tasks: [{ title: "IP", kind: "new", minutes: 10, state: "now" }] });
    renderSheet();
    act(() => openMochitConsult());
    fireEvent.click(await screen.findByRole("button", { name: "今日あと何をすればいい？" }));
    expect(await screen.findByText("今日はあと2つだよ。")).toBeInTheDocument();
    expect(mocks.requestMochitChat).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "今日あと何をすればいい？",
        intent: "today",
        source: "quick_action",
        page: "today",
        today: expect.objectContaining({ date: "2026-09-26" }),
        history: [],
      }),
    );
  });

  it("自由入力は Enter で送り、会話を履歴として次へ渡す", async () => {
    renderSheet();
    act(() => openMochitConsult());
    const input = await screen.findByLabelText("モチットに聞く");
    fireEvent.change(input, { target: { value: "こんにちは" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await screen.findByText("今日はあと2つだよ。");
    fireEvent.change(input, { target: { value: "ありがとう" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(mocks.requestMochitChat).toHaveBeenCalledTimes(2));
    expect(mocks.requestMochitChat.mock.calls[1][0].history).toEqual([
      { role: "user", text: "こんにちは" },
      { role: "mochit", text: "今日はあと2つだよ。" },
    ]);
    expect(mocks.requestMochitChat.mock.calls[1][0].source).toBe("free_input");
  });

  it("AI が失敗しても定型文と再試行を出し、再試行で同じ相談を送り直す", async () => {
    mocks.requestMochitChat.mockResolvedValueOnce({
      ok: false,
      reason: "failed",
      error: "モチットが今うまく答えられないみたい。学習はそのまま続けられるよ。",
    });
    renderSheet();
    act(() => openMochitConsult());
    fireEvent.click(await screen.findByRole("button", { name: "今の学習状況を見る" }));
    expect(await screen.findByText(/学習はそのまま続けられるよ/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "もう一度聞く" }));
    expect(await screen.findByText("今日はあと2つだよ。")).toBeInTheDocument();
    expect(mocks.requestMochitChat.mock.calls[1][0].message).toBe("今の学習状況を教えて");
  });

  it("「モチットに聞く」から開くと、その問題を理解した状態で問題向けの候補を出す", async () => {
    mocks.pathname = "/review";
    renderSheet();
    act(() => openMochitConsult({ from: "question_button", question }));
    expect(await screen.findByText(/表示中の問題：IPアドレスの役割/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "なぜ自分の回答ではダメ？" }));
    await screen.findByText("今日はあと2つだよ。");
    expect(mocks.requestMochitChat).toHaveBeenCalledWith(
      expect.objectContaining({ page: "question", question, intent: "question" }),
    );
    expect(mocks.trackMochitEvent).toHaveBeenCalledWith("mochit_question_help_opened", expect.anything());
  });

  it("ページが公開した回答済みの問題は、ペットのタップでも問題として扱う", async () => {
    renderSheet();
    act(() => publishMochitQuestion("quiz", question));
    act(() => openMochitConsult());
    expect(await screen.findByRole("button", { name: "この問題を説明して" })).toBeInTheDocument();
  });

  it("振り返り：差し出されたら選べて、「今日は終わる」で閉じてその日は出さない", async () => {
    renderSheet();
    act(() => {
      offerMochitReflection("2026-09-26");
      openMochitConsult();
    });
    fireEvent.click(await screen.findByRole("button", { name: "今日は終わる" }));
    expect(getMochitConsultSnapshot().open).toBe(false);
    expect(getMochitConsultSnapshot().reflection.status).toBe("dismissed");
    expect(offerMochitReflection("2026-09-26")).toBe(false);
  });

  it("振り返り：30秒だけ振り返る → 返答 → 「特になし」で完了できる", async () => {
    mocks.requestMochitChat.mockResolvedValue({ ok: true, reply: "今日は8問解いたね。", intent: "reflection" });
    renderSheet();
    act(() => {
      offerMochitReflection("2026-09-26");
      openMochitConsult();
    });
    fireEvent.click(await screen.findByRole("button", { name: "30秒だけ振り返る" }));
    expect(await screen.findByText("今日は8問解いたね。")).toBeInTheDocument();
    expect(mocks.requestMochitChat).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "reflection", source: "reflection" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "特になし（終わる）" }));
    expect(getMochitConsultSnapshot().reflection.status).toBe("completed");
    expect(mocks.trackMochitEvent).toHaveBeenCalledWith("mochit_reflection_completed", expect.anything());
  });

  it("バブルから振り返りとして開くと、そのまま振り返りを始める", async () => {
    renderSheet();
    act(() => {
      offerMochitReflection("2026-09-26");
      openMochitConsult({ reflection: true });
    });
    await waitFor(() =>
      expect(mocks.requestMochitChat).toHaveBeenCalledWith(expect.objectContaining({ intent: "reflection" })),
    );
  });

  it("Escape で閉じる。返答を見てから閉じたら「学習に戻った」を記録する", async () => {
    renderSheet();
    act(() => openMochitConsult());
    fireEvent.click(await screen.findByRole("button", { name: "今の学習状況を見る" }));
    await screen.findByText("今日はあと2つだよ。");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(getMochitConsultSnapshot().open).toBe(false);
    expect(mocks.trackMochitEvent).toHaveBeenCalledWith("mochit_return_to_learning", expect.anything());
  });
});

describe("mochitConsultStore", () => {
  it("問題の取り下げは公開した本人のものだけを消す", () => {
    publishMochitQuestion("a", question);
    publishMochitQuestion("b", null);
    expect(getMochitConsultSnapshot().question?.owner).toBe("a");
    publishMochitQuestion("a", null);
    expect(getMochitConsultSnapshot().question).toBeNull();
  });

  it("振り返りは同じ日に一度だけ差し出す", () => {
    expect(offerMochitReflection("2026-09-26")).toBe(true);
    expect(offerMochitReflection("2026-09-26")).toBe(false);
    closeMochitConsult();
  });
});
