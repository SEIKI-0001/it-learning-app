// 8. 呼びかけ：モチットが手招きして「冒険をはじめよう！」。ボタン文言は /tutorial の終了後 CTA と同じ。
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Mochit } from "../parts/Mochit";
import { Backdrop, Confetti, Kinetic, Sparkle, clamp, usePop } from "../parts/motion";
import { C, FONT } from "../theme";
import type { Cue, Scene } from "../timeline";

export const ctaCues = (scene: Scene): Cue[] => [
  { at: 6, sfx: "pop", volume: 0.5 },
  { at: scene.lines[0].from + scene.lines[0].frames + 2, sfx: "fanfare", volume: 0.6 },
];

export function Cta({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const line = scene.lines[0];
  const mochit = usePop(4, { damping: 9, stiffness: 140 });
  const btnAt = line.from + line.frames - 10;
  const btn = usePop(btnAt, { damping: 8, stiffness: 180 });
  const pulse = frame > btnAt + 12 ? 1 + Math.sin((frame - btnAt) / 5) * 0.035 : 1;
  const fadeOut = interpolate(frame, [scene.frames - 16, scene.frames], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ fontFamily: FONT, opacity: fadeOut }}>
      <Backdrop from={C.brand400} to={C.brand800} seed={71} />
      <div style={{ position: "absolute", left: 120, top: 200, transform: `scale(${mochit}) rotate(${(1 - mochit) * -20}deg)`, transformOrigin: "50% 100%" }}>
        <Mochit size={720} mood={frame >= line.from && frame < line.from + line.frames ? "talk" : "smile"} wave />
      </div>
      <div style={{ position: "absolute", left: 860, top: 220 }}>
        <div style={{ color: C.mint, fontSize: 44, fontWeight: 800, marginBottom: 20 }}>ITパスポート学習コーチ</div>
        <Kinetic start={line.from - 4} size={106} segs={[{ t: "さあ、" }, { t: "\n" }, { t: "冒険", color: C.sun }, { t: "をはじめよう！" }]} />
        <div
          style={{
            marginTop: 60,
            display: "inline-block",
            padding: "34px 70px",
            borderRadius: 999,
            background: C.white,
            color: C.brand800,
            fontSize: 52,
            fontWeight: 900,
            boxShadow: `0 20px 50px rgba(0,0,0,0.3), 0 0 0 ${Math.max(0, (pulse - 1) * 400)}px rgba(255,255,255,0.25)`,
            transform: `scale(${btn * pulse})`,
          }}
        >
          自分の学習プランをつくる →
        </div>
      </div>
      <Confetti start={btnAt + 4} x={1300} y={700} count={80} seed={9} spread={1100} />
      <Sparkle x={1780} y={200} size={90} delay={btnAt} />
      <Sparkle x={820} y={180} size={60} delay={btnAt + 8} color={C.mint} />
      <div style={{ position: "absolute", right: 40, bottom: 26, fontSize: 22, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>ナレーション VOICEVOX:春日部つむぎ</div>
    </AbsoluteFill>
  );
}
