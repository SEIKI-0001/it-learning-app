// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import ComplianceStoryExperience from "@/components/experiences/compliance/ComplianceStoryExperience";
import { readMs } from "@/components/experiences/story/StoryDay";
import { AD, AI, GOV, MAIL, PARTNER, PAY } from "@/components/experiences/compliance/sale";

afterEach(cleanup);

const SCENES = { AD, MAIL, PAY, PARTNER, AI, GOV };

function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) act(() => vi.advanceTimersByTime(100));
}
const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));
const activeSlide = () => document.querySelector<HTMLElement>('section[aria-hidden="false"]')!;

describe("法務・コンプライアンスストーリーの台本", () => {
  it("選ぶ場面は正解がちょうど1つ・誤答には理由がある", () => {
    for (const [scene, beats] of Object.entries(SCENES)) {
      for (const b of beats.filter((x) => x.ask)) {
        expect(b.ask!.choices.filter((c) => c.ok), `${scene}: ${b.ask!.q}`).toHaveLength(1);
        for (const c of b.ask!.choices.filter((x) => !x.ok)) expect(c.why, `${scene}: ${c.label}`).toBeTruthy();
      }
    }
  });

  it("過去問10問で問われる用語が、用語カードで出る", () => {
    const terms = Object.values(SCENES)
      .flat()
      .map((b) => b.term?.name ?? "")
      .join("／");
    for (const t of [
      "景品表示法",
      "ステルスマーケティング",
      "オープン懸賞",
      "特定電子メール法",
      "オプトイン",
      "前払式支払手段",
      "AML",
      "NDA",
      "ソーシャルメディアポリシー",
      "AIの利活用",
      "官民データ活用推進基本法",
      "情報公開法",
    ])
      expect(terms).toContain(t);
  });
});

describe("ComplianceStoryExperience", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("大枠＋6場面＋ふりかえりの8枚・法務の石田さんが登場", () => {
    render(
      <ExperienceSlideDeck>
        <ComplianceStoryExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 8")).toBeInTheDocument();
    expect(screen.getByTestId("compliance-cast")).toHaveTextContent("石田さん");
  });

  it("点検表は前の場面の続きから始まり、答えると行が増える", () => {
    render(
      <ExperienceSlideDeck>
        <ComplianceStoryExperience />
      </ExperienceSlideDeck>,
    );
    slide(5); // 提携：宣伝・メール・支払の行がすでにある
    const sheet = () => within(activeSlide()).getByTestId("compliance-sheet");
    expect(sheet().querySelector('[data-check="keihyo"]')).toHaveAttribute("data-status", "直した");
    expect(sheet().querySelector('[data-check="aml"]')).toHaveAttribute("data-status", "対応した");
    expect(sheet().querySelector('[data-check="nda"]')).toBeNull();
    advance(readMs(PARTNER[0]) + 1000);
    const ask = within(activeSlide()).getByTestId("story-ask");
    fireEvent.click(within(ask).getByRole("button", { name: /営業秘密などを特定/ }));
    expect(sheet().querySelector('[data-check="nda"]')).toHaveAttribute("data-status", "結んだ");
  });
});
