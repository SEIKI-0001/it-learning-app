// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AlgorithmExperience from "@/components/experiences/AlgorithmExperience";
import { buildFlowTrace } from "@/components/experiences/algorithm/flowTrace";
import { askAt } from "@/components/experiences/algorithm/FlowTry";
import { FLOWCHART } from "@/components/experiences/algorithm/learningModel";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderDeck(slide = 1) {
  render(
    <ExperienceSlideDeck>
      <AlgorithmExperience />
    </ExperienceSlideDeck>,
  );
  if (slide > 1) fireEvent.click(screen.getByRole("button", { name: `解説${slide}` }));
}

describe("algorithm flowchart model", () => {
  it("models initialization, branching, and the loop back to the condition", () => {
    expect(FLOWCHART.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "condition", to: "add-current", label: "はい" }),
        expect.objectContaining({ from: "condition", to: "display-total", label: "いいえ" }),
        expect.objectContaining({ from: "increment-current", to: "condition", isLoop: true }),
      ]),
    );
  });
});

describe("AlgorithmExperience", () => {
  it("opens on the learner's own run, then the computer's correct run, then a recap", () => {
    renderDeck();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText("まず、あなたがコンピュータになって実行")).toBeInTheDocument();
    expect(screen.getByTestId("flow-try")).toHaveAttribute("data-state", "idle");
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    expect(screen.getByText("答え合わせ：コンピュータの正しい流れ")).toBeInTheDocument();
    expect(screen.getByTestId("flow-run")).toHaveAttribute("data-node", "start");
    fireEvent.click(screen.getByRole("button", { name: "解説3" }));
    expect(screen.getByText("選択（分岐）")).toBeInTheDocument();
    expect(screen.getByText("合計に今の数字 i を足す")).toBeInTheDocument();
  });

  it("labels each executed step with its structure: 順次 → 選択 → 繰り返し", () => {
    renderDeck(2);
    const next = () => fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    const structure = () => screen.getByTestId("flow-run-structure");
    expect(structure()).toHaveTextContent("順次");
    next();
    next();
    next();
    expect(structure()).toHaveTextContent("選択");
    next();
    next();
    next();
    expect(structure()).toHaveTextContent("繰り返し");
  });
});

describe("flowchart execution trace (token + variables)", () => {
  it("walks start → init → (condition → add → increment) × N → condition(no) → display → end", () => {
    const trace = buildFlowTrace(5);
    expect(trace).toHaveLength(21);
    expect(trace.filter((s) => s.node === "condition").map((s) => s.judge)).toEqual([true, true, true, true, true, false]);
    expect(trace.at(-2)).toMatchObject({ node: "display-total", total: 15, i: 6 });
    // くり返しは必ず条件へ戻る
    const afterIncrement = trace.flatMap((s, i) => (s.node === "increment-current" ? [trace[i + 1].node] : []));
    expect(new Set(afterIncrement)).toEqual(new Set(["condition"]));
    expect(buildFlowTrace(3).at(-2)).toMatchObject({ total: 6 });
  });

  it("moves the token through the nodes and updates the variable boxes beside the chart", () => {
    renderDeck(2);
    const run = () => screen.getByTestId("flow-run");
    const next = () => fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    expect(run()).toHaveAttribute("data-node", "start");
    expect(screen.getByTestId("flow-run-var-total")).toHaveTextContent("？");
    next();
    next();
    expect(screen.getByTestId("flow-run-var-i")).toHaveTextContent("1");
    expect(screen.getByTestId("flow-run-var-total")).toHaveTextContent("0");
    next();
    expect(run()).toHaveAttribute("data-node", "condition");
    expect(screen.getByTestId("flow-run-judge")).toHaveTextContent("1 ≦ 3 → はい");
    next();
    expect(run()).toHaveAttribute("data-node", "add-current");
    expect(screen.getByTestId("flow-run-var-total")).toHaveTextContent("1");
    next();
    expect(screen.getByTestId("flow-run-var-i")).toHaveTextContent("2");
    next();
    // i を増やしたあとは条件へ戻る（戻り道の矢印が「通った道」になる）
    expect(run()).toHaveAttribute("data-node", "condition");
    expect(run().querySelector('[data-edge="increment-current>condition"]')).toHaveAttribute("data-state", "taken");
    expect(screen.getByTestId("flow-run-lap")).toHaveTextContent("2 周目");
  });

  it("the NO branch leads to display: the token path changes with the condition", () => {
    renderDeck(2);
    fireEvent.click(screen.getByRole("button", { name: "i ≦ 3" }));
    fireEvent.click(screen.getByRole("button", { name: "STEP 13：i ≦ 3 ? → いいえ" }));
    expect(screen.getByTestId("flow-run-judge")).toHaveTextContent("4 ≦ 3 → いいえ");
    expect(screen.getByTestId("flow-run").querySelector('[data-edge="condition>display-total"]')).toHaveAttribute("data-state", "next");
    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    expect(screen.getByTestId("flow-run")).toHaveAttribute("data-node", "display-total");
    expect(screen.getByTestId("flow-run-output")).toHaveTextContent("6");
  });
});

