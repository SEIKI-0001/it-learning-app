// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SqlExperience from "@/components/experiences/SqlExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <SqlExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const next = () => click("1ステップ進む");
const table = () => screen.getByTestId("sql-table");

describe("SqlExperience", () => {
  it("keeps the SQL shape, the mini SQL sandbox and the command recap as slides", () => {
    renderDeck();
    expect(screen.getByRole("heading", { name: "1SQLの形（取り出す命令）" })).toBeInTheDocument();
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByRole("heading", { name: "3ミニSQL：選ぶと結果が変わる" })).toBeInTheDocument();
    click("解説4");
    expect(screen.getByText("INSERT")).toBeInTheDocument();
  });

  it("SELECT shrinks away the unselected column while its clause lights up", () => {
    renderDeck();
    click("解説2");
    expect(table()).toHaveAttribute("data-cols", "name,klass,score");
    next();
    expect(screen.getByTestId("sql-token-SELECT")).toHaveAttribute("data-on", "true");
    next();
    expect(table()).toHaveAttribute("data-cols", "name,score");
  });

  it("WHERE greys out non-matching rows, then removes them", () => {
    renderDeck();
    click("解説2");
    click(/^WHERE$/);
    next();
    expect(screen.getByTestId("sql-row-鈴木")).toHaveAttribute("data-state", "miss");
    expect(screen.getByTestId("sql-row-佐藤")).toHaveAttribute("data-state", "hit");
    next();
    expect(screen.getByTestId("sql-row-鈴木")).toHaveAttribute("data-state", "gone");
    expect(table()).toHaveAttribute("data-rows", "3");
  });

  it("ORDER BY actually moves rows into score order", () => {
    renderDeck();
    click("解説2");
    click(/^ORDER BY$/);
    expect(screen.getByTestId("sql-row-佐藤")).toHaveAttribute("data-pos", "2");
    next();
    next();
    expect(screen.getByTestId("sql-row-佐藤")).toHaveAttribute("data-pos", "0");
    expect(screen.getByTestId("sql-row-鈴木")).toHaveAttribute("data-pos", "4");
  });

  it("combined query: filter rows first, then keep only the name column", () => {
    renderDeck();
    click("解説2");
    click("組み合わせ");
    for (let i = 0; i < 4; i++) next();
    expect(table()).toHaveAttribute("data-rows", "3");
    expect(table()).toHaveAttribute("data-cols", "name");
  });
});
