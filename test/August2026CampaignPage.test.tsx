// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getInternalUserId = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/currentUser", () => ({ getInternalUserId }));
vi.mock("@/components/campaign/August2026Checkout", () => ({
  default: (props: Record<string, unknown>) => (
    <output data-testid="checkout-props">{JSON.stringify(props)}</output>
  ),
}));

import CampaignPage from "@/app/campaign/august-2026/page";

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test");
  vi.stubEnv("STRIPE_PRICE_ID_PRO_6M", "price_6m");
  vi.stubEnv("NEXT_PUBLIC_LINE_ADD_FRIEND_URL", "https://line.example/add");
  vi.stubEnv("AUGUST_2026_BONUS_OPEN", "true");
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
  getInternalUserId.mockResolvedValue(null);
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("August campaign page", () => {
  it("renders the approved offer and disclosures", async () => {
    render(await CampaignPage({ searchParams: Promise.resolve({}) }));
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "ITパスポート学習コーチ Pro 6か月",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("3,480円（税込・買い切り）")).toBeInTheDocument();
    expect(screen.getByText(/自動更新はありません/)).toBeInTheDocument();
    expect(screen.getByText(/合格を保証するものではありません/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "特定商取引法に基づく表示" }),
    ).toHaveAttribute("href", "/legal/tokusho");
    expect(
      screen.getByRole("link", { name: "プライバシーポリシー" }),
    ).toHaveAttribute("href", "/privacy");
  });

  it("passes request-time auth and checkout result as serializable props", async () => {
    getInternalUserId.mockResolvedValue("user-1");
    render(
      await CampaignPage({
        searchParams: Promise.resolve({
          checkout: "success",
          campaign: "august_2026",
        }),
      }),
    );
    expect(JSON.parse(screen.getByTestId("checkout-props").textContent || "{}")).toEqual({
      authenticated: true,
      bonusActive: true,
      checkoutEnabled: true,
      lineUrl: "https://line.example/add",
      checkoutResult: "success",
      campaignPurchase: true,
    });
  });
});
