// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NetworkAddressExperience from "@/components/experiences/NetworkAddressExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderJourney() {
  render(
    <ExperienceSlideDeck>
      <NetworkAddressExperience />
    </ExperienceSlideDeck>,
  );
  fireEvent.click(screen.getByRole("button", { name: "解説2" }));
}

function stateOf(selector: string) {
  return document.querySelector(selector)?.getAttribute("data-state");
}

function capsuleKind() {
  return document.querySelector("[data-capsule-kind]")?.getAttribute("data-capsule-kind");
}

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: matches && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("NetworkAddressExperience", () => {
  it("presents the next-generation DNS journey as three explanation slides", () => {
    render(
      <ExperienceSlideDeck>
        <NetworkAddressExperience />
      </ExperienceSlideDeck>,
    );

    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "1IPアドレスは「機械が使う住所」" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "解説2" }));

    expect(
      screen.getByRole("heading", { name: "2名前解決を「再生」して追う" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("renders the user, DNS server and web server as distinct scene models", () => {
    renderJourney();

    const scene = screen.getByTestId("network-scene");
    expect(scene.querySelector('[data-illustration="human"]')).not.toBeNull();
    expect(scene.querySelector('[data-illustration="dns"]')).not.toBeNull();
    expect(scene.querySelector('[data-illustration="web"]')).not.toBeNull();
    expect(scene.querySelectorAll("[data-lane]")).toHaveLength(3);
  });

  it("steps from DNS query to DNS response with direction shown on the lanes", () => {
    renderJourney();

    const packet = screen.getByRole("button", { name: "流れているデータの中身を見る" });
    expect(packet).toHaveTextContent("example.com");
    expect(capsuleKind()).toBe("input");

    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    expect(packet).toHaveTextContent("DNS QUERY");
    expect(packet).toHaveTextContent("example.com → ?");
    expect(screen.getByTestId("network-route")).toHaveTextContent("あなた → DNS");
    expect(stateOf('[data-lane="query"]')).toBe("active");
    expect(stateOf('[data-lane="response"]')).toBe("idle");
    expect(stateOf('[data-node="dns"]')).toBe("active");

    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    expect(packet).toHaveTextContent("DNS RESPONSE");
    expect(packet).toHaveTextContent("93.184.216.34");
    expect(screen.getByTestId("network-route")).toHaveTextContent("DNS → あなた");
    expect(stateOf('[data-lane="response"]')).toBe("active");
    expect(stateOf('[data-lane="query"]')).toBe("idle");

    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    expect(packet).toHaveTextContent("CONNECT");
    expect(stateOf('[data-lane="web"]')).toBe("active");
    expect(stateOf('[data-node="web"]')).toBe("active");
  });

  it("lets learners inspect the data capsule", () => {
    renderJourney();
    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));

    const packet = screen.getByRole("button", { name: "流れているデータの中身を見る" });
    fireEvent.click(packet);

    expect(packet).toHaveAttribute("aria-expanded", "true");
    const inspector = screen.getByTestId("capsule-inspector");
    expect(inspector).toHaveTextContent("DATA CAPSULE");
    expect(inspector).toHaveTextContent("DNS QUERY");
    expect(inspector).toHaveTextContent("あなた → DNS");
  });

  it("stops at the DNS during an outage and never connects to the web server", () => {
    vi.useFakeTimers();
    renderJourney();

    fireEvent.click(screen.getByRole("button", { name: "DNSを止める" }));
    expect(screen.getByRole("button", { name: "正常に戻す" })).toBeInTheDocument();
    expect(screen.getByText(/DNS応答なし → IPアドレス不明 → 接続先を決められない/)).toBeInTheDocument();

    // 問い合わせはDNSまで届くが、応答は返らない
    expect(stateOf('[data-node="dns"]')).toBe("error");
    expect(stateOf('[data-lane="response"]')).toBe("blocked");
    expect(capsuleKind()).toBe("query");

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(capsuleKind()).toBe("timeout");
    expect(screen.getByText("DNS timeout")).toBeInTheDocument();
    expect(screen.getByText("IP address unknown")).toBeInTheDocument();

    // 先へ進もうとしても Webサーバへの接続は発生しない
    const forward = screen.getByRole("button", { name: "1ステップ進む" });
    expect(forward).toBeDisabled();
    fireEvent.change(screen.getByRole("slider", { name: "名前解決のタイムライン" }), {
      target: { value: "4" },
    });
    expect(stateOf('[data-lane="web"]')).toBe("blocked");
    expect(stateOf('[data-node="web"]')).toBe("disabled");
    expect(capsuleKind()).not.toBe("connect");

    fireEvent.click(screen.getByRole("button", { name: "名前解決を再生" }));
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(stateOf('[data-lane="web"]')).toBe("blocked");
    expect(capsuleKind()).not.toBe("connect");

    fireEvent.click(screen.getByRole("button", { name: "正常に戻す" }));
    expect(stateOf('[data-node="dns"]')).toBe("active");
    expect(screen.queryByText("DNS timeout")).not.toBeInTheDocument();
  });

  it("stays fully operable with reduced motion", () => {
    stubReducedMotion(true);
    renderJourney();

    expect(screen.getByTestId("network-scene")).toHaveAttribute("data-reduced-motion", "true");
    expect(screen.getByRole("button", { name: "名前解決を再生" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    expect(capsuleKind()).toBe("response");
    expect(stateOf('[data-lane="response"]')).toBe("active");

    fireEvent.change(screen.getByRole("slider", { name: "名前解決のタイムライン" }), {
      target: { value: "0" },
    });
    expect(capsuleKind()).toBe("input");

    fireEvent.click(screen.getByRole("button", { name: "DNSを止める" }));
    expect(stateOf('[data-node="dns"]')).toBe("error");
    expect(stateOf('[data-lane="web"]')).toBe("blocked");
  });
});
