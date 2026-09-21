// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ValueChainExperience from "@/components/experiences/ValueChainExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <ValueChainExperience />
    </ExperienceSlideDeck>,
  );
}

const visibleScene = () => screen.getAllByTestId("factory-scene").find((el) => !el.closest("[aria-hidden='true']"))!;
const inScene = (sel: string) => visibleScene().querySelector(sel);

describe("ValueChainExperience", () => {
  it("keeps main flow, support activities and the quiz", () => {
    renderDeck();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "解説3" }));
    expect(screen.getByText("社員を採用し、研修で育てる")).toBeInTheDocument();
  });

  it("moves the product through five stations and stacks value up to the margin", () => {
    renderDeck();
    expect(inScene('[data-testid="product"]')).toHaveAttribute("data-at", "0");
    expect(inScene('[data-testid="value-column"]')).toHaveAttribute("data-total", "15");

    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    expect(inScene('[data-testid="product"]')).toHaveTextContent("🪑");
    expect(inScene('[data-node="operations"]')).toHaveAttribute("data-state", "active");
    expect(inScene('[data-testid="value-column"]')).toHaveAttribute("data-total", "40");

    fireEvent.click(screen.getByRole("button", { name: "STEP 6：マージン" }));
    expect(inScene('[data-testid="value-column"]')).toHaveAttribute("data-total", "90");
    expect(inScene('[data-testid="margin-block"]')).toHaveTextContent("マージン 20");
    expect(screen.getByTestId("vc-state")).toHaveTextContent("マージン（利益）");
  });

  it("stopping procurement stops raw materials and manufacturing", () => {
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    fireEvent.click(screen.getByRole("button", { name: /調達/ }));
    expect(inScene('[data-support="procurement"]')).toHaveAttribute("data-state", "off");
    expect(inScene('[data-node="inbound"]')).toHaveAttribute("data-state", "error");
    expect(inScene('[data-node="operations"]')).toHaveAttribute("data-state", "error");
    expect(inScene('[data-testid="note-inbound"]')).toHaveTextContent("原材料が届かない");
    expect(inScene('[data-testid="note-operations"]')).toHaveTextContent("製造停止");
    expect(inScene('[data-testid="product"]')).toHaveAttribute("data-blocked", "true");
    expect(screen.getByTestId("support-result")).toHaveTextContent("ラインがそもそも動かせない");
  });

  it("stopping tech development shrinks the margin", () => {
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    expect(inScene('[data-testid="margin-block"]')).toHaveTextContent("マージン 20");
    fireEvent.click(screen.getByRole("button", { name: /技術開発/ }));
    expect(inScene('[data-testid="margin-block"]')).toHaveTextContent("マージン 5");
  });
});
