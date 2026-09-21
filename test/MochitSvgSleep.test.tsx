// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MochitSvg, { MOCHIT_SLEEP_IDLE } from "@/components/mochit/MochitSvg";
import * as idle from "@/components/mochit/mochitIdleAnimation";
import type { MochitRiveTriggerInput } from "@/components/mochit/mochitTypes";

// Macro Idle を決定的に（8秒ごと・stretch・1500ms）
vi.mock("@/components/mochit/mochitMacroIdle", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/components/mochit/mochitMacroIdle")>();
  return {
    ...mod,
    nextMacroIdleDelayMs: vi.fn(() => 8000),
    pickMacroIdleBehavior: vi.fn(() => "stretch"),
    macroIdleDurationMs: vi.fn(() => 1500),
  };
});
// ランダム視線は1秒ごとに (5,-3) へ。まばたきは十分先（呼び出し回数で作り直しを検出）
vi.mock("@/components/mochit/mochitIdleAnimation", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/components/mochit/mochitIdleAnimation")>();
  return {
    ...mod,
    nextBlinkGapMs: vi.fn(() => 600000),
    nextGazeHoldMs: vi.fn(() => 1000),
    nextGazeTarget: vi.fn(() => ({ x: 5, y: -3 })),
  };
});

type AnimationRecord = {
  el: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  cancel: ReturnType<typeof vi.fn>;
  rates: number[];
  setKeyframes: ReturnType<typeof vi.fn>;
};
let records: AnimationRecord[] = [];

beforeEach(() => {
  records = [];
  vi.useFakeTimers();
  vi.mocked(idle.nextBlinkGapMs).mockClear();
  vi.mocked(idle.nextGazeHoldMs).mockClear();
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    writable: true,
    value: function animate(this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      const rates: number[] = [];
      const setKeyframes = vi.fn();
      const anim = {
        playState: "running",
        cancel: vi.fn(() => (anim.playState = "idle")),
        updatePlaybackRate: (rate: number) => rates.push(rate),
        persist: vi.fn(),
        effect: { setKeyframes },
      };
      records.push({ el: this, keyframes, options, cancel: anim.cancel, rates, setKeyframes });
      return anim;
    },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete (Element.prototype as { animate?: unknown }).animate;
});

type SvgProps = Partial<Parameters<typeof MochitSvg>[0]>;
const base = {
  growthStage: 1,
  reducedMotion: false,
  compact: false,
  reactionProfile: "floating" as const,
  ariaLabel: "モチット",
};

