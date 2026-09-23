// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BreakEvenExperience from "@/components/experiences/BreakEvenExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import { getTopicById } from "@/lib/content";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function reduceMotion() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function renderDeck() {
  return render(
    <ExperienceSlideDeck>
      <BreakEvenExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const setQty = (n: number) => fireEvent.change(screen.getByRole("slider", { name: "販売数" }), { target: { value: String(n) } });
// 直近に答えた問題の「つまずいた手順」
const failedChip = (container: HTMLElement) => [...container.querySelectorAll('[data-failed="true"]')].at(-1);

describe("BreakEvenExperience (reduced motion = every step shows its final state)", () => {
  it("starts from one sale: 500 − 300 leaves 200, which first goes to recovering the fixed cost", () => {
    reduceMotion();
    renderDeck();
    expect(screen.getByText("2種類の費用を知ろう")).toBeInTheDocument();
    click("解説2");
    expect(screen.getByTestId("be-margin-eq")).toHaveTextContent("500 − 300 ＝ 200円");
    expect(screen.getByText(/すぐに利益になるわけではありません/)).toHaveTextContent("出店料（固定費）の回収");
    expect(screen.queryByText("↺ もう一度見る")).not.toBeInTheDocument();
  });

  it("each sale recovers 200 of the fixed cost: 10,000 → 9,800 → 9,600 → 9,400", () => {
    reduceMotion();
    renderDeck();
    click("解説3");
    expect(screen.getByTestId("be-remaining")).toHaveTextContent("9,400円");
    expect(screen.getByTestId("be-chain")).toHaveTextContent("10,000−200 →9,800−200 →9,600−200 →9,400");
    click("🛍️ もう1個売る");
    expect(screen.getByTestId("be-remaining")).toHaveTextContent("9,200円");
  });

  it("asks how many sales recover 10,000 at 200 each, diagnoses the wrong divisor, then shows 50 → break-even and 51 → profit", () => {
    reduceMotion();
    renderDeck();
    click("解説4");
    click("33個");
    expect(screen.getByText(/変動費300円で割った値/)).toBeInTheDocument();
    expect(screen.getByTestId("be-count")).toHaveAttribute("data-filled", "51");
    expect(screen.getByText(/50個で固定費を回収しきった/)).toBeInTheDocument();
    expect(screen.getByText(/51個目からは/)).toBeInTheDocument();
  });

  it("turns 10,000 ÷ 200 = 50 into the general formula and names 限界利益", () => {
    reduceMotion();
    renderDeck();
    click("解説5");
    expect(screen.getByTestId("be-formula-final")).toHaveTextContent("固定費 ÷（販売単価 − 変動費）");
    expect(screen.getByText(/限界利益/, { selector: "b" })).toBeInTheDocument();
  });

  it("the graph confirms: left of 50 is a loss, the crossing at 50 is the break-even point, right of 50 is a profit", () => {
    reduceMotion();
    renderDeck();
    click("解説6");
    expect(screen.getByTestId("be-point")).toHaveAttribute("data-qty", "50");
    expect(screen.getByTestId("be-status")).toHaveTextContent("交点＝損益分岐点");
    expect(screen.getByTestId("be-point-ring")).toBeInTheDocument();
    setQty(49);
    expect(screen.getByTestId("be-status")).toHaveTextContent("赤字");
    expect(screen.getByTestId("be-gap")).toHaveAttribute("stroke", "#f43f5e");
    setQty(51);
    expect(screen.getByTestId("be-status")).toHaveTextContent("黒字");
    expect(screen.getByTestId("be-gap")).toHaveAttribute("stroke", "#10b981");
  });

  it("bridges to 損益分岐点売上高 with 限界利益率, then practices the exam shape with step-level feedback", () => {
    reduceMotion();
    const { container } = renderDeck();
    click("解説7");
    expect(screen.getByTestId("be-sales-final")).toHaveTextContent("損益分岐点売上高 ＝ 固定費 ÷ 限界利益率");

    click("解説8");
    click("100個");
    expect(failedChip(container)).toHaveTextContent("① 1個（売上）あたり残る額");
    click("1,200万円");
    expect(screen.getByText(/変動費の割合（0.75）で割っています/)).toBeInTheDocument();
    expect(failedChip(container)).toHaveTextContent("③ 売上高なら ÷ 限界利益率");
    expect(screen.getByText(/900 ÷ 0.25 ＝/)).toBeInTheDocument();

    click("解説9");
    expect(screen.getByText("固定費？ 変動費？")).toBeInTheDocument();
  });
});

describe("BreakEvenExperience animation", () => {
  it("peels 300 off the 500 bar, then shows what is left", () => {
    vi.useFakeTimers();
    renderDeck();
    click("解説2");
    expect(screen.getByTestId("be-margin")).toHaveAttribute("data-beat", "0");
    expect(screen.queryByTestId("be-margin-eq")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("be-margin-cost")).toHaveTextContent("仕入れ −300円");
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByTestId("be-margin-eq")).toBeInTheDocument();
  });

  it("counts the sales one by one after the question is answered", () => {
    vi.useFakeTimers();
    renderDeck();
    click("解説4");
    click("50個");
    expect(screen.getByTestId("be-count")).toHaveAttribute("data-filled", "0");
    for (let i = 0; i < 10; i += 1) act(() => vi.advanceTimersByTime(45));
    expect(screen.getByTestId("be-count")).toHaveAttribute("data-filled", "10");
  });
});

describe("strat-accounting-break-even check questions", () => {
  it("keep the existing questions and add 損益分岐点売上高 via 限界利益率", () => {
    const topic = getTopicById("strat-accounting-break-even");
    expect(topic?.checkQuestions).toHaveLength(5);
    expect(topic?.checkQuestions[1].prompt).toContain("損益分岐点となる販売数");
    expect(topic?.checkQuestions[4]).toMatchObject({ id: "strat-accounting-break-even-q5" });
    expect(topic?.checkQuestions[4].prompt).toContain("損益分岐点売上高");
  });
});
