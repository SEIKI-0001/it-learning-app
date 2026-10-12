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
/** 利用者の操作：アプリで「開く」を押す / 金額を書き換えて確定 */
const openDoc = () => click("開く");
const typeAmount = (v: string) => {
  fireEvent.change(screen.getByLabelText("売上（万円）"), { target: { value: v } });
  click("確定");
};
/** STEP 2 の最後（メモリ上だけが v2）まで進める */
const toUnsavedEdit = () => {
  openDoc();
  next();
  typeAmount("120");
  playThrough();
};
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
    expect(screen.getByText("STEP 1 / 3")).toBeInTheDocument();
    expect(doc()).toHaveAttribute("data-spot", "storage");
    expect(caption()).toHaveAttribute("data-target", "storage");

    openDoc();
    playThrough();
    expect(doc()).toHaveAttribute("data-spot", "memory");
    expect(caption()).toHaveAttribute("data-target", "monitor");
    next();
    // 書き換えるまではメモリ上の文書は v1 のまま
    expect(caption()).toHaveAttribute("data-target", "keyboard");
    typeAmount("120");
    expect(screen.getByTestId("bus-packet")).toHaveAttribute("data-spot", "cpu");
    expect(doc()).toHaveAttribute("data-version", "1");
    playThrough();
    expect(doc()).toHaveAttribute("data-status", "dirty");
    expect(doc()).toHaveTextContent("売上 120万円");
    expect(stored()).toHaveTextContent("売上 100万円");
    next();
    playThrough();
    expect(doc()).toHaveAttribute("data-status", "saved");
    expect(stored()).toHaveTextContent("v2");
  });

  it("waits for the user to press 開く and to type 120 before going on", () => {
    renderFlow();
    playThrough();
    // 「開く」を押すまで進まない
    expect(doc()).toHaveAttribute("data-spot", "storage");
    expect(screen.getByRole("button", { name: "次のSTEPへ" })).toBeDisabled();
    expect(screen.getByTestId("cc-play")).toBeDisabled();
    openDoc();
    expect(caption()).toHaveTextContent("ストレージから文書のコピーを読み出す");
    next();

    playThrough();
    expect(caption()).toHaveTextContent("キーボードから入力する");
    // 120 以外では確定できない
    fireEvent.change(screen.getByLabelText("売上（万円）"), { target: { value: "110" } });
    expect(screen.getByRole("button", { name: "確定" })).toBeDisabled();
    // 全角でも受け付ける
    typeAmount("１２０");
    expect(caption()).toHaveTextContent("CPUが入力を受け取り");
  });

  it("plays the phases of a step, stops at the last one, and never advances the step by itself", () => {
    renderFlow();
    openDoc();
    expect(caption()).toHaveTextContent("ストレージから文書のコピーを読み出す");
    playThrough();
    expect(caption()).toHaveTextContent("処理結果が画面に表示される");
    expect(screen.getByTestId("cc-step-title")).toHaveTextContent("文書を開く");

    click("↻ もう一度見る");
    // もう一度見るときも「開く」から
    expect(screen.getByRole("button", { name: "次のSTEPへ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "開く" })).toBeInTheDocument();
    openDoc();
    next();
    expect(screen.getByTestId("cc-step-title")).toHaveTextContent("メモリ上で書き換える");
    back();
    expect(screen.getByTestId("cc-step-title")).toHaveTextContent("文書を開く");
  });

  it("switches the play button between stop, resume and replay", () => {
    renderFlow();
    openDoc();
    expect(screen.getByTestId("cc-play")).toHaveTextContent("停止");
    click("⏸ 停止");
    for (let i = 0; i < 4; i++) act(() => vi.advanceTimersByTime(3000));
    // 止めている間は場面が進まない
    expect(caption()).toHaveTextContent("ストレージから文書のコピーを読み出す");
    expect(screen.getByTestId("cc-play")).toHaveTextContent("再開");
    click("▶ 再開");
    act(() => vi.advanceTimersByTime(2600));
    expect(caption()).toHaveTextContent("メモリ（作業机）に広げる");
    playThrough();
    expect(screen.getByTestId("cc-play")).toHaveTextContent("もう一度見る");
  });

  it("pauses the phases while the details are open", () => {
    renderFlow();
    openDoc();
    const details = screen.getByText(/詳しく見る/).closest("details")!;
    details.open = true;
    fireEvent(details, new Event("toggle"));
    playThrough();
    expect(caption()).toHaveTextContent("ストレージから文書のコピーを読み出す");
    expect(screen.getByTestId("cc-detail")).toHaveTextContent("主記憶装置");
  });

  it("shows only the part labels that the current scene is about", () => {
    renderFlow();
    // 引き出しに保存されている → ストレージだけ
    expect(partLabels()).toEqual(["storage"]);
    openDoc();
    // 読み込み中はストレージとメモリ
    expect(partLabels()).toEqual(["memory", "storage"]);
    act(() => vi.advanceTimersByTime(2600));
    expect(partLabels()).toEqual(["memory"]);
    act(() => vi.advanceTimersByTime(2600));
    // メモリ → CPU
    expect(partLabels()).toEqual(["cpu", "memory"]);
    act(() => vi.advanceTimersByTime(2600));
    // 画面に表示 → 部品の札は出さない
    expect(partLabels()).toEqual([]);
    next();
    // キーボード入力の場面も出さない
    expect(partLabels()).toEqual([]);
    typeAmount("120");
    expect(partLabels()).toEqual(["cpu"]);
  });

  it("power off before saving erases only the memory copy; storage keeps the old version", () => {
    renderFlow();
    toUnsavedEdit();
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
    toUnsavedEdit();
    click("電源を切る");
    click("↩ 電源OFFの前に戻る");
    next();
    playThrough();
    click("電源を切る");
    expect(stored()).toHaveTextContent("v2");
    expect(screen.getByTestId("cc-insight")).toHaveTextContent("揮発性");
    click("電源を入れて文書を開き直す");
    expect(doc()).toHaveTextContent("売上 120万円");
  });
});
