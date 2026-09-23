// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import DevProcessExperience from "@/components/experiences/DevProcessExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <DevProcessExperience />
    </ExperienceSlideDeck>,
  );
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const attr = (id: string, a: string) => screen.getByTestId(id).getAttribute(a);

describe("DevProcessExperience two-track race", () => {
  it("before the change both tracks just move forward", () => {
    renderDeck();
    fireEvent.change(screen.getByRole("slider", { name: "経過週" }), { target: { value: "4" } });
    expect(attr("dev-arc-wf", "data-on")).toBe("false");
    expect(screen.queryAllByTestId("dev-block-redo")).toHaveLength(0);
  });

  it("at the change WF jumps back to requirements while agile queues it for the next sprint", () => {
    renderDeck();
    click("⚡変更");
    expect(attr("dev-arc-wf", "data-on")).toBe("true");
    expect(attr("dev-arc-agile", "data-on")).toBe("true");
    expect(screen.getByTestId("dev-caption")).toHaveTextContent("要件定義まで戻る");
    expect(screen.getByTestId("dev-caption")).toHaveTextContent("次のスプリント（S4）");
    expect(screen.getAllByTestId("dev-block-waste").length).toBe(2);
  });

  it("agile reflects the change long before WF, then the metrics compare both", () => {
    renderDeck();
    click("アジャイル反映");
    expect(attr("dev-span-agile", "data-done")).toBe("true");
    expect(attr("dev-span-wf", "data-done")).toBe("false");
    expect(screen.queryByTestId("dev-metrics")).not.toBeInTheDocument();

    click("WF反映");
    expect(attr("dev-span-wf", "data-done")).toBe("true");
    const m = screen.getByTestId("dev-metrics");
    expect(m).toHaveTextContent("8.5週");
    expect(m).toHaveTextContent("2.5週");
    expect(m).toHaveTextContent("戻らない");
  });

  it("keeps the comparison table and the quiz", () => {
    renderDeck();
    click("解説2");
    expect(screen.getByRole("heading", { name: /くらべて整理/ })).toBeInTheDocument();
    click("解説3");
    expect(screen.getByRole("heading", { name: /これはどっち？/ })).toBeInTheDocument();
  });
});
