// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import LandingPage from "@/app/lp/page";

beforeAll(() => {
  window.matchMedia = () =>
    ({
      matches: true,
    }) as MediaQueryList;
});

afterEach(cleanup);

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
});
