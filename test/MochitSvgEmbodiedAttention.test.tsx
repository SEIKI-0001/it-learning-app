// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MochitSvg from "@/components/mochit/MochitSvg";
import { getIdleProfile } from "@/components/mochit/mochitIdleAnimation";
import { attentionPointToGazeOffset } from "@/components/mochit/mochitAttention";
import {
  attentionBodyTransform,
  attentionPoseForGaze,
  NEUTRAL_ATTENTION_POSE,
} from "@/components/mochit/mochitEmbodiedAttention";

// Step7 Embodied Attention: floating（84px）だけ、目→体→アンテナの時間差で対象へ向く。

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
  reactionProfile: "floating" as const,
  ariaLabel: "モチット",
};

function renderSvg(props: SvgProps = {}) {
  let current = props;
  const view = render(<MochitSvg {...base} {...props} />);
  const svg = view.container.querySelector("svg")!;
  const q = (id: string) => svg.querySelector<SVGGraphicsElement>(`#${id}`)!;
  const rerender = (next: SvgProps) => {
    current = { ...current, ...next };
    act(() => view.rerender(<MochitSvg {...base} {...current} />));
  };
  return { svg, q, rerender };
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
/** 身体連動（add・fill:both の持続アニメ）だけを取り出す */
const poseAnims = (el: Element) =>
  records.filter((r) => r.el === el && r.options.composite === "add" && r.options.fill === "both");
/** 視線の補間（replace） */
const gazeMoves = (el: Element) => records.filter((r) => r.el === el && r.options.composite === undefined);

const floatingProfile = getIdleProfile(false, true);
const embody = floatingProfile.embody!;
const LEFT_UP = { x: 0.1, y: 0.2 };
const RIGHT = { x: 0.95, y: 0.5 };

describe("MochitSvg: floating の Embodied Attention", () => {
  it("content を見ると 目→体→アンテナ の順に遅れて対象側へ向く", () => {
    const { q, rerender } = renderSvg({ attention: "random" });
    records = [];
    rerender({ attention: "content", attentionPoint: RIGHT });

    // 目: 遅延なしで補間開始
    const [eye] = gazeMoves(q("Pupil_L"));
    expect(eye.options.delay ?? 0).toBe(0);

    const [body] = poseAnims(q("Anim_Sway"));
    const [antenna] = poseAnims(q("Anim_Antenna"));
    expect(body.options.delay).toBe(embody.attend.bodyDelayMs);
    expect(antenna.options.delay).toBe(embody.attend.antennaDelayMs);
    expect(body.options.delay!).toBeGreaterThanOrEqual(80);
    expect(body.options.delay!).toBeLessThanOrEqual(120);
    const lag = (antenna.options.delay as number) - (body.options.delay as number);
    expect(lag).toBeGreaterThanOrEqual(100);
    expect(lag).toBeLessThanOrEqual(180);

    // 体は右（視線と同じ向き）へ傾く
    const offset = attentionPointToGazeOffset(RIGHT, floatingProfile.gaze!);
    const pose = attentionPoseForGaze(offset, floatingProfile.gaze!, embody);
    expect(pose.tilt).toBeGreaterThan(0);
    expect(body.keyframes.at(0)!.transform).toBe(attentionBodyTransform(NEUTRAL_ATTENTION_POSE));
    expect(body.keyframes.at(-1)!.transform).toBe(attentionBodyTransform(pose));
  });

  it("左側と右側の対象で体の傾きが逆になる", () => {
    const { q, rerender } = renderSvg({ attention: "random" });
    rerender({ attention: "content", attentionPoint: LEFT_UP });
    const left = poseAnims(q("Anim_Sway")).at(-1)!.keyframes.at(-1)!.transform as string;
    advance(1000);
    rerender({ attention: "content", attentionPoint: RIGHT });
    const right = poseAnims(q("Anim_Sway")).at(-1)!.keyframes.at(-1)!.transform as string;
    expect(left).toMatch(/rotate\(-/);
    expect(right).not.toMatch(/rotate\(-/);
    // 切替は現在の姿勢（左へ傾いた状態）から始める＝位置飛びしない
    const lastFrom = poseAnims(q("Anim_Sway")).at(-1)!.keyframes[0].transform as string;
    expect(lastFrom).toMatch(/rotate\(-/);
  });

  it("random へ戻ると 目が先に正面へ戻り、体→アンテナが遅れて基底へ戻る", () => {
    const { q, rerender } = renderSvg({ attention: "random" });
    rerender({ attention: "content", attentionPoint: RIGHT });
    advance(2000);
    records = [];
    rerender({ attention: "random" });
    const [eye] = gazeMoves(q("Pupil_L"));
    expect(eye.keyframes.at(-1)!.transform).toBe("translate(0px, 0px)");
    const [body] = poseAnims(q("Anim_Sway"));
    const [antenna] = poseAnims(q("Anim_Antenna"));
    expect(body.options.delay).toBe(embody.release.bodyDelayMs);
    expect(antenna.options.delay).toBe(embody.release.antennaDelayMs);
    expect(body.keyframes.at(-1)!.transform).toBe(attentionBodyTransform(NEUTRAL_ATTENTION_POSE));
  });

  it("user（正面）では身体を動かさない", () => {
    const { q, rerender } = renderSvg({ attention: "random" });
    rerender({ attention: "user" });
    expect(poseAnims(q("Anim_Sway"))).toHaveLength(0);
    expect(poseAnims(q("Anim_Antenna"))).toHaveLength(0);
  });

  it("reduced-motion では身体連動なし（視線は静的に置くだけ）", () => {
    const { q, rerender } = renderSvg({ attention: "random", reducedMotion: true });
    rerender({ attention: "content", attentionPoint: RIGHT });
    expect(poseAnims(q("Anim_Sway"))).toHaveLength(0);
    expect(poseAnims(q("Anim_Antenna"))).toHaveLength(0);
    expect(gazeMoves(q("Pupil_L"))).toHaveLength(0);
  });

  it("reduced-motion へ切り替えると進行中の姿勢を即座に消す", () => {
    const { q, rerender } = renderSvg({ attention: "content", attentionPoint: RIGHT });
    const body = poseAnims(q("Anim_Sway")).at(-1)!;
    rerender({ reducedMotion: true });
    expect(body.cancel).toHaveBeenCalled();
  });

  it("compact 指定は floating より優先され、視線も身体も動かない", () => {
    const { q, rerender } = renderSvg({ attention: "random", compact: true });
    rerender({ attention: "content", attentionPoint: RIGHT });
    expect(poseAnims(q("Anim_Sway"))).toHaveLength(0);
    expect(q("Pupil_L").style.transform).toBe("");
  });

  it("full（floating 以外）は従来どおり視線だけ", () => {
    const { q, rerender } = renderSvg({ attention: "random", reactionProfile: "full" });
    rerender({ attention: "content", attentionPoint: RIGHT });
    expect(poseAnims(q("Anim_Sway"))).toHaveLength(0);
    expect(poseAnims(q("Anim_Antenna"))).toHaveLength(0);
    const fullOffset = attentionPointToGazeOffset(RIGHT, getIdleProfile(false).gaze!);
    expect(q("Pupil_L").style.transform).toBe(`translate(${fullOffset.x}px, ${fullOffset.y}px)`);
  });

  it("floating の視線は full より大きく振れる", () => {
    const { q } = renderSvg({ attention: "content", attentionPoint: RIGHT });
    const floatingOffset = attentionPointToGazeOffset(RIGHT, floatingProfile.gaze!);
    expect(q("Pupil_L").style.transform).toBe(`translate(${floatingOffset.x}px, ${floatingOffset.y}px)`);
    const fullOffset = attentionPointToGazeOffset(RIGHT, getIdleProfile(false).gaze!);
    expect(floatingOffset.x).toBeGreaterThanOrEqual(fullOffset.x * 2);
  });
});
