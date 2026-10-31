// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SlaExperience from "@/components/experiences/SlaExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <SlaExperience />
    </ExperienceSlideDeck>,
  );
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("SlaExperience", () => {
  it("keeps the first three slides and adds three exam slides", () => {
    renderDeck();
    expect(screen.getByText("1 / 6")).toBeInTheDocument();
    click("解説2");
    expect(screen.getByText(/72時間 × 1%/)).toBeInTheDocument();
    expect(screen.getByText(/実際に使えた割合/)).toHaveTextContent("可用性");
    click("解説3");
    expect(screen.getByRole("heading", { name: /SLAにふさわしい？/ })).toBeInTheDocument();
  });

  it("names the SLA parties, the SLM activity and the look-alike documents", () => {
    renderDeck();
    click("解説4");
    expect(screen.getByTestId("sla-parties")).toHaveTextContent("顧客");
    expect(screen.getByTestId("sla-parties")).toHaveTextContent("サービスの供給者");
    expect(screen.getByTestId("slm")).toHaveTextContent("遵守状況を確認");
    expect(screen.getByTestId("slm")).toHaveTextContent("草案作成");
    const docs = screen.getByTestId("other-docs");
    for (const t of ["NDA", "BCP", "SCM"]) expect(docs.querySelector(`[data-term="${t}"]`)).not.toBeNull();
  });

  it("separates warranty from price and function, and explains availability and MTBSI", () => {
    renderDeck();
    click("解説5");
    expect(screen.getByTestId("service-value").querySelectorAll("[data-term]")).toHaveLength(3);
    expect(screen.getByTestId("quality-terms").querySelector('[data-term="可用性"]')).toHaveTextContent(
      "合意したサービス提供時間帯のうち、実際に利用できた時間の割合",
    );
    expect(screen.getByTestId("mtbsi")).toHaveTextContent("二重化");
  });

  it("checks the last quiz", () => {
    renderDeck();
    click("解説6");
    click("SLM");
    expect(screen.getByText(/合意書がSLA、それを回す管理活動がSLM/)).toBeInTheDocument();
    click("原因究明を速く");
    expect(screen.getByText(/正解は「回線を二重化」/)).toBeInTheDocument();
  });
});
