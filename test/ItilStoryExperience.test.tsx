// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTopicExperience } from "@/components/experiences/registry";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import ItilStoryExperience from "@/components/experiences/itil/ItilStoryExperience";
import { readMs } from "@/components/experiences/itil/StoryDay";
import { FRIDAY_KPI, FRIDAY_TOOLS, MONDAY, THURSDAY, TUESDAY, WEDNESDAY } from "@/components/experiences/itil/week";

afterEach(cleanup);

const DAYS = { MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY_TOOLS, FRIDAY_KPI };

// 自動再生は「タイマー → 再描画 → 次のタイマー」なので、少しずつ進めて effect を流す
function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) act(() => vi.advanceTimersByTime(100));
}

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <ItilStoryExperience />
    </ExperienceSlideDeck>,
  );
}

const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));
const activeSlide = () => document.querySelector<HTMLElement>('section[aria-hidden="false"]')!;
const lines = () => activeSlide().querySelectorAll('[data-testid="itil-story"] > li:not([data-testid="itil-typing"])').length;

describe("ITIL ストーリーの台本", () => {
  it("選ぶ場面は正解がちょうど1つ・誤答には理由がある", () => {
    for (const [day, beats] of Object.entries(DAYS)) {
      for (const b of beats.filter((x) => x.ask)) {
        const ok = b.ask!.choices.filter((c) => c.ok);
        expect(ok, `${day}: ${b.ask!.q}`).toHaveLength(1);
        for (const c of b.ask!.choices.filter((x) => !x.ok)) expect(c.why, `${day}: ${c.label}`).toBeTruthy();
      }
    }
  });

  it("過去問で問われる管理プロセスの名前が、すべて用語カードで出る", () => {
    const terms = Object.values(DAYS)
      .flat()
      .map((b) => b.term?.name)
      .filter(Boolean);
    expect(terms).toEqual(
      expect.arrayContaining([
        "サービスデスク",
        "インシデント管理",
        "問題管理",
        "サービスマネジメントシステムの改善",
        "変更管理",
        "リリース及び展開管理",
        "構成管理",
        "FAQ",
        "チャットボット",
      ]),
    );
  });

  it("読む時間は文字数に比例し、上限で止まる", () => {
    expect(readMs({ text: "あ".repeat(10) })).toBeLessThan(readMs({ text: "あ".repeat(30) }));
    expect(readMs({ text: "あ", term: { name: "用語", def: "説明" } })).toBeGreaterThan(readMs({ text: "あ" }));
    expect(readMs({ text: "あ".repeat(500) })).toBe(9000);
  });
});

describe("ItilStoryExperience", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("mgmt-itil の解説として登録され、大枠＋月〜金＋計算＋ふりかえりの9枚", () => {
    expect(getTopicExperience("mgmt-itil")).toBe(ItilStoryExperience);
    renderDeck();
    expect(screen.getByText("1 / 9")).toBeInTheDocument();
    expect(screen.getByTestId("itil-cast")).toHaveTextContent("森さん");
  });

  it("会話は自動で進み、選ぶ場面では答えるまで止まる", () => {
    renderDeck();
    slide(2); // 月曜
    expect(lines()).toBe(1);
    advance(readMs(MONDAY[0]) + 200);
    expect(lines()).toBe(2);
    advance(30000);
    // 4行目（9:30 の選ぶ場面）で止まっている
    expect(lines()).toBe(4);
    expect(within(activeSlide()).getByText("選ぶと続きが始まります")).toBeInTheDocument();
    const ask = within(activeSlide()).getByTestId("itil-ask");
    fireEvent.click(within(ask).getByRole("button", { name: "経費精算システムが全社で開かない" }));
    advance(30000);
    expect(lines()).toBe(MONDAY.length);
    expect(within(activeSlide()).getByTestId("itil-summary")).toHaveTextContent("サービスデスク");
  });

  it("表示していない日は進まず、一時停止もできる", () => {
    renderDeck();
    slide(4); // 水曜を開いてすぐ離れる
    slide(1);
    advance(20000);
    slide(4);
    expect(lines()).toBe(1);

    fireEvent.click(within(activeSlide()).getByTestId("itil-pause"));
    advance(20000);
    expect(lines()).toBe(1);
    fireEvent.click(within(activeSlide()).getByTestId("itil-pause"));
    advance(readMs(WEDNESDAY[0]) + 200);
    expect(lines()).toBe(2);
  });

  it("火曜はディスクの使用量が、答えたあとに満杯から下がる", () => {
    renderDeck();
    slide(3);
    advance(readMs(TUESDAY[0]) + readMs(TUESDAY[1]) + 400);
    expect(within(activeSlide()).getByTestId("itil-disk")).toHaveTextContent("100%");
    fireEvent.click(
      within(within(activeSlide()).getByTestId("itil-ask")).getByRole("button", {
        name: "使っていない大きなファイルを、別の場所へ一時的に移す",
      }),
    );
    expect(within(activeSlide()).getByTestId("itil-disk")).toHaveTextContent("88%");
  });

  it("削減率は約67%（手直しの時間を足す）", () => {
    renderDeck();
    slide(8);
    const rate = within(activeSlide()).getByTestId("itil-rate");
    fireEvent.click(within(rate).getByRole("button", { name: "67%" }));
    expect(rate).toHaveAttribute("data-result", "ok");
    fireEvent.click(within(activeSlide()).getByRole("button", { name: "解説を見る" }));
    expect(activeSlide()).toHaveTextContent("1,500分");
    expect(activeSlide()).toHaveTextContent("500分");
  });
});
