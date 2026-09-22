// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GoalEvaluationExperience from "@/components/experiences/GoalEvaluationExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <GoalEvaluationExperience />
    </ExperienceSlideDeck>,
  );
}
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const stage = () => screen.getByTestId("goal-chain").getAttribute("data-stage");
const link = (id: string) => screen.getByTestId(`goal-link-${id}`).getAttribute("data-state");
const settle = () => act(() => void vi.advanceTimersByTime(4000));

describe("GoalEvaluationExperience causal chain", () => {
  it("propagates 施策 → KPI → CSF → KGI one step at a time", () => {
    renderDeck();
    click(/接客トレーニング/);
    expect(stage()).toBe("0");
    expect(link("kpi")).toBe("off");

    act(() => void vi.advanceTimersByTime(700));
    expect(stage()).toBe("1");
    expect(link("kpi")).toBe("on");
    expect(link("csf")).toBe("off");

    act(() => void vi.advanceTimersByTime(650));
    expect(link("csf")).toBe("on");
    expect(screen.getByTestId("goal-csf-level")).toHaveAttribute("data-level", "2");
    expect(link("kgi")).toBe("off");

    settle();
    expect(link("kgi")).toBe("on");
    expect(screen.getByTestId("goal-result")).toHaveTextContent("リピート率 +3pt");
  });

  it("an SNS follower boost moves its own number but breaks before CSF and leaves KGI", () => {
    renderDeck();
    click(/SNSのフォロワー数だけ増やす/);
    settle();
    expect(screen.getByTestId("goal-vanity")).toHaveTextContent("SNSフォロワー");
    expect(link("csf")).toBe("broken");
    expect(link("kgi")).toBe("broken");
    expect(screen.getByTestId("goal-csf-level")).toHaveAttribute("data-level", "0");
  });

  it("shows the insight after CSF actions and a vanity action", () => {
    renderDeck();
    click(/ポイントカード/);
    settle();
    click(/LINEで新作/);
    settle();
    click(/広告で新規客/);
    settle();
    expect(screen.getByText(/CSFにつながらない数字は、増えてもゴールは近づかない/)).toBeInTheDocument();
  });

  it("keeps BSC and the quiz", () => {
    renderDeck();
    click("解説2");
    expect(screen.getByRole("heading", { name: /BSC/ })).toBeInTheDocument();
    click("解説3");
    expect(screen.getByRole("heading", { name: /どの指標？/ })).toBeInTheDocument();
  });
});
