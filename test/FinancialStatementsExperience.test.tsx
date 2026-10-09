// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import FinancialStatementsExperience from "@/components/experiences/FinancialStatementsExperience";
import { CAFE, INDICATORS, PL, PL_ROWS, TOTAL_ASSETS } from "@/components/experiences/finance/cafe";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <FinancialStatementsExperience />
    </ExperienceSlideDeck>,
  );
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("カフェの決算（全スライド共通の数字）", () => {
  it("BS がつり合い、PL の当期純利益が純資産の増加分と一致する", () => {
    expect(TOTAL_ASSETS).toBe(CAFE.bs.cl + CAFE.bs.fl + CAFE.bs.eq);
    expect(PL.net).toBe(CAFE.bs.eq - CAFE.openingEquity);
    expect(PL_ROWS.map((r) => r.name)).toEqual(["売上高", "売上総利益", "営業利益", "経常利益", "税引前当期純利益", "当期純利益"]);
    const r = Object.fromEntries(INDICATORS.map((i) => [i.key, (i.top.value / i.bottom.value) * 100]));
    expect(r).toEqual({ current: 200, equity: 40, opMargin: 15, roe: 17.5 });
  });
});

describe("FinancialStatementsExperience", () => {
  it("決算書 → BS → PL の順で、同じカフェの数字を読む", () => {
    renderDeck();
    expect(screen.getByText(/PLもBSも、決算書の中の1つ/)).toBeInTheDocument();
    click("解説2");
    expect(screen.getByText(/資産 1,000 ＝ 負債 600 ＋ 純資産 400/)).toBeInTheDocument();
    expect(screen.getByTestId("cafe-bs-ca")).toHaveTextContent("流動資産 300");
    click("解説3");
    expect(screen.getByTestId("cafe-pl-op")).toHaveTextContent("150");
    expect(screen.getByTestId("cafe-pl-net")).toHaveTextContent("70");
  });

  it("PLの利益が純資産に積もり、借入れはもうけではない", () => {
    renderDeck();
    click("解説4");
    expect(screen.getByTestId("story-link")).toHaveTextContent("330");
    expect(screen.getByTestId("story-link")).toHaveTextContent("400");
    expect(screen.getByTestId("story-bs-eq")).toHaveAttribute("data-on", "true");
    expect(screen.getByTestId("story-borrow")).toHaveTextContent("純資産 ±0");
  });

  it("指標も同じ数字から計算する", () => {
    renderDeck();
    click("解説5");
    expect(screen.getByTestId("story-ind-current")).toHaveTextContent("300 ÷ 150 × 100 ＝ 200%");
    expect(screen.getByTestId("story-ind-roe")).toHaveTextContent("17.5%");
  });

  it("確認問題：割る向きの逆は「割る」ステップで指摘する", () => {
    renderDeck();
    click("解説6");
    click("50%");
    expect(screen.getByText(/割る向きが逆/)).toBeInTheDocument();
  });
});
