// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LanWanExperience from "@/components/experiences/LanWanExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
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

function renderDeck() {
  return render(
    <ExperienceSlideDeck>
      <LanWanExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
// 直近に答えた問題の「つまずいた手順」
const failedChip = (container: HTMLElement) => [...container.querySelectorAll('[data-failed="true"]')].at(-1);

describe("transfer time slides in the LAN/WAN experience (reduced motion)", () => {
  it("keeps the LAN/WAN slides first", () => {
    reduceMotion();
    renderDeck();
    expect(screen.getByText("宛先を選んで、データを送ってみる")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByText("これはどっち？（範囲で見分ける）")).toBeInTheDocument();
  });

  it("④ explains the division with MB only: 12MB at 4MB per second takes 3 seconds", () => {
    reduceMotion();
    renderDeck();
    click("解説4");
    expect(screen.getByTestId("tr-arrived")).toHaveTextContent("届いた 12MB / 12MB");
    expect(screen.getByText("12MB ÷ 4MB/秒 ＝")).toBeInTheDocument();
    expect(screen.getByText(/全部の量 ÷ 1秒に運べる量 ＝ かかる時間/)).toBeInTheDocument();
  });

  it("⑤ splits 1 Byte into 8 bit and converts 200MByte to 1,600Mbit before calculating", () => {
    reduceMotion();
    renderDeck();
    click("解説5");
    expect(screen.getByTestId("tr-split").querySelectorAll(".grid-cols-8 > span")).toHaveLength(8);
    expect(screen.getByTestId("tr-unit-eq")).toHaveTextContent("200 MByte × 8 ＝ 1,600 Mbit");
    expect(screen.getByText("計算する前に単位をそろえる")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "2進数" })).toHaveAttribute("href", "/topics/tech-binary-data");
  });

  it("⑥ applies the utilization rate to the lanes: 100Mbps × 0.5 = 50Mbps, and other rates can be tried", () => {
    reduceMotion();
    renderDeck();
    click("解説6");
    expect(screen.getByTestId("tr-eff")).toHaveAttribute("data-eff", "50");
    expect(screen.getByTestId("tr-eff-eq")).toHaveTextContent("100Mbps × 0.5 ＝ 50Mbps");
    expect(screen.getByText("実効速度 ＝ 通信速度 × 利用効率")).toBeInTheDocument();
    click("80%");
    expect(screen.getByTestId("tr-eff-eq")).toHaveTextContent("100Mbps × 0.8 ＝ 80Mbps");
  });

  it("⑦ divides 1,600Mbit by 50Mbit/秒: Mbit cancels and 32 seconds remain; ⑧ fixes the three steps", () => {
    reduceMotion();
    renderDeck();
    click("解説7");
    expect(screen.getByTestId("tr-cancel")).toHaveTextContent("Mbit どうしが消えて、秒だけが残る");
    expect(screen.getByTestId("tr-time-answer")).toHaveTextContent("1,600 ÷ 50 ＝ 32秒");
    click("解説8");
    expect(screen.getByTestId("tr-solve")).toHaveTextContent("200MB × 8 ＝ 1,600Mbit");
    expect(screen.getByText("そろえる → 実効速度 → 割る")).toBeInTheDocument();
  });

  it("⑨ three staged questions return the step that went wrong", () => {
    reduceMotion();
    const { container } = renderDeck();
    click("解説9");

    click("0.33秒");
    expect(failedChip(container)).toHaveTextContent("③ 割る");
    click("次の問題へ →");

    expect(screen.getByTestId("tr-practice")).toHaveAttribute("data-index", "1");
    click("0.5秒");
    expect(screen.getByText(/Byte→bit（×8）を忘れています/)).toBeInTheDocument();
    expect(failedChip(container)).toHaveTextContent("① そろえる");
    click("次の問題へ →");

    expect(screen.getByText("Lv.3 本試験レベル")).toBeInTheDocument();
    click("15秒");
    expect(failedChip(container)).toHaveTextContent("② 実効速度");
    expect(screen.getByText(/1,200 ÷ 60 ＝ 20秒/)).toBeInTheDocument();
    expect(screen.getByText(/本試験の転送時間の問題に対応できます/)).toBeInTheDocument();
  });
});

describe("transfer time animation", () => {
  it("moves one 4MB block per second", () => {
    vi.useFakeTimers();
    renderDeck();
    click("解説4");
    expect(screen.getByTestId("tr-arrived")).toHaveTextContent("届いた 0MB");
    act(() => vi.advanceTimersByTime(900));
    expect(screen.getByTestId("tr-arrived")).toHaveTextContent("届いた 4MB");
    act(() => vi.advanceTimersByTime(1100));
    act(() => vi.advanceTimersByTime(1100));
    expect(screen.getByTestId("tr-arrived")).toHaveTextContent("届いた 12MB");
  });

  it("warns that Byte and bit differ before converting", () => {
    vi.useFakeTimers();
    renderDeck();
    click("解説5");
    expect(screen.queryByTestId("tr-unit-warn")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1300));
    expect(screen.getByTestId("tr-unit-warn")).toHaveTextContent("このままでは単位が違う");
  });
});

describe("tech-lan-wan check questions", () => {
  it("keep the four existing questions and add Byte→bit and the exam-level transfer time", () => {
    const topic = getTopicById("tech-lan-wan");
    expect(topic?.checkQuestions).toHaveLength(6);
    expect(topic?.checkQuestions[3].prompt).toContain("1秒間に送れるビット数");
    expect(topic?.checkQuestions[4]).toMatchObject({ id: "tech-lan-wan-q5" });
    expect(topic?.checkQuestions[4].prompt).toContain("25Mバイト");
    expect(topic?.checkQuestions[5].prompt).toContain("利用効率を80%");
  });
});
