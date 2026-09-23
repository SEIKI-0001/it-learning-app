// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import EnterpriseActivitiesExperience from "@/components/experiences/EnterpriseActivitiesExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

describe("EnterpriseActivitiesExperience", () => {
  it("shows one explanation step at a time and changes it with the controls", () => {
    render(<ExperienceSlideDeck><EnterpriseActivitiesExperience /></ExperienceSlideDeck>);

    expect(
      screen.getByRole("heading", { name: "1会社は多くの相手とつながっている" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "2ステークホルダにあたる？" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId("experience-slides-viewport"), {
      key: "ArrowRight",
    });

    expect(
      screen.queryByRole("heading", { name: "1会社は多くの相手とつながっている" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "2ステークホルダにあたる？" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "解説3" }));

    expect(
      screen.getByRole("heading", { name: "3利益と社会的責任を両立する" }),
    ).toBeInTheDocument();
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });
});

describe("EnterpriseActivitiesExperience exchange map", () => {
  const lane = (i: number) => screen.getByTestId(`stakeholder-lane-${i}`).getAttribute("data-on");

  it("moves only the two flows of the chosen stakeholder", () => {
    render(<ExperienceSlideDeck><EnterpriseActivitiesExperience /></ExperienceSlideDeck>);
    expect(screen.queryByTestId("stakeholder-token-in")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /従業員/ }));
    expect(lane(2)).toBe("true");
    expect(lane(0)).toBe("false");
    expect(screen.getByTestId("stakeholder-token-in")).toHaveTextContent("労働");
    expect(screen.getByTestId("stakeholder-token-out")).toHaveTextContent("給料");
    expect(screen.getByText("① → 自社")).toBeInTheDocument();
    expect(screen.getByTestId("stakeholder-seen")).toHaveTextContent("1 / 7");

    fireEvent.click(screen.getByRole("button", { name: /株主/ }));
    expect(lane(1)).toBe("true");
    expect(lane(2)).toBe("false");
    expect(screen.getByText(/コーポレートガバナンス/)).toBeInTheDocument();
    expect(screen.getByTestId("stakeholder-seen")).toHaveTextContent("2 / 7");
  });

  it("plays every exchange at once and keeps all lanes lit", () => {
    render(<ExperienceSlideDeck><EnterpriseActivitiesExperience /></ExperienceSlideDeck>);
    fireEvent.click(screen.getByRole("button", { name: /全部の交換を流す/ }));
    for (let i = 0; i < 7; i++) expect(lane(i)).toBe("true");
    expect(screen.getByTestId("stakeholder-all-summary")).toHaveTextContent("どれか1本でも止まると");
  });
});
