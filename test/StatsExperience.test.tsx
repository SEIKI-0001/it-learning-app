// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DataUtilizationExperience from "@/components/experiences/DataUtilizationExperience";
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
  return render(
    <ExperienceSlideDeck>
      <DataUtilizationExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const failedChip = (container: HTMLElement) => [...container.querySelectorAll('[data-failed="true"]')].at(-1);

describe("probability and statistics block in the data utilization experience (reduced motion)", () => {
  it("④ builds the probability from 2 red cards out of 8", () => {
    reduceMotion();
    const { container } = renderDeck();
    click("解説4");
    expect(screen.getByText("ここから：確率・統計")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-red="true"]')).toHaveLength(2);
    expect(screen.getByTestId("st-prob-answer")).toHaveTextContent("1/4");
    expect(screen.getByText("確率 ＝ 欲しい結果の数 ÷ 起こり得る全部の数")).toBeInTheDocument();
  });

  it("⑤ shows mean, median and mode of the same data, switchable by the viewer", () => {
    reduceMotion();
    renderDeck();
    click("解説5");
    expect(screen.getByTestId("st-center-summary")).toHaveTextContent("平均54点");
    expect(screen.getByTestId("st-center-summary")).toHaveTextContent("中央値50点");
    click("平均");
    expect(screen.getByTestId("st-center")).toHaveAttribute("data-view", "mean");
    expect(screen.getByTestId("st-center-msg")).toHaveTextContent("合計270 ÷ 5人 ＝ 54点");
    click("中央値");
    expect(screen.getByTestId("st-center-msg")).toHaveTextContent("小さい順に並べて、ちょうど真ん中 ＝ 50点");
    click("最頻値");
    expect(screen.getByTestId("st-center-msg")).toHaveTextContent("一番多い ＝ 50点");
  });

  it("⑥ an outlier pulls the mean from 54 to 107 while the median stays 50", () => {
    reduceMotion();
    renderDeck();
    click("解説6");
    expect(screen.getByTestId("st-outlier")).toHaveAttribute("data-mean", "107");
    expect(screen.getByTestId("st-outlier-compare")).toHaveTextContent("54 → 107");
    expect(screen.getByTestId("st-outlier-compare")).toHaveTextContent("50 → 50");
    click("335 を 70 に戻す");
    expect(screen.getByTestId("st-outlier")).toHaveAttribute("data-mean", "54");
  });

  it("⑦ draws each point's distance to the shared mean and compares standard deviations", () => {
    reduceMotion();
    renderDeck();
    click("解説7");
    expect(screen.getAllByTestId("st-gap-A")).toHaveLength(4);
    expect(screen.getAllByTestId("st-gap-B")).toHaveLength(4);
    expect(screen.getByTestId("st-spread-sd")).toHaveTextContent("約1.4");
    expect(screen.getByTestId("st-spread-sd")).toHaveTextContent("約21");
    expect(screen.getByText("標準偏差が大きいほど、ばらつきが大きい")).toBeInTheDocument();
  });

  it("⑨ four staged questions return the idea that went wrong", () => {
    reduceMotion();
    const { container } = renderDeck();
    click("解説9");

    click("3/7");
    expect(failedChip(container)).toHaveTextContent("確率");
    click("次の問題へ →");

    click("60点");
    expect(screen.getByText(/並べ替えずに/)).toBeInTheDocument();
    expect(failedChip(container)).toHaveTextContent("代表値");
    click("次の問題へ →");

    click("平均の900万円");
    expect(failedChip(container)).toHaveTextContent("外れ値");
    click("次の問題へ →");

    expect(screen.getByText("Lv.4 本試験レベル")).toBeInTheDocument();
    click("Q組の方が、平均点が高い");
    expect(failedChip(container)).toHaveTextContent("ばらつき");
    expect(screen.getByText(/確率・代表値・ばらつきの問題に対応できます/)).toBeInTheDocument();
  });
});

describe("statistics animation", () => {
  it("levels the bars to the mean, then sorts them for the median", () => {
    vi.useFakeTimers();
    renderDeck();
    click("解説5");
    expect(screen.getByTestId("st-center")).toHaveAttribute("data-view", "raw");
    act(() => vi.advanceTimersByTime(1950));
    expect(screen.getByTestId("st-center")).toHaveAttribute("data-view", "mean");
    act(() => vi.advanceTimersByTime(4200));
    expect(screen.getByTestId("st-center")).toHaveAttribute("data-view", "median");
  });

  it("moves the mean line only after the outlier bar has grown", () => {
    vi.useFakeTimers();
    renderDeck();
    click("解説6");
    expect(screen.getByTestId("st-outlier")).toHaveAttribute("data-last", "70");
    act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByTestId("st-outlier")).toHaveAttribute("data-last", "335");
    expect(screen.getByTestId("st-outlier")).toHaveAttribute("data-mean", "54");
    act(() => vi.advanceTimersByTime(2100));
    expect(screen.getByTestId("st-outlier")).toHaveAttribute("data-mean", "107");
  });
});
