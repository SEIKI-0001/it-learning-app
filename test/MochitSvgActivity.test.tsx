// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MochitSvg from "@/components/mochit/MochitSvg";
import * as idle from "@/components/mochit/mochitIdleAnimation";
import {
  ACTIVITY_LIFT_TIMING,
  activityAntennaTransform,
  activityArmTransform,
  activityBodyTransform,
  getActivityPose,
  getActivityTempo,
  NEUTRAL_ACTIVITY_POSE,
  readingGazeOffsets,
  RESTING_EYELID_REST,
  STUDYING_EYELID_REST,
} from "@/components/mochit/mochitActivity";
import { REACTION_TOTAL_MS } from "@/components/mochit/mochitReactionAnimation";
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
  // 読む視線の「ちらっとユーザーを見る」抽選を外す（Math.random=0.5 > 0.07）
  vi.spyOn(Math, "random").mockReturnValue(0.5);
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
  vi.restoreAllMocks();
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
/** 外側<svg>への有限アニメ（Reaction / Macro Idle / Activity の振り付け） */
const bodyAnims = (svg: Element) => on(svg).filter((r) => r.options.iterations !== Infinity);
/** Activity の姿勢（add・fill:both の持続アニメ） */
const poses = (el: Element) => on(el).filter((r) => r.options.composite === "add" && r.options.fill === "both");
const lastPoseTarget = (el: Element) => String(poses(el).at(-1)!.keyframes.at(-1)!.transform);
const lastEyelidTarget = (el: Element) => el.getAttribute("style") ?? "";

const STUDYING = getActivityPose("studying");
const RESTING = getActivityPose("resting");
const FLOATING_GAZE = idle.getIdleProfile(false, true).gaze!;

describe("MochitSvg: studying（一緒に勉強）", () => {
  it("Micro Idle を作り直さず、アンテナを静かに・ゆれを弱める", () => {
    const { q, rerender } = renderSvg();
    const loopCount = loops().length;
    rerender({ activity: "studying" });
    expect(loops()).toHaveLength(loopCount);
    for (const r of loops()) expect(r.cancel).not.toHaveBeenCalled();
    expect(idle.nextBlinkGapMs).toHaveBeenCalledTimes(1);
    const antenna = loopOn(q("Anim_Antenna"));
    expect(antenna.rates.at(-1)).toBe(getActivityTempo("studying").antennaRate);
    const deg = (kfs: Keyframe[]) => Number(/rotate\((-?[\d.]+)deg\)/.exec(String(kfs[1].transform))![1]);
    expect(deg(antenna.setKeyframes.mock.calls.at(-1)![0])).toBeLessThan(deg(antenna.keyframes) * 0.5);
  });

  it("少し前傾（体・腕・アンテナへ add の持続姿勢）し、目線を落とす", () => {
    const { q, rerender } = renderSvg();
    rerender({ activity: "studying" });
    expect(lastPoseTarget(q("Anim_Breathe"))).toBe(activityBodyTransform(STUDYING));
    const armChild = q("Arm_L").firstElementChild!;
    expect(lastPoseTarget(armChild)).toBe(activityArmTransform("L", STUDYING.armDeg));
    expect(lastPoseTarget(q("Anim_Antenna"))).toBe(activityAntennaTransform(STUDYING.antennaDeg));
    // 腕の姿勢は Arm_L 自体（Reaction が replace で動かす要素）には置かない
    expect(poses(q("Arm_L"))).toHaveLength(0);
    expect(lastEyelidTarget(q("Eyelid_L"))).toContain(`scale(1, ${STUDYING_EYELID_REST})`);
  });

  it("「よし」と構える振り付けを1回だけ再生する（初回表示では再生しない）", () => {
    const first = renderSvg({ activity: "studying" });
    expect(bodyAnims(first.svg)).toHaveLength(0);
    cleanup();
    records = [];
    const { svg, rerender } = renderSvg();
    rerender({ activity: "studying" });
    expect(bodyAnims(svg)).toHaveLength(1);
    expect(bodyAnims(svg)[0].options.duration).toBe(700);
  });

  it("視線は教材（下）を見て、読むように左右へ送る（ランダム視線は使わない）", () => {
    const { q, rerender } = renderSvg();
    rerender({ activity: "studying" });
    const stops = readingGazeOffsets(FLOATING_GAZE);
    const pupil = q("Pupil_L");
    expect(pupil.style.transform).toBe(`translate(${stops[0].x}px, ${stops[0].y}px)`);
    expect(stops[0].y).toBeGreaterThan(0);
    advance(2000);
    expect(pupil.style.transform).toBe(`translate(${stops[1].x}px, ${stops[1].y}px)`);
    advance(10_000);
    expect(pupil.style.transform).not.toBe("translate(5px, -3px)");
    expect(idle.nextGazeTarget).not.toHaveBeenCalled();
  });

  it("Macro Idle は割り込まない。idle へ戻ると新しく8秒待ってから再開", () => {
    const { svg, rerender } = renderSvg({ activity: "studying" });
    advance(120_000);
    expect(svg.dataset.macroIdle).toBeUndefined();
    rerender({ activity: "idle" });
    advance(7_999);
    expect(svg.dataset.macroIdle).toBeUndefined();
    advance(1);
    expect(svg.dataset.macroIdle).toBe("stretch");
  });

  it("再生中の Macro Idle は studying に入った時点で止める", () => {
    const { svg, rerender } = renderSvg();
    advance(8000);
    expect(svg.dataset.macroIdle).toBe("stretch");
    rerender({ activity: "studying" });
    expect(svg.dataset.macroIdle).toBeUndefined();
  });

  it("SVG を再生成しない", () => {
    const { svg, rerender } = renderSvg();
    const root = svg.firstElementChild;
    rerender({ activity: "studying" });
    rerender({ activity: "resting" });
    rerender({ activity: "idle" });
    expect(svg.firstElementChild).toBe(root);
  });
});