function renderSvg(props: SvgProps = {}) {
  let fire: ((trigger: MochitRiveTriggerInput) => void) | null = null;
  const registerTriggerFirer = (f: typeof fire) => {
    fire = f;
  };
  let current = props;
  const view = render(<MochitSvg {...base} registerTriggerFirer={registerTriggerFirer} {...props} />);
  const svg = view.container.querySelector("svg")!;
  const q = (id: string) => svg.querySelector<SVGGraphicsElement>(`#${id}`)!;
  const rerender = (next: SvgProps) => {
    current = { ...current, ...next };
    view.rerender(<MochitSvg {...base} registerTriggerFirer={registerTriggerFirer} {...current} />);
  };
  return { svg, q, rerender, fire: (t: MochitRiveTriggerInput) => act(() => fire!(t)) };
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const on = (el: Element) => records.filter((r) => r.el === el);
const loops = () => records.filter((r) => r.options.iterations === Infinity);
const loopOn = (el: Element) => on(el).find((r) => r.options.iterations === Infinity)!;
const bodyAnims = (svg: Element) => on(svg).filter((r) => r.options.iterations !== Infinity);
const gazeMoves = (el: Element) => on(el).filter((r) => r.options.composite === undefined);
/** 呼吸グループへの沈み込み（add・持続） */
const sinks = (el: Element) => on(el).filter((r) => r.options.composite === "add" && r.options.fill === "forwards");
const SLEEPY = { emotion: "sleepy" as const, sleeping: true };

describe("MochitSvg: Sleep の見た目", () => {
  it("呼吸をゆっくり・ゆれ/アンテナを弱く（ループは作り直さない）", () => {
    const { q, rerender } = renderSvg();
    const loopCount = loops().length;
    rerender(SLEEPY);
    expect(loops()).toHaveLength(loopCount);
    const breathe = loopOn(q("Anim_Breathe"));
    const sway = loopOn(q("Anim_Sway"));
    const antenna = loopOn(q("Anim_Antenna"));
    expect(breathe.rates.at(-1)).toBe(MOCHIT_SLEEP_IDLE.breatheRate);
    expect(breathe.rates.at(-1)).toBeLessThan(1);
    expect(sway.rates.at(-1)).toBeLessThan(1);
    expect(antenna.rates.at(-1)).toBeLessThan(1);
    // ゆれ・アンテナの振幅は keyframes の差し替えで弱める
    const swayDeg = (kfs: Keyframe[]) => Number(/rotate\((-?[\d.]+)deg\)/.exec(String(kfs[1].transform))![1]);
    expect(swayDeg(sway.setKeyframes.mock.calls.at(-1)![0])).toBeLessThan(swayDeg(sway.keyframes));
    expect(swayDeg(antenna.setKeyframes.mock.calls.at(-1)![0])).toBeLessThan(swayDeg(antenna.keyframes));
    for (const r of loops()) expect(r.cancel).not.toHaveBeenCalled();
    expect(idle.nextBlinkGapMs).toHaveBeenCalledTimes(1);
  });

  it("足元支点で1〜2%沈む（add の持続アニメ）", () => {
    const { q, rerender } = renderSvg();
    rerender(SLEEPY);
    const [sink] = sinks(q("Anim_Breathe"));
    expect(sink).toBeDefined();
    expect(sink.options.duration).toBe(MOCHIT_SLEEP_IDLE.sinkInMs);
    const sy = Number(/scale\([\d.]+, ([\d.]+)\)/.exec(String(sink.keyframes[1].transform))![1]);
    expect(1 - sy).toBeGreaterThanOrEqual(0.01);
    expect(1 - sy).toBeLessThanOrEqual(0.02);
  });

  it("emotion=sleepy の半目（まぶた）を使う", () => {
    const { q, rerender } = renderSvg();
    rerender(SLEEPY);
    expect(q("Eyelid_L").style.transform).toContain("scale(1, 0.3)");
  });

  it("SVG を再生成しない", () => {
    const { svg, rerender } = renderSvg();
    const root = svg.firstElementChild;
    rerender(SLEEPY);
    rerender({ emotion: "neutral", sleeping: false });
    expect(svg.firstElementChild).toBe(root);
  });
});

describe("MochitSvg: Sleep と Macro Idle", () => {
  it("Sleep に入ると再生中の Macro Idle を止め、眠っている間は発火しない", () => {
    const { svg, rerender } = renderSvg();
    advance(8000);
    expect(svg.dataset.macroIdle).toBe("stretch");
    rerender(SLEEPY);
    expect(svg.dataset.macroIdle).toBeUndefined();
    const count = bodyAnims(svg).length;
    advance(120_000);
    expect(bodyAnims(svg).length).toBe(count);
    expect(svg.dataset.macroIdle).toBeUndefined();
  });

  it("起きた後は即発火せず、新しく8秒以上待ってから再開", () => {
    const { svg, rerender } = renderSvg(SLEEPY);
    advance(60_000);
    rerender({ emotion: "neutral", sleeping: false });
    advance(7_999);
    expect(svg.dataset.macroIdle).toBeUndefined();
    advance(1);
    expect(svg.dataset.macroIdle).toBe("stretch");
  });
});

describe("MochitSvg: Sleep と視線", () => {
  it("ランダム視線を止めて中央で休ませ、起きると再開する", () => {
    const { q, rerender } = renderSvg();
    advance(1000);
    const pupil = q("Pupil_L");
    expect(pupil.style.transform).toBe("translate(5px, -3px)");
    rerender(SLEEPY);
    expect(pupil.style.transform).toBe("translate(0px, 0px)");
    const moves = gazeMoves(pupil).length;
    advance(30_000);
    expect(gazeMoves(pupil).length).toBe(moves);
    rerender({ emotion: "neutral", sleeping: false });
    advance(1000);
    expect(pupil.style.transform).toBe("translate(5px, -3px)");
  });

  it("Semantic Attention（content）は Sleep より優先して見続ける", () => {
    const { q, rerender } = renderSvg({ attention: "content", attentionPoint: { x: 1, y: 0.5 } });
    const before = q("Pupil_L").style.transform;
    rerender({ ...SLEEPY, attention: "content", attentionPoint: { x: 1, y: 0.5 } });
    expect(q("Pupil_L").style.transform).toBe(before);
  });
});

describe("MochitSvg: 起床", () => {
  it("起きると沈み込みを戻し、呼吸/ゆれ/アンテナを通常速度へ", () => {
    const { q, rerender } = renderSvg(SLEEPY);
    const breatheEl = q("Anim_Breathe");
    const [sink] = sinks(breatheEl);
    rerender({ emotion: "neutral", sleeping: false });
    expect(sink.cancel).toHaveBeenCalled();
    const back = on(breatheEl).filter((r) => r.options.composite === "add" && r.options.fill === "none");
    expect(back).toHaveLength(1);
    expect(back[0].options.duration).toBe(MOCHIT_SLEEP_IDLE.sinkOutMs);
    expect(loopOn(breatheEl).rates.at(-1)).toBe(1);
    expect(q("Eyelid_L").style.transform).toContain("scale(1, 0.0001)");
  });

  it("wakeUp Reaction は外側<svg>を軽く跳ねさせ、アンテナを add で反応させる", () => {
    const { svg, q, rerender, fire } = renderSvg(SLEEPY);
    rerender({ emotion: "neutral", sleeping: false });
    fire("triggerWakeUp");
    const hop = bodyAnims(svg).at(-1)!;
    expect(hop.options.duration).toBe(700);
    expect(on(q("Anim_Antenna")).some((r) => r.options.composite === "add" && r.options.duration === 700)).toBe(true);
  });

  it("sleepy 中に学習 Reaction が来ても、同じ更新で目を開いてから遅延なく再生する", () => {
    const { svg, q, rerender, fire } = renderSvg(SLEEPY);
    // FloatingMochit と同じ順: awake へ戻す描画 → Reaction 発火（待ち時間なし）
    rerender({ emotion: "neutral", sleeping: false });
    fire("triggerCorrect");
    expect(q("Eyelid_L").style.transform).toContain("scale(1, 0.0001)");
    const correct = bodyAnims(svg).at(-1)!;
    expect(correct.options.duration).toBe(800);
    // wakeUp（700ms）は挟まない
    expect(bodyAnims(svg).some((r) => r.options.duration === 700)).toBe(false);
  });
});

describe("MochitSvg: Sleep × reduced-motion", () => {
  it("半目の静的表情だけを残し、沈み込み・速度変更はしない", () => {
    const { q, rerender } = renderSvg({ reducedMotion: true });
    rerender({ ...SLEEPY, reducedMotion: true });
    expect(q("Eyelid_L").style.opacity).toBe("1");
    expect(q("Eyelid_L").style.transform).toContain("scale(1, 0.3)");
    expect(sinks(q("Anim_Breathe"))).toHaveLength(0);
    expect(loops()).toHaveLength(0);
  });

  it("起きたら即 awake の表情（補間なし）・wakeUp の跳ねは出さない", () => {
    const { svg, q, rerender, fire } = renderSvg({ ...SLEEPY, reducedMotion: true });
    const before = on(q("Eyelid_L")).length;
    rerender({ emotion: "neutral", sleeping: false, reducedMotion: true });
    expect(on(q("Eyelid_L")).length).toBe(before);
    expect(q("Eyelid_L").style.opacity).toBe("");
    fire("triggerWakeUp");
    expect(bodyAnims(svg)).toHaveLength(0);
  });
});
