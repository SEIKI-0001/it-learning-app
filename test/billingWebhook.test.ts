import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const applyOneTimePurchase = vi.hoisted(() => vi.fn());
const getStoredStripeSubscription = vi.hoisted(() => vi.fn());
const recordStripeSubscriptionEvent = vi.hoisted(() => vi.fn());
const setUserPlan = vi.hoisted(() => vi.fn());
const setUserPlanByCustomer = vi.hoisted(() => vi.fn());
const getServiceSupabase = vi.hoisted(() => vi.fn());

vi.mock("@/lib/billing/plan", () => ({
  applyOneTimePurchase,
  getStoredStripeSubscription,
  recordStripeSubscriptionEvent,
  setUserPlan,
  setUserPlanByCustomer,
}));
vi.mock("@/lib/supabaseServer", () => ({ getServiceSupabase }));

import { processStripeWebhookEvent, type StripeEvent } from "@/app/api/billing/webhook/route";

function subscriptionEvent(
  type: "customer.subscription.updated" | "customer.subscription.deleted",
  created: number,
  status: string,
): StripeEvent {
  return {
    id: `evt_${created}`,
    type,
    created,
    data: {
      object: {
        id: "sub_1",
        customer: "cus_1",
        status,
        metadata: { user_id: "user-1" },
        items: { data: [{ price: { id: "price_pro_sub", object: "price" } }] },
      },
    },
  };
}

describe("subscription webhook reconciliation", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test");
    vi.stubEnv("STRIPE_PRICE_ID_PRO_SUB", "price_pro_sub");
    getStoredStripeSubscription.mockResolvedValue(null);
    recordStripeSubscriptionEvent.mockResolvedValue(true);
    setUserPlan.mockResolvedValue(undefined);
    setUserPlanByCustomer.mockResolvedValue(undefined);
    getServiceSupabase.mockReturnValue({
      from: () => ({
        update: () => ({
          eq: () => ({
            select: vi.fn().mockResolvedValue({ data: [{ event_id: "evt" }], error: null }),
          }),
        }),
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("keeps Pro when deleting one of multiple matching subscriptions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                status: "active",
                items: { data: [{ price: { id: "price_pro_sub", object: "price" } }] },
              },
            ],
          }),
        ),
      ),
    );

    await processStripeWebhookEvent(
      subscriptionEvent("customer.subscription.deleted", 200, "canceled"),
    );

    expect(setUserPlan).toHaveBeenCalledWith("user-1", "pro", {
      stripeCustomerId: "cus_1",
    });
  });

  it("removes subscription-based Pro when deleting the final matching subscription", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }))),
    );

    await processStripeWebhookEvent(
      subscriptionEvent("customer.subscription.deleted", 201, "canceled"),
    );

    expect(setUserPlan).toHaveBeenCalledWith("user-1", "free", {
      stripeCustomerId: "cus_1",
    });
  });

  it("ignores an older event and applies a newer event for the subscription ID", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: [] })));
    vi.stubGlobal("fetch", fetchMock);
    recordStripeSubscriptionEvent.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    await processStripeWebhookEvent(
      subscriptionEvent("customer.subscription.updated", 199, "active"),
    );
    expect(setUserPlan).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    await processStripeWebhookEvent(
      subscriptionEvent("customer.subscription.updated", 202, "active"),
    );
    expect(setUserPlan).toHaveBeenCalledWith("user-1", "free", {
      stripeCustomerId: "cus_1",
    });
  });
});
