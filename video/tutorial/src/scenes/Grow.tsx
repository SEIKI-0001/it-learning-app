// 6. 育つ：バッジが集まり、連続学習が伸び、モチットも成長（lib/mochit.ts の3段階）していく。
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Mochit } from "../parts/Mochit";
import { Backdrop, Kinetic, Sparkle, clamp, usePop } from "../parts/motion";
import { C, FONT } from "../theme";
import type { Cue, Scene } from "../timeline";

// lib/badges.ts に実在するバッジ
const BADGES = [
  { label: "テクノロジ探訪", icon: "🛰️", x: 330, y: 330, at: 14, c: C.brand500 },
  { label: "確認問題20突破", icon: "🎯", x: 1590, y: 300, at: 26, c: C.orange },
  { label: "全体像マスター", icon: "🗺️", x: 300, y: 740, at: 38, c: C.green },
  { label: "満点コレクター", icon: "💯", x: 1610, y: 720, at: 50, c: C.purple },
];
const STAGES = [
  { label: "はじまり", at: 0 },
  { label: "成長期", at: 64 },
  { label: "つながりの達人", at: 104 },
];

export const growCues = (): Cue[] => [
  ...BADGES.map((b) => ({ at: b.at, sfx: "pop" as const, volume: 0.5 })),
  { at: STAGES[1].at, sfx: "sparkle", volume: 0.45 },
  { at: STAGES[2].at, sfx: "fanfare", volume: 0.5 },
];

export function Grow({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const stage = STAGES.reduce((n, s, i) => (frame >= s.at ? i : n), 0);
  const glow = interpolate(frame, [STAGES[1].at, STAGES[1].at + 10, STAGES[2].at, STAGES[2].at + 12], [0, 0.45, 0.45, 1], clamp);
  const jump = usePop(STAGES[stage].at, { damping: 7, stiffness: 200 });
  const streak = Math.min(7, 1 + Math.floor(interpolate(frame, [20, 110], [0, 6.99], clamp)));

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop from={C.brand700} to="#0C1B3A" seed={51} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 55%, rgba(109,238,254,${0.35 * glow}), transparent 45%)` }} />
      <div style={{ position: "absolute", top: 70, width: "100%" }}>
        <Kinetic start={scene.lines[0].from - 6} size={88} align="center" segs={[{ t: "続けるほど、" }, { t: "ぼくも成長！", color: C.mint }]} />
      </div>

      <div style={{ position: "absolute", left: 960 - 280, top: 250, transform: `translateY(${(1 - jump) * -60}px) scale(${1 + stage * 0.06})`, transformOrigin: "50% 100%" }}>
        <Mochit size={560} mood={stage === 2 ? "open" : "smile"} glow={glow} wave={stage === 2} />
      </div>
      <div style={{ position: "absolute", top: 840, width: "100%", display: "flex", justifyContent: "center", gap: 18 }}>
        {STAGES.map((s, i) => (
          <div key={s.label} style={{ padding: "12px 30px", borderRadius: 999, fontSize: 34, fontWeight: 800, background: i <= stage ? C.mint : "rgba(255,255,255,0.12)", color: i <= stage ? C.navy : "rgba(255,255,255,0.5)", transform: i === stage ? `scale(${0.85 + jump * 0.15})` : undefined }}>
            {s.label}
          </div>
        ))}
      </div>

      {BADGES.map((b) => (
        <Badge key={b.label} badge={b} />
      ))}

      <div style={{ position: "absolute", left: 960 - 170, top: 960, width: 340, textAlign: "center", fontSize: 40, fontWeight: 900, color: C.sun }}>
        🔥 {streak}日連続
      </div>
      {frame > STAGES[2].at &&
        [0, 1, 2, 3, 4].map((i) => (
          <Sparkle key={i} x={[760, 1180, 700, 1240, 960][i]} y={[330, 300, 620, 640, 240][i]} size={[70, 90, 50, 60, 80][i]} delay={STAGES[2].at + i * 5} color={i % 2 ? C.mint : C.sun} />
        ))}
    </AbsoluteFill>
  );
}

function Badge({ badge }: { badge: (typeof BADGES)[number] }) {
  const frame = useCurrentFrame();
  const p = usePop(badge.at, { damping: 9, stiffness: 150 });
  const flip = interpolate(p, [0, 1], [180, 0]);
  const float = Math.sin((frame + badge.at * 5) / 15) * 12;
  return (
    <div style={{ position: "absolute", left: badge.x, top: badge.y + float, transform: `translate(-50%,-50%) perspective(800px) rotateY(${flip}deg) scale(${p})`, textAlign: "center" }}>
      <div style={{ width: 190, height: 190, margin: "0 auto", borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #fff, ${badge.c})`, border: "8px solid #FFE08A", boxShadow: "0 18px 40px rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 92 }}>
        {badge.icon}
      </div>
      <div style={{ marginTop: 16, padding: "8px 22px", borderRadius: 999, background: "rgba(255,255,255,0.95)", color: C.navy, fontSize: 30, fontWeight: 800, whiteSpace: "nowrap" }}>{badge.label}</div>
    </div>
  );
}
