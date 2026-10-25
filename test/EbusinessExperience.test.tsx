// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import EbusinessExperience from "@/components/experiences/EbusinessExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <EbusinessExperience />
    </ExperienceSlideDeck>,
  );
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const kinds = () => screen.getAllByTestId("ebiz-lane").map((l) => l.getAttribute("data-kind"));
const on = (k: string) => screen.getByTestId(`ebiz-node-${k}`).getAttribute("data-on");

describe("EbusinessExperience trade map", () => {
  it("EC moves order, money and goods between the customer and the shop", () => {
    renderDeck();
    click(/EC/);
    expect(kinds()).toEqual(["info", "money", "goods"]);
    expect(on("compA")).toBe("true");
    expect(on("persA")).toBe("true");
    expect(on("compB")).toBe("false");
    expect(screen.getByTestId("ebiz-map-caption")).toHaveTextContent("顧客が注文・支払い");
    expect(screen.getByText(/CtoC/)).toBeInTheDocument();
  });

  it("EDI carries only data between two companies", () => {
    renderDeck();
    click(/EDI/);
    expect(kinds()).toEqual(["info", "info", "info"]);
    expect(on("compA")).toBe("true");
    expect(on("compB")).toBe("true");
    expect(on("persA")).toBe("false");
  });

  it("fintech goes through the smartphone, sharing through the platform", () => {
    renderDeck();
    expect(screen.queryByTestId("ebiz-node-phone")).not.toBeInTheDocument();
    click(/フィンテック/);
    expect(on("phone")).toBe("true");
    expect(screen.queryByTestId("ebiz-node-platform")).not.toBeInTheDocument();
    click(/シェアリング/);
    expect(on("platform")).toBe("true");
    expect(on("persB")).toBe("true");
    expect(on("compA")).toBe("false");
    expect(kinds()).toContain("goods");
    expect(screen.getAllByTestId("ebiz-map-caption")).toHaveLength(1);
  });

  it("keeps the quiz on the second slide", () => {
    renderDeck();
    click("解説2");
    expect(screen.getByRole("heading", { name: /これはどれ？/ })).toBeInTheDocument();
  });
});

describe("EbusinessExperience exam terms", () => {
  it("adds four slides after the quiz", () => {
    renderDeck();
    expect(screen.getByText("1 / 6")).toBeInTheDocument();
  });

  it("sorts crowdfunding by what the backer receives and explains escrow", () => {
    renderDeck();
    click("解説3");
    const types = screen.getByTestId("crowdfunding-types");
    expect(types.querySelectorAll("[data-term]")).toHaveLength(4);
    expect(types.querySelector('[data-term="投資型"]')).toHaveTextContent("匿名組合契約");
    expect(screen.getByTestId("escrow")).toHaveTextContent("代金を払ったのに商品が届かない");
  });

  it("separates freemium from subscription, the other free words and ad types", () => {
    renderDeck();
    click("解説4");
    expect(screen.getByTestId("pricing-models").querySelector('[data-term="フリーミアム"]')).toHaveTextContent("追加の機能やサービスを有料");
    expect(screen.getByTestId("pricing-models").querySelector('[data-term="サブスクリプション"]')).toHaveTextContent("定額の料金");
    expect(screen.getByTestId("free-words").querySelectorAll("[data-term]")).toHaveLength(3);
    expect(screen.getByTestId("ad-types").querySelector('[data-term="リスティング広告"]')).toHaveTextContent("キーワードに連動");
  });

  it("covers fintech, open API and blockchain", () => {
    renderDeck();
    click("解説5");
    expect(screen.getByText(/接続仕様（API）を外部に公開/)).toBeInTheDocument();
    expect(screen.getByText(/改ざんや不整合を防げる/)).toBeInTheDocument();
    expect(screen.getByText(/ベンチャー企業と組む/)).toBeInTheDocument();
  });

  it("checks the last quiz", () => {
    renderDeck();
    click("解説6");
    click("エスクロー");
    expect(screen.getByText(/仲介者が代金を預かる/)).toBeInTheDocument();
    click("フリーライド");
    expect(screen.getByText(/正解は「フリーミアム」/)).toBeInTheDocument();
  });
});
