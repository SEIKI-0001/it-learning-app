// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MochitSvg from "@/components/mochit/MochitSvg";
import { MOCHIT_GROWTH_PALETTES } from "@/components/mochit/mochitGrowthDecor";

beforeEach(() => {
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    writable: true,
    value: function animate() {
      const anim = { playState: "running", cancel: vi.fn(() => (anim.playState = "idle")) };
      return anim;
    },
  });
});

afterEach(() => {
  cleanup();
  delete (Element.prototype as { animate?: unknown }).animate;
});

type SvgProps = Partial<Parameters<typeof MochitSvg>[0]>;
const base = {
  growthStage: 1,
  reducedMotion: false,
  compact: false,
  reactionProfile: "full" as const,
  ariaLabel: "モチット",
};

function renderSvg(props: SvgProps = {}) {
  const view = render(<MochitSvg {...base} {...props} />);
  const svg = view.container.querySelector("svg")!;
  const q = (id: string) => svg.querySelector<SVGGraphicsElement>(`#${id}`)!;
  const decor = () => Array.from(svg.querySelectorAll("[data-growth-decor]"));
  const rerender = (next: SvgProps) => view.rerender(<MochitSvg {...base} {...props} {...next} />);
  return { svg, q, decor, rerender };
}

describe("MochitSvg: 成長の見た目", () => {
  it("段階5＋technology: 芽と回路に飾りが入り、回路色が個性色になる", () => {
    const { svg, q, decor } = renderSvg({ growthStage: 5, growthPersonality: "technology" });
    expect(svg.getAttribute("data-growth-stage")).toBe("5");

    const antennaDecor = q("Anim_Antenna").querySelector(":scope > [data-growth-decor]");
    expect(antennaDecor).not.toBeNull();
    // 芽の土台（Antenna_Base）の手前に差し込まれる
    expect(antennaDecor!.nextElementSibling).toBe(q("Antenna_Base"));

    const circuitDecor = q("Circuit_L").previousElementSibling;
    expect(circuitDecor?.hasAttribute("data-growth-decor")).toBe(true);
    expect(decor()).toHaveLength(2);

    const color = MOCHIT_GROWTH_PALETTES.technology.circuit;
    // jsdom は色を rgb() に正規化するので、同じ値を style に入れた要素と比べる
    const probe = document.createElement("div");
    probe.style.color = color;
    const expected = probe.style.color;
    expect(expected).not.toBe("");
    expect(q("Circuit_L").style.stroke).toBe(expected);
    expect(q("Circuit_R").style.stroke).toBe(expected);
    expect(q("Circuit_L").style.stroke).not.toBe("");
    expect(q("Circuit_R").style.stroke).not.toBe("");
  });

  it("growthFields: Core_Bar_1 は縮み、Core_Bar_3 (Lv4) は素のまま", () => {
    const { q } = renderSvg({ growthStage: 3, growthFields: "0,2,4" });
    expect(q("Core_Bar_1").style.transform).toContain("scale(1, 0.34)");
    expect(q("Core_Bar_2").style.transform).toContain("scale(");
    expect(q("Core_Bar_3").style.transform).toBe("");
  });

  it("段階を下げて再描画すると古い飾りが消え、重複しない", () => {
    const { decor, rerender, q } = renderSvg({ growthStage: 5, growthPersonality: "technology" });
    expect(decor()).toHaveLength(2);
    rerender({ growthStage: 3, growthPersonality: "technology" });
    expect(decor()).toHaveLength(2);
    expect(q("Anim_Antenna").querySelectorAll("[data-growth-decor]")).toHaveLength(1);
    rerender({ growthStage: 2, growthPersonality: "technology" });
    // 段階2: 芽の飾りだけ（回路の枝は段階3から）
    expect(decor()).toHaveLength(1);
    rerender({ growthStage: 1, growthPersonality: "technology" });
    expect(decor()).toHaveLength(0);
  });

  it("同じ段階で再描画しても飾りが増えない", () => {
    const { decor, rerender } = renderSvg({ growthStage: 4, growthPersonality: "management" });
    rerender({ growthStage: 4, growthPersonality: "strategy" });
    expect(decor()).toHaveLength(2);
  });

  it("growthFields を省くとバーには触れない", () => {
    const { q } = renderSvg({ growthStage: 3 });
    for (const id of ["Core_Bar_1", "Core_Bar_2", "Core_Bar_3"]) {
      expect(q(id).style.transform).toBe("");
      expect(q(id).style.opacity).toBe("");
    }
  });

  it("growthFields を外すとバーが元に戻る", () => {
    const { q, rerender } = renderSvg({ growthFields: "0,0,0" });
    expect(q("Core_Bar_1").style.transform).not.toBe("");
    rerender({ growthFields: undefined });
    expect(q("Core_Bar_1").style.transform).toBe("");
  });

  it("undecided は回路色を原画のままにする", () => {
    const { q } = renderSvg({ growthStage: 4, growthPersonality: "undecided" });
    expect(q("Circuit_L").style.stroke).toBe("");
  });
});
