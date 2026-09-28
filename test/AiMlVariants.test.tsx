// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import VariantMap from "@/components/experiences/aiml/VariantMap";
import VariantShop from "@/components/experiences/aiml/VariantShop";
import VariantTeacher, { clusters, judge, learn, TESTS, TRAIN } from "@/components/experiences/aiml/VariantTeacher";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

const truth = Object.fromEntries(TRAIN.map((m) => [m.id, m.truth]));

describe("AI・機械学習 解説案B（先生になる）のしくみ", () => {
  it("正しい印で学ぶと、新しいメール3通を正しく判定する", () => {
    const model = learn(truth);
    for (const t of TESTS) expect(judge(model, t).verdict).toBe(t.truth);
  });

  it("会議の資料を迷惑とまちがえて教えると、会議の案内が迷惑になる", () => {
    const model = learn({ ...truth, m2: "spam" });
    expect(judge(model, TESTS[2]).verdict).toBe("spam");
  });

  it("印なしの仲間分けは、迷惑3通とふつう3通に分かれる", () => {
    const groups = clusters(TRAIN).map((g) => g.map((m) => m.truth));
    expect(groups).toHaveLength(2);
    for (const g of groups) expect(new Set(g).size).toBe(1);
  });

  it("おまかせで印を付けると点数表ができる", () => {
    render(
      <ExperienceSlideDeck>
        <VariantTeacher />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByTestId("teach-count")).toHaveTextContent("0 / 6");
    fireEvent.click(screen.getByRole("button", { name: "おまかせで付ける" }));
    expect(screen.getByTestId("teach-count")).toHaveTextContent("6 / 6");
    expect(screen.getByTestId("teach-word-当選")).toHaveTextContent("+2");
  });
});

describe("AI・機械学習 解説案A・C", () => {
  it("A は6枚、C は確認問題を含む4枚", () => {
    const { unmount } = render(
      <ExperienceSlideDeck>
        <VariantShop />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByRole("button", { name: "解説6" })).toBeInTheDocument();
    unmount();
    render(
      <ExperienceSlideDeck>
        <VariantMap />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByRole("button", { name: "解説4" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "解説5" })).toBeNull();
  });
});
