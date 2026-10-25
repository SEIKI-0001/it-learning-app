// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import GenerativeAiDxExperience from "@/components/experiences/GenerativeAiDxExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <GenerativeAiDxExperience />
    </ExperienceSlideDeck>,
  );
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("生成AIとDX", () => {
  it("keeps the DX definition and the 3-column comparison agreed on 10/9", () => {
    renderDeck();
    expect(screen.getByText("1 / 8")).toBeInTheDocument();
    click("解説2");
    expect(screen.getByTestId("dx-definition")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByTestId("dx-compare")).toHaveTextContent("デジタライゼーション");
  });

  it("explains foundation models, fine-tuning and prompt engineering", () => {
    renderDeck();
    click("解説5");
    expect(screen.getByTestId("foundation-flow")).toHaveTextContent(/大量のデータで訓練.*基盤モデル.*ファインチューニング/);
    expect(screen.getByTestId("prompt-engineering")).toHaveTextContent("出力形式の指定");
    expect(screen.getByTestId("genai-terms").querySelector('[data-term="ハルシネーション"]')).toHaveTextContent("事実と異なる");
  });

  it("lists the three basic ideals and the seven AI social principles", () => {
    renderDeck();
    click("解説6");
    expect(within(screen.getByTestId("ai-ideals")).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByTestId("ai-ideals")).toHaveTextContent("持続性ある社会");
    const principles = screen.getByTestId("ai-principles");
    expect(principles.querySelectorAll("[data-term]")).toHaveLength(7);
    expect(principles.querySelector('[data-term="イノベーション"]')).toHaveTextContent("柔軟な人材の移動");
    expect(principles.querySelector('[data-term="人間中心"]')).toHaveTextContent("人が判断・決定");
  });

  it("tells the 'digital ...' terms apart", () => {
    renderDeck();
    click("解説7");
    const terms = screen.getByTestId("digital-terms");
    expect(terms.querySelector('[data-term="デジタルディスラプション"]')).toHaveTextContent("業界の構造を破壊");
    expect(terms.querySelector('[data-term="デジタルディバイド"]')).toHaveTextContent("格差");
  });

  it("checks with three choices per question", () => {
    renderDeck();
    click("解説8");
    const quiz = screen.getByTestId("genai-quiz");
    fireEvent.click(within(quiz).getByRole("button", { name: "基盤モデル" }));
    expect(quiz).toHaveTextContent("正解！");
    fireEvent.click(within(quiz).getByRole("button", { name: "持続性ある社会" }));
    expect(quiz).toHaveTextContent("正解は「労働からの解放」");
  });
});
