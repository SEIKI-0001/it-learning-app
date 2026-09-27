// @vitest-environment jsdom

import type { ComponentType } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { getTopicExperience } from "@/components/experiences/registry";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import ComputerTypesExperience from "@/components/experiences/ComputerTypesExperience";
import ParallelSystemsExperience from "@/components/experiences/ParallelSystemsExperience";
import IoDevicesExperience from "@/components/experiences/IoDevicesExperience";
import SystemPerformanceExperience from "@/components/experiences/SystemPerformanceExperience";
import UiUxExperience from "@/components/experiences/UiUxExperience";
import IsmsRiskExperience from "@/components/experiences/IsmsRiskExperience";
import MalwareExperience from "@/components/experiences/MalwareExperience";
import { topics } from "@/data/topics";

// 12〜18章の解説改善で、図解・イラスト中心に作り直したテーマ。
// どれも「操作しなくても分かる」静的な図なので、描画できて・要点の図があり・押すボタンが無いことを確かめる。

afterEach(cleanup);

function renderDeck(Experience: ComponentType) {
  render(
    <ExperienceSlideDeck>
      <Experience />
    </ExperienceSlideDeck>,
  );
}

const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));
/** 解説デッキの操作（前へ・次へ・解説N）以外のボタン */
const contentButtons = () =>
  screen.queryAllByRole("button").filter((b) => !/^(解説\d+|前の解説へ|次の解説へ)$/.test(b.getAttribute("aria-label") ?? b.textContent ?? ""));

const STATIC_TOPICS: [string, ComponentType, number][] = [
  ["tech-computer-types", ComputerTypesExperience, 2],
  ["tech-parallel-systems", ParallelSystemsExperience, 5],
  ["tech-io-devices", IoDevicesExperience, 3],
  ["tech-system-performance", SystemPerformanceExperience, 4],
  ["tech-ui-ux", UiUxExperience, 4],
  ["tech-isms-risk", IsmsRiskExperience, 3],
  ["tech-malware-phishing-ransomware", MalwareExperience, 4],
];

