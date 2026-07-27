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
    vi.stubEnv("STRIPE_PRICE_ID_PRO_6M", "price_pro_6m");
    vi.stubEnv("AUGUST_2026_BONUS_OPEN", "true");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00.000Z"));
    getRequestUserId.mockResolvedValue("user-1");
    getStripeCustomerId.mockResolvedValue("cus_existing");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
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

  it("marks an active approved six-month campaign checkout", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(stripeResponse({ url: "https://checkout.test/session" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://example.test/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          plan: "one_6m",
          returnTo: "/campaign/august-2026",
          campaign: "august_2026",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const checkoutBody = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(checkoutBody.get("line_items[0][price]")).toBe("price_pro_6m");
    expect(checkoutBody.get("metadata[campaign]")).toBe("august_2026");
    expect(checkoutBody.get("success_url")).toBe(
      "https://example.test/campaign/august-2026?checkout=success&campaign=august_2026#purchase",
    );
    expect(checkoutBody.get("cancel_url")).toBe(
      "https://example.test/campaign/august-2026?checkout=cancel#purchase",
    );
    expect(checkoutBody.get("custom_text[submit][message]")).toContain(
      "買い切り6か月・自動更新なし",
    );
    expect(checkoutBody.get("custom_text[submit][message]")).toContain(
      "https://example.test/legal/tokusho",
    );
  });

  it.each([
    { campaign: "anything", plan: "one_6m" },
    { campaign: "august_2026", plan: "one_1m" },
  ])("does not forward an invalid campaign combination: %o", async (body) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(stripeResponse({ url: "https://checkout.test/session" }));
    vi.stubGlobal("fetch", fetchMock);

    await POST(
      new Request("https://example.test/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          ...body,
          returnTo: "/campaign/august-2026",
        }),
      }),
    );

    const checkoutBody = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(checkoutBody.has("metadata[campaign]")).toBe(false);
    expect(checkoutBody.has("custom_text[submit][message]")).toBe(false);
  });

  it("stops campaign labeling after the deadline without blocking normal purchase", async () => {
    vi.setSystemTime(new Date("2026-08-10T15:00:00.000Z"));
    const fetchMock = vi
      .fn()
      .mockResolvedValue(stripeResponse({ url: "https://checkout.test/session" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://example.test/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          plan: "one_6m",
          returnTo: "/campaign/august-2026",
          campaign: "august_2026",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const checkoutBody = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(checkoutBody.has("metadata[campaign]")).toBe(false);
    expect(checkoutBody.has("custom_text[submit][message]")).toBe(false);
  });

  it("falls back to /more for an unapproved return path", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(stripeResponse({ url: "https://checkout.test/session" }));
    vi.stubGlobal("fetch", fetchMock);

    await POST(
      new Request("https://example.test/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          plan: "one_6m",
          returnTo: "//evil.example",
          campaign: "august_2026",
        }),
      }),
    );

    const checkoutBody = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(checkoutBody.get("success_url")).toBe(
      "https://example.test/more?checkout=success#billing",
    );
  });
});
