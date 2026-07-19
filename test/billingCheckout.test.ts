import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getRequestUserId = vi.hoisted(() => vi.fn());
const getStripeCustomerId = vi.hoisted(() => vi.fn());

vi.mock("@/lib/apiUser", () => ({ getRequestUserId }));
vi.mock("@/lib/billing/plan", () => ({ getStripeCustomerId }));

import { POST } from "@/app/api/billing/checkout/route";

function stripeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("billing checkout safeguards", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test");
    vi.stubEnv("STRIPE_PRICE_ID_PRO_SUB", "price_pro_sub");
    vi.stubEnv("STRIPE_PRICE_ID_PRO_1M", "price_pro_1m");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    getRequestUserId.mockResolvedValue("user-1");
    getStripeCustomerId.mockResolvedValue("cus_existing");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("rejects a second monthly subscription when an active Pro subscription exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      stripeResponse({
        data: [
          {
            status: "active",
            items: { data: [{ price: { id: "price_pro_sub" } }] },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://example.test/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: "sub_monthly" }),
      }),
    );

    expect(response.status).toBe(409);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reuses the existing Stripe customer for a new monthly checkout", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(stripeResponse({ data: [] }))
      .mockResolvedValueOnce(stripeResponse({ url: "https://checkout.test/session" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://example.test/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: "sub_monthly" }),
      }),
    );

    expect(response.status).toBe(200);
    const checkoutBody = new URLSearchParams(fetchMock.mock.calls[1][1].body);
    expect(checkoutBody.get("customer")).toBe("cus_existing");
    expect(checkoutBody.get("mode")).toBe("subscription");
  });

  it("keeps one-time purchases available to subscribers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(stripeResponse({ url: "https://checkout.test/session" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://example.test/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: "one_1m" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const checkoutBody = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(checkoutBody.get("mode")).toBe("payment");
  });
});
