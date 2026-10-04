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
    expect(screen.getByTestId("mobile-mode")).toHaveTextContent("多数同時接続");
    const radioOn = () => [...document.querySelectorAll('[data-radio][data-on="true"]')].map((el) => el.getAttribute("data-radio"));
    expect(radioOn()).toHaveLength(4);
    click(/テザリング/);
    expect(radioOn()).toEqual(["phone"]);
    expect(screen.getByTestId("mobile-mode")).toHaveTextContent("スマホが親機");
    expect(screen.getByTestId("mobile-hotspot")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-tether")).toHaveTextContent("SIMなし");
    click(/MVNO/);
    expect(screen.getByTestId("mobile-mode")).toHaveTextContent("大手の回線を借りる");
    expect(screen.getByTestId("mobile-sim")).toHaveTextContent("格安SIM");
    expect(screen.getByText("MVNO（格安SIM）")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByText("フリーWi-Fi、安全？危険？")).toBeInTheDocument();
  });

  it("step 1 shows the laptop's Wi-Fi list: SSID names and lock marks are separate", () => {
    renderDeck();
    expect(screen.getByTestId("wifi-list")).toHaveTextContent("cafe-wifi-2F");
    expect(screen.getByTestId("wifi-list")).toHaveTextContent("Free_WiFi");
    // 同じ SSID のまま、鍵の札だけが変わる
    expect(screen.getByTestId("wifi-list").querySelector('[data-picked="true"]')).toHaveTextContent("鍵なし");
    click(/WPA2\/WPA3/);
    expect(screen.getByTestId("wifi-list").querySelector('[data-picked="true"]')).toHaveTextContent("cafe-wifi-2F");
    expect(screen.getByTestId("wifi-list").querySelector('[data-picked="true"]')).toHaveTextContent("WPA2/3");
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
