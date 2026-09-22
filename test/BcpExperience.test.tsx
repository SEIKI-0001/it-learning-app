// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BcpExperience from "@/components/experiences/BcpExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <BcpExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const strikeAndRecover = () => {
  click("🌋 大地震発生！");
  for (let i = 0; i < 4; i++) click("1ステップ進む");
};

describe("BcpExperience", () => {
  it("keeps the three preparations and the quiz", () => {
    renderDeck();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    for (const t of ["バックアップ", "代替拠点", "連絡手順"]) expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    click("解説2");
    expect(screen.getByText("BCPの備えとして正しい？")).toBeInTheDocument();
  });

  it("preparations appear as objects in the model before the disaster", () => {
    renderDeck();
    expect(screen.getByTestId("bcp-vault-label")).toHaveAttribute("data-present", "false");
    click(/バックアップ/);
    expect(screen.getByTestId("bcp-vault-label")).toHaveAttribute("data-present", "true");
  });

  it("with all preparations, staff move to the alternate site, data is restored, and it reopens in 2 days", () => {
    renderDeck();
    click(/バックアップ/);
    click(/代替拠点/);
    click(/連絡手順/);
    click("🌋 大地震発生！");
    expect(screen.getByTestId("bcp-scene")).toHaveAttribute("data-disaster", "true");
    click("1ステップ進む");
    expect(screen.getByTestId("bcp-staff-token")).toHaveTextContent("担当決定");
    click("1ステップ進む");
    expect(screen.getByTestId("bcp-staff-token")).toHaveAttribute("data-at", "alt");
    click("1ステップ進む");
    expect(screen.getByTestId("bcp-data-token")).toHaveAttribute("data-at", "alt");
    click("1ステップ進む");
    expect(screen.getByTestId("bcp-recovery-bar")).toHaveTextContent("合計 2日");
    expect(screen.getByTestId("bcp-verdict")).toHaveTextContent("たった2日！");
  });

  it("without preparations, no one knows whom to call, there is nowhere to work and data is lost", () => {
    renderDeck();
    click("🌋 大地震発生！");
    click("1ステップ進む");
    expect(screen.getByTestId("bcp-staff-token")).toHaveAttribute("data-tone", "ng");
    click("1ステップ進む");
    expect(screen.getByTestId("bcp-staff-token")).toHaveAttribute("data-at", "staff");
    click("1ステップ進む");
    expect(screen.getByTestId("bcp-data-token")).toHaveTextContent("顧客データ消失");
    click("1ステップ進む");
    expect(screen.getByTestId("bcp-verdict")).toHaveTextContent("めどが立たない");
  });

  it("recovery time changes with the preparations (backup + site = about a week)", () => {
    renderDeck();
    click(/バックアップ/);
    click(/代替拠点/);
    strikeAndRecover();
    expect(screen.getByTestId("bcp-verdict")).toHaveTextContent("約1週間");
    click("↺ 備えを選び直してもう一度");
    click(/代替拠点/);
    strikeAndRecover();
    expect(screen.getByTestId("bcp-verdict")).toHaveTextContent("1か月以上");
  });
});
