// 8. サイクル：理解する → 測る → 次を決める が輪になって回り、「合格の日まで」。
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Mochit } from "../parts/Mochit";
import { Paper, PenLine, Rise, easeInOutCubic, progress } from "../parts/motion";
import { BODY, C, DISP } from "../theme";
import type { Scene } from "../timeline";

const CX = 580;
const CY = 600;
const R = 300;
const NODES = [
  { t: "理解する", a: -90 },
  { t: "測る", a: 30 },
  { t: "次を決める", a: 150 },
];
const ARC = "#b7c2e6";
const rad = (d: number) => (d * Math.PI) / 180;

/** 時計回りの弧の終点 (x, y)・角度 th に付ける矢じり */
function arrowHead(x: number, y: number, th: number, len = 24) {
  const tx = -Math.sin(th);
  const ty = Math.cos(th); // 進行方向（接線）
  const wing = (sign: number) => {
    const a = Math.PI - sign * 0.55;
    const bx = tx * Math.cos(a) - ty * Math.sin(a);
    const by = tx * Math.sin(a) + ty * Math.cos(a);
    return `${x + bx * len} ${y + by * len}`;
  };
  return `M ${wing(1)} L ${x} ${y} L ${wing(-1)}`;
}

export function Cycle({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const [l] = scene.lines;
  const loop = l.onsets[3];
  const goal = l.onsets[4];
  // 語に合わせて順に点灯し、「このサイクルを」からは光が輪を回り続ける
  const runner = frame < loop ? null : ((frame - loop) / 40) * 360 - 90;
  const active = (i: number) => {
    if (runner === null) return frame >= l.onsets[i] ? (i === [0, 1, 2].filter((k) => frame >= l.onsets[k]).at(-1) ? 1 : 0.35) : 0;
    const d = (((runner - NODES[i].a) % 360) + 360) % 360;
    return d < 70 ? 1 : 0.35;
  };

  return (
    <AbsoluteFill>
      <Paper />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {NODES.map((n, i) => {
          // 上の札は横に長いので、そこへ出入りする弧は大きめに離す（矢じりが札に隠れないように）
          const from = n.a + (i === 0 ? 36 : 22);
          const to = NODES[(i + 1) % 3].a + (i === 2 ? 360 : 0) - (i === 2 ? 36 : 22);
          const p = progress(frame, l.onsets[Math.min(i + 1, 2)] - (i === 2 ? -30 : 10), 18, easeInOutCubic);
          const end = from + (to - from) * p;
          const large = end - from > 180 ? 1 : 0;
          const x1 = CX + R * Math.cos(rad(from));
          const y1 = CY + R * Math.sin(rad(from));
          const x2 = CX + R * Math.cos(rad(end));
          const y2 = CY + R * Math.sin(rad(end));
          return (
            <g key={i} opacity={p > 0 ? 1 : 0}>
              <path d={`M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`} fill="none" stroke={ARC} strokeWidth={8} strokeLinecap="round" />
              {p > 0.95 && <path d={arrowHead(x2, y2, rad(end))} fill="none" stroke={ARC} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />}
            </g>
          );
        })}
        {runner !== null && (
          <circle cx={CX + R * Math.cos(rad(runner))} cy={CY + R * Math.sin(rad(runner))} r={14} fill={C.ai} opacity={progress(frame, loop, 10)} />
        )}
      </svg>

      <div style={{ position: "absolute", left: CX - 110, top: CY - 120, opacity: progress(frame, 2, 20) }}>
        <Mochit size={220} mood="smile" glow={progress(frame, goal, 20) * 0.9} />
      </div>

      {NODES.map((n, i) => {
        const x = CX + R * Math.cos(rad(n.a));
        const y = CY + R * Math.sin(rad(n.a));
        const p = progress(frame, l.onsets[i] - 2, 18);
        const on = active(i);
        return (
          <div
            key={n.t}
            style={{
              position: "absolute",
              left: x - 150,
              top: y - 62,
              width: 300,
              height: 124,
              borderRadius: 62,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: on === 1 ? C.ai : C.white,
              border: `3px solid ${on === 1 ? C.ai : C.line}`,
              boxShadow: on === 1 ? "0 18px 40px rgba(41,70,206,0.28)" : "0 10px 24px rgba(26,35,64,0.08)",
              fontFamily: DISP,
              fontWeight: 600,
              fontSize: 50,
              color: on === 1 ? C.white : C.ink,
              opacity: p,
              transform: `scale(${0.8 + p * 0.2})`,
            }}
          >
            <span style={{ fontFamily: BODY, fontSize: 26, fontWeight: 700, marginRight: 14, opacity: 0.7 }}>{i + 1}</span>
            {n.t}
          </div>
        );
      })}

      <div style={{ position: "absolute", left: 1060, top: 390 }}>
        <Rise runs="このサイクルを、" at={loop} size={76} color={C.sub} weight={500} />
        <div style={{ position: "relative", marginTop: 14 }}>
          <Rise runs={[{ t: "合格の日", color: C.ai }, { t: "まで。" }]} at={goal} size={104} />
          <PenLine width={430} at={goal + 18} stroke={10} style={{ left: 0, top: 138 }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}
