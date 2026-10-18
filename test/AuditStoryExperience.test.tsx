// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import AuditStoryExperience from "@/components/experiences/audit/AuditStoryExperience";
import { readMs } from "@/components/experiences/story/StoryDay";
import { DAY1, DAY10, DAY12, DAY20, DAY28, DAY3, DAY5, NEXT_MONTH } from "@/components/experiences/audit/month";

afterEach(cleanup);

const DAYS = { DAY1, DAY3, DAY5, DAY10, DAY12, DAY20, DAY28, NEXT_MONTH };

function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) act(() => vi.advanceTimersByTime(100));
}
const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));
const activeSlide = () => document.querySelector<HTMLElement>('section[aria-hidden="false"]')!;

describe("システム監査ストーリーの台本", () => {
  it("選ぶ場面は正解がちょうど1つ・誤答には理由がある", () => {
    for (const [day, beats] of Object.entries(DAYS)) {
      for (const b of beats.filter((x) => x.ask)) {
        expect(b.ask!.choices.filter((c) => c.ok), `${day}: ${b.ask!.q}`).toHaveLength(1);
        for (const c of b.ask!.choices.filter((x) => !x.ok)) expect(c.why, `${day}: ${c.label}`).toBeTruthy();
      }
    }
  });

  it("過去問22問で問われる用語が、用語カードで出る", () => {
    const terms = Object.values(DAYS)
      .flat()
      .map((b) => b.term?.name ?? "")
      .join("／");
    for (const t of [
      "システム監査",
      "監査の種類",
      "監査人の独立性",
      "監査計画",
      "判断尺度",
      "予備調査・本調査",
      "システムによる内部統制",
      "職務分掌",
      "内部統制の6つの要素",
      "ITへの対応",
      "監査報告書",
      "ITガバナンス",
      "評価・指示・モニター",
      "ルールを決める活動",
      "フォローアップ",
    ])
      expect(terms).toContain(t);
  });
});

describe("AuditStoryExperience", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("大枠＋8場面＋ふりかえりの10枚", () => {
    render(
      <ExperienceSlideDeck>
        <AuditStoryExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 10")).toBeInTheDocument();
    expect(screen.getByTestId("audit-cast")).toHaveTextContent(/宮本さん.*森さん.*高木さん.*社長/);
  });

  it("監査調書は前の場面の続きから始まり、指摘の状態が進む", () => {
    render(
      <ExperienceSlideDeck>
        <AuditStoryExperience />
      </ExperienceSlideDeck>,
    );
    slide(9); // 翌月：計画〜報告は済、指摘は「改善を提案」から始まる
    const file = () => within(activeSlide()).getByTestId("audit-file");
    expect(file().querySelector('[data-step="report"]')).toHaveAttribute("data-done", "true");
    expect(file().querySelector('[data-finding="retired"]')).toHaveAttribute("data-status", "改善を提案");
    advance(readMs(NEXT_MONTH[0]) + readMs(NEXT_MONTH[1]) + 400);
    expect(file().querySelector('[data-step="follow"]')).toHaveAttribute("data-done", "true");
    expect(file().querySelector('[data-finding="retired"]')).toHaveAttribute("data-status", "改善済");
  });
});
