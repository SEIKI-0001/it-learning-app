// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import WbsGanttExperience from "@/components/experiences/WbsGanttExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <WbsGanttExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const start = (t: string) => screen.getByTestId(`gantt-bar-${t}`).getAttribute("data-start");

describe("WbsGanttExperience", () => {
  it("WBS: tapping a task splits only that task into smaller tasks", () => {
    renderDeck();
    click(/文化祭の出し物/);
    click(/看板づくり/);
    expect(screen.getByTestId("wbs-subs-看板づくり")).toHaveTextContent("デザイン");
    expect(screen.queryByTestId("wbs-subs-買い出し")).toBeNull();
    click(/買い出し/);
    click(/当日係/);
    expect(screen.getByTestId("wbs-next")).toHaveTextContent("日付はない");
  });

  it("Gantt: a 2-day delay in shopping cascades down its dependents and pushes completion past the festival", () => {
    renderDeck();
    click("解説2");
    expect(screen.getByTestId("gantt-finish")).toHaveAttribute("data-day", "7");
    click(/買い出し \+2日/);
    expect(start("買い出し")).toBe("3");
    expect(start("飾りつけ")).toBe("5");
    expect(start("リハーサル")).toBe("7");
    expect(start("看板づくり")).toBe("0");
    expect(screen.getByTestId("gantt-finish")).toHaveTextContent("2日オーバー");
  });

  it("Gantt: the same delay on a task with slack does not move the deadline (critical path)", () => {
    renderDeck();
    click("解説2");
    click(/看板 \+2日/);
    expect(start("看板づくり")).toBe("2");
    expect(start("リハーサル")).toBe("5");
    expect(screen.getByTestId("gantt-slack")).toHaveTextContent("余裕2日");
    expect(screen.getByTestId("gantt-verdict")).toHaveTextContent("クリティカルパス");
  });

  it("keeps the WBS or Gantt quiz", () => {
    renderDeck();
    click("解説3");
    expect(screen.getByText("これはどっち？")).toBeInTheDocument();
  });
});
