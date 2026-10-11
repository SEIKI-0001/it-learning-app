// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NetworkDevicesExperience from "@/components/experiences/NetworkDevicesExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import { PHASES, shownLabels, type NetDevMode } from "@/components/experiences/netdev/netdevTypes";
import { PHASE_MS } from "@/components/experiences/scene/usePhasePlayer";

// jsdom には WebGL が無いので、模型は 2.5D 側（吹き出しは模型の上の1行）を通る。

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <NetworkDevicesExperience />
    </ExperienceSlideDeck>,
  );
  // 模型は2枚目のスライド
  fireEvent.click(screen.getByRole("button", { name: "解説2" }));
}

const pick = (label: string) => fireEvent.click(screen.getByRole("button", { name: label }));
const playAll = () =>
  act(() => {
    vi.advanceTimersByTime(PHASE_MS * 4);
  });
const bubble = () => screen.getByTestId("netdev-bubble");

describe("NetworkDevicesExperience の模型（場面の再生）", () => {
  it("どの場面の吹き出しも35文字以内で、1つの場所を指す", () => {
    for (const [mode, phases] of Object.entries(PHASES) as [NetDevMode, (typeof PHASES)[NetDevMode]][]) {
      expect(phases.length, mode).toBeGreaterThanOrEqual(2);
      expect(phases.length, mode).toBeLessThanOrEqual(3);
      for (const ph of phases) {
        expect(ph.bubble.text.length, ph.bubble.text).toBeLessThanOrEqual(35);
        expect(ph.tokens.length).toBeGreaterThan(0);
      }
    }
  });

  it("名札は場面に関わる場所だけ（選ぶ前は機器と外の世界だけ）", () => {
    expect(shownLabels(null).has("pcA")).toBe(false);
    expect(shownLabels(null).has("router")).toBe(true);
    const sw = shownLabels(PHASES.switch[2]);
    expect(sw.has("pcC")).toBe(true);
    expect(sw.has("pcB")).toBe(false);
    expect(sw.has("router")).toBe(false);
  });

  it("機器を選ぶと場面が自動で進み、最後で止まって結果と「もう一度見る」が出る", () => {
    renderDeck();
    pick("ハブ");
    expect(bubble()).toHaveAttribute("data-target", "pcA");
    expect(screen.getByTestId("netdev-play")).toHaveAttribute("data-state", "playing");
    expect(screen.queryByTestId("netdev-result")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(PHASE_MS);
    });
    expect(bubble()).toHaveAttribute("data-target", "hub");
    playAll();
    expect(bubble()).toHaveTextContent("PC-B・D");
    expect(screen.getByTestId("netdev-play")).toHaveAttribute("data-state", "done");
    expect(screen.getByTestId("netdev-result")).toHaveTextContent("宛先を見ず");
    // ハブを見終えたら、スイッチと比べる近道
    fireEvent.click(screen.getByTestId("netdev-next"));
    expect(screen.getByRole("button", { name: "スイッチ" })).toHaveAttribute("aria-pressed", "true");
    expect(bubble()).toHaveAttribute("data-target", "pcA");
  });

  it("停止すると場面が進まず、再開で続きから", () => {
    renderDeck();
    pick("ルータ");
    fireEvent.click(screen.getByTestId("netdev-play"));
    expect(screen.getByTestId("netdev-play")).toHaveAttribute("data-state", "stopped");
    playAll();
    expect(bubble()).toHaveAttribute("data-target", "pcA");
    fireEvent.click(screen.getByTestId("netdev-play"));
    act(() => {
      vi.advanceTimersByTime(PHASE_MS);
    });
    expect(bubble()).toHaveAttribute("data-target", "router");
  });

  it("「詳しく見る」を開いている間は再生を止め、層と試験の用語を出す", () => {
    renderDeck();
    pick("ゲートウェイ");
    const details = screen.getByTestId("netdev-detail").closest("details")!;
    act(() => {
      details.open = true;
      details.dispatchEvent(new Event("toggle"));
    });
    playAll();
    expect(bubble()).toHaveAttribute("data-target", "pcA");
    expect(screen.getByTestId("netdev-detail")).toHaveTextContent("プロトコル変換");
  });
});
