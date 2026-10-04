// 全体の組み立て：シーンの並びと場面転換、ナレーション、BGM（語りの間は自動で下げる）、効果音。
import type { ComponentType } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, easeInOutCubic } from "./parts/motion";
import { Cta } from "./scenes/Cta";
import { Cycle } from "./scenes/Cycle";
import { Hook } from "./scenes/Hook";
import { Lost } from "./scenes/Lost";
import { IRIS, Pivot } from "./scenes/Pivot";
import { Learn, Measure, Next } from "./scenes/Steps";
import { Term } from "./scenes/Term";
import { C } from "./theme";
import { SCENES, XF, type Cue, type Scene, type SceneId } from "./timeline";

const VIEWS: Record<SceneId, ComponentType<{ scene: Scene }>> = {
  hook: Hook,
  term: Term,
  lost: Lost,
  pivot: Pivot,
  learn: Learn,
  measure: Measure,
  next: Next,
  cycle: Cycle,
  cta: Cta,
};

// 効果音は控えめに。語りと音楽の邪魔をせず、動きの「着地」を少しだけ支える
const CUES: Record<SceneId, (s: Scene) => Cue[]> = {
  hook: () => [],
  term: () => [{ at: 0, sfx: "whoosh", volume: 0.22 }],
  lost: () => [{ at: 0, sfx: "whoosh", volume: 0.22 }],
  pivot: (s) => [
    { at: IRIS.start - 2, sfx: "bloom", volume: 0.36 },
    { at: IRIS.start + 12, sfx: "pop", volume: 0.35 },
    { at: s.lines[0].onsets[0] + 34, sfx: "mark", volume: 0.3 },
  ],
  learn: () => [{ at: 0, sfx: "whoosh", volume: 0.2 }],
  measure: (s) => {
    const tap = s.lines[0].onsets[1] + 14;
    return [
      { at: 0, sfx: "whoosh", volume: 0.2 },
      { at: tap, sfx: "tap", volume: 0.5 },
      { at: tap + 4, sfx: "correct", volume: 0.42 },
    ];
  },
  next: (s) => [
    { at: 0, sfx: "whoosh", volume: 0.2 },
    { at: s.lines[0].onsets[2] + 8, sfx: "mark", volume: 0.28 },
    { at: s.lines[1].from - 12, sfx: "whoosh", volume: 0.16 },
  ],
  cycle: (s) => [
    { at: 0, sfx: "whoosh", volume: 0.2 },
    ...[0, 1, 2].map((i) => ({ at: s.lines[0].onsets[i], sfx: "chime" as const, volume: 0.2 + i * 0.04 })),
  ],
  cta: (s) => [
    { at: 0, sfx: "bloom", volume: 0.32 },
    { at: s.lines[0].onsets[2], sfx: "pop", volume: 0.3 },
  ],
};

/** 効果音全体の音量（声 -20 LUFS に対して控えめに） */
const SFX_GAIN = 0.7;

// 語りの区間（全体フレーム）
const VOICE_SPANS = SCENES.flatMap((s) => s.lines.map((l) => [s.from + l.from, s.from + l.from + l.frames] as const));

export function bgmVolume(f: number, total: number) {
  // 声（各行 -20 LUFS）に対し、語りの下では約 14dB 下、語りの間でも約 6dB 下に収める。
  // 前後 12 フレームでなめらかに上げ下げする
  const near = Math.max(0, ...VOICE_SPANS.map(([a, b]) => interpolate(f, [a - 12, a - 2, b + 6, b + 18], [0, 1, 1, 0], clamp)));
  const base = 0.28 - 0.17 * near;
  const fadeIn = interpolate(f, [0, 30], [0, 1], clamp);
  const fadeOut = interpolate(f, [total - 75, total], [1, 0], clamp);
  return base * fadeIn * fadeOut;
}

/** 次のシーンが前のシーンの上に、少し寄りながら溶けて入る */
function Enter({ children, first }: { children: React.ReactNode; first: boolean }) {
  const frame = useCurrentFrame();
  if (first) return <>{children}</>;
  const p = easeInOutCubic(interpolate(frame, [0, XF], [0, 1], clamp));
  return <AbsoluteFill style={{ opacity: p, transform: `scale(${1.025 - p * 0.025})` }}>{children}</AbsoluteFill>;
}

export function LpStory() {
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.night }}>
      {SCENES.map((scene, i) => {
        const View = VIEWS[scene.id];
        const last = i === SCENES.length - 1;
        return (
          <Sequence key={scene.id} from={scene.from} durationInFrames={scene.frames + (last ? 0 : XF)} name={scene.id}>
            <Enter first={i === 0}>
              <View scene={scene} />
            </Enter>
            {scene.lines.map((l) => (
              <Sequence key={l.id} from={l.from} durationInFrames={l.frames + 10} name={`voice:${l.id}`}>
                <Audio src={staticFile(`voice/${l.id}.wav`)} volume={1} />
              </Sequence>
            ))}
            {CUES[scene.id](scene).map((c, k) => (
              <Sequence key={k} from={c.at} name={`sfx:${c.sfx}`}>
                <Audio src={staticFile(`audio/sfx-${c.sfx}.wav`)} volume={(c.volume ?? 0.4) * SFX_GAIN} />
              </Sequence>
            ))}
          </Sequence>
        );
      })}
      <Audio src={staticFile("audio/bgm.wav")} volume={(f) => bgmVolume(f, durationInFrames)} />
    </AbsoluteFill>
  );
}
