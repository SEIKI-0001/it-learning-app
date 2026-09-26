// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WbsGanttExperience from "@/components/experiences/WbsGanttExperience";
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
      <WbsGanttExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const inStage = (stage: string) => within(screen.getByTestId(stage));
const failedChip = (container: HTMLElement) => [...container.querySelectorAll('[data-failed="true"]')].at(-1);

describe("PERT slides in the WBS/Gantt experience (reduced motion)", () => {
  it("keeps the existing critical-path concept slides first", () => {
    reduceMotion();
    renderDeck();
    click("解説2");
    expect(screen.getByTestId("gantt-finish")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByText("これはどっち？")).toBeInTheDocument();
  });

  it("④ a single line of tasks adds up: 3 + 5 = 8 days", () => {
    reduceMotion();
    renderDeck();
    click("解説4");
    expect(screen.getByTestId("pert-line-eq")).toHaveTextContent("3 ＋ 5 ＝ 8日");
    expect(inStage("pert-line").getByTestId("pert-finish")).toHaveTextContent("8日");
  });

  it("⑤ parallel tasks: C finishes early and waits, D cannot start yet", () => {
    reduceMotion();
    renderDeck();
    click("解説5");
    expect(inStage("pert-parallel").getByTestId("pert-wait-C")).toHaveTextContent("待機");
    expect(screen.getByText("🔒 B と C の両方を待つ")).toBeInTheDocument();
    expect(screen.getByText("並行作業は、全部の日数を足すわけではない")).toBeInTheDocument();
  });

  it("⑥ D starts after B: 3 + 5 + 4 = 12 days, C is not added", () => {
    reduceMotion();
    renderDeck();
    click("解説6");
    expect(screen.getByTestId("pert-total-eq")).toHaveTextContent("3 ＋ 5 ＋ 4 ＝ 12日");
    expect(inStage("pert-total").getByTestId("pert-bar-D")).toHaveAttribute("data-on", "true");
  });

  it("⑦ compares both routes and marks the 12-day route as the critical path", () => {
    reduceMotion();
    renderDeck();
    click("解説7");
    expect(screen.getByTestId("pert-route-ABD")).toHaveTextContent("3 ＋ 5 ＋ 4 ＝ 12日");
    expect(screen.getByTestId("pert-route-ACD")).toHaveTextContent("3 ＋ 2 ＋ 4 ＝ 9日");
    expect(screen.getByTestId("pert-route-ABD")).toHaveAttribute("data-critical", "true");
    expect(inStage("pert-diagram").getByTestId("pert-edge-B")).toHaveAttribute("data-state", "critical");
    expect(inStage("pert-diagram").getByTestId("pert-edge-C")).toHaveAttribute("data-state", "dim");
    click("解説8");
    expect(screen.getByText("経路を探す → 日数を足す → 最長を選ぶ")).toBeInTheDocument();
    expect(screen.getByText(/最短で何日で終わるか/)).toBeInTheDocument();
  });

  it("⑨ three staged questions return the step that went wrong", () => {
    reduceMotion();
    const { container } = renderDeck();
    click("解説9");

    click("24日");
    expect(failedChip(container)).toHaveTextContent("② 日数を足す");
    click("次の問題へ →");

    click("12日");
    expect(screen.getByText(/並行する B と C を両方足しています/)).toBeInTheDocument();
    expect(failedChip(container)).toHaveTextContent("③ 最長を選ぶ");
    click("次の問題へ →");

    expect(screen.getByText("Lv.3 本試験レベル")).toBeInTheDocument();
    expect(screen.getByTestId("pert-exam-diagram")).toBeInTheDocument();
    click("8日");
    expect(failedChip(container)).toHaveTextContent("① 経路を探す");
    expect(screen.getByTestId("pert-exam-diagram").querySelector('[data-testid="pert-edge-D"]')).toHaveAttribute("data-state", "critical");
    expect(screen.getByText(/本試験のアローダイアグラムの日数計算に対応できます/)).toBeInTheDocument();
  });
});

describe("PERT animation", () => {
  it("grows A first, then B after A, then shows the total", () => {
    vi.useFakeTimers();
    renderDeck();
    click("解説4");
    expect(inStage("pert-line").getByTestId("pert-bar-A")).toHaveAttribute("data-on", "false");
    act(() => vi.advanceTimersByTime(1050));
    expect(inStage("pert-line").getByTestId("pert-bar-A")).toHaveAttribute("data-on", "true");
    expect(inStage("pert-line").getByTestId("pert-bar-B")).toHaveAttribute("data-on", "false");
    act(() => vi.advanceTimersByTime((3 * 560 + 500) * 1.5));
    expect(inStage("pert-line").getByTestId("pert-bar-B")).toHaveAttribute("data-on", "true");
    expect(screen.queryByTestId("pert-line-eq")).not.toBeInTheDocument();
  });
});

describe("mgmt-wbs-gantt check questions", () => {
  it("keeps the four existing questions and adds the exam-style PERT calculation", () => {
    const topic = getTopicById("mgmt-wbs-gantt");
    expect(topic?.checkQuestions).toHaveLength(5);
    expect(topic?.checkQuestions[3].prompt).toContain("遅れが許されない");
    expect(topic?.checkQuestions[4]).toMatchObject({ id: "mgmt-wbs-gantt-q5" });
    expect(topic?.checkQuestions[4].prompt).toContain("最短所要日数");
  });
});
