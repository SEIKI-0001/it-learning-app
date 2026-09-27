// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import TestingExperience from "@/components/experiences/TestingExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <TestingExperience />
    </ExperienceSlideDeck>,
  );
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("TestingExperience static explanation", () => {
  it("shows all four test levels with their target without any interaction", () => {
    renderDeck();
    const scope = screen.getByTestId("test-scope");
    expect(scope).toHaveTextContent("見る対象：部品1つ");
    expect(scope).toHaveTextContent("見る対象：部品どうしのつながり");
    expect(scope).toHaveTextContent("見る対象：システム全体");
    expect(scope).toHaveTextContent("見る対象：実際の利用・業務");
  });

  it("maps each design step to its test in the V model", () => {
    renderDeck();
    click("解説2");
    expect(screen.getByTestId("v-pairs")).toHaveTextContent("内部設計（詳細設計） → 結合テスト");
  });

  it("keeps the quiz", () => {
    renderDeck();
    click("解説3");
    expect(screen.getByRole("heading", { name: /これはどの段階？/ })).toBeInTheDocument();
  });
});
