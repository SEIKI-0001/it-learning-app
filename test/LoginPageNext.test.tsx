// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

const getInternalUserId = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
);
vi.mock("@/lib/auth/currentUser", () => ({ getInternalUserId }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/auth/GoogleLoginButton", () => ({ default: () => null }));
vi.mock("@/components/mochit/Mochit", () => ({ default: () => null }));

import LoginPage from "@/app/login/page";

afterEach(() => vi.clearAllMocks());

// 公開解説の「記録する」は /login?next=<レッスン> へ来る。ログイン済みならそのまま戻す。
describe("login page for signed-in users", () => {
  it("returns to the requested lesson", async () => {
    getInternalUserId.mockResolvedValue("user-1");
    const next = "/learn/strategy/analysis/strat-swot#lesson-content";
    await expect(LoginPage({ searchParams: Promise.resolve({ next }) })).rejects.toThrow(`REDIRECT:${next}`);
  });

  it.each(["//evil.example", "/\\evil.example", "https://evil.example"])("ignores an external next (%s)", async (next) => {
    getInternalUserId.mockResolvedValue("user-1");
    await expect(LoginPage({ searchParams: Promise.resolve({ next }) })).rejects.toThrow("REDIRECT:/");
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
