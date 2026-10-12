// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LaborLawsExperience from "@/components/experiences/LaborLawsExperience";
import { SCRIPTS } from "@/components/experiences/labor/OfficeScene";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function reduceMotion() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function renderDeck() {
  render(
    <ExperienceSlideDeck>
      <LaborLawsExperience />
    </ExperienceSlideDeck>,
  );
}
const scene = () => screen.getByTestId("office-scene");
const arrow = (id: string) => scene().querySelector(`[data-arrow="${id}"]`);

describe("LaborLawsExperience office scene", () => {
  it("opens with a static 3-party diagram: 派遣 has 派遣先→派遣社員 command, 請負 has none", () => {
    renderDeck();
    const diagram = screen.getByTestId("labor-relation");
    expect(diagram).toHaveTextContent("派遣元企業");
    expect(diagram).toHaveTextContent("派遣先企業");
    expect(screen.getByRole("img", { name: /派遣先企業から派遣社員へは指揮命令/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /発注元（注文者）から請負会社の作業者へは指揮命令しない/ })).toBeInTheDocument();
  });

  it("派遣: the instruction arrow runs straight from 派遣先 to 派遣社員", () => {
    reduceMotion();
    renderDeck();
    expect(scene()).toHaveAttribute("data-mode", "haken");
    expect(scene()).toHaveAttribute("data-done", "true");
    expect(arrow("cmd")).toHaveAttribute("data-state", "on");
    expect(arrow("order")).toBeNull();
    expect(arrow("bypass")).toBeNull();
    expect(screen.getByTestId("name-agency")).toHaveTextContent("派遣元会社");
    expect(screen.getByTestId("office-scene-caption")).toHaveTextContent("派遣先が派遣社員へ直接指示");
  });

  it("請負: order goes to the contractor, the contractor instructs its own worker, no direct arrow", () => {
    reduceMotion();
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    fireEvent.click(screen.getByRole("tab", { name: /請負/ }));
    expect(scene()).toHaveAttribute("data-mode", "ukeoi");
    expect(arrow("order")).toHaveAttribute("data-state", "on");
    expect(arrow("task")).toHaveAttribute("data-state", "on");
    expect(arrow("cmd")).toBeNull();
    expect(arrow("bypass")).toBeNull();
    expect(screen.getByTestId("name-boss")).toHaveTextContent("請負会社の責任者");
    expect(screen.getByTestId("office-scene-caption")).toHaveTextContent("注文主は会社へ依頼。指示は責任者から社員へ");
  });

  it("direct instruction in 請負 draws a red bypass arrow with a careful caption", () => {
    reduceMotion();
    renderDeck();
    fireEvent.click(screen.getByRole("button", { name: "解説2" }));
    fireEvent.click(screen.getByRole("tab", { name: /請負/ }));
    fireEvent.click(screen.getByRole("button", { name: /作業者へ直接指示する/ }));
    expect(scene()).toHaveAttribute("data-scenario", "gisou");
    expect(arrow("bypass")).toHaveAttribute("data-state", "on");
    expect(arrow("order")).toHaveAttribute("data-state", "ghost");
    expect(arrow("task")).toHaveAttribute("data-state", "ghost");
    const caption = screen.getByTestId("office-scene-caption");
    expect(caption).toHaveTextContent("指揮命令関係が発生");
    expect(caption).toHaveTextContent("実態次第で偽装請負");
    expect(caption).not.toHaveTextContent("違法");

    fireEvent.click(screen.getByRole("button", { name: /本来の流れに戻す/ }));
    expect(arrow("bypass")).toBeNull();
    expect(arrow("task")).toHaveAttribute("data-state", "on");
  });

  it("plays the flow: speech first, then the instruction capsule travels along the arrow", () => {
    vi.useFakeTimers();
    renderDeck();
    expect(screen.getByTestId("speech")).toHaveTextContent("この資料を今日17時までに作ってください");
    expect(arrow("cmd")).toHaveAttribute("data-state", "off");
    act(() => vi.advanceTimersByTime(SCRIPTS.haken[0].ms));
    expect(arrow("cmd")).toHaveAttribute("data-state", "drawing");
    expect(screen.getByTestId("instruction-capsule")).toBeInTheDocument();
    for (const b of SCRIPTS.haken.slice(1)) act(() => vi.advanceTimersByTime(b.ms));
    expect(scene()).toHaveAttribute("data-done", "true");
    expect(arrow("cmd")).toHaveAttribute("data-state", "on");
    expect(screen.queryByTestId("instruction-capsule")).toBeNull();
  });
});
