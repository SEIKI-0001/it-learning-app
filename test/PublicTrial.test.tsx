// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TrialPage from "@/app/lp/try/page";
import { isPublicPath } from "@/lib/auth/publicRoutes";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("public learning trial", () => {
  it("lets a visitor operate the real lesson before registration without saving answers", () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<TrialPage />);
    expect(isPublicPath("/lp/try")).toBe(true);
    expect(isPublicPath("/learn")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    const forward = screen.getByRole("button", { name: "1ステップ進む" });
    fireEvent.click(forward);
    fireEvent.click(forward);
    expect(screen.getByTestId("dns-lookup")).toHaveAttribute("data-state", "searching");
    act(() => vi.advanceTimersByTime(1400));
    expect(screen.getByTestId("dns-lookup")).toHaveAttribute("data-state", "found");
    fireEvent.click(screen.getByRole("button", { name: "DNSを止める" }));
    expect(screen.getByTestId("network-scene-caption")).toHaveTextContent("応答が返ってこない");
    // 学習記録は保存しない。送るのは体験の開始・完了の計測（/api/funnel）だけ。
    const sentTo = fetchSpy.mock.calls.map(([url]) => String(url));
    expect(sentTo.filter((url) => url !== "/api/funnel")).toEqual([]);
    expect(screen.getByRole("link", { name: /無料登録して学習を始める/ })).toHaveAttribute(
      "href",
      "/login?next=/onboarding&from=trial",
    );
  });
});
