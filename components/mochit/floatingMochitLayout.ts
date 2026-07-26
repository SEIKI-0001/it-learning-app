import {
  clampFloatingMochitPosition,
  getDefaultFloatingMochitPosition,
  type FloatingMochitPoint,
} from "./floatingMochitPreferences";

export const FLOATING_MOCHIT_HIT_SIZE = 108;
export const FLOATING_MOCHIT_RENDER_SIZE = 84;
export const FLOATING_MOCHIT_VIEWPORT_MARGIN = 16;
export const FLOATING_MOCHIT_BOTTOM_NAV_HEIGHT = 64;
export const FLOATING_MOCHIT_MOBILE_BREAKPOINT = 768;

export type FloatingViewportMetrics = {
  width: number;
  height: number;
  margin: number;
  bottomClearance: number;
};

export type FloatingOverlayAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FloatingOverlaySize = {
  width: number;
  height: number;
};

export type FloatingOverlayPlacement = "top" | "right" | "bottom" | "left";

export type FloatingOverlayPosition = {
  left: number;
  top: number;
  placement: FloatingOverlayPlacement;
};

export function getFloatingOverlayPosition(
  anchor: FloatingOverlayAnchor,
  size: FloatingOverlaySize,
  viewport: FloatingViewportMetrics,
): FloatingOverlayPosition {
  const gap = 8;
  const available = {
    top: anchor.y - viewport.margin,
    right:
      viewport.width -
      viewport.margin -
      (anchor.x + anchor.width),
    bottom:
      viewport.height -
      viewport.bottomClearance -
      viewport.margin -
      (anchor.y + anchor.height),
    left: anchor.x - viewport.margin,
  };
  const verticalFits = (
    ["top", "bottom"] as const
  ).filter((placement) => available[placement] >= size.height + gap);
  const horizontalFits = (
    ["left", "right"] as const
  ).filter((placement) => available[placement] >= size.width + gap);

  let placement: FloatingOverlayPlacement;
  if (verticalFits.length > 0) {
    placement = verticalFits.reduce((best, candidate) =>
      available[candidate] > available[best] ? candidate : best,
    );
  } else if (horizontalFits.length > 0) {
    placement = horizontalFits.reduce((best, candidate) =>
      available[candidate] > available[best] ? candidate : best,
    );
  } else {
    placement = (
      Object.keys(available) as FloatingOverlayPlacement[]
    ).reduce((best, candidate) =>
      available[candidate] > available[best] ? candidate : best,
    );
  }

  const centeredLeft = anchor.x + (anchor.width - size.width) / 2;
  const centeredTop = anchor.y + (anchor.height - size.height) / 2;
  const rawLeft =
    placement === "left"
      ? anchor.x - gap - size.width
      : placement === "right"
        ? anchor.x + anchor.width + gap
        : centeredLeft;
  const rawTop =
    placement === "top"
      ? anchor.y - gap - size.height
      : placement === "bottom"
        ? anchor.y + anchor.height + gap
        : centeredTop;
  const maximumLeft = Math.max(
    viewport.margin,
    viewport.width - viewport.margin - size.width,
  );
  const maximumTop = Math.max(
    viewport.margin,
    viewport.height -
      viewport.bottomClearance -
      viewport.margin -
      size.height,
  );

  return {
    left: Math.min(Math.max(rawLeft, viewport.margin), maximumLeft),
    top: Math.min(Math.max(rawTop, viewport.margin), maximumTop),
    placement,
  };
}

function readSafeAreaBottom(win: Window): number {
  const value = win
    .getComputedStyle(win.document.documentElement)
    .getPropertyValue("--safe-area-inset-bottom");
  const pixels = Number.parseFloat(value);
  return Number.isFinite(pixels) ? Math.max(0, pixels) : 0;
}

export function getFloatingMochitViewportMetrics(
  win: Window,
): FloatingViewportMetrics {
  const width = win.visualViewport?.width ?? win.innerWidth;
  const height = win.visualViewport?.height ?? win.innerHeight;
  const mobile = width < FLOATING_MOCHIT_MOBILE_BREAKPOINT;

  return {
    width,
    height,
    margin: FLOATING_MOCHIT_VIEWPORT_MARGIN,
    bottomClearance: mobile
      ? FLOATING_MOCHIT_BOTTOM_NAV_HEIGHT + readSafeAreaBottom(win)
      : 0,
  };
}

export function clampFloatingMochitPoint(
  point: FloatingMochitPoint,
  metrics: FloatingViewportMetrics,
): FloatingMochitPoint {
  return clampFloatingMochitPosition(
    point,
    metrics.width,
    metrics.height,
    FLOATING_MOCHIT_HIT_SIZE,
    FLOATING_MOCHIT_HIT_SIZE,
    metrics.margin,
    metrics.bottomClearance,
  );
}

export function getDefaultFloatingMochitPoint(
  metrics: FloatingViewportMetrics,
): FloatingMochitPoint {
  return getDefaultFloatingMochitPosition(
    metrics.width,
    metrics.height,
    FLOATING_MOCHIT_HIT_SIZE,
    FLOATING_MOCHIT_HIT_SIZE,
    metrics.margin,
    metrics.bottomClearance,
  );
}
