// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "@/app/lp/page";

beforeAll(() => {
  window.matchMedia = () =>
    ({
      matches: true,
    }) as MediaQueryList;
});

beforeEach(() => {
  vi.stubEnv("AUGUST_2026_BONUS_OPEN", "true");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("landing page campaign route", () => {
  it("links to the approved offer without replacing normal pricing", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("link", { name: "6か月Proキャンペーンを見る" }),
    ).toHaveAttribute("href", "/campaign/august-2026");
    expect(screen.getByText("¥3,480")).toBeInTheDocument();
    expect(screen.getAllByText("¥980").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "特定商取引法に基づく表示" }),
    ).toHaveAttribute("href", "/legal/tokusho");
    expect(
      screen.getByRole("link", { name: "プライバシーポリシー" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it.each([
    ["the deadline has passed", "true", "2026-08-10T15:00:00.000Z"],
    ["the campaign is manually closed", "false", "2026-08-01T00:00:00.000Z"],
  ])("removes the bonus banner when %s", (_name, bonusOpen, now) => {
    vi.stubEnv("AUGUST_2026_BONUS_OPEN", bonusOpen);
    vi.setSystemTime(new Date(now));

    render(<LandingPage />);

    expect(
      screen.queryByRole("complementary", { name: "期間限定キャンペーン" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "6か月Proキャンペーンを見る" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("¥980").length).toBeGreaterThan(0);
  });
});
