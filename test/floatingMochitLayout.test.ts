import { describe, expect, it } from "vitest";
import {
  getFloatingOverlayPosition,
  type FloatingOverlayAnchor,
  type FloatingOverlaySize,
  type FloatingViewportMetrics,
} from "@/components/mochit/floatingMochitLayout";

const MOBILE_VIEWPORT: FloatingViewportMetrics = {
  width: 390,
  height: 844,
  margin: 16,
  bottomClearance: 64,
};

function expectInsideViewport(
  position: { left: number; top: number },
  size: FloatingOverlaySize,
  viewport: FloatingViewportMetrics,
) {
  expect(position.left).toBeGreaterThanOrEqual(viewport.margin);
  expect(position.top).toBeGreaterThanOrEqual(viewport.margin);
  expect(position.left + size.width).toBeLessThanOrEqual(
    viewport.width - viewport.margin,
  );
  expect(position.top + size.height).toBeLessThanOrEqual(
    viewport.height - viewport.margin - viewport.bottomClearance,
  );
}

describe("floating Mochit overlay placement", () => {
  it("places a bubble below a pet at the top-right and clamps its right edge", () => {
    const anchor: FloatingOverlayAnchor = {
      x: 266,
      y: 16,
      width: 108,
      height: 108,
    };
    const size = { width: 220, height: 80 };
    const position = getFloatingOverlayPosition(anchor, size, MOBILE_VIEWPORT);

    expect(position).toEqual({
      left: 154,
      top: 132,
      placement: "bottom",
    });
    expectInsideViewport(position, size, MOBILE_VIEWPORT);
  });

  it("places a menu above a pet at the bottom-right", () => {
    const anchor: FloatingOverlayAnchor = {
      x: 266,
      y: 624,
      width: 108,
      height: 108,
    };
    const size = { width: 288, height: 260 };
    const position = getFloatingOverlayPosition(anchor, size, MOBILE_VIEWPORT);

    expect(position).toEqual({
      left: 86,
      top: 356,
      placement: "top",
    });
    expectInsideViewport(position, size, MOBILE_VIEWPORT);
  });

  it("uses horizontal placement when neither vertical side can fit", () => {
    const shortViewport: FloatingViewportMetrics = {
      width: 600,
      height: 360,
      margin: 16,
      bottomClearance: 0,
    };
    const size = { width: 220, height: 280 };

    expect(
      getFloatingOverlayPosition(
        { x: 460, y: 126, width: 108, height: 108 },
        size,
        shortViewport,
      ),
    ).toEqual({ left: 232, top: 40, placement: "left" });
    expect(
      getFloatingOverlayPosition(
        { x: 32, y: 126, width: 108, height: 108 },
        size,
        shortViewport,
      ),
    ).toEqual({ left: 148, top: 40, placement: "right" });
  });
});
