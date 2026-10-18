// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import ComplianceExperience from "@/components/experiences/ComplianceExperience";
import { getTopicExperience } from "@/components/experiences/registry";

afterEach(cleanup);

const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));

// 法務・コンプライアンスの過去問（令和4〜8年度・10問）で問われる論点が、解説に載っていることを確かめる。
describe("ComplianceExperience", () => {
  it("covers each law by its typical case, contracts and AI ethics, and a which-law quiz", () => {
    expect(getTopicExperience("strat-legal-compliance")).toBe(ComplianceExperience);
    render(
      <ExperienceSlideDeck>
        <ComplianceExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 4")).toBeInTheDocument();

    slide(2);
    const laws = screen.getByTestId("law-cases");
    expect(laws.querySelector('[data-law="景品表示法"]')).toHaveTextContent("ステルスマーケティング");
    expect(laws.querySelector('[data-law="景品表示法"]')).toHaveTextContent("オープン懸賞");
    expect(laws.querySelector('[data-law="特定電子メール法"]')).toHaveTextContent("オプトイン");
    expect(laws.querySelector('[data-law="資金決済法"]')).toHaveTextContent("前払式支払手段");
    expect(laws.querySelector('[data-law="情報公開法"]')).toHaveTextContent("行政文書");

    slide(3);
    expect(screen.getByTestId("rules-terms").querySelector('[data-term="NDA"]')).toHaveTextContent("秘密情報");
    expect(screen.getByTestId("ai-ethics")).toHaveTextContent(/危害.*差別.*プライバシー/);

    slide(4);
    const item = within(screen.getByTestId("law-quiz")).getAllByRole("listitem")[1];
    fireEvent.click(within(item).getByRole("button", { name: "個人情報保護法" }));
    expect(item).toHaveTextContent("正解は「特定電子メール法」");
  });
});
