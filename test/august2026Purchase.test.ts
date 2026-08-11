import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyAugust2026CampaignPurchase } from "@/lib/campaign/august2026Purchase";

function stripeResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function paidSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_live_verified",
    object: "checkout.session",
    livemode: true,
    status: "complete",
    payment_status: "paid",
    mode: "payment",
    client_reference_id: "user-1",
    metadata: {
      user_id: "user-1",
      plan_key: "one_6m",
      campaign: "august_2026",
    },
    amount_total: 3480,
    currency: "jpy",
    line_items: {
      data: [
        {
          quantity: 1,
          amount_total: 3480,
          price: { id: "price_6m" },
        },
      ],
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test");
  vi.stubEnv("STRIPE_PRICE_ID_PRO_6M", "price_6m");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("August campaign Checkout Session verification", () => {
  it("accepts the paid live campaign purchase for the current internal user", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(stripeResponse(paidSession())),
    );

    await expect(
      verifyAugust2026CampaignPurchase({
        sessionId: "cs_live_verified",
        userId: "user-1",
      }),
    ).resolves.toBe(true);
  });

  it("rejects a Session whose two user references do not match the current user", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        stripeResponse(
          paidSession({
            client_reference_id: "user-2",
            metadata: {
              user_id: "user-2",
              plan_key: "one_6m",
              campaign: "august_2026",
            },
          }),
        ),
      ),
    );

    await expect(
      verifyAugust2026CampaignPurchase({
        sessionId: "cs_live_verified",
        userId: "user-1",
      }),
    ).resolves.toBe(false);
  });

  it("rejects an unsafe or non-live Session identifier", async () => {
    await expect(
      verifyAugust2026CampaignPurchase({
        sessionId: "../../payment_intents/pi_secret",
        userId: "user-1",
      }),
    ).resolves.toBe(false);
    await expect(
      verifyAugust2026CampaignPurchase({
        sessionId: "cs_test_verified",
        userId: "user-1",
      }),
    ).resolves.toBe(false);
  });
});
