import { describe, expect, it } from "vitest";
import {
  hasActiveProSubscription,
  shouldApplySubscriptionEvent,
  subscriptionKeepsPro,
} from "@/lib/billing/subscriptionState";

describe("billing subscription state", () => {
  it("ignores an older event for the same subscription ID", () => {
    expect(shouldApplySubscriptionEvent(200, 199)).toBe(false);
    expect(shouldApplySubscriptionEvent(200, 200)).toBe(true);
    expect(shouldApplySubscriptionEvent(200, 201)).toBe(true);
  });

  it("keeps Pro when another matching subscription remains after deletion", () => {
    expect(
      hasActiveProSubscription(
        [
          { status: "active", priceIds: ["price_pro_sub"] },
          { status: "trialing", priceIds: ["price_pro_sub"] },
        ],
        "price_pro_sub",
      ),
    ).toBe(true);
  });

  it("removes subscription-based Pro only after the final matching subscription is gone", () => {
    expect(
      hasActiveProSubscription(
        [{ status: "canceled", priceIds: ["price_pro_sub"] }],
        "price_pro_sub",
      ),
    ).toBe(false);
  });

  it("preserves Pro from a future one-time entitlement after subscription reconciliation", () => {
    expect(subscriptionKeepsPro(false, "2099-01-01T00:00:00.000Z", new Date("2026-07-19"))).toBe(
      true,
    );
    expect(subscriptionKeepsPro(false, "2020-01-01T00:00:00.000Z", new Date("2026-07-19"))).toBe(
      false,
    );
  });
});
