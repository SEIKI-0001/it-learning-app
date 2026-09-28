// アプリの冒険地図（components/roadmap-map と同じ画像・同じ座標）を動画用に描く。
// progress（0〜1）で道のりが描かれ、到達したチェックポイントから順に地名が跳ね出る。
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { ROADMAP_GOAL, ROADMAP_STAGES } from "../../../../components/roadmap-map/mapConfig";
import { C, FONT } from "../theme";
import { clamp } from "./motion";

export const MAP_POINTS = [...ROADMAP_STAGES, ROADMAP_GOAL];

/** 道のりの累積長で各点の到達割合を出す（道の描画と地名の出現を同期させる） */
function cumulative(width: number, height: number) {
  const pts = MAP_POINTS.map((p) => [(p.x / 100) * width, (p.y / 130) * height] as const);
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = lens[lens.length - 1];
  return { pts, at: lens.map((l) => l / total), total };
}

export function mapPointAt(progress: number, width: number, height: number) {
  const { pts, at } = cumulative(width, height);
  for (let i = 1; i < pts.length; i++) {
    if (progress <= at[i]) {
      const k = (progress - at[i - 1]) / (at[i] - at[i - 1]);
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k] as const;
    }
  }
  return pts[pts.length - 1];
}

export function AdventureMap({
  width,
  progress,
  cleared = -1,
  labelScale = 1,
  showLabels = true,
}: {
  width: number;
  /** 道のりの描画 0〜1 */
  progress: number;
  /** この番号までのチェックポイントをクリア済み表示にする */
  cleared?: number;
  labelScale?: number;
  showLabels?: boolean;
}) {
  const frame = useCurrentFrame();
  const height = width * (1429 / 1100);
  const { pts, at, total } = cumulative(width, height);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");

  return (
    <div style={{ position: "relative", width, height }}>
      <Img src={staticFile("maps/roadmap/base-map.webp")} style={{ position: "absolute", inset: 0, width, height }} />
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={d} fill="none" stroke="rgba(2,28,72,0.35)" strokeWidth={width * 0.014} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${total * progress} ${total}`} />
        <path
          d={d}
          fill="none"
          stroke={C.sun}
          strokeWidth={width * 0.008}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${width * 0.012} ${width * 0.014}`}
          strokeDashoffset={-frame * 2}
          mask="url(#routeMask)"
        />
        <defs>
          <mask id="routeMask">
            <path d={d} fill="none" stroke="white" strokeWidth={width * 0.03} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${total * progress} ${total}`} />
          </mask>
        </defs>
      </svg>
      {MAP_POINTS.map((p, i) => {
        const reached = progress >= at[i] - 0.001;
        const since = reached ? (progress - at[i]) * 8 : -1; // 到達後の経過（擬似）
        const pop = reached ? Math.min(1, 0.3 + since * 1.4) : 0;
        const [x, y] = pts[i];
        const done = i <= cleared;
        const isGoal = p.id === "goal";
        return (
          <div key={p.id} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${interpolate(pop, [0, 0.6, 1], [0, 1.25, 1], clamp)})` }}>
            <div
              style={{
                width: width * (isGoal ? 0.07 : 0.05),
                height: width * (isGoal ? 0.07 : 0.05),
                borderRadius: "50%",
                background: done ? C.green : isGoal ? C.sun : C.white,
                border: `${width * 0.006}px solid ${C.navy}`,
                boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.white,
                fontSize: width * 0.035,
                fontWeight: 900,
                fontFamily: FONT,
              }}
            >
              {done ? "✓" : isGoal ? "★" : ""}
            </div>
            {showLabels && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  [p.labelOffset === "left" ? "right" : "left"]: width * 0.065,
                  transform: "translateY(-50%)",
                  whiteSpace: "nowrap",
                  padding: `${8 * labelScale}px ${18 * labelScale}px`,
                  borderRadius: 999,
                  background: isGoal ? C.sun : "rgba(255,255,255,0.95)",
                  color: C.navy,
                  fontFamily: FONT,
                  fontWeight: 800,
                  fontSize: 30 * labelScale,
                  boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
                }}
              >
                {p.place}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
