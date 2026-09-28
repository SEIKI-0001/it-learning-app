// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import WirelessMobileExperience from "@/components/experiences/WirelessMobileExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <WirelessMobileExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const next = () => click("1ステップ進む");
const toEnd = () => {
  next();
  next();
};

describe("WirelessMobileExperience", () => {
  it("mobile slide: 5G / tethering / MVNO switch the route on the street model, and the quiz is kept", () => {
    renderDeck();
    click("解説2");
    expect(screen.getByTestId("mobile-scene")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-5g")).toHaveTextContent("多数同時接続");
    click(/テザリング/);
    expect(screen.getByTestId("mobile-mode")).toHaveTextContent("スマホが親機");
    expect(screen.getByTestId("mobile-hotspot")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-tether")).toHaveTextContent("SIMなし");
    click(/MVNO/);
    expect(screen.getByTestId("mobile-lease-note")).toHaveTextContent("大手のもの");
    expect(screen.getByText("MVNO（格安SIM）")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByText("フリーWi-Fi、安全？危険？")).toBeInTheDocument();
  });

  it("step 1 shows the laptop's Wi-Fi list: SSID names and lock marks are separate", () => {
    renderDeck();
    expect(screen.getByTestId("wifi-list")).toHaveTextContent("cafe-wifi-2F");
    expect(screen.getByTestId("wifi-list")).toHaveTextContent("Free_WiFi");
  });

  it("SSID is just the name of the radio — the lock is a separate tag", () => {
    renderDeck();
    expect(screen.getByTestId("wifi-ssid")).toHaveTextContent("cafe-wifi-2F");
    expect(screen.getByTestId("wifi-ssid")).toHaveTextContent("暗号化なし");
    click(/WPA2\/WPA3/);
    expect(screen.getByTestId("wifi-ssid")).toHaveTextContent("cafe-wifi-2F");
    expect(screen.getByTestId("wifi-ssid")).toHaveTextContent("WPA2/WPA3");
  });

  it("without encryption the radio spreads to the eavesdropper, who can read ID / PASSWORD", () => {
    renderDeck();
    next();
    expect(screen.getByTestId("wifi-waves")).toBeInTheDocument();
    expect(screen.getByTestId("wifi-packet-copy")).toBeInTheDocument();
    next();
    expect(screen.getByTestId("wifi-ap-result")).toHaveTextContent("受信");
    expect(screen.getByTestId("wifi-eve")).toHaveAttribute("data-reads", "true");
    expect(screen.getByTestId("wifi-eve")).toHaveTextContent("pass=spring123");
  });

  it("with WPA2/WPA3 the eavesdropper still receives the radio but only sees ciphertext", () => {
    renderDeck();
    click(/WPA2\/WPA3/);
    toEnd();
    expect(screen.getByTestId("wifi-eve")).toHaveAttribute("data-gets", "true");
    expect(screen.getByTestId("wifi-eve")).toHaveAttribute("data-reads", "false");
    expect(screen.getByTestId("wifi-eve")).not.toHaveTextContent("spring123");
    expect(screen.getByTestId("wifi-ap-result")).toHaveTextContent("正しい鍵で復号");
  });

  it("a cable (for comparison) carries data only along the wire", () => {
    renderDeck();
    click(/比較：有線/);
    next();
    expect(screen.queryByTestId("wifi-waves")).toBeNull();
    expect(screen.getByTestId("wifi-cable")).toBeInTheDocument();
    next();
    expect(screen.getByTestId("wifi-eve")).toHaveAttribute("data-gets", "false");
  });

  it("comparing open and WPA shows the insight", () => {
    renderDeck();
    toEnd();
    click(/WPA2\/WPA3/);
    toEnd();
    expect(screen.getByTestId("wifi-insight")).toHaveTextContent("SSIDはただの名前");
  });
});
