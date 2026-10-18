// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ExperienceSlideDeck } from "@/components/experiences/ui";
import SystemAuditExperience from "@/components/experiences/SystemAuditExperience";
import { getTopicExperience } from "@/components/experiences/registry";

afterEach(cleanup);

const slide = (n: number) => fireEvent.click(screen.getByRole("button", { name: `解説${n}` }));

// システム監査の過去問（令和4〜8年度・22問）で問われる論点が、解説に載っていることを確かめる。
describe("SystemAuditExperience", () => {
  it("covers independence, audit kinds, the audit flow, internal control, IT governance and a quiz", () => {
    expect(getTopicExperience("mgmt-system-audit")).toBe(SystemAuditExperience);
    render(
      <ExperienceSlideDeck>
        <SystemAuditExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 7")).toBeInTheDocument();

    expect(screen.getByTestId("audit-independence")).toHaveTextContent(/外観上の独立性.*精神上の独立性/);
    const who = screen.getByTestId("audit-who");
    expect(who.querySelector('[data-ok="true"]')).toHaveTextContent("経営者直轄");

    slide(2);
    const kinds = Array.from(screen.getByTestId("audit-kinds").querySelectorAll<HTMLElement>("[data-kind]")).map((e) => e.dataset.kind);
    expect(kinds).toEqual(["会計監査", "業務監査", "情報セキュリティ監査", "システム監査"]);

    slide(3);
    expect(screen.getByTestId("audit-flow")).toHaveTextContent(/監査計画.*予備調査.*本調査.*評価・結論.*報告.*フォローアップ/);
    expect(screen.getByTestId("audit-not-do")).toHaveTextContent("指示");

    slide(5);
    expect(within(screen.getByTestId("ic-elements")).getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getByTestId("ic-elements")).toHaveTextContent("ITへの対応");

    slide(6);
    expect(screen.getByTestId("itgov-edm")).toHaveTextContent(/評価.*指示.*モニター/);
    expect(screen.getByTestId("itgov-edm")).toHaveTextContent("現在と将来");

    slide(7);
    const quiz = screen.getByTestId("audit-quiz");
    const first = within(quiz).getAllByRole("listitem")[1];
    fireEvent.click(within(first).getByRole("button", { name: "正しい" }));
    expect(first).toHaveTextContent("指示はしない");
  });
});
