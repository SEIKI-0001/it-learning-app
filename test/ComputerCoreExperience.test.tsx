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
const partLabels = () =>
  Array.from(screen.getByTestId("computer-scene").querySelectorAll("[data-part-label]"))
    .map((el) => el.getAttribute("data-part-label"))
    .sort();

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
    // STEP 2 は「開く」を押したところから始まる
    expect(caption()).toHaveTextContent("アプリで文書を「開く」を押した");
    playThrough();
    expect(doc()).toHaveAttribute("data-spot", "memory");
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
    expect(caption()).toHaveTextContent("アプリで文書を「開く」を押した");
    act(() => vi.advanceTimersByTime(2600));
    expect(caption()).toHaveTextContent("ストレージから文書のコピーを読み出す");
    playThrough();
    expect(caption()).toHaveTextContent("メモリ（作業机）に広げる");
    expect(screen.getByTestId("cc-step-title")).toHaveTextContent("メモリへ読み込む");

    click("↻ もう一度見る");
    // 再生し直している間は次の STEP へ進めない
    expect(screen.getByRole("button", { name: "次のSTEPへ" })).toBeDisabled();
    expect(caption()).toHaveTextContent("アプリで文書を「開く」を押した");
    back();
    expect(screen.getByTestId("cc-step-title")).toHaveTextContent("ふだんは引き出しに保管");
  });

  it("switches the play button between stop, resume and replay", () => {
    renderFlow();
    next();
    expect(screen.getByTestId("cc-play")).toHaveTextContent("停止");
    click("⏸ 停止");
    for (let i = 0; i < 4; i++) act(() => vi.advanceTimersByTime(3000));
    // 止めている間は場面が進まない
    expect(caption()).toHaveTextContent("アプリで文書を「開く」を押した");
    expect(screen.getByTestId("cc-play")).toHaveTextContent("再開");
    click("▶ 再開");
    act(() => vi.advanceTimersByTime(2600));
    expect(caption()).toHaveTextContent("ストレージから文書のコピーを読み出す");
    playThrough();
    expect(screen.getByTestId("cc-play")).toHaveTextContent("もう一度見る");
  });

  it("pauses the phases while the details are open", () => {
    renderFlow();
    next();
    const details = screen.getByText(/詳しく見る/).closest("details")!;
    details.open = true;
    fireEvent(details, new Event("toggle"));
    playThrough();
    expect(caption()).toHaveTextContent("アプリで文書を「開く」を押した");
    expect(screen.getByTestId("cc-detail")).toHaveTextContent("主記憶装置");
  });

  it("shows only the part labels that the current scene is about", () => {
    renderFlow();
    // STEP 1：引き出しに保存されている → ストレージだけ
    expect(partLabels()).toEqual(["storage"]);
    next();
    // 「開く」を押した（モニター）→ 部品の札は出さない
    expect(partLabels()).toEqual([]);
    act(() => vi.advanceTimersByTime(2600));
    // 読み込み中はストレージとメモリ
    expect(partLabels()).toEqual(["memory", "storage"]);
    playThrough();
    expect(partLabels()).toEqual(["memory"]);
    next();
    // メモリ → CPU
    expect(partLabels()).toEqual(["cpu", "memory"]);
    next();
    // キーボード → CPU だけ
    expect(partLabels()).toEqual([]);
    playThrough();
    expect(partLabels()).toEqual(["cpu"]);
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
