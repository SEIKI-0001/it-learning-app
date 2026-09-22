// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ReliabilityExperience from "@/components/experiences/ReliabilityExperience";
import { accumulated, endHour, segments } from "@/components/experiences/reliability/UptimeTimeline";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <ReliabilityExperience />
    </ExperienceSlideDeck>,
  );
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const slide = (name: string, value: number) => fireEvent.change(screen.getByRole("slider", { name }), { target: { value: String(value) } });
const width = (el: HTMLElement) => parseFloat(el.style.width);

describe("uptime timeline math", () => {
  it("lays out only whole cycles so the accumulated ratio equals the formula", () => {
    for (const [mtbf, mttr] of [
      [90, 10],
      [190, 40],
      [10, 100],
    ]) {
      const { up, down } = accumulated(mtbf, mttr, endHour(mtbf, mttr));
      expect(up / (up + down)).toBeCloseTo(mtbf / (mtbf + mttr), 6);
      expect(segments(mtbf, mttr).length % 2).toBe(0);
    }
  });
});

describe("ReliabilityExperience", () => {
  it("stretches the run segments with MTBF and shrinks the repair segments with MTTR", () => {
    renderDeck();
    const up0 = width(screen.getAllByTestId("seg-up")[0]);
    const down0 = width(screen.getAllByTestId("seg-down")[0]);
    slide("MTBF", 180);
    expect(width(screen.getAllByTestId("seg-up")[0])).toBeGreaterThan(up0);
    slide("MTTR", 30);
    expect(width(screen.getAllByTestId("seg-down")[0])).toBeGreaterThan(down0);
    expect(screen.getByTestId("label-mtbf")).toHaveTextContent("MTBF 180h");
    expect(screen.getByTestId("label-mttr")).toHaveTextContent("MTTR 30h");
    expect(screen.getByText("0.857（85.7%）")).toBeInTheDocument();
    expect(screen.getByTestId("uptime-acc")).toHaveTextContent("85.7%");
  });

  it("scrubbing the clock shows whether the machine is running or under repair", () => {
    renderDeck();
    slide("経過時間", 50);
    expect(screen.getByTestId("uptime-acc")).toHaveTextContent("稼働中");
    slide("経過時間", 95);
    expect(screen.getByTestId("uptime-acc")).toHaveTextContent("修理中");
    expect(screen.getByTestId("uptime-acc")).toHaveTextContent("稼働 90h / 停止 5h");
  });

  it("tapping a formula term keeps only that part of the timeline", () => {
    renderDeck();
    click("MTBF");
    expect(screen.getAllByTestId("seg-down")[0].className).toContain("opacity-25");
    expect(screen.getAllByTestId("seg-up")[0].className).not.toContain("opacity-25");
  });

  it("serial stops when one machine fails, parallel keeps running", () => {
    renderDeck();
    click("解説2");
    click("装置Aを故障させる");
    expect(screen.getByTestId("system-diagram")).toHaveAttribute("data-up", "false");
    expect(screen.getByTestId("system-status")).toHaveTextContent("1台止まっただけで、システム全体が停止");
    click(/並列/);
    expect(screen.getByTestId("system-diagram")).toHaveAttribute("data-up", "true");
    expect(screen.getByTestId("system-status")).toHaveTextContent("もう1台で継続中");
    expect(screen.getByText("0.99（99%）")).toBeInTheDocument();
    click("装置Bを故障させる");
    expect(screen.getByTestId("system-diagram")).toHaveAttribute("data-up", "false");
  });
});
