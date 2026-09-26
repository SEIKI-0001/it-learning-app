// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FlashcardDeck from "@/components/wordlist/FlashcardDeck";

const mocks = vi.hoisted(() => ({
  recordSelfRating: vi.fn(),
  completeWordStudySession: vi.fn(),
}));

vi.mock("@/lib/wordlistProgress", () => ({
  getWordProgressMap: () => ({}),
  getWeakIds: () => [],
  getDueIds: () => [],
  recordSelfRating: mocks.recordSelfRating,
  syncWordProgressFromDb: async () => false,
}));
vi.mock("@/lib/wordStudySession", () => ({ completeWordStudySession: mocks.completeWordStudySession }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FlashcardDeck（Today から指定された単語だけを学ぶ）", () => {
  it("指定された単語だけを出し、終えたら Today のタスク完了と成果を1回だけ記録する", async () => {
    render(
      <FlashcardDeck mode="task" ids={["dns", "nat"]} todayTaskId="act:vocab" topicId="tech-network-address" />,
    );

    const seen: string[] = [];
    for (let i = 0; i < 2; i += 1) {
      fireEvent.click(await screen.findByRole("button", { name: "答えを見る" }));
      seen.push(screen.getAllByText(/^(DNS|NAT)$/)[0].textContent!);
      fireEvent.click(screen.getByRole("button", { name: i === 0 ? "覚えた" : "覚えてない" }));
    }
    expect(seen.sort()).toEqual(["DNS", "NAT"]);
    expect(mocks.recordSelfRating).toHaveBeenCalledTimes(2);

    expect(await screen.findByText("2枚 おつかれさま")).toBeInTheDocument();
    expect(mocks.completeWordStudySession).toHaveBeenCalledTimes(1);
    expect(mocks.completeWordStudySession).toHaveBeenCalledWith({ cleared: 1, todayTaskId: "act:vocab" });
    expect(screen.getByRole("link", { name: "今日の学習に戻る" })).toHaveAttribute("href", "/today");
    expect(screen.getByRole("link", { name: "確認パックで仕上がりを確かめる" }))
      .toHaveAttribute("href", "/check-pack/tech-network-address");
    // 指定モードでは全単語から次の語を足さない
    expect(screen.queryByRole("button", { name: /^次の/ })).toBeNull();
  });
});
