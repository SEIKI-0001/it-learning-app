// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BreakEvenExperience from "@/components/experiences/BreakEvenExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <BreakEvenExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const setQty = (n: number) => fireEvent.change(screen.getByRole("slider", { name: "販売数" }), { target: { value: String(n) } });

describe("BreakEvenExperience", () => {
  it("keeps fixed / variable costs and the quiz", () => {
    renderDeck();
    expect(screen.getByText("2種類の費用を知ろう")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByText("固定費？ 変動費？")).toBeInTheDocument();
  });

  it("below 50 is a loss, exactly 50 is the break-even point where the lines cross, above 50 is a profit", () => {
    renderDeck();
    click("解説2");
    expect(screen.getByTestId("be-point")).toHaveAttribute("data-qty", "50");
    setQty(49);
    expect(screen.getByTestId("be-status")).toHaveTextContent("赤字");
    expect(screen.getByTestId("be-gap")).toHaveAttribute("stroke", "#f43f5e");
    setQty(50);
    expect(screen.getByTestId("be-status")).toHaveTextContent("ちょうど損益分岐点");
    expect(screen.getByTestId("be-profit")).toHaveTextContent("+0円");
    setQty(51);
    expect(screen.getByTestId("be-status")).toHaveTextContent("黒字");
    expect(screen.getByTestId("be-gap")).toHaveAttribute("stroke", "#10b981");
    expect(screen.getAllByText(/限界利益/).length).toBeGreaterThan(0);
  });

  it("changing one condition moves the break-even point left or right", () => {
    renderDeck();
    click("解説2");
    click("出店料UP");
    click(/損益分岐点（75個）に合わせる/);
    expect(screen.getByTestId("be-status")).toHaveTextContent("ちょうど損益分岐点");
    expect(screen.getByTestId("be-note")).toHaveTextContent("交点は右へ");
    click("値上げ");
    expect(screen.getByRole("button", { name: /損益分岐点（25個）に合わせる/ })).toBeInTheDocument();
    click("仕入れ値DOWN");
    expect(screen.getByRole("button", { name: /損益分岐点（40個）に合わせる/ })).toBeInTheDocument();
  });
});
