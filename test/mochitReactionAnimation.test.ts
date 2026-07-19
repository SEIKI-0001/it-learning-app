import { describe, expect, it } from "vitest";
import {
  buildReactionSpec,
  REACTION_TOTAL_MS,
  type ReactionMode,
  type ReactionTrack,
} from "@/components/mochit/mochitReactionAnimation";
import {
  MOCHIT_EVENT_REACTION_MS,
  MOCHIT_EVENT_TRIGGERS,
  MOCHIT_TRIGGER_EVENTS,
  type MochitEvent,
} from "@/components/mochit/mochitEvents";

// REACTION_TOTAL_MS に振り付けが定義されている8イベント（wakeUpは対象外＝振り付け無し）。
const EVENTS = Object.keys(REACTION_TOTAL_MS) as MochitEvent[];

const FULL: ReactionMode = { compact: false, reducedMotion: false };
const COMPACT: ReactionMode = { compact: true, reducedMotion: false };
const REDUCED: ReactionMode = { compact: false, reducedMotion: true };

// 仕様レンジ（ms）。totalMsはこの範囲に収まる。
const SPEC_RANGE_MS: Partial<Record<MochitEvent, { min: number; max: number }>> = {
  correct: { min: 600, max: 900 },
  incorrect: { min: 700, max: 1200 },
  allCorrect: { min: 1000, max: 1500 },
  taskComplete: { min: 1200, max: 1800 },
  badgeEarned: { min: 1200, max: 1800 },
  checkpointClear: { min: 1800, max: 2800 },
  tap: { min: 400, max: 700 },
  encourage: { min: 0, max: 1000 },
};

function offsetsOf(track: ReactionTrack): number[] {
  return track.keyframes.map((kf) => kf.offset as number);
}

function translateYPercentValues(track: ReactionTrack): number[] {
  return track.keyframes.map((kf) => {
    const match = String(kf.transform).match(/translateY\(([-\d.]+)%\)/);
    if (!match) throw new Error(`translateYが見つかりません: ${String(kf.transform)}`);
    return Number(match[1]);
  });
}

describe("buildReactionSpec: 時間", () => {
  it("totalMsは仕様レンジ内に収まる", () => {
    for (const event of EVENTS) {
      const { min, max } = SPEC_RANGE_MS[event]!;
      const totalMs = REACTION_TOTAL_MS[event]!;
      expect(totalMs).toBeGreaterThanOrEqual(min);
      expect(totalMs).toBeLessThanOrEqual(max);
    }
  });

  it("totalMsは優先度制御の占有時間（MOCHIT_EVENT_REACTION_MS）以下に収まる", () => {
    for (const event of EVENTS) {
      const totalMs = REACTION_TOTAL_MS[event]!;
      expect(totalMs).toBeLessThanOrEqual(MOCHIT_EVENT_REACTION_MS[event]);
    }
  });

  it("full/compact/reducedいずれのモードでもspec.totalMsはREACTION_TOTAL_MSと一致する", () => {
    for (const event of EVENTS) {
      for (const mode of [FULL, COMPACT, REDUCED]) {
        const spec = buildReactionSpec(event, mode);
        expect(spec).not.toBeNull();
        expect(spec!.totalMs).toBe(REACTION_TOTAL_MS[event]);
      }
    }
  });
});

describe("buildReactionSpec: キーフレーム整合", () => {
  it("全トラックのoffsetは0で始まり1で終わり単調非減少", () => {
    for (const event of EVENTS) {
      for (const mode of [FULL, COMPACT, REDUCED]) {
        const spec = buildReactionSpec(event, mode)!;
        for (const track of spec.tracks) {
          const offsets = offsetsOf(track);
          expect(offsets[0]).toBe(0);
          expect(offsets[offsets.length - 1]).toBe(1);
          for (let i = 1; i < offsets.length; i++) {
            expect(offsets[i]).toBeGreaterThanOrEqual(offsets[i - 1]);
          }
        }
      }
    }
  });
});

describe("buildReactionSpec: 基底復帰（位置飛びなし）", () => {
  it("transformを持つトラックは最初と最後のtransformが同一（基底に戻る）", () => {
    for (const event of EVENTS) {
      for (const mode of [FULL, COMPACT]) {
        const spec = buildReactionSpec(event, mode)!;
        for (const track of spec.tracks) {
          const first = track.keyframes[0];
          const last = track.keyframes[track.keyframes.length - 1];
          if (first.transform === undefined) continue;
          expect(String(last.transform)).toBe(String(first.transform));
        }
      }
    }
  });

  it("bodyトラックの基底はtranslateY(0%) rotate(0deg) scale(1, 1)", () => {
    for (const event of EVENTS) {
      for (const mode of [FULL, COMPACT]) {
        const spec = buildReactionSpec(event, mode)!;
        const body = spec.tracks.find((t) => t.target === "body")!;
        expect(String(body.keyframes[0].transform)).toBe("translateY(0%) rotate(0deg) scale(1, 1)");
        expect(String(body.keyframes[body.keyframes.length - 1].transform)).toBe(
          "translateY(0%) rotate(0deg) scale(1, 1)",
        );
      }
    }
  });
});

