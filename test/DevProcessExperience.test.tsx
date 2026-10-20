// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DevProcessExperience from "@/components/experiences/DevProcessExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <DevProcessExperience />
    </ExperienceSlideDeck>,
  );
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("DevProcessExperience static explanation", () => {
  it("shows the artifact chain 要件定義書 → 設計書 → プログラム → テスト結果 without interaction", () => {
    renderDeck();
    expect(screen.getByTestId("dev-chain")).toHaveTextContent(/要件定義書.*設計書.*プログラム.*テスト結果/);
  });

  it("a late change ripples back to every earlier artifact, an early one touches only the first", () => {
    renderDeck();
    const early = screen.getByTestId("dev-ripple-0").querySelectorAll("[data-status='none']");
    const late = screen.getByTestId("dev-ripple-1").querySelectorAll("[data-status='none']");
    expect(early).toHaveLength(3);
    expect(late).toHaveLength(0);
    expect(screen.getByTestId("dev-ripple-1")).toHaveTextContent("直すのは 4つすべて");
  });

  it("keeps the comparison table and the quiz", () => {
    renderDeck();
    click("解説3");
    expect(screen.getByRole("heading", { name: /ウォーターフォールとアジャイルをくらべる/ })).toBeInTheDocument();
    click("解説4");
    expect(screen.getByRole("heading", { name: /これはどっち？/ })).toBeInTheDocument();
  });
});

describe("過去問の出題に合わせた5枚（解説5〜9）", () => {
  it("has nine slides: four development models, each with when it fits", () => {
    renderDeck();
    expect(screen.getByText("1 / 9")).toBeInTheDocument();
    click("解説5");
    const models = within(screen.getByTestId("dev-models")).getAllByRole("listitem");
    expect(models.map((li) => li.getAttribute("data-model"))).toEqual(["ウォーターフォール", "プロトタイピング", "スパイラル", "アジャイル"]);
    expect(models[0]).toHaveTextContent("仕様変更が少ない");
    expect(models[1]).toHaveTextContent("確認用のソフトウェア");
    expect(models[3]).toHaveTextContent("優先度の高いものから短期間で開発とリリースをくり返す");
  });

  it("XP is an agile approach; pair programming, TDD and refactoring are its practices", () => {
    renderDeck();
    click("解説6");
    expect(screen.getByTestId("xp-box")).toHaveTextContent("短いサイクルでリリースするアジャイル開発のアプローチの一つ");
    const practices = screen.getByTestId("xp-practices");
    expect(practices.querySelector('[data-term="ペアプログラミング"]')).toHaveTextContent("2人のプログラマが、1台のコンピュータ");
    expect(practices.querySelector('[data-term="テスト駆動開発"]')).toHaveTextContent("テストプログラムを先に作成");
    expect(practices.querySelector('[data-term="リファクタリング"]')).toHaveTextContent("振る舞い（機能仕様）を変えずに、内部構造を改善");
  });

  it("DevOps links development and operations with automation, and names the look-alike choices", () => {
    renderDeck();
    click("解説7");
    expect(screen.getByTestId("devops-loop")).toHaveTextContent("自動化");
    const not = screen.getByTestId("devops-not");
    expect(not).toHaveTextContent("プロトタイピング");
    expect(not).toHaveTextContent("ペアプログラミング");
  });

  it("reverse engineering builds specs from source; deployment plans and agrees before installing", () => {
    renderDeck();
    click("解説8");
    expect(screen.getByTestId("after-terms").querySelector('[data-term="リバースエンジニアリング"]')).toHaveTextContent("解析して、仕様書を作る");
    expect(screen.getByTestId("install-flow")).toHaveTextContent(/導入計画書を作る.*合意を得る.*導入/);
  });

  it("checks the terms with three choices per question", () => {
    renderDeck();
    click("解説9");
    const quiz = screen.getByTestId("dev-terms-quiz");
    fireEvent.click(within(quiz).getByRole("button", { name: "DevOps" }));
    expect(quiz).toHaveTextContent("正解！");
    fireEvent.click(within(quiz).getByRole("button", { name: "すぐ導入する" }));
    expect(quiz).toHaveTextContent("正解は「導入計画書の作成」");
  });
});
