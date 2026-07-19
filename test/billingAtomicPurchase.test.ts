import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseServer", () => ({
  getServiceSupabase: () => ({ rpc, from }),
}));

import { applyOneTimePurchase } from "@/lib/billing/plan";

const entry = {
  userId: "user-1",
  planKey: "one_1m" as const,
  months: 1,
  amountTotal: 980,
  currency: "jpy",
  stripeCheckoutSessionId: "cs_atomic_1",
  stripePaymentIntentId: "pi_1",
  stripeCustomerId: "cus_1",
};

describe("atomic one-time purchase application", () => {
  beforeEach(() => {
    from.mockImplementation((table: string) => {
      if (table === "billing_purchases") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { pro_until: null },
              error: null,
            }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses one transaction RPC for purchase idempotency and entitlement extension", async () => {
    rpc.mockResolvedValue({ data: true, error: null });

    await applyOneTimePurchase(entry);

    expect(rpc).toHaveBeenCalledWith("apply_one_time_purchase", {
      p_user_id: "user-1",
      p_plan_key: "one_1m",
      p_months: 1,
      p_amount_total: 980,
      p_currency: "jpy",
      p_stripe_checkout_session_id: "cs_atomic_1",
      p_stripe_payment_intent_id: "pi_1",
      p_stripe_customer_id: "cus_1",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("does not leave an independently inserted purchase when entitlement application fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "profile update failed" } });

    await expect(applyOneTimePurchase(entry)).rejects.toThrow("profile update failed");
    expect(from).not.toHaveBeenCalled();
  });

  it("treats a duplicate checkout session as already entitled without a second local write", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    await applyOneTimePurchase(entry);
    await applyOneTimePurchase(entry);

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(from).not.toHaveBeenCalled();
  });
});
