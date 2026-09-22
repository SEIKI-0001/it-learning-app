// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BusinessProcessExperience from "@/components/experiences/BusinessProcessExperience";
import { queueLengths, schedule, spotsAt } from "@/components/experiences/process/processSim";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <BusinessProcessExperience />
    </ExperienceSlideDeck>,
  );
}

const scrub = (t: number) => fireEvent.change(screen.getByRole("slider", { name: "経過時間" }), { target: { value: String(t) } });

describe("processSim", () => {
  it("piles documents in front of the slow step, and the pile moves after fixing it", () => {
    const before = queueLengths(spotsAt(schedule([5, 30, 20, 5]), 60), 4);
    expect(before[1]).toBeGreaterThan(0);
    const oneFixed = queueLengths(spotsAt(schedule([5, 5, 20, 5]), 60), 4);
    expect(oneFixed[1]).toBe(0);
    expect(oneFixed[2]).toBeGreaterThan(0);
    const allFixed = [10, 30, 50, 60].map((t) => queueLengths(spotsAt(schedule([5, 5, 5, 5]), t), 4));
    expect(allFixed.flat().every((q) => q === 0)).toBe(true);
  });
});

describe("BusinessProcessExperience", () => {
  it("shows the 2.5D desks with a before/after switch at the top, lead time 60→20 and the BPR/BPM quiz", () => {
    renderDeck();
    expect(screen.getByRole("radio", { name: "改善前" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("bp-scene")).toHaveAttribute("data-mode", "before");
    expect(screen.getByTestId("lead-time")).toHaveTextContent("60分");
    expect(screen.getByTestId("lead-time")).toHaveTextContent("20分");
    expect(screen.getByTestId("bp-insight")).toHaveTextContent("60分 → 20分");
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    expect(screen.getByText("今のムダな手作業をそのままシステム化する")).toBeInTheDocument();
    expect(screen.getByText(/BPR/)).toBeInTheDocument();
  });

  it("piles documents at 手書き転記 before the improvement, and none after switching", () => {
    renderDeck();
    scrub(60);
    expect(screen.getByTestId("sim-note")).toHaveTextContent("手書き転記");
    expect(screen.getByTestId("sim-note")).toHaveTextContent("渋滞");
    expect(screen.getByTestId("bp-steps")).toHaveTextContent("時間がかかる");

    fireEvent.click(screen.getByRole("radio", { name: "改善後" }));
    expect(screen.getByRole("radio", { name: "改善後" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByTestId("bp-scene")).toHaveAttribute("data-mode", "after");
    expect(screen.getByTestId("bp-steps")).toHaveTextContent("✓ 改善");
    scrub(30);
    expect(screen.getByTestId("sim-note")).not.toHaveTextContent("渋滞");
  });
});
