// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import FirewallExperience from "@/components/experiences/FirewallExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <FirewallExperience />
    </ExperienceSlideDeck>,
  );
}

const packet = () => screen.getByTestId("packet");
const next = () => fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
const lit = (part: "port" | "body") =>
  packet().querySelector(`[data-lit="true"]`)?.className.includes(part === "port" ? "Port" : "Body");

describe("FirewallExperience", () => {
  it("keeps four slides: gate scene, FW vs WAF, VPN, zero trust", () => {
    renderDeck();
    expect(screen.getByText("1 / 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    expect(screen.getByRole("cell", { name: "見るところ" })).toBeInTheDocument();
    expect(screen.getByText("入力フォームに不正なSQL文を仕込む攻撃を防ぐ")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "解説3" }));
    expect(screen.getByTestId("vpn-scene")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "解説4" }));
    expect(screen.getByText("🚦 ゼロトラスト")).toBeInTheDocument();
  });

  it("normal traffic passes FW (port) and WAF (content) and reaches the app", () => {
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: "1ステップ戻る" }));
    expect(packet()).toHaveAttribute("data-stop", "src");
    next();
    expect(packet()).toHaveAttribute("data-stop", "fw");
    expect(lit("port")).toBe(true);
    expect(screen.getByTestId("verdict-fw")).toHaveTextContent("通過");
    next();
    expect(packet()).toHaveAttribute("data-stop", "waf");
    expect(lit("body")).toBe(true);
    next();
    expect(packet()).toHaveAttribute("data-stop", "app");
    expect(packet()).toHaveAttribute("data-blocked", "false");
  });

  it("a bad port stops at the FW; SQL injection passes the FW and stops at the WAF", () => {
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: "不正ポート" }));
    fireEvent.click(screen.getByRole("button", { name: "STEP 2：FWが遮断" }));
    expect(packet()).toHaveAttribute("data-stop", "fw");
    expect(packet()).toHaveAttribute("data-blocked", "true");
    expect(screen.getByTestId("verdict-fw")).toHaveTextContent("遮断");
    expect(screen.queryByRole("button", { name: "STEP 3：WAFが遮断" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "SQLインジェクション" }));
    fireEvent.click(screen.getByRole("button", { name: "STEP 3：WAFが遮断" }));
    expect(screen.getByTestId("verdict-fw")).toHaveTextContent("通過（ポート443は許可）");
    expect(screen.getByTestId("verdict-waf")).toHaveTextContent("遮断（中身が攻撃）");
    expect(packet()).toHaveAttribute("data-stop", "waf");
    expect(packet()).toHaveAttribute("data-blocked", "true");
  });

  it("shows the insight after all three kinds of traffic are tried", () => {
    renderDeck();
    for (const name of ["正常通信", "不正ポート", "SQLインジェクション"]) {
      fireEvent.click(screen.getByRole("button", { name }));
      const steps = screen.getAllByRole("button", { name: /^STEP \d：/ });
      fireEvent.click(steps[steps.length - 1]);
    }
    expect(screen.getByTestId("gate-insight")).toHaveTextContent("止める場所も、見るものも違う");
  });

  it("VPN builds a tunnel and the eavesdropper can no longer read the data", () => {
    vi.useFakeTimers();
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: "解説3" }));
    fireEvent.click(screen.getByRole("button", { name: "📤 会議資料を会社へ送る" }));
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByTestId("vpn-eve-screen")).toHaveTextContent("会議資料.pdf");
    expect(screen.queryByTestId("vpn-tunnel")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "VPNあり 🔒" }));
    expect(screen.getByTestId("vpn-tunnel")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "📤 会議資料を会社へ送る" }));
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByTestId("vpn-eve-screen")).toHaveTextContent("トンネルの中は読めない");
    expect(screen.getByTestId("vpn-eve-screen")).not.toHaveTextContent("会議資料");
  });
});
