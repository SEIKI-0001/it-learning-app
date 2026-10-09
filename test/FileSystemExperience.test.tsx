// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import FileSystemExperience, { absolutePath, relativePath } from "@/components/experiences/FileSystemExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <FileSystemExperience />
    </ExperienceSlideDeck>,
  );
}

describe("path helpers", () => {
  it("builds absolute paths from the root", () => {
    expect(absolutePath("plan")).toBe("/home/suzuki/plan.xlsx");
    expect(absolutePath("price")).toBe("/share/price.csv");
  });

  it("builds relative paths with .. for each step up", () => {
    expect(relativePath("sato", "memo").text).toBe("memo.txt");
    expect(relativePath("sato", "plan").text).toBe("../suzuki/plan.xlsx");
    expect(relativePath("sato", "price").text).toBe("../../share/price.csv");
    expect(relativePath("home", "plan").text).toBe("suzuki/plan.xlsx");
  });
});

describe("FileSystemExperience", () => {
  it("has the four topics and the exam points as slides", () => {
    renderDeck();
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
  });

  it("marks files as leaves and the empty directory as a leaf", () => {
    renderDeck();
    const tree = screen.getByTestId("fs-tree-roles");
    const row = (id: string) => tree.querySelector(`[data-node="${id}"]`) as HTMLElement;
    expect(within(row("photos")).getByText("葉（空のディレクトリ）")).toBeInTheDocument();
    expect(within(row("memo")).getByText("葉")).toBeInTheDocument();
    expect(within(row("sato")).getByText("節")).toBeInTheDocument();
  });

  it("changing the current directory changes only the relative path", () => {
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    expect(screen.getByTestId("fs-abs")).toHaveTextContent("/home/suzuki/plan.xlsx");
    expect(screen.getByTestId("fs-rel")).toHaveAttribute("data-text", "../suzuki/plan.xlsx");
    fireEvent.click(within(screen.getByTestId("fs-cwd")).getByRole("button", { name: "home" }));
    expect(screen.getByTestId("fs-abs")).toHaveTextContent("/home/suzuki/plan.xlsx");
    expect(screen.getByTestId("fs-rel")).toHaveAttribute("data-text", "suzuki/plan.xlsx");
  });

  it("renaming the extension keeps the JPEG data", () => {
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: "解説3" }));
    fireEvent.click(within(screen.getByTestId("fs-ext-mode")).getByRole("button", { name: /photo\.txt/ }));
    const ext = screen.getByTestId("fs-ext");
    expect(ext).toHaveAttribute("data-mode", "txt");
    expect(within(ext).getByText("JPEG画像のまま")).toBeInTheDocument();
  });

  it("a read-only group can see but not change", () => {
    renderDeck();
    expect(screen.getByTestId("fs-perm-who")).toHaveTextContent("書き換え・削除はできない");
  });
});