describe("buildReactionSpec: 口の復帰", () => {
  it("mouthNeutralはoffset0/1でopacity1、変形口（Smile/Thinking/Open）はoffset0/1でopacity0", () => {
    for (const event of EVENTS) {
      for (const mode of [FULL, COMPACT, REDUCED]) {
        const spec = buildReactionSpec(event, mode)!;
        for (const track of spec.tracks) {
          if (track.target === "mouthNeutral") {
            expect(track.keyframes[0].opacity).toBe(1);
            expect(track.keyframes[track.keyframes.length - 1].opacity).toBe(1);
          } else if (
            track.target === "mouthSmile" ||
            track.target === "mouthThinking" ||
            track.target === "mouthOpen"
          ) {
            expect(track.keyframes[0].opacity).toBe(0);
            expect(track.keyframes[track.keyframes.length - 1].opacity).toBe(0);
          }
        }
      }
    }
  });
});

describe("buildReactionSpec: Core発光", () => {
  it("coreGlowのopacityは全キーフレームで0〜1", () => {
    for (const event of EVENTS) {
      for (const mode of [FULL, COMPACT, REDUCED]) {
        const spec = buildReactionSpec(event, mode)!;
        const glow = spec.tracks.find((t) => t.target === "coreGlow");
        if (!glow) continue;
        for (const kf of glow.keyframes) {
          expect(kf.opacity as number).toBeGreaterThanOrEqual(0);
          expect(kf.opacity as number).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("incorrectにはcoreGlowトラックが無い（否定的でない＝無発光の設計）", () => {
    for (const mode of [FULL, COMPACT, REDUCED]) {
      const spec = buildReactionSpec("incorrect", mode)!;
      expect(spec.tracks.find((t) => t.target === "coreGlow")).toBeUndefined();
    }
  });
});

describe("buildReactionSpec: compact抑制", () => {
  it("compactのbody移動量はfullより小さく、3%以下（大ジャンプなし）", () => {
    for (const event of EVENTS) {
      const fullSpec = buildReactionSpec(event, FULL)!;
      const compactSpec = buildReactionSpec(event, COMPACT)!;
      const fullBody = fullSpec.tracks.find((t) => t.target === "body")!;
      const compactBody = compactSpec.tracks.find((t) => t.target === "body")!;
      const fullMax = Math.max(...translateYPercentValues(fullBody).map(Math.abs));
      const compactMax = Math.max(...translateYPercentValues(compactBody).map(Math.abs));
      expect(compactMax).toBeLessThan(fullMax);
      expect(compactMax).toBeLessThanOrEqual(3);
    }
  });
});

describe("buildReactionSpec: reduced-motion", () => {
  it("全トラックのキーフレームにtransformプロパティが存在しない（opacityのみ）", () => {
    for (const event of EVENTS) {
      const spec = buildReactionSpec(event, REDUCED)!;
      for (const track of spec.tracks) {
        for (const kf of track.keyframes) {
          expect(kf.transform).toBeUndefined();
        }
      }
    }
  });

  it("coreGlowのピークは0.35以下", () => {
    for (const event of EVENTS) {
      const spec = buildReactionSpec(event, REDUCED)!;
      const glow = spec.tracks.find((t) => t.target === "coreGlow");
      if (!glow) continue;
      const peak = Math.max(...glow.keyframes.map((kf) => kf.opacity as number));
      expect(peak).toBeLessThanOrEqual(0.35);
    }
  });

  it("incorrectのreducedにはcoreGlowが無い", () => {
    const spec = buildReactionSpec("incorrect", REDUCED)!;
    expect(spec.tracks.find((t) => t.target === "coreGlow")).toBeUndefined();
  });
});

describe("buildReactionSpec: checkpointClearのジャンプ", () => {
  it("bodyトラックの大ジャンプ（translateY<=-3%）は連続した1区間のみ（連続ジャンプなし）", () => {
    const spec = buildReactionSpec("checkpointClear", FULL)!;
    const body = spec.tracks.find((t) => t.target === "body")!;
    const jumpFlags = translateYPercentValues(body).map((y) => y <= -3);
    let regions = 0;
    let inRegion = false;
    for (const isJump of jumpFlags) {
      if (isJump && !inRegion) {
        regions += 1;
        inRegion = true;
      } else if (!isJump) {
        inRegion = false;
      }
    }
    expect(regions).toBe(1);
  });
});

describe("buildReactionSpec: wakeUp", () => {
  it("wakeUpは振り付けが無く常にnull", () => {
    for (const mode of [FULL, COMPACT, REDUCED]) {
      expect(buildReactionSpec("wakeUp", mode)).toBeNull();
    }
  });
});

describe("mochitEvents: 逆引きマップ", () => {
  it("MOCHIT_TRIGGER_EVENTS[MOCHIT_EVENT_TRIGGERS[event]] === eventが全イベントで成立", () => {
    for (const event of Object.keys(MOCHIT_EVENT_TRIGGERS) as MochitEvent[]) {
      expect(MOCHIT_TRIGGER_EVENTS[MOCHIT_EVENT_TRIGGERS[event]]).toBe(event);
    }
  });
});
