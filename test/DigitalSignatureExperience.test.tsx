// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DigitalSignatureExperience from "@/components/experiences/DigitalSignatureExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <DigitalSignatureExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const next = (n = 1) => {
  for (let i = 0; i < n; i++) click("1ステップ進む");
};
const toEnd = () => {
  for (let i = 0; i < 20; i++) {
    const btn = screen.getByRole("button", { name: "1ステップ進む" });
    if (btn.hasAttribute("disabled")) return;
    fireEvent.click(btn);
  }
};
const envelope = () => screen.getByTestId("signed-envelope");

describe("DigitalSignatureExperience", () => {
  it("keeps the lab, the CA slide and the encryption comparison", () => {
    renderDeck();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    click("解説2");
    expect(screen.getByText(/PKI（公開鍵基盤）/)).toBeInTheDocument();
    click("解説3");
    expect(screen.getByText("本人確認＋改ざん検知")).toBeInTheDocument();
  });

  it("walks write → hash → sign → send → arrive → verify ①②③ and verifies OK", () => {
    renderDeck();
    expect(envelope()).toHaveAttribute("data-signed", "false");
    expect(screen.queryByTestId("sender-hash")).toBeNull();
    next();
    expect(screen.getByTestId("sender-hash")).toHaveTextContent("A4-9F");
    next();
    expect(envelope()).toHaveAttribute("data-signed", "true");
    expect(screen.getByRole("img", { name: "山田さんの秘密鍵" })).toHaveAttribute("data-spot", "senderSign");
    next();
    expect(envelope()).toHaveAttribute("data-stop", "mid");
    next();
    expect(envelope()).toHaveAttribute("data-stop", "receiver");
    next();
    expect(screen.getByRole("img", { name: "山田さんの公開鍵" })).toHaveAttribute("data-spot", "receiverVerify");
    expect(screen.getByTestId("verify-panel")).toHaveAttribute("data-verdict", "pending");
    expect(screen.getByTestId("verify-sig")).toHaveTextContent("A4-9F");
    expect(screen.getByTestId("verify-doc")).toHaveAttribute("data-ready", "false");
    next();
    expect(screen.getByTestId("verify-doc")).toHaveTextContent("A4-9F");
    next();
    expect(screen.getByTestId("verify-panel")).toHaveAttribute("data-verdict", "ok");
    expect(screen.getByTestId("verify-panel")).toHaveTextContent("VERIFY OK");
  });

  it("shows the tampering as its own steps: grab, rewrite (signature untouched), then a hash mismatch", () => {
    renderDeck();
    click("😈 途中で書き換え");
    next(4);
    expect(envelope()).toHaveAttribute("data-stop", "attacker");
    expect(envelope()).toHaveAttribute("data-tampered", "false");
    expect(screen.getByTestId("rewrite-note")).toHaveTextContent("横取り");
    next();
    expect(envelope()).toHaveAttribute("data-tampered", "true");
    expect(screen.getByTestId("rewritten-from")).toHaveTextContent("1万円 支払います");
    expect(envelope()).toHaveTextContent("100万円");
    expect(envelope()).toHaveTextContent("署名はそのまま");
    next();
    expect(envelope()).toHaveAttribute("data-stop", "receiver");
    toEnd();
    const panel = screen.getByTestId("verify-panel");
    expect(panel).toHaveAttribute("data-verdict", "tamper");
    expect(panel).toHaveTextContent("A4-9F");
    expect(panel).toHaveTextContent("7C-21");
    expect(panel).toHaveTextContent("改ざん検出");
  });

  it("detects impersonation: a signature from another private key fails with the real public key", () => {
    renderDeck();
    click("🎭 別人がなりすまし");
    next(2);
    expect(screen.getByRole("img", { name: "偽者の秘密鍵" })).toHaveAttribute("data-forged", "true");
    toEnd();
    expect(screen.getByTestId("verify-panel")).toHaveAttribute("data-verdict", "fake");
    expect(screen.getByTestId("verify-panel")).toHaveTextContent("??-??");
  });

  it("shows the summary after all three scenarios are verified", () => {
    renderDeck();
    toEnd();
    click(/途中で書き換え/);
    toEnd();
    expect(screen.queryByTestId("sig-all-tried")).toBeNull();
    click(/別人がなりすまし/);
    toEnd();
    expect(screen.getByTestId("sig-all-tried")).toHaveTextContent("なりすまし防止");
  });

  it("CA: a real owner gets a certificate; a fake applicant is rejected and not trusted", () => {
    renderDeck();
    click("解説2");
    for (let i = 0; i < 3; i++) click("1ステップ進む");
    expect(screen.getByTestId("ca-token")).toHaveAttribute("data-certified", "true");
    expect(screen.getByTestId("ca-user-verdict")).toHaveTextContent("本物と確認");

    click("🎭 偽者が申請");
    click("1ステップ進む");
    expect(screen.getByTestId("ca-check")).toHaveTextContent("本人確認 ✗");
    click("1ステップ進む");
    click("1ステップ進む");
    expect(screen.getByTestId("ca-token")).toHaveAttribute("data-certified", "false");
    expect(screen.getByTestId("ca-user-verdict")).toHaveTextContent("信用しない");
  });
});
