import { describe, expect, it } from "vitest";
import {
  buildMacroIdleSpec,
  canPlayMacroIdle,
  isMacroIdleAutoEnabled,
  LOOK_AROUND_GAZE_X,
  MACRO_IDLE_DURATION_RANGE_MS,
  MACRO_IDLE_MAX_DELAY_MS,
  MACRO_IDLE_MIN_DELAY_MS,
  MACRO_IDLE_WEIGHTS,
  macroIdleDurationMs,
  macroIdleMovesGaze,
  macroIdleWeights,
  MOCHIT_MACRO_IDLE_BEHAVIORS,
  nextMacroIdleDelayMs,
  pickMacroIdleBehavior,
  type MacroIdleConditions,
  type MochitMacroIdleBehavior,
  type MochitMacroIdleChoice,
} from "@/components/mochit/mochitMacroIdle";

const fixed = (v: number) => () => v;
// 決定的な疑似乱数（LCG）
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("nextMacroIdleDelayMs", () => {
  it("8〜20秒の範囲", () => {
    expect(nextMacroIdleDelayMs(fixed(0))).toBe(MACRO_IDLE_MIN_DELAY_MS);
    expect(nextMacroIdleDelayMs(fixed(0.999999))).toBe(MACRO_IDLE_MAX_DELAY_MS);
    expect(MACRO_IDLE_MIN_DELAY_MS).toBe(8000);
    expect(MACRO_IDLE_MAX_DELAY_MS).toBe(20000);
    const rng = seeded(1);
    for (let i = 0; i < 2000; i++) {
      const d = nextMacroIdleDelayMs(rng);
      expect(d).toBeGreaterThanOrEqual(8000);
      expect(d).toBeLessThanOrEqual(20000);
    }
  });
});

describe("pickMacroIdleBehavior", () => {
  it("初期確率は normal55 / lookAround25 / curious12 / stretch8", () => {
    expect(MACRO_IDLE_WEIGHTS).toEqual({ normal: 0.55, lookAround: 0.25, curious: 0.12, stretch: 0.08 });
    const w = macroIdleWeights(null);
    expect(w.normal).toBeCloseTo(0.55);
    expect(w.stretch).toBeCloseTo(0.08);
  });

  it("RNG を固定すると選択が決まる", () => {
    expect(pickMacroIdleBehavior(null, fixed(0))).toBe("normal");
    expect(pickMacroIdleBehavior(null, fixed(0.549))).toBe("normal");
    expect(pickMacroIdleBehavior(null, fixed(0.55))).toBe("lookAround");
    expect(pickMacroIdleBehavior(null, fixed(0.79))).toBe("lookAround");
    expect(pickMacroIdleBehavior(null, fixed(0.8))).toBe("curious");
    expect(pickMacroIdleBehavior(null, fixed(0.919))).toBe("curious");
    expect(pickMacroIdleBehavior(null, fixed(0.93))).toBe("stretch");
    expect(pickMacroIdleBehavior(null, fixed(0.9999999))).toBe("stretch");
  });

  it("直前と同じ特殊 Behavior は選ばれにくい（0 にはしない）", () => {
    for (const prev of MOCHIT_MACRO_IDLE_BEHAVIORS) {
      const w = macroIdleWeights(prev);
      const total = Object.values(w).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1);
      expect(w[prev]).toBeLessThan(macroIdleWeights(null)[prev] / 3);
      expect(w[prev]).toBeGreaterThan(0);
    }
    // 固定RNGでも、直前が lookAround なら同じ値で別の結果になる
    expect(pickMacroIdleBehavior(null, fixed(0.6))).toBe("lookAround");
    expect(pickMacroIdleBehavior("lookAround", fixed(0.6))).not.toBe("lookAround");
  });

  it("長期的に同じ特殊 Behavior の連続が少なく、全体比率はおおむね初期値付近", () => {
    const rng = seeded(42);
    let prev: MochitMacroIdleBehavior | null = null;
    let repeats = 0;
    let specials = 0;
    const counts: Record<MochitMacroIdleChoice, number> = { normal: 0, lookAround: 0, curious: 0, stretch: 0 };
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const c = pickMacroIdleBehavior(prev, rng);
      counts[c]++;
      if (c === "normal") continue;
      specials++;
      if (c === prev) repeats++;
      prev = c;
    }
    // 無補正なら lookAround 連続だけで (0.25/0.45)^2 ≈ 31% 程度になる
    expect(repeats / specials).toBeLessThan(0.15);
    expect(counts.normal / N).toBeGreaterThan(0.5);
    expect(counts.normal / N).toBeLessThan(0.65);
    expect(counts.lookAround).toBeGreaterThan(counts.curious);
    expect(counts.curious).toBeGreaterThan(counts.stretch);
  });
});

