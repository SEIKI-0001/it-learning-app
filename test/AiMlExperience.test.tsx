// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AiMlExperience from "@/components/experiences/AiMlExperience";
import { NEW_PET, PETS, predictPet } from "@/components/experiences/aiml/DogCatPlot";
import { TRIES } from "@/components/experiences/aiml/ReinforcementAnim";
import { LINE_FIT_ANGLE, LINE_TRY_ANGLE, misjudged } from "@/components/experiences/aiml/SupervisedAnim";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

// コマ送りは「タイマー → 再描画 → 次のタイマー」なので、少しずつ進めて effect を流す
function advance(ms: number) {
  for (let t = 0; t < ms; t += 100) act(() => vi.advanceTimersByTime(100));
}

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <AiMlExperience />
    </ExperienceSlideDeck>,
  );
}

describe("AiMlExperience", () => {
  it("地図 → 3分類 → 教師あり → 教師なし → 強化 → 言い回し → 確認問題 の7枚", () => {
    renderDeck();
    expect(screen.getByTestId("ml-map")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "解説7" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "解説8" })).toBeNull();
    click("解説2");
    expect(screen.getByTestId("ml-types")).toHaveTextContent("教師あり学習");
    expect(screen.getByTestId("ml-types")).toHaveTextContent("教師なし学習");
    expect(screen.getByTestId("ml-types")).toHaveTextContent("強化学習");
    click("解説6");
    expect(screen.getByTestId("ml-phrases")).toHaveTextContent("ハルシネーション");
  });

  it("教師あり・教師なし・強化学習は、それぞれ見えたら動き、最後に完成図と「もう一度」", () => {
    vi.useFakeTimers();
    try {
      renderDeck();
      click("解説3");
      expect(screen.getByTestId("ml-supervised-caption")).toHaveTextContent("写真が8枚");
      expect(screen.queryAllByTestId("ml-supervised-label")).toHaveLength(0);
      advance(2000);
      expect(screen.getByTestId("ml-supervised-caption")).toHaveTextContent("正解を付ける");
      expect(screen.getAllByTestId("ml-supervised-label")).toHaveLength(PETS.length);
      advance(2800);
      expect(screen.getByTestId("ml-supervised-caption")).toHaveTextContent("あてずっぽうで線を引く");
      expect(screen.queryAllByTestId("ml-supervised-wrong")).toHaveLength(0);
      advance(2800);
      expect(screen.getByTestId("ml-supervised-caption")).toHaveTextContent("くらべる：2枚がまちがい");
      expect(screen.getAllByTestId("ml-supervised-wrong")).toHaveLength(2);
      expect(screen.getByTestId("ml-supervised-boundary")).toHaveAttribute("data-angle", String(LINE_TRY_ANGLE));
      advance(2800);
      expect(screen.queryAllByTestId("ml-supervised-wrong")).toHaveLength(0);
      expect(screen.getByTestId("ml-supervised-boundary")).toHaveAttribute("data-angle", String(LINE_FIT_ANGLE));
      advance(10000);
      expect(screen.getByTestId("ml-supervised-new")).toHaveTextContent("犬");
      expect(screen.getByTestId("ml-supervised-caption")).toHaveTextContent("「犬」");
      click("↺ もう一度");
      expect(screen.getByTestId("ml-supervised-caption")).toHaveTextContent("写真が8枚");

      // jsdom には IntersectionObserver が無く全スライドが同時に進むので、④⑤は完成図だけ確かめる
      click("解説4");
      advance(6000);
      expect(screen.getAllByTestId("ml-unsupervised-group")).toHaveLength(2);
      expect(screen.getByTestId("ml-unsupervised-caption")).toHaveTextContent("名前を付けるのは人");

      click("解説5");
      advance(30000);
      expect(screen.getAllByTestId("ml-rl-row")).toHaveLength(3);
      expect(screen.getByTestId("ml-rl-reward")).toHaveTextContent("+12");
    } finally {
      vi.useRealTimers();
    }
  });

  it("各スライドは大枠（ひとことで・流れ・使われる場面）→ 例で見る の順", () => {
    renderDeck();
    click("解説3");
    expect(screen.getByTestId("ml-supervised-big")).toHaveTextContent("答え付きの問題集");
    expect(screen.getByTestId("ml-supervised-big")).toHaveTextContent("回帰");
    click("解説4");
    expect(screen.getByTestId("ml-unsupervised-big")).toHaveTextContent("クラスタリング");
    click("解説5");
    expect(screen.getByTestId("ml-rl-big")).toHaveTextContent("報酬");
  });

  it("強化学習：報酬は迷路を動かした結果（1回目−20・2回目+2・50回目+12）で、近道ほど多い", () => {
    expect(TRIES.map((t) => [t.steps.length, t.goal, t.reward])).toEqual([
      [20, false, -20],
      [18, true, 2],
      [8, true, 12],
    ]);
    expect(TRIES[0].steps.some((s) => s.bump)).toBe(true);
    expect(TRIES[1].steps.some((s) => s.bump)).toBe(false);
  });

  it("犬猫8枚は境界線で正しく分かれ、新しい写真は犬と判定される", () => {
    for (const p of PETS) expect(predictPet(p).kind).toBe(p.kind);
    // 仮の線はまちがいあり、直した線（predictPet と同じ）は0枚
    expect(misjudged(LINE_TRY_ANGLE).length).toBeGreaterThan(0);
    expect(misjudged(LINE_FIT_ANGLE)).toHaveLength(0);
    expect(predictPet(NEW_PET)).toEqual({ kind: "dog", pct: expect.any(Number) });
    expect(predictPet(NEW_PET).pct).toBeGreaterThan(80);
  });
});
