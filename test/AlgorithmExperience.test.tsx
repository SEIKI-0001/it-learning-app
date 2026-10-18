// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AlgorithmExperience from "@/components/experiences/AlgorithmExperience";
import { buildFlowTrace } from "@/components/experiences/algorithm/flowTrace";
import { askAt } from "@/components/experiences/algorithm/FlowTry";
import { FLOWCHART } from "@/components/experiences/algorithm/learningModel";
import { binaryProbes, bubbleSteps, linearProbes, selectionSteps } from "@/components/experiences/algorithm/sortTrace";
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
    expect(screen.getByText("1 / 11")).toBeInTheDocument();
    expect(screen.getByText("まず、あなたがコンピュータになって実行")).toBeInTheDocument();
    expect(screen.getByTestId("flow-try")).toHaveAttribute("data-state", "idle");
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    expect(screen.getByText("答え合わせ：コンピュータの正しい流れ")).toBeInTheDocument();
    expect(screen.getByTestId("flow-run")).toHaveAttribute("data-node", "start");
    fireEvent.click(screen.getByRole("button", { name: "解説3" }));
    expect(screen.getByText("選択（分岐）")).toBeInTheDocument();
    expect(screen.getByText("合計に今の数字 i を足す")).toBeInTheDocument();
  });

  it("reads the same flowchart in the exam pseudo-language, node by node", () => {
    renderDeck(4);
    expect(screen.getByText("同じ手順を、試験の擬似言語で読む")).toBeInTheDocument();
    const flow = screen.getByTestId("pseudo-flow");
    const code = screen.getByTestId("pseudo-while");
    // フロー図のノードと擬似言語の行に、同じ番号 ①〜⑦ が付いている
    for (const badge of ["①", "②", "③", "④", "⑤", "⑥", "⑦"]) {
      expect(flow).toHaveTextContent(badge);
      expect(code).toHaveTextContent(badge);
    }
    expect(code).toHaveTextContent("○整数型: sum(整数型: n)");
    expect(code).toHaveTextContent("while (i ≦ n)");
    expect(code).toHaveTextContent("endwhile");
    expect(code).toHaveTextContent("return 合計");

    fireEvent.click(screen.getByRole("button", { name: "解説5" }));
    expect(screen.getByTestId("pseudo-for")).toHaveTextContent("for (i を 1 から n まで 1 ずつ増やす)");
    expect(screen.getByTestId("pseudo-for")).toHaveTextContent("③④⑥");
    expect(screen.getByTestId("pseudo-if")).toHaveTextContent("elseif (点数 ≧ 60)");
    expect(screen.getByTestId("pseudo-divmod")).toHaveTextContent("7 ÷ 3 の商→ 2");
    expect(screen.getByTestId("pseudo-divmod")).toHaveTextContent("7 ÷ 3 の余り→ 1");
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

describe("過去問の型：配列・並べ替え・探索（sortTrace）", () => {
  it("bubble sort compares neighbours and carries the largest to the end of each pass", () => {
    const steps = bubbleSteps([40, 10, 30, 20]);
    expect(steps).toHaveLength(6); // 3 + 2 + 1 回の比較
    expect(steps.filter((s) => s.n === 1).at(-1)?.after).toEqual([10, 30, 20, 40]);
    expect(steps.at(-1)?.after).toEqual([10, 20, 30, 40]);
    // 試験と同じ書き方で {2,4,1,3} を並べると 1,2,3,4 になる
    expect(bubbleSteps([2, 4, 1, 3]).at(-1)?.after).toEqual([1, 2, 3, 4]);
  });

  it("selection sort brings the remaining minimum to position j", () => {
    const steps = selectionSteps([30, 50, 20, 40, 10]);
    expect(steps.map((s) => s.minIndex)).toEqual([5, 3, 5, 4]);
    expect(steps[2].after).toEqual([10, 20, 30, 40, 50]);
    expect(selectionSteps([3, 5, 1, 2, 4])[2].after).toEqual([1, 2, 3, 5, 4]);
  });

  it("linear search counts grow with position; binary search halves but is not always fewer", () => {
    const a = [3, 8, 12, 17, 21, 26, 30];
    expect(linearProbes(a, 30)).toHaveLength(7);
    expect(binaryProbes(a, 30)).toEqual([4, 6, 7]);
    expect(linearProbes(a, 3)).toEqual([1]);
    expect(binaryProbes(a, 3)).toEqual([4, 2, 1]);
  });
});

describe("過去問の型のスライド（解説6〜11）", () => {
  it("traces an array with a table and appends characters to the end of a string", () => {
    renderDeck(6);
    expect(screen.getByTestId("array-scores")).toHaveAttribute("data-values", "7,3,9,4");
    const trace = screen.getByTestId("array-trace");
    expect(trace.querySelector('[data-row="4"]')).toHaveTextContent('"○×○×"');
  });

  it("steps through bubble sort and selection sort one move at a time", () => {
    renderDeck(7);
    const stage = () => screen.getByTestId("sort-stage");
    const array = () => screen.getByTestId("sort-array");
    expect(array()).toHaveAttribute("data-values", "40,10,30,20");
    fireEvent.click(screen.getByRole("button", { name: /次の比較へ/ }));
    expect(screen.getByTestId("sort-log")).toHaveTextContent("40 ＞ 10 ？ → はい。入れ替えた");
    expect(array()).toHaveAttribute("data-values", "10,40,30,20");
    fireEvent.click(screen.getByRole("button", { name: /次の比較へ/ }));
    fireEvent.click(screen.getByRole("button", { name: /次の比較へ/ }));
    expect(array()).toHaveAttribute("data-values", "10,30,20,40");
    expect(screen.getByTestId("sort-log")).toHaveTextContent("右端から1個が確定");

    fireEvent.click(screen.getByRole("tab", { name: /選択ソート/ }));
    expect(stage()).toHaveAttribute("data-step", "0");
    expect(array()).toHaveAttribute("data-values", "30,50,20,40,10");
    fireEvent.click(screen.getByRole("button", { name: /次の j へ/ }));
    expect(screen.getByTestId("sort-log")).toHaveTextContent("最小は 10（要素番号5）");
    expect(array()).toHaveAttribute("data-values", "10,50,20,40,30");
  });

  it("compares how many probes linear and binary search need", () => {
    renderDeck(8);
    expect(screen.getByTestId("search-linear")).toHaveAttribute("data-count", "7");
    expect(screen.getByTestId("search-binary")).toHaveAttribute("data-count", "3");
    fireEvent.click(screen.getByRole("button", { name: "3 を探す" }));
    expect(screen.getByTestId("search-linear")).toHaveAttribute("data-count", "1");
    expect(screen.getByTestId("search-binary")).toHaveAttribute("data-count", "3");
    expect(screen.getByTestId("search-compare")).toHaveTextContent("要素数に比例");
    expect(screen.getByTestId("search-compare")).toHaveTextContent("昇順か降順に整列済み");
  });

  it("shows the number patterns and loop counts the exam asks about", () => {
    renderDeck(9);
    expect(screen.getByTestId("pattern-binary")).toHaveTextContent("2 の（i − 1）乗");
    expect(screen.getByTestId("pattern-binary")).toHaveTextContent("＝ 13");
    expect(screen.getByTestId("pattern-digits")).toHaveTextContent("47 − 10 × 4 ＝ 7");
    expect(screen.getByTestId("pattern-gcd")).toHaveTextContent("(12, 12) → 12");
    fireEvent.click(screen.getByRole("button", { name: "解説10" }));
    const counts = within(screen.getByTestId("count-patterns")).getAllByRole("listitem");
    expect(counts.map((li) => li.getAttribute("data-count"))).toEqual(["6", "6", "3"]);
    expect(screen.getByTestId("pattern-polygon")).toHaveTextContent("360 ÷ 5 ＝ 72 度");
    expect(screen.getByTestId("pattern-prime")).toHaveTextContent("return false");
  });

  it("checks with trace questions laid out three choices per row", () => {
    renderDeck(11);
    const quiz = screen.getByTestId("algorithm-quiz");
    fireEvent.click(within(quiz).getByRole("button", { name: "2, 1, 3" }));
    expect(quiz).toHaveTextContent("正解！");
    fireEvent.click(within(quiz).getByRole("button", { name: "4回" }));
    expect(quiz).toHaveTextContent("正解は「5回」");
  });
});