describe("12〜18章：静的な図解に作り直したテーマ", () => {
  it.each(STATIC_TOPICS)("%s is registered, renders every slide, and needs no button to understand", (id, Experience, slides) => {
    expect(topics.some((t) => t.id === id)).toBe(true);
    expect(getTopicExperience(id)).toBe(Experience);
    renderDeck(Experience);
    expect(screen.getByText(`1 / ${slides}`)).toBeInTheDocument();
    for (let n = 1; n <= slides; n++) {
      slide(n);
      expect(contentButtons()).toHaveLength(0);
    }
  });

  it("computer types: each kind has a picture, its use and an example together", () => {
    renderDeck(ComputerTypesExperience);
    const items = within(screen.getByTestId("computer-kinds")).getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("data-kind"))).toEqual(["PC", "サーバ", "汎用機", "スーパーコンピュータ", "マイコン"]);
    for (const li of items) expect(li.querySelector("svg")).not.toBeNull();
    expect(items[2]).toHaveTextContent("メインフレーム");
    expect(items[4]).toHaveTextContent("組込みシステム");
  });

  it("parallel: one core finishes at 4, two cores at 2, and a dependent chain stays at 4", () => {
    renderDeck(ParallelSystemsExperience);
    expect(screen.getByTestId("lanes-single")).toHaveAttribute("data-done", "4");
    expect(screen.getByTestId("lanes-multi")).toHaveAttribute("data-done", "2");
    expect(screen.getByTestId("lanes-multi")).toHaveTextContent("CPU（コア2つ）");
    slide(2);
    expect(screen.getByTestId("core-vs-cpu")).toHaveTextContent("1つのCPUの中に、コアが複数");
    slide(4);
    expect(screen.getByTestId("lanes-chain")).toHaveAttribute("data-done", "4");
    expect(screen.getByTestId("lanes-split")).toHaveAttribute("data-done", "2");
  });

  it("io devices: input → computer → output, with the two-way / storage devices set apart", () => {
    renderDeck(IoDevicesExperience);
    const flow = screen.getByTestId("io-flow").textContent ?? "";
    expect(flow.indexOf("入力装置")).toBeLessThan(flow.indexOf("コンピュータ"));
    expect(flow.indexOf("コンピュータ")).toBeLessThan(flow.indexOf("出力装置"));
    expect(screen.getByTestId("io-inputs")).toHaveTextContent("スキャナ");
    expect(screen.getByTestId("io-outputs")).toHaveTextContent("プリンタ");
    expect(screen.getByTestId("io-special")).toHaveTextContent("タッチパネル ＝ 入力と出力の両方");
    expect(screen.getByTestId("io-special")).toHaveTextContent("補助記憶装置");
  });

  it("performance: meaning → how → example → answer for each metric", () => {
    renderDeck(SystemPerformanceExperience);
    expect(screen.getByTestId("perf-timeline")).toHaveAccessibleName(/0から0.8秒がレスポンスタイム/);
    expect(screen.getByTestId("perf-response")).toHaveTextContent("0.8秒");
    expect(screen.getByTestId("perf-turnaround")).toHaveTextContent("1時間30分");
    slide(2);
    const tp = screen.getByTestId("perf-throughput");
    expect(tp).toHaveTextContent("処理件数 ÷ かかった時間");
    expect(tp).toHaveTextContent("1,000 ÷ 5 ＝ 200件/分");
    slide(3);
    const neck = screen.getByTestId("perf-bottleneck").querySelector('[data-bottleneck="true"]');
    expect(neck).toHaveTextContent("ストレージ");
  });

  it("ui/ux: bad and good versions of the same screen, numbered fixes, and LATCH on the same shops", () => {
    renderDeck(UiUxExperience);
    expect(screen.getByTestId("ui-bad")).toHaveTextContent("送信");
    expect(screen.getByTestId("ui-good")).toHaveTextContent("予約を確定する");
    expect(screen.getByTestId("ui-good")).toHaveTextContent("必須");
    expect(within(screen.getByTestId("ui-fixes")).getAllByRole("listitem")).toHaveLength(4);
    slide(2);
    const axes = [...screen.getByTestId("latch").querySelectorAll("[data-axis]")].map((el) => el.getAttribute("data-axis"));
    expect(axes).toEqual(["Location", "Alphabet", "Time", "Category", "Hierarchy"]);
    expect(screen.getByTestId("latch").querySelector('[data-axis="Hierarchy"]')).toHaveTextContent("1位 木かげ珈琲");
  });

  it("isms: the matrix is filled from the start with both axes, and treatments show meaning + example", () => {
    renderDeck(IsmsRiskExperience);
    const matrix = screen.getByTestId("risk-matrix");
    expect(matrix).toHaveTextContent("影響度");
    expect(matrix).toHaveTextContent("発生可能性");
    expect(matrix.querySelector('[data-impact="高"][data-prob="高"]')).toHaveAttribute("data-size", "大");
    expect(matrix.querySelector('[data-impact="低"][data-prob="低"]')).toHaveAttribute("data-size", "小");
    expect(screen.getByTestId("risk-flow")).toHaveTextContent("脅威・脆弱性を把握");
    slide(2);
    const transfer = screen.getByTestId("risk-treatments").querySelector('[data-treatment="移転"]');
    expect(transfer).toHaveTextContent("損失を他者に肩代わりしてもらう");
    expect(transfer).toHaveTextContent("保険");
  });

  it("malware: every term leads with its meaning, and phishing / ransomware show their flow", () => {
    renderDeck(MalwareExperience);
    expect(screen.getByTestId("term-malware")).toHaveTextContent("悪意をもって作られたソフトウェアの総称");
    expect(screen.getByTestId("phishing-flow")).toHaveTextContent(/偽メール.*偽のログイン画面.*ID・パスワードを入力.*攻撃者に届く/);
    expect(screen.getByTestId("ransom-flow")).toHaveTextContent(/侵入.*暗号化.*開けない.*金銭を要求/);
    slide(2);
    const kinds = screen.getByTestId("malware-kinds");
    expect(screen.getByText("代表的なマルウェアを特徴で見分ける")).toBeInTheDocument();
    expect(kinds.querySelector('[data-malware="ワーム"]')).toHaveTextContent("単独で自己複製して広がる");
    expect(kinds.querySelector('[data-malware="スパイウェア"]')).toHaveTextContent("情報を収集・送信する");
    expect(kinds).not.toHaveTextContent("増えない");
    slide(3);
    expect(within(screen.getByTestId("phishing-signs")).getAllByRole("listitem")).toHaveLength(3);
  });
});
