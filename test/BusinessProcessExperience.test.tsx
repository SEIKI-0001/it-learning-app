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
  it("compares before/after lanes in the same format, with lead time 60→20 and the BPR/BPM quiz", () => {
    renderDeck();
    expect(screen.getByTestId("lane-before")).toHaveTextContent("1件 60分");
    expect(screen.getByTestId("lane-after")).toHaveTextContent("1件 20分");
    expect(screen.getByTestId("lead-time")).toHaveTextContent("60分");
    expect(screen.getByTestId("lead-time")).toHaveTextContent("20分");
    expect(screen.getByTestId("bp-insight")).toHaveTextContent("60分 → 20分");
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    expect(screen.getByText("今のムダな手作業をそのままシステム化する")).toBeInTheDocument();
    expect(screen.getByText(/BPR/)).toBeInTheDocument();
  });

  it("piles documents at 手書き転記 only before the improvement, on the same clock", () => {
    renderDeck();
    expect(screen.getByTestId("before-station-1")).toHaveAttribute("data-bottleneck", "true");
    expect(screen.getByTestId("after-station-1")).toHaveAttribute("data-bottleneck", "false");

    scrub(60);
    expect(screen.getByTestId("before-queue-1")).toBeInTheDocument();
    expect(screen.queryByTestId("after-queue-1")).toBeNull();
    expect(screen.getByTestId("sim-note")).toHaveTextContent("手書き転記");
    expect(screen.getByTestId("sim-note")).toHaveTextContent("渋滞");

    scrub(80);
    expect(screen.getByTestId("done-after")).toHaveTextContent("6件完了");
    expect(screen.getByTestId("done-before")).not.toHaveTextContent("完了");
  });
});
