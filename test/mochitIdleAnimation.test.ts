import { describe, expect, it } from "vitest";
import {
  antennaKeyframes,
  blinkDurationMs,
  blinkKeyframes,
  breatheKeyframes,
  eyelidRestTransform,
  GAZE_CENTER,
  getIdleProfile,
  nextBlinkGapMs,
  nextGazeHoldMs,
  nextGazeTarget,
  offsetTransform,
  randRange,
  rotateAbout,
  scaleAbout,
  shouldDoubleBlink,
  swayKeyframes,
  type RNG,
} from "@/components/mochit/mochitIdleAnimation";

// 決定的な擬似乱数（線形合同法）。境界テストを再現可能にする。
function seededRng(seed: number): RNG {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe("mochit idle transform builders", () => {
  it("rotateAbout brackets the rotation with pivot translate/untranslate", () => {
    expect(rotateAbout(616, 1012, -1.1)).toBe(
      "translate(616px, 1012px) rotate(-1.1deg) translate(-616px, -1012px)",
    );
  });
  it("scaleAbout brackets the scale with the pivot", () => {
    expect(scaleAbout(616, 1002, 1.014, 1.024)).toBe(
      "translate(616px, 1002px) scale(1.014, 1.024) translate(-616px, -1002px)",
    );
  });
  it("offsetTransform is a plain translate", () => {
    expect(offsetTransform(-7, 4)).toBe("translate(-7px, 4px)");
  });
});

describe("mochit idle profiles", () => {
  it("compact reduces sway amplitude and disables gaze", () => {
    const full = getIdleProfile(false);
    const compact = getIdleProfile(true);
    expect(compact.sway.deg).toBeLessThan(full.sway.deg);
    expect(full.gaze).not.toBeNull();
    expect(compact.gaze).toBeNull();
  });

  it("continuous keyframes are two-key alternate loops", () => {
    const p = getIdleProfile(false);
    for (const kf of [breatheKeyframes(p), swayKeyframes(p), antennaKeyframes(p)]) {
      expect(kf).toHaveLength(2);
      expect(String(kf[0].transform)).not.toBe(String(kf[1].transform));
    }
  });
});

describe("mochit blink", () => {
  it("blink keyframes close then open (scaleY 0 -> 1 -> 0) from the eyelid top", () => {
    const p = getIdleProfile(false);
    const kf = blinkKeyframes(p, p.blink.cxL);
    expect(kf).toHaveLength(4);
    expect(kf[0].offset).toBe(0);
    expect(kf[kf.length - 1].offset).toBe(1);
    // 開始・終了は静止（ほぼ scaleY 0）、中間は完全に閉じる
    expect(String(kf[0].transform)).toContain("scale(1, 0.0001)");
    expect(String(kf[1].transform)).toContain("scale(1, 1)");
    expect(blinkDurationMs(p)).toBe(p.blink.closeMs + p.blink.holdMs + p.blink.openMs);
  });

  it("eyelid rest transform keeps the lid collapsed (invisible)", () => {
    const p = getIdleProfile(false);
    expect(eyelidRestTransform(p, p.blink.cxR)).toContain("scale(1, 0.0001)");
  });

  it("blink gap stays within the configured window", () => {
    const p = getIdleProfile(false);
    const rng = seededRng(42);
    for (let i = 0; i < 200; i++) {
      const gap = nextBlinkGapMs(p, rng);
      expect(gap).toBeGreaterThanOrEqual(p.blink.minGapMs);
      expect(gap).toBeLessThanOrEqual(p.blink.maxGapMs);
    }
  });

  it("double blink is occasional, not constant", () => {
    const p = getIdleProfile(false);
    const rng = seededRng(7);
    let doubles = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) if (shouldDoubleBlink(p, rng)) doubles++;
    expect(doubles).toBeGreaterThan(0);
    expect(doubles).toBeLessThan(n * 0.5);
  });
});

describe("mochit gaze", () => {
  it("gaze targets stay within range and sometimes recenter", () => {
    const p = getIdleProfile(false);
    const rng = seededRng(99);
    let recentered = 0;
    for (let i = 0; i < 500; i++) {
      const t = nextGazeTarget(p, rng);
      expect(Math.abs(t.x)).toBeLessThanOrEqual(p.gaze!.rangeX);
      expect(Math.abs(t.y)).toBeLessThanOrEqual(p.gaze!.rangeY);
      if (t.x === 0 && t.y === 0) recentered++;
    }
    expect(recentered).toBeGreaterThan(0);
  });

  it("compact profile has no gaze motion", () => {
    const p = getIdleProfile(true);
    expect(nextGazeTarget(p, seededRng(1))).toEqual(GAZE_CENTER);
    expect(nextGazeHoldMs(p, seededRng(1))).toBe(0);
  });
});

describe("randRange", () => {
  it("respects bounds", () => {
    const rng = seededRng(123);
    for (let i = 0; i < 200; i++) {
      const v = randRange(10, 20, rng);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(20);
    }
  });
});
