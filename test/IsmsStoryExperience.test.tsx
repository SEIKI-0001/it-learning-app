// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import IsmsStoryExperience from "@/components/experiences/isms/IsmsStoryExperience";
import { readMs } from "@/components/experiences/story/StoryDay";
import {
  APRIL,
  AUGUST,
  JANUARY,
  JULY,
  JUNE,
  LEDGER_AFTER_JUNE,
  MARCH,
  MAY,
  OCTOBER,
  RISKS,
  SEPTEMBER,
} from "@/components/experiences/isms/year";

afterEach(cleanup);

const MONTHS = { APRIL, MAY, JUNE, JULY, AUGUST, SEPTEMBER, OCTOBER, JANUARY, MARCH };

function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) act(() => vi.advanceTimersByTime(100));
}
const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));
const activeSlide = () => document.querySelector<HTMLElement>('section[aria-hidden="false"]')!;

describe("ISMS ストーリーの台本", () => {
  it("選ぶ場面は正解がちょうど1つ・誤答には理由がある", () => {
    for (const [month, beats] of Object.entries(MONTHS)) {
      for (const b of beats.filter((x) => x.ask)) {
        expect(b.ask!.choices.filter((c) => c.ok), `${month}: ${b.ask!.q}`).toHaveLength(1);
        for (const c of b.ask!.choices.filter((x) => !x.ok)) expect(c.why, `${month}: ${c.label}`).toBeTruthy();
      }
    }
  });

  it("過去問31問で問われる用語が、用語カードで出る", () => {
    const terms = Object.values(MONTHS)
      .flat()
      .map((b) => b.term?.name ?? "")
      .join("／");
    for (const t of [
      "適用範囲",
      "経営者のリーダーシップ",
      "基本方針",
      "対策基準・実施手順",
      "脅威と脆弱性",
      "リスク特定",
      "リスク分析",
      "リスク評価",
      "リスク低減",
      "リスク共有",
      "リスク回避",
      "リスク保有",
      "物理的セキュリティ対策",
      "アンチパスバック",
      "クリアデスク",
      "Secure Erase",
      "CSIRT",
      "デジタルフォレンジックス",
      "内部監査",
      "是正処置",
      "PCI DSS",
      "セキュリティバイデザイン",
    ])
      expect(terms).toContain(t);
  });

  it("6月で台帳の4つのリスクにレベルと評価が入る", () => {
    for (const r of RISKS) {
      expect(LEDGER_AFTER_JUNE[`${r.id}.on`]).toBe(1);
      expect(LEDGER_AFTER_JUNE[`${r.id}.level`]).toBeTruthy();
      expect(LEDGER_AFTER_JUNE[`${r.id}.need`]).toBeTruthy();
    }
  });
});

describe("IsmsStoryExperience", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("大枠＋4月〜3月の9場面＋ふりかえりの11枚・登場人物4人", () => {
    render(
      <ExperienceSlideDeck>
        <IsmsStoryExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 11")).toBeInTheDocument();
    expect(screen.getByTestId("isms-cast")).toHaveTextContent(/森さん.*高木さん.*社長.*宮本さん/);
  });

  it("7月はリスクを選ぶたびに台帳の対応が埋まる", () => {
    render(
      <ExperienceSlideDeck>
        <IsmsStoryExperience />
      </ExperienceSlideDeck>,
    );
    slide(5);
    const row = () => activeSlide().querySelector('[data-risk="pc"]')!;
    expect(row()).toHaveAttribute("data-resp", "");
    advance(readMs(JULY[0]) + 200);
    fireEvent.click(within(within(activeSlide()).getByTestId("story-ask")).getByRole("button", { name: "リスク低減" }));
    expect(row()).toHaveAttribute("data-resp", "低減");
  });
});
