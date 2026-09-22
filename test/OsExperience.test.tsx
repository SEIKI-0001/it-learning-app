// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import OsExperience from "@/components/experiences/OsExperience";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(cleanup);

function renderRelay() {
  render(
    <ExperienceSlideDeck>
      <OsExperience />
    </ExperienceSlideDeck>,
  );
  fireEvent.click(screen.getByRole("button", { name: "解説2" }));
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const next = () => click("1ステップ進む");
const capsule = () => screen.getByTestId("os-capsule");

describe("OsExperience", () => {
  it("keeps the 3-layer stack and the basic/application software summary", () => {
    render(
      <ExperienceSlideDeck>
        <OsExperience />
      </ExperienceSlideDeck>,
    );
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText("仲介役")).toBeInTheDocument();
    click("解説3");
    expect(screen.getByText("分類のおさらい")).toBeInTheDocument();
  });

  it("'play sound' flows App → OS → CPU/Speaker → back to the user", () => {
    renderRelay();
    expect(capsule()).toHaveAttribute("data-at", "music");
    next();
    expect(capsule()).toHaveAttribute("data-at", "core");
    expect(capsule()).toHaveTextContent("音を出したい");
    next();
    expect(capsule()).toHaveAttribute("data-at", "cpu");
    next();
    expect(capsule()).toHaveAttribute("data-at", "speaker");
    next();
    expect(capsule()).toHaveAttribute("data-tone", "result");
    expect(screen.getByTestId("os-user")).toHaveAttribute("data-hears", "true");
  });

  it("'save file' flows App → OS → Storage and OS reports completion", () => {
    renderRelay();
    click("💾 ファイルを保存");
    expect(capsule()).toHaveAttribute("data-at", "files");
    next();
    next();
    expect(capsule()).toHaveAttribute("data-at", "storage");
    next();
    expect(capsule()).toHaveTextContent("保存完了");
  });

  it("direct access from the app to hardware is stopped at the OS layer", () => {
    renderRelay();
    click("🚫 アプリからハードウェアを直接さわってみる");
    expect(screen.getByTestId("os-scene")).toHaveAttribute("data-barrier", "true");
    expect(screen.getByTestId("os-denied")).toHaveTextContent("OSを経由してください");
    expect(capsule()).toHaveAttribute("data-tone", "blocked");
    expect(capsule()).toHaveAttribute("data-at", "wallL");
    click("↩ OSを通す正しい流れに戻す");
    expect(screen.queryByTestId("os-denied")).toBeNull();
  });
});
