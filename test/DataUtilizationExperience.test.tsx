// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DataUtilizationExperience from "@/components/experiences/DataUtilizationExperience";
import { AVERAGE } from "@/components/experiences/datautil/DecisionStage";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <DataUtilizationExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const next = () => click("1ステップ進む");
const toEnd = () => {
  for (let i = 0; i < 5; i++) next();
};

describe("DataUtilizationExperience", () => {
  it("covers what past exams ask: analysis methods, big data terms, scales, the complement rule and deviation scores", () => {
    renderDeck();
    expect(screen.getByText("1 / 10")).toBeInTheDocument();
    click("解説2");
    const methods = screen.getByTestId("du-methods");
    expect(methods.querySelector('[data-term="A/Bテスト"]')).toHaveTextContent("並行");
    expect(methods.querySelector('[data-term="主成分分析"]')).toHaveTextContent("少数の指標");
    expect(screen.getByTestId("du-bubble")).toHaveTextContent("円の大きさ");
    click("解説3");
    expect(screen.getByTestId("du-bigdata").querySelector('[data-term="3V"]')).toHaveTextContent(/大容量.*頻繁な更新.*多種多様/);
    expect(screen.getByTestId("du-scales").querySelector('[data-scale="間隔尺度"]')).toHaveTextContent("時刻");
    expect(screen.getByTestId("du-scales").querySelector('[data-scale="比例尺度"]')).toHaveTextContent("睡眠時間");
    click("解説4");
    expect(screen.getByTestId("st-complement")).toHaveTextContent(/25\/36.*11\/36/);
    click("解説8");
    const deviation = screen.getByTestId("du-deviation");
    expect(deviation.querySelector('[data-subject="国語"]')).toHaveTextContent("61");
    expect(deviation.querySelector('[data-subject="数学"]')).toHaveTextContent("70");
  });

  it("raw numbers move into a bar chart, 数学 is highlighted, an action is generated and 数学 rises next time", () => {
    renderDeck();
    next();
    expect(screen.getByTestId("data-card-数学")).toHaveAttribute("data-place", "scatter");
    expect(screen.getByTestId("data-bar-数学").style.height).toBe("0px");
    next();
    expect(screen.getByTestId("data-card-数学")).toHaveAttribute("data-place", "chart");
    expect(screen.getByTestId("data-bar-数学")).toHaveAttribute("data-score", "45");
    next();
    expect(screen.getByTestId("data-bar-数学")).toHaveAttribute("data-tone", "weak");
    expect(screen.getByTestId("data-bar-国語")).toHaveAttribute("data-tone", "dim");
    expect(screen.getByTestId("data-insight")).toHaveTextContent(`${AVERAGE - 45} 点低い`);
    next();
    expect(screen.getByTestId("data-action")).toHaveTextContent("数学を重点学習");
    next();
    expect(screen.getByTestId("data-bar-数学")).toHaveAttribute("data-score", "68");
    expect(screen.getByTestId("data-before")).toHaveTextContent("+23");
  });

  it("storing only: data goes into a box and the next test does not change", () => {
    renderDeck();
    click(/ためるだけ/);
    next();
    next();
    expect(screen.getByTestId("data-box")).toBeInTheDocument();
    expect(screen.getByTestId("data-card-数学")).toHaveAttribute("data-place", "box");
    next();
    next();
    expect(screen.queryByTestId("data-action")).toBeNull();
    next();
    expect(screen.getByTestId("data-next")).toHaveTextContent("変化なし");
  });

  it("trying both modes shows the lesson", () => {
    renderDeck();
    toEnd();
    click(/ためるだけ/);
    toEnd();
    expect(screen.getByTestId("data-lesson")).toHaveTextContent("可視化 → 発見 → 行動");
  });
});