describe("macroIdleDurationMs", () => {
  it.each([
    ["lookAround", 1200, 1800],
    ["curious", 900, 1400],
    ["stretch", 1200, 1800],
  ] as const)("%s は %i〜%ims", (behavior, min, max) => {
    expect(MACRO_IDLE_DURATION_RANGE_MS[behavior]).toEqual([min, max]);
    expect(macroIdleDurationMs(behavior, fixed(0))).toBe(min);
    expect(macroIdleDurationMs(behavior, fixed(0.999999))).toBe(max);
  });
});

const IDENTITY_BODY = "translateY(0%) rotate(0deg) scale(1, 1)";
const IDENTITY_GAZE = "translate(0px, 0px)";
function isIdentity(target: string, transform: string | undefined) {
  if (target === "body") return transform === IDENTITY_BODY;
  if (target === "gaze") return transform === IDENTITY_GAZE;
  return /rotate\(0deg\)/.test(transform ?? "");
}
function scaleOf(transform: string) {
  const m = /scale\(([-\d.]+), ([-\d.]+)\)/.exec(transform)!;
  return { sx: Number(m[1]), sy: Number(m[2]) };
}

describe("buildMacroIdleSpec: 基底状態へ戻る契約", () => {
  const rng = seeded(7);
  for (const floating of [false, true])
  for (const behavior of MOCHIT_MACRO_IDLE_BEHAVIORS) {
    it(`${behavior}${floating ? "（floating）" : ""}: 全トラックが恒等で始まり恒等で終わり、Idle 要素は add`, () => {
      for (let i = 0; i < 20; i++) {
        const spec = buildMacroIdleSpec(behavior, {
          durationMs: macroIdleDurationMs(behavior, rng),
          gazeBase: { x: 3, y: -2 },
          floating,
          rng,
        });
        expect(spec.totalMs).toBeGreaterThanOrEqual(MACRO_IDLE_DURATION_RANGE_MS[behavior][0]);
        for (const track of spec.tracks) {
          const first = track.keyframes[0];
          const last = track.keyframes.at(-1)!;
          expect(first.offset).toBe(0);
          expect(last.offset).toBe(1);
          expect(isIdentity(track.target, first.transform as string)).toBe(true);
          expect(isIdentity(track.target, last.transform as string)).toBe(true);
          // 口・まぶた・Core には触れない（emotion を壊さない）
          expect(["body", "armL", "armR", "gaze", "antenna"]).toContain(track.target);
          if (track.target === "gaze" || track.target === "antenna") expect(track.composite).toBe("add");
          else expect(track.composite).toBeUndefined();
        }
      }
    });
  }
});

