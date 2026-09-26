// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { QuizQuestion } from "@/lib/wordlist";
import { getAllWords } from "@/lib/wordlist";
import QuizDeck from "@/components/wordlist/QuizDeck";

const mocks = vi.hoisted(() => ({
  recordQuizResult: vi.fn(),
  completeWordStudySession: vi.fn(),
  built: [] as QuizQuestion[],
}));

// 出題は既存の buildQuizForEntry をそのまま使う（呼ばれた結果だけを控える）。
vi.mock("@/lib/wordlist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/wordlist")>();
  return {
    ...actual,
    buildQuizForEntry: vi.fn((...args: Parameters<typeof actual.buildQuizForEntry>) => {
      const q = actual.buildQuizForEntry(...args);
      mocks.built.push(q);
      return q;
    }),
  };
});
vi.mock("@/lib/wordlistProgress", () => ({
  getWordProgressMap: () => ({}),
  getWeakIds: () => [],
  getDueIds: () => [],
  recordQuizResult: mocks.recordQuizResult,
  syncWordProgressFromDb: async () => false,
}));
vi.mock("@/lib/wordStudySession", () => ({ completeWordStudySession: mocks.completeWordStudySession }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.built.length = 0;
});

const KEYS = ["A", "B", "C", "D"] as const;

function choice(key: string): HTMLElement {
  return screen.getAllByRole("button").find((b) => b.textContent?.trim().startsWith(key))!;
}

/** 表示中の問題に答えて次へ進む（correct=false なら不正解の選択肢を選ぶ）。 */
function answer(index: number, correct: boolean) {
  const q = mocks.built[index];
  const key = correct ? q.correctKey : KEYS.find((k) => k !== q.correctKey)!;
  fireEvent.click(choice(key));
  fireEvent.click(screen.getByRole("button", { name: /次の問題|結果を見る/ }));
  return q;
}

describe("QuizDeck task モード（Today の単語タスク）", () => {
  it("指定された単語だけを1語1問で出し、正誤を recordQuizResult に記録する", async () => {
    render(<QuizDeck mode="task" ids={["dns", "nat", "dhcp", "dns"]} todayTaskId="act:vocab" topicId="tech-network-address" />);
    expect(await screen.findByText("1 / 3")).toBeInTheDocument();
    expect(mocks.built.map((q) => q.entryId).sort()).toEqual(["dhcp", "dns", "nat"]);

    const first = answer(0, true);
    expect(mocks.recordQuizResult).toHaveBeenLastCalledWith(first.entryId, true);
    const second = answer(1, false);
    expect(mocks.recordQuizResult).toHaveBeenLastCalledWith(second.entryId, false);

    // 全問に答えるまでは Today のタスクを完了にしない
    expect(mocks.completeWordStudySession).not.toHaveBeenCalled();

    const third = answer(2, false);
    expect(mocks.recordQuizResult).toHaveBeenLastCalledWith(third.entryId, false);
    expect(mocks.recordQuizResult).toHaveBeenCalledTimes(3);

    // 正答率に関係なく完了。ミッションへは正解数だけ
    expect(await screen.findByText("3問 おつかれさま")).toBeInTheDocument();
    expect(mocks.completeWordStudySession).toHaveBeenCalledTimes(1);
    expect(mocks.completeWordStudySession).toHaveBeenCalledWith({ cleared: 1, todayTaskId: "act:vocab" });
    expect(screen.getByText("間違えた2語は苦手な用語として、次回の復習に出ます。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "今日の学習に戻る" })).toHaveAttribute("href", "/today");
    expect(screen.getByRole("link", { name: "確認パックで仕上がりを確かめる" }))
      .toHaveAttribute("href", "/check-pack/tech-network-address");
    // 同じタスクをやり直してミッションを二重に進めない
    expect(screen.queryByRole("button", { name: "もう一度" })).toBeNull();
  });

  it("20語を指定すれば20問出す（固定の SESSION_SIZE=8 で切らない）", async () => {
    const ids = getAllWords().slice(0, 20).map((w) => w.id);
    render(<QuizDeck mode="task" ids={ids} todayTaskId="act:vocab" />);
    expect(await screen.findByText("1 / 20")).toBeInTheDocument();
    expect(mocks.built.map((q) => q.entryId).sort()).toEqual([...ids].sort());

    let correct = 0;
    for (let i = 0; i < 20; i += 1) {
      const ok = i % 10 < 7; // 14問正解・6問不正解
      if (ok) correct += 1;
      answer(i, ok);
      if (i < 19) expect(mocks.completeWordStudySession).not.toHaveBeenCalled();
    }
    expect(correct).toBe(14);
    expect(await screen.findByText("20問 おつかれさま")).toBeInTheDocument();
    expect(mocks.completeWordStudySession).toHaveBeenCalledWith({ cleared: 14, todayTaskId: "act:vocab" });
  });

  it("ページを開いただけでは完了にしない", async () => {
    render(<QuizDeck mode="task" ids={["dns"]} todayTaskId="act:vocab" />);
    expect(await screen.findByText("1 / 1")).toBeInTheDocument();
    expect(mocks.completeWordStudySession).not.toHaveBeenCalled();
  });
});
