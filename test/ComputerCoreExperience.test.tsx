// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ComputerCoreExperience from "@/components/experiences/ComputerCoreExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderFlow() {
  render(
    <ExperienceSlideDeck>
      <ComputerCoreExperience />
    </ExperienceSlideDeck>,
  );
  fireEvent.click(screen.getByRole("button", { name: "解説2" }));
}

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
/** 場面のタイマーは1つずつ張り直されるので、少しずつ時間を進める */
const playThrough = () => {
  for (let i = 0; i < 8; i++) act(() => vi.advanceTimersByTime(3000));
};
/** STEP の場面を最後まで見てから「次へ」（途中は押せない） */
const next = () => {
  playThrough();
  click("次のSTEPへ");
};
const back = () => click("前のSTEPへ");
const caption = () => screen.getByTestId("cc-caption");
const doc = () => screen.getByTestId("work-doc");
const stored = () => screen.getByTestId("stored-file");

describe("ComputerCoreExperience", () => {
  it("keeps the three roles and the memory/storage comparison", () => {
    render(
      <ExperienceSlideDeck>
        <ComputerCoreExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getAllByText("頭脳").length).toBeGreaterThan(0);
    expect(screen.getAllByText("作業机").length).toBeGreaterThan(0);
    expect(screen.getAllByText("引き出し").length).toBeGreaterThan(0);
    click("解説3");
    expect(screen.getByText("消える（揮発性）")).toBeInTheDocument();
    expect(screen.getByText("残る（不揮発性）")).toBeInTheDocument();
  });

  it("moves the document Storage → Memory, edits it in memory, then saves it back", () => {
    renderFlow();
    const scene = screen.getByTestId("computer-scene");
    for (const part of ["storage", "memory", "cpu"]) {
      expect(scene.querySelector(`[data-illustration="${part}"]`)).not.toBeNull();
    }
    expect(doc()).toHaveAttribute("data-spot", "storage");
    expect(caption()).toHaveAttribute("data-target", "storage");

    next();
    expect(doc()).toHaveAttribute("data-spot", "memory");
    expect(stored()).toHaveTextContent("v1");
    next();
    expect(screen.getByTestId("bus-packet")).toHaveAttribute("data-spot", "cpu");
    next();
    // キーボード入力 → CPU が計算。この間、メモリ上の文書はまだ v1
    expect(caption()).toHaveAttribute("data-target", "keyboard");
    playThrough();
    expect(screen.getByTestId("bus-packet")).toHaveAttribute("data-spot", "cpu");
    expect(doc()).toHaveAttribute("data-version", "1");
    next();
    playThrough();
    expect(doc()).toHaveAttribute("data-status", "dirty");
    expect(doc()).toHaveTextContent("売上 120万円");
    expect(stored()).toHaveTextContent("売上 100万円");
    next();
    playThrough();
    expect(doc()).toHaveAttribute("data-status", "saved");
    expect(stored()).toHaveTextContent("v2");
  });

  it("plays the phases of a step, stops at the last one, and never advances the step by itself", () => {
    renderFlow();
    next();
    expect(caption()).toHaveTextContent("ストレージから文書のコピーを読み出す");
    act(() => vi.advanceTimersByTime(2600));
    expect(caption()).toHaveTextContent("メモリ（作業机）に広げる");
    playThrough();
    expect(caption()).toHaveTextContent("保存版 v1 は引き出しにそのまま残る");
    expect(screen.getByTestId("cc-step-title")).toHaveTextContent("メモリへ読み込む");

    click("↻ もう一度見る");
    // 再生し直している間は次の STEP へ進めない
    expect(screen.getByRole("button", { name: "次のSTEPへ" })).toBeDisabled();
    expect(caption()).toHaveTextContent("ストレージから文書のコピーを読み出す");
    back();
    expect(screen.getByTestId("cc-step-title")).toHaveTextContent("ふだんは引き出しに保管");
  });

  it("pauses the phases while the details are open", () => {
    renderFlow();
    next();
    const details = screen.getByText(/詳しく見る/).closest("details")!;
    details.open = true;
    fireEvent(details, new Event("toggle"));
    playThrough();
    expect(caption()).toHaveTextContent("ストレージから文書のコピーを読み出す");
    expect(screen.getByTestId("cc-detail")).toHaveTextContent("主記憶装置");
  });

  it("power off before saving erases only the memory copy; storage keeps the old version", () => {
    renderFlow();
    next();
    next();
    next();
    next();
    click("電源を切る");
    expect(screen.getByTestId("computer-scene")).toHaveAttribute("data-power", "off");
    expect(doc()).toHaveAttribute("data-status", "vanished");
    expect(stored()).toHaveTextContent(/v1.*売上 100万円/);
    expect(screen.getByTestId("cc-detail")).toHaveTextContent("編集（売上 120万円）が消えました");

    click("電源を入れて文書を開き直す");
    expect(doc()).toHaveAttribute("data-version", "1");
    expect(doc()).toHaveTextContent("売上 100万円");
  });

  it("power off after saving keeps the edit, and comparing both shows the volatility insight", () => {
    renderFlow();
    next();
    next();
    next();
    next();
    click("電源を切る");
    click("↩ 電源OFFの前に戻る");
    next();
    click("電源を切る");
    expect(stored()).toHaveTextContent("v2");
    expect(screen.getByTestId("cc-insight")).toHaveTextContent("揮発性");
    click("電源を入れて文書を開き直す");
    expect(doc()).toHaveTextContent("売上 120万円");
  });
});
