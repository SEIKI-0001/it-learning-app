// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BinaryExperience from "@/components/experiences/BinaryExperience";
import { getTopicById } from "@/lib/content";

afterEach(cleanup);

describe("BinaryExperience", () => {
  it("renders only the current learning step and moves through the five-step flow", () => {
    render(<BinaryExperience />);

    expect(screen.getByRole("heading", { name: "STEP 1 ランプで数字を作る" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "STEP 2 ランプを0と1で表す" })).not.toBeInTheDocument();
    expect(screen.getByTestId("binary-learning-step")).toHaveAttribute("data-step", "1");

    fireEvent.click(screen.getByRole("button", { name: "次へ" }));

    expect(screen.queryByRole("heading", { name: "STEP 1 ランプで数字を作る" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "STEP 2 ランプを0と1で表す" })).toBeInTheDocument();
    expect(screen.getByTestId("binary-learning-step")).toHaveAttribute("data-step", "2");
  });

  it("lets learners make 5 with lamps before introducing binary", () => {
    render(<BinaryExperience />);

    expect(screen.queryByText(/2進数/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "4のランプをつける" }));
    fireEvent.click(screen.getByRole("button", { name: "1のランプをつける" }));

    expect(screen.getByText("4 + 1 = 5")).toBeInTheDocument();
  });
});

describe("tech-binary-data check questions", () => {
  it("checks binary reading, conversion, and the meaning of 8bit", () => {
    const topic = getTopicById("tech-binary-data");

    expect(topic?.checkQuestions).toHaveLength(4);
    expect(topic?.checkQuestions.map((question) => question.prompt)).toEqual([
      expect.stringContaining("0101"),
      expect.stringContaining("9を2進数"),
      expect.stringContaining("8ビット"),
      expect.stringContaining("1バイト"),
    ]);
  });
});
