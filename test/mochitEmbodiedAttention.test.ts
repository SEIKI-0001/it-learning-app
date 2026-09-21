import { describe, expect, it } from "vitest";
import {
  attentionAntennaKeyframes,
  attentionAntennaTransform,
  attentionBodyTransform,
  attentionPoseForGaze,
  EMBODIED_ANTENNA_OVERSHOOT,
  interpolateAttentionPose,
  isNeutralAttentionPose,
  NEUTRAL_ATTENTION_POSE,
} from "@/components/mochit/mochitEmbodiedAttention";
import { getIdleProfile } from "@/components/mochit/mochitIdleAnimation";

const floating = getIdleProfile(false, true);
const range = floating.gaze!;
const tuning = floating.embody!;

describe("getIdleProfile: floating プロファイル", () => {
  it("floating だけが身体連動を持ち、compact は floating 指定より優先", () => {
    expect(getIdleProfile(false).embody).toBeNull();
    expect(getIdleProfile(true).embody).toBeNull();
    expect(getIdleProfile(true, true)).toBe(getIdleProfile(true));
    expect(floating.embody).not.toBeNull();
  });

  it("視線レンジは full の2〜3倍（瞳のマスク内に収まる上限以内）", () => {
    const full = getIdleProfile(false).gaze!;
    expect(range.rangeX / full.rangeX).toBeGreaterThanOrEqual(2);
    expect(range.rangeX / full.rangeX).toBeLessThanOrEqual(3);
    expect(range.rangeY / full.rangeY).toBeGreaterThanOrEqual(2);
    expect(range.rangeY / full.rangeY).toBeLessThanOrEqual(3);
    // 白目 60×105（master px）。ハイライトが白目の縁で大きく欠けない範囲
    expect(range.rangeX).toBeLessThanOrEqual(18);
    expect(range.rangeY).toBeLessThanOrEqual(14);
  });

  it("呼吸・ゆれ・まばたきは full と同じ（見た目の基底は変えない）", () => {
    const full = getIdleProfile(false);
    expect(floating.breathe).toEqual(full.breathe);
    expect(floating.sway).toEqual(full.sway);
    expect(floating.antenna).toEqual(full.antenna);
    expect(floating.blink).toEqual(full.blink);
  });

  it.each(["attend", "release"] as const)("%s: 目→体（80〜120ms後）→アンテナ（体の100〜180ms後）", (phase) => {
    const t = tuning[phase];
    expect(t.bodyDelayMs).toBeGreaterThanOrEqual(80);
    expect(t.bodyDelayMs).toBeLessThanOrEqual(120);
    expect(t.antennaDelayMs - t.bodyDelayMs).toBeGreaterThanOrEqual(100);
    expect(t.antennaDelayMs - t.bodyDelayMs).toBeLessThanOrEqual(180);
  });

  it("振幅: 傾き2〜3°・アンテナは体より大きい", () => {
    expect(tuning.tiltDeg).toBeGreaterThanOrEqual(2);
    expect(tuning.tiltDeg).toBeLessThanOrEqual(3);
    expect(tuning.antennaDeg).toBeGreaterThan(tuning.tiltDeg);
  });
});

describe("attentionPoseForGaze", () => {
  it("正面（0,0）は恒等姿勢", () => {
    const pose = attentionPoseForGaze({ x: 0, y: 0 }, range, tuning);
    expect(isNeutralAttentionPose(pose)).toBe(true);
    expect(pose).toEqual(NEUTRAL_ATTENTION_POSE);
  });

  it("右を見れば右へ傾き・右へ寄る。左はその逆", () => {
    const right = attentionPoseForGaze({ x: range.rangeX, y: 0 }, range, tuning);
    const left = attentionPoseForGaze({ x: -range.rangeX, y: 0 }, range, tuning);
    expect(right.tilt).toBe(tuning.tiltDeg);
    expect(right.leanX).toBe(tuning.leanX);
    expect(right.antenna).toBe(tuning.antennaDeg);
    expect(left.tilt).toBe(-tuning.tiltDeg);
    expect(left.leanX).toBe(-tuning.leanX);
    expect(left.antenna).toBe(-tuning.antennaDeg);
  });

  it("下を覗くと沈んで縮み、見上げると伸び上がる", () => {
    const down = attentionPoseForGaze({ x: 0, y: range.rangeY }, range, tuning);
    const up = attentionPoseForGaze({ x: 0, y: -range.rangeY }, range, tuning);
    expect(down.leanY).toBeGreaterThan(0);
    expect(down.sy).toBeLessThan(1);
    expect(up.leanY).toBeLessThan(0);
    expect(up.sy).toBeGreaterThan(1);
    expect(down.tilt).toBe(0);
  });

  it("小さな横成分は応答カーブで持ち上げる（ほぼ真下でも左右が読める）", () => {
    const pose = attentionPoseForGaze({ x: -0.2 * range.rangeX, y: range.rangeY }, range, tuning);
    expect(pose.tilt).toBeLessThan(-0.2 * tuning.tiltDeg);
    expect(pose.tilt).toBeGreaterThan(-tuning.tiltDeg);
  });

  it("レンジ外・異常値は安全側に丸める", () => {
    const over = attentionPoseForGaze({ x: range.rangeX * 5, y: -range.rangeY * 5 }, range, tuning);
    expect(over.tilt).toBe(tuning.tiltDeg);
    expect(over.leanY).toBe(-tuning.leanY);
    const bad = attentionPoseForGaze({ x: Number.NaN, y: Number.POSITIVE_INFINITY }, range, tuning);
    expect(Number.isFinite(bad.tilt)).toBe(true);
    expect(bad.tilt).toBe(0);
  });
});

describe("transform / keyframes", () => {
  it("恒等姿勢の transform は恒等変換", () => {
    expect(attentionBodyTransform(NEUTRAL_ATTENTION_POSE)).toBe(
      "translate(0px, 0px) translate(616px, 1012px) rotate(0deg) translate(-616px, -1012px) translate(616px, 1012px) scale(1, 1) translate(-616px, -1012px)",
    );
    expect(attentionAntennaTransform(0)).toBe("translate(680px, 360px) rotate(0deg) translate(-680px, -360px)");
  });

  it("アンテナは変化量の一部だけ行き過ぎてから目標角に落ち着く", () => {
    const k = attentionAntennaKeyframes(0, 5);
    expect(k[0].transform).toBe(attentionAntennaTransform(0));
    expect(k[1].transform).toBe(attentionAntennaTransform(5 + 5 * EMBODIED_ANTENNA_OVERSHOOT));
    expect(k.at(-1)!.transform).toBe(attentionAntennaTransform(5));
    // 戻り（5→0）は逆向きに行き過ぎる
    expect(attentionAntennaKeyframes(5, 0)[1].transform).toBe(attentionAntennaTransform(-5 * EMBODIED_ANTENNA_OVERSHOOT));
  });

  it("interpolateAttentionPose は端点を返し、t は 0〜1 に丸める", () => {
    const b = { tilt: 3, leanX: 18, leanY: -6, sy: 1.01, antenna: 5 };
    expect(interpolateAttentionPose(NEUTRAL_ATTENTION_POSE, b, 0)).toEqual(NEUTRAL_ATTENTION_POSE);
    expect(interpolateAttentionPose(NEUTRAL_ATTENTION_POSE, b, 1)).toEqual(b);
    expect(interpolateAttentionPose(NEUTRAL_ATTENTION_POSE, b, 2)).toEqual(b);
    expect(interpolateAttentionPose(NEUTRAL_ATTENTION_POSE, b, 0.5).tilt).toBe(1.5);
  });
});
