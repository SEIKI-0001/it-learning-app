// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text, @typescript-eslint/no-unused-vars */

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RoadmapMap from "@/components/RoadmapMap";
import type { PhaseProgress } from "@/types/plan";

vi.mock("next/image", () => ({
  default: ({ fill: _fill, priority: _priority, ...props }: Record<string, unknown>) => (
    <img {...props} />
  ),
}));

const phases: PhaseProgress[] = [
  { id: "phase0", status: "done", progress: 100, hint: "" },
  { id: "phase1", status: "current", progress: 45, hint: "" },
  { id: "phase2", status: "upcoming", progress: 0, hint: "" },
  { id: "phase3", status: "upcoming", progress: 0, hint: "" },
  { id: "phase4", status: "upcoming", progress: 0, hint: "" },
  { id: "phase5", status: "upcoming", progress: 0, hint: "" },
  { id: "phase6", status: "upcoming", progress: 0, hint: "" },
];

afterEach(cleanup);

describe("RoadmapMap", () => {
  it("keeps status, expected position, and current progress visible", () => {
    render(<RoadmapMap phases={phases} expectedPhaseId="phase2" />);

    expect(
      screen.getByLabelText("旅立ちの村・初回設定・診断（クリア済み）"),
    ).toBeVisible();
    expect(screen.getByText("いまここ")).toBeVisible();
    expect(screen.getByText("📍 予定ではこのあたり")).toBeVisible();
    expect(
      screen.getByRole("progressbar", { name: "現在ステージの達成度" }),
    ).toHaveAttribute("aria-valuenow", "45");
  });

  it("opens the matching sheet after the background image fails to load", () => {
    render(<RoadmapMap phases={phases} />);

    fireEvent.error(screen.getByTestId("roadmap-background"));
    fireEvent.click(
      screen.getByLabelText("賢者の森・テーマ別に理解する（これから）"),
    );

    expect(
      screen.getByRole("dialog", { name: "賢者の森の詳細" }),
    ).toBeVisible();
    expect(screen.getByText(/ステージ3/)).toBeVisible();
  });
});
