// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import EncryptionHashExperience from "@/components/experiences/EncryptionHashExperience";
import { hashHex } from "@/components/experiences/encryption/toyCrypto";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <EncryptionHashExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const next = () => click("1ステップ進む");
const card = (id: "enc-card" | "hash-card") => screen.getByTestId(id);

describe("EncryptionHashExperience", () => {
  it("keeps the existing encryption / hashing / comparison slides", () => {
    renderDeck();
    click("解説2");
    expect(screen.getByText("暗号化（鍵で戻せる＝可逆）")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByText("ハッシュ化（戻せない＝一方向）")).toBeInTheDocument();
    click("解説4");
    expect(screen.getByText("戻せない（一方向）")).toBeInTheDocument();
  });

  it("encryption route: HELLO becomes ciphertext at the key gate and comes back as HELLO", () => {
    renderDeck();
    expect(card("enc-card")).toHaveAttribute("data-state", "plain");
    next();
    expect(card("enc-card")).toHaveAttribute("data-pos", "mid");
    expect(card("enc-card")).toHaveAttribute("data-state", "cipher");
    expect(card("enc-card").getAttribute("aria-label")).not.toContain("HELLO");
    next();
    expect(card("enc-card")).toHaveAttribute("data-pos", "end");
    expect(screen.getByRole("img", { name: "元に戻った平文：HELLO" })).toBeInTheDocument();
  });

  it("hash route: the digest cannot be pushed back through the hash function", () => {
    renderDeck();
    for (let i = 0; i < 3; i++) next();
    expect(card("hash-card")).toHaveAttribute("data-state", "digest");
    expect(screen.getByRole("img", { name: `ハッシュ値：${hashHex("HELLO")}` })).toBeInTheDocument();
    next();
    expect(card("hash-card")).toHaveAttribute("data-state", "blocked");
    expect(screen.getByTestId("hash-barrier")).toBeInTheDocument();
    expect(screen.getByTestId("hash-ghost")).toHaveTextContent("元の入力は作れない");
    // 同じ瞬間、暗号化ルートは元に戻れている（対比）
    expect(card("enc-card")).toHaveAttribute("data-state", "restored");
  });

  it("changing one character changes the hash value almost entirely; the same input gives the same value", () => {
    renderDeck();
    for (let i = 0; i < 5; i++) next();
    expect(screen.getByTestId("hash-compare-result")).toHaveTextContent("1文字の違いなのに");
    expect(screen.getByRole("img", { name: `ハッシュ値：${hashHex("HELLo")}` })).toBeInTheDocument();
    click("HELLO");
    expect(screen.getByTestId("hash-compare-result")).toHaveTextContent("完全に同じハッシュ値");
  });

  it("toy hash avalanches on a one-letter change", () => {
    const a = hashHex("HELLO");
    const b = hashHex("HELLo");
    const same = [...a].filter((c, i) => c === b[i]).length;
    expect(a).toHaveLength(16);
    expect(same).toBeLessThan(6);
  });
});
