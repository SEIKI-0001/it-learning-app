// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ManagementSystemsExperience from "@/components/experiences/ManagementSystemsExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <ManagementSystemsExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const on = (key: string) => screen.getByTestId(`mgmt-node-${key}`).getAttribute("data-on");

describe("ManagementSystemsExperience", () => {
  it("SCM covers the whole flow from supplier to customer but not back-office", () => {
    renderDeck();
    click(/SCM/);
    expect(screen.getByTestId("mgmt-map")).toHaveAttribute("data-sys", "scm");
    expect(on("supplier")).toBe("true");
    expect(on("customer")).toBe("true");
    expect(on("acct")).toBe("false");
    expect(screen.getByTestId("mgmt-region")).toHaveTextContent("モノの流れ");
  });

  it("CRM covers sales, support and the customer only", () => {
    renderDeck();
    click(/CRM/);
    expect(on("customer")).toBe("true");
    expect(on("support")).toBe("true");
    expect(on("supplier")).toBe("false");
    expect(on("make")).toBe("false");
    expect(screen.getByTestId("mgmt-region")).toHaveTextContent("顧客との関係");
  });

  it("ERP covers every department inside the company and gathers data into one DB", () => {
    renderDeck();
    click(/ERP/);
    for (const k of ["procure", "stock", "make", "sales", "acct", "hr", "support"]) expect(on(k)).toBe("true");
    expect(on("supplier")).toBe("false");
    expect(on("customer")).toBe("false");
    expect(screen.getByTestId("mgmt-db")).toBeInTheDocument();
    click(/CRM/);
    click(/SCM/);
    expect(screen.getByText(/3つとも光らせた/)).toBeInTheDocument();
  });

  it("keeps the sorting quiz", () => {
    renderDeck();
    click("解説2");
    expect(screen.getByText("このシステムはどれ？")).toBeInTheDocument();
  });
});
