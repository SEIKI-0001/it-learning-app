// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RaidExperience from "@/components/experiences/RaidExperience";
import { raidLayout, survives, usableDisks } from "@/components/experiences/raid/DiskArray";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import { getTopicExperience } from "@/components/experiences/registry";

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
      <RaidExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const failedChip = () => [...document.querySelectorAll('[data-failed="true"]')].at(-1);

describe("RAID layout model", () => {
  it("parity is spread one per disk but adds up to 1 disk (RAID5) / 2 disks (RAID6)", () => {
    expect(usableDisks("raid0")).toBe(4);
    expect(usableDisks("raid1")).toBe(2);
    expect(usableDisks("raid5")).toBe(3);
    expect(usableDisks("raid6")).toBe(2);
    for (let d = 0; d < 4; d++) {
      expect(raidLayout("raid5").filter((stripe) => stripe[d].kind === "p")).toHaveLength(1);
    }
  });

  it("tolerates 0 / pair / 1 / 2 failed disks", () => {
    expect(survives("raid0", new Set([0]))).toBe(false);
    expect(survives("raid1", new Set([0, 2]))).toBe(true);
    expect(survives("raid1", new Set([0, 1]))).toBe(false);
    expect(survives("raid5", new Set([1]))).toBe(true);
    expect(survives("raid5", new Set([1, 2]))).toBe(false);
    expect(survives("raid6", new Set([1, 2]))).toBe(true);
    expect(survives("raid6", new Set([0, 1, 2]))).toBe(false);
  });
});

describe("RaidExperience", () => {
  it("is registered for tech-raid", () => {
    expect(getTopicExperience("tech-raid")).toBe(RaidExperience);
  });

  it("RAID0 uses all 4TB but loses data when one disk breaks; RAID1 halves capacity and survives", () => {
    reduceMotion();
    renderDeck();
    expect(screen.getByTestId("raid-basic-cap")).toHaveTextContent("4TB 中 4TB");
    click("ディスク2を故障させる");
    expect(screen.getByTestId("raid-verdict-raid0")).toHaveAttribute("data-ok", "false");
    click(/RAID1（写して書く）/);
    expect(screen.getByTestId("raid-basic-cap")).toHaveTextContent("4TB 中 2TB");
    click("ディスク2を故障させる");
    expect(screen.getByTestId("raid-verdict-raid1")).toHaveAttribute("data-ok", "true");
  });

  it("parity lets a lost value be recomputed (10 − 3 − 2 = 5)", () => {
    reduceMotion();
    renderDeck();
    click("解説2");
    expect(screen.getByTestId("raid-parity-eq")).toHaveTextContent("10 − 3 − 2 ＝ 5");
    expect(screen.getByTestId("raid-parity-lost")).toHaveTextContent("5");
  });

  it("RAID5: stripes are written one by one, parity gathers into 1 disk, 4TB − 1TB = 3TB", () => {
    vi.useFakeTimers();
    renderDeck();
    click("解説3");
    expect(screen.getByTestId("raid-raid5")).toHaveAttribute("data-beat", "0");
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByTestId("raid-raid5-array")).toHaveAttribute("data-placed", "1");
    for (let i = 0; i < 8; i++) act(() => vi.advanceTimersByTime(1800));
    expect(screen.getByTestId("raid-raid5-gather")).toBeInTheDocument();
    expect(screen.getByTestId("raid-raid5-eq")).toHaveTextContent("3TB");
  });

  it("RAID5 survives one failure but not two; RAID6 survives two", () => {
    reduceMotion();
    renderDeck();
    click("解説3");
    click("ディスク1を故障させる");
    expect(screen.getByTestId("raid-verdict-raid5")).toHaveAttribute("data-ok", "true");
    click("ディスク3を故障させる");
    expect(screen.getByTestId("raid-verdict-raid5")).toHaveAttribute("data-ok", "false");
    click("解説4");
    expect(screen.getByTestId("raid-raid6-eq")).toHaveTextContent("2TB");
    click("ディスク1を故障させる");
    click("ディスク3を故障させる");
    expect(screen.getByTestId("raid-verdict-raid6")).toHaveAttribute("data-ok", "true");
  });

  it("the formula slide generalises to N disks", () => {
    renderDeck();
    click("解説5");
    click("6台");
    click("4TB");
    expect(screen.getByTestId("raid-formula-raid5")).toHaveTextContent("20TB");
    expect(screen.getByTestId("raid-formula-raid6")).toHaveTextContent("16TB");
    click("RAID6");
    expect(screen.getByTestId("raid-formula-disks")).toHaveAttribute("data-minus", "2");
  });

  it("practice: forgetting the parity is pointed out as the 引く台数 step", () => {
    renderDeck();
    click("解説6");
    click("4TB");
    expect(screen.getByText(/パリティ分を引き忘れ/)).toBeInTheDocument();
    expect(failedChip()).toHaveTextContent("② 引く台数");
    click("次の問題へ →");
    click("8TB");
    expect(screen.getByText("⭕ 正解！")).toBeInTheDocument();
  });
});
