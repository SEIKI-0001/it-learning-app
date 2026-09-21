// Behavior State の emotion を、SVG版モチットの「平常時の表情」へ写す純粋ロジック。
// DOM/WAAPIには触れない。MochitSvg.tsx がこの結果を既存SVGノードの
// インラインstyle（=アニメーションの基底値）へ反映する。
//
// 平常表情はリアクションやまばたきの「基底状態」になる:
//   - リアクション（mochitReactionAnimation.ts）は fill:"none" で再生されるため、
//     終了するとここで決めた平常表情へ戻る（neutral へ戻すのではない）。
//   - まばたきは eyelidRest → 閉 → eyelidRest と往復する。

import type { MochitEmotion } from "./mochitBehavior";
import type { ReactionSpec, ReactionTargetId, ReactionTrack } from "./mochitReactionAnimation";

export type MochitRestingMouth = "neutral" | "smile" | "thinking";

export type MochitRestingExpression = {
  mouth: MochitRestingMouth;
  /** 平常時のまぶたの閉じ量（scaleY: 0=全開 〜 1=全閉） */
  eyelidRest: number;
};

/** 平常口 → リアクション仕様のターゲットID */
export type MochitRestingMouthTarget = "mouthNeutral" | "mouthSmile" | "mouthThinking";

export const MOCHIT_RESTING_MOUTH_TARGETS: Record<MochitRestingMouth, MochitRestingMouthTarget> = {
  neutral: "mouthNeutral",
  smile: "mouthSmile",
  thinking: "mouthThinking",
};

/** 平常口 → SVG要素ID */
export const MOCHIT_RESTING_MOUTH_ELEMENT_IDS: Record<MochitRestingMouth, string> = {
  neutral: "Mouth_Neutral",
  smile: "Mouth_Smile",
  thinking: "Mouth_Thinking",
};

// sleepy の半目。compact（小さい表示）では目が潰れて見えないよう弱める。
export const MOCHIT_SLEEPY_EYELID_REST = 0.3;
export const MOCHIT_SLEEPY_EYELID_REST_COMPACT = 0.2;

const RESTING_MOUTH_BY_EMOTION: Record<MochitEmotion, MochitRestingMouth> = {
  neutral: "neutral",
  happy: "smile",
  thinking: "thinking",
  sleepy: "neutral",
  // curious の主表現は Step 3 の視線/向きで行う。口は neutral のまま。
  curious: "neutral",
};

export function getMochitRestingExpression(
  emotion: MochitEmotion,
  options: { compact?: boolean } = {},
): MochitRestingExpression {
  return {
    mouth: RESTING_MOUTH_BY_EMOTION[emotion] ?? "neutral",
    eyelidRest:
      emotion === "sleepy"
        ? options.compact
          ? MOCHIT_SLEEPY_EYELID_REST_COMPACT
          : MOCHIT_SLEEPY_EYELID_REST
        : 0,
  };
}

// ---- リアクションの口トラックを平常口へ付け替える ----

const MOUTH_TARGETS: readonly ReactionTargetId[] = ["mouthNeutral", "mouthSmile", "mouthThinking", "mouthOpen"];

function opacityAt(frame: Keyframe): number {
  return typeof frame.opacity === "number" ? frame.opacity : Number(frame.opacity ?? 0);
}

/** 変形口トラックが見え始める直前 / 消えきった直後の offset。 */
function visibleWindow(track: ReactionTrack): { on: number; off: number } | null {
  const frames = track.keyframes;
  const first = frames.findIndex((frame) => opacityAt(frame) > 0);
  if (first < 0) return null;
  let last = first;
  for (let i = frames.length - 1; i >= 0; i -= 1) {
    if (opacityAt(frames[i]) > 0) {
      last = i;
      break;
    }
  }
  return {
    on: Number(frames[Math.max(first - 1, 0)].offset ?? 0),
    off: Number(frames[Math.min(last + 1, frames.length - 1)].offset ?? 1),
  };
}

/**
 * mochitReactionAnimation.ts の口トラックは「開始/終了時点で Neutral=1」を基底としている。
 * 平常口が Neutral 以外のとき、その基底を平常口へ付け替えた仕様を返す（純関数）。
 *   - Neutral トラック → 平常口トラック（同じクロスフェード形状）。Neutral 自体は触らない
 *     （平常時は不可視のまま）。
 *   - リアクションが平常口と同じ口を出すだけなら、口は切り替えない（トラックを除く）。
 *   - 平常口が Neutral なら仕様をそのまま返す（従来と完全に同一）。
 * 口以外のトラックは一切変更しない。
 */
export function rebaseReactionMouths(spec: ReactionSpec, restingMouth: MochitRestingMouth): ReactionSpec {
  const resting = MOCHIT_RESTING_MOUTH_TARGETS[restingMouth];
  if (resting === "mouthNeutral") return spec;
  const hasMouth = spec.tracks.some((track) => MOUTH_TARGETS.includes(track.target));
  if (!hasMouth) return spec;

  const variants = spec.tracks.filter(
    (track) => MOUTH_TARGETS.includes(track.target) && track.target !== "mouthNeutral" && track.target !== resting,
  );
  const windows = variants.map(visibleWindow).filter((w): w is { on: number; off: number } => w !== null);

  const tracks: ReactionTrack[] = [];
  let placedResting = false;
  for (const track of spec.tracks) {
    if (track.target === "mouthNeutral") {
      // 元の Neutral トラックの位置に平常口トラックを置く（トラック順を保つ）
      if (windows.length > 0) {
        const firstOn = Math.min(...windows.map((w) => w.on));
        const lastOff = Math.max(...windows.map((w) => w.off));
        tracks.push({
          target: resting,
          keyframes: [
            { offset: 0, opacity: 1 },
            { offset: firstOn, opacity: 1 },
            { offset: Math.min(firstOn + 0.06, 1), opacity: 0 },
            { offset: lastOff, opacity: 0 },
            { offset: Math.min(lastOff + 0.05, 1), opacity: 1 },
            { offset: 1, opacity: 1 },
          ],
        });
      }
      placedResting = true;
      continue;
    }
    // 平常口と同じ口を出すトラックは、平常口がすでに見えているので不要
    if (track.target === resting) continue;
    tracks.push(track);
  }
  if (!placedResting) return spec;
  return { ...spec, tracks };
}
