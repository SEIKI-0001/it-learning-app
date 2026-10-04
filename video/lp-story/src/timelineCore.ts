// ナレーションの実際の長さ（voice-manifest.json）からシーンの尺を組み立てる純粋関数。
// 動画（timeline.ts）・字幕（scripts/vtt.mjs）・BGM（scripts/synth-audio.mjs）が同じ計算を使うよう、import を持たない。

export const FPS = 30;
/** 場面転換で前後のシーンが重なるフレーム数 */
export const XF = 14;

export type ManifestLine = { id: string; scene: string; caption: string; seconds: number; onsets: number[] };

export type SceneId = "hook" | "term" | "lost" | "pivot" | "learn" | "measure" | "next" | "cycle" | "cta";

export const SCENE_ORDER: SceneId[] = ["hook", "term", "lost", "pivot", "learn", "measure", "next", "cycle", "cta"];

// 各シーンの「語り出しまでの間」「行間」「語り終わりの余韻」（秒）
const PAD: Record<SceneId, { pre: number; gap: number; post: number }> = {
  hook: { pre: 1.0, gap: 0.9, post: 0.6 },
  term: { pre: 0.5, gap: 0.6, post: 0.7 },
  lost: { pre: 0.4, gap: 0.5, post: 0.8 },
  pivot: { pre: 1.3, gap: 0.4, post: 1.2 },
  learn: { pre: 0.5, gap: 0.4, post: 1.6 },
  measure: { pre: 0.4, gap: 0.4, post: 1.8 },
  next: { pre: 0.4, gap: 0.9, post: 1.5 },
  cycle: { pre: 0.5, gap: 0.4, post: 1.2 },
  cta: { pre: 0.7, gap: 0.4, post: 3.4 },
};

/** from / frames / onsets はシーン先頭からのフレーム */
export type VoiceLine = { id: string; caption: string; from: number; frames: number; onsets: number[] };
export type Scene = { id: SceneId; from: number; frames: number; lines: VoiceLine[] };

export const sec = (s: number) => Math.round(s * FPS);

export function buildScenes(lines: ManifestLine[]): Scene[] {
  let cursor = 0;
  return SCENE_ORDER.map((id) => {
    const pad = PAD[id];
    const out: VoiceLine[] = [];
    let t = sec(pad.pre);
    lines
      .filter((l) => l.scene === id)
      .forEach((l, i) => {
        if (i > 0) t += sec(pad.gap);
        out.push({ id: l.id, caption: l.caption, from: t, frames: sec(l.seconds), onsets: l.onsets.map((o) => t + sec(o)) });
        t += sec(l.seconds);
      });
    const frames = t + sec(pad.post);
    const scene = { id, from: cursor, frames, lines: out };
    cursor += frames;
    return scene;
  });
}

/** シーン内の効果音（シーン先頭からのフレーム） */
export type Cue = { at: number; sfx: "whoosh" | "rise" | "bloom" | "pop" | "tap" | "correct" | "mark" | "chime"; volume?: number };
