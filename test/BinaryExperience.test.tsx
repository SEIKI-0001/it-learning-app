// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BinaryExperience from "@/components/experiences/BinaryExperience";
import { getTopicById } from "@/lib/content";

afterEach(cleanup);

describe("BinaryExperience", () => {
  it("each bit box shows 2ⁿ and its value, doubling to the left", () => {
    render(<BinaryExperience />);
    const boxes = within(screen.getByTestId("binary-weights")).getByTestId("bit-boxes");
    const items = boxes.querySelectorAll("li");
    expect(items).toHaveLength(8);
    expect(items[0]).toHaveTextContent("27128");
    expect(items[7]).toHaveTextContent("201");
    expect(boxes).toHaveTextContent("左へ行くほど 2倍");
  });

  it("binary → decimal adds only the weights of the 1 digits: 101100 = 32 + 0 + 8 + 4 + 0 + 0 = 44", () => {
    render(<BinaryExperience />);
    expect(within(screen.getByTestId("binary-read")).getByTestId("bit-sum")).toHaveTextContent("32 + 0 + 8 + 4 + 0 + 0 ＝ 44");
  });

  it("decimal → binary divides by 2 and reads the remainders bottom-up (not top-down)", () => {
    render(<BinaryExperience />);
    const remainders = within(screen.getByTestId("binary-division"))
      .getAllByTestId("binary-remainder")
      .map((el) => el.textContent);
    expect(remainders).toEqual(["0", "0", "1", "1", "0", "1"]);
    expect(screen.getByText(/上から読むと 001101/)).toBeInTheDocument();
  });

  it("octal groups 3 bits and hex groups 4 bits from the right (zero-padding the left)", () => {
    render(<BinaryExperience />);
    const oct = within(screen.getByTestId("binary-oct")).getAllByTestId("bit-group");
    expect(oct.map((g) => [g.dataset.bits, g.dataset.value])).toEqual([
      ["101", "5"],
      ["100", "4"],
    ]);
    const hex = within(screen.getByTestId("binary-hex")).getAllByTestId("bit-group");
    expect(hex.map((g) => [g.dataset.bits, g.dataset.value])).toEqual([
      ["0010", "2"],
      ["1100", "C"],
    ]);
    expect(screen.getByTestId("binary-hex-table")).toHaveTextContent("1010A");
    expect(screen.getByTestId("binary-hex-table")).toHaveTextContent("1111F");
    expect(screen.getByTestId("binary-oct-table")).toHaveTextContent("1117");
  });

  it("the same number is shown in all four bases", () => {
    render(<BinaryExperience />);
    const summary = screen.getByTestId("binary-summary");
    expect(summary).toHaveTextContent("44(10)");
    expect(summary).toHaveTextContent("101100(2)");
    expect(summary).toHaveTextContent("54(8)");
    expect(summary).toHaveTextContent("2C(16)");
  });

  it("keeps the exam-style addition and 8bit = 1Byte", () => {
    render(<BinaryExperience />);
    expect(screen.getByTestId("binary-exam")).toHaveTextContent("13 ＋ 11 ＝ 24");
    expect(screen.getByTestId("binary-units")).toHaveTextContent("8ビット");
    expect(screen.getByRole("link", { name: /転送時間の計算/ })).toHaveAttribute("href", "/topics/tech-lan-wan");
  });
});

describe("tech-binary-data check questions", () => {
  it("checks binary reading, conversion, the meaning of 8bit, and adding two binary numbers", () => {
    const topic = getTopicById("tech-binary-data");

    expect(topic?.checkQuestions).toHaveLength(5);
    expect(topic?.checkQuestions.map((question) => question.prompt)).toEqual([
      expect.stringContaining("0101"),
      expect.stringContaining("9を2進数"),
      expect.stringContaining("8ビット"),
      expect.stringContaining("1バイト"),
      expect.stringContaining("1010"),
    ]);
  });
});
