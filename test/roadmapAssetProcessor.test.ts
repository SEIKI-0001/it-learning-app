import { describe, expect, it } from "vitest";
import { clearOuterBackground } from "../scripts/process-roadmap-map-assets.mjs";

function pixelIndex(x: number, y: number, width: number) {
  return (y * width + x) * 4;
}

describe("roadmap artwork alpha processing", () => {
  it("clears only bright neutral pixels connected to the canvas edge", () => {
    const width = 5;
    const height = 5;
    const data = new Uint8Array(width * height * 4).fill(255);

    // 水面を想定した色の輪で囲まれた白いハイライトは、外周の白背景と区別する。
    for (let y = 1; y <= 3; y += 1) {
      for (let x = 1; x <= 3; x += 1) {
        if (x === 2 && y === 2) continue;
        const index = pixelIndex(x, y, width);
        data.set([20, 150, 210, 255], index);
      }
    }

    const output = clearOuterBackground(data, width, height);

    expect(output[pixelIndex(0, 0, width) + 3]).toBe(0);
    expect(output[pixelIndex(2, 2, width) + 3]).toBe(255);
    expect(output[pixelIndex(1, 1, width) + 3]).toBe(255);
  });
});
