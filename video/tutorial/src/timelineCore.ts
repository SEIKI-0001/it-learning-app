// ナレーションの実際の長さ（voice-manifest.json）からシーンの尺を組み立てる純粋関数。
// 動画（timeline.ts）と字幕生成（scripts/vtt.mjs）が同じ計算を使うよう、import を持たない。

export const FPS = 30;

export type ManifestLine = { id: string; scene: string; caption: string; seconds: number };

export type SceneId = "hook" | "map" | "today" | "learn" | "quiz" | "grow" | "goal" | "cta";

export const SCENE_ORDER: SceneId[] = ["hook", "map", "today", "learn", "quiz", "grow", "goal", "cta"];

// 各シーンの「語り出しまでの間」「行間」「語り終わりの余韻」（秒）
const PAD: Record<SceneId, { pre: number; gap: number; post: number }> = {
  hook: { pre: 0.9, gap: 1.1, post: 0.5 },
  map: { pre: 0.5, gap: 0.3, post: 1.3 },
  today: { pre: 0.4, gap: 0.3, post: 1.1 },
  learn: { pre: 0.4, gap: 0.3, post: 2.0 },
  quiz: { pre: 0.5, gap: 0.3, post: 1.6 },
  grow: { pre: 0.4, gap: 0.3, post: 1.4 },
  goal: { pre: 0.4, gap: 0.3, post: 1.2 },
  cta: { pre: 0.5, gap: 0.3, post: 3.2 },
};

export type VoiceLine = { id: string; caption: string; from: number; frames: number };
export type Scene = { id: SceneId; from: number; frames: number; lines: VoiceLine[] };

const sec = (s: number) => Math.round(s * FPS);

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
        out.push({ id: l.id, caption: l.caption, from: t, frames: sec(l.seconds) });
        t += sec(l.seconds);
      });
    const frames = t + sec(pad.post);
    const scene = { id, from: cursor, frames, lines: out };
    cursor += frames;
    return scene;
  });
}


/** シーン内の効果音（シーン先頭からのフレーム） */
export type Cue = { at: number; sfx: "pop" | "correct" | "coin" | "whoosh" | "fanfare" | "sparkle" | "tick" | "thud"; volume?: number };
