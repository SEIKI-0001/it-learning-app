// @vitest-environment jsdom

import type { ComponentType } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getTopicExperience } from "@/components/experiences/registry";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import CorporationOrganizationExperience from "@/components/experiences/CorporationOrganizationExperience";
import DecisionMethodsExperience from "@/components/experiences/DecisionMethodsExperience";
import TechRoadmapExperience from "@/components/experiences/TechRoadmapExperience";
import EngineeringSystemsExperience from "@/components/experiences/EngineeringSystemsExperience";
import ProductionManagementExperience, { simulate } from "@/components/experiences/ProductionManagementExperience";
import EmbeddedControlExperience from "@/components/experiences/EmbeddedControlExperience";
import SystemPlanningRfpExperience, { vendorTotal } from "@/components/experiences/SystemPlanningRfpExperience";
import SystemDesignExperience from "@/components/experiences/SystemDesignExperience";
import PmbokExperience from "@/components/experiences/PmbokExperience";
import RaciExperience from "@/components/experiences/RaciExperience";
import ProcessingArchitectureExperience from "@/components/experiences/ProcessingArchitectureExperience";
import BackupExperience, { contents, restoreOrder } from "@/components/experiences/BackupExperience";
import NetworkDevicesExperience from "@/components/experiences/NetworkDevicesExperience";

// 図解中心に作り直した13テーマ（RAID は RaidExperience.test.tsx）。
// 静的な図は「描画できて、要点の図があること」、動く図は「順番どおりに進むこと」、計算は数値を確かめる。

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

function renderDeck(Experience: ComponentType) {
  render(
    <ExperienceSlideDeck>
      <Experience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

const TOPICS: [string, ComponentType, string[]][] = [
  ["strat-corporation-management-organization", CorporationOrganizationExperience, ["corp-ownership", "corp-purpose", "corp-forms", "corp-decision"]],
  ["strat-decision-problem-solving", DecisionMethodsExperience, ["decision-rolemap", "decision-diverge", "decision-affinity", "decision-pareto", "decision-fishbone", "decision-delphi"]],
  ["strat-technology-development-strategy", TechRoadmapExperience, ["roadmap-stages", "roadmap-chart", "roadmap-open", "roadmap-patent"]],
  ["strat-engineering-systems", EngineeringSystemsExperience, ["eng-flow", "eng-letters", "eng-concurrent"]],
  ["strat-production-management", ProductionManagementExperience, ["prod-mrp", "prod-inventory", "prod-compare"]],
  ["strat-embedded-systems", EmbeddedControlExperience, ["embedded-loop", "embedded-io", "embedded-realtime"]],
  ["strat-system-planning-rfp", SystemPlanningRfpExperience, ["rfp-flow", "rfp-docs", "rfp-eval"]],
  ["mgmt-system-design", SystemDesignExperience, ["design-flow", "design-boundary", "design-sort"]],
  ["mgmt-pmbok-basics", PmbokExperience, ["pmbok-matrix", "pmbok-overlap", "pmbok-tailoring"]],
  ["mgmt-project-resource", RaciExperience, ["raci-one", "raci-table", "raci-bad", "raci-staffing"]],
  ["tech-system-processing-architecture", ProcessingArchitectureExperience, ["arch-timing", "arch-grid", "arch-place", "arch-roles", "arch-scenes"]],
  ["tech-backup", BackupExperience, ["backup-take", "backup-restore", "backup-rpo", "backup-generations"]],
  ["tech-network-devices", NetworkDevicesExperience, ["netdev-ladder", "netdev-hubswitch", "netdev-map"]],
];

describe("diagram experiences", () => {
  it.each(TOPICS)("%s is registered and renders every figure plus the exam points", (id, Experience, figures) => {
    expect(getTopicExperience(id)).toBe(Experience);
    reduceMotion();
    renderDeck(Experience);
    for (const f of figures) expect(screen.getByTestId(f)).toBeInTheDocument();
    expect(screen.getByTestId("points")).toBeInTheDocument();
    expect(screen.getByText("試験ではここを見分ける")).toBeInTheDocument();
  });
});

describe("production management", () => {
  it("fixed-quantity ordering always orders 70 at irregular intervals and never runs out", () => {
    const sim = simulate("fixedQty");
    expect(sim.orders.length).toBeGreaterThan(2);
    expect(new Set(sim.orders.map((o) => o.qty))).toEqual(new Set([70]));
    const gaps = sim.orders.slice(1).map((o, i) => o.day - sim.orders[i].day);
    expect(new Set(gaps).size).toBeGreaterThan(1);
    expect(Math.min(...sim.pts.map(([, v]) => v))).toBeGreaterThan(0);
  });

  it("fixed-period ordering orders every 10 days with a varying quantity and never runs out", () => {
    const sim = simulate("fixedTime");
    const gaps = sim.orders.slice(1).map((o, i) => o.day - sim.orders[i].day);
    expect(new Set(gaps)).toEqual(new Set([10]));
    expect(new Set(sim.orders.map((o) => o.qty)).size).toBe(sim.orders.length);
    expect(Math.min(...sim.pts.map(([, v]) => v))).toBeGreaterThan(0);
  });

  it("MRP shows 40 × 3 − 25 = 95 and the chart switches between the two methods", () => {
    reduceMotion();
    renderDeck(ProductionManagementExperience);
    expect(screen.getByTestId("prod-mrp-answer")).toHaveTextContent("95本");
    click("解説2");
    expect(screen.getByTestId("prod-rule")).toHaveTextContent("毎回同じ 70個");
    click("定期発注方式");
    expect(screen.getByTestId("prod-inventory")).toHaveAttribute("data-mode", "fixedTime");
    expect(screen.getByTestId("prod-rule")).toHaveTextContent("10日ごと");
  });
});

describe("backup", () => {
  it("differential grows from the full backup, incremental only holds that day", () => {
    expect(contents("diff", 3)).toEqual([1, 2, 3]);
    expect(contents("incr", 3)).toEqual([3]);
    expect(contents("full", 3)).toEqual([0, 1, 2, 3]);
    expect(restoreOrder("diff")).toEqual([0, 3]);
    expect(restoreOrder("incr")).toEqual([0, 1, 2, 3]);
    expect(restoreOrder("full")).toEqual([3]);
  });

  it("restore lights the backups in order and brings every change back", () => {
    vi.useFakeTimers();
    renderDeck(BackupExperience);
    click("解説2");
    expect(screen.getByTestId("backup-restore")).toHaveAttribute("data-mode", "incr");
    expect(screen.getByTestId("backup-restored")).toHaveAttribute("data-count", "0");
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByTestId("backup-restored")).toHaveAttribute("data-count", "1");
    for (let i = 0; i < 4; i++) act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("backup-restored")).toHaveAttribute("data-count", "4");
    expect(screen.getByText(/日曜フル → 月 → 火 → 水/)).toBeInTheDocument();
  });

  it("differential restore skips the middle backups", () => {
    reduceMotion();
    renderDeck(BackupExperience);
    click("解説2");
    click("差分");
    expect(screen.getByTestId("backup-src-1")).toHaveAttribute("data-used", "false");
    expect(screen.getByTestId("backup-src-3")).toHaveAttribute("data-used", "true");
    expect(screen.getByTestId("backup-restored")).toHaveAttribute("data-count", "4");
  });
});

