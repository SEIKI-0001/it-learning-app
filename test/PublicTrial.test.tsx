// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TrialPage from "@/app/lp/try/page";
import { isPublicPath } from "@/lib/auth/publicRoutes";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("public learning trial", () => {
  it("lets a visitor operate the real lesson before registration without saving answers", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<TrialPage />);
    expect(isPublicPath("/lp/try")).toBe(true);
    expect(isPublicPath("/learn")).toBe(false);
    expect(screen.getByTestId("logic-lamp")).toHaveAttribute("data-lit", "false");
    fireEvent.click(screen.getByRole("button", { name: "入力B（今は0）" }));
    expect(screen.getByTestId("logic-lamp")).toHaveAttribute("data-lit", "true");
    expect(screen.getByTestId("logic-rule")).toHaveTextContent("AもBも1 → 1");
    fireEvent.click(screen.getByRole("button", { name: "入力A（今は1）" }));
    expect(screen.getByTestId("logic-lamp")).toHaveAttribute("data-lit", "false");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /無料登録して学習を始める/ })).toHaveAttribute("href", "/login?next=/onboarding");
  });
});