describe("MochitSvg: Learning Reaction → Activity へ復帰", () => {
  it("correct: 顔を上げて（姿勢を解き・目を開け・正面を見る）喜び、少し見てから studying へ戻る", () => {
    const { q, rerender, fire } = renderSvg();
    rerender({ activity: "studying" });
    advance(2000);
    fire("triggerCorrect");
    const breathe = q("Anim_Breathe");
    expect(lastPoseTarget(breathe)).toBe(activityBodyTransform(NEUTRAL_ACTIVITY_POSE));
    expect(poses(breathe).at(-1)!.options.duration).toBe(ACTIVITY_LIFT_TIMING.liftMs);
    expect(q("Pupil_L").style.transform).toBe("translate(0px, 0px)");
    expect(lastEyelidTarget(q("Eyelid_L"))).toContain("scale(1, 0.0001)");

    // Reaction 終了直後はまだユーザーを見ている
    advance(REACTION_TOTAL_MS.correct!);
    expect(lastPoseTarget(breathe)).toBe(activityBodyTransform(NEUTRAL_ACTIVITY_POSE));
    advance(ACTIVITY_LIFT_TIMING.resumeHoldMs);
    // neutral 固定ではなく Reaction 前の studying へ
    expect(lastPoseTarget(breathe)).toBe(activityBodyTransform(STUDYING));
    expect(poses(breathe).at(-1)!.options.duration).toBe(ACTIVITY_LIFT_TIMING.resumeMs);
    expect(lastEyelidTarget(q("Eyelid_L"))).toContain(`scale(1, ${STUDYING_EYELID_REST})`);
    expect(q("Pupil_L").style.transform).toBe(
      `translate(${readingGazeOffsets(FLOATING_GAZE)[0].x}px, ${readingGazeOffsets(FLOATING_GAZE)[0].y}px)`,
    );
  });

  it("incorrect: 結果を見て考えたあと、studying へ戻る", () => {
    const { q, rerender, fire } = renderSvg({ activity: "studying" });
    rerender({});
    fire("triggerIncorrect");
    advance(REACTION_TOTAL_MS.incorrect! + ACTIVITY_LIFT_TIMING.resumeHoldMs);
    expect(lastPoseTarget(q("Anim_Breathe"))).toBe(activityBodyTransform(STUDYING));
  });

  it("checkpointClear（高優先度・長い）も最後まで顔を上げたまま、終了後に studying へ戻る", () => {
    const { q, fire } = renderSvg({ activity: "studying" });
    fire("triggerCheckpointClear");
    advance(REACTION_TOTAL_MS.checkpointClear! + ACTIVITY_LIFT_TIMING.resumeHoldMs - 1);
    expect(lastPoseTarget(q("Anim_Breathe"))).toBe(activityBodyTransform(NEUTRAL_ACTIVITY_POSE));
    advance(1);
    expect(lastPoseTarget(q("Anim_Breathe"))).toBe(activityBodyTransform(STUDYING));
  });

  it("Reaction の置換中は下ろさず、最後の Reaction が終わってから戻る", () => {
    const { q, fire } = renderSvg({ activity: "studying" });
    fire("triggerCorrect");
    advance(400);
    fire("triggerAllCorrect");
    advance(REACTION_TOTAL_MS.correct!);
    expect(lastPoseTarget(q("Anim_Breathe"))).toBe(activityBodyTransform(NEUTRAL_ACTIVITY_POSE));
    advance(REACTION_TOTAL_MS.allCorrect! + ACTIVITY_LIFT_TIMING.resumeHoldMs);
    expect(lastPoseTarget(q("Anim_Breathe"))).toBe(activityBodyTransform(STUDYING));
  });

  it("idle では Reaction が姿勢アニメを作らない（従来どおり）", () => {
    const { q, fire } = renderSvg();
    fire("triggerCorrect");
    advance(2000);
    expect(poses(q("Anim_Breathe"))).toHaveLength(0);
  });
});

