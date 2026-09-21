// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import Mochit from "@/components/mochit/Mochit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MochitSvg from "@/components/mochit/MochitSvg";
import type { MochitEmotion } from "@/components/mochit/mochitBehavior";
import type { MochitRiveTriggerInput } from "@/components/mochit/mochitTypes";

// jsdom には WAAPI が無いので、呼び出しを記録するだけのスタブを差し込む。
type AnimationRecord = {
  el: Element;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  cancel: ReturnType<typeof vi.fn>;
};
let records: AnimationRecord[] = [];

beforeEach(() => {
  records = [];
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
  const view = render(<MochitSvg {...base} registerTriggerFirer={registerTriggerFirer} {...props} />);
  const svg = view.container.querySelector("svg")!;
  const q = (id: string) => svg.querySelector<SVGGraphicsElement>(`#${id}`)!;
  const rerender = (next: SvgProps) =>
    view.rerender(<MochitSvg {...base} registerTriggerFirer={registerTriggerFirer} {...props} {...next} />);
  return { svg, q, rerender, fire: (t: MochitRiveTriggerInput) => act(() => fire!(t)) };
}

const mouthOpacities = (q: (id: string) => SVGGraphicsElement) => ({
  neutral: q("Mouth_Neutral").style.opacity,
  smile: q("Mouth_Smile").style.opacity,
  thinking: q("Mouth_Thinking").style.opacity,
});
const animationsOn = (el: Element) => records.filter((r) => r.el === el);

describe("MochitSvg: Behavior emotion の平常表情", () => {
  it("emotion 未指定では従来どおり（口にインラインstyleなし・まぶた全開）", () => {
    const { q } = renderSvg();
    expect(mouthOpacities(q)).toEqual({ neutral: "", smile: "", thinking: "" });
    expect(q("Mouth_Smile").getAttribute("opacity")).toBe("0");
    expect(q("Eyelid_L").style.transform).toContain("scale(1, 0.0001)");
  });

  it("neutral は未指定と同一の DOM", () => {
    const a = renderSvg().svg.innerHTML;
    cleanup();
    const b = renderSvg({ emotion: "neutral" }).svg.innerHTML;
    expect(b).toBe(a);
  });

  it.each<[MochitEmotion, { neutral: string; smile: string; thinking: string }]>([
    ["happy", { neutral: "0", smile: "1", thinking: "0" }],
    ["thinking", { neutral: "0", smile: "0", thinking: "1" }],
    ["curious", { neutral: "", smile: "", thinking: "" }],
    ["sleepy", { neutral: "", smile: "", thinking: "" }],
  ])("%s の平常口", (emotion, expected) => {
    const { q } = renderSvg({ emotion });
    expect(mouthOpacities(q)).toEqual(expected);
  });

  it("sleepy は平常時のまぶたが少し下がる（compact は弱め）", () => {
    const { q } = renderSvg({ emotion: "sleepy" });
    expect(q("Eyelid_L").style.opacity).toBe("1");
    expect(q("Eyelid_L").style.transform).toContain("scale(1, 0.3)");
    expect(q("Eyelid_R").style.transform).toContain("scale(1, 0.3)");
    cleanup();
    const compact = renderSvg({ emotion: "sleepy", compact: true, reactionProfile: "compact" });
    expect(compact.q("Eyelid_L").style.transform).toContain("scale(1, 0.2)");
  });

  it("sleepy のまばたきは 半目→全閉→半目", () => {
    vi.useFakeTimers();
    const { q } = renderSvg({ emotion: "sleepy" });
    act(() => vi.advanceTimersByTime(7000));
    const blinks = animationsOn(q("Eyelid_L"));
    expect(blinks.length).toBeGreaterThan(0);
    const frames = blinks[0].keyframes;
    expect(frames[0].transform).toContain("scale(1, 0.3)");
    expect(frames[frames.length - 1].transform).toContain("scale(1, 0.3)");
  });

  it("reduced-motion でも静的な表情は残る（Idle は動かない）", () => {
    const { q } = renderSvg({ emotion: "sleepy", reducedMotion: true });
    expect(records).toHaveLength(0);
    expect(q("Eyelid_L").style.opacity).toBe("1");
    expect(q("Eyelid_L").style.transform).toContain("scale(1, 0.3)");
    cleanup();
    const happy = renderSvg({ emotion: "happy", reducedMotion: true });
    expect(mouthOpacities(happy.q).smile).toBe("1");
    cleanup();
    const thinking = renderSvg({ emotion: "thinking", reducedMotion: true });
    expect(mouthOpacities(thinking.q).thinking).toBe("1");
  });

  it("emotion 切替で SVG を再注入せず、Idle アニメーションも作り直さない", () => {
    const { svg, q, rerender } = renderSvg();
    const root = svg.firstElementChild;
    const mouth = q("Mouth_Smile");
    const breathe = q("Anim_Breathe");
    const idleLoops = records.filter((r) => r.options.iterations === Infinity);
    expect(idleLoops.length).toBeGreaterThan(0);

    for (const emotion of ["happy", "thinking", "sleepy", "curious", "neutral"] as const) {
      rerender({ emotion });
    }
    expect(svg.firstElementChild).toBe(root);
    expect(q("Mouth_Smile")).toBe(mouth);
    for (const loop of idleLoops) expect(loop.cancel).not.toHaveBeenCalled();
    expect(animationsOn(breathe)).toHaveLength(1);
  });

  it("emotion 切替は既存ノードへ命令的に反映される", () => {
    const { q, rerender } = renderSvg();
    rerender({ emotion: "happy" });
    expect(mouthOpacities(q)).toEqual({ neutral: "0", smile: "1", thinking: "0" });
    rerender({ emotion: "sleepy" });
    expect(mouthOpacities(q)).toEqual({ neutral: "", smile: "", thinking: "" });
    expect(q("Eyelid_L").style.transform).toContain("scale(1, 0.3)");
    rerender({ emotion: "neutral" });
    expect(q("Eyelid_L").style.transform).toContain("scale(1, 0.0001)");
  });
});

describe("MochitSvg: Reaction は Behavior の上に重なる", () => {
  it("happy 中の incorrect は Smile 基底から Thinking へ、終了時は Smile に戻る", () => {
    const { q, fire } = renderSvg({ emotion: "happy" });
    records = [];
    fire("triggerIncorrect");
    const smile = animationsOn(q("Mouth_Smile"));
    const thinking = animationsOn(q("Mouth_Thinking"));
    expect(thinking).toHaveLength(1);
    expect(smile).toHaveLength(1);
    expect(animationsOn(q("Mouth_Neutral"))).toHaveLength(0);
    const frames = smile[0].keyframes;
    expect(frames[0].opacity).toBe(1);
    expect(frames[frames.length - 1].opacity).toBe(1);
    // fill:none ＝ 終了後は基底（平常表情 happy）がそのまま見える
    expect(smile[0].options.fill).toBe("none");
    expect(mouthOpacities(q).smile).toBe("1");
  });

  it("neutral では従来どおり Neutral 基底のリアクション", () => {
    const { q, fire } = renderSvg();
    records = [];
    fire("triggerIncorrect");
    expect(animationsOn(q("Mouth_Neutral"))).toHaveLength(1);
    expect(animationsOn(q("Mouth_Smile"))).toHaveLength(0);
  });

  it("リアクション中の emotion 変更は終了まで待ち、終了後に新しい平常表情へ", () => {
    vi.useFakeTimers();
    const { q, fire, rerender } = renderSvg({ emotion: "happy" });
    fire("triggerIncorrect");
    rerender({ emotion: "thinking" });
    // リアクション優先: 走行中は基底の口を差し替えない
    expect(mouthOpacities(q).smile).toBe("1");
    act(() => vi.advanceTimersByTime(1000));
    expect(mouthOpacities(q)).toEqual({ neutral: "0", smile: "0", thinking: "1" });
  });

  it("sleepy のまぶたはリアクション中も維持される", () => {
    const { q, fire } = renderSvg({ emotion: "sleepy" });
    fire("triggerCorrect");
    expect(q("Eyelid_L").style.transform).toContain("scale(1, 0.3)");
  });
});

describe("Mochit: behavior prop", () => {
  async function renderMochit(props: Parameters<typeof Mochit>[0]) {
    const view = render(<Mochit rendererOverride="svg" reducedMotion {...props} />);
    await waitFor(() => expect(view.container.querySelector("#Mouth_Smile")).not.toBeNull());
    return view.container.querySelector("svg")!;
  }

  it("behavior 未指定では従来どおり", async () => {
    const svg = await renderMochit({});
    expect(svg.querySelector<SVGGraphicsElement>("#Mouth_Smile")!.style.opacity).toBe("");
  });

  it("emotion を SVG の平常表情へ渡す（state とは独立）", async () => {
    const svg = await renderMochit({ state: "normal", behavior: { emotion: "happy" } });
    expect(svg.querySelector<SVGGraphicsElement>("#Mouth_Smile")!.style.opacity).toBe("1");
  });

  // attention は Step 3 で視線へ接続済み（test/MochitSvgAttention.test.tsx）
  it("energy / idleBehavior はまだ SVG に影響しない", async () => {
    const plain = (await renderMochit({})).innerHTML;
    cleanup();
    const withOthers = (
      await renderMochit({ behavior: { energy: 0.05, idleBehavior: "stretch" } })
    ).innerHTML;
    expect(withOthers).toBe(plain);
  });
});
