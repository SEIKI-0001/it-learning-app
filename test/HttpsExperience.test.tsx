// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HttpsExperience from "@/components/experiences/HttpsExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <HttpsExperience />
    </ExperienceSlideDeck>,
  );
}

const scene = () => screen.getByTestId("https-scene");
const next = () => fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
const capsuleState = () => scene().querySelector('[role="img"][data-capsule-state]')?.getAttribute("data-capsule-state");

describe("HttpsExperience", () => {
  it("keeps the three slides: eavesdrop → comparison table → caution", () => {
    renderDeck();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    for (const row of ["暗号化", "盗み見", "URL", "使う場面"]) {
      expect(screen.getByRole("cell", { name: row })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "解説3" }));
    expect(screen.getByText(/サイト自体が詐欺でない保証ではない/)).toBeInTheDocument();
  });

  it("renders user, web server and eavesdropper on the same floor", () => {
    renderDeck();
    expect(scene().querySelector('[data-illustration="human"]')).not.toBeNull();
    expect(scene().querySelector('[data-illustration="web"]')).not.toBeNull();
    expect(scene().querySelector('[data-illustration="eavesdropper"]')).not.toBeNull();
  });

  it("HTTP: the same plaintext capsule is readable by the eavesdropper", () => {
    renderDeck();
    expect(screen.queryByTestId("eve-screen")).toBeNull();
    next();
    next();
    expect(screen.getByTestId("https-step-title")).toHaveTextContent("途中で盗み見される");
    expect(capsuleState()).toBe("plain");
    expect(screen.getByTestId("eve-screen")).toHaveTextContent("password: himitsu123");
    expect(screen.getByTestId("eve-screen")).toHaveTextContent("読めた");
    expect(screen.getByTestId("tls-tunnel")).toHaveAttribute("data-on", "false");
  });

  it("HTTPS: switching mode turns the same capsule into ENCRYPTED DATA and the server decrypts it", () => {
    renderDeck();
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: "HTTPS 🔒（暗号化）" }));
    expect(capsuleState()).toBe("encrypted");
    expect(within(scene()).getByText("ENCRYPTED DATA")).toBeInTheDocument();
    expect(screen.getByTestId("eve-screen")).not.toHaveTextContent("himitsu");
    expect(screen.getByTestId("eve-screen")).toHaveTextContent("読めない");
    expect(screen.getByTestId("tls-tunnel")).toHaveAttribute("data-on", "true");

    next();
    expect(capsuleState()).toBe("decrypted");
    expect(scene().querySelector('[role="img"][data-capsule-state]')).toHaveTextContent("password: himitsu123");
  });

  it("uses the user's own input as the payload", () => {
    renderDeck();
    fireEvent.change(screen.getByLabelText("送る内容："), { target: { value: "card: 1234" } });
    expect(screen.getByTestId("eve-sees")).toHaveTextContent("card: 1234");
    fireEvent.click(screen.getByRole("button", { name: "HTTPS 🔒（暗号化）" }));
    expect(screen.getByTestId("eve-sees")).not.toHaveTextContent("card");
  });

  it("disables autoplay under prefers-reduced-motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    renderDeck();
    expect(scene()).toHaveAttribute("data-reduced-motion", "true");
    expect(screen.getByRole("button", { name: "通信を再生" })).toBeDisabled();
  });
});
