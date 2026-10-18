// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import IpStoryExperience from "@/components/experiences/ip/IpStoryExperience";
import { readMs } from "@/components/experiences/story/StoryDay";
import { APP, COPY, INVENT, PLAN, PROMO, SHAPE, USE } from "@/components/experiences/ip/launch";

afterEach(cleanup);

const SCENES = { PLAN, INVENT, SHAPE, APP, PROMO, COPY, USE };

function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) act(() => vi.advanceTimersByTime(100));
}
const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));
const activeSlide = () => document.querySelector<HTMLElement>('section[aria-hidden="false"]')!;

describe("知的財産権ストーリーの台本", () => {
  it("選ぶ場面は正解がちょうど1つ・誤答には理由がある", () => {
    for (const [scene, beats] of Object.entries(SCENES)) {
      for (const b of beats.filter((x) => x.ask)) {
        expect(b.ask!.choices.filter((c) => c.ok), `${scene}: ${b.ask!.q}`).toHaveLength(1);
        for (const c of b.ask!.choices.filter((x) => !x.ok)) expect(c.why, `${scene}: ${c.label}`).toBeTruthy();
      }
    }
  });

  it("過去問14問で問われる用語が、用語カードで出る", () => {
    const terms = Object.values(SCENES)
      .flat()
      .map((b) => b.term?.name ?? "")
      .join("／");
    for (const t of [
      "IPランドスケープ",
      "特許権",
      "ビジネスモデル特許",
      "実用新案権",
      "意匠権",
      "商標権",
      "サービスマーク",
      "著作権",
      "シュリンクラップ契約",
      "生成AIと著作権",
      "パブリシティ権",
      "不正競争防止法",
      "限定提供データ",
      "特許ポートフォリオ",
    ])
      expect(terms).toContain(t);
  });
});

describe("IpStoryExperience", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("大枠＋7場面＋ふりかえりの9枚・弁理士の大川さんが登場", () => {
    render(
      <ExperienceSlideDeck>
        <IpStoryExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 9")).toBeInTheDocument();
    expect(screen.getByTestId("ip-cast")).toHaveTextContent("大川さん");
  });

  it("知財ノートは前の場面の続きから始まり、特許は出願中から登録になる", () => {
    render(
      <ExperienceSlideDeck>
        <IpStoryExperience />
      </ExperienceSlideDeck>,
    );
    slide(5); // アプリ：特許は出願中・実用新案や商標は登録済み
    const note = () => within(activeSlide()).getByTestId("ip-note");
    expect(note().querySelector('[data-right="patent"]')).toHaveAttribute("data-status", "出願中");
    expect(note().querySelector('[data-right="sm"]')).toHaveAttribute("data-status", "登録");
    expect(note().querySelector('[data-right="copyright"]')).toHaveAttribute("data-status", "自動で発生");
    slide(8); // 活用：1行目で特許が登録に
    expect(note().querySelector('[data-right="patent"]')).toHaveAttribute("data-status", "登録");
    advance(readMs(USE[0]) + 200);
    expect(within(activeSlide()).getByTestId("story-ask")).toBeInTheDocument();
  });
});
