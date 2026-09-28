// 全体の組み立て：シーンの並び、ナレーション、BGM（語りの間は自動で下げる）、効果音、場面転換。
import type { ComponentType } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { Wipe } from "./parts/motion";
import { Cta, ctaCues } from "./scenes/Cta";
import { Goal, goalCues } from "./scenes/Goal";
import { Grow, growCues } from "./scenes/Grow";
import { Hook } from "./scenes/Hook";
import { Learn, learnCues } from "./scenes/Learn";
import { MapScene } from "./scenes/MapScene";
import { Quiz, quizCues } from "./scenes/Quiz";
import { Today, todayCues } from "./scenes/Today";
import { C } from "./theme";
import { SCENES, type Cue, type Scene, type SceneId } from "./timeline";

const VIEWS: Record<SceneId, ComponentType<{ scene: Scene }>> = {
  hook: Hook,
  map: MapScene,
  today: Today,
  learn: Learn,
  quiz: Quiz,
  grow: Grow,
  goal: Goal,
  cta: Cta,
};

const WIPE_COLORS: Partial<Record<SceneId, [string, string]>> = {
  map: [C.sun, C.brand500],
  today: [C.mint, C.brand600],
  learn: [C.sun, C.brand400],
  quiz: [C.orange, C.brand600],
  grow: [C.mint, C.brand500],
  goal: [C.sun, C.brand700],
  cta: [C.mint, C.brand500],
};

const HOOK_CUES = (scene: Scene): Cue[] => [
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: 14 + i * 11, sfx: "pop" as const, volume: 0.28 })),
  { at: scene.lines[1].from - 12, sfx: "thud", volume: 0.8 },
  { at: scene.lines[1].from - 10, sfx: "whoosh", volume: 0.5 },
  { at: scene.lines[1].from - 8, sfx: "sparkle", volume: 0.45 },
];

const SFX_CUES: Partial<Record<SceneId, (scene: Scene) => Cue[]>> = {
  hook: HOOK_CUES,
  map: (scene) => [{ at: scene.frames - 34, sfx: "fanfare", volume: 0.55 }],
  today: todayCues,
  learn: learnCues,
  quiz: quizCues,
  grow: growCues,
  goal: goalCues,
  cta: ctaCues,
};

// 語りの区間（全体フレーム）
const VOICE_SPANS = SCENES.flatMap((s) => s.lines.map((l) => [s.from + l.from, s.from + l.from + l.frames] as const));

function bgmVolume(f: number, total: number) {
  // 語りに近いほど下げる（10フレームかけてなめらかに）
  const near = Math.max(0, ...VOICE_SPANS.map(([a, b]) => interpolate(f, [a - 14, a - 4, b + 4, b + 14], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const base = 0.34 - 0.18 * near;
  const fadeIn = interpolate(f, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(f, [total - 60, total], [1, 0], { extrapolateLeft: "clamp" });
  return base * fadeIn * fadeOut;
}

export function Tutorial() {
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.brand950 }}>
      {SCENES.map((scene) => {
        const View = VIEWS[scene.id];
        const wipe = WIPE_COLORS[scene.id];
        const cues = SFX_CUES[scene.id]?.(scene) ?? [];
        return (
          <Sequence key={scene.id} from={scene.from} durationInFrames={scene.frames} name={scene.id}>
            <View scene={scene} />
            {wipe && <Wipe color={wipe[0]} color2={wipe[1]} />}
            {wipe && <Audio src={staticFile("audio/sfx-whoosh.wav")} volume={0.5} />}
            {scene.lines.map((l) => (
              <Sequence key={l.id} from={l.from} durationInFrames={l.frames + 10} name={`voice:${l.id}`}>
                <Audio src={staticFile(`voice/${l.id}.wav`)} volume={1} />
              </Sequence>
            ))}
            {cues.map((c, i) => (
              <Sequence key={i} from={c.at} name={`sfx:${c.sfx}`}>
                <Audio src={staticFile(`audio/sfx-${c.sfx}.wav`)} volume={c.volume ?? 0.6} />
              </Sequence>
            ))}
          </Sequence>
        );
      })}
      <Audio src={staticFile("audio/bgm-a.wav")} volume={(f) => bgmVolume(f, durationInFrames)} />
    </AbsoluteFill>
  );
}
