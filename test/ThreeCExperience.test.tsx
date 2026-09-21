// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ThreeCExperience from "@/components/experiences/ThreeCExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <ThreeCExperience />
    </ExperienceSlideDeck>,
  );
}

const board = () => screen.getByTestId("strategy-board");

describe("ThreeCExperience", () => {
  it("keeps the market map and the quiz with the Cost trap", () => {
    renderDeck();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    expect(screen.getByText("材料費が1個300円かかる")).toBeInTheDocument();
  });

  it("collects facts from each spot and assembles the strategy only when all three are in", () => {
    renderDeck();
    expect(screen.getByTestId("market-scene").querySelector('[data-illustration="crowd"]')).not.toBeNull();
    expect(board()).toHaveAttribute("data-count", "0");

    fireEvent.click(screen.getByRole("button", { name: /顧客を調べる/ }));
    expect(screen.getByTestId("fact-customer")).toHaveTextContent("安くて写真映え");
    expect(screen.getByTestId("research-result")).toHaveTextContent("放課後の学生");
    expect(board()).toHaveAttribute("data-count", "1");
    expect(screen.queryByTestId("strategy")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /競合を調べる/ }));
    expect(screen.getByTestId("fact-competitor")).toHaveTextContent("高い・提供が遅い");
    expect(screen.getByTestId("strategy-summary")).toHaveTextContent("調査 2 / 3");

    fireEvent.click(screen.getByRole("button", { name: /自社を調べる/ }));
    expect(board()).toHaveAttribute("data-complete", "true");
    expect(screen.getByTestId("strategy")).toHaveTextContent("ワンコインの映えクレープを、待たせず出す");
    expect(screen.getByTestId("strategy-summary")).toHaveTextContent("作戦が見えた");
  });

  it("rejects Cost from the strategy board", () => {
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: /材料費300円/ }));
    expect(screen.getByTestId("cost-reject")).toHaveTextContent("Cost（費用）は3Cに入らない");
    expect(board()).toHaveAttribute("data-count", "0");
  });
});
