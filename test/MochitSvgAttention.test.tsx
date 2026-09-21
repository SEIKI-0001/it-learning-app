// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Mochit from "@/components/mochit/Mochit";
import MochitSvg from "@/components/mochit/MochitSvg";
import * as idle from "@/components/mochit/mochitIdleAnimation";
import type { MochitRiveTriggerInput } from "@/components/mochit/mochitTypes";

// 乱数タイミングの呼び出し回数でスケジューラの作り直しを検出する。
// ランダム視線の行き先は決定的にして「動いた」ことを判定しやすくする。
vi.mock("@/components/mochit/mochitIdleAnimation", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/components/mochit/mochitIdleAnimation")>();
  return {
    ...mod,
    nextBlinkGapMs: vi.fn(mod.nextBlinkGapMs),
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

beforeEach(() => {
  records = [];
  vi.useFakeTimers();
  vi.mocked(idle.nextBlinkGapMs).mockClear();
  vi.mocked(idle.nextGazeHoldMs).mockClear();
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    writable: true,
    value: function animate(this: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      const anim = { playState: "running", cancel: vi.fn(() => (anim.playState = "idle")) };
      records.push({ el: this, keyframes, options, cancel: anim.cancel });
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
/** Idle 由来（replace 合成）の視線アニメーション。リアクションの add トラックは除く */
const gazeMoves = (el: Element) => on(el).filter((r) => r.options.composite === undefined);
const pupilsTransform = (q: (id: string) => SVGGraphicsElement) =>
  ["Pupil_L", "Pupil_R", "EyeHighlight_L", "EyeHighlight_R"].map((id) => q(id).style.transform);

describe("MochitSvg: attention ごとの視線", () => {
  it("random（未指定）は従来のランダム視線を維持", () => {
    const { q } = renderSvg();
    expect(q("Pupil_L").style.transform).toBe("translate(0px, 0px)");
    expect(gazeMoves(q("Pupil_L"))).toHaveLength(0);
    advance(1000);
    const moves = gazeMoves(q("Pupil_L"));
    expect(moves).toHaveLength(1);
    expect(moves[0].options.duration).toBe(idle.getIdleProfile(false).gaze!.moveMs);
    expect(q("Pupil_L").style.transform).toBe("translate(5px, -3px)");
    // 保持→移動のリズムが続く（同じ目標への再移動は補間を省くので呼び出し回数で見る）
    const holds = vi.mocked(idle.nextGazeHoldMs).mock.calls.length;
    advance(3000);
    expect(vi.mocked(idle.nextGazeHoldMs).mock.calls.length).toBe(holds + 3);
  });

  it("user は中央を見て、ランダム視線は動かない", () => {
    const { q } = renderSvg({ attention: "user", attentionPoint: { x: 0.1, y: 0.1 } });
    expect(pupilsTransform(q)).toEqual(Array(4).fill("translate(0px, 0px)"));
    advance(10000);
    expect(gazeMoves(q("Pupil_L"))).toHaveLength(0);
    expect(idle.nextGazeHoldMs).not.toHaveBeenCalled();
  });

  it.each(["content", "result"] as const)("%s + point は指定位置を見る（初期表示はすべり込まない）", (attention) => {
    const { q } = renderSvg({ attention, attentionPoint: { x: 0.2, y: 0.3 } });
    expect(pupilsTransform(q)).toEqual(Array(4).fill("translate(-4.2px, -1.6px)"));
    expect(gazeMoves(q("Pupil_L"))).toHaveLength(0);
    advance(10000);
    expect(q("Pupil_L").style.transform).toBe("translate(-4.2px, -1.6px)");
    expect(gazeMoves(q("Pupil_L"))).toHaveLength(0);
  });

  it.each(["content", "result"] as const)("%s で point なしなら中央", (attention) => {
    const { q } = renderSvg({ attention });
    expect(q("Pupil_R").style.transform).toBe("translate(0px, 0px)");
  });

  it("範囲外の point は clamp される", () => {
    const { q } = renderSvg({ attention: "content", attentionPoint: { x: -1, y: 5 } });
    expect(q("Pupil_L").style.transform).toBe("translate(-7px, 4px)");
  });
});

describe("MochitSvg: random と Semantic Attention の切替", () => {
  it("Semantic Attention 中は random scheduler が視線を奪わない", () => {
    const { q, rerender } = renderSvg();
    advance(1000 + 200); // ランダムに (5,-3) へ移り終えている
    rerender({ attention: "content", attentionPoint: { x: 1, y: 0.5 } });
    // 今の位置から約 moveMs で滑らかに移る
    const move = gazeMoves(q("Pupil_L")).at(-1)!;
    expect(move.keyframes[0].transform).toBe("translate(5px, -3px)");
    expect(move.keyframes[1].transform).toBe("translate(7px, 0px)");
    expect(move.options.duration).toBe(idle.getIdleProfile(false).gaze!.moveMs);
    const calls = vi.mocked(idle.nextGazeHoldMs).mock.calls.length;
    const moves = gazeMoves(q("Pupil_L")).length;
    advance(10000);
    expect(vi.mocked(idle.nextGazeHoldMs).mock.calls.length).toBe(calls);
    expect(gazeMoves(q("Pupil_L"))).toHaveLength(moves);
    expect(q("Pupil_L").style.transform).toBe("translate(7px, 0px)");
  });

  it("random に戻すとランダム視線が再開する（位置は飛ばない）", () => {
    const { q, rerender } = renderSvg({ attention: "content", attentionPoint: { x: 0, y: 0 } });
    rerender({ attention: "random" });
    expect(q("Pupil_L").style.transform).toBe("translate(-7px, -4px)");
    advance(1000);
    const move = gazeMoves(q("Pupil_L")).at(-1)!;
    expect(move.keyframes[0].transform).toBe("translate(-7px, -4px)");
    expect(q("Pupil_L").style.transform).toBe("translate(5px, -3px)");
  });

  it("point の変更だけでも滑らかに視線が移る", () => {
    const { q, rerender } = renderSvg({ attention: "result", attentionPoint: { x: 0.5, y: 0.5 } });
    rerender({ attentionPoint: { x: 1, y: 1 } });
    const move = gazeMoves(q("Pupil_L")).at(-1)!;
    expect(move.keyframes.map((k) => k.transform)).toEqual(["translate(0px, 0px)", "translate(7px, 4px)"]);
  });
});

describe("MochitSvg: attention 変更で Living Idle を再起動しない", () => {
  it("breathe / sway / antenna は cancel も作り直しもされない", () => {
    const { q, rerender } = renderSvg();
    const loops = records.filter((r) => r.options.iterations === Infinity);
    expect(loops.map((r) => (r.el as Element).id).sort()).toEqual(["Anim_Antenna", "Anim_Breathe", "Anim_Sway"]);
    for (const attention of ["content", "user", "result", "random", "user"] as const) {
      rerender({ attention, attentionPoint: { x: 0.2, y: 0.8 } });
      advance(500);
    }
    for (const loop of loops) expect(loop.cancel).not.toHaveBeenCalled();
    expect(on(q("Anim_Breathe"))).toHaveLength(1);
    expect(on(q("Anim_Sway"))).toHaveLength(1);
    expect(on(q("Anim_Antenna"))).toHaveLength(1);
  });

  it("blink scheduler を作り直さない", () => {
    const { rerender } = renderSvg();
    const blinkSchedules = vi.mocked(idle.nextBlinkGapMs).mock.calls.length;
    expect(blinkSchedules).toBe(1);
    for (const attention of ["content", "result", "user", "random"] as const) {
      rerender({ attention, attentionPoint: { x: 0.9, y: 0.1 } });
    }
    expect(vi.mocked(idle.nextBlinkGapMs).mock.calls.length).toBe(blinkSchedules);
  });
});

describe("MochitSvg: emotion と attention は独立", () => {
  it("happy + content が同時に成立し、互いにリセットしない", () => {
    const { q, rerender } = renderSvg({ emotion: "happy", attention: "content", attentionPoint: { x: 0.15, y: 0.25 } });
    expect(q("Mouth_Smile").style.opacity).toBe("1");
    expect(q("Pupil_L").style.transform).toBe("translate(-4.9px, -2px)");

    rerender({ attention: "user" });
    expect(q("Mouth_Smile").style.opacity).toBe("1");
    rerender({ attention: "content" });

    rerender({ emotion: "thinking" });
    expect(q("Pupil_L").style.transform).toBe("translate(-4.9px, -2px)");
    expect(q("Mouth_Thinking").style.opacity).toBe("1");
  });

  it("sleepy のまぶたは attention 変更で動かない", () => {
    const { q, rerender } = renderSvg({ emotion: "sleepy" });
    const lid = q("Eyelid_L").style.transform;
    const lidAnimations = on(q("Eyelid_L")).length;
    rerender({ attention: "content", attentionPoint: { x: 0, y: 1 } });
    expect(q("Eyelid_L").style.transform).toBe(lid);
    expect(lid).toContain("scale(1, 0.3)");
    expect(on(q("Eyelid_L"))).toHaveLength(lidAnimations);
  });
});

describe("MochitSvg: Reaction は Semantic Attention の上に乗る", () => {
  it("incorrect の視線は add で上乗せされ、終了後は content 視線へ戻る", () => {
    const { q, fire } = renderSvg({ emotion: "happy", attention: "content", attentionPoint: { x: 0.15, y: 0.25 } });
    records = [];
    fire("triggerIncorrect");
    const reactionGaze = on(q("Pupil_L")).filter((r) => r.options.composite === "add");
    expect(reactionGaze).toHaveLength(1);
    // 基底（Semantic Attention）には触れない
    expect(q("Pupil_L").style.transform).toBe("translate(-4.9px, -2px)");
    advance(3000);
    expect(q("Pupil_L").style.transform).toBe("translate(-4.9px, -2px)");
    expect(q("Mouth_Smile").style.opacity).toBe("1");
    expect(gazeMoves(q("Pupil_L"))).toHaveLength(0);
    expect(reactionGaze[0].cancel).not.toHaveBeenCalled();
  });

  it("リアクション中に attention が変わっても Reaction は打ち切られない", () => {
    const { q, fire, rerender } = renderSvg({ attention: "content", attentionPoint: { x: 0, y: 0.5 } });
    fire("triggerIncorrect");
    const reactionGaze = on(q("Pupil_L")).filter((r) => r.options.composite === "add");
    rerender({ attentionPoint: { x: 1, y: 0.5 } });
    expect(reactionGaze[0].cancel).not.toHaveBeenCalled();
    expect(q("Pupil_L").style.transform).toBe("translate(7px, 0px)");
  });
});

describe("MochitSvg: reduced-motion / compact", () => {
  it("reduced-motion は静的な視線位置だけ反映（アニメーションなし）", () => {
    const { q, rerender } = renderSvg({ reducedMotion: true, attention: "content", attentionPoint: { x: 1, y: 0 } });
    expect(q("Pupil_L").style.transform).toBe("translate(7px, -4px)");
    rerender({ attentionPoint: { x: 0, y: 1 } });
    expect(q("Pupil_L").style.transform).toBe("translate(-7px, 4px)");
    advance(10000);
    expect(records).toHaveLength(0);
  });

  it("reduced-motion の random は従来どおり中央（インラインstyleなし）", () => {
    const { q } = renderSvg({ reducedMotion: true });
    expect(q("Pupil_L").style.transform).toBe("");
  });

  it("reduced-motion へ切り替えると Semantic 視線は静的に残り、random は中央へ", () => {
    const { q, rerender } = renderSvg({ attention: "result", attentionPoint: { x: 1, y: 1 } });
    rerender({ reducedMotion: true });
    expect(q("Pupil_L").style.transform).toBe("translate(7px, 4px)");
    rerender({ attention: "random" });
    expect(q("Pupil_L").style.transform).toBe("");
  });

  it("compact は Semantic Attention でも中央固定（従来の省アニメーション）", () => {
    const { q, rerender } = renderSvg({
      compact: true,
      reactionProfile: "compact",
      attention: "content",
      attentionPoint: { x: 0, y: 0 },
    });
    expect(pupilsTransform(q)).toEqual(Array(4).fill(""));
    rerender({ attention: "random" });
    advance(10000);
    expect(gazeMoves(q("Pupil_L"))).toHaveLength(0);
    expect(q("Pupil_L").style.transform).toBe("");
  });
});

describe("Mochit: attention / attentionPoint prop", () => {
  async function renderMochit(props: Parameters<typeof Mochit>[0]) {
    vi.useRealTimers();
    const view = render(<Mochit rendererOverride="svg" size="large" {...props} />);
    await waitFor(() => expect(view.container.querySelector("#Pupil_L")).not.toBeNull());
    return view.container.querySelector("svg")!;
  }
  const pupil = (svg: SVGSVGElement) => svg.querySelector<SVGGraphicsElement>("#Pupil_L")!.style.transform;

  it("behavior 未指定では従来どおり random（Idle 中は中央から開始）", async () => {
    const svg = await renderMochit({});
    expect(pupil(svg)).toBe("translate(0px, 0px)");
    expect(idle.nextGazeHoldMs).toHaveBeenCalled();
  });

  it("attention を省いた behavior（emotion だけ）も従来どおり random", async () => {
    await renderMochit({ behavior: { emotion: "happy" } });
    expect(idle.nextGazeHoldMs).toHaveBeenCalled();
  });

  it("behavior.attention と attentionPoint を SVG の視線へ渡す", async () => {
    const svg = await renderMochit({
      behavior: { emotion: "happy", attention: "content" },
      attentionPoint: { x: 0.15, y: 0.25 },
    });
    expect(pupil(svg)).toBe("translate(-4.9px, -2px)");
    expect(svg.querySelector<SVGGraphicsElement>("#Mouth_Smile")!.style.opacity).toBe("1");
    expect(idle.nextGazeHoldMs).not.toHaveBeenCalled();
  });
});
