// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SpreadsheetExperience from "@/components/experiences/SpreadsheetExperience";
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
      <SpreadsheetExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("SpreadsheetExperience", () => {
  it("keeps the relative / absolute copy demo", () => {
    renderDeck();
    click("絶対参照 $E$1");
    click("⬇ 下にコピーして埋める");
    expect(screen.getByText(/コピーしても税率の参照が固定/)).toBeInTheDocument();
  });

  it("reads B4*(1+B$1) part by part, lighting the referenced cell, then copies down", () => {
    vi.useFakeTimers();
    renderDeck();
    click("解説3");
    act(() => vi.advanceTimersByTime(1650));
    expect(screen.getByTestId("sheet-read-grid-B4")).toHaveAttribute("data-mark", "brand");
    act(() => vi.advanceTimersByTime(2550));
    expect(screen.getByTestId("sheet-read-grid-B1")).toHaveAttribute("data-mark", "amber");
    for (let i = 0; i < 4; i++) act(() => vi.advanceTimersByTime(2550));
    expect(screen.getByTestId("sheet-read-grid-C4")).toHaveTextContent("220");
    click("⬇ C5・C6 へ複写する");
    expect(screen.getByTestId("sheet-read-copies")).toHaveTextContent("B6＊(1＋B$1)");
    expect(screen.getByTestId("sheet-read-grid-C5")).toHaveTextContent("550");
  });

  it("IF branches TRUE / FALSE and 60 counts as ≧ 60", () => {
    reduceMotion();
    renderDeck();
    click("解説4");
    click("60点");
    expect(screen.getByTestId("sheet-if-flow")).toHaveAttribute("data-result", "true");
    click("40点");
    expect(screen.getByTestId("sheet-if-flow")).toHaveAttribute("data-result", "false");
  });

  it("論理和 passes when any condition holds, 論理積 needs all", () => {
    renderDeck();
    click("解説5");
    expect(screen.getByTestId("sheet-logic")).toHaveAttribute("data-result", "true");
    click(/論理積/);
    expect(screen.getByTestId("sheet-logic")).toHaveAttribute("data-result", "false");
  });

  it("合計(B2:B4) gathers the range into 100 and feeds IF", () => {
    reduceMotion();
    renderDeck();
    click("解説6");
    expect(screen.getByTestId("sheet-range-box")).toHaveTextContent("100");
    expect(screen.getByTestId("sheet-range-nested")).toHaveTextContent("'達成'");
  });

  it("practice: choosing 論理積 for 「又は」 is flagged", () => {
    renderDeck();
    click("解説7");
    click("B5＊(1＋B$1)");
    click("次の問題へ →");
    click("合格");
    click("次の問題へ →");
    click("100");
    click("次の問題へ →");
    click("未達");
    click("次の問題へ →");
    click(/論理積/);
    expect(screen.getByText(/「又は」「少なくとも一つ」は論理和/)).toBeInTheDocument();
  });
});
