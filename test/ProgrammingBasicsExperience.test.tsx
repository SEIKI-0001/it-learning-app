// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProgrammingBasicsExperience from "@/components/experiences/ProgrammingBasicsExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <ProgrammingBasicsExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
/** いま光っているプログラムの行 */
const currentLine = (testId: string) => screen.getByTestId(testId).querySelector('[data-current="true"]')?.textContent ?? "";

describe("ProgrammingBasicsExperience", () => {
  it("has three slides and never asks to press a button for each step", () => {
    renderDeck();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /1行実行|1回まわす|実行する/ })).toBeNull();
    expect(screen.getByText(/代入/, { selector: "b" })).toBeInTheDocument();
  });

  it("variable: rain goes into the 天気 box by itself, is read by name, then sunny overwrites it", () => {
    renderDeck();
    expect(screen.queryByTestId("var-value")).toBeNull();
    wait(1900);
    expect(screen.getByTestId("var-value")).toHaveAttribute("data-value", "rain");
    expect(currentLine("var-program")).toContain("天気 ← \"雨\"");
    wait(1900);
    expect(screen.getByTestId("var-bubble")).toHaveTextContent("天気は「雨」");
    wait(1900);
    expect(screen.getByTestId("var-value")).toHaveAttribute("data-value", "sun");
    expect(screen.getByTestId("var-ejected")).toHaveTextContent("雨");
    expect(screen.getByTestId("var-caption")).toHaveTextContent("上書き");
    wait(1900);
    expect(screen.getByTestId("var-bubble")).toHaveTextContent("天気は「晴れ」");
    expect(screen.getByRole("button", { name: "↺ もう一度見る" })).toBeEnabled();
  });

  it("branch: the walker takes the umbrella road on rain, and switching to sunny re-runs on the plain road", () => {
    renderDeck();
    click("解説2");
    wait(1300);
    expect(currentLine("branch-program")).toContain("もし 天気 が 雨 なら");
    wait(1300);
    expect(screen.getByTestId("rain-stage")).toHaveAttribute("data-route", "rain");
    expect(currentLine("branch-program")).toContain("傘を持つ");
    wait(1300);
    expect(screen.getByTestId("rain-result")).toHaveTextContent("出発");

    click("☀️ 晴れ");
    expect(screen.getByTestId("rain-stage")).toHaveAttribute("data-route", "none");
    wait(1300);
    expect(currentLine("branch-program")).toContain("そうでなければ");
    wait(1300);
    expect(screen.getByTestId("rain-stage")).toHaveAttribute("data-route", "sun");
    expect(currentLine("branch-program")).toContain("そのまま");
  });

  it("loop: climbs one stair per repeat and stops after the chosen count", () => {
    renderDeck();
    click("解説3");
    click("3回");
    for (let i = 1; i <= 3; i++) {
      wait(850);
      expect(screen.getByTestId("loop-counter")).toHaveTextContent(`${i}/ 3 回`);
      expect(currentLine("loop-program")).toContain("1段のぼる");
    }
    wait(850);
    expect(currentLine("loop-program")).toContain("着いた");
    expect(screen.getByTestId("loop-caption")).toHaveTextContent("くり返しが終わり");
    wait(3000);
    expect(screen.getByTestId("loop-stage")).toHaveAttribute("data-count", "3");
  });
});
