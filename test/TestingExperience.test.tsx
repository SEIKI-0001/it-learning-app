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
const caught = (id: string) => screen.getByTestId(`bug-${id}`).getAttribute("data-caught");

describe("TestingExperience bug pipeline", () => {
  it("every bug is caught at its own gate when all tests run", () => {
    renderDeck();
    click(/リリースする/);
    for (const id of ["unit", "integration", "system", "accept"]) expect(caught(id)).toBe("true");
    expect(screen.getByTestId("test-cost")).toHaveTextContent("×44");
  });

  it("skipping a test lets only that kind of bug fall through to production", () => {
    renderDeck();
    click("結合テストを省く");
    click(/リリースする/);
    expect(caught("integration")).toBe("false");
    expect(caught("unit")).toBe("true");
    expect(caught("system")).toBe("true");
    expect(screen.getByTestId("test-result")).toHaveTextContent("「カートと決済のつなぎ目でエラー」がすり抜け（×100）");
    expect(screen.getByTestId("test-cost")).toHaveTextContent("×141");
  });

  it("toggling a gate after release resets the run", () => {
    renderDeck();
    click(/リリースする/);
    click("単体テストを省く");
    expect(screen.queryByTestId("bug-unit")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /リリースする/ })).toBeInTheDocument();
  });
});

describe("TestingExperience V-model", () => {
  it("choosing a design step draws the line to its matching test", () => {
    renderDeck();
    click("解説2");
    expect(screen.queryByTestId("v-link")).not.toBeInTheDocument();
    click("詳細設計");
    expect(screen.getByTestId("v-diagram")).toHaveAttribute("data-sel", "2");
    expect(screen.getByTestId("v-link")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "結合テスト" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/で捕まえたバグ/)).toHaveTextContent("つなぎ目のバグ");
    expect(screen.getByText(/回帰（リグレッション）テスト/)).toBeInTheDocument();
  });

  it("keeps the quiz", () => {
    renderDeck();
    click("解説3");
    expect(screen.getByRole("heading", { name: /これはどの段階？/ })).toBeInTheDocument();
  });
});
