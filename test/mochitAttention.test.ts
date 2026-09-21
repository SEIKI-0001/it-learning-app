import { describe, expect, it } from "vitest";
import {
  attentionPointToGazeOffset,
  clampMochitAttentionPoint,
  MOCHIT_ATTENTION_CENTER,
  MOCHIT_VIEWPORT_ATTENTION,
  resolveMochitGazeTarget,
  viewportTargetToAttentionPoint,
} from "@/components/mochit/mochitAttention";
import { getIdleProfile } from "@/components/mochit/mochitIdleAnimation";

const range = getIdleProfile(false).gaze!; // rangeX=7, rangeY=4

describe("clampMochitAttentionPoint", () => {
  it("範囲外は 0〜1 に収める", () => {
    expect(clampMochitAttentionPoint({ x: -0.4, y: 1.3 })).toEqual({ x: 0, y: 1 });
    expect(clampMochitAttentionPoint({ x: 0.2, y: 0.3 })).toEqual({ x: 0.2, y: 0.3 });
  });

  it("NaN・Infinity・欠損は軸ごとに中央へ", () => {
    expect(clampMochitAttentionPoint({ x: Number.NaN, y: 0.9 })).toEqual({ x: 0.5, y: 0.9 });
    expect(clampMochitAttentionPoint({ x: Infinity, y: -Infinity })).toEqual({ x: 0.5, y: 0.5 });
    expect(clampMochitAttentionPoint({ x: "0.1" as unknown as number, y: 0.1 })).toEqual({ x: 0.5, y: 0.1 });
    expect(clampMochitAttentionPoint(undefined)).toEqual({ x: 0.5, y: 0.5 });
    expect(clampMochitAttentionPoint(null)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("中央定数を書き換えられない", () => {
    expect(Object.isFrozen(MOCHIT_ATTENTION_CENTER)).toBe(true);
    const p = clampMochitAttentionPoint(undefined);
    p.x = 0;
    expect(MOCHIT_ATTENTION_CENTER.x).toBe(0.5);
  });
});

describe("attentionPointToGazeOffset", () => {
  it("0 → -range / 0.5 → 0 / 1 → +range", () => {
    expect(attentionPointToGazeOffset({ x: 0, y: 0 }, range)).toEqual({ x: -7, y: -4 });
    expect(attentionPointToGazeOffset({ x: 0.5, y: 0.5 }, range)).toEqual({ x: 0, y: 0 });
    expect(attentionPointToGazeOffset({ x: 1, y: 1 }, range)).toEqual({ x: 7, y: 4 });
  });

  it("中間値は線形・小数2桁に丸める", () => {
    expect(attentionPointToGazeOffset({ x: 0.2, y: 0.3 }, range)).toEqual({ x: -4.2, y: -1.6 });
    expect(attentionPointToGazeOffset({ x: 0.15, y: 0.25 }, range)).toEqual({ x: -4.9, y: -2 });
  });

  it("範囲外・異常値は clamp 後に変換（-0 を出さない）", () => {
    expect(attentionPointToGazeOffset({ x: -3, y: 9 }, range)).toEqual({ x: -7, y: 4 });
    const center = attentionPointToGazeOffset({ x: Number.NaN, y: Number.NaN }, range);
    expect(center).toEqual({ x: 0, y: 0 });
    expect(Object.is(center.x, -0)).toBe(false);
  });
});

describe("resolveMochitGazeTarget", () => {
  it("random はランダム視線に任せる", () => {
    expect(resolveMochitGazeTarget("random", { x: 0, y: 0 })).toEqual({ kind: "random" });
  });

  it("user は point に関わらず中央", () => {
    expect(resolveMochitGazeTarget("user")).toEqual({ kind: "point", point: { x: 0.5, y: 0.5 } });
    expect(resolveMochitGazeTarget("user", { x: 0.1, y: 0.1 })).toEqual({ kind: "point", point: { x: 0.5, y: 0.5 } });
  });

  it.each(["content", "result"] as const)("%s は point があればそこ・無ければ中央（固定方向なし）", (attention) => {
    expect(resolveMochitGazeTarget(attention, { x: 0.2, y: 0.3 })).toEqual({ kind: "point", point: { x: 0.2, y: 0.3 } });
    expect(resolveMochitGazeTarget(attention)).toEqual({ kind: "point", point: { x: 0.5, y: 0.5 } });
    expect(resolveMochitGazeTarget(attention, { x: 1.4, y: Number.NaN })).toEqual({
      kind: "point",
      point: { x: 1, y: 0.5 },
    });
  });
});

describe("viewportTargetToAttentionPoint: viewport 上の対象 → モチット基準の正規化座標", () => {
  const origin = { x: 300, y: 600 };

  it("方向を保つ: 真上・右・左下", () => {
    expect(viewportTargetToAttentionPoint({ x: 300, y: 100 }, origin)).toEqual({ x: 0.5, y: 0 });
    expect(viewportTargetToAttentionPoint({ x: 800, y: 600 }, origin)).toEqual({ x: 1, y: 0.5 });
    const p = viewportTargetToAttentionPoint({ x: 0, y: 900 }, origin);
    expect(p.x).toBeCloseTo(0.5 - 0.5 * Math.SQRT1_2, 3);
    expect(p.y).toBeCloseTo(0.5 + 0.5 * Math.SQRT1_2, 3);
  });

  it("遠い対象は振幅が飽和し、近い対象は控えめ", () => {
    const far = viewportTargetToAttentionPoint({ x: 300, y: 600 - 1000 }, origin);
    const near = viewportTargetToAttentionPoint({ x: 300, y: 600 - 110 }, origin);
    expect(far.y).toBe(0);
    expect(near.y).toBeCloseTo(0.5 - 0.5 * (110 / MOCHIT_VIEWPORT_ATTENTION.saturatePx), 3);
  });

  it("モチットに重なる対象・異常値・target なしは正面", () => {
    expect(viewportTargetToAttentionPoint({ x: 310, y: 590 }, origin)).toEqual(MOCHIT_ATTENTION_CENTER);
    expect(viewportTargetToAttentionPoint({ x: Number.NaN, y: 0 }, origin)).toEqual(MOCHIT_ATTENTION_CENTER);
    expect(viewportTargetToAttentionPoint(undefined, origin)).toEqual(MOCHIT_ATTENTION_CENTER);
  });

  it("同じ対象でも、モチットの位置が変われば向きが変わる（固定方向ではない）", () => {
    const task = { x: 200, y: 300 };
    const fromBottomRight = viewportTargetToAttentionPoint(task, { x: 340, y: 760 });
    const fromTopLeft = viewportTargetToAttentionPoint(task, { x: 60, y: 60 });
    expect(fromBottomRight.x).toBeLessThan(0.5);
    expect(fromBottomRight.y).toBeLessThan(0.5);
    expect(fromTopLeft.x).toBeGreaterThan(0.5);
    expect(fromTopLeft.y).toBeGreaterThan(0.5);
  });

  it("結果は常に 0〜1・小数3桁", () => {
    const p = viewportTargetToAttentionPoint({ x: 123.456, y: 789.012 }, { x: 10.1, y: 5.5 });
    for (const v of [p.x, p.y]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(Math.round(v * 1000) / 1000).toBe(v);
    }
  });
});
