// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import AuditMysteryExperience from "@/components/experiences/audit/AuditMysteryExperience";
import { detectiveRank } from "@/components/experiences/story/MysteryDay";
import { readMs } from "@/components/experiences/story/StoryDay";
import { DAY1, DAY10, DAY12, DAY20, DAY28, DAY3, DAY5, NEXT_MONTH } from "@/components/experiences/audit/month";
import { getTopicExperience } from "@/components/experiences/registry";

afterEach(cleanup);

const DAYS = { DAY1, DAY3, DAY5, DAY10, DAY12, DAY20, DAY28, NEXT_MONTH };

function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) act(() => vi.advanceTimersByTime(100));
}
const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));
const activeSlide = () => document.querySelector<HTMLElement>('section[aria-hidden="false"]')!;
const okLabel = (q: (typeof DAY1)[number]) => q.ask!.choices.find((c) => c.ok)!.label;

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

describe("探偵ランク", () => {
  it("一発で当てた割合で決まる", () => {
    expect(detectiveRank(10, 10).rank).toBe("S");
    expect(detectiveRank(8, 10).rank).toBe("A");
    expect(detectiveRank(5, 10).rank).toBe("B");
    expect(detectiveRank(2, 10).rank).toBe("C");
  });
});

describe("AuditMysteryExperience", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("表紙＋8章＋事件解決の10枚。表紙では謎は伏せてある", () => {
    expect(getTopicExperience("mgmt-system-audit")).toBe(AuditMysteryExperience);
    render(
      <ExperienceSlideDeck>
        <AuditMysteryExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 10")).toBeInTheDocument();
    expect(screen.getByTestId("mystery-mission")).toHaveTextContent("謎1：？？？");
    advance(1000);
    // 見ていない章の手がかりは数えない
    slide(2);
    expect(within(activeSlide()).getByTestId("mystery-meter")).toHaveTextContent("手がかり 0/");
  });

  it("外すと理由が出て選び直せ、一発で当てられなかった推理は★にならない", () => {
    render(
      <ExperienceSlideDeck>
        <AuditMysteryExperience />
      </ExperienceSlideDeck>,
    );
    slide(2);
    advance(readMs(DAY1[0]) + readMs(DAY1[1]) + 400);
    const ask = within(activeSlide()).getByTestId("story-ask");
    const wrong = DAY1[2].ask!.choices.find((c) => !c.ok)!;
    fireEvent.click(within(ask).getByRole("button", { name: wrong.label }));
    expect(ask).toHaveTextContent(`推理ミス：${wrong.why}`);
    fireEvent.click(within(ask).getByRole("button", { name: okLabel(DAY1[2]) }));
    expect(ask).toHaveAttribute("data-result", "ok");
    expect(ask).not.toHaveTextContent("一発で見抜いた");
    expect(within(activeSlide()).getByTestId("mystery-meter")).toHaveTextContent("一発正解 0/");
    // 答えたあとに用語が手がかりとして手に入る
    expect(within(activeSlide()).getByTestId("mystery-clue")).toHaveTextContent("システム監査");
    advance(400);
    expect(within(activeSlide()).getByTestId("mystery-meter")).toHaveTextContent("手がかり 1/");
  });

  it("調査の章で、伏せていた謎が見つかる", () => {
    render(
      <ExperienceSlideDeck>
        <AuditMysteryExperience />
      </ExperienceSlideDeck>,
    );
    slide(5);
    const board = () => within(activeSlide()).getByTestId("audit-file");
    expect(board().querySelector('[data-finding="retired"]')).toHaveAttribute("data-status", "");
    advance(readMs(DAY10[0]) + 400);
    const ask = within(activeSlide()).getByTestId("story-ask");
    fireEvent.click(within(ask).getByRole("button", { name: okLabel(DAY10[1]) }));
    expect(ask).toHaveTextContent("一発で見抜いた");
    advance(readMs(DAY10[1], true) + readMs(DAY10[2]) + 400);
    expect(board().querySelector('[data-finding="retired"]')).toHaveAttribute("data-status", "指摘");
    expect(board()).toHaveTextContent("発見");
  });

  it("全部推理し終えるまでは、探偵ランクは出ない", () => {
    render(
      <ExperienceSlideDeck>
        <AuditMysteryExperience />
      </ExperienceSlideDeck>,
    );
    slide(10);
    expect(within(activeSlide()).getByTestId("mystery-rank")).toHaveTextContent("まだ推理していない場面");
  });
});
