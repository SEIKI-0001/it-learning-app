// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ReliabilityExperience from "@/components/experiences/ReliabilityExperience";
import { accumulated, endHour, segments } from "@/components/experiences/reliability/UptimeTimeline";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function reduceMotion() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

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
  it("opens on the meaning of availability without the MTBF/MTTR formula", () => {
    renderDeck();
    const first = screen.getByRole("heading", { name: /稼働率＝動いていた時間の割合/ }).closest("section")!;
    expect(first).not.toHaveTextContent("MTBF");
    expect(first).not.toHaveTextContent("MTTR");
    click("10%");
    expect(screen.getByTestId("meaning-answer")).toHaveTextContent("修理で止まっていた");
    expect(screen.getByTestId("meaning-answer")).toHaveTextContent("稼働率 ＝ 動いていた時間 ÷ 全体の時間");
    expect(screen.getByTestId("meaning-answer")).toHaveTextContent("0.9（90%）");
  });

  it("names the run time MTBF and the repair time MTTR on the same time bar", () => {
    reduceMotion();
    renderDeck();
    click("解説2");
    expect(screen.getByTestId("naming-stage")).toHaveAttribute("data-done", "true");
    expect(screen.getByTestId("tag-mtbf")).toHaveTextContent("MTBF ＝ 故障せず動いている時間");
    expect(screen.getByTestId("naming-stage")).toHaveTextContent("MTTR ＝ 故障 → 復旧までの時間");
    expect(screen.getByTestId("naming-stage")).toHaveTextContent("B＝Between");
    expect(screen.getByTestId("naming-stage")).toHaveTextContent("R＝Repair");
  });

  it("derives the formula step by step, relabelling the terms as MTBF / MTTR last", () => {
    vi.useFakeTimers();
    renderDeck();
    click("解説3");
    const d = screen.getByTestId("derivation");
    expect(d).toHaveAttribute("data-step", "0");
    expect(screen.queryByTestId("derive-line-2")).toBeNull();
    act(() => vi.advanceTimersByTime(2300));
    expect(screen.getByTestId("derive-line-2")).toHaveTextContent("動いていた時間 ÷（動いていた時間＋修理していた時間）");
    act(() => vi.advanceTimersByTime(2300));
    expect(screen.getByTestId("derive-line-3")).toHaveTextContent("修理していた時間");
    act(() => vi.advanceTimersByTime(2300));
    expect(d).toHaveAttribute("data-step", "3");
    expect(screen.getByTestId("derive-line-3")).toHaveTextContent("稼働率 ＝ MTBF ÷（MTBF＋MTTR）");
  });

  it("the sliders stretch run segments with MTBF, stretch repair segments with MTTR, and say which way availability moved", () => {
    renderDeck();
    click("解説4");
    const up0 = width(screen.getAllByTestId("seg-up")[0]);
    const down0 = width(screen.getAllByTestId("seg-down")[0]);
    slide("MTBF", 180);
    expect(width(screen.getAllByTestId("seg-up")[0])).toBeGreaterThan(up0);
    expect(screen.getByTestId("avail-feedback")).toHaveTextContent("MTBF を 90h → 180h（長く）");
    expect(screen.getByTestId("avail-feedback")).toHaveTextContent("⬆ 上がった");
    slide("MTTR", 30);
    expect(width(screen.getAllByTestId("seg-down")[0])).toBeGreaterThan(down0);
    expect(screen.getByTestId("avail-feedback")).toHaveTextContent("⬇ 下がった");
    expect(screen.getByTestId("label-mtbf")).toHaveTextContent("MTBF 180h");
    expect(screen.getByTestId("label-mttr")).toHaveTextContent("MTTR 30h");
    expect(screen.getByTestId("avail-meter")).toHaveTextContent("0.857（85.7%）");
    expect(screen.getByTestId("uptime-acc")).toHaveTextContent("85.7%");
    slide("MTTR", 10);
    expect(screen.getByTestId("avail-feedback")).toHaveTextContent("早く直る");
    expect(screen.getByTestId("avail-feedback")).toHaveTextContent("⬆ 上がった");
  });

  it("scrubbing the clock shows whether the machine is running or under repair", () => {
    renderDeck();
    click("解説4");
    slide("経過時間", 50);
    expect(screen.getByTestId("uptime-acc")).toHaveTextContent("稼働中");
    slide("経過時間", 95);
    expect(screen.getByTestId("uptime-acc")).toHaveTextContent("修理中");
    expect(screen.getByTestId("uptime-acc")).toHaveTextContent("稼働 90h / 停止 5h");
  });

  it("tapping a formula term keeps only that part of the timeline", () => {
    renderDeck();
    click("解説4");
    click("MTBF");
    expect(screen.getAllByTestId("seg-down")[0].className).toContain("opacity-25");
    expect(screen.getAllByTestId("seg-up")[0].className).not.toContain("opacity-25");
  });

  it("asks one basic calculation and explains it from run time ÷ total", () => {
    renderDeck();
    click("解説5");
    click("0.1（10%）");
    expect(screen.getByTestId("calc-answer")).toHaveTextContent("修理で止まっていた割合");
    expect(screen.getByTestId("calc-answer")).toHaveTextContent("90 ÷（90 ＋ 10）＝ 90 ÷ 100");
    click("0.9（90%）");
    expect(screen.getByTestId("calc-answer")).toHaveTextContent("⭕ 正解！");
  });

  it("serial/parallel starts from when the system stops, then computes", () => {
    renderDeck();
    click("解説6");
    expect(screen.getByTestId("reasoning")).toHaveAttribute("data-found", "false");
    click("装置Aを故障させる");
    expect(screen.getByTestId("system-diagram")).toHaveAttribute("data-up", "false");
    expect(screen.getByTestId("system-status")).toHaveTextContent("1台止まっただけで、システム全体が停止");
    expect(screen.getByTestId("reasoning")).toHaveTextContent("どれか1台でも止まったとき");
    expect(screen.getByTestId("reasoning")).toHaveTextContent("0.9 × 0.9");
    expect(screen.getByTestId("reasoning")).toHaveTextContent("0.81（81%）");

    // 同じ故障のまま並列へ：まだ動いているので、停止条件はまだ分からない
    click(/並列/);
    expect(screen.getByTestId("system-diagram")).toHaveAttribute("data-up", "true");
    expect(screen.getByTestId("system-status")).toHaveTextContent("もう1台で継続中");
    expect(screen.getByTestId("reasoning")).toHaveAttribute("data-found", "false");
    expect(screen.getByTestId("reasoning")).toHaveTextContent("もう1台も止めてみよう");

    click("装置Bを故障させる");
    expect(screen.getByTestId("system-diagram")).toHaveAttribute("data-up", "false");
    const r = screen.getByTestId("reasoning");
    expect(r).toHaveTextContent("両方とも止まったときだけ");
    expect(r).toHaveTextContent("0.1 × 0.1 ＝ 0.01");
    expect(r).toHaveTextContent("1 − 0.01");
    expect(r).toHaveTextContent("0.99（99%）");
    expect(screen.getByText(/直列は1台で止まる/)).toBeInTheDocument();
  });
});