describe("embedded control", () => {
  it("the feedback loop runs sense → decide → act → result and converges near 25℃", () => {
    vi.useFakeTimers();
    renderDeck(EmbeddedControlExperience);
    const loop = () => screen.getByTestId("embedded-loop");
    act(() => vi.advanceTimersByTime(700));
    expect(loop()).toHaveAttribute("data-phase", "sense");
    act(() => vi.advanceTimersByTime(1000));
    expect(loop()).toHaveAttribute("data-phase", "decide");
    expect(screen.getByTestId("loop-decide")).toHaveTextContent("+5.0℃");
    for (let i = 0; i < 12; i++) act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("loop-result")).toHaveTextContent("25.2℃");
    expect(screen.getByText(/結果を戻して調整する/)).toBeInTheDocument();
  });
});

describe("other figures", () => {
  it("RFP evaluation picks B, not the cheapest A", () => {
    expect(vendorTotal([2, 3, 5, 2])).toBe(24);
    expect(vendorTotal([5, 4, 3, 4])).toBe(33);
    expect(vendorTotal([4, 3, 2, 5])).toBe(27);
  });

  it("every RACI row has exactly one A", () => {
    reduceMotion();
    renderDeck(RaciExperience);
    click("解説2");
    const rows = screen.getByTestId("raci-table").querySelectorAll("[data-a]");
    expect(rows.length).toBe(4);
    rows.forEach((r) => expect(r).toHaveAttribute("data-a", "1"));
  });

  it("PMBOK matrix: tapping a process group highlights that column", () => {
    reduceMotion();
    renderDeck(PmbokExperience);
    click("プロセス群「終結」を強調");
    expect(screen.getByTestId("pmbok-matrix")).toHaveAttribute("data-focus", "group-4");
    expect(screen.getByText(/終結は統合だけ/)).toBeInTheDocument();
    click("プロセス群「終結」を強調");
    expect(screen.getByTestId("pmbok-matrix")).toHaveAttribute("data-focus", "none");
  });
});
