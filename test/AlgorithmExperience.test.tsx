// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AlgorithmExperience from "@/components/experiences/AlgorithmExperience";
import {
  addCurrentNumber,
  isCorrectNoodleOrder,
  isRepetitionComplete,
} from "@/components/experiences/algorithm/learningModel";

afterEach(cleanup);

describe("algorithm learning model", () => {
  it("accepts only the correct cup-noodle order", () => {
    expect(isCorrectNoodleOrder(["open", "pour", "wait"])).toBe(true);
    expect(isCorrectNoodleOrder(["wait", "pour", "open"])).toBe(false);
  });

  it("adds 1 through 5 and stops at 15", () => {
    let state = { total: 0, current: 1 };
    for (let count = 0; count < 5; count += 1) {
      state = addCurrentNumber(state);
    }

    expect(state).toEqual({ total: 15, current: 6 });
    expect(isRepetitionComplete(state)).toBe(true);
    expect(addCurrentNumber(state)).toEqual(state);
  });
});

function completeStepOne() {
  fireEvent.click(screen.getByRole("button", { name: "ふたを開ける" }));
  fireEvent.click(screen.getByRole("button", { name: "お湯を入れる" }));
  fireEvent.click(screen.getByRole("button", { name: "3分待つ" }));
  fireEvent.click(screen.getByRole("button", { name: "次へ" }));
}

function advanceToBoxStep() {
  completeStepOne();
  fireEvent.click(screen.getByRole("button", { name: "うまくいかない" }));
  fireEvent.click(screen.getByRole("button", { name: "次へ" }));
  for (let count = 0; count < 4; count += 1) {
    fireEvent.click(screen.getByRole("button", { name: "1行実行する" }));
  }
  fireEvent.click(screen.getByRole("button", { name: "次へ" }));
}

function advanceToRepetitionStep() {
  advanceToBoxStep();
  fireEvent.click(screen.getByRole("button", { name: "1を足す" }));
  fireEvent.click(screen.getByRole("button", { name: "2を足す" }));
  fireEvent.click(screen.getByRole("button", { name: "次へ" }));
}

function advanceToFlowchartStep() {
  advanceToRepetitionStep();
  const addButton = screen.getByRole("button", {
    name: "現在の数字を足す",
  });
  for (let count = 0; count < 5; count += 1) {
    fireEvent.click(addButton);
  }
  fireEvent.click(screen.getByRole("button", { name: "次へ" }));
}

function advanceToExamStep() {
  advanceToFlowchartStep();
  fireEvent.click(screen.getByRole("button", { name: "次へ" }));
}

describe("AlgorithmExperience beginner flow", () => {
  it("renders only the current step", () => {
    render(<AlgorithmExperience />);

    expect(
      screen.getByRole("heading", {
        name: "カップ麺を作る順番を並べよう",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("フローチャートを読んでみよう"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("試験で使う正式な表現"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("STEP 1 / 7")).toBeInTheDocument();
  });

  it("unlocks the next step after the correct daily procedure", () => {
    render(<AlgorithmExperience />);

    fireEvent.click(screen.getByRole("button", { name: "ふたを開ける" }));
    fireEvent.click(screen.getByRole("button", { name: "お湯を入れる" }));
    fireEvent.click(screen.getByRole("button", { name: "3分待つ" }));

    expect(
      screen.getByText(
        "目的を達成するための手順をアルゴリズムと呼びます",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "次へ" }));
    expect(
      screen.getByRole("heading", { name: "順番が違うとどうなる？" }),
    ).toBeInTheDocument();
  });

  it("executes computer instructions one line at a time", () => {
    render(<AlgorithmExperience />);
    completeStepOne();
    fireEvent.click(screen.getByRole("button", { name: "うまくいかない" }));
    fireEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.getByText("実行済み 0 / 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1行実行する" }));
    expect(screen.getByText("実行済み 1 / 4")).toBeInTheDocument();
    expect(
      screen.queryByText("コンピュータも手順を上から順番に実行する"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "1行実行する" }));
    fireEvent.click(screen.getByRole("button", { name: "1行実行する" }));
    fireEvent.click(screen.getByRole("button", { name: "1行実行する" }));
    expect(
      screen.getByText("コンピュータも手順を上から順番に実行する"),
    ).toBeInTheDocument();
  });

  it("introduces a variable only after changing the named box", () => {
    render(<AlgorithmExperience />);
    advanceToBoxStep();

    expect(
      screen.queryByText("名前の付いた箱を変数と呼ぶ"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("box-total")).toHaveTextContent("0");

    fireEvent.click(screen.getByRole("button", { name: "1を足す" }));
    expect(screen.getByTestId("box-total")).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "2を足す" }));
    expect(screen.getByTestId("box-total")).toHaveTextContent("3");
    expect(
      screen.getByText("名前の付いた箱を変数と呼ぶ"),
    ).toBeInTheDocument();
    expect(screen.getByText("合計 ← 0")).toBeInTheDocument();
  });

  it("experiences repetition by adding the current number five times", () => {
    render(<AlgorithmExperience />);
    advanceToRepetitionStep();

    const addButton = screen.getByRole("button", {
      name: "現在の数字を足す",
    });
    for (let count = 0; count < 5; count += 1) {
      fireEvent.click(addButton);
    }

    expect(screen.getByTestId("repeat-total")).toHaveTextContent("15");
    expect(screen.getByTestId("repeat-current")).toHaveTextContent("6");
    expect(
      screen.getByText("同じ処理を何度も行うことを繰り返しと呼ぶ"),
    ).toBeInTheDocument();
  });

  it("reveals the flowchart only at step 6 and limits the normal view to three actions", () => {
    render(<AlgorithmExperience />);
    expect(
      screen.queryByRole("button", { name: "全体図を見る" }),
    ).not.toBeInTheDocument();

    advanceToFlowchartStep();
    const flowWindow = screen.getByTestId("flow-window");
    expect(within(flowWindow).getAllByRole("listitem")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "処理を進める" }));
    expect(within(flowWindow).getAllByRole("listitem")).toHaveLength(3);
    expect(
      screen.queryByRole("dialog", { name: "フローチャート全体図" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "全体図を見る" }));
    const dialog = screen.getByRole("dialog", {
      name: "フローチャート全体図",
    });
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(7);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "フローチャート全体図" }),
    ).not.toBeInTheDocument();
  });

  it("connects beginner language to exam expressions and completes three mini questions", () => {
    render(<AlgorithmExperience />);
    advanceToExamStep();

    expect(screen.getAllByText("合計の箱を0にする").length).toBeGreaterThan(0);
    expect(screen.getByText("合計 ← 合計 + i")).toBeInTheDocument();
    expect(screen.getByText("i ← i + 1")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "合計の箱を0にする" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "次のミニ問題" }));
    fireEvent.click(
      screen.getByRole("button", { name: "合計に現在の数字を足す" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "次のミニ問題" }));
    fireEvent.click(screen.getByRole("button", { name: "次の数字へ進む" }));

    expect(
      screen.getByText("日常の手順から試験の表現までつながりました"),
    ).toBeInTheDocument();
    expect(screen.getByText("3問中 3問正解")).toBeInTheDocument();
  });

  it("preserves completed interaction state after going back", () => {
    render(<AlgorithmExperience />);
    advanceToExamStep();

    fireEvent.click(screen.getByRole("button", { name: "戻る" }));
    fireEvent.click(screen.getByRole("button", { name: "戻る" }));
    expect(screen.getByTestId("repeat-total")).toHaveTextContent("15");
  });
});
