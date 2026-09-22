// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AlgorithmExperience from "@/components/experiences/AlgorithmExperience";
import { buildFlowTrace } from "@/components/experiences/algorithm/flowTrace";
import { FLOWCHART } from "@/components/experiences/algorithm/learningModel";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <AlgorithmExperience />
    </ExperienceSlideDeck>,
  );
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
  it("opens directly on the computer run, then a recap of the three structures and exam notation", () => {
    renderDeck();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByText("コンピュータになって最後まで実行")).toBeInTheDocument();
    expect(screen.getByTestId("flow-run")).toHaveAttribute("data-node", "start");
    expect(screen.queryByRole("button", { name: "ふたを開ける" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    expect(screen.getByText("選択（分岐）")).toBeInTheDocument();
    expect(screen.getByText("合計に今の数字 i を足す")).toBeInTheDocument();
  });

  it("labels each executed step with its structure: 順次 → 選択 → 繰り返し", () => {
    renderDeck();
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
    renderDeck();
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
    expect(screen.getByTestId("flow-run-judge")).toHaveTextContent("1 ≦ 5 → はい");
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
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: "i ≦ 3" }));
    fireEvent.click(screen.getByRole("button", { name: "STEP 13：i ≦ 3 ? → いいえ" }));
    expect(screen.getByTestId("flow-run-judge")).toHaveTextContent("4 ≦ 3 → いいえ");
    expect(screen.getByTestId("flow-run").querySelector('[data-edge="condition>display-total"]')).toHaveAttribute("data-state", "next");
    fireEvent.click(screen.getByRole("button", { name: "1ステップ進む" }));
    expect(screen.getByTestId("flow-run")).toHaveAttribute("data-node", "display-total");
    expect(screen.getByTestId("flow-run-output")).toHaveTextContent("6");
  });
});
