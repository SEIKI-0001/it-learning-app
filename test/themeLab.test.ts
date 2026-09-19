import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, deriveScale, hexToOklch, normalizeHex, oklchToHex } from "@/lib/themeLab/color";
import {
  CURRENT_SCALES,
  SCALE_ORDER,
  THEME_PRESETS,
  currentTheme,
  parseTheme,
  themeToCss,
  withAnchor,
} from "@/lib/themeLab/tokens";

const globalsCss = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");

describe("配色ラボのトークン", () => {
  it("globals.css の @theme と一致している", () => {
    for (const key of SCALE_ORDER) {
      for (const [stop, hex] of Object.entries(CURRENT_SCALES[key].stops)) {
        expect(globalsCss).toContain(`--color-${key}-${stop}: ${hex};`);
      }
    }
    expect(globalsCss).toContain("--background: #ffffff;");
  });

  it("hex と OKLCH を往復しても同じ色に戻る", () => {
    for (const key of SCALE_ORDER) {
      for (const hex of Object.values(CURRENT_SCALES[key].stops)) {
        expect(oklchToHex(hexToOklch(hex))).toBe(hex);
      }
    }
  });

  it("基準色が現行と同じなら段階はそのまま", () => {
    for (const key of SCALE_ORDER) {
      const def = CURRENT_SCALES[key];
      expect(deriveScale(def.stops, def.anchor, def.stops[def.anchor])).toEqual(def.stops);
    }
  });

  it("基準色を変えても段の明暗の順序は保たれる", () => {
    for (const key of SCALE_ORDER) {
      for (const anchor of ["#6d4bd8", "#0f766e", "#e0a526", "#1c2433", "#9ad0ff"]) {
        const stops = withAnchor(currentTheme(), key, anchor).scales[key].stops;
        const lightness = Object.values(stops).map((hex) => hexToOklch(hex).l);
        for (let i = 1; i < lightness.length; i += 1) {
          expect(lightness[i]).toBeLessThanOrEqual(lightness[i - 1] + 1e-6);
        }
        expect(Object.keys(stops)).toEqual(Object.keys(CURRENT_SCALES[key].stops));
      }
    }
  });

  it("プリセットはすべて保存形式として読み戻せる", () => {
    for (const preset of THEME_PRESETS) {
      const theme = preset.build();
      expect(parseTheme(JSON.parse(JSON.stringify(theme)))).toEqual(theme);
      expect(themeToCss(theme)).toContain("--color-brand-500:");
    }
    expect(parseTheme({ surfaces: {}, scales: {} })).toBeNull();
  });

  it("色番号は全角・空白まじり・# なし・3桁でも受け付ける", () => {
    expect(normalizeHex("＃ＦＦｅｅｃｃ")).toBe("#ffeecc");
    expect(normalizeHex(" #2F6FDB ")).toBe("#2f6fdb");
    expect(normalizeHex("2f6fdb")).toBe("#2f6fdb");
    expect(normalizeHex("#f0c")).toBe("#ff00cc");
    expect(normalizeHex("#12345")).toBeNull();
    expect(normalizeHex("blue")).toBeNull();
  });

  it("コントラスト比は白黒で 21", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });
});
