// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProgrammingBasicsExperience from "@/components/experiences/ProgrammingBasicsExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <ProgrammingBasicsExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
/** 場面を n 回ぶん進める（1場面ずつ描画させる） */
const steps = (ms: number, n: number) => {
  for (let i = 0; i < n; i++) wait(ms);
};
/** いま光っているプログラムの行 */
const currentLine = (testId: string) => screen.getByTestId(testId).querySelector('[data-current="true"]')?.textContent ?? "";

describe("ProgrammingBasicsExperience", () => {
  it("has seven slides and never asks to press a button for each step", () => {
    renderDeck();
    expect(screen.getByText("1 / 7")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /1行実行|1回まわす|実行する/ })).toBeNull();
    expect(screen.getByText(/代入/, { selector: "b" })).toBeInTheDocument();
  });

  it("variable: rain goes into the 天気 box by itself, is read by name, then sunny overwrites it", () => {
    renderDeck();
    expect(screen.queryByTestId("var-value")).toBeNull();
    wait(1900);
    expect(screen.getByTestId("var-value")).toHaveAttribute("data-value", "rain");
    expect(currentLine("var-program")).toContain("天気 ← \"雨\"");
    wait(1900);
    expect(screen.getByTestId("var-bubble")).toHaveTextContent("天気は「雨」");
    wait(1900);
    expect(screen.getByTestId("var-value")).toHaveAttribute("data-value", "sun");
    expect(screen.getByTestId("var-ejected")).toHaveTextContent("雨");
    expect(screen.getByTestId("var-caption")).toHaveTextContent("上書き");
    wait(1900);
    expect(screen.getByTestId("var-bubble")).toHaveTextContent("天気は「晴れ」");
    expect(screen.getByRole("button", { name: "↺ もう一度見る" })).toBeEnabled();
  });

  it("branch: the walker takes the umbrella road on rain, and switching to sunny re-runs on the plain road", () => {
    renderDeck();
    click("解説2");
    wait(1300);
    expect(currentLine("branch-program")).toContain("もし 天気 が 雨 なら");
    wait(1300);
    expect(screen.getByTestId("rain-stage")).toHaveAttribute("data-route", "rain");
    expect(currentLine("branch-program")).toContain("傘を持つ");
    wait(1300);
    expect(screen.getByTestId("rain-result")).toHaveTextContent("出発");

    click("☀️ 晴れ");
    expect(screen.getByTestId("rain-stage")).toHaveAttribute("data-route", "none");
    wait(1300);
    expect(currentLine("branch-program")).toContain("そうでなければ");
    wait(1300);
    expect(screen.getByTestId("rain-stage")).toHaveAttribute("data-route", "sun");
    expect(currentLine("branch-program")).toContain("そのまま");
  });

  it("loop: climbs one stair per repeat and stops after the chosen count", () => {
    renderDeck();
    click("解説3");
    click("3回");
    for (let i = 1; i <= 3; i++) {
      wait(850);
      expect(screen.getByTestId("loop-counter")).toHaveTextContent(`${i}/ 3 回`);
      expect(currentLine("loop-program")).toContain("1段のぼる");
    }
    wait(850);
    expect(currentLine("loop-program")).toContain("着いた");
    expect(screen.getByTestId("loop-caption")).toHaveTextContent("くり返しが終わり");
    wait(3000);
    expect(screen.getByTestId("loop-stage")).toHaveAttribute("data-count", "3");
  });

  it("number branch: a ≧ 5 shows only B for 7 and 5, only C for 3, and strikes out the other line", () => {
    renderDeck();
    click("解説2");
    steps(1700, 3);
    expect(screen.getByTestId("numbranch-output")).toHaveTextContent("B");
    expect(screen.getByTestId("numbranch-caption")).toHaveTextContent("どちらか一方");
    const skipped = () =>
      [...screen.getByTestId("numbranch-program").querySelectorAll('[data-skipped="true"]')].map((el) => el.textContent);
    expect(skipped()).toEqual([expect.stringContaining("「C」を表示")]);

    click("5");
    wait(1700);
    expect(screen.getByTestId("numbranch-caption")).toHaveTextContent("5も含む");
    steps(1700, 2);
    expect(screen.getByTestId("numbranch-output")).toHaveTextContent("B");

    click("3");
    steps(1700, 3);
    expect(screen.getByTestId("numbranch-output")).toHaveTextContent("C");
    expect(skipped()).toEqual([expect.stringContaining("「B」を表示")]);
  });

  it("sum loop: i ≦ 3 adds 1+2+3 = 6, exits when i becomes 4 without adding it", () => {
    renderDeck();
    click("解説4");
    // 初期化2行 + (判定・足す・増やす)×3 + 最後の判定 + 表示 = 13場面
    steps(1700, 12);
    expect(screen.getByTestId("sum-total")).toHaveTextContent("6");
    expect(screen.getByTestId("sum-i")).toHaveTextContent("4");
    expect(screen.getByTestId("sum-added")).toHaveTextContent("1 ＋ 2 ＋ 3 ＝ 6");
    expect(currentLine("sum-program")).toContain("合計を表示");

    click("i ≦ 4");
    steps(1700, 15);
    expect(screen.getByTestId("sum-total")).toHaveTextContent("10");
  });

  it("function: calling 身支度() jumps into its three lines and comes back, twice", () => {
    renderDeck();
    click("解説5");
    wait(1300);
    expect(currentLine("fn-main")).toContain("月曜");
    wait(1300);
    expect(screen.getByTestId("fn-stage")).toHaveAttribute("data-inside", "true");
    expect(currentLine("fn-def")).toContain("顔を洗う");
    steps(1300, 3);
    expect(screen.getByTestId("fn-stage")).toHaveAttribute("data-inside", "false");
    expect(currentLine("fn-main")).toContain("火曜");
    steps(1300, 4);
    expect(screen.getByTestId("fn-caption")).toHaveTextContent("関数（サブルーチン）");
    expect(screen.getByTestId("fn-compare")).toHaveTextContent("コメント");
  });

  it("translate: compiler translates all then links, interpreter alternates, assembler maps assembly 1:1", () => {
    renderDeck();
    click("解説6");
    steps(1700, 3);
    expect([0, 1, 2].map((i) => screen.getByTestId(`trans-row-${i}`).dataset.state)).toEqual(["1", "1", "1"]);
    wait(1700);
    expect(screen.getByTestId("trans-linker")).toHaveAttribute("data-on", "true");
    wait(1700);
    expect(screen.getByTestId("trans-row-2")).toHaveAttribute("data-state", "2");

    click("インタプリタ");
    expect(screen.queryByTestId("trans-linker")).toBeNull();
    steps(1700, 2);
    expect([0, 1, 2].map((i) => screen.getByTestId(`trans-row-${i}`).dataset.state)).toEqual(["2", "0", "0"]);

    click("アセンブラ");
    expect(screen.getByTestId("trans-stage")).toHaveTextContent("MOV A, 0");
    expect(screen.getByTestId("trans-summary")).toHaveTextContent("リンカ");
  });

  it("data formats: JSON is key/value in braces, XML free tags, HTML page structure, CSV comma table", () => {
    renderDeck();
    click("解説7");
    expect(screen.getByTestId("fmt-stage")).toHaveTextContent('"商品名": "ノートPC"');
    expect(screen.getByTestId("fmt-point")).toHaveTextContent("Web API");
    click("XML");
    expect(screen.getByTestId("fmt-stage")).toHaveTextContent("<商品名>ノートPC</商品名>");
    click("HTML");
    expect(screen.getByTestId("fmt-point")).toHaveTextContent("Webページの文書構造");
    click("CSV");
    expect(screen.getByTestId("fmt-stage")).toHaveTextContent("ノートPC,98000");
  });
});
