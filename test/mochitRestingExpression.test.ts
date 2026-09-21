import { describe, expect, it } from "vitest";
import type { MochitEmotion } from "@/components/mochit/mochitBehavior";
import { blinkKeyframes, eyelidRestTransform, getIdleProfile } from "@/components/mochit/mochitIdleAnimation";
import { buildReactionSpec, type ReactionSpec } from "@/components/mochit/mochitReactionAnimation";
import {
  getMochitRestingExpression,
  MOCHIT_SLEEPY_EYELID_REST,
  MOCHIT_SLEEPY_EYELID_REST_COMPACT,
  rebaseReactionMouths,
} from "@/components/mochit/mochitRestingExpression";

const MOUTHS = ["mouthNeutral", "mouthSmile", "mouthThinking", "mouthOpen"];
const mouthTargets = (spec: ReactionSpec) => spec.tracks.filter((t) => MOUTHS.includes(t.target)).map((t) => t.target);
const track = (spec: ReactionSpec, target: string) => spec.tracks.find((t) => t.target === target);
const full = (event: Parameters<typeof buildReactionSpec>[0]) => buildReactionSpec(event, { reducedMotion: false })!;

describe("getMochitRestingExpression", () => {
  it.each<[MochitEmotion, string]>([
    ["neutral", "neutral"],
    ["happy", "smile"],
    ["thinking", "thinking"],
    ["sleepy", "neutral"],
    ["curious", "neutral"],
  ])("%s → 口 %s", (emotion, mouth) => {
    expect(getMochitRestingExpression(emotion).mouth).toBe(mouth);
  });

  it("sleepy だけまぶたが平常時から少し下がる", () => {
    expect(getMochitRestingExpression("sleepy").eyelidRest).toBe(MOCHIT_SLEEPY_EYELID_REST);
    expect(MOCHIT_SLEEPY_EYELID_REST).toBeGreaterThanOrEqual(0.25);
    expect(MOCHIT_SLEEPY_EYELID_REST).toBeLessThanOrEqual(0.35);
    for (const emotion of ["neutral", "happy", "thinking", "curious"] as const) {
      expect(getMochitRestingExpression(emotion).eyelidRest).toBe(0);
    }
  });

  it("compact では sleepy の半目を弱める", () => {
    const compact = getMochitRestingExpression("sleepy", { compact: true }).eyelidRest;
    expect(compact).toBe(MOCHIT_SLEEPY_EYELID_REST_COMPACT);
    expect(compact).toBeGreaterThan(0);
    expect(compact).toBeLessThan(MOCHIT_SLEEPY_EYELID_REST);
  });

  it("curious は neutral と同じ安全な表示", () => {
    expect(getMochitRestingExpression("curious")).toEqual(getMochitRestingExpression("neutral"));
  });
});

describe("まばたきは平常時のまぶたを基底にする", () => {
  const p = getIdleProfile(false);
  it("rest 省略時は従来と同一（全開→全閉→全開）", () => {
    expect(blinkKeyframes(p, 496)).toEqual(blinkKeyframes(p, 496, 0));
    expect(blinkKeyframes(p, 496)[0].transform).toContain("scale(1, 0.0001)");
    expect(eyelidRestTransform(p, 496)).toContain("scale(1, 0.0001)");
  });

  it("sleepy: 半目 → 全閉 → 半目", () => {
    const frames = blinkKeyframes(p, 496, 0.3);
    expect(frames[0].transform).toContain("scale(1, 0.3)");
    expect(frames[1].transform).toContain("scale(1, 1)");
    expect(frames[frames.length - 1].transform).toContain("scale(1, 0.3)");
    expect(eyelidRestTransform(p, 496, 0.3)).toContain("scale(1, 0.3)");
  });
});

describe("rebaseReactionMouths（Reaction を Behavior の上に重ねる）", () => {
  it("平常口 neutral なら仕様はそのまま（従来と同一）", () => {
    const spec = full("incorrect");
    expect(rebaseReactionMouths(spec, "neutral")).toBe(spec);
  });

  it("happy + incorrect: Smile 基底から Thinking へ切り替わり、終了時は Smile に戻る", () => {
    const spec = rebaseReactionMouths(full("incorrect"), "smile");
    expect(mouthTargets(spec)).toEqual(["mouthSmile", "mouthThinking"]);
    const smile = track(spec, "mouthSmile")!.keyframes;
    expect(smile[0].opacity).toBe(1);
    expect(smile[smile.length - 1].opacity).toBe(1);
    expect(smile.some((f) => f.opacity === 0)).toBe(true);
    // Neutral は平常時に不可視のまま（リアクションで表に出さない）
    expect(track(spec, "mouthNeutral")).toBeUndefined();
    // 元の Neutral と同じクロスフェード形状
    const original = track(full("incorrect"), "mouthNeutral")!.keyframes;
    expect(smile).toEqual(original);
  });

  it("happy + correct: 同じ口なので口は切り替えない", () => {
    const spec = rebaseReactionMouths(full("correct"), "smile");
    expect(mouthTargets(spec)).toEqual([]);
  });

  it("happy + checkpointClear（Open→Smile）: Open の間だけ Smile が隠れる", () => {
    const base = full("checkpointClear");
    const spec = rebaseReactionMouths(base, "smile");
    expect(mouthTargets(spec)).toEqual(["mouthSmile", "mouthOpen"]);
    const smile = track(spec, "mouthSmile")!.keyframes;
    const open = track(base, "mouthOpen")!.keyframes;
    const openOff = open.findLast((f) => f.opacity === 1)!.offset as number;
    expect(smile[0].opacity).toBe(1);
    expect(smile[smile.length - 1].opacity).toBe(1);
    // 再表示は Open が消え始めてから
    expect(smile[3].offset as number).toBeGreaterThan(openOff);
  });

  it("thinking + correct: Thinking 基底から Smile へ", () => {
    const spec = rebaseReactionMouths(full("correct"), "thinking");
    expect(mouthTargets(spec)).toEqual(["mouthThinking", "mouthSmile"]);
    const thinking = track(spec, "mouthThinking")!.keyframes;
    expect(thinking[0].opacity).toBe(1);
    expect(thinking[thinking.length - 1].opacity).toBe(1);
  });

  it("口以外のトラックは変更しない", () => {
    const base = full("taskComplete");
    const spec = rebaseReactionMouths(base, "thinking");
    const others = (s: ReactionSpec) => s.tracks.filter((t) => !MOUTHS.includes(t.target));
    expect(others(spec)).toEqual(others(base));
    expect(spec.totalMs).toBe(base.totalMs);
  });

  it("reduced-motion の縮退版にも適用できる", () => {
    const reduced = buildReactionSpec("incorrect", { reducedMotion: true })!;
    const spec = rebaseReactionMouths(reduced, "smile");
    expect(mouthTargets(spec)).toEqual(["mouthSmile", "mouthThinking"]);
  });

  it("口トラックの無いリアクションはそのまま", () => {
    const spec: ReactionSpec = { event: "tap", totalMs: 100, tracks: [{ target: "armL", keyframes: [] }] };
    expect(rebaseReactionMouths(spec, "smile")).toBe(spec);
  });
});
