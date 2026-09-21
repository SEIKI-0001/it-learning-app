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
      screen.getByRole("heading", { name: "2URL入力から表示までを「再生」して追う" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("renders the user, DNS server and web server as distinct scene models", () => {
    renderJourney();

    const scene = screen.getByTestId("network-scene");
    expect(scene.querySelector('[data-illustration="human"]')).not.toBeNull();
    expect(scene.querySelector('[data-illustration="dns"]')).not.toBeNull();
    expect(scene.querySelector('[data-illustration="web"]')).not.toBeNull();
    expect(scene.querySelectorAll("[data-lane]")).toHaveLength(4);
  });

  it("steps from DNS query to DNS response with direction shown on the lanes", () => {
    renderJourney();

    const packet = screen.getByRole("button", { name: "流れているデータの中身を見る" });
    expect(packet).toHaveTextContent("example.com");
    expect(capsuleKind()).toBe("input");

    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    expect(packet).toHaveTextContent("DNS問い合わせ");
    expect(packet).toHaveTextContent("example.com → ?");
    expect(screen.getByTestId("network-route")).toHaveTextContent("あなた → DNS");
    expect(stateOf('[data-lane="query"]')).toBe("active");
    expect(stateOf('[data-lane="response"]')).toBe("idle");
    expect(stateOf('[data-node="dns"]')).toBe("active");

    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    expect(packet).toHaveTextContent("DNS応答");
    expect(packet).toHaveTextContent("93.184.216.34");
    expect(screen.getByTestId("network-route")).toHaveTextContent("DNS → あなた");
    expect(stateOf('[data-lane="response"]')).toBe("active");
    expect(stateOf('[data-lane="query"]')).toBe("idle");

    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    expect(packet).toHaveTextContent("接続要求");
    expect(stateOf('[data-lane="web"]')).toBe("active");
    expect(stateOf('[data-node="web"]')).toBe("active");
  });

  it("continues past the web server until the page is displayed", () => {
    renderJourney();
    const forward = screen.getByRole("button", { name: "1ステップ進む" });
    for (let i = 0; i < 5; i += 1) fireEvent.click(forward);

    expect(screen.getByTestId("network-route")).toHaveTextContent("Webサーバ → あなた");
    expect(capsuleKind()).toBe("page");
    expect(stateOf('[data-lane="page"]')).toBe("active");
    expect(screen.queryByTestId("browser-window")).not.toBeInTheDocument();

    fireEvent.click(forward);
    expect(screen.getByText("7 / 7")).toBeInTheDocument();
    expect(screen.getByTestId("browser-window")).toHaveTextContent("example.com");
    expect(forward).toBeDisabled();
  });

  it("lets learners inspect the data capsule", () => {
    renderJourney();
    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));

    const packet = screen.getByRole("button", { name: "流れているデータの中身を見る" });
    fireEvent.click(packet);

    expect(packet).toHaveAttribute("aria-expanded", "true");
    const inspector = screen.getByTestId("capsule-inspector");
    expect(inspector).toHaveTextContent("データの中身");
    expect(inspector).toHaveTextContent("DNS問い合わせ");
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
    // 0.5倍速: まだ応答待ち
    expect(capsuleKind()).toBe("query");
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(capsuleKind()).toBe("timeout");
    expect(screen.getByText("DNSタイムアウト")).toBeInTheDocument();
    expect(screen.getByText("IPアドレスが分からない")).toBeInTheDocument();

    // 先へ進もうとしても Webサーバへの接続は発生しない
    const forward = screen.getByRole("button", { name: "1ステップ進む" });
    expect(forward).toBeDisabled();
    fireEvent.change(screen.getByRole("slider", { name: "名前解決のタイムライン" }), {
      target: { value: "6" },
    });
    expect(stateOf('[data-lane="web"]')).toBe("blocked");
    expect(stateOf('[data-lane="page"]')).toBe("blocked");
    expect(stateOf('[data-node="web"]')).toBe("disabled");
    expect(capsuleKind()).not.toBe("connect");
    expect(screen.queryByTestId("browser-window")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "名前解決を再生" }));
    act(() => {
      vi.advanceTimersByTime(12000);
    });
    expect(stateOf('[data-lane="web"]')).toBe("blocked");
    expect(capsuleKind()).not.toBe("connect");

    fireEvent.click(screen.getByRole("button", { name: "正常に戻す" }));
    expect(stateOf('[data-node="dns"]')).toBe("active");
    expect(screen.queryByText("DNSタイムアウト")).not.toBeInTheDocument();
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

  it("advances autoplay at half speed", () => {
    vi.useFakeTimers();
    renderJourney();
    fireEvent.click(screen.getByRole("button", { name: "名前解決を再生" }));

    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(capsuleKind()).toBe("input");
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(capsuleKind()).toBe("query");
  });

  it("switches between private and global addresses on slide 1", () => {
    render(
      <ExperienceSlideDeck>
        <NetworkAddressExperience />
      </ExperienceSlideDeck>,
    );

    expect(screen.getByTestId("address-scope")).toHaveAttribute("data-scope", "private");
    expect(screen.getByText("プライベートIPアドレス")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "インターネット側" }));
    expect(screen.getByTestId("address-scope")).toHaveAttribute("data-scope", "global");
    expect(screen.getByText("グローバルIPアドレス")).toBeInTheDocument();
  });

  it("gives feedback on the true/false checks on slide 3", () => {
    render(
      <ExperienceSlideDeck>
        <NetworkAddressExperience />
      </ExperienceSlideDeck>,
    );
    fireEvent.click(screen.getByRole("button", { name: "解説3" }));

    fireEvent.click(screen.getByRole("button", { name: "DNSはWebページのHTMLを返す：×" }));
    expect(screen.getByText(/正解（答え：×）/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "192.168.1.10 はインターネット上で世界に1つだけの住所だ：○" }),
    );
    expect(screen.getByText(/不正解（答え：×）/)).toBeInTheDocument();
    expect(screen.getByText("1 / 4 正解")).toBeInTheDocument();
  });
});
