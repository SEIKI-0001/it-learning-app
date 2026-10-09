// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import BinaryExperience from "@/components/experiences/BinaryExperience";
import { getTopicById } from "@/lib/content";

afterEach(cleanup);

describe("BinaryExperience", () => {
  it("each bit box shows its weight with 2ⁿ on the right, doubling to the left", () => {
    render(<BinaryExperience />);
    const boxes = within(screen.getByTestId("binary-weights")).getByTestId("bit-boxes");
    const items = boxes.querySelectorAll("li");
    expect(items).toHaveLength(6);
    expect(items[0]).toHaveTextContent("32(25)1");
    expect(items[5]).toHaveTextContent("1(20)0");
    expect(screen.getByText("← 左へ行くほど 2倍")).toBeInTheDocument();
  });

  it("binary → decimal adds only the weights of the 1 boxes: 101100 = 32 + 8 + 4 = 44", () => {
    render(<BinaryExperience />);
    const picked = within(screen.getByTestId("binary-read"))
      .getAllByTestId("bit-picked")
      .map((el) => el.textContent);
    expect(picked).toEqual(["↓32", "↓8", "↓4"]);
    expect(screen.getByText(/1 の「個数」（3個）ではなく/)).toBeInTheDocument();
  });

  it("decimal → binary divides by 2 and puts each remainder into the box from the right (1, 2, 4 …)", () => {
    render(<BinaryExperience />);
    const division = screen.getByTestId("binary-division");
    expect(within(division).getAllByTestId("binary-remainder").map((el) => el.textContent)).toEqual(["0", "0", "1", "1", "0", "1"]);
    expect(within(division).getAllByTestId("binary-remainder-box").map((el) => el.textContent)).toEqual([
      "→ 1(20)の箱",
      "→ 2(21)の箱",
      "→ 4(22)の箱",
      "→ 8(23)の箱",
      "→ 16(24)の箱",
      "→ 32(25)の箱",
    ]);
    expect(screen.getByText(/余りを下から読む/)).toBeInTheDocument();
  });

  it("octal groups 3 bits and hex groups 4 bits from the right (zero-padding the left)", () => {
    render(<BinaryExperience />);
    const oct = within(screen.getByTestId("binary-oct")).getAllByTestId("bit-group");
    expect(oct.map((g) => [g.dataset.bits, g.dataset.value])).toEqual([
      ["101", "5"],
      ["100", "4"],
    ]);
    expect(screen.getByTestId("binary-oct")).toHaveTextContent("54(8)");
    const hex = within(screen.getByTestId("binary-hex")).getAllByTestId("bit-group");
    expect(hex.map((g) => [g.dataset.bits, g.dataset.value])).toEqual([
      ["0010", "2"],
      ["1100", "C"],
    ]);
    expect(screen.getByTestId("binary-hex")).toHaveTextContent("2C(16)");
    expect(screen.getByTestId("binary-hex-letters")).toHaveTextContent("A10B11C12D13E14F15");
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
