// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import ComplianceMysteryExperience from "@/components/experiences/compliance/ComplianceMysteryExperience";
import { readMs } from "@/components/experiences/story/StoryDay";
import { AD, PARTNER } from "@/components/experiences/compliance/sale";

afterEach(cleanup);

function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) act(() => vi.advanceTimersByTime(100));
}
const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));
const activeSlide = () => document.querySelector<HTMLElement>('section[aria-hidden="false"]')!;

describe("ComplianceMysteryExperience", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("表紙＋6章＋事件解決の8枚。表紙に探偵役の石田さん", () => {
    render(
      <ExperienceSlideDeck>
        <ComplianceMysteryExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 8")).toBeInTheDocument();
    expect(screen.getByTestId("compliance-cast")).toHaveTextContent("探偵役（法務）");
  });

  it("宣伝の章：3つの案から危ないものを見抜くと、捜査ボードに景品表示法が載る", () => {
    render(
      <ExperienceSlideDeck>
        <ComplianceMysteryExperience />
      </ExperienceSlideDeck>,
    );
    slide(2);
    const board = () => within(activeSlide()).getByTestId("compliance-sheet");
    expect(board()).toHaveTextContent("突き止めた 0/9");
    advance(AD.slice(0, 5).reduce((s, b) => s + readMs(b), 0) + 1500);
    const ask = within(activeSlide()).getByTestId("story-ask");
    fireEvent.click(within(ask).getByRole("button", { name: "①と②" }));
    expect(ask).toHaveTextContent("推理ミス");
    fireEvent.click(within(ask).getByRole("button", { name: "②と③" }));
    expect(board().querySelector('[data-check="keihyo"]')).toHaveAttribute("data-status", "直した");
    expect(board()).toHaveTextContent("突き止めた 1/9");
  });

  it("前の章までに突き止めたものから始まる", () => {
    render(
      <ExperienceSlideDeck>
        <ComplianceMysteryExperience />
      </ExperienceSlideDeck>,
    );
    slide(5);
    const board = within(activeSlide()).getByTestId("compliance-sheet");
    expect(board).toHaveTextContent("突き止めた 4/9");
    expect(PARTNER.some((b) => b.state?.["c.nda"])).toBe(true);
  });
});
