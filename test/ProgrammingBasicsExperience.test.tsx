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

describe("ProgrammingBasicsExperience", () => {
  it("has seven slides, no weather analogy, and the first five slides are static flow diagrams", () => {
    renderDeck();
    expect(screen.getByText("1 / 7")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/天気|傘|階段/);
    expect(screen.getByTestId("prog-overall")).toHaveAccessibleName(/価格を受け取る/);
    expect(screen.getByTestId("prog-overall-steps")).toHaveTextContent("値を受け取る");
    expect(screen.getByTestId("prog-overall-steps")).toHaveTextContent("880 ＋ 500 ＝ 1380 を表示");
    for (const slide of ["解説2", "解説3", "解説4", "解説5"]) {
      click(slide);
      expect(screen.queryByRole("button", { name: /実行|もう一度見る/ })).toBeNull();
    }
  });

  it("sequence: A → B → C with the code beside it, and ← means assignment", () => {
    renderDeck();
    click("解説2");
    expect(screen.getByTestId("prog-sequence").querySelectorAll("[data-node]")).toHaveLength(5);
    expect(screen.getByTestId("prog-sequence-code")).toHaveTextContent("税込 ← 価格 × 1.1");
    expect(screen.getByTestId("prog-vars")).toHaveTextContent("880");
    expect(screen.getByText(/代入/, { selector: "b" })).toBeInTheDocument();
  });

  it("branch: the decision splits into yes / no and only one side runs (a ≧ 5 table)", () => {
    renderDeck();
    click("解説3");
    const flow = screen.getByTestId("prog-branch");
    expect(flow.querySelector('[data-edge-kind="yes"]')).not.toBeNull();
    expect(flow.querySelector('[data-edge-kind="no"]')).not.toBeNull();
    expect(screen.getByTestId("prog-branch-code")).toHaveTextContent("そうでなければ");
    const rows = [...screen.getByTestId("prog-branch-table").querySelectorAll("tbody tr")].map((r) => r.textContent);
    expect(rows).toEqual([expect.stringMatching(/^7.*B$/), expect.stringMatching(/^5.*5も含む.*B$/), expect.stringMatching(/^3.*C$/)]);
  });

  it("loop: the arrow goes back to the condition and the trace ends at 1+2+3 = 6", () => {
    renderDeck();
    click("解説4");
    expect(screen.getByTestId("prog-loop").querySelector('[data-edge-kind="loop"]')).not.toBeNull();
    const exit = screen.getByTestId("prog-loop-trace").querySelector('[data-exit="true"]');
    expect(exit).toHaveTextContent("4 ≦ 3 いいえ");
    expect(exit).toHaveTextContent("6");
  });

  it("function: says why first, then call → run → return, then before/after", () => {
    renderDeck();
    click("解説5");
    expect(screen.getByTestId("fn-meaning")).toHaveTextContent("名前を書くだけで呼び出せる");
    expect(screen.getByTestId("fn-flow").querySelectorAll('[data-edge-kind="call"]')).toHaveLength(3);
    expect(screen.getByTestId("fn-steps")).toHaveTextContent("結果を返す");
    expect(screen.getByTestId("fn-before-after")).toHaveTextContent("3か所");
    expect(screen.getByTestId("fn-before-after")).toHaveTextContent("1か所");
    expect(screen.getByTestId("fn-compare")).toHaveTextContent("コメント");
  });

  it("translate: the lead says what to watch, then compiler translates all then links, interpreter alternates, assembler maps assembly 1:1", () => {
    renderDeck();
    click("解説6");
    expect(screen.getByTestId("trans-lead")).toHaveTextContent("「翻訳」と「実行」の順番");
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
