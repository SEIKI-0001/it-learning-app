// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import MaintenanceTypesExperience from "@/components/experiences/MaintenanceTypesExperience";
import { getTopicExperience } from "@/components/experiences/registry";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <MaintenanceTypesExperience />
    </ExperienceSlideDeck>,
  );
}

describe("MaintenanceTypesExperience", () => {
  it("is the experience of the operation/maintenance topic", () => {
    expect(getTopicExperience("mgmt-operation-maintenance")).toBe(MaintenanceTypesExperience);
  });

  it("lays out the four maintenance types as a 2x2 picture map and explains the tapped one", () => {
    renderDeck();
    for (const kind of ["corrective", "preventive", "adaptive", "perfective"]) {
      expect(screen.getByTestId(`maint-cell-${kind}`).querySelector("svg")).not.toBeNull();
    }
    expect(screen.getByTestId("maint-detail")).toHaveTextContent("是正保守");
    expect(screen.getByTestId("maint-detail")).toHaveTextContent("修正保守とも呼ぶ");

    fireEvent.click(screen.getByTestId("maint-cell-adaptive"));
    expect(screen.getByTestId("maint-cell-adaptive")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("maint-detail")).toHaveTextContent("法改正");
  });

  it("marks fixes made before delivery as not maintenance in the quiz", () => {
    renderDeck();
    const item = screen.getByText("納入前の結合テストで見つかったバグを直した").closest("li")!;
    fireEvent.click(Array.from(item.querySelectorAll("button")).find((b) => b.textContent === "保守外")!);
    expect(item).toHaveTextContent("正解！");
  });
});
