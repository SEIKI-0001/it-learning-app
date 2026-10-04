// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import EncryptionHashExperience from "@/components/experiences/EncryptionHashExperience";
import { ADDRESS, ADDRESS_CIPHER, PASSWORD, PASSWORD_HASH } from "@/components/experiences/encryption/MemberSiteDioramaScene";
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

  it("store: the database keeps only the address ciphertext and the password hash", () => {
    renderDeck();
    expect(screen.getByTestId("member-form")).toHaveTextContent(ADDRESS);
    expect(screen.queryByTestId("member-db-row")).toBeNull();
    next();
    const row = screen.getByTestId("member-db-row");
    expect(row).toHaveTextContent(ADDRESS_CIPHER);
    expect(row).toHaveTextContent(PASSWORD_HASH);
    expect(row).not.toHaveTextContent(ADDRESS);
    expect(row).not.toHaveTextContent(PASSWORD);
  });

  it("ship: the same key decrypts the address back for the shipping label (reversible)", () => {
    renderDeck();
    next();
    next();
    expect(screen.getByTestId("member-ship")).toHaveTextContent(`お届け先：${ADDRESS}`);
  });

  it("login compares hashes; a one-letter change gives a totally different value and fails", () => {
    renderDeck();
    for (let i = 0; i < 3; i++) next();
    expect(screen.getByTestId("member-compare")).toHaveAttribute("data-match", "true");
    next();
    expect(screen.getByTestId("member-compare")).toHaveAttribute("data-match", "false");
    expect(screen.getByTestId("hash-compare-result")).toHaveTextContent("1文字の違いなのに");
    click("Spring123");
    expect(screen.getByTestId("member-compare")).toHaveAttribute("data-match", "false");
    click(PASSWORD);
    expect(screen.getByTestId("member-compare")).toHaveAttribute("data-match", "true");
    expect(screen.getByTestId("hash-compare-result")).toHaveTextContent("完全に同じ値");
  });

  it("leak: the thief only gets ciphertext and a hash", () => {
    renderDeck();
    for (let i = 0; i < 5; i++) next();
    expect(screen.getByTestId("member-db-row")).toHaveAttribute("data-leaked", "true");
    expect(screen.getByTestId("member-db-row")).toHaveTextContent(PASSWORD_HASH);
  });

  it("toy hash avalanches on a one-letter change", () => {
    const a = hashHex("HELLO");
    const b = hashHex("HELLo");
    const same = [...a].filter((c, i) => c === b[i]).length;
    expect(a).toHaveLength(16);
    expect(same).toBeLessThan(6);
  });
});
