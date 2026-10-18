import { describe, expect, it } from "vitest";
import {
  GROWTH_DECOR_ATTR,
  GROWTH_PULSE_ATTR,
  MOCHIT_GROWTH_PALETTES,
  buildGrowthAntennaMarkup,
  buildGrowthCircuitMarkup,
  coreBarStyle,
  fieldLevelsKey,
  parseFieldLevels,
} from "@/components/mochit/mochitGrowthDecor";
import type { MochitGrowthStage } from "@/components/mochit/mochitTypes";

const palette = MOCHIT_GROWTH_PALETTES.technology;
const stages: MochitGrowthStage[] = [1, 2, 3, 4, 5];

describe("buildGrowthAntennaMarkup", () => {
  it("is empty at stage 1 and non-empty afterwards", () => {
    expect(buildGrowthAntennaMarkup(1, palette)).toBe("");
    for (const s of stages.slice(1)) expect(buildGrowthAntennaMarkup(s, palette).length).toBeGreaterThan(0);
  });

  it("grows richer from stage 2 to 3", () => {
    expect(buildGrowthAntennaMarkup(3, palette).length).toBeGreaterThan(buildGrowthAntennaMarkup(2, palette).length);
  });

  it("shows the flower color only at stages 4 (bud) and 5 (bloom)", () => {
    for (const s of [1, 2, 3] as const) expect(buildGrowthAntennaMarkup(s, palette)).not.toContain(palette.flower);
    expect(buildGrowthAntennaMarkup(4, palette)).toContain(palette.flower);
    expect(buildGrowthAntennaMarkup(5, palette)).toContain(palette.flower);
  });

  it("has a bud only at 4 and a bloom (petals) only at 5", () => {
    const petals = (s: MochitGrowthStage) => (buildGrowthAntennaMarkup(s, palette).match(/<ellipse/g) ?? []).length;
    expect(petals(4)).toBe(0);
    expect(petals(5)).toBe(5);
    expect(buildGrowthAntennaMarkup(4, palette)).not.toBe(buildGrowthAntennaMarkup(5, palette));
  });
});

describe("buildGrowthCircuitMarkup", () => {
  it("is empty below stage 3", () => {
    expect(buildGrowthCircuitMarkup(1, palette)).toBe("");
    expect(buildGrowthCircuitMarkup(2, palette)).toBe("");
  });

  it("has pulse circles at 3+ and extra down branches only at 4+", () => {
    const pulses = (s: MochitGrowthStage) =>
      (buildGrowthCircuitMarkup(s, palette).match(new RegExp(GROWTH_PULSE_ATTR, "g")) ?? []).length;
    expect(pulses(3)).toBe(2);
    expect(pulses(4)).toBe(4);
    expect(pulses(5)).toBe(4);
    const paths = (s: MochitGrowthStage) => (buildGrowthCircuitMarkup(s, palette).match(/<path/g) ?? []).length;
    expect(paths(4)).toBeGreaterThan(paths(3));
  });

  it("uses the palette circuit color", () => {
    for (const p of Object.values(MOCHIT_GROWTH_PALETTES)) {
      expect(buildGrowthCircuitMarkup(3, p)).toContain(`stroke="${p.circuit}"`);
    }
    expect(buildGrowthCircuitMarkup(3, MOCHIT_GROWTH_PALETTES.strategy)).not.toBe(
      buildGrowthCircuitMarkup(3, MOCHIT_GROWTH_PALETTES.management),
    );
  });

  it("exports a stable decor marker attribute", () => {
    expect(GROWTH_DECOR_ATTR).toBe("data-growth-decor");
  });
});

describe("coreBarStyle", () => {
  it("leaves a full bar (Lv4) untouched", () => {
    for (const i of [0, 1, 2] as const) {
      expect(coreBarStyle(i, 4).transform).toBe("");
      expect(coreBarStyle(i, 4).opacity).toBe("");
    }
  });

  it("shrinks an empty bar (Lv0) to 0.34 about its bottom", () => {
    const bar = coreBarStyle(0, 0);
    expect(bar.transform).toContain("scale(1, 0.34)");
    expect(bar.transform).toContain("translate(582px, 881px)");
    expect(coreBarStyle(1, 0).transform).toContain("translate(623px, 887px)");
    expect(bar.opacity).toBe("0.45");
  });

  it("scales monotonically with level", () => {
    const scaleOf = (l: 0 | 1 | 2 | 3 | 4) => {
      const t = coreBarStyle(2, l).transform;
      return t ? Number(/scale\(1, ([\d.]+)\)/.exec(t)![1]) : 1;
    };
    const values = ([0, 1, 2, 3, 4] as const).map(scaleOf);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
    expect(new Set(values).size).toBe(5);
  });
});

describe("parseFieldLevels / fieldLevelsKey", () => {
  it("returns null for undefined or empty", () => {
    expect(parseFieldLevels(undefined)).toBeNull();
    expect(parseFieldLevels("")).toBeNull();
  });

  it("parses a normal key", () => {
    expect(parseFieldLevels("0,2,4")).toEqual([0, 2, 4]);
  });

  it("clamps to 0..4 and treats garbage as 0", () => {
    expect(parseFieldLevels("9,-3,abc")).toEqual([4, 0, 0]);
    expect(parseFieldLevels("2.9,NaN,")).toEqual([2, 0, 0]);
  });

  it("pads missing entries with 0", () => {
    expect(parseFieldLevels("3")).toEqual([3, 0, 0]);
  });

  it("round-trips through fieldLevelsKey", () => {
    const levels = [1, 0, 4] as const;
    expect(fieldLevelsKey(levels)).toBe("1,0,4");
    expect(parseFieldLevels(fieldLevelsKey(levels))).toEqual([1, 0, 4]);
  });
});