describe("buildMacroIdleSpec: 各モーション", () => {
  it("lookAround: 基底から左寄り→右寄り（絶対位置 ±9 への差分）→元", () => {
    const spec = buildMacroIdleSpec("lookAround", { durationMs: 1500, gazeBase: { x: 3, y: -2 } });
    const g = spec.tracks.find((t) => t.target === "gaze")!.keyframes.map((k) => k.transform);
    expect(g).toContain(`translate(${-LOOK_AROUND_GAZE_X - 3}px, 0px)`);
    expect(g).toContain(`translate(${LOOK_AROUND_GAZE_X - 3}px, 0px)`);
    const leftAt = g.indexOf("translate(-12px, 0px)");
    const rightAt = g.indexOf("translate(6px, 0px)");
    expect(leftAt).toBeGreaterThan(0);
    expect(rightAt).toBeGreaterThan(leftAt);
    // 左で少し保持する
    expect(g[leftAt + 1]).toBe(g[leftAt]);
    // 身体はほぼ動かさない（1度未満）
    const rot = spec.tracks
      .find((t) => t.target === "body")!
      .keyframes.map((k) => Number(/rotate\(([-\d.]+)deg\)/.exec(k.transform as string)![1]));
    expect(Math.max(...rot.map(Math.abs))).toBeLessThan(1);
    expect(macroIdleMovesGaze(spec)).toBe(true);
  });

  it("curious: 視線は上か横・本体はごく小さく傾き・アンテナが反応", () => {
    for (const r of [0.1, 0.9]) {
      const spec = buildMacroIdleSpec("curious", { durationMs: 1100, rng: fixed(r) });
      const targets = spec.tracks.map((t) => t.target).sort();
      expect(targets).toEqual(["antenna", "body", "gaze"]);
      const rot = spec.tracks
        .find((t) => t.target === "body")!
        .keyframes.map((k) => Math.abs(Number(/rotate\(([-\d.]+)deg\)/.exec(k.transform as string)![1])));
      expect(Math.max(...rot)).toBeGreaterThan(0);
      expect(Math.max(...rot)).toBeLessThanOrEqual(2);
    }
  });

  it("stretch: 少し沈んでから縦に2〜4%伸び、腕をわずかに動かす", () => {
    const spec = buildMacroIdleSpec("stretch", { durationMs: 1500 });
    const body = spec.tracks.find((t) => t.target === "body")!.keyframes.map((k) => scaleOf(k.transform as string));
    const sy = body.map((b) => b.sy);
    const peak = Math.max(...sy);
    expect(peak).toBeGreaterThanOrEqual(1.02);
    expect(peak).toBeLessThanOrEqual(1.04);
    // 伸びる前に沈む
    expect(sy.findIndex((v) => v < 1)).toBeLessThan(sy.indexOf(peak));
    // 横幅は大きく崩さない
    for (const b of body) expect(Math.abs(b.sx - 1)).toBeLessThanOrEqual(0.02);
    const arms = spec.tracks.filter((t) => t.target === "armL" || t.target === "armR");
    expect(arms).toHaveLength(2);
    for (const a of arms) {
      const degs = a.keyframes.map((k) => Math.abs(Number(/rotate\(([-\d.]+)deg\)/.exec(k.transform as string)![1])));
      expect(Math.max(...degs)).toBeGreaterThan(0);
      expect(Math.max(...degs)).toBeLessThanOrEqual(12);
    }
    expect(macroIdleMovesGaze(spec)).toBe(false);
  });
});

describe("自動発火の条件", () => {
  const ok: MacroIdleConditions = {
    active: true,
    reducedMotion: false,
    compact: false,
    reacting: false,
    attention: "random",
  };
  it("active ∧ ¬reducedMotion ∧ ¬compact ∧ ¬Reaction ∧ random のときだけ", () => {
    expect(isMacroIdleAutoEnabled(ok)).toBe(true);
    expect(isMacroIdleAutoEnabled({ ...ok, active: false })).toBe(false);
    expect(isMacroIdleAutoEnabled({ ...ok, reducedMotion: true })).toBe(false);
    expect(isMacroIdleAutoEnabled({ ...ok, compact: true })).toBe(false);
    expect(isMacroIdleAutoEnabled({ ...ok, reacting: true })).toBe(false);
    for (const attention of ["user", "content", "result"] as const) {
      expect(isMacroIdleAutoEnabled({ ...ok, attention })).toBe(false);
      // 明示再生は attention を問わない
      expect(canPlayMacroIdle({ ...ok, attention })).toBe(true);
    }
  });
});
