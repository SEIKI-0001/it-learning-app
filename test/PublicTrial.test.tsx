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
    expect(screen.getByTestId("work-doc")).toHaveAttribute("data-spot", "storage");
    fireEvent.click(screen.getByRole("button", { name: "開く" }));
    for (let i = 0; i < 8; i++) act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByTestId("work-doc")).toHaveAttribute("data-spot", "memory");
    fireEvent.click(screen.getByRole("button", { name: "電源を切る" }));
    expect(screen.getByTestId("stored-file")).toHaveTextContent("売上 100万円");
    // 学習記録は保存しない。送るのは体験の開始・完了の計測（/api/funnel）だけ。
    const sentTo = fetchSpy.mock.calls.map(([url]) => String(url));
    expect(sentTo.filter((url) => url !== "/api/funnel")).toEqual([]);
    expect(screen.getByRole("link", { name: /無料登録して学習を始める/ })).toHaveAttribute(
      "href",
      "/login?next=/onboarding&from=trial",
    );
  });
});
