// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import PrivacyMysteryExperience from "@/components/experiences/privacy/PrivacyMysteryExperience";
import { readMs } from "@/components/experiences/story/StoryDay";
import { ANON, FACE, FORM, GDPR, JUDGES, MYNUMBER, PROVIDE, SORT } from "@/components/experiences/privacy/case";

afterEach(cleanup);

const SCENES = { FACE, FORM, MYNUMBER, PROVIDE, ANON, GDPR };

function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) act(() => vi.advanceTimersByTime(100));
}
const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));
const activeSlide = () => document.querySelector<HTMLElement>('section[aria-hidden="false"]')!;

describe("個人情報保護の台本", () => {
  it("選ぶ場面と最終推理は正解がちょうど1つ・誤答には理由がある", () => {
    const asks = [
      ...Object.values(SCENES)
        .flat()
        .filter((b) => b.ask)
        .map((b) => ({ q: b.ask!.q, choices: b.ask!.choices })),
      ...SORT.map((s) => ({ q: s.t, choices: s.choices })),
    ];
    for (const a of asks) {
      expect(a.choices.filter((c) => c.ok), a.q).toHaveLength(1);
      for (const c of a.choices.filter((x) => !x.ok)) expect(c.why, `${a.q}: ${c.label}`).toBeTruthy();
    }
  });

  it("過去問6問で問われる用語が、手がかりカードで出る", () => {
    const terms = Object.values(SCENES)
      .flat()
      .map((b) => b.term?.name ?? "")
      .join("／");
    for (const t of ["個人情報", "要配慮個人情報", "マイナンバー", "第三者提供", "オプトアウト", "匿名加工情報", "GDPR"]) expect(terms).toContain(t);
  });

  it("判定表の行は、どこかの場面で必ず判定される", () => {
    const keys = new Set(
      Object.values(SCENES)
        .flat()
        .flatMap((b) => Object.keys(b.state ?? {})),
    );
    for (const j of JUDGES) expect(keys.has(`j.${j.id}`), j.id).toBe(true);
  });
});

describe("PrivacyMysteryExperience", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("表紙＋6章＋事件解決の8枚", () => {
    render(
      <ExperienceSlideDeck>
        <PrivacyMysteryExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 8")).toBeInTheDocument();
    expect(screen.getByTestId("privacy-cast")).toHaveTextContent("探偵役（法務）");
  });

  it("提供の章：同意なしで渡せるものを見抜くと、3件の判定が判定表に載る", () => {
    render(
      <ExperienceSlideDeck>
        <PrivacyMysteryExperience />
      </ExperienceSlideDeck>,
    );
    slide(5);
    const board = () => within(activeSlide()).getByTestId("privacy-sheet");
    expect(board()).toHaveTextContent("判定した 3/9");
    advance(readMs(PROVIDE[0]) + readMs(PROVIDE[1]) + 1500);
    const ask = within(activeSlide()).getByTestId("story-ask");
    fireEvent.click(within(ask).getByRole("button", { name: "b と c" }));
    expect(ask).toHaveTextContent("推理ミス");
    fireEvent.click(within(ask).getByRole("button", { name: "a と c" }));
    expect(board().querySelector('[data-judge="insurance"]')).toHaveAttribute("data-status", "提供NG");
    expect(board()).toHaveTextContent("判定した 6/9");
  });
});
