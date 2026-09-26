// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DevProcessExperience from "@/components/experiences/DevProcessExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <DevProcessExperience />
    </ExperienceSlideDeck>,
  );
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("DevProcessExperience static explanation", () => {
  it("shows the artifact chain 要件定義書 → 設計書 → プログラム → テスト結果 without interaction", () => {
    renderDeck();
    expect(screen.getByTestId("dev-chain")).toHaveTextContent(/要件定義書.*設計書.*プログラム.*テスト結果/);
  });

  it("a late change ripples back to every earlier artifact, an early one touches only the first", () => {
    renderDeck();
    const early = screen.getByTestId("dev-ripple-0").querySelectorAll("[data-status='none']");
    const late = screen.getByTestId("dev-ripple-1").querySelectorAll("[data-status='none']");
    expect(early).toHaveLength(3);
    expect(late).toHaveLength(0);
    expect(screen.getByTestId("dev-ripple-1")).toHaveTextContent("直すのは 4つすべて");
  });

  it("keeps the comparison table and the quiz", () => {
    renderDeck();
    click("解説3");
    expect(screen.getByRole("heading", { name: /ウォーターフォールとアジャイルをくらべる/ })).toBeInTheDocument();
    click("解説4");
    expect(screen.getByRole("heading", { name: /これはどっち？/ })).toBeInTheDocument();
  });
});
