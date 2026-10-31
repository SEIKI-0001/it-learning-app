// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import CyberMysteryExperience from "@/components/experiences/cyber/CyberMysteryExperience";
import { readMs } from "@/components/experiences/story/StoryDay";
import { DOWN, FAKE, FORM, LOGIN, PHONE, SORT, TRACE, TRICKS } from "@/components/experiences/cyber/case";

afterEach(cleanup);

const SCENES = { LOGIN, PHONE, DOWN, FAKE, FORM, TRACE };

function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) act(() => vi.advanceTimersByTime(100));
}
const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));
const activeSlide = () => document.querySelector<HTMLElement>('section[aria-hidden="false"]')!;

describe("サイバー攻撃の手口の台本", () => {
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

  it("過去問13問で問われる用語が、手がかりカードで出る", () => {
    const terms = Object.values(SCENES)
      .flat()
      .map((b) => b.term?.name ?? "")
      .join("／");
    for (const t of ["ブルートフォース攻撃", "パスワードリスト攻撃", "ソーシャルエンジニアリング", "DDoS攻撃", "ゼロデイ攻撃", "DNSキャッシュポイズニング", "ドライブバイダウンロード", "SQLインジェクション", "バッファオーバーフロー", "バックドア", "ダークウェブ", "APT攻撃", "サイバーキルチェーン"]) expect(terms).toContain(t);
  });

  it("手口ファイルの行は、どこかの場面で必ず書き込まれる", () => {
    const keys = new Set(
      Object.values(SCENES)
        .flat()
        .flatMap((b) => Object.keys(b.state ?? {})),
    );
    for (const t of TRICKS) expect(keys.has(`t.${t.id}`), t.id).toBe(true);
  });
});

describe("CyberMysteryExperience", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("表紙＋6章＋事件解決の8枚", () => {
    render(
      <ExperienceSlideDeck>
        <CyberMysteryExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 8")).toBeInTheDocument();
    expect(screen.getByTestId("cyber-cast")).toHaveTextContent("探偵役（情報システム部）");
  });

  it("ログインの章：1回目で当たった理由を見抜くと、パスワードリスト攻撃が手口ファイルに載る", () => {
    render(
      <ExperienceSlideDeck>
        <CyberMysteryExperience />
      </ExperienceSlideDeck>,
    );
    slide(2);
    const board = () => within(activeSlide()).getByTestId("cyber-sheet");
    expect(board()).toHaveTextContent("見抜いた 0/11");
    advance(readMs(LOGIN[0]) + readMs(LOGIN[1]) + readMs(LOGIN[2]) + 2000);
    expect(board()).toHaveTextContent("見抜いた 1/11");
    const ask = within(activeSlide()).getByTestId("story-ask");
    fireEvent.click(within(ask).getByRole("button", { name: /^ブルートフォース攻撃/ }));
    expect(ask).toHaveTextContent("推理ミス");
    fireEvent.click(within(ask).getByRole("button", { name: /^パスワードリスト攻撃/ }));
    expect(board().querySelector('[data-trick="list"]')).toHaveAttribute("data-status", "パスワードリスト攻撃");
    expect(board()).toHaveTextContent("見抜いた 2/11");
  });

  it("痕跡の章は、それまでの9件が載った状態から始まる", () => {
    render(
      <ExperienceSlideDeck>
        <CyberMysteryExperience />
      </ExperienceSlideDeck>,
    );
    slide(7);
    expect(within(activeSlide()).getByTestId("cyber-sheet")).toHaveTextContent("見抜いた 9/11");
  });
});
