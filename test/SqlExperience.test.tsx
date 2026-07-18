// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import SqlExperience from "@/components/experiences/SqlExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

describe("SqlExperience", () => {
  it("treats its three diagrams as slides", () => {
    render(
      <ExperienceSlideDeck>
        <SqlExperience />
      </ExperienceSlideDeck>,
    );

    expect(
      screen.getByRole("heading", { name: "1SQLの形（取り出す命令）" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "解説2" }));

    expect(
      screen.getByRole("heading", { name: "2ミニSQL：選ぶと結果が変わる" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });
});
