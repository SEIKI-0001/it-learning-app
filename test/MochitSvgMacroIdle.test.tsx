// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MochitSvg from "@/components/mochit/MochitSvg";
import * as idle from "@/components/mochit/mochitIdleAnimation";
import * as macro from "@/components/mochit/mochitMacroIdle";
import type { MochitRiveTriggerInput } from "@/components/mochit/mochitTypes";

// 発火間隔・抽選・継続時間を決定的にする（8秒ごと・1500ms）
vi.mock("@/components/mochit/mochitMacroIdle", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/components/mochit/mochitMacroIdle")>();
  return {
    ...mod,
    nextMacroIdleDelayMs: vi.fn(() => 8000),
    pickMacroIdleBehavior: vi.fn(() => "stretch"),
    macroIdleDurationMs: vi.fn(() => 1500),
  };
});
// ランダム視線を決定的にする（1秒ごとに (5,-3) へ）。まばたきは十分先に置き、
// nextBlinkGapMs の呼び出し回数で blink scheduler の作り直しを検出する。
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
};
let records: AnimationRecord[] = [];
let intersect: ((visible: boolean) => void) | null = null;
let hidden = false;

beforeEach(() => {
  records = [];
  hidden = false;
  intersect = null;
  vi.useFakeTimers();
  vi.mocked(macro.pickMacroIdleBehavior).mockReturnValue("stretch");
  vi.mocked(macro.pickMacroIdleBehavior).mockClear();
  vi.mocked(idle.nextBlinkGapMs).mockClear();
  vi.mocked(idle.nextGazeTarget).mockReturnValue({ x: 5, y: -3 });
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    writable: true,
    value: function animate(this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      const anim = { playState: "running", cancel: vi.fn(() => (anim.playState = "idle")) };
      records.push({ el: this, keyframes, options, cancel: anim.cancel });
      return anim;
    },
  });
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
        intersect = (visible) => cb([{ isIntersecting: visible }]);
      }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (Element.prototype as { animate?: unknown }).animate;
  delete (document as { hidden?: unknown }).hidden;
});

