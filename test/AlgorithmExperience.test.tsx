// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
});