describe("learner runs the flowchart first (FlowTry)", () => {
  it("asks at the key nodes: condition, new total, and where to go after i ← i + 1 (first time only)", () => {
    const trace = buildFlowTrace(3);
    const asked = trace.flatMap((s, i) => (askAt(trace, i, 3) ? [s.node] : []));
    expect(asked).toEqual([
      "condition", "add-current", "increment-current",
      "condition", "add-current",
      "condition", "add-current",
      "condition",
    ]);
    const firstAdd = askAt(trace, trace.findIndex((s) => s.node === "add-current"), 3);
    expect(firstAdd?.choices.map((c) => c.label)).toEqual(["0", "1", "2"]);
    expect(firstAdd?.choices.find((c) => c.ok)?.label).toBe("1");
  });

  it("stops at each question, hides the answer until picked, and explains a wrong pick", () => {
    vi.useFakeTimers();
    renderDeck();
    const tryRun = () => screen.getByTestId("flow-try");
    const stage = () => screen.getByTestId("flow-try-stage");
    // 1ノード進むごとに次のタイマーが張られるので、少しずつ進める
    const settle = () => {
      for (let n = 0; n < 8; n += 1) act(() => vi.advanceTimersByTime(2_000));
    };
    const answer = (label: string) => {
      fireEvent.click(screen.getByRole("button", { name: label }));
      settle();
    };

    fireEvent.click(screen.getByRole("button", { name: "実行をはじめる" }));
    settle();
    expect(tryRun()).toHaveAttribute("data-state", "ask");
    expect(stage()).toHaveAttribute("data-node", "condition");
    expect(screen.queryByTestId("flow-try-stage-judge")).toBeNull();
    expect(screen.getByTestId("flow-try-ask")).toHaveTextContent("i の箱は 1。「i ≦ 3 ?」の答えは？");

    // まちがえると理由が出て、その場で選び直す
    fireEvent.click(screen.getByRole("button", { name: "いいえ" }));
    expect(screen.getByTestId("flow-try-ask")).toHaveTextContent("1 ≦ 3 は成り立つので「はい」");
    expect(stage()).toHaveAttribute("data-node", "condition");
    answer("はい");

    expect(stage()).toHaveAttribute("data-node", "add-current");
    // 答えるまで合計の箱は書き換えない
    expect(screen.getByTestId("flow-try-stage-var-total")).toHaveTextContent("0");
    answer("1");
    expect(stage()).toHaveAttribute("data-node", "increment-current");
    answer("「i ≦ 3 ?」へ戻る");
    answer("はい");
    answer("3");
    answer("はい");
    answer("6");
    expect(screen.getByTestId("flow-try-ask")).toHaveTextContent("i の箱は 4。");
    answer("いいえ");

    expect(tryRun()).toHaveAttribute("data-state", "done");
    expect(screen.getByTestId("flow-try-stage-output")).toHaveTextContent("6");
    expect(screen.getByTestId("flow-try-done")).toHaveTextContent("まちがえた所は 1 回");
  });
});