type SvgProps = Partial<Parameters<typeof MochitSvg>[0]>;
const base = {
  growthStage: 1,
  reducedMotion: false,
  compact: false,
  reactionProfile: "full" as const,
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
/** 外側<svg>（body）への有限アニメ＝Macro Idle / Reaction */
const bodyAnims = (svg: Element) => on(svg).filter((r) => r.options.iterations !== Infinity);
const loops = () => records.filter((r) => r.options.iterations === Infinity);
const gazeMoves = (el: Element) => on(el).filter((r) => r.options.composite === undefined);
const setHidden = (value: boolean) =>
  act(() => {
    hidden = value;
    document.dispatchEvent(new Event("visibilitychange"));
  });

describe("MochitSvg: 自動 Macro Idle", () => {
  it("8秒待ってから再生し、終了すると属性が外れる", () => {
    const { svg } = renderSvg();
    advance(7999);
    expect(bodyAnims(svg)).toHaveLength(0);
    advance(1);
    expect(bodyAnims(svg)).toHaveLength(1);
    expect(bodyAnims(svg)[0].options).toMatchObject({ duration: 1500, fill: "none" });
    expect(svg.dataset.macroIdle).toBe("stretch");
    advance(1500);
    expect(svg.dataset.macroIdle).toBeUndefined();
    // 次回は新しい待ち時間から
    advance(7999);
    expect(bodyAnims(svg)).toHaveLength(1);
    advance(1);
    expect(bodyAnims(svg)).toHaveLength(2);
  });

  it("stretch は腕も動かし、アンテナは add で上乗せ", () => {
    const { svg, q } = renderSvg();
    records = [];
    advance(8000);
    expect(on(q("Arm_L"))).toHaveLength(1);
    expect(on(q("Arm_R"))).toHaveLength(1);
    const antenna = on(q("Anim_Antenna"));
    expect(antenna).toHaveLength(1);
    expect(antenna[0].options.composite).toBe("add");
    expect(bodyAnims(svg)[0].options.composite).toBe("replace");
  });
});

describe("MochitSvg: floating（84px）の Macro Idle", () => {
  it("floating は強めの振幅で再生し、スケジューラへ floating 条件を渡す", () => {
    const { svg } = renderSvg({ reactionProfile: "floating" });
    advance(8000);
    const peakSy = Math.max(
      ...bodyAnims(svg)[0].keyframes.map((k) => Number(/scale\([-\d.]+, ([-\d.]+)\)/.exec(String(k.transform))?.[1] ?? 1)),
    );
    expect(peakSy).toBeGreaterThanOrEqual(1.05);
    const tunings = vi.mocked(macro.nextMacroIdleDelayMs).mock.calls.map((c) => c[1]);
    expect(tunings.at(-1)).toBe(macro.FLOATING_MACRO_IDLE_TUNING);
  });

  it("full は従来の振幅・頻度のまま", () => {
    const { svg } = renderSvg();
    advance(8000);
    const peakSy = Math.max(
      ...bodyAnims(svg)[0].keyframes.map((k) => Number(/scale\([-\d.]+, ([-\d.]+)\)/.exec(String(k.transform))?.[1] ?? 1)),
    );
    expect(peakSy).toBeLessThan(1.04);
    const tunings = vi.mocked(macro.nextMacroIdleDelayMs).mock.calls.map((c) => c[1]);
    expect(tunings.at(-1)).toBe(macro.DEFAULT_MACRO_IDLE_TUNING);
  });
});

describe("MochitSvg: Macro Idle は Micro Idle を再起動しない", () => {
  it("breathe / sway / antenna / blink を cancel も作り直しもしない・SVG も再生成しない", () => {
    const { svg, q } = renderSvg({ emotion: "sleepy" });
    const initialLoops = loops();
    expect(initialLoops.map((r) => r.el.id).sort()).toEqual(["Anim_Antenna", "Anim_Breathe", "Anim_Sway"]);
    const root = q("Mochit_Root");
    const first = svg.firstElementChild;
    const lid = q("Eyelid_L").style.transform;
    expect(idle.nextBlinkGapMs).toHaveBeenCalledTimes(1);
    for (const behavior of ["stretch", "lookAround", "curious", "stretch"] as const) {
      vi.mocked(macro.pickMacroIdleBehavior).mockReturnValue(behavior);
      advance(8000);
      expect(svg.dataset.macroIdle).toBe(behavior);
      advance(1500);
    }
    expect(idle.nextBlinkGapMs).toHaveBeenCalledTimes(1);
    expect(loops()).toEqual(initialLoops);
    for (const loop of initialLoops) expect(loop.cancel).not.toHaveBeenCalled();
    // まぶた（sleepy の半目）の基底値はそのまま＝blink は同じ rest で続く
    expect(q("Eyelid_L").style.transform).toBe(lid);
    expect(q("Mochit_Root")).toBe(root);
    expect(svg.firstElementChild).toBe(first);
  });
});

describe("MochitSvg: Macro 終了後は基底状態（emotion / gaze / transform）へ", () => {
  it("happy 中に stretch しても happy のまま・口とまぶたには触れない", () => {
    const { svg, q } = renderSvg({ emotion: "happy" });
    advance(8000);
    for (const id of ["Mouth_Neutral", "Mouth_Smile", "Mouth_Thinking", "Mouth_Open", "Core_Glow"]) {
      expect(on(q(id)).filter((r) => r.options.duration === 1500)).toHaveLength(0);
    }
    advance(1500);
    expect(q("Mouth_Smile").style.opacity).toBe("1");
    // body の基底（インラインtransform）は触らない
    expect(svg.style.transform).toBe("");
    const kf = bodyAnims(svg)[0].keyframes;
    expect(kf[0].transform).toBe("translateY(0%) rotate(0deg) scale(1, 1)");
    expect(kf.at(-1)!.transform).toBe("translateY(0%) rotate(0deg) scale(1, 1)");
  });

  it("lookAround は基底視線からの差分（add）で、再生中はランダム視線を動かさず、終了後に再開", () => {
    vi.mocked(macro.pickMacroIdleBehavior).mockReturnValue("lookAround");
    const { q } = renderSvg();
    advance(7999); // ランダム視線は (5,-3) に居る
    const movesBefore = gazeMoves(q("Pupil_L")).length;
    advance(1);
    const look = on(q("Pupil_L")).filter((r) => r.options.composite === "add");
    expect(look).toHaveLength(1);
    const xs = look[0].keyframes.map((k) => k.transform);
    expect(xs).toContain("translate(-14px, 0px)"); // 絶対 -9 = 基底 5 からの差分
    expect(xs).toContain("translate(4px, 0px)"); // 絶対 +9
    expect(xs[0]).toBe("translate(0px, 0px)");
    expect(xs.at(-1)).toBe("translate(0px, 0px)");
    // 再生中にランダム視線の番が来ても基底は動かない
    vi.mocked(idle.nextGazeTarget).mockReturnValue({ x: -5, y: 2 });
    advance(1400);
    expect(gazeMoves(q("Pupil_L"))).toHaveLength(movesBefore);
    expect(q("Pupil_L").style.transform).toBe("translate(5px, -3px)");
    advance(100);
    expect(q("Pupil_L").style.transform).toBe("translate(5px, -3px)");
    // 終了後はランダム視線のリズムがそのまま続く（スケジューラは作り直していない）
    advance(1000);
    expect(q("Pupil_L").style.transform).toBe("translate(-5px, 2px)");
    expect(gazeMoves(q("Pupil_L"))).toHaveLength(movesBefore + 1);
  });

  it("Semantic Attention の基底視線を明示再生の lookAround 後も保つ", () => {
    const { q, rerender } = renderSvg({ attention: "content", attentionPoint: { x: 0.15, y: 0.25 } });
    rerender({ macroIdleRequest: { behavior: "lookAround", id: 1 } });
    const look = on(q("Pupil_L")).filter((r) => r.options.composite === "add");
    expect(look).toHaveLength(1);
    expect(look[0].keyframes.map((k) => k.transform)).toContain("translate(-4.1px, 0px)"); // -9 - (-4.9)
    advance(1500);
    expect(q("Pupil_L").style.transform).toBe("translate(-4.9px, -2px)");
  });
});

describe("MochitSvg: Reaction > Macro Idle", () => {
  it("Reaction 開始で Macro を即停止し、Reaction 後は 8秒以上待つ", () => {
    const { svg, fire } = renderSvg();
    advance(8000);
    const macroAnims = records.filter((r) => r.options.duration === 1500);
    expect(macroAnims.length).toBeGreaterThan(0);
    fire("triggerCorrect");
    for (const a of macroAnims) expect(a.cancel).toHaveBeenCalled();
    expect(svg.dataset.macroIdle).toBeUndefined();
    const reactionBody = bodyAnims(svg).at(-1)!;
    expect(reactionBody.options.duration).not.toBe(1500);
    const reactionMs = reactionBody.options.duration as number;
    advance(reactionMs);
    const count = bodyAnims(svg).length;
    advance(7999);
    expect(bodyAnims(svg)).toHaveLength(count);
    advance(1);
    expect(bodyAnims(svg)).toHaveLength(count + 1);
    expect(svg.dataset.macroIdle).toBe("stretch");
  });

  it("待機中の Reaction も待ち時間をリセットする", () => {
    const { svg, fire } = renderSvg();
    advance(6000);
    fire("triggerTap");
    const reactionMs = bodyAnims(svg).at(-1)!.options.duration as number;
    advance(reactionMs + 7999);
    expect(svg.dataset.macroIdle).toBeUndefined();
    advance(1);
    expect(svg.dataset.macroIdle).toBe("stretch");
  });
});

describe("MochitSvg: 自動発火の条件", () => {
  it.each(["user", "content", "result"] as const)("attention=%s では自動発火せず、random へ戻すと再開", (attention) => {
    const { svg, rerender } = renderSvg({ attention });
    advance(60000);
    expect(bodyAnims(svg)).toHaveLength(0);
    rerender({ attention: "random" });
    advance(8000);
    expect(svg.dataset.macroIdle).toBe("stretch");
  });

  it("再生中に Semantic Attention へ変わったら Macro を止める", () => {
    const { svg, rerender } = renderSvg();
    advance(8000);
    const macroAnims = records.filter((r) => r.options.duration === 1500);
    rerender({ attention: "user" });
    for (const a of macroAnims) expect(a.cancel).toHaveBeenCalled();
    expect(svg.dataset.macroIdle).toBeUndefined();
  });

  it("reduced-motion では自動 Macro Idle なし", () => {
    const { svg } = renderSvg({ reducedMotion: true });
    advance(60000);
    expect(records).toHaveLength(0);
    expect(svg.dataset.macroIdle).toBeUndefined();
  });

  it("compact では自動 Macro Idle なし（明示再生もしない）", () => {
    const { svg, rerender } = renderSvg({ compact: true, reactionProfile: "compact" });
    advance(60000);
    expect(bodyAnims(svg)).toHaveLength(0);
    rerender({ macroIdleRequest: { behavior: "stretch", id: 1 } });
    expect(bodyAnims(svg)).toHaveLength(0);
  });

  it("floating プロファイル（compact=false）では有効", () => {
    const { svg } = renderSvg({ reactionProfile: "floating" });
    advance(8000);
    expect(svg.dataset.macroIdle).toBe("stretch");
  });
});

describe("MochitSvg: 非表示・ビューポート外", () => {
  it("document.hidden で停止し、復帰時は途中再開せず新しい delay から", () => {
    const { svg } = renderSvg();
    advance(8000);
    const macroAnims = records.filter((r) => r.options.duration === 1500);
    setHidden(true);
    for (const a of macroAnims) expect(a.cancel).toHaveBeenCalled();
    expect(svg.dataset.macroIdle).toBeUndefined();
    const count = bodyAnims(svg).length;
    advance(60000);
    expect(bodyAnims(svg)).toHaveLength(count);
    setHidden(false);
    expect(bodyAnims(svg)).toHaveLength(count);
    advance(7999);
    expect(bodyAnims(svg)).toHaveLength(count);
    advance(1);
    expect(bodyAnims(svg)).toHaveLength(count + 1);
  });

  it("ビューポート外で停止・待機タイマーも止まり、戻ると新しい delay から", () => {
    const { svg } = renderSvg();
    advance(5000);
    act(() => intersect!(false));
    advance(60000);
    expect(bodyAnims(svg)).toHaveLength(0);
    act(() => intersect!(true));
    advance(7999);
    expect(bodyAnims(svg)).toHaveLength(0);
    advance(1);
    expect(bodyAnims(svg)).toHaveLength(1);
  });
});

describe("MochitSvg: macroIdleRequest（明示再生）", () => {
  it("id が変わるたびに1回だけ再生する", () => {
    const { svg, q, rerender } = renderSvg();
    rerender({ macroIdleRequest: { behavior: "curious", id: 1 } });
    expect(svg.dataset.macroIdle).toBe("curious");
    expect(on(q("Pupil_L")).filter((r) => r.options.composite === "add")).toHaveLength(1);
    advance(1500);
    expect(svg.dataset.macroIdle).toBeUndefined();
    rerender({ macroIdleRequest: { behavior: "curious", id: 1 } });
    expect(svg.dataset.macroIdle).toBeUndefined();
    rerender({ macroIdleRequest: { behavior: "lookAround", id: 2 } });
    expect(svg.dataset.macroIdle).toBe("lookAround");
  });

  it("マウント時点の要求は再生しない", () => {
    const { svg } = renderSvg({ macroIdleRequest: { behavior: "stretch", id: 3 } });
    expect(svg.dataset.macroIdle).toBeUndefined();
    expect(bodyAnims(svg)).toHaveLength(0);
  });

  it("明示再生の後も自動の待ち時間は数え直す", () => {
    const { svg, rerender } = renderSvg();
    advance(6000);
    rerender({ macroIdleRequest: { behavior: "curious", id: 1 } });
    advance(1500 + 7999);
    expect(bodyAnims(svg)).toHaveLength(1);
    advance(1);
    expect(bodyAnims(svg)).toHaveLength(2);
  });
});
