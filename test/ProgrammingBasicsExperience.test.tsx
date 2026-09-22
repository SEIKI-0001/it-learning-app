// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProgrammingBasicsExperience from "@/components/experiences/ProgrammingBasicsExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

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

describe("ProgrammingBasicsExperience", () => {
  it("keeps the named-box analogy and the assignment warning", () => {
    renderDeck();
    expect(screen.getByText("箱の名前：りんごの数")).toBeInTheDocument();
    click("5個");
    expect(screen.getByText("500円")).toBeInTheDocument();
    expect(screen.getByText(/代入/, { selector: "b" })).toBeInTheDocument();
  });

  it("assignment: 10 goes into score, then 20 replaces it", () => {
    renderDeck();
    expect(screen.queryByTestId("assign-value")).toBeNull();
    click("▶ 1行実行");
    expect(screen.getByTestId("assign-value")).toHaveTextContent("10");
    click("▶ 1行実行");
    expect(screen.getByTestId("assign-value")).toHaveTextContent("20");
    expect(screen.getByTestId("assign-ejected")).toHaveTextContent("10");
    expect(screen.getByTestId("assign-note")).toHaveTextContent("置き換わる");
    expect(screen.getByRole("button", { name: "▶ 1行実行" })).toBeDisabled();
  });

  it("branch: the token takes the umbrella route when it rains and the direct route otherwise", () => {
    renderDeck();
    click("解説2");
    click("▶ 実行する");
    expect(screen.getByTestId("rain-stage")).toHaveAttribute("data-route", "rain");
    expect(screen.getByTestId("rain-result")).toHaveTextContent("はい：傘の道");
    click("☀️ 晴れ");
    expect(screen.getByTestId("rain-stage")).toHaveAttribute("data-route", "none");
    click("▶ 実行する");
    expect(screen.getByTestId("rain-stage")).toHaveAttribute("data-route", "sun");
    expect(screen.getByTestId("rain-result")).toHaveTextContent("いいえ");
  });

  it("loop: the counter goes 1 → 5 and then the loop exits", () => {
    renderDeck();
    click("解説3");
    for (let i = 1; i <= 5; i++) {
      click(/1回まわす/);
      expect(screen.getByTestId("loop-counter")).toHaveTextContent(`${i}/ 5 回`);
    }
    expect(screen.getByText("5回目：")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /完了/ })).toBeDisabled();
  });

  it("loop can run automatically five times", () => {
    vi.useFakeTimers();
    renderDeck();
    click("解説3");
    click("自動で5回");
    for (let i = 0; i < 6; i++) {
      act(() => {
        vi.advanceTimersByTime(1200);
      });
    }
    expect(screen.getByTestId("loop-stage")).toHaveAttribute("data-count", "5");
  });
});
