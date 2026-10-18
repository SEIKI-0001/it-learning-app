// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProjectBasics, ScopeAndChange } from "@/components/experiences/mgmt/PmbokExamPanels";

afterEach(cleanup);

// PMBOKの過去問（令和4〜8年度・8問）で問われる論点が、解説に載っていることを確かめる。
describe("PMBOK exam panels", () => {
  it("tells projects from routine work, names the charter, and lists all stakeholders", () => {
    render(<ProjectBasics step={3} />);
    const items = screen.getByTestId("pmbok-is-project");
    expect(items.querySelector('[data-ok="false"]')).toHaveTextContent("サービスデスク");
    expect(screen.getByTestId("pmbok-docs").querySelector('[data-doc="プロジェクト憲章"]')).toHaveTextContent("正式に認可");
    expect(screen.getByTestId("pmbok-stakeholders")).toHaveTextContent("協力会社");
  });

  it("keeps tools out of the scope and lets the change board reject on cost", () => {
    render(<ScopeAndChange step={4} />);
    const scope = screen.getByTestId("pmbok-scope");
    expect(scope.querySelectorAll('[data-ok="true"]')).toHaveLength(1);
    expect(scope.querySelector('[data-ok="true"]')).toHaveTextContent("成果物");
    expect(screen.getByTestId("pmbok-change")).toHaveTextContent(/却下してもよい.*WBS を変更/);
    expect(screen.getByText(/教訓を組織の資産として登録/)).toBeInTheDocument();
  });
});
