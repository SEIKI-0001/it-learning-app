// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MultimediaExperience from "@/components/experiences/MultimediaExperience";
import { getTopicExperience } from "@/components/experiences/registry";
import { ExperienceSlideDeck } from "@/components/experiences/ui";

afterEach(() => {
  cleanup();
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
      <MultimediaExperience />
    </ExperienceSlideDeck>,
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

describe("MultimediaExperience", () => {
  it("is registered for tech-multimedia-compression", () => {
    expect(getTopicExperience("tech-multimedia-compression")).toBe(MultimediaExperience);
  });

  it("run-length packs 10 blocks into 6", () => {
    reduceMotion();
    renderDeck();
    expect(screen.getByTestId("media-compress-packed")).toHaveAttribute("data-count", "6");
    expect(screen.getByTestId("media-compress-eq")).toHaveTextContent("10個 → 6個");
  });

  it("lossless expands back exactly; lossy does not", () => {
    reduceMotion();
    renderDeck();
    click("解説2");
    expect(screen.getByTestId("media-loss-verdict")).toHaveTextContent("完全に一致");
    click("非可逆圧縮（写真）");
    expect(screen.getByTestId("media-loss-verdict")).toHaveTextContent("元には戻らない");
  });

  it("format scenes reveal the summary table once all are answered", () => {
    renderDeck();
    click("解説3");
    ["JPEG", "PNG", "MP3", "ZIP"].forEach((l, i) =>
      fireEvent.click(within(screen.getByTestId(`media-format-${i}`)).getByRole("button", { name: l })),
    );
    expect(screen.getByTestId("media-format-table")).toHaveTextContent("非可逆");
  });

  it("compression ratio = after ÷ before (after = size × rate)", () => {
    renderDeck();
    click("解説4");
    expect(screen.getByTestId("media-ratio")).toHaveAttribute("data-after", "4");
    click("20MB");
    click("30%");
    expect(screen.getByTestId("media-ratio-eq")).toHaveTextContent("20MB × 30% ＝ 6MB");
  });

  it("covers the terms the check questions ask (解像度・CMYK・AR/VR)", () => {
    renderDeck();
    click("解説5");
    expect(screen.getByText(/CMYK＝インクを重ねる/)).toBeInTheDocument();
    click("VR");
    expect(screen.getByTestId("media-xr")).toHaveTextContent("現実が見えない");
    click("粗くする");
    expect(screen.getByTestId("media-resolution")).toHaveAttribute("data-fine", "false");
  });

  it("practice: reading 40% as 40% cut is caught", () => {
    renderDeck();
    click("解説6");
    click("可逆圧縮");
    click("次の問題へ →");
    click("JPEG");
    click("次の問題へ →");
    click("18MB");
    expect(screen.getByText(/40%削減したと読んで/)).toBeInTheDocument();
  });
});
