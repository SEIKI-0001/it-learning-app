// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ComputerCoreExperience from "@/components/experiences/ComputerCoreExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderFlow() {
  render(
    <ExperienceSlideDeck>
      <ComputerCoreExperience />
    </ExperienceSlideDeck>,
  );
  fireEvent.click(screen.getByRole("button", { name: "解説2" }));
}

const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const next = () => click("1ステップ進む");
const doc = () => screen.getByTestId("work-doc");
const stored = () => screen.getByTestId("stored-file");

describe("ComputerCoreExperience", () => {
  it("keeps the three roles and the memory/storage comparison", () => {
    render(
      <ExperienceSlideDeck>
        <ComputerCoreExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getAllByText("頭脳").length).toBeGreaterThan(0);
    expect(screen.getAllByText("作業机").length).toBeGreaterThan(0);
    expect(screen.getAllByText("引き出し").length).toBeGreaterThan(0);
    click("解説3");
    expect(screen.getByText("消える（揮発性）")).toBeInTheDocument();
    expect(screen.getByText("残る（不揮発性）")).toBeInTheDocument();
  });

  it("moves the document Storage → Memory, edits it in memory, then saves it back", () => {
    renderFlow();
    const scene = screen.getByTestId("computer-scene");
    for (const part of ["storage", "memory", "cpu"]) {
      expect(scene.querySelector(`[data-illustration="${part}"]`)).not.toBeNull();
    }
    expect(doc()).toHaveAttribute("data-spot", "storage");

    next();
    expect(doc()).toHaveAttribute("data-spot", "memory");
    expect(stored()).toHaveTextContent("v1");
    next();
    expect(screen.getByTestId("bus-packet")).toHaveAttribute("data-spot", "cpu");
    next();
    expect(doc()).toHaveAttribute("data-status", "dirty");
    expect(doc()).toHaveTextContent("売上 120万円");
    expect(stored()).toHaveTextContent("売上 100万円");
    next();
    expect(doc()).toHaveAttribute("data-status", "saved");
    expect(stored()).toHaveTextContent("v2");
  });

  it("power off before saving erases only the memory copy; storage keeps the old version", () => {
    renderFlow();
    next();
    next();
    next();
    click("⚡ 電源を切る");
    expect(screen.getByTestId("computer-scene")).toHaveAttribute("data-power", "off");
    expect(doc()).toHaveAttribute("data-status", "vanished");
    expect(stored()).toHaveTextContent(/v1.*売上 100万円/);
    expect(screen.getByTestId("cc-detail")).toHaveTextContent("編集（売上 120万円）が消えました");

    click("🔌 電源を入れて文書を開き直す");
    expect(doc()).toHaveAttribute("data-version", "1");
    expect(doc()).toHaveTextContent("売上 100万円");
  });

  it("power off after saving keeps the edit, and comparing both shows the volatility insight", () => {
    renderFlow();
    next();
    next();
    next();
    click("⚡ 電源を切る");
    click("↩ 電源OFFの前に戻る");
    next();
    click("⚡ 電源を切る");
    expect(stored()).toHaveTextContent("v2");
    expect(screen.getByTestId("cc-insight")).toHaveTextContent("揮発性");
    click("🔌 電源を入れて文書を開き直す");
    expect(doc()).toHaveTextContent("売上 120万円");
  });
});
