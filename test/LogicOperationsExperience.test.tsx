// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import LogicOperationsExperience from "@/components/experiences/LogicOperationsExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <LogicOperationsExperience />
    </ExperienceSlideDeck>,
  );
}
const click = (name: string | RegExp, n = 0) => fireEvent.click(screen.getAllByRole("button", { name })[n]);
const lit = () => screen.getByTestId("logic-lamp").getAttribute("data-lit");
const currentRow = (id: string) => within(screen.getByTestId(id)).getAllByRole("button").find((b) => b.getAttribute("aria-current"));

describe("LogicOperationsExperience", () => {
  it("sends the signal through the gate and moves the truth-table highlight with the switches", () => {
    renderDeck();
    expect(screen.getByTestId("logic-wire-a")).toHaveAttribute("data-on", "1");
    expect(screen.getByTestId("logic-wire-b")).toHaveAttribute("data-on", "0");
    expect(lit()).toBe("false");
    expect(currentRow("logic-table-live")).toHaveAccessibleName("A=1 B=0 の行");

    click(/入力B/);
    expect(screen.getByTestId("logic-wire-out")).toHaveAttribute("data-on", "1");
    expect(lit()).toBe("true");
    expect(currentRow("logic-table-live")).toHaveAccessibleName("A=1 B=1 の行");
    expect(screen.getByTestId("logic-rule")).toHaveTextContent("AもBも1 → 1");
  });

  it("XOR lights for exactly one input and goes dark when both are on", () => {
    renderDeck();
    click(/^XOR$/);
    expect(lit()).toBe("true");
    expect(screen.getByTestId("logic-rule")).toHaveTextContent("片方だけ1");
    click(/入力B/);
    expect(lit()).toBe("false");
    expect(screen.getByTestId("logic-rule")).toHaveTextContent("両方1＝同じ → 0");
  });

  it("tapping a truth-table row sets the switches", () => {
    renderDeck();
    click("A=0 B=0 の行");
    expect(screen.getByRole("button", { name: /入力A/ })).toHaveAccessibleName("入力A（今は0）");
    expect(screen.getByRole("button", { name: /入力B/ })).toHaveAccessibleName("入力B（今は0）");
    click(/^OR$/);
    expect(lit()).toBe("false");
    expect(screen.getByTestId("logic-rule")).toHaveTextContent("どちらも0 → 0");
  });

  it("the full truth table on slide 2 shares the same input and operation", () => {
    renderDeck();
    click(/^NOT$/);
    click("解説2");
    const table = screen.getByTestId("logic-table");
    expect(table).toHaveTextContent("NOT の出力");
    expect(table.querySelector('[aria-current="true"]')).toHaveTextContent("10");
  });
});
