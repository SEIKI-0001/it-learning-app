// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getInternalUserId = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/currentUser", () => ({ getInternalUserId }));
vi.mock("@/components/auth/GoogleLoginButton", () => ({
  default: ({ next }: { next: string }) => (
    <output data-testid="google-next">{next}</output>
  ),
}));
vi.mock("@/components/mochit/Mochit", () => ({ default: () => <div /> }));

import LoginPage from "@/app/login/page";

beforeEach(() => {
  getInternalUserId.mockResolvedValue(null);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("NEXT_PUBLIC_LINE_ADD_FRIEND_URL", "https://line.example/add");
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("campaign login continuation", () => {
  it("emphasizes Google and preserves the campaign return path", async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/campaign/august-2026" }),
      }),
    );

    expect(screen.getByText("ログイン後、購入ページへ戻ります")).toBeInTheDocument();
    expect(screen.getByTestId("google-next")).toHaveTextContent(
      "/campaign/august-2026",
    );
    const lineLink = screen.getByRole("link", {
      name: "LINE公式アカウントから始める",
    });
    expect(lineLink).toHaveClass("bg-white", "text-brand-800");
    expect(lineLink).not.toHaveClass("bg-[#06C755]");
  });

  it("keeps LINE emphasized for normal login", async () => {
    render(await LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByText("ログイン後、購入ページへ戻ります")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "LINE公式アカウントから始める" }),
    ).toHaveClass("bg-[#06C755]", "text-white");
  });

  it("keeps LINE emphasized when Google is unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    render(
      await LoginPage({
        searchParams: Promise.resolve({ next: "/campaign/august-2026" }),
      }),
    );
    expect(
      screen.getByRole("link", { name: "LINE公式アカウントから始める" }),
    ).toHaveClass("bg-[#06C755]", "text-white");
  });

  it("does not treat an external-style next value as campaign continuation", async () => {
    render(
      await LoginPage({ searchParams: Promise.resolve({ next: "//evil.example" }) }),
    );
    expect(screen.getByTestId("google-next")).toHaveTextContent("/");
    expect(screen.queryByText("ログイン後、購入ページへ戻ります")).not.toBeInTheDocument();
  });
});
