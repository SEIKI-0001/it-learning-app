// 4. 転換：夜から白い紙面へ開き、サービス名とモチットが登場。「分からない」と「迷う」をまとめて解決。
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Mochit } from "../parts/Mochit";
import { Night, Paper, PenCircle, Rise, clamp, easeInOutCubic, easeOutExpo, progress } from "../parts/motion";
import { C } from "../theme";
import type { Scene } from "../timeline";

export const IRIS = { x: 960, y: 300, start: 4, dur: 30 };

export function Pivot({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  const [l] = scene.lines;
  const iris = progress(frame, IRIS.start, IRIS.dur, easeInOutCubic);
  const radius = iris * 2300;
  const pop = progress(frame, IRIS.start + 10, 26, easeOutExpo);
  const solve = l.onsets[3];

  return (
    <AbsoluteFill>
      <Night />
      <AbsoluteFill style={{ clipPath: `circle(${radius}px at ${IRIS.x}px ${IRIS.y}px)` }}>
        <Paper />
        <div style={{ position: "absolute", left: 960 - 150, top: 110, opacity: pop, transform: `translateY(${(1 - pop) * 60}px) scale(${0.85 + pop * 0.15})` }}>
          <Mochit size={300} mood={frame > solve && frame < solve + 40 ? "talk" : "smile"} wave={frame > solve - 4 && frame < solve + 50} />
        </div>

        <div style={{ position: "absolute", left: 0, right: 0, top: 430, display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative" }}>
            <Rise runs="ITパスポート" at={l.onsets[0] + 2} size={112} color={C.ink} />
          </div>
          <div style={{ position: "relative", marginLeft: 36 }}>
            <Rise runs="学習コーチ" at={l.onsets[0] + 12} size={112} color={C.ink} />
            <PenCircle w={660} h={210} at={l.onsets[0] + 34} style={{ left: -34, top: -36 }} />
          </div>
        </div>

        <div style={{ position: "absolute", left: 0, right: 0, top: 690, display: "flex", justifyContent: "center", alignItems: "baseline" }}>
          <Rise runs={[{ t: "「分からない」", color: C.ai }, { t: "と" }]} at={l.onsets[1]} size={66} color={C.ink} weight={600} />
          <Rise runs={[{ t: "「迷う」", color: C.ai }, { t: "を、" }]} at={l.onsets[2]} size={66} color={C.ink} weight={600} />
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 800, display: "flex", justifyContent: "center" }}>
          <Rise runs="まとめて解決。" at={solve} size={96} color={C.ink} />
        </div>
        <div style={{ position: "absolute", left: 960 - 330, top: 930, width: 660, height: 6, borderRadius: 3, background: C.shu, transformOrigin: "0 50%", transform: `scaleX(${progress(frame, solve + 18, 18, easeInOutCubic)})`, opacity: interpolate(frame, [solve + 18, solve + 19], [0, 1], clamp) }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
