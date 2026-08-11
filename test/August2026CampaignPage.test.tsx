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

import * as CampaignPageModule from "@/app/campaign/august-2026/page";

const CampaignPage = CampaignPageModule.default;

function paidCampaignSession(overrides: Record<string, unknown> = {}) {
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
    const mobilePurchaseLink = screen.getByRole("link", {
      name: "購入内容を確認する",
    });
    expect(mobilePurchaseLink).toHaveAttribute("href", "#purchase");
    expect(mobilePurchaseLink).toHaveClass("flex", "min-h-11", "lg:hidden");
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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(paidCampaignSession()), { status: 200 }),
      ),
    );
    render(
      await CampaignPage({
        searchParams: Promise.resolve({
          checkout: "success",
          campaign: "august_2026",
          session_id: "cs_live_verified",
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

  it.each([
    {
      name: "the success URL has no Checkout Session",
      query: { checkout: "success", campaign: "august_2026" },
      response: null,
    },
    {
      name: "the Session belongs to another internal user",
      query: {
        checkout: "success",
        campaign: "august_2026",
        session_id: "cs_live_forged12",
      },
      response: paidCampaignSession({
        id: "cs_live_forged12",
        client_reference_id: "user-2",
        metadata: {
          user_id: "user-2",
          plan_key: "one_6m",
          campaign: "august_2026",
        },
      }),
    },
  ])("fails closed when $name", async ({ query, response }) => {
    getInternalUserId.mockResolvedValue("user-1");
    if (response) {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify(response), { status: 200 }),
        ),
      );
    }

    render(await CampaignPage({ searchParams: Promise.resolve(query) }));

    expect(
      JSON.parse(screen.getByTestId("checkout-props").textContent || "{}")
        .campaignPurchase,
    ).toBe(false);
  });

  it("fails closed when Stripe cannot verify the Session", async () => {
    getInternalUserId.mockResolvedValue("user-1");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(
      await CampaignPage({
        searchParams: Promise.resolve({
          checkout: "success",
          campaign: "august_2026",
          session_id: "cs_live_unavailable",
        }),
      }),
    );

    expect(
      JSON.parse(screen.getByTestId("checkout-props").textContent || "{}")
        .campaignPurchase,
    ).toBe(false);
  });

  it.each([
    ["test-mode", { livemode: false }],
    ["incomplete", { status: "open" }],
    ["unpaid", { payment_status: "unpaid" }],
    ["subscription-mode", { mode: "subscription" }],
    ["wrong total", { amount_total: 3479 }],
    ["wrong currency", { currency: "usd" }],
    [
      "wrong plan metadata",
      {
        metadata: {
          user_id: "user-1",
          plan_key: "one_1m",
          campaign: "august_2026",
        },
      },
    ],
    [
      "wrong campaign metadata",
      {
        metadata: {
          user_id: "user-1",
          plan_key: "one_6m",
          campaign: "other",
        },
      },
    ],
    [
      "wrong price",
      {
        line_items: {
          data: [
            {
              quantity: 1,
              amount_total: 3480,
              price: { id: "price_other" },
            },
          ],
        },
      },
    ],
  ])("rejects a %s Checkout Session", async (_name, overrides) => {
    getInternalUserId.mockResolvedValue("user-1");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify(paidCampaignSession(overrides)),
          { status: 200 },
        ),
      ),
    );

    render(
      await CampaignPage({
        searchParams: Promise.resolve({
          checkout: "success",
          campaign: "august_2026",
          session_id: "cs_live_verified",
        }),
      }),
    );

    expect(
      JSON.parse(screen.getByTestId("checkout-props").textContent || "{}")
        .campaignPurchase,
    ).toBe(false);
  });

  it("rejects a malformed Checkout Session identifier without trusting the query", async () => {
    getInternalUserId.mockResolvedValue("user-1");
    render(
      await CampaignPage({
        searchParams: Promise.resolve({
          checkout: "success",
          campaign: "august_2026",
          session_id: "../../customers/cus_secret",
        }),
      }),
    );

    expect(
      JSON.parse(screen.getByTestId("checkout-props").textContent || "{}")
        .campaignPurchase,
    ).toBe(false);
  });

  it.each([
    ["the deadline has passed", "true", "2026-08-10T15:00:00.000Z"],
    ["the campaign is manually closed", "false", "2026-08-01T00:00:00.000Z"],
  ])("uses ended and normal-plan copy when %s", async (_name, bonusOpen, now) => {
    vi.stubEnv("AUGUST_2026_BONUS_OPEN", bonusOpen);
    vi.setSystemTime(new Date(now));

    render(await CampaignPage({ searchParams: Promise.resolve({}) }));

    expect(screen.queryByText(/2026年8月10日 23:59.*先着6名/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "先着6名の期間限定特典" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("相談特典の受付は終了しました")).toBeInTheDocument();
    expect(screen.getByText(/通常の6か月Pro買い切りプラン/)).toBeInTheDocument();
  });

  it.each([
    ["the deadline has passed", "true", "2026-08-10T15:00:00.000Z"],
    ["the campaign is manually closed", "false", "2026-08-01T00:00:00.000Z"],
  ])("does not advertise the bonus in metadata when %s", async (_name, bonusOpen, now) => {
    vi.stubEnv("AUGUST_2026_BONUS_OPEN", bonusOpen);
    vi.setSystemTime(new Date(now));
    const generateMetadata = (
      CampaignPageModule as unknown as {
        generateMetadata?: () => Promise<{ title?: string; description?: string }>;
      }
    ).generateMetadata;

    expect(generateMetadata).toBeTypeOf("function");
    const metadata = await generateMetadata?.();
    expect(metadata?.title).toContain("Pro 6か月");
    expect(metadata?.description).toContain("通常の6か月Pro買い切りプラン");
    expect(metadata?.description).not.toContain("先着6名");
    expect(metadata?.description).not.toContain("学習計画相談付き");
  });

  it("keeps the active campaign metadata unchanged", async () => {
    const generateMetadata = (
      CampaignPageModule as unknown as {
        generateMetadata?: () => Promise<{ description?: string }>;
      }
    ).generateMetadata;

    const metadata = await generateMetadata?.();
    expect(metadata?.description).toBe(
      "ITパスポート学習コーチの6か月Pro買い切りプラン。2026年8月10日まで先着6名に20分の学習計画相談付き。",
    );
  });
});
