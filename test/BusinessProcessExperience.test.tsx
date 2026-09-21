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
  it("keeps the flow, bottleneck fixes, lead time 60→20 and the BPR/BPM quiz", () => {
    renderDeck();
    expect(screen.getByTestId("lead-time")).toHaveTextContent("60分");
    fireEvent.click(screen.getByRole("button", { name: /手書き転記/ }));
    fireEvent.click(screen.getByRole("button", { name: /承認待ち/ }));
    expect(screen.getByTestId("lead-time")).toHaveTextContent("20分");
    expect(screen.getByTestId("bp-insight")).toHaveTextContent("60分 → 20分");
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    expect(screen.getByText("今のムダな手作業をそのままシステム化する")).toBeInTheDocument();
    expect(screen.getByText(/BPR/)).toBeInTheDocument();
  });

  it("shows documents queueing at 手書き転記, then at 承認 after fixing 転記 only", () => {
    renderDeck();
    scrub(60);
    expect(screen.getByTestId("queue-1")).toBeInTheDocument();
    expect(screen.getByTestId("sim-note")).toHaveTextContent("手書き転記");

    fireEvent.click(screen.getByRole("button", { name: /手書き転記/ }));
    scrub(60);
    expect(screen.queryByTestId("queue-1")).toBeNull();
    expect(screen.getByTestId("queue-2")).toBeInTheDocument();
    expect(screen.getByTestId("bp-insight")).toHaveTextContent("次に遅い工程");

    fireEvent.click(screen.getByRole("button", { name: /承認待ち/ }));
    scrub(40);
    expect(screen.queryByTestId("queue-2")).toBeNull();
  });
});
