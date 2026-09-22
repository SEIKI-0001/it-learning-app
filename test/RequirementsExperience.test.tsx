// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import RequirementsExperience from "@/components/experiences/RequirementsExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <RequirementsExperience />
    </ExperienceSlideDeck>,
  );
  fireEvent.click(screen.getByRole("button", { name: "解説2" }));
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const next = () => click("1ステップ進む");
const match = () => screen.getByTestId("req-match").textContent;

describe("RequirementsExperience", () => {
  it("keeps the 'what is' slide and the functional / non-functional quiz", () => {
    render(
      <ExperienceSlideDeck>
        <RequirementsExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("要件定義ってなに？")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByText("機能要件？ 非機能要件？")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "非機能要件" })[2]);
    expect(screen.getByText(/速さ（性能）は機能以外の条件/)).toBeInTheDocument();
  });

  it("vague order: unspoken details are lost, the developer guesses, the product is 'not this' and work goes back", () => {
    renderDeck();
    expect(screen.getByTestId("req-dev")).toHaveAttribute("data-device", "unknown");
    expect(match()).toBe("0%");
    next();
    expect(screen.getByTestId("req-lost")).toHaveTextContent("キャンセル");
    next();
    expect(screen.getByTestId("req-dev")).toHaveAttribute("data-device", "pc");
    expect(match()).toBe("25%");
    next();
    expect(screen.getByTestId("req-verdict")).toHaveTextContent("これじゃない");
    expect(screen.getByTestId("req-dev-device")).toHaveAttribute("data-bad", "true");
    expect(screen.getByTestId("req-dev-calendar")).toHaveAttribute("data-bad", "false");
    next();
    expect(screen.getByTestId("req-rework")).toHaveTextContent("手戻り");
  });

  it("clear requirements: each card raises the match and stacks as functional / non-functional", () => {
    renderDeck();
    click(/要件をはっきり/);
    next();
    expect(match()).toBe("25%");
    expect(screen.getByTestId("req-stack-func")).toHaveTextContent("予約日時を選べる");
    next();
    next();
    expect(screen.getByTestId("req-dev")).toHaveAttribute("data-device", "phone");
    expect(screen.getByTestId("req-stack-nonfunc")).toHaveTextContent("スマホで使える");
    next();
    expect(match()).toBe("100%");
    next();
    expect(screen.getByTestId("req-product")).toBeInTheDocument();
    expect(screen.getByTestId("req-verdict")).toHaveTextContent("これこれ");
  });

  it("trying both ways shows the lesson", () => {
    renderDeck();
    for (let i = 0; i < 4; i++) next();
    click(/要件をはっきり/);
    for (let i = 0; i < 5; i++) next();
    expect(screen.getByTestId("req-lesson")).toHaveTextContent("要件を明確にすると認識がそろう");
  });
});
