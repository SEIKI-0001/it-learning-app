// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EstimationExperience from "@/components/experiences/EstimationExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

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
  render(
    <ExperienceSlideDeck>
      <EstimationExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const failedChip = () => [...document.querySelectorAll('[data-failed="true"]')].at(-1);

describe("EstimationExperience", () => {
  it("keeps the FP counter", () => {
    renderDeck();
    expect(screen.getByText("合計ファンクションポイント")).toBeInTheDocument();
  });

  it("person-month: multiply for the area, then fill 10 blocks two per month to get 5 months", () => {
    vi.useFakeTimers();
    renderDeck();
    click("解説2");
    for (let i = 0; i < 4; i++) act(() => vi.advanceTimersByTime(1300));
    expect(screen.getByTestId("est-pm-mul")).toHaveTextContent("12人月");
    for (let i = 0; i < 3; i++) act(() => vi.advanceTimersByTime(1400));
    expect(screen.getByTestId("est-pm-months")).toHaveTextContent(/[1-4]か月目/);
    for (let i = 0; i < 5; i++) act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByTestId("est-pm-div")).toHaveTextContent("10 ÷ 2 ＝ 5か月");
  });

  it("productivity, phases and staff change show their final answers", () => {
    reduceMotion();
    renderDeck();
    click("解説3");
    expect(screen.getByTestId("est-prod-eq")).toHaveTextContent("120 ÷ 6 ＝ 20人月");
    click("解説4");
    expect(screen.getByTestId("est-phase-total")).toHaveTextContent("42人月");
    click("解説5");
    expect(screen.getByTestId("est-staff-rest")).toHaveTextContent("40人日");
    expect(screen.getByTestId("est-staff-answer")).toHaveTextContent("8人");
  });

  it("method scenes: an early rough estimate is 類推; a wrong pick explains why", () => {
    renderDeck();
    click("解説6");
    fireEvent.click(within(screen.getByTestId("est-method-0")).getByRole("button", { name: "FP法" }));
    expect(screen.getByTestId("est-method-0")).toHaveAttribute("data-result", "ng");
    expect(screen.getByText(/機能が出そろってから/)).toBeInTheDocument();
  });

  it("practice: adding productivities first is flagged at the 工程ごとに足す step", () => {
    renderDeck();
    click("解説7");
    click("5か月");
    click("次の問題へ →");
    click("30人月");
    click("次の問題へ →");
    click("7.5人月");
    expect(failedChip()).toHaveTextContent("③ 工程ごとに足す");
  });
});
