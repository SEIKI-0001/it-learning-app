// 7. 見える：モチットが地図のチェックポイントを進み、合格準備度が上がっていく。
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AdventureMap, MAP_POINTS, mapPointAt } from "../parts/AdventureMap";
import { Mochit } from "../parts/Mochit";
import { Backdrop, Kinetic, Sparkle, clamp } from "../parts/motion";
import { C, FONT } from "../theme";
import type { Cue, Scene } from "../timeline";

const MAP_W = 800;
const MAP_H = MAP_W * (1429 / 1100);
const WALK_FROM = 10;
const WALK_TO = 140;
const READY_TO = 86;
// 道のりの累積割合で各チェックポイントに着く（AdventureMap と同じ計算）
const STOPS = MAP_POINTS.length - 2; // 最後の関所まで（城は目前）

export const goalCues = (): Cue[] => [
  ...Array.from({ length: STOPS }, (_, i): Cue => ({ at: WALK_FROM + Math.round(((WALK_TO - WALK_FROM) * (i + 1)) / STOPS) - 4, sfx: "thud", volume: 0.45 })),
  { at: WALK_TO + 6, sfx: "sparkle", volume: 0.5 },
];

export function Goal({ scene }: { scene: Scene }) {
  const frame = useCurrentFrame();
  // チェックポイントごとに一呼吸おいて跳ねながら進む
  const raw = interpolate(frame, [WALK_FROM, WALK_TO], [0, STOPS], clamp);
  const seg = Math.floor(raw);
  const within = raw - seg;
  const stepEase = Easing.bezier(0.6, 0, 0.3, 1)(Math.min(1, within * 1.4));
  const stopIndex = Math.min(STOPS, seg + stepEase);
  const progress = stopToProgress(stopIndex);
  const [mx, my] = mapPointAt(progress, MAP_W, MAP_H);
  const hop = Math.sin(Math.min(1, within * 1.4) * Math.PI) * 50;
  const cleared = Math.floor(stopIndex + 0.001) - 1;
  const ready = Math.round(interpolate(frame, [WALK_FROM, WALK_TO], [12, READY_TO], clamp));
  const R = 190;
  const circ = 2 * Math.PI * R;

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop from={C.brand600} to={C.brand900} seed={61} />
      <div style={{ position: "absolute", left: 130, top: 120 }}>
        <Kinetic start={scene.lines[0].from - 6} size={96} segs={[{ t: "合格の城まで、" }, { t: "\n" }, { t: "あと少し！", color: C.sun }]} />
        <div style={{ position: "relative", width: 460, height: 460, marginTop: 50 }}>
          <svg width={460} height={460} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
            <circle cx={230} cy={230} r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={40} />
            <circle cx={230} cy={230} r={R} fill="none" stroke={C.mint} strokeWidth={40} strokeLinecap="round" strokeDasharray={`${(circ * ready) / 100} ${circ}`} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.white }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: C.mint }}>合格準備度</div>
            <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {ready}
              <span style={{ fontSize: 60 }}>点</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", left: 1000, top: 540 - MAP_H * 0.52, transform: `rotate(-3deg) scale(1.05)` }}>
        <div style={{ borderRadius: 40, overflow: "hidden", boxShadow: "0 40px 80px rgba(0,0,0,0.4)", background: "#BFE6F7" }}>
          <AdventureMap width={MAP_W} progress={1} cleared={cleared} showLabels={false} />
        </div>
        <div style={{ position: "absolute", left: mx - 70, top: my - 150 - hop }}>
          <Mochit size={140} mood="smile" />
        </div>
        {frame > WALK_TO &&
          [0, 1, 2].map((i) => <Sparkle key={i} x={(57 / 100) * MAP_W + [-80, 60, 0][i]} y={(12 / 130) * MAP_H + [-40, -20, 50][i]} size={70} delay={WALK_TO + i * 6} />)}
      </div>
    </AbsoluteFill>
  );
}

// チェックポイント番号（小数）→ 道のりの割合
function stopToProgress(stop: number) {
  const pts = MAP_POINTS.map((p) => [p.x, (p.y / 130) * 100 * (1429 / 1100)] as const);
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = lens[lens.length - 1];
  const i = Math.floor(stop);
  const k = stop - i;
  const a = lens[i];
  const b = lens[Math.min(lens.length - 1, i + 1)];
  return (a + (b - a) * k) / total;
}
