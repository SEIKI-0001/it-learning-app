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
