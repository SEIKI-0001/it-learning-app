import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMacroIdleSpec,
  DEFAULT_MACRO_IDLE_TUNING,
  FLOATING_LOOK_AROUND_GAZE_X,
  FLOATING_MACRO_IDLE_TUNING,
  getMacroIdleTuning,
  macroIdleDurationMs,
  nextMacroIdleDelayMs,
  pickMacroIdleBehavior,
  type MacroIdleSpec,
} from "@/components/mochit/mochitMacroIdle";
import { createMacroIdleController } from "@/components/mochit/mochitMacroIdleController";
import type { ReactionTrack } from "@/components/mochit/mochitReactionAnimation";

// Step7: floating（84px）だけ Macro Idle の頻度・振幅を知覚できる水準へ上げる。

const fixed = (v: number) => () => v;
const track = (spec: MacroIdleSpec, target: ReactionTrack["target"]) => spec.tracks.find((t) => t.target === target)!;
const num = (re: RegExp, s: unknown) => Number(re.exec(String(s))?.[1] ?? 0);
const rotOf = (t: unknown) => num(/rotate\((-?[\d.]+)deg\)/, t);
const syOf = (t: unknown) => num(/scale\([-\d.]+, ([-\d.]+)\)/, t);
const gxOf = (t: unknown) => num(/translate\((-?[\d.]+)px/, t);
const maxAbs = (keys: Keyframe[], f: (t: unknown) => number) => Math.max(...keys.map((k) => Math.abs(f(k.transform))));
/** 恒等から最初に動き出すキーフレームの直前 offset（＝動き出し時刻） */
function onset(keys: Keyframe[], f: (t: unknown) => number): number {
  for (let i = 1; i < keys.length; i++) if (f(keys[i].transform) !== 0) return keys[i - 1].offset as number;
  return 1;
}
/** 最初に最大振幅へ達する offset */
function peakAt(keys: Keyframe[], f: (t: unknown) => number): number {
  const m = maxAbs(keys, f);
  return keys.find((k) => Math.abs(f(k.transform)) === m)!.offset as number;
}

describe("floating の頻度", () => {
  it("重みは normal30 / lookAround35 / curious22 / stretch13（合計1）", () => {
    const w = FLOATING_MACRO_IDLE_TUNING.weights;
    expect(w).toEqual({ normal: 0.3, lookAround: 0.35, curious: 0.22, stretch: 0.13 });
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("待ち時間は既定より短い（7〜15秒）", () => {
    expect(nextMacroIdleDelayMs(fixed(0), FLOATING_MACRO_IDLE_TUNING)).toBe(7000);
    expect(nextMacroIdleDelayMs(fixed(0.999999), FLOATING_MACRO_IDLE_TUNING)).toBe(15000);
    expect(FLOATING_MACRO_IDLE_TUNING.maxDelayMs).toBeLessThan(DEFAULT_MACRO_IDLE_TUNING.maxDelayMs);
  });

  it("既定（full）の値は変えない", () => {
    expect(getMacroIdleTuning(false)).toBe(DEFAULT_MACRO_IDLE_TUNING);
    expect(DEFAULT_MACRO_IDLE_TUNING.weights).toEqual({ normal: 0.55, lookAround: 0.25, curious: 0.12, stretch: 0.08 });
    expect(pickMacroIdleBehavior(null, fixed(0.5))).toBe("normal");
    // floating では同じ乱数でも可視 Behavior が選ばれる
    expect(pickMacroIdleBehavior(null, fixed(0.5), FLOATING_MACRO_IDLE_TUNING.weights)).toBe("lookAround");
  });

  it("15〜20秒眺めれば多くの場合1回は可視 Behavior が起きる（シミュレーション）", () => {
    let s = 12345;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const firstVisible = (tuning: typeof FLOATING_MACRO_IDLE_TUNING) => {
      let t = 0;
      for (;;) {
        t += nextMacroIdleDelayMs(rng, tuning);
        if (pickMacroIdleBehavior(null, rng, tuning.weights) !== "normal") return t;
      }
    };
    const runs = Array.from({ length: 4000 }, () => firstVisible(FLOATING_MACRO_IDLE_TUNING));
    const within20 = runs.filter((t) => t <= 20000).length / runs.length;
    expect(within20).toBeGreaterThan(0.7);
    // 常時動いているわけではない（最短でも7秒は何もしない）
    expect(Math.min(...runs)).toBeGreaterThanOrEqual(7000);
  });
});

describe("floating の振幅（既定より大きい）", () => {
  it("lookAround: 視線 ±18・体の向き替えと遅れたアンテナ", () => {
    const d = buildMacroIdleSpec("lookAround", { durationMs: 1600 });
    const f = buildMacroIdleSpec("lookAround", { durationMs: 1600, floating: true });
    expect(maxAbs(track(f, "gaze").keyframes, gxOf)).toBe(FLOATING_LOOK_AROUND_GAZE_X);
    expect(maxAbs(track(f, "body").keyframes, rotOf)).toBeGreaterThan(maxAbs(track(d, "body").keyframes, rotOf) * 3);
    expect(maxAbs(track(f, "antenna").keyframes, rotOf)).toBeGreaterThan(maxAbs(track(d, "antenna").keyframes, rotOf));
    // 目 → 体 → アンテナ の順に最初の向きへ達する
    const g = peakAt(track(f, "gaze").keyframes, gxOf);
    const b = peakAt(track(f, "body").keyframes, rotOf);
    const a = peakAt(track(f, "antenna").keyframes, rotOf);
    expect(g).toBeLessThan(b);
    expect(b).toBeLessThan(a);
  });

  it("curious: 目→体→アンテナの時間差がはっきりある", () => {
    for (const r of [0.1, 0.9]) {
      const f = buildMacroIdleSpec("curious", { durationMs: 1500, floating: true, rng: fixed(r) });
      const gaze = track(f, "gaze").keyframes;
      const body = track(f, "body").keyframes;
      const antenna = track(f, "antenna").keyframes;
      const gazeArrive = peakAt(gaze, (t) => Math.abs(gxOf(t)) + Math.abs(num(/px, (-?[\d.]+)px/, t)));
      expect(onset(body, rotOf)).toBeGreaterThanOrEqual(0.08);
      expect(onset(antenna, rotOf)).toBeGreaterThan(onset(body, rotOf));
      expect(gazeArrive).toBeLessThanOrEqual(peakAt(body, rotOf));
      expect(peakAt(body, rotOf)).toBeLessThan(peakAt(antenna, rotOf));
      expect(maxAbs(body, rotOf)).toBeGreaterThanOrEqual(2.5);
    }
  });

  it("stretch: 縦5%以上伸び、腕も大きく開く（84pxで読める）", () => {
    const d = buildMacroIdleSpec("stretch", { durationMs: 1500 });
    const f = buildMacroIdleSpec("stretch", { durationMs: 1500, floating: true });
    const peak = (s: MacroIdleSpec) => Math.max(...track(s, "body").keyframes.map((k) => syOf(k.transform)));
    expect(peak(f)).toBeGreaterThanOrEqual(1.05);
    expect(peak(d)).toBeLessThan(1.04);
    expect(maxAbs(track(f, "armL").keyframes, rotOf)).toBeGreaterThan(maxAbs(track(d, "armL").keyframes, rotOf));
  });

  it("curious は目→体→アンテナを見せるため少し長い", () => {
    expect(macroIdleDurationMs("curious", fixed(0), FLOATING_MACRO_IDLE_TUNING)).toBeGreaterThan(
      macroIdleDurationMs("curious", fixed(0)),
    );
  });
});

describe("createMacroIdleController: floating 条件", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("floating では floating の待ち時間・重み・継続時間を使う", () => {
    const plays: Array<{ behavior: string; durationMs: number }> = [];
    const controller = createMacroIdleController({
      play: (behavior, durationMs) => {
        plays.push({ behavior, durationMs });
        return { stop: () => {} };
      },
      rng: fixed(0.5),
    });
    controller.update({ active: true, reducedMotion: false, compact: false, attention: "random", floating: true });
    // delay = 7000 + 8000*0.5 = 11000 → pick(0.5)=lookAround（既定の重みなら normal）
    vi.advanceTimersByTime(10999);
    expect(plays).toHaveLength(0);
    vi.advanceTimersByTime(1);
    expect(plays).toEqual([{ behavior: "lookAround", durationMs: 1650 }]);
    controller.dispose();
  });

  it("floating 指定がなければ従来どおり（delay 14000・normal）", () => {
    const plays: string[] = [];
    const controller = createMacroIdleController({
      play: (behavior) => {
        plays.push(behavior);
        return { stop: () => {} };
      },
      rng: fixed(0.5),
    });
    controller.update({ active: true, reducedMotion: false, compact: false, attention: "random" });
    vi.advanceTimersByTime(14000);
    expect(plays).toHaveLength(0);
    expect(controller.getState().scheduled).toBe(true);
    controller.dispose();
  });
});
