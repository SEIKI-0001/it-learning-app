// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BinaryExperience from "@/components/experiences/BinaryExperience";
import { getTopicById } from "@/lib/content";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function reduceMotion() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const next = () => click("次へ");
const heading = (name: string) => screen.getByRole("heading", { name });

function goToStep(n: number) {
  click("ランプをつける");
  next(); // → 2
  if (n === 2) return;
  next(); // → 3
  if (n === 3) return;
  click("11");
  next(); // → 4
  if (n === 4) return;
  click("8のランプをつける");
  click("1のランプをつける");
  next(); // → 5
  if (n === 5) return;
  next(); // → 6
}

describe("BinaryExperience", () => {
  it("step 1: one lamp has only two states, OFF = 0 and ON = 1, and must be tried before moving on", () => {
    render(<BinaryExperience />);
    expect(heading("STEP 1 0と1とは？")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
    expect(screen.getByText("ランプをタップすると次へ進めます")).toBeInTheDocument();
    expect(screen.getByTestId("binary-zero-one")).toHaveTextContent("0");

    click("ランプをつける");
    expect(screen.getByTestId("binary-zero-one")).toHaveTextContent("1");
    expect(screen.getByText(/0 と 1 の2通りだけ/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "次へ" })).toBeEnabled();
  });

  it("step 2: counting up shows each new lamp is first lit at 2, 4, 8 — the place value doubles", () => {
    vi.useFakeTimers();
    render(<BinaryExperience />);
    goToStep(2);
    expect(heading("STEP 2 なぜ 8・4・2・1 なのか")).toBeInTheDocument();
    expect(screen.getByTestId("binary-weights")).toHaveAttribute("data-beat", "0");
    act(() => vi.advanceTimersByTime(800));
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByText(/このランプは 2/)).toBeInTheDocument();
  });

  it("step 2 (reduced motion) still shows the doubling rule without the animation", () => {
    reduceMotion();
    render(<BinaryExperience />);
    goToStep(2);
    expect(screen.getByTestId("binary-weight-cards")).toHaveTextContent("8←×24←×22←×21");
    expect(screen.getByText(/だから/)).toHaveTextContent("8・4・2・1");
    expect(screen.getByText(/1 → 2 → 4 → 8 → 16/)).toBeInTheDocument();
    expect(screen.getByTestId("binary-why-double")).toHaveTextContent("3個で 7 まで");
  });

  it("step 3: 1101 → 8 + 4 + 1 = 13, then 1011 is checked with a diagnosis for the wrong reading", () => {
    reduceMotion();
    render(<BinaryExperience />);
    goToStep(3);
    expect(screen.getByTestId("binary-read-answer")).toHaveTextContent("13");
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
    click("3");
    expect(screen.getByText(/1の個数を数えただけ/)).toBeInTheDocument();
    expect(screen.getByText("1011 → 8 + 2 + 1 ＝ 11")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "次へ" })).toBeEnabled();
  });

  it("step 4: 9 is built by always taking the largest weight that fits the remainder", () => {
    render(<BinaryExperience />);
    goToStep(4);
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
    expect(screen.getByTestId("binary-remaining")).toHaveTextContent("残り 9");

    click("1のランプをつける");
    expect(screen.getByText(/もっと大きい数字から/)).toBeInTheDocument();
    click("8のランプをつける");
    expect(screen.getByText("9 − 8 ＝ 1")).toBeInTheDocument();
    expect(screen.getByTestId("binary-remaining")).toHaveTextContent("残り 1");
    click("4のランプをつける");
    expect(screen.getByText(/4 は残りの 1 より大きいので使えない/)).toBeInTheDocument();
    click("1のランプをつける");
    expect(screen.getByTestId("binary-write-digits")).toHaveTextContent("1001");
    expect(screen.getByText("9 ＝ 1001")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "次へ" })).toBeEnabled();
  });

  it("step 5: the exam-style 1101 + 1011 is read as 13 + 11 = 24 (= 11000), with 1 + 1 = 10 as an extra", () => {
    reduceMotion();
    render(<BinaryExperience />);
    goToStep(5);
    expect(screen.getByTestId("binary-exam")).toHaveTextContent("1101 → 8 + 4 + 1 ＝ 13");
    expect(screen.getByTestId("binary-exam")).toHaveTextContent("1011 → 8 + 2 + 1 ＝ 11");
    expect(screen.getByText("24 ＝ 11000")).toBeInTheDocument();
    click(/2進数のまま足すと/);
    expect(screen.getByTestId("binary-carry")).toHaveTextContent("1 ＋ 1 ＝ 10");
  });

  it("step 6: 8bit = 1Byte, linked to the transfer-time calculation", () => {
    render(<BinaryExperience />);
    goToStep(6);
    expect(heading("STEP 6 8bit ＝ 1Byte")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /転送時間の計算/ })).toHaveAttribute("href", "/topics/tech-lan-wan");
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
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
