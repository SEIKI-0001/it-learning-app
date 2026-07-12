import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("roadmap reduced motion", () => {
  it("stops roadmap fog and route animations for reduced motion", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.roadmap-fog-clearing[\s\S]*animation: none/,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.roadmap-path-draw[\s\S]*animation: none/,
    );
  });
});
