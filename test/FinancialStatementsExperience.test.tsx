// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FinancialStatementsExperience from "@/components/experiences/FinancialStatementsExperience";
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
const next = () => click("1ステップ進む");
const val = (id: string) => screen.getByTestId(id).getAttribute("data-value");

describe("FinancialStatementsExperience", () => {
  it("keeps the BS / PL explanations and the sorting quiz", () => {
    renderDeck();
    expect(screen.getByText(/資産 ＝ 負債 ＋ 純資産/)).toBeInTheDocument();
    click("解説2");
    expect(screen.getByText(/利益 ＝ 収益 − 費用/)).toBeInTheDocument();
    click("解説4");
    expect(screen.getByText(/これは BS/)).toBeInTheDocument();
  });

  it("each transaction updates the BS snapshot and accumulates in the PL; profit flows into equity", () => {
    renderDeck();
    click("解説3");
    expect(screen.getByTestId("fin-balance")).toHaveTextContent("100 ＝ 0 ＋ 100");
    next(); // 仕入れ
    expect(val("fin-cash")).toBe("60");
    expect(val("fin-goods")).toBe("40");
    expect(screen.getByTestId("fin-pl-still")).toBeInTheDocument();
    next(); // 販売
    expect(val("fin-goods")).toBe("0");
    expect(screen.getByTestId("fin-pl-rows")).toHaveTextContent("売上原価");
    expect(screen.getByTestId("fin-profit")).toHaveTextContent("30");
    expect(val("fin-equity")).toBe("130");
    next(); // 借入
    expect(val("fin-loan")).toBe("50");
    expect(screen.getByTestId("fin-pl-still")).toBeInTheDocument();
    expect(screen.getByTestId("fin-profit")).toHaveTextContent("30");
    next(); // 給料
    expect(screen.getByTestId("fin-profit")).toHaveTextContent("10");
    expect(screen.getByTestId("fin-balance")).toHaveTextContent("160 ＝ 50 ＋ 110");
    next();
    expect(screen.getByTestId("fin-summary")).toHaveTextContent("ある時点の状態");
  });
});

describe("FinancialStatementsExperience ratios", () => {
  function reduceMotion() {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
  }
  afterEach(() => vi.unstubAllGlobals());

  it("1年ルール sorts items into 流動・固定", () => {
    reduceMotion();
    renderDeck();
    click("解説5");
    expect(screen.getByTestId("fin-split-ca")).toHaveTextContent("売掛金");
    expect(screen.getByTestId("fin-split-fl")).toHaveTextContent("長期借入金");
  });

  it("流動比率 uses only the two current blocks → 200%; 自己資本比率 → 40%", () => {
    reduceMotion();
    renderDeck();
    click("解説6");
    expect(screen.getByTestId("fin-ratio-block-ca")).toHaveAttribute("data-glow", "true");
    expect(screen.getByTestId("fin-ratio-block-fa")).not.toHaveAttribute("data-glow");
    expect(screen.getByTestId("fin-ratio-eq")).toHaveTextContent("200%");
    click("自己資本比率");
    expect(screen.getByTestId("fin-ratio-eq")).toHaveTextContent("40%");
  });

  it("PL shows the five profit stages in order", () => {
    reduceMotion();
    renderDeck();
    click("解説7");
    expect(screen.getByTestId("fin-pl-営業利益")).toHaveTextContent("150");
    expect(screen.getByTestId("fin-pl-当期純利益")).toHaveTextContent("80");
  });

  it("PL-only filter keeps only 売上高利益率", () => {
    renderDeck();
    click("解説8");
    click("PLだけで計算できる？");
    expect(screen.getByTestId("fin-ind-流動比率")).toHaveAttribute("data-dim", "true");
    expect(screen.getByTestId("fin-ind-売上高○○利益率")).not.toHaveAttribute("data-dim");
  });

  it("practice: reversed division is flagged at the 割る step", () => {
    renderDeck();
    click("解説9");
    click("50%");
    expect(screen.getByText(/割る向きが逆/)).toBeInTheDocument();
  });
});
