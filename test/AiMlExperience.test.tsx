// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AiMlExperience from "@/components/experiences/AiMlExperience";
import { NEW_PET, PETS, predictPet } from "@/components/experiences/aiml/DogCatPlot";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <AiMlExperience />
    </ExperienceSlideDeck>,
  );
}

describe("AiMlExperience", () => {
  it("地図 → 3分類 → 教師あり → 教師なし → 強化 → 言い回し → 確認問題 の7枚", () => {
    renderDeck();
    expect(screen.getByTestId("ml-map")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "解説7" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "解説8" })).toBeNull();
    click("解説2");
    expect(screen.getByTestId("ml-types")).toHaveTextContent("教師あり学習");
    expect(screen.getByTestId("ml-types")).toHaveTextContent("教師なし学習");
    expect(screen.getByTestId("ml-types")).toHaveTextContent("強化学習");
    click("解説6");
    expect(screen.getByTestId("ml-phrases")).toHaveTextContent("ハルシネーション");
  });

  it("教師ありは正解付き＋境界線＋新しい写真、教師なしは同じ写真を正解なしで2グループに", () => {
    renderDeck();
    click("解説3");
    expect(screen.getByTestId("ml-supervised")).toHaveAttribute("data-mode", "labeled");
    expect(screen.getByTestId("ml-supervised-boundary")).toBeInTheDocument();
    expect(screen.getByTestId("ml-supervised-new")).toBeInTheDocument();
    expect(screen.getByTestId("ml-supervised-result")).toHaveTextContent("「犬」");
    click("解説4");
    expect(screen.getByTestId("ml-unsupervised-raw")).toHaveAttribute("data-mode", "raw");
    expect(screen.getByTestId("ml-unsupervised-grouped")).toHaveAttribute("data-mode", "grouped");
  });

  it("犬猫8枚は境界線で正しく分かれ、新しい写真は犬と判定される", () => {
    for (const p of PETS) expect(predictPet(p).kind).toBe(p.kind);
    expect(predictPet(NEW_PET)).toEqual({ kind: "dog", pct: expect.any(Number) });
    expect(predictPet(NEW_PET).pct).toBeGreaterThan(80);
  });
});
