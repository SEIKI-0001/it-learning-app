// 3. 悩み②「迷う」：いまの自分から道が3本に分かれ、どれに進めばいいか決められない。
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Eyebrow, Night, Rise, clamp, easeInOutCubic, progress } from "../parts/motion";
import { BODY, C } from "../theme";
import type { Scene } from "../timeline";

const SHU_ON_DARK = "#ff8a73";
const ORIGIN = { x: 330, y: 680 };
const CARD_X = 1060;
const OPTIONS = [
  { t: "復習する？", y: 500 },
  { t: "過去問に進む？", y: 680 },
  { t: "このペースで、間に合う？", y: 860 },
];

export function Lost({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const [l1, l2] = scene.lines;
  const originIn = progress(frame, l1.onsets[1] + 6, 18);
  // 決められずに揺れる
  const sway = Math.sin(frame / 7) * interpolate(frame, [l2.onsets[3], l2.onsets[3] + 20], [0, 1], clamp);
  const urgent = progress(frame, l2.onsets[3], 14);

  return (
    <AbsoluteFill>
      <Night />
      <div style={{ position: "absolute", left: 150, top: 110 }}>
        <Eyebrow text="つまずき 2 ｜ 迷う" at={4} color={C.mist} size={30} />
      </div>
      <div style={{ position: "absolute", left: 150, top: 190 }}>
        <Rise runs="それに、次に何をすればいいか、" at={l1.onsets[0] + 2} size={76} color={C.mist} weight={500} stagger={1.4} />
        <Rise runs="決められない。" at={l1.onsets[2]} size={110} color={C.white} style={{ marginTop: 6 }} />
      </div>

      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {OPTIONS.map((o, i) => {
          const p = progress(frame, l2.onsets[i] - 6, 20, easeInOutCubic);
          const d = `M ${ORIGIN.x} ${ORIGIN.y} C ${ORIGIN.x + 360} ${ORIGIN.y}, ${CARD_X - 380} ${o.y}, ${CARD_X - 24} ${o.y}`;
          return (
            <path key={i} d={d} fill="none" stroke={i === 2 && urgent > 0 ? SHU_ON_DARK : "rgba(201,209,236,0.55)"} strokeWidth={4} strokeDasharray="2 14" strokeLinecap="round" pathLength={1000} strokeDashoffset={0} style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }} />
          );
        })}
      </svg>

      <div style={{ position: "absolute", left: ORIGIN.x - 22, top: ORIGIN.y - 22, width: 44, height: 44, borderRadius: "50%", background: C.white, opacity: originIn, transform: `scale(${originIn}) translateX(${sway * 6}px)`, boxShadow: "0 0 0 12px rgba(255,255,255,0.12)" }} />
      <div style={{ position: "absolute", left: ORIGIN.x - 60, top: ORIGIN.y + 44, width: 120, textAlign: "center", fontFamily: BODY, fontWeight: 700, fontSize: 32, color: C.mist, opacity: originIn }}>いま</div>

      {OPTIONS.map((o, i) => {
        const at = l2.onsets[i] + 6;
        const p = progress(frame, at, 20);
        const hot = i === 2 ? urgent : 0;
        return (
          <div
            key={o.t}
            style={{
              position: "absolute",
              left: CARD_X,
              top: o.y - 52,
              height: 104,
              padding: "0 40px",
              display: "flex",
              alignItems: "center",
              gap: 22,
              borderRadius: 22,
              background: "rgba(255,255,255,0.07)",
              border: `2px solid ${hot ? SHU_ON_DARK : "rgba(201,209,236,0.28)"}`,
              fontFamily: BODY,
              fontWeight: 600,
              fontSize: 46,
              color: C.white,
              opacity: p,
              transform: `translateX(${(1 - p) * 40}px) translateY(${Math.sin((frame + i * 20) / 18) * 4}px)`,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ width: 14, height: 14, borderRadius: "50%", background: hot ? SHU_ON_DARK : C.mist }} />
            {o.t}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
