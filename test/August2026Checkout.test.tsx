// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.hoisted(() => vi.fn());
const billing = vi.hoisted(() => ({
  status: null as null | {
    entitlements: { isPro: boolean };
  },
}));

vi.mock("@/lib/useBillingStatus", () => ({
  useBillingStatus: () => ({
    status: billing.status,
    loading: false,
    refresh,
  }),
}));
vi.mock("@/lib/userSession", () => ({ getUserId: () => "user-1" }));

import August2026Checkout from "@/components/campaign/August2026Checkout";

const baseProps = {
  authenticated: true,
  bonusActive: true,
  checkoutEnabled: true,
  lineUrl: "https://line.example/add",
  checkoutResult: null,
  campaignPurchase: false,
} as const;

beforeEach(() => {
  billing.status = null;
  refresh.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("August2026Checkout", () => {
  it("sends unauthenticated visitors to login and preserves the return path", () => {
    render(<August2026Checkout {...baseProps} authenticated={false} />);
    expect(
      screen.getByRole("link", { name: "ログインして3,480円で始める" }),
    ).toHaveAttribute(
      "href",
      "/login?next=%2Fcampaign%2Faugust-2026",
    );
  });

  it("renders purchase actions as accessible full-width CTAs", async () => {
    const { rerender } = render(
      <August2026Checkout {...baseProps} authenticated={false} />,
    );
    const loginLink = screen.getByRole("link", {
      name: "ログインして3,480円で始める",
    });
    expect(loginLink).toHaveClass("flex", "min-h-11", "w-full", "bg-brand-700", "text-white");

    rerender(<August2026Checkout {...baseProps} />);
    const activeButton = screen.getByRole("button", {
      name: "3,480円で6か月始める",
    });
    expect(activeButton).toHaveClass(
      "flex",
      "min-h-11",
      "w-full",
      "bg-brand-700",
      "text-white",
    );
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    fireEvent.click(activeButton);
    expect(
      await screen.findByRole("button", { name: "Stripeを開いています…" }),
    ).toHaveClass("flex", "min-h-11", "w-full", "bg-brand-700", "text-white");

    rerender(<August2026Checkout {...baseProps} checkoutEnabled={false} />);
    expect(screen.getByRole("button", { name: "決済を準備中" })).toHaveClass(
      "flex",
      "min-h-11",
      "w-full",
      "disabled:bg-slate-300",
    );
  });

  it("starts the approved campaign checkout", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ok: false, error: "テスト停止" }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<August2026Checkout {...baseProps} />);

    fireEvent.click(
      screen.getByRole("button", { name: "3,480円で6か月始める" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      userId: "user-1",
      plan: "one_6m",
      returnTo: "/campaign/august-2026",
      campaign: "august_2026",
    });
    expect(await screen.findByText("テスト停止")).toBeInTheDocument();
  });

  it("does not enable the bonus checkout when LINE is unavailable", () => {
    render(<August2026Checkout {...baseProps} lineUrl="" />);
    expect(
      screen.getByRole("button", { name: "特典受付を準備中" }),
    ).toBeDisabled();
  });

  it("shows a normal six-month purchase after the bonus closes", () => {
    render(
      <August2026Checkout
        {...baseProps}
        bonusActive={false}
        lineUrl=""
      />,
    );
    expect(
      screen.getByRole("button", { name: "通常の6か月プランを購入する" }),
    ).toBeEnabled();
    expect(screen.getByText("相談特典の受付は終了しました。")).toBeInTheDocument();
  });

  it("distinguishes cancellation from a successful return awaiting webhook", () => {
    const { rerender } = render(
      <August2026Checkout {...baseProps} checkoutResult="cancel" />,
    );
    expect(screen.getByText(/購入手続きをキャンセルしました。/)).toBeInTheDocument();

    rerender(<August2026Checkout {...baseProps} checkoutResult="success" />);
    expect(screen.getByText(/決済を確認中です。/)).toBeInTheDocument();
    expect(screen.queryByText("Pro反映済み")).not.toBeInTheDocument();
  });

  it("shows confirmation and the LINE fulfillment link only after Pro is active", () => {
    billing.status = { entitlements: { isPro: true } };
    render(
      <August2026Checkout
        {...baseProps}
        checkoutResult="success"
        campaignPurchase
      />,
    );
    expect(screen.getByText("Pro反映済み")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "LINEで相談特典を受け取る" }),
    ).toHaveAttribute("href", "https://line.example/add");
  });

  it("does not show the fulfillment link for an unverified campaign return", () => {
    billing.status = { entitlements: { isPro: true } };
    render(
      <August2026Checkout
        {...baseProps}
        checkoutResult="success"
        campaignPurchase={false}
      />,
    );

    expect(
      screen.queryByRole("link", { name: "LINEで相談特典を受け取る" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "プラン・購入履歴を確認する" }),
    ).toHaveAttribute("href", "/more");
  });
});
