// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CommonKeyExperience from "@/components/experiences/CommonKeyExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderFlow() {
  render(
    <ExperienceSlideDeck>
      <CommonKeyExperience />
    </ExperienceSlideDeck>,
  );
  fireEvent.click(screen.getByRole("button", { name: "解説2" }));
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const next = () => click("1ステップ進む");
const key = (owner: string) => screen.getByRole("img", { name: `${owner}が持つ共通鍵` });
const toEnd = () => {
  for (let i = 0; i < 5; i++) next();
};

describe("CommonKeyExperience", () => {
  it("keeps the one-key explanation and the comparison with public key crypto", () => {
    render(
      <ExperienceSlideDeck>
        <CommonKeyExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1本の鍵で暗号化も復号も")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByText("あり（鍵配送問題）")).toBeInTheDocument();
  });

  it("keeps the two phases: ① share the same key, then ② encrypt → send → decrypt with it", () => {
    renderFlow();
    expect(screen.getByTestId("ck-phase")).toHaveAttribute("data-phase", "1");
    next();
    expect(key("B")).toHaveAttribute("data-spot", "transit");
    next();
    expect(key("A")).toHaveAttribute("data-spot", "aHome");
    expect(key("B")).toHaveAttribute("data-spot", "bHome");
    next();
    expect(screen.getByTestId("ck-phase")).toHaveAttribute("data-phase", "2");
    expect(key("A")).toHaveAttribute("data-spot", "aUse");
    next();
    next();
    expect(key("B")).toHaveAttribute("data-spot", "bUse");
    expect(screen.getByRole("img", { name: "復号されたメッセージ：会議は10時" })).toBeInTheDocument();
  });

  it("normal case: the eavesdropper copies the ciphertext but cannot read it", () => {
    renderFlow();
    toEnd();
    expect(screen.queryByRole("img", { name: "盗聴者が持つ共通鍵" })).toBeNull();
    expect(screen.getByTestId("ck-eve")).toHaveAttribute("data-reads", "false");
  });

  it("stolen case: the key is copied in phase 1, so later ciphertext is decrypted by the eavesdropper", () => {
    renderFlow();
    click("😈 鍵を盗まれたケース");
    next();
    expect(screen.getByTestId("ck-tap")).toHaveAttribute("data-tap", "key");
    expect(key("盗聴者")).toBeInTheDocument();
    next();
    next();
    next();
    expect(screen.getByTestId("ck-tap")).toHaveAttribute("data-tap", "data");
    next();
    expect(screen.getByTestId("ck-eve")).toHaveAttribute("data-reads", "true");
    expect(screen.getByTestId("ck-eve")).toHaveTextContent("会議は10時");
  });

  it("comparing both cases shows the key distribution insight", () => {
    renderFlow();
    toEnd();
    click(/鍵を盗まれたケース/);
    toEnd();
    expect(screen.getByTestId("ck-insight")).toHaveTextContent("鍵配送問題");
  });
});
