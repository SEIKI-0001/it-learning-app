// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import SystemStrategyExperience from "@/components/experiences/SystemStrategyExperience";
import { getTopicExperience } from "@/components/experiences/registry";

afterEach(cleanup);

const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));

// システム戦略の過去問（令和4〜8年度・6問）で問われる論点が、解説に載っていることを確かめる。
describe("SystemStrategyExperience", () => {
  it("covers EA layers and the migration plan, the IT plan, BYOD and look-alike terms", () => {
    expect(getTopicExperience("strat-system-strategy")).toBe(SystemStrategyExperience);
    render(
      <ExperienceSlideDeck>
        <SystemStrategyExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 4")).toBeInTheDocument();

    slide(2);
    const layers = Array.from(screen.getByTestId("ea-layers").querySelectorAll<HTMLElement>("[data-layer]")).map((e) => e.dataset.layer);
    expect(layers).toEqual(["ビジネス", "データ", "アプリケーション", "技術"]);
    expect(screen.getByText(/移行計画」として定義/)).toBeInTheDocument();
    expect(screen.getByTestId("it-plan")).toHaveTextContent(/ステークホルダ.*現在と将来のニーズ/);

    slide(3);
    const byod = screen.getByTestId("byod-cases");
    expect(byod.querySelector('[data-ok="true"]')).toHaveTextContent("許可した私物");
    expect(screen.getByTestId("sysstrat-terms").querySelector('[data-term="CIO"]')).toHaveTextContent("情報システム戦略の責任者");

    slide(4);
    expect(screen.getByText("システム戦略の考え方として正しい？")).toBeInTheDocument();
  });
});
