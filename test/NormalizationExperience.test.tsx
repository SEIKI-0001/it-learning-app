// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import NormalizationExperience from "@/components/experiences/NormalizationExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <NormalizationExperience />
    </ExperienceSlideDeck>,
  );
}

const next = () => fireEvent.click(screen.getByRole("button", { name: "次へ進む →" }));
const board = () => screen.getByTestId("morph-board");
const tableIds = () => [...board().querySelectorAll("[data-table]")].map((el) => el.getAttribute("data-table"));
const field = (table: string, f: string) => board().querySelector(`[data-table="${table}"] [data-field="${f}"]`);

describe("NormalizationExperience", () => {
  it("walks 非正規形 → 1NF → 2NF → 3NF and splits the tables", () => {
    renderDeck();
    expect(tableIds()).toEqual(["slip"]);
    expect(field("slip", "prodNo")).toHaveAttribute("data-repeating", "true");

    next();
    expect(tableIds()).toEqual(["flat"]);
    // 繰り返しを展開すると、注文・顧客・商品の情報が重複する
    expect(field("flat", "custName")?.querySelectorAll('[data-dup="true"]')).toHaveLength(2);

    next();
    expect(screen.getByText("第2正規形：主キーの一部で決まる項目を分離")).toBeInTheDocument();
    expect(tableIds()).toEqual(["orders", "products", "details"]);
    expect(field("orders", "custName")).toHaveTextContent("顧客番号で決まる");

    next();
    expect(tableIds()).toEqual(["orders", "customers", "details", "products"]);
    expect(field("orders", "custName")).toBeNull();
    expect(field("customers", "custName")).not.toBeNull();
  });

  it("keeps the same visual id and colour group for a field across stages", () => {
    renderDeck();
    const before = field("slip", "price");
    expect(before).toHaveAttribute("data-flip-id", "price");
    expect(before).toHaveAttribute("data-group", "product");
    next();
    next();
    next();
    expect(field("products", "price")).toHaveAttribute("data-flip-id", "price");
    expect(field("products", "price")).toHaveAttribute("data-group", "product");
    expect(field("customers", "custName")).toHaveAttribute("data-group", "customer");
  });

  it("shows the update anomaly in 1NF and a single fix in 3NF", () => {
    renderDeck();
    next();
    fireEvent.click(screen.getByRole("button", { name: "🍎 100円 → 120円に" }));
    expect(field("flat", "price")?.querySelectorAll('[data-conflict="true"]')).toHaveLength(2);
    expect(screen.getByTestId("price-result")).toHaveTextContent("食い違う");

    next();
    next();
    expect(field("products", "price")?.querySelectorAll('[data-conflict="true"]')).toHaveLength(0);
    expect(field("products", "price")).toHaveTextContent("120");
    expect(screen.getByTestId("price-result")).toHaveTextContent("1か所");
  });

  it("keeps the functional dependency notes and the 3-line summary", () => {
    renderDeck();
    next();
    expect(screen.getByText("商品番号 → 商品名, 単価")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    expect(screen.getByText(/推移的関数従属の排除/)).toBeInTheDocument();
  });
});
