// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import ItilExperience from "@/components/experiences/ItilExperience";
import { getTopicExperience } from "@/components/experiences/registry";

afterEach(cleanup);

const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));

// ITILの過去問（令和4〜8年度・16問）で問われる論点が、解説に載っていることを確かめる。
describe("ItilExperience", () => {
  it("covers the service desk, KPI direction, automation effects, reduction rate and process names", () => {
    expect(getTopicExperience("mgmt-itil")).toBe(ItilExperience);
    render(
      <ExperienceSlideDeck>
        <ItilExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 7")).toBeInTheDocument();
    expect(screen.getByText(/人材・プロセス・技術/)).toBeInTheDocument();

    slide(3);
    expect(screen.getByTestId("desk-flow")).toHaveTextContent(/記録.*エスカレーション.*分析/);
    const kpi = screen.getByTestId("desk-kpi");
    expect(kpi.querySelector('[data-dir="down"]')).toHaveTextContent("エスカレーション");
    expect(kpi.querySelector('[data-dir="down"]')).toHaveTextContent("待ち時間");

    slide(4);
    const tools = screen.getByTestId("desk-tools");
    expect(tools.querySelector('[data-tool="FAQ"]')).toHaveTextContent("一次回答率");
    expect(tools.querySelector('[data-tool="チャットボット"]')).toHaveTextContent("受付時間の拡大");
    expect(tools.querySelector('[data-tool="オペレーター支援AI"]')).toHaveTextContent("24時間対応にはならない");

    slide(5);
    // 3,000分 → 0 + 400 + 600 = 1,000分 → 約67%
    expect(screen.getByTestId("reduction-result")).toHaveTextContent("約67%");

    slide(6);
    const names = Array.from(screen.getByTestId("itil-processes").querySelectorAll<HTMLElement>("[data-process]")).map((e) => e.dataset.process);
    expect(names).toEqual(expect.arrayContaining(["構成管理", "リリース及び展開管理", "容量・能力管理"]));
    expect(screen.getByTestId("itil-three-ways")).toHaveTextContent("サービスマネジメントシステムの改善");

    slide(7);
    const item = within(screen.getByTestId("itil-quiz")).getAllByRole("listitem")[3];
    fireEvent.click(within(item).getByRole("button", { name: "変更" }));
    expect(item).toHaveTextContent("正解は リリース及び展開管理");
  });
});
