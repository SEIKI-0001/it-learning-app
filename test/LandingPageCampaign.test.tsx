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
  // 8月キャンペーン期間中の日時でも、終了済みのバナーは出ないことを確かめる。
  vi.stubEnv("AUGUST_2026_BONUS_OPEN", "true");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("landing page", () => {
  it("presents Exam Readiness as an evidence score rather than a probability", () => {
    render(<LandingPage />);

    const readinessCaption = screen.getByText("合格準備度", { selector: ".cap" });
    expect(readinessCaption.parentElement).toHaveTextContent("68/100");
    expect(readinessCaption.parentElement).toHaveTextContent("あと一歩");
    expect(readinessCaption.parentElement?.textContent).not.toMatch(/合格率|合格確率|%/);
    expect(screen.getByText(/実際の問題への回答と定着から判定/)).toBeInTheDocument();
    expect(screen.getByText(/次の一歩：.*経営のことば/)).toBeInTheDocument();
  });

  it("shows normal pricing derived from the billing constants and the legal links", () => {
    render(<LandingPage />);
    expect(screen.getByText("¥3,480")).toBeInTheDocument();
    expect(screen.getAllByText("¥980").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "特定商取引法に基づく表示" }),
    ).toHaveAttribute("href", "/legal/tokusho");
    expect(
      screen.getByRole("link", { name: "プライバシーポリシー" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("no longer shows the ended August 2026 campaign banner", () => {
    render(<LandingPage />);
    expect(
      screen.queryByRole("link", { name: "6か月Proキャンペーンを見る" }),
    ).not.toBeInTheDocument();
  });
});