describe("MochitSvg: Contextual Attention > Activity", () => {
  it("content を見ている間は顔を上げ、random に戻ると studying の姿勢へ戻る", () => {
    const { q, rerender } = renderSvg({ activity: "studying" });
    rerender({ attention: "content", attentionPoint: { x: 1, y: 0.5 } });
    expect(lastPoseTarget(q("Anim_Breathe"))).toBe(activityBodyTransform(NEUTRAL_ACTIVITY_POSE));
    // 視線は Semantic Attention の点（右）
    expect(q("Pupil_L").style.transform).toBe(`translate(${FLOATING_GAZE.rangeX}px, 0px)`);
    rerender({ attention: "random", attentionPoint: undefined });
    expect(lastPoseTarget(q("Anim_Breathe"))).toBe(activityBodyTransform(STUDYING));
  });
});

describe("MochitSvg: resting（意図的な休憩）", () => {
  it("力が抜ける→伸び→休憩姿勢（振り付け＋姿勢は2段階）", () => {
    const { svg, q, rerender } = renderSvg({ activity: "studying" });
    rerender({ activity: "resting" });
    expect(bodyAnims(svg).at(-1)!.options.duration).toBe(1700);
    const breathe = q("Anim_Breathe");
    // まず studying の姿勢を解き…
    expect(lastPoseTarget(breathe)).toBe(activityBodyTransform(NEUTRAL_ACTIVITY_POSE));
    advance(1200);
    // …伸びのあとで休憩姿勢へ
    expect(lastPoseTarget(breathe)).toBe(activityBodyTransform(RESTING));
  });

  it("笑顔で目を少し細め、ゆっくり深く呼吸する（sleepy とは別の表情）", () => {
    const { q, rerender } = renderSvg();
    rerender({ activity: "resting" });
    expect(q("Mouth_Smile").style.opacity).toBe("1");
    expect(lastEyelidTarget(q("Eyelid_L"))).toContain(`scale(1, ${RESTING_EYELID_REST})`);
    const breathe = loopOn(q("Anim_Breathe"));
    expect(breathe.rates.at(-1)).toBe(getActivityTempo("resting").breatheRate);
    const sy = (kfs: Keyframe[]) => Number(/scale\([\d.]+, ([\d.]+)\)/.exec(String(kfs[1].transform))![1]);
    expect(sy(breathe.setKeyframes.mock.calls.at(-1)![0])).toBeGreaterThan(sy(breathe.keyframes));
  });

  it("ときどき周りを見る（のんびりした間隔で視線が動く）", () => {
    const { q, rerender } = renderSvg();
    rerender({ activity: "resting" });
    const pupil = q("Pupil_L");
    const first = pupil.style.transform;
    advance(1500);
    expect(pupil.style.transform).toBe(first);
    vi.mocked(Math.random).mockReturnValue(0.9); // 中央以外へ
    advance(6000);
    expect(pupil.style.transform).not.toBe(first);
  });

  it("休憩を終えると軽く構える（wake/ready）振り付けで idle へ戻る", () => {
    const { svg, q, rerender } = renderSvg({ activity: "resting" });
    rerender({ activity: "idle" });
    expect(bodyAnims(svg).at(-1)!.options.duration).toBe(750);
    expect(lastPoseTarget(q("Anim_Breathe"))).toBe(activityBodyTransform(NEUTRAL_ACTIVITY_POSE));
    expect(q("Mouth_Smile").style.opacity).toBe("");
  });
});

describe("MochitSvg: Activity の reduced-motion / 停止", () => {
  it("reduced-motion: 振り付けなしで静的な姿勢・表情・視線だけを残す", () => {
    const { svg, q, rerender } = renderSvg({ reducedMotion: true });
    rerender({ activity: "studying" });
    expect(bodyAnims(svg)).toHaveLength(0);
    const pose = poses(q("Anim_Breathe")).at(-1)!;
    expect(pose.options.duration).toBe(1);
    expect(String(pose.keyframes.at(-1)!.transform)).toBe(activityBodyTransform(STUDYING));
    const still = readingGazeOffsets(FLOATING_GAZE);
    expect(q("Pupil_L").style.transform).toBe(`translate(0px, ${still[0].y}px)`);
    expect(q("Eyelid_L").style.transform).toContain(`scale(1, ${STUDYING_EYELID_REST})`);
  });

  it("reduced-motion の Reaction では顔を上げない（静的な姿勢を保つ）", () => {
    const { q, fire } = renderSvg({ reducedMotion: true, activity: "studying" });
    const count = poses(q("Anim_Breathe")).length;
    fire("triggerCorrect");
    advance(3000);
    expect(poses(q("Anim_Breathe"))).toHaveLength(count);
  });

  it("タブ非表示中は動きを止め、復帰しても姿勢は保ったまま（振り付けは再生しない）", () => {
    const { svg, q } = renderSvg({ activity: "studying" });
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(bodyAnims(svg)).toHaveLength(0);
    expect(lastPoseTarget(q("Anim_Breathe"))).toBe(activityBodyTransform(STUDYING));
    delete (document as { hidden?: boolean }).hidden;
  });
});
