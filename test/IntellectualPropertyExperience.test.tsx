// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import IntellectualPropertyExperience from "@/components/experiences/IntellectualPropertyExperience";
import { getTopicExperience } from "@/components/experiences/registry";

afterEach(cleanup);

const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));

// 知的財産の過去問（令和4〜8年度・14問）で問われる論点が、解説に載っていることを確かめる。
describe("IntellectualPropertyExperience", () => {
  it("covers the rights map, what copyright protects, patent strategy, generative AI and a wider quiz", () => {
    expect(getTopicExperience("strat-intellectual-property")).toBe(IntellectualPropertyExperience);
    render(
      <ExperienceSlideDeck>
        <IntellectualPropertyExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 6")).toBeInTheDocument();

    slide(2);
    const industrial = Array.from(screen.getByTestId("ip-industrial").querySelectorAll<HTMLElement>("[data-right]")).map((e) => e.dataset.right);
    expect(industrial).toEqual(["特許権", "実用新案権", "意匠権", "商標権"]);
    expect(screen.getByTestId("ip-others")).toHaveTextContent(/不正競争防止法.*パブリシティ権/);

    slide(3);
    const works = screen.getByTestId("ip-works");
    const protectedItems = Array.from(works.querySelectorAll('[data-ok="true"]')).map((e) => e.textContent);
    expect(protectedItems.join()).toContain("ソースプログラム");
    expect(protectedItems.join()).not.toContain("アルゴリズム");
    expect(screen.getByTestId("ip-same")).toHaveTextContent("先に出願した");

    slide(4);
    expect(screen.getByTestId("ip-strategy")).toHaveTextContent(/特許ポートフォリオ.*IPランドスケープ.*シュリンクラップ/);

    slide(5);
    const cases = screen.getByTestId("ip-genai").querySelectorAll('[data-need="true"]');
    expect(cases).toHaveLength(1);
    expect(cases[0]).toHaveTextContent("公開");

    slide(6);
    const item = within(screen.getByTestId("ip-quiz")).getAllByRole("listitem")[1];
    fireEvent.click(within(item).getByRole("button", { name: "特許権" }));
    expect(item).toHaveTextContent("正解は 実用新案権");
  });
});
