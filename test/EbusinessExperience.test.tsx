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
    expect(screen.getByTestId("ebiz-steps")).toHaveTextContent("顧客 → ショップ：代金を払う");
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
    expect(screen.getAllByTestId("ebiz-steps")).toHaveLength(1);
  });

  it("keeps the quiz on the second slide", () => {
    renderDeck();
    click("解説2");
    expect(screen.getByRole("heading", { name: /これはどれ？/ })).toBeInTheDocument();
  });
});
