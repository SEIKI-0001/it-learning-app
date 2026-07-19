// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const status = vi.hoisted(() => ({
  status: {
    ok: true as const,
    plan: "pro" as const,
    providerLabel: "Claude Sonnet",
    usage: { used: 0, limit: 10, remaining: 10 },
    tracked: true,
    checkoutEnabled: true,
    entitlements: {
      isPro: true,
      proSource: "subscription" as const,
      proUntil: null,
      registeredAt: null,
      freeRecordingUntil: null,
      canRecordStudy: true,
      freeDaysLeft: null,
    },
    plans: [
      {
        key: "sub_monthly" as const,
        kind: "subscription" as const,
        months: 1,
        totalJpy: 980,
        perMonthJpy: 980,
        label: "月額プラン",
        enabled: true,
      },
      {
        key: "one_1m" as const,
        kind: "one_time" as const,
        months: 1,
        totalJpy: 980,
        perMonthJpy: 980,
        label: "1ヶ月プラン（買い切り）",
        enabled: true,
      },
    ],
    subscription: {
      status: "active",
      currentPeriodEnd: "2026-08-19T00:00:00.000Z",
      cancelAtPeriodEnd: false,
    },
    purchases: [],
  },
}));

vi.mock("@/lib/useBillingStatus", () => ({
  useBillingStatus: () => ({ status: status.status, loading: false, refresh: vi.fn() }),
}));
vi.mock("@/lib/userSession", () => ({ getUserId: () => "user-1" }));

import BillingSection from "@/components/billing/BillingSection";

afterEach(cleanup);

describe("BillingSection", () => {
  it("shows subscription management instead of another subscription purchase", () => {
    render(<BillingSection />);

    expect(screen.getByRole("button", { name: "管理する" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "延長する" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "購入する" })).not.toBeInTheDocument();
  });
});
